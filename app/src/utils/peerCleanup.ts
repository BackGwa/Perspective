import type Peer from 'peerjs';

export function cleanupParticipantPeer(peer: Peer | null): null {
  if (peer) {
    console.log('[peerCleanup] Cleaning up participant peer');
    peer.removeAllListeners();
    peer.destroy();
  }
  return null;
}
