import { useState, useRef, useEffect } from 'react';
import {
  IconMicOn,
  IconMicOff,
  IconMonitorOn,
  IconMonitorOff,
  IconShareMD as IconShare,
  IconStop
} from '../icons';
import { QRSharePanel } from '../shared/QRSharePanel';
import '../../../styles/components/controls.scss';

interface HostControlsProps {
  isPaused: boolean;
  isMuted: boolean;
  shareLink: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onStop: () => void;
}

export function HostControls({
  isPaused,
  isMuted,
  shareLink,
  onToggleVideo,
  onToggleAudio,
  onStop
}: HostControlsProps) {
  const [showQRPanel, setShowQRPanel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowQRPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShare = () => {
    setShowQRPanel(prev => !prev);
  };

  return (
    <div className="controls-overlay">
      <div ref={containerRef} style={{ position: 'relative', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
        {showQRPanel && (
          <QRSharePanel
            shareLink={shareLink}
          />
        )}
        <button
          className={`control-button ${isPaused ? 'control-button--danger' : ''}`}
          onClick={onToggleVideo}
          title={isPaused ? 'Resume Video' : 'Pause Video'}
        >
          {isPaused ? <IconMonitorOff /> : <IconMonitorOn />}
          <span className="control-tooltip">{isPaused ? 'Resume Video' : 'Pause Video'}</span>
        </button>

        <button
          className={`control-button ${isMuted ? 'control-button--danger' : ''}`}
          onClick={onToggleAudio}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <IconMicOff /> : <IconMicOn />}
          <span className="control-tooltip">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          className="control-button"
          onClick={handleShare}
          title="Share Link"
        >
          <IconShare />
          <span className="control-tooltip">Share Link</span>
        </button>

        <button
          className="control-button control-button--danger"
          onClick={onStop}
          title="Stop Sharing"
        >
          <IconStop />
          <span className="control-tooltip">Stop Sharing</span>
        </button>
      </div>
    </div>
  );
}
