import { useRef, useCallback } from 'react';
import { DataConnection } from 'peerjs';
import { peerService } from '../services/peerService';
import { passwordService } from '../services/passwordService';
import { PARTICIPANT_CONFIG, ERROR_MESSAGES } from '../config/constants';
import type { PasswordMessage } from '../types/password.types';
import { isValidPasswordMessage } from '../types/password.types';

interface UsePasswordProtectionOptions {
  sessionPassword: string | null;
  currentParticipantCount: number;
  onParticipantApproved?: (peerId: string) => void;
  onParticipantRejected?: (peerId: string) => void;
}

export function usePasswordProtection({
  sessionPassword,
  currentParticipantCount,
  onParticipantApproved,
  onParticipantRejected
}: UsePasswordProtectionOptions) {
  const participantRetries = useRef<Map<string, number>>(new Map());
  const approvedParticipants = useRef<Set<string>>(new Set());

  const isParticipantApproved = useCallback((peerId: string): boolean => {
    return approvedParticipants.current.has(peerId);
  }, []);

  const setupPasswordListener = useCallback((peerId: string, dataConnection: DataConnection) => {
    const isPasswordProtected = passwordService.isPasswordProtected(sessionPassword);

    // Wait a bit to ensure participant's listener is ready
    setTimeout(() => {
      // Check if max participants limit is exceeded
      if (currentParticipantCount >= PARTICIPANT_CONFIG.MAX_PARTICIPANTS) {
        console.log('[PasswordProtection] Max participants exceeded. Current:', currentParticipantCount, 'Max:', PARTICIPANT_CONFIG.MAX_PARTICIPANTS);

        const rejectionMessage: PasswordMessage = {
          type: 'MAX_PARTICIPANTS_EXCEEDED',
          payload: {
            reason: ERROR_MESSAGES.MAX_PARTICIPANTS_EXCEEDED
          }
        };
        peerService.sendDataMessage(peerId, rejectionMessage);
        onParticipantRejected?.(peerId);

        // Close the data connection
        setTimeout(() => {
          dataConnection.close();
        }, 100);
        return;
      }

      if (!isPasswordProtected) {
        // Public room - approve immediately and send approval message
        approvedParticipants.current.add(peerId);

        // Send approval message for public room
        const approvalMessage: PasswordMessage = {
          type: 'PASSWORD_APPROVED',
          payload: {}
        };
        peerService.sendDataMessage(peerId, approvalMessage);

        onParticipantApproved?.(peerId);
        return;
      }

      // Send password request
      const requestMessage: PasswordMessage = {
        type: 'PASSWORD_REQUEST',
        payload: {}
      };
      peerService.sendDataMessage(peerId, requestMessage);
    }, 100);

    // Listen for password response
    dataConnection.on('data', (data: unknown) => {
      if (!isValidPasswordMessage(data)) {
        console.warn('[PasswordProtection] Invalid message received:', data);
        return;
      }

      if (data.type === 'PASSWORD_RESPONSE') {
        const providedPassword = data.payload?.password || '';

        // Get current retry count
        const currentRetries = participantRetries.current.get(peerId) || 0;

        // Verify password
        const isValid = passwordService.verifyPassword(providedPassword, sessionPassword || '');

        if (isValid) {
          // Password correct - approve participant and add to approved list
          approvedParticipants.current.add(peerId);
          participantRetries.current.delete(peerId);

          const approvalMessage: PasswordMessage = {
            type: 'PASSWORD_APPROVED',
            payload: {}
          };
          peerService.sendDataMessage(peerId, approvalMessage);

          onParticipantApproved?.(peerId);
        } else {
          // Password incorrect - increment retry count
          const newRetryCount = currentRetries + 1;
          participantRetries.current.set(peerId, newRetryCount);

          const remainingRetries = passwordService.getRemainingRetries(newRetryCount);

          if (passwordService.shouldRejectParticipant(newRetryCount)) {
            // Max retries exceeded - reject permanently
            const rejectionMessage: PasswordMessage = {
              type: 'PASSWORD_REJECTED',
              payload: {
                remainingRetries: 0,
                reason: 'Maximum password attempts exceeded'
              }
            };
            peerService.sendDataMessage(peerId, rejectionMessage);

            onParticipantRejected?.(peerId);

            // Close the data connection
            setTimeout(() => {
              dataConnection.close();
            }, 100);
          } else {
            // Send rejection with retry count
            const rejectionMessage: PasswordMessage = {
              type: 'PASSWORD_REJECTED',
              payload: {
                remainingRetries,
                reason: 'Incorrect password'
              }
            };
            peerService.sendDataMessage(peerId, rejectionMessage);
          }
        }
      }
    });
  }, [sessionPassword, currentParticipantCount, onParticipantApproved, onParticipantRejected]);

  const resetParticipantRetries = useCallback((peerId: string) => {
    participantRetries.current.delete(peerId);
    approvedParticipants.current.delete(peerId);
  }, []);

  const isPasswordProtected = passwordService.isPasswordProtected(sessionPassword);

  return {
    setupPasswordListener,
    isParticipantApproved,
    resetParticipantRetries,
    isPasswordProtected
  };
}
