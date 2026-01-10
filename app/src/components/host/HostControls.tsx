import { useState, useRef } from 'react';
import {
  IconMicOn,
  IconMicOff,
  IconMonitorOn,
  IconMonitorOff,
  IconShareMD as IconShare,
  IconStop,
  IconCameraSwitch
} from '../icons';
import { QRSharePanel } from '../shared/QRSharePanel';
import { ClientCountBadge } from './ClientCountBadge';
import { useClickOutside } from '../../hooks/useClickOutside';
import { HOST_CONTROLS } from '../../config/uiText';
import '../../../styles/components/controls.scss';
import type { MediaSourceType } from '../../types/media.types';

interface HostControlsProps {
  isPaused: boolean;
  isMuted: boolean;
  shareLink: string;
  sourceType: MediaSourceType | null;
  canSwitchCamera: boolean;
  participantCount: number;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onSwitchCamera: () => void;
  onStop: () => void;
}

export function HostControls({
  isPaused,
  isMuted,
  shareLink,
  sourceType,
  canSwitchCamera,
  participantCount,
  onToggleVideo,
  onToggleAudio,
  onSwitchCamera,
  onStop
}: HostControlsProps) {
  const [showQRPanel, setShowQRPanel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => setShowQRPanel(false));

  const handleShare = () => {
    setShowQRPanel(prev => !prev);
  };

  const isCameraMode = sourceType === 'camera';

  return (
    <div className={`controls-overlay ${showQRPanel ? 'controls-overlay--visible' : ''}`}>
      <div ref={containerRef} style={{ position: 'relative', display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
        <ClientCountBadge participantCount={participantCount} />

        {showQRPanel && (
          <QRSharePanel
            shareLink={shareLink}
          />
        )}

        {/* Camera switch button - only shown in camera mode, leftmost position */}
        {isCameraMode && (
          <button
            className={`control-button ${!canSwitchCamera ? 'control-button--disabled' : ''}`}
            onClick={onSwitchCamera}
            disabled={!canSwitchCamera}
            title={canSwitchCamera ? HOST_CONTROLS.SWITCH_CAMERA : HOST_CONTROLS.CAMERA_SWITCH_UNAVAILABLE}
          >
            <IconCameraSwitch />
            <span className="control-tooltip">{canSwitchCamera ? HOST_CONTROLS.SWITCH_CAMERA : HOST_CONTROLS.NO_OTHER_CAMERA}</span>
          </button>
        )}

        <button
          className={`control-button ${isPaused ? 'control-button--danger' : ''}`}
          onClick={onToggleVideo}
          title={isPaused ? HOST_CONTROLS.RESUME_VIDEO : HOST_CONTROLS.PAUSE_VIDEO}
        >
          {isPaused ? <IconMonitorOff /> : <IconMonitorOn />}
          <span className="control-tooltip">{isPaused ? HOST_CONTROLS.RESUME_VIDEO : HOST_CONTROLS.PAUSE_VIDEO}</span>
        </button>

        <button
          className={`control-button ${isMuted ? 'control-button--danger' : ''}`}
          onClick={onToggleAudio}
          title={isMuted ? HOST_CONTROLS.UNMUTE : HOST_CONTROLS.MUTE}
        >
          {isMuted ? <IconMicOff /> : <IconMicOn />}
          <span className="control-tooltip">{isMuted ? HOST_CONTROLS.UNMUTE : HOST_CONTROLS.MUTE}</span>
        </button>

        <button
          className="control-button"
          onClick={handleShare}
          title={HOST_CONTROLS.SHARE_LINK}
        >
          <IconShare />
          <span className="control-tooltip">{HOST_CONTROLS.SHARE_LINK}</span>
        </button>

        <button
          className="control-button control-button--danger"
          onClick={onStop}
          title={HOST_CONTROLS.STOP_SHARING}
        >
          <IconStop />
          <span className="control-tooltip">{HOST_CONTROLS.STOP_SHARING}</span>
        </button>
      </div>
    </div>
  );
}


