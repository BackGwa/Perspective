import { useState, useRef, useEffect } from 'react';
import {
    IconMicOn,
    IconMicOff,
    IconShareMD as IconShare,
    IconExit
} from '../icons';
import { QRSharePanel } from '../shared/QRSharePanel';
import '../../../styles/components/controls.scss';

interface ParticipantControlsProps {
    isMuted: boolean;
    shareLink: string;
    onToggleAudio: () => void;
    onLeave: () => void;
}

export function ParticipantControls({
    isMuted,
    shareLink,
    onToggleAudio,
    onLeave
}: ParticipantControlsProps) {
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
                    onClick={onLeave}
                    title="Leave Session"
                >
                    <IconExit />
                    <span className="control-tooltip">Leave Session</span>
                </button>
            </div>
        </div>
    );
}
