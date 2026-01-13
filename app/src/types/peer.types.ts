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

export interface PeerConfig {
  iceServers: RTCIceServer[];
  debug?: number;
}
