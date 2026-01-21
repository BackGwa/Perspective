import { useEffect, useRef } from 'react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { useAspectFit } from '../../hooks/useAspectFit';
import '../../../styles/components/participant.scss';

interface RemoteStreamProps {
  stream: MediaStream | null;
  isConnecting?: boolean;
  isMuted?: boolean;
}

export function RemoteStream({ stream, isConnecting, isMuted = true }: RemoteStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { frameStyle, setAspect } = useAspectFit(containerRef);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream ?? null;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;

    setAspect(videoRef.current.videoWidth, videoRef.current.videoHeight);
  };

  if (isConnecting || !stream) {
    return (
      <div ref={containerRef} className="remote-stream">
        <div className="remote-stream__loading">
          <LoadingSpinner />
          <p className="remote-stream__loading-text">
            {isConnecting ? 'Connecting to host...' : 'Waiting for stream...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="remote-stream">
      <div className="remote-stream__frame" style={frameStyle}>
        <video
          ref={videoRef}
          className="remote-stream__video"
          autoPlay
          playsInline
          muted={isMuted}
          onLoadedMetadata={handleLoadedMetadata}
        />
      </div>
    </div>
  );
}
