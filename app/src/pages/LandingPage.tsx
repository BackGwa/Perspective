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
    IconBack,
    IconQr
} from '../components/icons';

type MenuState = 'root' | 'share' | 'join';
type JoinMode = 'input' | 'qr';

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
    const [joinMode, setJoinMode] = useState<JoinMode>('input');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [qrCameraStream, setQrCameraStream] = useState<MediaStream | null>(null);

    // Animation refs
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuHeight, setMenuHeight] = useState<number | 'auto'>('auto');
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const brandTitleRef = useRef<HTMLDivElement>(null);
    const landingPageRef = useRef<HTMLDivElement>(null);
    const leftPanelRef = useRef<HTMLDivElement>(null);
    const qrVideoRef = useRef<HTMLVideoElement>(null);

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

    // Handle visual viewport changes for mobile keyboard (mobile/tablet only)
    useEffect(() => {
        if (!landingPageRef.current || !leftPanelRef.current) return;

        // Only apply on mobile/tablet (max-width: 1024px)
        if (window.innerWidth > 1024) return;

        const visualViewport = window.visualViewport;
        if (!visualViewport) return;

        const handleViewportChange = () => {
            if (!landingPageRef.current || !leftPanelRef.current) return;

            // Use visual viewport height instead of window.innerHeight
            // This accounts for virtual keyboard
            const viewportHeight = visualViewport.height;

            // Adjust body and root heights to prevent scrolling
            document.documentElement.style.height = `${viewportHeight}px`;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.height = `${viewportHeight}px`;
            document.body.style.overflow = 'hidden';
            const rootElement = document.getElementById('root');
            if (rootElement) {
                rootElement.style.height = `${viewportHeight}px`;
            }

            landingPageRef.current.style.height = `${viewportHeight}px`;
            leftPanelRef.current.style.height = `${viewportHeight}px`;

            // Reset scroll position
            window.scrollTo(0, 0);
        };

        handleViewportChange();

        visualViewport.addEventListener('resize', handleViewportChange);
        visualViewport.addEventListener('scroll', handleViewportChange);

        return () => {
            visualViewport.removeEventListener('resize', handleViewportChange);
            visualViewport.removeEventListener('scroll', handleViewportChange);

            // Cleanup: restore original styles
            document.documentElement.style.height = '';
            document.documentElement.style.overflow = '';
            document.body.style.height = '';
            document.body.style.overflow = '';
            const rootElement = document.getElementById('root');
            if (rootElement) {
                rootElement.style.height = '';
            }
        };
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
            // Use visualViewport for accurate height including keyboard
            const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
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

        // Listen to both window resize and visualViewport resize
        window.addEventListener('resize', adjustBrandTitleHeight);
        window.visualViewport?.addEventListener('resize', adjustBrandTitleHeight);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', adjustBrandTitleHeight);
            window.visualViewport?.removeEventListener('resize', adjustBrandTitleHeight);
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

    // Cleanup QR camera on unmount or when leaving join menu
    useEffect(() => {
        return () => {
            if (qrCameraStream) {
                qrCameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [qrCameraStream]);

    // Cleanup QR camera when leaving join menu
    useEffect(() => {
        if (menuState !== 'join' && qrCameraStream) {
            qrCameraStream.getTracks().forEach(track => track.stop());
            setQrCameraStream(null);
            if (qrVideoRef.current) {
                qrVideoRef.current.srcObject = null;
            }
        }
    }, [menuState, qrCameraStream]);

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

        const isDesktop = window.innerWidth > 1024;

        // QR 카메라 정리
        if (joinMode === 'qr') {
            stopQRCamera();
        }

        if (joinMode === 'qr' && !isDesktop) {
            // 모바일/태블릿: QR 모드에서는 input 모드로 돌아감
            setJoinMode('input');
            setIsInputFocused(false);
            setError(null);
        } else {
            // PC: 항상 root로 돌아감
            // 모바일: Input 모드에서는 root로 돌아감
            setError(null);
            setSessionId('');
            setJoinMode('input');
            setIsInputFocused(false);
            setMenuState('root');
        }
    };

    const startQRCamera = async () => {
        try {
            const isMobile = window.innerWidth <= 1024;
            const constraints: MediaStreamConstraints = {
                video: isMobile
                    ? { facingMode: { ideal: 'environment' } } // 모바일: 후면 카메라
                    : { facingMode: 'user' } // PC: 전면 카메라
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setQrCameraStream(stream);

            if (qrVideoRef.current) {
                qrVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Failed to start QR camera:', err);
            setError('Failed to access camera. Please check permissions.');
        }
    };

    const stopQRCamera = () => {
        if (qrCameraStream) {
            qrCameraStream.getTracks().forEach(track => track.stop());
            setQrCameraStream(null);
        }
        if (qrVideoRef.current) {
            qrVideoRef.current.srcObject = null;
        }
    };

    const handleJoinWithQR = () => {
        if (joinMode === 'qr') {
            // QR 모드에서 클릭하면 input 모드로 전환
            stopQRCamera();
            setJoinMode('input');
        } else {
            // Input 모드에서 클릭하면 QR 모드로 전환
            setJoinMode('qr');
            startQRCamera();
        }
        setIsInputFocused(false);
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
        <div className="landing-page" ref={landingPageRef}>
            <div className="landing-page__left" ref={leftPanelRef}>
                <div className="hero-container">
                    {joinMode === 'qr' && menuState === 'join' ? (
                        <video
                            ref={qrVideoRef}
                            className="hero-bg"
                            autoPlay
                            playsInline
                            muted
                            style={{ objectFit: 'cover' }}
                        />
                    ) : (
                        <img src={heroImage} className="hero-bg" />
                    )}
                    {!(joinMode === 'qr' && menuState === 'join') && (
                        <div className="brand-title" ref={brandTitleRef}>
                            <img src={brandTitleImage} alt="Perspective" />
                        </div>
                    )}
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
                                {joinMode === 'input' && (
                                    <>
                                        <div className="session-id-input-container">
                                            <input
                                                type="text"
                                                className="session-id-input"
                                                placeholder="Enter Session ID"
                                                value={sessionId}
                                                onChange={(e) => setSessionId(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !isConnecting && handleJoin()}
                                                onFocus={() => setIsInputFocused(true)}
                                                onBlur={() => setIsInputFocused(false)}
                                                disabled={isConnecting}
                                            />
                                        </div>
                                        {(isInputFocused || sessionId.trim()) && (
                                            <button className="menu-button" onClick={handleJoin} disabled={isConnecting || !sessionId.trim()} key="join-confirm">
                                                <IconJoin className="button-icon" />
                                                Join Session
                                            </button>
                                        )}
                                    </>
                                )}
                                {(window.innerWidth > 1024
                                    ? !(joinMode === 'input' && (isInputFocused || sessionId.trim()))
                                    : (joinMode === 'input' && !isInputFocused && !sessionId.trim())
                                ) && (
                                    <button
                                        className="menu-button"
                                        onClick={handleJoinWithQR}
                                        key="join-qr"
                                    >
                                        <IconQr className="button-icon" />
                                        {joinMode === 'qr' ? 'Enter Manually' : 'Join with QR'}
                                    </button>
                                )}
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
