export type ChatMessageRole = 'peer' | 'host';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
  timestamp: number;       // Unix timestamp (Date.now())
  senderId: string;        // Peer ID of sender
  encrypted?: boolean;     // Whether message was encrypted
}
