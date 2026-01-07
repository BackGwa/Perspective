import { useState } from 'react';
import {
  IconMicOn,
  IconMicOff,
  IconMonitorOn,
  IconMonitorOff,
  IconShareMD as IconShare,
  IconStop
} from '../icons';
import '../../../styles/components/controls.scss';

interface HostControlsProps {
  isPaused: boolean;
  isMuted: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onShare: () => void;
  onStop: () => void;
}

export function HostControls({
  isPaused,
  isMuted,
  onToggleVideo,
  onToggleAudio,
  onShare,
  onStop
}: HostControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="controls-overlay">
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
        className={`control-button ${copied ? 'control-button--success' : ''}`}
        onClick={handleShare}
        title={copied ? 'Copied!' : 'Share Link'}
      >
        <IconShare />
        <span className="control-tooltip">{copied ? 'Copied!' : 'Share Link'}</span>
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
  );
}
