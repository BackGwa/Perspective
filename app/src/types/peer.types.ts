import type Peer from 'peerjs';
import type { MediaConnection, DataConnection } from 'peerjs';

export type PeerRole = 'host' | 'participant';

export type ConnectionStatus =
  | 'idle'
  | 'initializing'
  | 'waiting_for_peer'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

export interface PeerState {
  peer: Peer | null;
  peerId: string | null;
  role: PeerRole | null;
  status: ConnectionStatus;
  error: Error | null;
}

export interface HostState extends PeerState {
  role: 'host';
  participants: Map<string, ParticipantInfo>;
}

export interface ParticipantState extends PeerState {
  role: 'participant';
  hostPeerId: string | null;
  remoteStream: MediaStream | null;
}

export interface ParticipantInfo {
  peerId: string;
  connection: MediaConnection;
  dataConnection?: DataConnection;
  connectedAt: Date;
}

export interface PeerConfig {
  iceServers: RTCIceServer[];
  debug?: number;
}

export interface ShareLinkData {
  url: string;
  peerId: string;
}
