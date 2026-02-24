import { createContext, useContext, useState, ReactNode } from 'react';
import type { StreamState, MediaSourceType } from '../types/media.types';
import type { ConnectionStatus } from '../types/peer.types';
import type { DomainPolicy } from '../types/session.types';
import type Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

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

  sessionSecret: string | null;
  setSessionSecret: (secret: string | null) => void;

  sessionDomainPolicy: DomainPolicy;
  setSessionDomainPolicy: (policy: DomainPolicy) => void;

  participantPeer: Peer | null;
  setParticipantPeer: (peer: Peer | null) => void;

  participantHostConnection: DataConnection | null;
  setParticipantHostConnection: (connection: DataConnection | null) => void;
}

const StreamContext = createContext<StreamContextType | undefined>(undefined);

const initialStreamState: StreamState = {
  stream: null,
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
  const [sessionSecret, setSessionSecret] = useState<string | null>(null);
  const [sessionDomainPolicy, setSessionDomainPolicy] = useState<DomainPolicy>('same-domain');
  const [participantPeer, setParticipantPeer] = useState<Peer | null>(null);
  const [participantHostConnection, setParticipantHostConnection] = useState<DataConnection | null>(null);

  const setStream = (stream: MediaStream | null, sourceType: MediaSourceType | null) => {
    setStreamState(prev => {
      return {
        ...prev,
        stream,
        sourceType,
        error: null
      };
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
        sessionSecret,
        setSessionSecret,
        sessionDomainPolicy,
        setSessionDomainPolicy,
        participantPeer,
        setParticipantPeer,
        participantHostConnection,
        setParticipantHostConnection
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
