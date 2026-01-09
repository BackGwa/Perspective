import { createContext, useContext, useState, ReactNode } from 'react';
import type { StreamState, MediaSourceType } from '../types/media.types';
import type { ConnectionStatus } from '../types/peer.types';
import type Peer from 'peerjs';

interface StreamContextType {
  streamState: StreamState;
  setStream: (stream: MediaStream | null, sourceType: MediaSourceType | null) => void;
  setPaused: (paused: boolean) => void;
  setMuted: (muted: boolean) => void;
  setError: (error: Error | null) => void;
  clearStream: () => void;

  peerId: string | null;
  setPeerId: (id: string | null) => void;

  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;

  remoteStream: MediaStream | null;
  setRemoteStream: (stream: MediaStream | null) => void;

  sessionPassword: string | null;
  setSessionPassword: (password: string | null) => void;

  // Participant peer instance (reused across navigation)
  participantPeer: Peer | null;
  setParticipantPeer: (peer: Peer | null) => void;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

const initialStreamState: StreamState = {
  stream: null,
  isActive: false,
  isPaused: false,
  isMuted: false,
  sourceType: null,
  error: null
};

export function StreamProvider({ children }: { children: ReactNode }) {
  const [streamState, setStreamState] = useState<StreamState>(initialStreamState);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sessionPassword, setSessionPassword] = useState<string | null>(null);
  const [participantPeer, setParticipantPeer] = useState<Peer | null>(null);

  const setStream = (stream: MediaStream | null, sourceType: MediaSourceType | null) => {
    console.log('[StreamContext] setStream called - stream:', stream, 'sourceType:', sourceType);
    setStreamState(prev => {
      const newState = {
        ...prev,
        stream,
        sourceType,
        isActive: stream !== null,
        error: null
      };
      console.log('[StreamContext] New state:', newState);
      return newState;
    });
  };

  const setPaused = (paused: boolean) => {
    setStreamState(prev => ({
      ...prev,
      isPaused: paused
    }));
  };

  const setMuted = (muted: boolean) => {
    setStreamState(prev => ({
      ...prev,
      isMuted: muted
    }));
  };

  const setError = (error: Error | null) => {
    setStreamState(prev => ({
      ...prev,
      error
    }));
  };

  const clearStream = () => {
    setStreamState(initialStreamState);
  };

  return (
    <StreamContext.Provider
      value={{
        streamState,
        setStream,
        setPaused,
        setMuted,
        setError,
        clearStream,
        peerId,
        setPeerId,
        connectionStatus,
        setConnectionStatus,
        remoteStream,
        setRemoteStream,
        sessionPassword,
        setSessionPassword,
        participantPeer,
        setParticipantPeer
      }}
    >
      {children}
    </StreamContext.Provider>
  );
}

export function useStreamContext() {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error('useStreamContext must be used within a StreamProvider');
  }
  return context;
}
