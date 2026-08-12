import type Peer from 'peerjs';
import type { MediaConnection, DataConnection } from 'peerjs';
import { PEER_CONFIG, PEER_SERVER_CONFIG, ERROR_MESSAGES, SIGNALING_RECONNECT } from '../config/constants';
import type { PeerRole } from '../types/peer.types';

type PeerEventCallback = {
  onOpen?: (peerId: string) => void;
  onCall?: (call: MediaConnection) => void;
  onConnection?: (peerId: string, dataConnection: DataConnection) => void;
  onReconnect?: () => void;
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
  private chatEnabledPeers: Set<string> = new Set();
  private peerModulePromise: Promise<typeof import('peerjs')> | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;

  private async loadPeerModule() {
    if (!this.peerModulePromise) {
      this.peerModulePromise = import('peerjs');
    }
    return this.peerModulePromise;
  }

  async initializePeer(role: PeerRole, callbacks: PeerEventCallback): Promise<Peer> {
    const { default: Peer } = await this.loadPeerModule();
    if (this.peer) {
      this.peer.destroy();
    }
    this.cancelReconnect();

    this.peer = new Peer({
      ...PEER_SERVER_CONFIG,
      config: {
        iceServers: PEER_CONFIG.iceServers
      },
      debug: PEER_CONFIG.debug
    });

    let hasOpened = false;
    this.peer.on('open', (id: string) => {
      this.cancelReconnect();
      if (hasOpened) {
        callbacks.onReconnect?.();
        return;
      }
      hasOpened = true;
      callbacks.onOpen?.(id);
    });

    this.peer.on('error', (error) => {
      console.error('Peer error:', error);
      const errorMessage = this.handlePeerError(error);
      callbacks.onError?.(errorMessage);
    });

    this.peer.on('disconnected', () => {
      this.attemptReconnect(callbacks);
    });

    this.peer.on('close', () => {
      this.cancelReconnect();
      callbacks.onClose?.();
    });

    this.peer.on('call', (call: MediaConnection) => {
      callbacks.onCall?.(call);
    });

    if (role === 'host') {
      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          this.dataConnections.set(conn.peer, conn);
          callbacks.onConnection?.(conn.peer, conn);
        });

        conn.on('close', () => {
          this.dataConnections.delete(conn.peer);
          this.chatEnabledPeers.delete(conn.peer);
        });
      });
    }

    return this.peer;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private cancelReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
  }

  // Peers that are already connected keep streaming without the signaling
  // socket, so only report a disconnect once every retry is exhausted.
  private attemptReconnect(callbacks: PeerEventCallback): void {
    const peer = this.peer;
    if (!peer || peer.destroyed) return;

    if (this.reconnectAttempts >= SIGNALING_RECONNECT.MAX_ATTEMPTS) {
      this.cancelReconnect();
      callbacks.onDisconnect?.();
      return;
    }

    const delay = SIGNALING_RECONNECT.BASE_DELAY * 2 ** this.reconnectAttempts;
    this.reconnectAttempts += 1;

    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      const current = this.peer;
      if (!current || current.destroyed || !current.disconnected) return;
      current.reconnect();
    }, delay);
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
      this.activeCalls.delete(peerId);
    });

    return call;
  }

  answerCall(call: MediaConnection, stream?: MediaStream): void {
    call.answer(stream);

    call.on('close', () => {
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
        this.dataConnections.set(hostPeerId, dataConnection);
        resolve(dataConnection);
      });

      dataConnection.on('error', (error) => {
        console.error('Data connection error:', error);
        reject(this.handlePeerError(error));
      });

      dataConnection.on('close', () => {
        this.dataConnections.delete(hostPeerId);
        this.chatEnabledPeers.delete(hostPeerId);
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
    this.cancelReconnect();
    this.closeAllCalls();
    this.dataConnections.clear();
    this.chatEnabledPeers.clear();
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

  broadcastDataMessage(message: unknown): void {
    this.dataConnections.forEach((conn, peerId) => {
      if (conn.open) {
        this.sendDataMessage(peerId, message);
      }
    });
  }

  getDataConnection(peerId: string): DataConnection | undefined {
    return this.dataConnections.get(peerId);
  }

  getAllParticipantIds(): string[] {
    return Array.from(this.dataConnections.keys());
  }

  getChatParticipantIds(): string[] {
    return Array.from(this.chatEnabledPeers).filter((peerId) => {
      const connection = this.dataConnections.get(peerId);
      return !!connection?.open;
    });
  }

  setChatEnabled(peerId: string, enabled: boolean): void {
    if (enabled) {
      this.chatEnabledPeers.add(peerId);
    } else {
      this.chatEnabledPeers.delete(peerId);
    }
  }

  setDataConnection(peerId: string, connection: DataConnection): void {
    this.dataConnections.set(peerId, connection);

    connection.on('close', () => {
      this.dataConnections.delete(peerId);
      this.chatEnabledPeers.delete(peerId);
    });
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

}

export const peerService = new PeerService();
