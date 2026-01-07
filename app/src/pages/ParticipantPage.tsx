import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RemoteStream } from '../components/participant/RemoteStream';
import { ParticipantControls } from '../components/participant/ParticipantControls';
import { usePeerConnection } from '../hooks/usePeerConnection';
import { useStreamContext } from '../contexts/StreamContext';
import { ERROR_MESSAGES } from '../config/constants';
import '../../styles/components/participant.scss';

export function ParticipantPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hostPeerId = searchParams.get('peer');
  const [isMuted, setIsMuted] = useState(true);

  const { connectionStatus, remoteStream } = useStreamContext();

  const { getShareLink } = usePeerConnection({
    role: 'participant',
    hostPeerId
  });

  useEffect(() => {
    if (!hostPeerId) {
      navigate('/', { state: { error: ERROR_MESSAGES.INVALID_PEER_ID } });
    }
  }, [hostPeerId, navigate]);

  useEffect(() => {
    if (connectionStatus === 'failed') {
      navigate('/', { state: { error: ERROR_MESSAGES.PEER_CONNECTION_FAILED } });
    } else if (connectionStatus === 'closed' || connectionStatus === 'disconnected') {
      // Immediate redirect to home with error message
      navigate('/', { state: { error: 'Session ended by host.' } });
    }
  }, [connectionStatus, navigate]);

  const handleToggleAudio = () => {
    setIsMuted(!isMuted);
  };

  const handleShare = async () => {
    const link = getShareLink();
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const handleLeave = () => {
    navigate('/');
  };

  const isConnecting = ['initializing', 'connecting', 'waiting_for_peer'].includes(connectionStatus);

  if (!hostPeerId) return null;

  return (
    <div className="participant-page">
      <RemoteStream
        stream={remoteStream}
        isConnecting={isConnecting}
        isMuted={isMuted}
      />
      {!isConnecting && remoteStream && (
        <ParticipantControls
          isMuted={isMuted}
          onToggleAudio={handleToggleAudio}
          onShare={handleShare}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
