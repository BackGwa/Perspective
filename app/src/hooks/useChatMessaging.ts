import { useCallback } from 'react';
import { useChatContext } from '../contexts/ChatContext';
import { peerService } from '../services/peerService';
import { encryptMessage, decryptMessage } from '../utils/passwordCrypto';
import type { ChatDataMessage } from '../types/chat.types';
import { isChatDataMessage } from '../types/chat.types';

const MAX_MESSAGE_LENGTH = 128;
const MAX_ID_LENGTH = 128;
const MAX_ENCRYPTED_MESSAGE_LENGTH = 1024;
const AES_GCM_IV_HEX_LENGTH = 24;
const HEX_PATTERN = /^[0-9a-f]+$/i;

interface UseChatMessagingOptions {
  role: 'host' | 'participant';
  peerId: string | null;
  hostPeerId?: string | null;  // Required for participant
  sessionSecret: string | null;
  connectionTimestamp: number;
}

const isValidHex = (value: string, maxLength: number) => {
  return value.length > 0 && value.length <= maxLength && value.length % 2 === 0 && HEX_PATTERN.test(value);
};

const isValidIncomingMessage = (message: ChatDataMessage, hasSessionSecret: boolean) => {
  const { payload } = message;

  if (!Number.isFinite(payload.timestamp)) return false;
  if (payload.id.length === 0 || payload.id.length > MAX_ID_LENGTH) return false;
  if (payload.senderId.length === 0 || payload.senderId.length > MAX_ID_LENGTH) return false;

  if (hasSessionSecret) {
    if (!payload.encrypted || !payload.iv) return false;
    return (
      payload.iv.length === AES_GCM_IV_HEX_LENGTH &&
      isValidHex(payload.iv, AES_GCM_IV_HEX_LENGTH) &&
      isValidHex(payload.text, MAX_ENCRYPTED_MESSAGE_LENGTH)
    );
  }

  return !payload.encrypted && payload.text.length <= MAX_MESSAGE_LENGTH;
};

export function useChatMessaging({
  role,
  peerId,
  hostPeerId,
  sessionSecret,
  connectionTimestamp
}: UseChatMessagingOptions) {
  const { addMessage } = useChatContext();

  const sendMessage = useCallback(async (text: string) => {
    if (!peerId || !text.trim()) return;

    const trimmed = text.trim();

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      console.warn('[Chat] Message exceeds maximum length:', MAX_MESSAGE_LENGTH);
      return;
    }

    const isEncrypted = !!sessionSecret;
    let messageText = trimmed;
    let iv: string | undefined;

    if (isEncrypted && sessionSecret) {
      try {
        const encrypted = await encryptMessage(trimmed, sessionSecret);
        messageText = encrypted.ciphertext;
        iv = encrypted.iv;
      } catch (error) {
        console.error('Failed to encrypt message:', error);
        return;
      }
    }

    const message: ChatDataMessage = {
      type: 'CHAT_MESSAGE',
      payload: {
        id: crypto.randomUUID(),
        senderId: peerId,
        senderRole: role === 'host' ? 'host' : 'peer',
        text: messageText,
        iv,
        timestamp: Date.now(),
        encrypted: isEncrypted
      }
    };

    if (role === 'host') {
      peerService.getChatParticipantIds().forEach((participantId) => {
        peerService.sendDataMessage(participantId, message);
      });
    } else if (role === 'participant' && hostPeerId) {
      peerService.sendDataMessage(hostPeerId, message);
    } else {
      console.error('[Chat] Cannot send message - invalid role or missing hostPeerId', { role, hostPeerId });
    }

    addMessage({
      id: message.payload.id,
      role: role === 'host' ? 'host' : 'peer',
      text: trimmed,
      timestamp: message.payload.timestamp,
      senderId: message.payload.senderId,
      encrypted: isEncrypted
    });
  }, [peerId, role, hostPeerId, sessionSecret, addMessage]);

  const handleIncomingMessage = useCallback(async (data: unknown) => {
    if (!isChatDataMessage(data)) {
      return;
    }

    const { payload } = data;
    const hasSessionSecret = !!sessionSecret;

    if (!isValidIncomingMessage(data, hasSessionSecret)) {
      return;
    }

    if (payload.timestamp < connectionTimestamp) {
      return;
    }

    let displayText = payload.text;

    if (payload.encrypted && sessionSecret && payload.iv) {
      try {
        displayText = await decryptMessage(payload.text, payload.iv, sessionSecret);
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        return;
      }
    }

    if (displayText.length > MAX_MESSAGE_LENGTH) {
      return;
    }

    if (role === 'host') {
      const participantIds = peerService.getChatParticipantIds();
      participantIds.forEach((participantId) => {
        if (participantId !== payload.senderId) {
          peerService.sendDataMessage(participantId, data);
        }
      });
    }

    addMessage({
      id: payload.id,
      role: payload.senderRole === 'host' ? 'host' : 'peer',
      text: displayText,
      timestamp: payload.timestamp,
      senderId: payload.senderId,
      encrypted: payload.encrypted
    });
  }, [role, sessionSecret, connectionTimestamp, addMessage]);

  return {
    sendMessage,
    handleIncomingMessage
  };
}
