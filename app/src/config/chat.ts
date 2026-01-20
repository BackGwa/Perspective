export type ChatMessageRole = 'peer' | 'host';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
}

export const TEST_CHAT_MESSAGES: ChatMessage[] = [
  { id: 'peer-1', role: 'peer', text: 'Can everyone hear me?' },
  { id: 'peer-2', role: 'peer', text: 'Stream looks sharp on mobile.' },
  { id: 'host-1', role: 'host', text: 'Great, thanks for confirming.' },
  { id: 'peer-3', role: 'peer', text: 'Audio is a bit low here.' },
  { id: 'host-2', role: 'host', text: 'Turning it up now.' },
  { id: 'peer-4', role: 'peer', text: 'Much better, thank you.' },
  { id: 'host-3', role: 'host', text: 'Welcome everyone.' },
];
