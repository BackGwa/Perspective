import Peer, { MediaConnection } from 'peerjs';
import { PEER_CONFIG, PEER_SERVER_CONFIG, ERROR_MESSAGES } from '../config/constants';
import type { PeerRole } from '../types/peer.types';

type PeerEventCallback = {
  onOpen?: (peerId: string) => void;
  onCall?: (call: MediaConnection) => void;
  onConnection?: (peerId: string) => void;
  onDisconnect?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
};

class PeerService {
  private peer: Peer | null = null;
  private activeCalls: Map<string, MediaConnection> = new Map();

  initializePeer(role: PeerRole, callbacks: PeerEventCallback): Peer {
    if (this.peer) {
      this.peer.destroy();
    }

    this.peer = new Peer({
      ...PEER_SERVER_CONFIG,
      config: {
        iceServers: PEER_CONFIG.iceServers
      },
      debug: PEER_CONFIG.debug
    });

    this.peer.on('open', (id: string) => {
      console.log('Peer connection opened with ID:', id);
      callbacks.onOpen?.(id);
    });

    this.peer.on('error', (error) => {
      console.error('Peer error:', error);
      const errorMessage = this.handlePeerError(error);
      callbacks.onError?.(errorMessage);
    });

    this.peer.on('disconnected', () => {
      console.log('Peer disconnected');
      callbacks.onDisconnect?.();
    });

    this.peer.on('close', () => {
      console.log('Peer connection closed');
      callbacks.onClose?.();
    });

    this.peer.on('call', (call: MediaConnection) => {
      console.log('Incoming call from:', call.peer);
      callbacks.onCall?.(call);
    });

    if (role === 'host') {
      this.peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        callbacks.onConnection?.(conn.peer);
      });
    }

    return this.peer;
  }

  callPeer(peerId: string, stream: MediaStream): MediaConnection {
    if (!this.peer) {
      throw new Error('Peer not initialized');
    }

    const call = this.peer.call(peerId, stream);
    this.activeCalls.set(peerId, call);

    call.on('close', () => {
      console.log('Call closed with:', peerId);
      this.activeCalls.delete(peerId);
    });

    return call;
  }

  answerCall(call: MediaConnection, stream?: MediaStream): void {
    call.answer(stream);

    call.on('stream', () => {
      console.log('Received remote stream from:', call.peer);
    });

    call.on('close', () => {
      console.log('Call closed with:', call.peer);
      this.activeCalls.delete(call.peer);
    });

    this.activeCalls.set(call.peer, call);
  }

  connectToPeer(hostPeerId: string): Promise<MediaConnection> {
    if (!this.peer) {
      throw new Error('Peer not initialized');
    }

    return new Promise((resolve, reject) => {
      const dataConnection = this.peer!.connect(hostPeerId);

      dataConnection.on('open', () => {
        console.log('Data connection established with host');
        resolve(dataConnection as unknown as MediaConnection);
      });

      dataConnection.on('error', (error) => {
        console.error('Data connection error:', error);
        reject(this.handlePeerError(error));
      });
    });
  }

  closeCall(peerId: string): void {
    const call = this.activeCalls.get(peerId);
    if (call) {
      call.close();
      this.activeCalls.delete(peerId);
    }
  }

  closeAllCalls(): void {
    this.activeCalls.forEach((call) => {
      call.close();
    });
    this.activeCalls.clear();
  }

  destroyPeer(): void {
    this.closeAllCalls();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  getPeer(): Peer | null {
    return this.peer;
  }

  getActiveCalls(): Map<string, MediaConnection> {
    return this.activeCalls;
  }

  generateShareLink(peerId: string): string {
    // Get current URL without hash to ensure clean base
    const baseUrl = window.location.href.split('#')[0];
    return `${baseUrl}#/share?peer=${encodeURIComponent(peerId)}`;
  }

  private handlePeerError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.message.includes('Could not connect to peer')) {
        return new Error(ERROR_MESSAGES.PEER_CONNECTION_FAILED);
      }
      if (error.message.includes('Invalid id')) {
        return new Error(ERROR_MESSAGES.INVALID_PEER_ID);
      }
      return error;
    }
    return new Error(ERROR_MESSAGES.PEER_CONNECTION_FAILED);
  }

  async validateConnection(hostPeerId: string, timeoutMs: number = 5000): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const tempPeer = new Peer({
        ...PEER_SERVER_CONFIG,
        config: { iceServers: PEER_CONFIG.iceServers },
        debug: 0
      });

      let responseHandled = false;
      const cleanup = () => {
        if (!responseHandled) {
          responseHandled = true;
          tempPeer.destroy();
        }
      };

      const timeoutId = setTimeout(() => {
        if (!responseHandled) {
          cleanup();
          reject(new Error('Connection timed out'));
        }
      }, timeoutMs);

      tempPeer.on('open', () => {
        const conn = tempPeer.connect(hostPeerId);

        conn.on('open', () => {
          clearTimeout(timeoutId);
          cleanup();
          resolve(true);
        });

        conn.on('error', () => {
          clearTimeout(timeoutId);
          cleanup();
          reject(new Error('Could not connect to host'));
        });

        conn.on('close', () => {
          if (!responseHandled) {
            clearTimeout(timeoutId);
            cleanup();
            reject(new Error('Connection closed immediately'));
          }
        });
      });

      tempPeer.on('error', (err) => {
        clearTimeout(timeoutId);
        cleanup();
        reject(err);
      });
    });
  }
}

export const peerService = new PeerService();
