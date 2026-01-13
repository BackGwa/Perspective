import Peer, { MediaConnection, DataConnection } from 'peerjs';
import { PEER_CONFIG, PEER_SERVER_CONFIG, ERROR_MESSAGES } from '../config/constants';
import type { PeerRole } from '../types/peer.types';

type PeerEventCallback = {
  onOpen?: (peerId: string) => void;
  onCall?: (call: MediaConnection) => void;
  onConnection?: (peerId: string, dataConnection: DataConnection) => void;
  onDisconnect?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
};

type CallPeerOptions = {
  degradationPreference?: RTCDegradationPreference;
};

class PeerService {
  private peer: Peer | null = null;
  private activeCalls: Map<string, MediaConnection> = new Map();
  private dataConnections: Map<string, DataConnection> = new Map();

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

        // Wait for the connection to be fully open before storing and calling callback
        conn.on('open', () => {
          console.log('Data connection opened with:', conn.peer);
          this.dataConnections.set(conn.peer, conn);
          callbacks.onConnection?.(conn.peer, conn);
        });

        conn.on('close', () => {
          console.log('Data connection closed with:', conn.peer);
          this.dataConnections.delete(conn.peer);
        });
      });
    }

    return this.peer;
  }

  callPeer(peerId: string, stream: MediaStream, options: CallPeerOptions = {}): MediaConnection {
    if (!this.peer) {
      throw new Error(ERROR_MESSAGES.PEER_NOT_INITIALIZED);
    }

    const call = this.peer.call(peerId, stream);
    this.activeCalls.set(peerId, call);

    if (options.degradationPreference) {
      this.applyVideoDegradationPreference(call, options.degradationPreference);
    }

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

  connectToPeer(hostPeerId: string): Promise<DataConnection> {
    if (!this.peer) {
      throw new Error(ERROR_MESSAGES.PEER_NOT_INITIALIZED);
    }

    return new Promise((resolve, reject) => {
      const dataConnection = this.peer!.connect(hostPeerId);

      dataConnection.on('open', () => {
        console.log('Data connection established with host');
        this.dataConnections.set(hostPeerId, dataConnection);
        resolve(dataConnection);
      });

      dataConnection.on('error', (error) => {
        console.error('Data connection error:', error);
        reject(this.handlePeerError(error));
      });

      dataConnection.on('close', () => {
        console.log('Data connection closed with host');
        this.dataConnections.delete(hostPeerId);
      });
    });
  }

  closeAllCalls(): void {
    this.activeCalls.forEach((call) => {
      call.close();
    });
    this.activeCalls.clear();
  }

  destroyPeer(): void {
    this.closeAllCalls();
    this.dataConnections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  sendDataMessage(peerId: string, message: unknown): void {
    const conn = this.dataConnections.get(peerId);
    if (conn && conn.open) {
      conn.send(message);
    } else {
      console.error('Data connection not available for peer:', peerId);
    }
  }

  applyVideoDegradationPreference(call: MediaConnection, preference: RTCDegradationPreference): void {
    const sender = call.peerConnection
      .getSenders()
      .find((s) => s.track?.kind === 'video');
    if (!sender) return;

    const params = sender.getParameters();
    params.degradationPreference = preference;
    sender.setParameters(params).catch((error) => {
      console.warn('Failed to apply degradation preference:', error);
    });
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
          reject(new Error(ERROR_MESSAGES.CONNECTION_TIMED_OUT));
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
          reject(new Error(ERROR_MESSAGES.COULD_NOT_CONNECT_TO_HOST));
        });

        conn.on('close', () => {
          if (!responseHandled) {
            clearTimeout(timeoutId);
            cleanup();
            reject(new Error(ERROR_MESSAGES.CONNECTION_CLOSED_IMMEDIATELY));
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
