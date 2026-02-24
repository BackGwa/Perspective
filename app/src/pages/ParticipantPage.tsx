import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RemoteStream } from '../components/participant/RemoteStream';
import { ParticipantControls } from '../components/participant/ParticipantControls';
import { usePeerConnection } from '../hooks/usePeerConnection';
import { useChatMessaging } from '../hooks/useChatMessaging';
import { ChatProvider, useChatContext } from '../contexts/ChatContext';
import { useStreamContext } from '../contexts/StreamContext';
import { useControlsOverlay } from '../hooks/useControlsOverlay';
import { ERROR_MESSAGES } from '../config/constants';
import { cleanupParticipantPeer } from '../utils/peerCleanup';
import { navigateWithError } from '../utils/navigationHelpers';
import '../../styles/components/participant.scss';

function ParticipantPageInner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hostPeerId = searchParams.get('peer');
  const [isMuted, setIsMuted] = useState(true);
  const [isQRPanelVisible, setIsQRPanelVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const isLeavingRef = useRef(false);
  const controlsOverlayRef = useRef<HTMLDivElement>(null);
  const { isOverlayVisible, showOverlay, hideOverlay } = useControlsOverlay(controlsOverlayRef);

  const { peerId, connectionStatus, setConnectionStatus, remoteStream, setRemoteStream, participantPeer, setParticipantPeer, setParticipantHostConnection, sessionSecret } = useStreamContext();
  const { unreadCount, setConnectionTimestamp, connectionTimestamp, setChatOpen } = useChatContext();

  useEffect(() => {
    if (!hostPeerId) {
      navigateWithError(navigate, ERROR_MESSAGES.INVALID_PEER_ID);
      return;
    }

    if (!participantPeer) {
      if (isLeavingRef.current) return;
      navigate('/', {
        replace: true,
        state: {
          autoJoin: true,
          sessionId: hostPeerId
        }
      });
    }
  }, [hostPeerId, participantPeer, navigate]);

  const { sendMessage, handleIncomingMessage } = useChatMessaging({
    role: 'participant',
    peerId,
    hostPeerId,
    sessionSecret,
    connectionTimestamp: connectionTimestamp || 0
  });

  const { getShareLink } = usePeerConnection({
    role: 'participant',
    hostPeerId: participantPeer ? hostPeerId : null,
    existingPeer: participantPeer,
    onChatMessage: handleIncomingMessage
  });

  useEffect(() => {
    if (connectionStatus === 'connected' && !connectionTimestamp) {
      setConnectionTimestamp(Date.now());
    }
  }, [connectionStatus, connectionTimestamp, setConnectionTimestamp]);

  useEffect(() => {
    if (!participantPeer) return;

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
    setChatOpen(true);
  }, [setChatOpen]);
  const handleCloseChat = useCallback(() => {
    setIsChatVisible(false);
    setChatOpen(false);
    showOverlay();
  }, [setChatOpen, showOverlay]);
  const handleOverlayPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (isChatVisible) return;

    const targetNode = event.target as Node | null;
    const overlayElement = controlsOverlayRef.current;
    const clickedInsideOverlay = !!(overlayElement && targetNode && overlayElement.contains(targetNode));

    if (isOverlayVisible || isQRPanelVisible) {
      if (clickedInsideOverlay) {
        showOverlay();
      } else {
        handleCloseQRPanel();
        hideOverlay();
      }
      return;
    }

    if (!clickedInsideOverlay) {
      showOverlay();
    }
  }, [handleCloseQRPanel, hideOverlay, isChatVisible, isOverlayVisible, isQRPanelVisible, showOverlay]);


  const handleLeave = () => {
    isLeavingRef.current = true;
    setParticipantPeer(cleanupParticipantPeer(participantPeer));
    setParticipantHostConnection(null);
    setRemoteStream(null);
    setConnectionStatus('idle');
    navigate('/', { replace: true });
  };

  useEffect(() => {
    return () => {
      if (participantPeer) {
        setParticipantPeer(cleanupParticipantPeer(participantPeer));
      }
      setParticipantHostConnection(null);
      setRemoteStream(null);
      setConnectionStatus('idle');
    };
  }, [participantPeer, setParticipantPeer, setParticipantHostConnection, setRemoteStream, setConnectionStatus]);

  const isConnecting = ['initializing', 'connecting', 'waiting_for_peer'].includes(connectionStatus);

  if (!hostPeerId) return null;

  return (
    <div className={`participant-page ${isOverlayVisible || isQRPanelVisible || isChatVisible ? 'participant-page--controls-visible' : ''}`} onPointerDown={handleOverlayPointerDown}>
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
          unreadCount={unreadCount}
          onToggleAudio={handleToggleAudio}
          onLeave={handleLeave}
          onToggleQRPanel={handleToggleQRPanel}
          onCloseQRPanel={handleCloseQRPanel}
          onOpenChat={handleOpenChat}
          onCloseChat={handleCloseChat}
          onSendMessage={sendMessage}
        />
      )}
    </div>
  );
}

export function ParticipantPage() {
  return (
    <ChatProvider>
      <ParticipantPageInner />
    </ChatProvider>
  );
}
