import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import type { ChatMessage } from '../config/chat';

interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  unreadCount: number;
  markAllAsRead: () => void;
  connectionTimestamp: number | null;
  setConnectionTimestamp: (timestamp: number) => void;
  setChatOpen: (isOpen: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionTimestamp, setConnectionTimestamp] = useState<number | null>(null);
  const isChatOpenRef = useRef(false);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
    // Only increment unread count if chat is not open
    // Use ref to always get the latest value
    if (!isChatOpenRef.current) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const setChatOpen = useCallback((isOpen: boolean) => {
    isChatOpenRef.current = isOpen;
    // Mark all as read when opening chat
    if (isOpen) {
      setUnreadCount(0);
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        unreadCount,
        markAllAsRead,
        connectionTimestamp,
        setConnectionTimestamp,
        setChatOpen
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
