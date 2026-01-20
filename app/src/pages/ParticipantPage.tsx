import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RemoteStream } from '../components/participant/RemoteStream';
import { ParticipantControls } from '../components/participant/ParticipantControls';
import { usePeerConnection } from '../hooks/usePeerConnection';
import { useStreamContext } from '../contexts/StreamContext';
import { useControlsOverlay } from '../hooks/useControlsOverlay';
import { ERROR_MESSAGES } from '../config/constants';
import { cleanupParticipantPeer } from '../utils/peerCleanup';
import { navigateWithError } from '../utils/navigationHelpers';
import '../../styles/components/participant.scss';

export function ParticipantPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hostPeerId = searchParams.get('peer');
  const [isMuted, setIsMuted] = useState(true);
  const [isQRPanelVisible, setIsQRPanelVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const isLeavingRef = useRef(false);
  const controlsOverlayRef = useRef<HTMLDivElement>(null);
  const { isOverlayVisible, handlePointerDown } = useControlsOverlay(controlsOverlayRef);

  const { connectionStatus, setConnectionStatus, remoteStream, setRemoteStream, participantPeer, setParticipantPeer } = useStreamContext();

  // Check if accessed directly via link (no existing peer from password verification)
  useEffect(() => {
    if (!hostPeerId) {
      navigateWithError(navigate, ERROR_MESSAGES.INVALID_PEER_ID);
      return;
    }

    if (!participantPeer) {
      if (isLeavingRef.current) return;
      console.log('[ParticipantPage] No existing peer, redirecting to landing page for password verification');
      // Redirect to landing page with session ID for password verification
      navigate('/', {
        replace: true,
        state: {
          autoJoin: true,
          sessionId: hostPeerId
        }
      });
    }
  }, [hostPeerId, participantPeer, navigate]);

  // Only initialize peer connection after we have a participantPeer
  const { getShareLink } = usePeerConnection({
    role: 'participant',
    hostPeerId: participantPeer ? hostPeerId : null, // Only connect if we have a peer
    existingPeer: participantPeer
  });

  // Handle connection status changes - only if we have a participantPeer
  useEffect(() => {
    // Skip status checks if no participantPeer (still waiting for password verification)
    if (!participantPeer) return;

    // Skip if still in initial/connecting states
    if (connectionStatus === 'idle' || connectionStatus === 'initializing' || connectionStatus === 'connecting') {
      return;
    }

    if (connectionStatus === 'failed') {
      navigateWithError(navigate, ERROR_MESSAGES.PEER_CONNECTION_FAILED);
    } else if (connectionStatus === 'closed' || connectionStatus === 'disconnected') {
      navigateWithError(navigate, ERROR_MESSAGES.SESSION_ENDED);
    }
  }, [connectionStatus, participantPeer, navigate]);

  const handleToggleAudio = () => {
    setIsMuted(!isMuted);
  };

  const handleToggleQRPanel = useCallback(() => {
    setIsQRPanelVisible(prev => {
      const nextState = !prev;
      if (nextState) {
        setIsChatVisible(false);
      }
      return nextState;
    });
  }, []);

  const handleCloseQRPanel = useCallback(() => {
    setIsQRPanelVisible(false);
  }, []);
  const handleOpenChat = useCallback(() => {
    setIsChatVisible(true);
    setIsQRPanelVisible(false);
  }, []);
  const handleCloseChat = useCallback(() => {
    setIsChatVisible(false);
  }, []);


  const handleLeave = () => {
    isLeavingRef.current = true;
    setParticipantPeer(cleanupParticipantPeer(participantPeer));
    setRemoteStream(null);
    setConnectionStatus('idle');
    navigate('/', { replace: true });
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (participantPeer) {
        console.log('[ParticipantPage] Cleaning up participant peer on unmount');
        setParticipantPeer(cleanupParticipantPeer(participantPeer));
      }
      setRemoteStream(null);
      setConnectionStatus('idle');
    };
  }, [participantPeer, setParticipantPeer, setRemoteStream, setConnectionStatus]);

  const isConnecting = ['initializing', 'connecting', 'waiting_for_peer'].includes(connectionStatus);

  if (!hostPeerId) return null;

  return (
    <div className={`participant-page ${isOverlayVisible || isQRPanelVisible || isChatVisible ? 'participant-page--controls-visible' : ''}`} onPointerDown={handlePointerDown}>
      <RemoteStream
        stream={remoteStream}
        isConnecting={isConnecting}
        isMuted={isMuted}
      />
      {!isConnecting && remoteStream && (
        <ParticipantControls
          isMuted={isMuted}
          isOverlayVisible={isOverlayVisible}
          isQRPanelVisible={isQRPanelVisible}
          isChatVisible={isChatVisible}
          overlayRef={controlsOverlayRef}
          shareLink={getShareLink() || ''}
          onToggleAudio={handleToggleAudio}
          onLeave={handleLeave}
          onToggleQRPanel={handleToggleQRPanel}
          onCloseQRPanel={handleCloseQRPanel}
          onOpenChat={handleOpenChat}
          onCloseChat={handleCloseChat}
        />
      )}
    </div>
  );
}
