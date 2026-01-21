import type Peer from 'peerjs';

export function cleanupParticipantPeer(peer: Peer | null): null {
  if (peer) {
    peer.removeAllListeners();
    peer.destroy();
  }
  return null;
}
