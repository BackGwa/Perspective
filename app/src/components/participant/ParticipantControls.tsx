import { useState, useRef, type RefObject } from 'react';
import {
    IconSpeakerOn,
    IconSpeakerOff,
    IconShareMD as IconShare,
    IconExit
} from '../icons';
import { QRSharePanel } from '../shared/QRSharePanel';
import { useClickOutside } from '../../hooks/useClickOutside';
import { PARTICIPANT_CONTROLS } from '../../config/uiText';
import '../../../styles/components/controls.scss';

interface ParticipantControlsProps {
    isMuted: boolean;
    isOverlayVisible: boolean;
    overlayRef: RefObject<HTMLDivElement>;
    shareLink: string;
    onToggleAudio: () => void;
    onLeave: () => void;
}

export function ParticipantControls({
    isMuted,
    isOverlayVisible,
    overlayRef,
    shareLink,
    onToggleAudio,
    onLeave
}: ParticipantControlsProps) {
    const [showQRPanel, setShowQRPanel] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => setShowQRPanel(false));

    const handleShare = () => {
        setShowQRPanel(prev => !prev);
    };

    const isOverlayActive = showQRPanel || isOverlayVisible;

    return (
        <div ref={overlayRef} className={`controls-overlay ${isOverlayActive ? 'controls-overlay--visible' : ''}`}>
            <div ref={containerRef} className="controls-overlay__content">
                {showQRPanel && (
                    <QRSharePanel
                        shareLink={shareLink}
                    />
                )}
                <button
                    className={`control-button ${isMuted ? 'control-button--danger' : ''}`}
                    onClick={onToggleAudio}
                    title={isMuted ? PARTICIPANT_CONTROLS.UNMUTE : PARTICIPANT_CONTROLS.MUTE}
                >
                    {isMuted ? <IconSpeakerOff /> : <IconSpeakerOn />}
                    <span className="control-tooltip">{isMuted ? PARTICIPANT_CONTROLS.UNMUTE : PARTICIPANT_CONTROLS.MUTE}</span>
                </button>

                <button
                    className="control-button"
                    onClick={handleShare}
                    title={PARTICIPANT_CONTROLS.SHARE_LINK}
                >
                    <IconShare />
                    <span className="control-tooltip">{PARTICIPANT_CONTROLS.SHARE_LINK}</span>
                </button>

                <button
                    className="control-button control-button--danger"
                    onClick={onLeave}
                    title={PARTICIPANT_CONTROLS.LEAVE_SESSION}
                >
                    <IconExit />
                    <span className="control-tooltip">{PARTICIPANT_CONTROLS.LEAVE_SESSION}</span>
                </button>
            </div>
        </div>
    );
}
