import { useState, useCallback, useEffect } from 'react';
import { DataConnection } from 'peerjs';
import { ERROR_MESSAGES, PASSWORD_CONFIG } from '../config/constants';
import { PASSWORD_VERIFICATION } from '../config/uiText';
import type { PasswordMessage } from '../types/password.types';
import { hashPassword } from '../utils/passwordHasher';
import { isValidPasswordMessage } from '../types/password.types';

interface UsePasswordVerificationOptions {
  hostPeerId: string | null;
  dataConnection: DataConnection | null;
  onApproved?: () => void;
  onRejected?: (reason: string) => void;
  onMaxRetriesExceeded?: () => void;
}

export function usePasswordVerification({
  hostPeerId,
  dataConnection,
  onApproved,
  onRejected,
  onMaxRetriesExceeded
}: UsePasswordVerificationOptions) {
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Listen for password messages from host
  useEffect(() => {
    if (!dataConnection || !hostPeerId) return;

    const handleData = (data: unknown) => {
      if (!isValidPasswordMessage(data)) {
        console.warn('[PasswordVerification] Invalid message received:', data);
        return;
      }

      switch (data.type) {
        case 'PASSWORD_REQUEST':
          console.log('[PasswordVerification] Password required');
          setIsPasswordRequired(true);
          setIsVerifying(false);
          break;

        case 'PASSWORD_APPROVED':
          console.log('[PasswordVerification] Password approved');
          setIsApproved(true);
          setIsPasswordRequired(false);
          setIsVerifying(false);
          setErrorMessage(null);
          setRetryCount(0);
          onApproved?.();
          break;

        case 'PASSWORD_REJECTED':
          console.log('[PasswordVerification] Password rejected:', data.payload);
          const remainingRetries = data.payload?.remainingRetries ?? 0;
          const reason = data.payload?.reason || ERROR_MESSAGES.PASSWORD_INCORRECT;

          setIsVerifying(false);
          setRetryCount(prev => prev + 1);

          if (remainingRetries === 0) {
            // Max retries exceeded
            setErrorMessage(ERROR_MESSAGES.PASSWORD_MAX_RETRIES);
            setIsPasswordRequired(false);
            onMaxRetriesExceeded?.();
          } else {
            // Still has retries
            const [singular, plural] = PASSWORD_VERIFICATION.ATTEMPTS_REMAINING.split('|');
            setErrorMessage(`${reason} (${remainingRetries} ${remainingRetries === 1 ? singular : plural} remaining)`);
            onRejected?.(reason);
          }
          break;

        case 'MAX_PARTICIPANTS_EXCEEDED':
          console.log('[PasswordVerification] Max participants exceeded');
          setIsVerifying(false);
          setIsPasswordRequired(false);
          setErrorMessage(data.payload?.reason || ERROR_MESSAGES.MAX_PARTICIPANTS_EXCEEDED);
          onMaxRetriesExceeded?.();
          break;
      }
    };

    dataConnection.on('data', handleData);

    return () => {
      dataConnection.off('data', handleData);
    };
  }, [dataConnection, hostPeerId, onApproved, onRejected, onMaxRetriesExceeded]);

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

    const responseMessage: PasswordMessage = {
      type: 'PASSWORD_RESPONSE',
      payload: {
        password: hashedPassword
      }
    };

    // Send directly through the data connection (not through peerService)
    dataConnection.send(responseMessage);
  }, [dataConnection]);

  const resetState = useCallback(() => {
    setIsPasswordRequired(false);
    setIsVerifying(false);
    setRetryCount(0);
    setErrorMessage(null);
    setIsApproved(false);
  }, []);

  return {
    isPasswordRequired,
    isVerifying,
    retryCount,
    errorMessage,
    isApproved,
    submitPassword,
    resetState
  };
}
