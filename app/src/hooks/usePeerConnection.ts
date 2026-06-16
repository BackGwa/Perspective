import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaConnection, DataConnection } from 'peerjs';
import type Peer from 'peerjs';
import type { MediaSourceType } from '../types/media.types';
import { peerService } from '../services/peerService';
import { useStreamContext } from '../contexts/StreamContext';
import { usePasswordProtection } from './usePasswordProtection';
import type { PeerRole } from '../types/peer.types';
import { isChatDataMessage } from '../types/chat.types';

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
  const readyParticipantsWaitingForStreamRef = useRef<Set<string>>(new Set());
  const pendingPasswordApprovalRef = useRef<Set<string>>(new Set());
  const approvedDataConnectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const chatListenerParticipantsRef = useRef<Set<string>>(new Set());
  const streamRef = useRef<MediaStream | null>(stream || null);
  const hasInitialized = useRef(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    streamRef.current = stream || null;
  }, [stream]);

  const updateHostParticipantStatus = useCallback(() => {
    const count = participantsRef.current.size;
    setParticipantCount(count);
    if (role === 'host') {
      setConnectionStatus(count > 0 ? 'connected' : 'waiting_for_peer');
    }
  }, [role, setConnectionStatus]);

  const clearParticipantState = useCallback((participantId: string) => {
    pendingPasswordApprovalRef.current.delete(participantId);
    approvedDataConnectionsRef.current.delete(participantId);
    readyParticipantsWaitingForStreamRef.current.delete(participantId);
    chatListenerParticipantsRef.current.delete(participantId);
    participantsRef.current.delete(participantId);
    peerService.setChatEnabled(participantId, false);
    updateHostParticipantStatus();
  }, [updateHostParticipantStatus]);

  const startMediaCall = useCallback((participantId: string) => {
    if (participantsRef.current.has(participantId)) return;

    const currentStream = streamRef.current;
    if (currentStream) {
      const call = peerService.callPeer(participantId, currentStream, {
        degradationPreference: getDegradationPreference(sourceType)
      });
      participantsRef.current.set(participantId, call);
      readyParticipantsWaitingForStreamRef.current.delete(participantId);
      updateHostParticipantStatus();

      call.on('close', () => {
        participantsRef.current.delete(participantId);
        peerService.setChatEnabled(participantId, false);
        chatListenerParticipantsRef.current.delete(participantId);
        updateHostParticipantStatus();
      });
    } else {
      readyParticipantsWaitingForStreamRef.current.add(participantId);
    }
  }, [sourceType, updateHostParticipantStatus]);

  const enableParticipantChat = useCallback((participantId: string, dataConn: DataConnection) => {
    peerService.setChatEnabled(participantId, true);

    if (!onChatMessage || chatListenerParticipantsRef.current.has(participantId)) return;

    chatListenerParticipantsRef.current.add(participantId);
    dataConn.on('data', (data: unknown) => {
      if (isChatDataMessage(data)) {
        onChatMessage({
          ...data,
          payload: {
            ...data.payload,
            senderId: participantId,
            senderRole: 'peer'
          }
        });
        return;
      }

      onChatMessage(data);
    });
  }, [onChatMessage]);

  const handleParticipantApproved = useCallback((participantId: string, dataConn: DataConnection) => {
    pendingPasswordApprovalRef.current.delete(participantId);
    approvedDataConnectionsRef.current.set(participantId, dataConn);
  }, []);

  const handleParticipantReady = useCallback((participantId: string, dataConn: DataConnection) => {
    const approvedConnection = approvedDataConnectionsRef.current.get(participantId);
    if (approvedConnection !== dataConn) return;

    approvedDataConnectionsRef.current.delete(participantId);
    enableParticipantChat(participantId, dataConn);
    startMediaCall(participantId);
  }, [enableParticipantChat, startMediaCall]);

  const handleParticipantRejected = useCallback((participantId: string) => {
    clearParticipantState(participantId);
  }, [clearParticipantState]);

  const getCurrentParticipantCount = useCallback((pendingPeerId: string) => {
    const pendingCount = pendingPasswordApprovalRef.current.size - (pendingPasswordApprovalRef.current.has(pendingPeerId) ? 1 : 0);
    return participantsRef.current.size + approvedDataConnectionsRef.current.size + readyParticipantsWaitingForStreamRef.current.size + pendingCount;
  }, []);

  const { setupPasswordListener } = usePasswordProtection({
    sessionSecret,
    domainPolicy: sessionDomainPolicy,
    getCurrentParticipantCount,
    onParticipantApproved: handleParticipantApproved,
    onParticipantReady: handleParticipantReady,
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
          pendingPasswordApprovalRef.current.add(participantId);
          setupPasswordListener(participantId, dataConn);

          const handleDataConnectionClosed = () => {
            const activeCall = participantsRef.current.get(participantId);
            activeCall?.close();
            clearParticipantState(participantId);
          };

          dataConn.on('close', handleDataConnectionClosed);
          dataConn.on('error', handleDataConnectionClosed);
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
  }, [role, setPeerId, setConnectionStatus, setupPasswordListener, clearParticipantState]);

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

        const handleHostConnectionClosed = () => {
          setConnectionStatus('disconnected');
        };

        participantHostConnection.on('close', handleHostConnectionClosed);
        participantHostConnection.on('error', handleHostConnectionClosed);
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
    readyParticipantsWaitingForStreamRef.current.clear();
    pendingPasswordApprovalRef.current.clear();
    approvedDataConnectionsRef.current.clear();
    chatListenerParticipantsRef.current.clear();
    setParticipantCount(0);
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
      if (readyParticipantsWaitingForStreamRef.current.size > 0) {
        readyParticipantsWaitingForStreamRef.current.forEach((participantId) => {
          startMediaCall(participantId);
        });
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
  }, [role, stream, connectionStatus, sourceType, startMediaCall]);

  return {
    peerId,
    connectionStatus,
    disconnect,
    getShareLink,
    participantCount
  };
}
