export type ChatMessageType = 'CHAT_MESSAGE';

export interface ChatDataMessage {
  type: 'CHAT_MESSAGE';
  payload: {
    id: string;              // Unique message ID (UUID)
    senderId: string;        // Peer ID of sender
    senderRole: 'host' | 'peer';
    text: string;            // Message content (plaintext or ciphertext)
    iv?: string;             // Initialization vector (required if encrypted)
    timestamp: number;       // Unix timestamp (Date.now())
    encrypted: boolean;      // Whether message is encrypted
  };
}

export function isChatDataMessage(data: unknown): data is ChatDataMessage {
  if (!data || typeof data !== 'object') return false;
  const msg = data as ChatDataMessage;
  return (
    msg.type === 'CHAT_MESSAGE' &&
    typeof msg.payload?.id === 'string' &&
    typeof msg.payload?.senderId === 'string' &&
    (msg.payload?.senderRole === 'host' || msg.payload?.senderRole === 'peer') &&
    typeof msg.payload?.text === 'string' &&
    typeof msg.payload?.timestamp === 'number' &&
    typeof msg.payload?.encrypted === 'boolean'
  );
}
