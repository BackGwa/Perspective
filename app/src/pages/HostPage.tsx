import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LocalPreview } from '../components/host/LocalPreview';
import { HostControls } from '../components/host/HostControls';
import { useMediaStream } from '../hooks/useMediaStream';
import { usePeerConnection } from '../hooks/usePeerConnection';
import { useControlsOverlay } from '../hooks/useControlsOverlay';
import { useChatMessaging } from '../hooks/useChatMessaging';
import { ChatProvider, useChatContext } from '../contexts/ChatContext';
import { useStreamContext } from '../contexts/StreamContext';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { navigateWithError } from '../utils/navigationHelpers';
import { TIMING } from '../config/timing';
import '../../styles/components/host.scss';

function HostPageInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isWaitingForStream, setIsWaitingForStream] = useState(false);
  const [isQRPanelVisible, setIsQRPanelVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const hasNavigatedRef = useRef(false);
  const controlsOverlayRef = useRef<HTMLDivElement>(null);
  const disconnectRef = useRef<() => void>();
  const { peerId, connectionStatus, sessionSecret } = useStreamContext();
  const { unreadCount, setConnectionTimestamp, connectionTimestamp, setChatOpen } = useChatContext();

  const handleStreamEnded = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    disconnectRef.current?.();
    navigate('/');
  }, [navigate]);
  const { isOverlayVisible, showOverlay, hideOverlay } = useControlsOverlay(controlsOverlayRef);
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

  const {
    stream,
    sourceType,
    isPaused,
    isMuted,
    error,
    canSwitchCamera,
    stopCapture,
    toggleVideo,
    toggleAudio,
    switchCamera
  } = useMediaStream({ onStreamEnded: handleStreamEnded });

  // Store latest functions in refs for cleanup
  const stopCaptureRef = useRef(stopCapture);

  useEffect(() => {
    stopCaptureRef.current = stopCapture;
  }, [stopCapture]);

  // Debug logging
  useEffect(() => {
    console.log('[HostPage] Render - stream:', stream);
    console.log('[HostPage] Render - sourceType:', sourceType);
    console.log('[HostPage] Render - location.state:', location.state);
  });

  // Initialize chat messaging
  const { sendMessage, handleIncomingMessage } = useChatMessaging({
    role: 'host',
    peerId,
    sessionSecret,
    connectionTimestamp: connectionTimestamp || 0
  });

  const { disconnect, getShareLink, participantCount } = usePeerConnection({
    role: 'host',
    stream,
    sourceType,
    onChatMessage: handleIncomingMessage
  });

  // Set connection timestamp when host starts sharing
  useEffect(() => {
    if (connectionStatus === 'waiting_for_peer' && !connectionTimestamp) {
      setConnectionTimestamp(Date.now());
    }
  }, [connectionStatus, connectionTimestamp, setConnectionTimestamp]);

  useEffect(() => {
    disconnectRef.current = disconnect;
  }, [disconnect]);



  // Handle initial mount from LandingPage
  useEffect(() => {
    const fromLanding = location.state?.fromLanding;
    console.log('[HostPage] Navigation check - fromLanding:', fromLanding, 'stream:', !!stream);

    if (fromLanding) {
      if (stream) {
        console.log('[HostPage] Stream available from context');
        setIsWaitingForStream(false);
      } else {
        // Give some time for the stream to be set in context
        console.log('[HostPage] Waiting for stream from LandingPage...');
        setIsWaitingForStream(true);
        const timeoutId = setTimeout(() => {
          if (!stream && !hasNavigatedRef.current) {
            console.error('[HostPage] Stream timeout - redirecting to landing');
            hasNavigatedRef.current = true;
            navigateWithError(navigate, 'Failed to initialize stream');
          }
        }, TIMING.STREAM_WAIT_TIMEOUT);

        return () => {
          console.log('[HostPage] Cleaning up stream wait timeout');
          clearTimeout(timeoutId);
        };
      }
    } else if (!stream && !hasNavigatedRef.current) {
      // Direct access without stream - redirect immediately
      console.log('[HostPage] Direct access without stream - redirecting');
      hasNavigatedRef.current = true;
      navigate('/');
    }
  }, [location.state, stream, navigate]);

  // Clear waiting state when stream is available
  useEffect(() => {
    if (stream && isWaitingForStream) {
      console.log('HostPage: Stream received, clearing waiting state');
      setIsWaitingForStream(false);
    }
  }, [stream, isWaitingForStream]);

  const handleStop = () => {
    stopCapture();
    disconnect();
    navigate('/');
  };

  const handleToggleVideo = () => {
    console.log('handleToggleVideo - isPaused:', isPaused);
    toggleVideo(isPaused);
  };

  const handleToggleAudio = () => {
    console.log('handleToggleAudio - isMuted:', isMuted);
    toggleAudio(isMuted);
  };

  const handleSwitchCamera = () => {
    console.log('handleSwitchCamera called');
    switchCamera();
  };


  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      console.log('[HostPage] Unmounting - cleaning up stream and connection');
      if (stopCaptureRef.current) {
        stopCaptureRef.current();
      }
      if (disconnectRef.current) {
        disconnectRef.current();
      }
    };
  }, []); // Empty deps - only run on unmount

  useEffect(() => {
    if (error) {
      navigateWithError(navigate, error.message);
    }
  }, [error, navigate]);

  // Show loading state while waiting for stream from LandingPage
  if (isWaitingForStream) {
    return (
      <div className="host-page">
        <div className="host-page__loading">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  // If no stream and not waiting, redirect is handled by useEffect
  if (!stream) {
    return null;
  }

  return (
    <div className={`host-page ${isOverlayVisible || isQRPanelVisible || isChatVisible ? 'host-page--controls-visible' : ''}`} onPointerDown={handleOverlayPointerDown}>
      <LocalPreview stream={stream} sourceType={sourceType} />
      <HostControls
        isPaused={isPaused}
        isMuted={isMuted}
        isOverlayVisible={isOverlayVisible}
        isQRPanelVisible={isQRPanelVisible}
        isChatVisible={isChatVisible}
        overlayRef={controlsOverlayRef}
        shareLink={getShareLink() || ''}
        sourceType={sourceType}
        canSwitchCamera={canSwitchCamera}
        participantCount={participantCount}
        unreadCount={unreadCount}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        onSwitchCamera={handleSwitchCamera}
        onStop={handleStop}
        onToggleQRPanel={handleToggleQRPanel}
        onCloseQRPanel={handleCloseQRPanel}
        onOpenChat={handleOpenChat}
        onCloseChat={handleCloseChat}
        onSendMessage={sendMessage}
      />
    </div>
  );
}

export function HostPage() {
  return (
    <ChatProvider>
      <HostPageInner />
    </ChatProvider>
  );
}
