import { useState } from 'react';
import {
    IconMicOn,
    IconMicOff,
    IconShareMD as IconShare,
    IconExit
} from '../icons';
import '../../../styles/components/controls.scss';

interface ParticipantControlsProps {
    isMuted: boolean;
    onToggleAudio: () => void;
    onShare: () => void;
    onLeave: () => void;
}

export function ParticipantControls({
    isMuted,
    onToggleAudio,
    onShare,
    onLeave
}: ParticipantControlsProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        onShare();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="controls-overlay">
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
                onClick={onLeave}
                title="Leave Session"
            >
                <IconExit />
                <span className="control-tooltip">Leave Session</span>
            </button>
        </div>
    );
}
