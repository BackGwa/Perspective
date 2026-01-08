import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/pages/landing.scss';
import heroImage from '../../assets/hero-image.png';
import brandTitleImage from '../../assets/brand-title.png';
import {
    IconShare,
    IconJoin,
    IconCamera,
    IconScreen,
    IconBack
} from '../components/icons';

type MenuState = 'root' | 'share' | 'join';

import { useMediaStream } from '../hooks/useMediaStream';
import { peerService } from '../services/peerService';
import type { MediaSourceType } from '../types/media.types';

export function LandingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuState, setMenuState] = useState<MenuState>('root');
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [sessionId, setSessionId] = useState('');

    // Animation refs
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuHeight, setMenuHeight] = useState<number | 'auto'>('auto');
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const brandTitleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setMenuHeight(entry.contentRect.height);
            }
        });

        resizeObserver.observe(menuRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    // Adjust brand-title height based on right panel height (mobile/tablet only)
    useEffect(() => {
        const adjustBrandTitleHeight = () => {
            if (!rightPanelRef.current || !brandTitleRef.current) return;

            // Only apply on mobile/tablet (max-width: 1024px)
            if (window.innerWidth > 1024) {
                brandTitleRef.current.style.height = '';
                return;
            }

            const rightPanelHeight = rightPanelRef.current.offsetHeight;
            const viewportHeight = window.innerHeight;
            const availableHeight = viewportHeight - rightPanelHeight;

            brandTitleRef.current.style.height = `${availableHeight}px`;
        };

        adjustBrandTitleHeight();

        const resizeObserver = new ResizeObserver(() => {
            adjustBrandTitleHeight();
        });

        if (rightPanelRef.current) {
            resizeObserver.observe(rightPanelRef.current);
        }

        window.addEventListener('resize', adjustBrandTitleHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', adjustBrandTitleHeight);
        };
    }, []);

    // Disable cleanup on unmount so the stream persists to HostPage
    const { startCapture } = useMediaStream({ cleanupOnUnmount: false });

    useEffect(() => {
        if (location.state?.error) {
            setError(location.state.error);
            // Optional: Restore menu state if we want deeply linked experience,
            // but for now just showing error at root is safer.
        }
    }, [location]);

    const handleCapture = async (source: MediaSourceType) => {
        try {
            setError(null);
            console.log(`[LandingPage] Starting capture for: ${source}`);
            const stream = await startCapture(source);
            console.log('[LandingPage] Capture successful, stream:', stream);
            console.log('[LandingPage] Stream tracks:', stream?.getTracks());

            // Navigate immediately - stream is already in context
            navigate('/host', { state: { fromLanding: true, hasStream: true } });
        } catch (err) {
            console.error('[LandingPage] Capture failed:', err);
            if (err instanceof Error) {
                // If permission denied or cancelled, show error here
                setError(err.message === 'Permission denied' ?
                    'Permission denied. Please allow access to continue.' :
                    err.message
                );
            } else {
                setError('Failed to start sharing.');
            }
        }
    };

    const handleStartSharing = () => {
        setError(null);
        setMenuState('share');
    };

    const handleJoinSession = () => {
        setError(null);
        setMenuState('join');
    };

    const handleBack = () => {
        if (isConnecting) return;
        setError(null);
        setSessionId('');
        setMenuState('root');
    };

    // Share Actions
    const handleCameraShare = () => {
        handleCapture('camera');
    };
    const handleScreenShare = () => {
        handleCapture('screen');
    };

    // Join Actions
    const handleJoin = async () => {
        if (!sessionId.trim()) {
            setError("Please enter a valid Session ID.");
            return;
        }

        try {
            setError(null);
            setIsConnecting(true);
            await peerService.validateConnection(sessionId);
            navigate(`/share?peer=${sessionId}`);
        } catch (err) {
            console.error(err);
            setError("Unable to connect. Invalid ID or Host is offline.");
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="landing-page">
            <div className="landing-page__left">
                <div className="hero-container">
                    <img src={heroImage} className="hero-bg" />
                    <div className="brand-title" ref={brandTitleRef}>
                        <img src={brandTitleImage} alt="Perspective" />
                    </div>
                </div>
            </div>

            <div className="landing-page__right" ref={rightPanelRef}>
                <div
                    className="landing-page__menu-wrapper"
                    style={{ height: menuHeight === 'auto' ? 'auto' : `${menuHeight}px` }}
                >
                    <div className="landing-page__menu" ref={menuRef}>

                        {menuState === 'root' && (
                            <>
                                <button className="menu-button" onClick={handleStartSharing} key="root-share">
                                    <IconShare className="button-icon" />
                                    Start Sharing
                                </button>
                                <button className="menu-button menu-button--secondary" onClick={handleJoinSession} key="root-join">
                                    <IconJoin className="button-icon" />
                                    Join a Session
                                </button>
                                {/* Feature coming soon - Explore Spaces */}
                                {/* <button className="menu-button menu-button--secondary" onClick={handleExplore}>
                                <IconExplore className="button-icon" />
                                Explore Spaces
                            </button> */}
                            </>
                        )}

                        {menuState === 'share' && (
                            <>
                                <button className="menu-button" onClick={handleCameraShare} key="share-camera">
                                    <IconCamera className="button-icon" />
                                    Share Camera
                                </button>
                                <button className="menu-button" onClick={handleScreenShare} key="share-screen">
                                    <IconScreen className="button-icon" />
                                    Share Screen
                                </button>
                                <button className="menu-button menu-button--secondary menu-button--animate-in" onClick={handleBack} key="share-back">
                                    <IconBack className="button-icon" />
                                    Back
                                </button>
                            </>
                        )}

                        {menuState === 'join' && (
                            <>
                                <div className="session-id-input-container">
                                    <input
                                        type="text"
                                        className="session-id-input"
                                        placeholder="Enter Session ID"
                                        value={sessionId}
                                        onChange={(e) => setSessionId(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !isConnecting && handleJoin()}
                                        disabled={isConnecting}
                                        autoFocus
                                    />
                                </div>
                                <button className="menu-button" onClick={handleJoin} disabled={isConnecting || !sessionId.trim()} key="join-confirm">
                                    <IconJoin className="button-icon" />
                                    Join Session
                                </button>
                                <button className="menu-button menu-button--secondary menu-button--animate-in" onClick={handleBack} disabled={isConnecting} key="join-back">
                                    <IconBack className="button-icon" />
                                    Back
                                </button>
                            </>
                        )}

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        {isConnecting && (
                            <div className="error-message" style={{ color: 'var(--text-primary)' }}>
                                Connecting...
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
