import { useRef, type RefObject } from 'react';
import {
    IconSpeakerOn,
    IconSpeakerOff,
    IconShareMD as IconShare,
    IconChat,
    IconBack,
    IconSend,
    IconExit
} from '../icons';
import { QRSharePanel } from '../shared/QRSharePanel';
import { useClickOutside } from '../../hooks/useClickOutside';
import { CHAT_OVERLAY, PARTICIPANT_CONTROLS } from '../../config/uiText';
import { TEST_CHAT_MESSAGES } from '../../config/chat';
import '../../../styles/components/controls.scss';

interface ParticipantControlsProps {
    isMuted: boolean;
    isOverlayVisible: boolean;
    isQRPanelVisible: boolean;
    isChatVisible: boolean;
    overlayRef: RefObject<HTMLDivElement>;
    shareLink: string;
    onToggleAudio: () => void;
    onLeave: () => void;
    onToggleQRPanel: () => void;
    onCloseQRPanel: () => void;
    onOpenChat: () => void;
    onCloseChat: () => void;
}

export function ParticipantControls({
    isMuted,
    isOverlayVisible,
    isQRPanelVisible,
    isChatVisible,
    overlayRef,
    shareLink,
    onToggleAudio,
    onLeave,
    onToggleQRPanel,
    onCloseQRPanel,
    onOpenChat,
    onCloseChat
}: ParticipantControlsProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useClickOutside(containerRef, () => {
        if (isChatVisible) return;
        onCloseQRPanel();
        onCloseChat();
    });

    const isOverlayActive = isQRPanelVisible || isChatVisible || isOverlayVisible;

    return (
        <div ref={overlayRef} className={`controls-overlay ${isOverlayActive ? 'controls-overlay--visible' : ''} ${isChatVisible ? 'controls-overlay--chat' : ''}`}>
            {isChatVisible && (
                <div className="controls-overlay__chat-panel">
                    <div className="controls-overlay__chat-messages">
                        <div className="controls-overlay__chat-messages-inner">
                            {TEST_CHAT_MESSAGES.map(message => (
                                <div
                                    key={message.id}
                                    className={`controls-overlay__chat-message ${message.role === 'host' ? 'controls-overlay__chat-message--right' : 'controls-overlay__chat-message--left'}`}
                                >
                                    {message.text}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <div
                ref={containerRef}
                key={isChatVisible ? 'chat' : 'controls'}
                className={`controls-overlay__content ${isChatVisible ? 'controls-overlay__content--chat' : 'controls-overlay__content--controls'}`}
            >
                {isChatVisible ? (
                    <div className="controls-overlay__chat-row">
                        <button
                            className="control-button"
                            onClick={onCloseChat}
                            title={CHAT_OVERLAY.BACK}
                            type="button"
                        >
                            <IconBack />
                            <span className="control-tooltip">{CHAT_OVERLAY.BACK}</span>
                        </button>
                        <input
                            className="controls-overlay__chat-input"
                            placeholder={CHAT_OVERLAY.PLACEHOLDER}
                            type="text"
                        />
                        <button
                            className="control-button"
                            title={CHAT_OVERLAY.SEND}
                            type="button"
                        >
                            <IconSend />
                            <span className="control-tooltip">{CHAT_OVERLAY.SEND}</span>
                        </button>
                    </div>
                ) : (
                    <>
                        {isQRPanelVisible && (
                            <QRSharePanel
                                shareLink={shareLink}
                            />
                        )}
                        <button
                            className="control-button"
                            onClick={onOpenChat}
                            title={PARTICIPANT_CONTROLS.CHAT}
                        >
                            <IconChat />
                            <span className="control-tooltip">{PARTICIPANT_CONTROLS.CHAT}</span>
                        </button>
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
                            onClick={onToggleQRPanel}
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
                    </>
                )}
            </div>
        </div>
    );
}
