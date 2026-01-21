import { useCallback, useEffect, useRef } from 'react';
import type { MediaConnection, DataConnection } from 'peerjs';
import type Peer from 'peerjs';
import type { MediaSourceType } from '../types/media.types';
import { peerService } from '../services/peerService';
import { useStreamContext } from '../contexts/StreamContext';
import { usePasswordProtection } from './usePasswordProtection';
import type { PeerRole } from '../types/peer.types';

interface UsePeerConnectionOptions {
  role: PeerRole;
  stream?: MediaStream | null;
  sourceType?: MediaSourceType | null;
  hostPeerId?: string | null;
  existingPeer?: Peer | null; // Reuse existing peer for participant
  onChatMessage?: (data: unknown) => void; // Chat message handler
}

const getDegradationPreference = (sourceType?: MediaSourceType | null): RTCDegradationPreference => {
  if (sourceType === 'screen') return 'maintain-resolution';
  if (sourceType === 'camera') return 'maintain-framerate';
  return 'balanced';
};

export function usePeerConnection({ role, stream, sourceType, hostPeerId, existingPeer, onChatMessage }: UsePeerConnectionOptions) {
  const {
    peerId,
    setPeerId,
    connectionStatus,
    setConnectionStatus,
    setRemoteStream,
    sessionSecret,
    sessionDomainPolicy,
    participantHostConnection
  } = useStreamContext();

  const participantsRef = useRef<Map<string, MediaConnection>>(new Map());
  const pendingParticipantsRef = useRef<Set<string>>(new Set());
  const pendingPasswordApprovalRef = useRef<Set<string>>(new Set());
  const streamRef = useRef<MediaStream | null>(stream || null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    streamRef.current = stream || null;
  }, [stream]);

  const handleParticipantApproved = useCallback((participantId: string) => {
    pendingPasswordApprovalRef.current.delete(participantId);

    const currentStream = streamRef.current;
    if (currentStream) {
      const call = peerService.callPeer(participantId, currentStream, {
        degradationPreference: getDegradationPreference(sourceType)
      });
      participantsRef.current.set(participantId, call);

      call.on('close', () => {
        participantsRef.current.delete(participantId);
      });
    } else {
      pendingParticipantsRef.current.add(participantId);
    }
  }, [sourceType]);

  const handleParticipantRejected = useCallback((participantId: string) => {
    pendingPasswordApprovalRef.current.delete(participantId);
  }, []);

  const { setupPasswordListener } = usePasswordProtection({
    sessionSecret,
    domainPolicy: sessionDomainPolicy,
    currentParticipantCount: participantsRef.current.size + pendingPasswordApprovalRef.current.size,
    onParticipantApproved: handleParticipantApproved,
    onParticipantRejected: handleParticipantRejected
  });

  const initializeHost = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    setConnectionStatus('initializing');

    try {
      await peerService.initializePeer(role, {
        onOpen: (id: string) => {
          setPeerId(id);
          setConnectionStatus('waiting_for_peer');
        },
        onConnection: (participantId: string, dataConn: DataConnection) => {
          setConnectionStatus('connected');

          pendingPasswordApprovalRef.current.add(participantId);
          setupPasswordListener(participantId, dataConn);

          if (onChatMessage) {
            dataConn.on('data', (data: unknown) => {
              onChatMessage(data);
            });
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
    } catch (error) {
      console.error('Failed to initialize peer:', error);
      setConnectionStatus('failed');
      hasInitialized.current = false;
    }
  }, [role, setPeerId, setConnectionStatus]);

  const initializeParticipant = useCallback(async () => {
    if (hasInitialized.current || !hostPeerId) return;
    hasInitialized.current = true;

    if (existingPeer) {
      if (existingPeer.id) {
        setPeerId(existingPeer.id);
      }

      if (onChatMessage && hostPeerId && participantHostConnection) {
        peerService.setDataConnection(hostPeerId, participantHostConnection);

        participantHostConnection.on('data', (data: unknown) => {
          onChatMessage(data);
        });
      }

      existingPeer.on('call', (call: MediaConnection) => {
        call.on('stream', (remoteStream: MediaStream) => {
          setRemoteStream(remoteStream);
          setConnectionStatus('connected');
        });

        call.on('close', () => {
          setRemoteStream(null);
          setConnectionStatus('disconnected');
        });

        peerService.answerCall(call);
      });

      existingPeer.on('error', (error: Error) => {
        console.error('[usePeerConnection] Peer error:', error);
        setConnectionStatus('failed');
      });

      existingPeer.on('close', () => {
        setConnectionStatus('closed');
      });

      setConnectionStatus('connecting');

      return existingPeer;
    }

    try {
      await peerService.initializePeer(role, {
        onOpen: (id: string) => {
          setPeerId(id);
          setConnectionStatus('connecting');

          peerService.connectToPeer(hostPeerId)
            .then((dataConn) => {
              if (onChatMessage) {
                dataConn.on('data', (data: unknown) => {
                  onChatMessage(data);
                });
              }
            })
            .catch((error) => {
              console.error('Failed to connect to host:', error);
              setConnectionStatus('failed');
            });
        },
        onCall: (call: MediaConnection) => {
          call.on('stream', (remoteStream: MediaStream) => {
            setRemoteStream(remoteStream);
            setConnectionStatus('connected');
          });

          call.on('close', () => {
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
    } catch (error) {
      console.error('Failed to initialize peer:', error);
      setConnectionStatus('failed');
      hasInitialized.current = false;
    }
  }, [role, hostPeerId, existingPeer, setPeerId, setConnectionStatus, setRemoteStream, participantHostConnection, onChatMessage]);

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
    if (role === 'participant' && !existingPeer) {
      hasInitialized.current = false;
    }
  }, [role, existingPeer]);

  useEffect(() => {
    if (role === 'host') {
      void initializeHost();
    } else if (role === 'participant' && hostPeerId) {
      void initializeParticipant();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, hostPeerId, existingPeer]);

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
      if (pendingParticipantsRef.current.size > 0) {
        pendingParticipantsRef.current.forEach((participantId) => {
          const call = peerService.callPeer(participantId, stream, {
            degradationPreference: getDegradationPreference(sourceType)
          });
          participantsRef.current.set(participantId, call);

          call.on('close', () => {
            participantsRef.current.delete(participantId);
          });
        });
        pendingParticipantsRef.current.clear();
      }

      if (connectionStatus === 'connected' && participantsRef.current.size > 0) {
        participantsRef.current.forEach((call) => {
          stream.getTracks().forEach((track) => {
            const sender = call.peerConnection.getSenders().find((s) => s.track?.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track);
            }
          });
          peerService.applyVideoDegradationPreference(call, getDegradationPreference(sourceType));
        });
      }
    }
  }, [role, stream, connectionStatus, sourceType]);

  return {
    peerId,
    connectionStatus,
    disconnect,
    getShareLink,
    participantCount: participantsRef.current.size
  };
}
