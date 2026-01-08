import { useCallback, useEffect, useRef } from 'react';
import { MediaConnection } from 'peerjs';
import { peerService } from '../services/peerService';
import { useStreamContext } from '../contexts/StreamContext';
import type { PeerRole } from '../types/peer.types';

interface UsePeerConnectionOptions {
  role: PeerRole;
  stream?: MediaStream | null;
  hostPeerId?: string | null;
}

export function usePeerConnection({ role, stream, hostPeerId }: UsePeerConnectionOptions) {
  const {
    peerId,
    setPeerId,
    connectionStatus,
    setConnectionStatus,
    setRemoteStream
  } = useStreamContext();

  const participantsRef = useRef<Map<string, MediaConnection>>(new Map());
  const pendingParticipantsRef = useRef<Set<string>>(new Set());
  const streamRef = useRef<MediaStream | null>(stream || null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    streamRef.current = stream || null;
  }, [stream]);

  const initializeHost = useCallback(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    setConnectionStatus('initializing');

    const peer = peerService.initializePeer(role, {
      onOpen: (id: string) => {
        setPeerId(id);
        setConnectionStatus('waiting_for_peer');
      },
      onConnection: (participantId: string) => {
        console.log('Participant connected:', participantId);
        setConnectionStatus('connected');

        const currentStream = streamRef.current;
        if (currentStream) {
          console.log('Stream available, calling participant:', participantId);
          const call = peerService.callPeer(participantId, currentStream);
          participantsRef.current.set(participantId, call);

          call.on('close', () => {
            console.log('Participant disconnected:', participantId);
            participantsRef.current.delete(participantId);
          });
        } else {
          console.log('Stream not ready, adding participant to pending list');
          pendingParticipantsRef.current.add(participantId);
        }
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected');
      },
      onError: (error: Error) => {
        console.error('Peer error:', error);
        setConnectionStatus('failed');
      },
      onClose: () => {
        setConnectionStatus('closed');
      }
    });

    return peer;
  }, [role, setPeerId, setConnectionStatus]);

  const initializeParticipant = useCallback(async () => {
    if (hasInitialized.current || !hostPeerId) return;
    hasInitialized.current = true;

    setConnectionStatus('initializing');

    const peer = peerService.initializePeer(role, {
      onOpen: (id: string) => {
        setPeerId(id);
        setConnectionStatus('connecting');

        peerService.connectToPeer(hostPeerId)
          .then(() => {
            console.log('Connected to host, waiting for call...');
          })
          .catch((error) => {
            console.error('Failed to connect to host:', error);
            setConnectionStatus('failed');
          });
      },
      onCall: (call: MediaConnection) => {
        console.log('Receiving call from host');

        call.on('stream', (remoteStream: MediaStream) => {
          console.log('Received remote stream', remoteStream);
          console.log('Stream tracks:', remoteStream.getTracks());
          setRemoteStream(remoteStream);
          setConnectionStatus('connected');
        });

        call.on('close', () => {
          console.log('Host ended the call');
          setRemoteStream(null);
          setConnectionStatus('disconnected');
        });

        peerService.answerCall(call);
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected');
      },
      onError: (error: Error) => {
        console.error('Peer error:', error);
        setConnectionStatus('failed');
      },
      onClose: () => {
        setConnectionStatus('closed');
      }
    });

    return peer;
  }, [role, hostPeerId, setPeerId, setConnectionStatus, setRemoteStream]);

  const disconnect = useCallback(() => {
    peerService.destroyPeer();
    participantsRef.current.clear();
    setConnectionStatus('closed');
    setPeerId(null);
    setRemoteStream(null);
    hasInitialized.current = false;
  }, [setConnectionStatus, setPeerId, setRemoteStream]);

  const getShareLink = useCallback(() => {
    if (role === 'host' && peerId) {
      return peerService.generateShareLink(peerId);
    } else if (role === 'participant' && hostPeerId) {
      return peerService.generateShareLink(hostPeerId);
    }
    return null;
  }, [peerId, role, hostPeerId]);

  useEffect(() => {
    if (role === 'host') {
      initializeHost();
    } else if (role === 'participant' && hostPeerId) {
      initializeParticipant();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, hostPeerId]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (hasInitialized.current) {
        disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (role === 'host' && stream) {
      // Call pending participants
      if (pendingParticipantsRef.current.size > 0) {
        console.log('Stream ready, calling pending participants:', pendingParticipantsRef.current);
        pendingParticipantsRef.current.forEach((participantId) => {
          const call = peerService.callPeer(participantId, stream);
          participantsRef.current.set(participantId, call);

          call.on('close', () => {
            console.log('Participant disconnected:', participantId);
            participantsRef.current.delete(participantId);
          });
        });
        pendingParticipantsRef.current.clear();
      }

      // Update existing participants with new stream
      if (connectionStatus === 'connected' && participantsRef.current.size > 0) {
        participantsRef.current.forEach((call) => {
          stream.getTracks().forEach((track) => {
            const sender = call.peerConnection.getSenders().find((s) => s.track?.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track);
            }
          });
        });
      }
    }
  }, [role, stream, connectionStatus]);

  return {
    peerId,
    connectionStatus,
    disconnect,
    getShareLink,
    participantCount: participantsRef.current.size
  };
}
