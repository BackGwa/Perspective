import { useEffect, useRef } from 'react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import '../../../styles/components/participant.scss';

interface RemoteStreamProps {
  stream: MediaStream | null;
  isConnecting?: boolean;
  isMuted?: boolean;
}

export function RemoteStream({ stream, isConnecting, isMuted = true }: RemoteStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('RemoteStream: Setting stream to video element', stream);
      console.log('Stream tracks:', stream.getTracks());
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (isConnecting || !stream) {
    return (
      <div className="remote-stream">
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
    <div className="remote-stream">
      <video
        ref={videoRef}
        className="remote-stream__video"
        autoPlay
        playsInline
        muted={isMuted}
      />
    </div>
  );
}
