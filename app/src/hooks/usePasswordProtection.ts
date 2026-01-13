import { useRef, useCallback } from 'react';
import { DataConnection } from 'peerjs';
import { peerService } from '../services/peerService';
import { passwordService } from '../services/passwordService';
import { PARTICIPANT_CONFIG, ERROR_MESSAGES } from '../config/constants';
import type { PasswordMessage } from '../types/password.types';
import { isValidPasswordMessage } from '../types/password.types';
import type { DomainPolicy, SessionJoinRejectedMessage } from '../types/session.types';
import { isSessionJoinRequestMessage } from '../types/session.types';

interface UsePasswordProtectionOptions {
  sessionPassword: string | null;
  domainPolicy: DomainPolicy;
  currentParticipantCount: number;
  onParticipantApproved?: (peerId: string) => void;
  onParticipantRejected?: (peerId: string) => void;
}

export function usePasswordProtection({
  sessionPassword,
  domainPolicy,
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
    const hostOrigin = window.location.origin;
    let hasJoinRequest = false;
    let isResolved = false;

    const markRejected = () => {
      if (isResolved) return;
      isResolved = true;
      onParticipantRejected?.(peerId);
    };

    const approveParticipant = () => {
      if (isResolved) return;
      isResolved = true;
      approvedParticipants.current.add(peerId);
      participantRetries.current.delete(peerId);
      onParticipantApproved?.(peerId);
    };

    const rejectForDomain = () => {
      const rejectionMessage: SessionJoinRejectedMessage = {
        type: 'SESSION_JOIN_REJECTED',
        payload: {
          reason: ERROR_MESSAGES.DOMAIN_NOT_ALLOWED
        }
      };
      peerService.sendDataMessage(peerId, rejectionMessage);
      markRejected();

      setTimeout(() => {
        dataConnection.close();
      }, 100);
    };

    const startPasswordFlow = () => {
      if (isResolved) return;

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
        markRejected();

        setTimeout(() => {
          dataConnection.close();
        }, 100);
        return;
      }

      if (!isPasswordProtected) {
        const approvalMessage: PasswordMessage = {
          type: 'PASSWORD_APPROVED',
          payload: {}
        };
        peerService.sendDataMessage(peerId, approvalMessage);
        approveParticipant();
        return;
      }

      const requestMessage: PasswordMessage = {
        type: 'PASSWORD_REQUEST',
        payload: {}
      };
      peerService.sendDataMessage(peerId, requestMessage);
    };

    const handleJoinRequest = (origin: string) => {
      if (hasJoinRequest || isResolved) return;
      hasJoinRequest = true;

      if (domainPolicy === 'same-domain' && origin !== hostOrigin) {
        rejectForDomain();
        return;
      }

      // Wait a bit to ensure participant's listener is ready
      setTimeout(() => {
        startPasswordFlow();
      }, 100);
    };

    dataConnection.on('data', (data: unknown) => {
      if (isSessionJoinRequestMessage(data)) {
        handleJoinRequest(data.payload.origin);
        return;
      }

      if (!isValidPasswordMessage(data)) {
        console.warn('[PasswordProtection] Invalid message received:', data);
        return;
      }

      if (!hasJoinRequest) {
        console.warn('[PasswordProtection] Password response received before join request:', data);
        return;
      }

      if (data.type === 'PASSWORD_RESPONSE') {
        const providedPassword = data.payload?.password || '';

        // Get current retry count
        const currentRetries = participantRetries.current.get(peerId) || 0;

        // Verify password
        const isValid = passwordService.verifyPassword(providedPassword, sessionPassword || '');

        if (isValid) {
          const approvalMessage: PasswordMessage = {
            type: 'PASSWORD_APPROVED',
            payload: {}
          };
          peerService.sendDataMessage(peerId, approvalMessage);
          approveParticipant();
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
            markRejected();

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

    dataConnection.on('close', () => {
      if (!isResolved && !approvedParticipants.current.has(peerId)) {
        markRejected();
      }
    });
  }, [sessionPassword, domainPolicy, currentParticipantCount, onParticipantApproved, onParticipantRejected]);

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
