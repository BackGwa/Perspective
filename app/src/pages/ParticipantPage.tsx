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

  const { connectionStatus, setConnectionStatus, remoteStream, setRemoteStream, participantPeer, setParticipantPeer } = useStreamContext();

  // Check if accessed directly via link (no existing peer from password verification)
  useEffect(() => {
    if (!hostPeerId) {
      navigate('/', { state: { error: ERROR_MESSAGES.INVALID_PEER_ID } });
      return;
    }

    if (!participantPeer) {
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
      navigate('/', { state: { error: ERROR_MESSAGES.PEER_CONNECTION_FAILED } });
    } else if (connectionStatus === 'closed' || connectionStatus === 'disconnected') {
      // Immediate redirect to home with error message
      navigate('/', { state: { error: 'Session ended by host.' } });
    }
  }, [connectionStatus, participantPeer, navigate]);

  const handleToggleAudio = () => {
    setIsMuted(!isMuted);
  };


  const handleLeave = () => {
    // Clean up participant peer and reset state when leaving
    if (participantPeer) {
      // Remove all event listeners before destroying to prevent status changes
      participantPeer.removeAllListeners();
      participantPeer.destroy();
      setParticipantPeer(null);
    }
    setRemoteStream(null);
    setConnectionStatus('idle');
    navigate('/');
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (participantPeer) {
        console.log('[ParticipantPage] Cleaning up participant peer on unmount');
        // Remove all event listeners before destroying to prevent status changes
        participantPeer.removeAllListeners();
        participantPeer.destroy();
        setParticipantPeer(null);
      }
      setRemoteStream(null);
      setConnectionStatus('idle');
    };
  }, [participantPeer, setParticipantPeer, setRemoteStream, setConnectionStatus]);

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
          shareLink={getShareLink() || ''}
          onToggleAudio={handleToggleAudio}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}
