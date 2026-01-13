import { useState, useCallback, useRef } from 'react';
import type { DataConnection } from 'peerjs';
import { ERROR_MESSAGES, PASSWORD_CONFIG } from '../config/constants';
import { PASSWORD_VERIFICATION } from '../config/uiText';
import type { PasswordMessage } from '../types/password.types';
import { hashPassword, hmacSha256 } from '../utils/passwordHasher';

interface UsePasswordVerificationOptions {
  dataConnection: DataConnection | null;
  onApproved?: () => void;
  onRejected?: (reason: string) => void;
  onMaxRetriesExceeded?: () => void;
  onPasswordRequired?: () => void;
}

export function usePasswordVerification({
  dataConnection,
  onApproved,
  onRejected,
  onMaxRetriesExceeded,
  onPasswordRequired
}: UsePasswordVerificationOptions) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const nonceRef = useRef<string | null>(null);

  const handlePasswordMessage = useCallback((message: PasswordMessage) => {
    switch (message.type) {
      case 'PASSWORD_REQUEST':
        console.log('[PasswordVerification] Password required');
        nonceRef.current = message.payload?.nonce ?? null;
        setIsVerifying(false);
        onPasswordRequired?.();
        break;

      case 'PASSWORD_APPROVED':
        console.log('[PasswordVerification] Password approved');
        nonceRef.current = null;
        setIsVerifying(false);
        setErrorMessage(null);
        onApproved?.();
        break;

      case 'PASSWORD_REJECTED': {
        console.log('[PasswordVerification] Password rejected:', message.payload);
        const remainingRetries = message.payload?.remainingRetries ?? 0;
        const reason = message.payload?.reason || ERROR_MESSAGES.PASSWORD_INCORRECT;

        setIsVerifying(false);

        if (remainingRetries === 0) {
          // Max retries exceeded
          nonceRef.current = null;
          setErrorMessage(ERROR_MESSAGES.PASSWORD_MAX_RETRIES);
          onMaxRetriesExceeded?.();
        } else {
          // Still has retries
          const [singular, plural] = PASSWORD_VERIFICATION.ATTEMPTS_REMAINING.split('|');
          setErrorMessage(`${reason} (${remainingRetries} ${remainingRetries === 1 ? singular : plural} remaining)`);
          onRejected?.(reason);
        }
        break;
      }

      case 'MAX_PARTICIPANTS_EXCEEDED':
        console.log('[PasswordVerification] Max participants exceeded');
        nonceRef.current = null;
        setIsVerifying(false);
        setErrorMessage(message.payload?.reason || ERROR_MESSAGES.MAX_PARTICIPANTS_EXCEEDED);
        onMaxRetriesExceeded?.();
        break;
    }
  }, [onApproved, onMaxRetriesExceeded, onPasswordRequired, onRejected]);

  const submitPassword = useCallback(async (password: string) => {
    if (!dataConnection) {
      console.error('[PasswordVerification] Cannot submit password: no connection');
      return;
    }

    if (!dataConnection.open) {
      console.error('[PasswordVerification] Data connection not open');
      setErrorMessage(ERROR_MESSAGES.CONNECTION_LOST);
      return;
    }

    if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
      setErrorMessage(ERROR_MESSAGES.PASSWORD_TOO_SHORT);
      return;
    }

    if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
      setErrorMessage(ERROR_MESSAGES.PASSWORD_TOO_LONG);
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    const hashedPassword = await hashPassword(password);
    const nonce = nonceRef.current;
    if (!nonce) {
      console.error('[PasswordVerification] Missing nonce for password proof');
      setIsVerifying(false);
      setErrorMessage(ERROR_MESSAGES.CONNECTION_ERROR);
      return;
    }

    let payload: PasswordMessage['payload'];
    try {
      const proof = await hmacSha256(hashedPassword, nonce);
      payload = {
        proof,
        algorithm: 'hmac-sha256'
      };
    } catch (error) {
      console.error('[PasswordVerification] Failed to create HMAC proof:', error);
      setIsVerifying(false);
      setErrorMessage(ERROR_MESSAGES.CONNECTION_ERROR);
      return;
    }

    const responseMessage: PasswordMessage = {
      type: 'PASSWORD_RESPONSE',
      payload
    };

    // Send directly through the data connection (not through peerService)
    dataConnection.send(responseMessage);
  }, [dataConnection]);

  return {
    isVerifying,
    errorMessage,
    submitPassword,
    handlePasswordMessage
  };
}
