import { useRef, useState, useEffect, type RefObject } from 'react';
import {
  IconMicOn,
  IconMicOff,
  IconMonitorOn,
  IconMonitorOff,
  IconShareMD as IconShare,
  IconStop,
  IconChat,
  IconBack,
  IconSend,
  IconCameraSwitch
} from '../icons';
import { QRSharePanel } from '../shared/QRSharePanel';
import { ClientCountBadge } from './ClientCountBadge';
import { UnreadBadge } from '../shared/UnreadBadge';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useChatContext } from '../../contexts/ChatContext';
import { CHAT_OVERLAY, HOST_CONTROLS } from '../../config/uiText';
import '../../../styles/components/controls.scss';
import type { MediaSourceType } from '../../types/media.types';

interface HostControlsProps {
  isPaused: boolean;
  isMuted: boolean;
  isOverlayVisible: boolean;
  isQRPanelVisible: boolean;
  isChatVisible: boolean;
  overlayRef: RefObject<HTMLDivElement>;
  shareLink: string;
  sourceType: MediaSourceType | null;
  canSwitchCamera: boolean;
  participantCount: number;
  unreadCount: number;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onSwitchCamera: () => void;
  onStop: () => void;
  onToggleQRPanel: () => void;
  onCloseQRPanel: () => void;
  onOpenChat: () => void;
  onCloseChat: () => void;
  onSendMessage: (text: string) => void;
}

export function HostControls({
  isPaused,
  isMuted,
  isOverlayVisible,
  isQRPanelVisible,
  isChatVisible,
  overlayRef,
  shareLink,
  sourceType,
  canSwitchCamera,
  participantCount,
  unreadCount,
  onToggleVideo,
  onToggleAudio,
  onSwitchCamera,
  onStop,
  onToggleQRPanel,
  onCloseQRPanel,
  onOpenChat,
  onCloseChat,
  onSendMessage
}: HostControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const { messages, connectionTimestamp } = useChatContext();

  // Filter messages by connection timestamp
  const visibleMessages = messages.filter(
    msg => connectionTimestamp && msg.timestamp >= connectionTimestamp
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isChatVisible) {
      const container = messagesContainerRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isChatVisible]);

  const handleSendClick = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendClick();
    }
  };

  useClickOutside(containerRef, () => {
    if (isChatVisible) return;
    onCloseQRPanel();
  });

  const isCameraMode = sourceType === 'camera';
  const isOverlayActive = isQRPanelVisible || isChatVisible || isOverlayVisible;

  return (
    <div ref={overlayRef} className={`controls-overlay ${isOverlayActive ? 'controls-overlay--visible' : ''} ${isChatVisible ? 'controls-overlay--chat' : ''}`}>
      {isChatVisible && (
        <div className="controls-overlay__chat-panel">
          <div ref={messagesContainerRef} className="controls-overlay__chat-messages">
            <div className="controls-overlay__chat-messages-inner">
              {visibleMessages.map(message => (
                <div
                  key={message.id}
                  className={`controls-overlay__chat-message ${message.role === 'host' ? 'controls-overlay__chat-message--right' : 'controls-overlay__chat-message--left'}`}
                >
                  {message.text}
                  {message.encrypted && <span style={{ marginLeft: '4px' }}>🔒</span>}
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
        {!isChatVisible && (
          <ClientCountBadge participantCount={participantCount} />
        )}

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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength={128}
            />
            <button
              className="control-button"
              onClick={handleSendClick}
              disabled={!inputValue.trim()}
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

            <div style={{ position: 'relative' }}>
              <button
                className="control-button"
                onClick={onOpenChat}
                title={HOST_CONTROLS.CHAT}
              >
                <IconChat />
                <span className="control-tooltip">{HOST_CONTROLS.CHAT}</span>
              </button>
              <UnreadBadge count={unreadCount} />
            </div>

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
              onClick={onToggleQRPanel}
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
          </>
        )}
      </div>
    </div>
  );
}
