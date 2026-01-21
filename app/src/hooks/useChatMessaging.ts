import { useCallback } from 'react';
import { useChatContext } from '../contexts/ChatContext';
import { peerService } from '../services/peerService';
import { encryptMessage, decryptMessage } from '../utils/passwordCrypto';
import type { ChatDataMessage } from '../types/chat.types';
import { isChatDataMessage } from '../types/chat.types';

const MAX_MESSAGE_LENGTH = 128;

interface UseChatMessagingOptions {
  role: 'host' | 'participant';
  peerId: string | null;
  hostPeerId?: string | null;  // Required for participant
  sessionSecret: string | null;
  connectionTimestamp: number;
}

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

    // Validate message length
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      console.warn('[Chat] Message exceeds maximum length:', MAX_MESSAGE_LENGTH);
      return;
    }

    console.log('[Chat] Sending message:', { role, peerId, text: trimmed });

    const isEncrypted = !!sessionSecret;
    let messageText = trimmed;
    let iv: string | undefined;

    // Encrypt if password exists
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

    // Send message based on role
    if (role === 'host') {
      // Host: broadcast to all participants
      console.log('[Chat] Host broadcasting message to all participants');
      peerService.broadcastDataMessage(message);
    } else if (role === 'participant' && hostPeerId) {
      // Participant: send to host
      console.log('[Chat] Participant sending message to host:', hostPeerId);
      peerService.sendDataMessage(hostPeerId, message);
    } else {
      console.error('[Chat] Cannot send message - invalid role or missing hostPeerId', { role, hostPeerId });
    }

    // Add to local messages (use original plaintext)
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
    console.log('[Chat] Received data:', { role, data });

    if (!isChatDataMessage(data)) {
      console.log('[Chat] Not a chat message, ignoring');
      return;
    }

    console.log('[Chat] Valid chat message received:', data.payload);

    const { payload } = data;
    let displayText = payload.text;

    // Decrypt if needed
    if (payload.encrypted && sessionSecret && payload.iv) {
      try {
        displayText = await decryptMessage(payload.text, payload.iv, sessionSecret);
      } catch (error) {
        console.error('Failed to decrypt message:', error);
        // Ignore message if decryption fails
        return;
      }
    }

    // Filter by connection timestamp
    if (payload.timestamp < connectionTimestamp) {
      return; // Ignore messages from before we joined
    }

    // Host: relay to other participants (except sender)
    if (role === 'host') {
      const participantIds = peerService.getAllParticipantIds();
      participantIds.forEach((participantId) => {
        if (participantId !== payload.senderId) {
          peerService.sendDataMessage(participantId, data);
        }
      });
    }

    // Add to local messages
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
