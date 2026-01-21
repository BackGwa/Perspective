export type ChatMessageRole = 'peer' | 'host';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
  timestamp: number;       // Unix timestamp (Date.now())
  senderId: string;        // Peer ID of sender
  encrypted?: boolean;     // Whether message was encrypted
}

// For development/testing only - removed in production
const now = Date.now();
export const TEST_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'peer-1', role: 'peer', text: 'Can everyone hear me?', timestamp: now - 60000, senderId: 'test-peer-1' },
  { id: 'peer-2', role: 'peer', text: 'Stream looks sharp on mobile.', timestamp: now - 50000, senderId: 'test-peer-2' },
  { id: 'host-1', role: 'host', text: 'Great, thanks for confirming.', timestamp: now - 40000, senderId: 'test-host' },
  { id: 'peer-3', role: 'peer', text: 'Audio is a bit low here.', timestamp: now - 30000, senderId: 'test-peer-1' },
  { id: 'host-2', role: 'host', text: 'Turning it up now.', timestamp: now - 20000, senderId: 'test-host' },
  { id: 'peer-4', role: 'peer', text: 'Much better, thank you.', timestamp: now - 10000, senderId: 'test-peer-1' },
  { id: 'host-3', role: 'host', text: 'Welcome everyone.', timestamp: now, senderId: 'test-host' },
];
