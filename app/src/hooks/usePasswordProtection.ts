import { useRef, useCallback } from 'react';
import type { DataConnection } from 'peerjs';
import { peerService } from '../services/peerService';
import { passwordService } from '../services/passwordService';
import { PARTICIPANT_CONFIG, ERROR_MESSAGES } from '../config/constants';
import type { PasswordMessage } from '../types/password.types';
import { isValidPasswordMessage } from '../types/password.types';
import type { DomainPolicy, SessionJoinRejectedMessage } from '../types/session.types';
import { isSessionJoinRequestMessage } from '../types/session.types';
import { generateNonce, hmacSha256 } from '../utils/passwordCrypto';

interface UsePasswordProtectionOptions {
  sessionSecret: string | null;
  domainPolicy: DomainPolicy;
  currentParticipantCount: number;
  onParticipantApproved?: (peerId: string) => void;
  onParticipantRejected?: (peerId: string) => void;
}

export function usePasswordProtection({
  sessionSecret,
  domainPolicy,
  currentParticipantCount,
  onParticipantApproved,
  onParticipantRejected
}: UsePasswordProtectionOptions) {
  const participantRetries = useRef<Map<string, number>>(new Map());
  const approvedParticipants = useRef<Set<string>>(new Set());
  const participantNonces = useRef<Map<string, string>>(new Map());

  const setupPasswordListener = useCallback((peerId: string, dataConnection: DataConnection) => {
    const isPasswordProtected = passwordService.isPasswordProtected(sessionSecret);
    const hostOrigin = window.location.origin;
    let hasJoinRequest = false;
    let isResolved = false;

    const markRejected = () => {
      if (isResolved) return;
      isResolved = true;
      participantNonces.current.delete(peerId);
      onParticipantRejected?.(peerId);
    };

    const approveParticipant = () => {
      if (isResolved) return;
      isResolved = true;
      approvedParticipants.current.add(peerId);
      participantRetries.current.delete(peerId);
      participantNonces.current.delete(peerId);
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

      if (currentParticipantCount >= PARTICIPANT_CONFIG.MAX_PARTICIPANTS) {
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

      const nonce = generateNonce();
      participantNonces.current.set(peerId, nonce);
      const requestMessage: PasswordMessage = {
        type: 'PASSWORD_REQUEST',
        payload: {
          nonce,
          algorithm: 'hmac-sha256'
        }
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

      setTimeout(() => {
        startPasswordFlow();
      }, 100);
    };

    const handlePasswordResponse = async (data: PasswordMessage) => {
      if (isResolved) return;

      const currentRetries = participantRetries.current.get(peerId) || 0;
      let isValid = false;

      if (data.payload?.proof) {
        const nonce = participantNonces.current.get(peerId);
        if (!nonce || !sessionSecret) {
          console.warn('[PasswordProtection] Missing nonce or session secret for proof verification');
        } else {
          try {
            const expectedProof = await hmacSha256(sessionSecret, nonce);
            isValid = expectedProof === data.payload.proof;
          } catch (error) {
            console.error('[PasswordProtection] Failed to verify HMAC proof:', error);
          }
        }
      } else {
        console.warn('[PasswordProtection] Missing password proof');
      }

      if (isResolved) return;

      if (isValid) {
        const approvalMessage: PasswordMessage = {
          type: 'PASSWORD_APPROVED',
          payload: {}
        };
        peerService.sendDataMessage(peerId, approvalMessage);
        approveParticipant();
        return;
      }

      const newRetryCount = currentRetries + 1;
      participantRetries.current.set(peerId, newRetryCount);

      const remainingRetries = passwordService.getRemainingRetries(newRetryCount);

      if (passwordService.shouldRejectParticipant(newRetryCount)) {
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
        const rejectionMessage: PasswordMessage = {
          type: 'PASSWORD_REJECTED',
          payload: {
            remainingRetries,
            reason: 'Incorrect password'
          }
        };
        peerService.sendDataMessage(peerId, rejectionMessage);
      }
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
        void handlePasswordResponse(data);
      }
    });

    dataConnection.on('close', () => {
      if (!isResolved && !approvedParticipants.current.has(peerId)) {
        markRejected();
      }
    });
  }, [sessionSecret, domainPolicy, currentParticipantCount, onParticipantApproved, onParticipantRejected]);

  return {
    setupPasswordListener
  };
}
