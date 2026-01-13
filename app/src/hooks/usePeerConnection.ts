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
}

const getDegradationPreference = (sourceType?: MediaSourceType | null): RTCDegradationPreference => {
  if (sourceType === 'screen') return 'maintain-resolution';
  if (sourceType === 'camera') return 'maintain-framerate';
  return 'balanced';
};

export function usePeerConnection({ role, stream, sourceType, hostPeerId, existingPeer }: UsePeerConnectionOptions) {
  const {
    peerId,
    setPeerId,
    connectionStatus,
    setConnectionStatus,
    setRemoteStream,
    sessionPassword,
    sessionDomainPolicy
  } = useStreamContext();

  const participantsRef = useRef<Map<string, MediaConnection>>(new Map());
  const pendingParticipantsRef = useRef<Set<string>>(new Set());
  const pendingPasswordApprovalRef = useRef<Set<string>>(new Set());
  const streamRef = useRef<MediaStream | null>(stream || null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    streamRef.current = stream || null;
  }, [stream]);

  // Password protection for host
  const handleParticipantApproved = useCallback((participantId: string) => {
    console.log('[usePeerConnection] Participant approved:', participantId);
    pendingPasswordApprovalRef.current.delete(participantId);

    const currentStream = streamRef.current;
    if (currentStream) {
      console.log('[usePeerConnection] Calling approved participant:', participantId);
      const call = peerService.callPeer(participantId, currentStream, {
        degradationPreference: getDegradationPreference(sourceType)
      });
      participantsRef.current.set(participantId, call);

      call.on('close', () => {
        console.log('Participant disconnected:', participantId);
        participantsRef.current.delete(participantId);
      });
    } else {
      // Stream not ready yet, add to pending participants
      pendingParticipantsRef.current.add(participantId);
    }
  }, [sourceType]);

  const handleParticipantRejected = useCallback((participantId: string) => {
    console.log('[usePeerConnection] Participant rejected:', participantId);
    pendingPasswordApprovalRef.current.delete(participantId);
  }, []);

  const { setupPasswordListener } = usePasswordProtection({
    sessionPassword,
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
          console.log('Participant connected:', participantId);
          setConnectionStatus('connected');

          // Setup password listener - this will handle approval/rejection
          pendingPasswordApprovalRef.current.add(participantId);
          setupPasswordListener(participantId, dataConn);
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

    // Check if we have an existing peer (from password verification)
    if (existingPeer) {
      console.log('[usePeerConnection] Reusing existing peer from password verification');

      // Set peer ID from existing peer
      if (existingPeer.id) {
        setPeerId(existingPeer.id);
      }

      // Add call listener - host may call after we navigate here
      existingPeer.on('call', (call: MediaConnection) => {
        console.log('[usePeerConnection] Receiving call from host on existing peer');

        call.on('stream', (remoteStream: MediaStream) => {
          console.log('[usePeerConnection] Received remote stream');
          setRemoteStream(remoteStream);
          setConnectionStatus('connected');
        });

        call.on('close', () => {
          console.log('[usePeerConnection] Host ended the call');
          setRemoteStream(null);
          setConnectionStatus('disconnected');
        });

        peerService.answerCall(call);
      });

      existingPeer.on('disconnected', () => {
        console.log('[usePeerConnection] Existing peer disconnected from server');
      });

      existingPeer.on('error', (error: Error) => {
        console.error('[usePeerConnection] Peer error:', error);
        setConnectionStatus('failed');
      });

      existingPeer.on('close', () => {
        console.log('[usePeerConnection] Existing peer closed');
        setConnectionStatus('closed');
      });

      // Set connecting status while waiting for host's call
      setConnectionStatus('connecting');

      return existingPeer;
    }

    // No existing peer - create new one (shouldn't happen with password flow)
    try {
      await peerService.initializePeer(role, {
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
    } catch (error) {
      console.error('Failed to initialize peer:', error);
      setConnectionStatus('failed');
      hasInitialized.current = false;
    }
  }, [role, hostPeerId, existingPeer, setPeerId, setConnectionStatus, setRemoteStream]);

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

  // Reset hasInitialized when existingPeer changes (for new sessions)
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
          const call = peerService.callPeer(participantId, stream, {
            degradationPreference: getDegradationPreference(sourceType)
          });
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
