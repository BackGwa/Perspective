import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LocalPreview } from '../components/host/LocalPreview';
import { HostControls } from '../components/host/HostControls';
import { useMediaStream } from '../hooks/useMediaStream';
import { usePeerConnection } from '../hooks/usePeerConnection';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { navigateWithError } from '../utils/navigationHelpers';
import { TIMING } from '../config/timing';
import '../../styles/components/host.scss';

export function HostPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isWaitingForStream, setIsWaitingForStream] = useState(false);
  const hasNavigatedRef = useRef(false);

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
  } = useMediaStream();

  // Store latest functions in refs for cleanup
  const stopCaptureRef = useRef(stopCapture);
  const disconnectRef = useRef<() => void>();

  useEffect(() => {
    stopCaptureRef.current = stopCapture;
  }, [stopCapture]);

  // Debug logging
  useEffect(() => {
    console.log('[HostPage] Render - stream:', stream);
    console.log('[HostPage] Render - sourceType:', sourceType);
    console.log('[HostPage] Render - location.state:', location.state);
  });

  const { disconnect, getShareLink, participantCount } = usePeerConnection({
    role: 'host',
    stream
  });

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
    <div className="host-page">
      <LocalPreview stream={stream} sourceType={sourceType} />
      <HostControls
        isPaused={isPaused}
        isMuted={isMuted}
        shareLink={getShareLink() || ''}
        sourceType={sourceType}
        canSwitchCamera={canSwitchCamera}
        participantCount={participantCount}
        onToggleVideo={handleToggleVideo}
        onToggleAudio={handleToggleAudio}
        onSwitchCamera={handleSwitchCamera}
        onStop={handleStop}
      />
    </div>
  );
}
