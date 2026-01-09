import { useState, useCallback, useEffect } from 'react';
import { DataConnection } from 'peerjs';
import { ERROR_MESSAGES } from '../config/constants';
import type { PasswordMessage } from '../types/password.types';

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

    const handleData = (data: any) => {
      if (!data || typeof data !== 'object') return;

      const message = data as PasswordMessage;

      switch (message.type) {
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
          console.log('[PasswordVerification] Password rejected:', message.payload);
          const remainingRetries = message.payload?.remainingRetries ?? 0;
          const reason = message.payload?.reason || ERROR_MESSAGES.PASSWORD_INCORRECT;

          setIsVerifying(false);
          setRetryCount(prev => prev + 1);

          if (remainingRetries === 0) {
            // Max retries exceeded
            setErrorMessage(ERROR_MESSAGES.PASSWORD_MAX_RETRIES);
            setIsPasswordRequired(false);
            onMaxRetriesExceeded?.();
          } else {
            // Still has retries
            setErrorMessage(`${reason} (${remainingRetries} ${remainingRetries === 1 ? 'attempt' : 'attempts'} remaining)`);
            onRejected?.(reason);
          }
          break;

        case 'MAX_PARTICIPANTS_EXCEEDED':
          console.log('[PasswordVerification] Max participants exceeded');
          setIsVerifying(false);
          setIsPasswordRequired(false);
          setErrorMessage(message.payload?.reason || ERROR_MESSAGES.MAX_PARTICIPANTS_EXCEEDED);
          onMaxRetriesExceeded?.();
          break;
      }
    };

    dataConnection.on('data', handleData);

    return () => {
      dataConnection.off('data', handleData);
    };
  }, [dataConnection, hostPeerId, onApproved, onRejected, onMaxRetriesExceeded]);

  const submitPassword = useCallback((password: string) => {
    if (!dataConnection) {
      console.error('[PasswordVerification] Cannot submit password: no connection');
      return;
    }

    if (!dataConnection.open) {
      console.error('[PasswordVerification] Data connection not open');
      setErrorMessage('Connection lost. Please try again.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    const responseMessage: PasswordMessage = {
      type: 'PASSWORD_RESPONSE',
      payload: {
        password
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
