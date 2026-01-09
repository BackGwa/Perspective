import { useState, useEffect, useRef, useCallback } from 'react';
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

type MenuState = 'root' | 'share' | 'settings' | 'join';
type JoinMode = 'input' | 'qr';

import { useMediaStream } from '../hooks/useMediaStream';
import { peerService } from '../services/peerService';
import type { MediaSourceType } from '../types/media.types';
import { useQRScanner } from '../hooks/useQRScanner';
import type { QRScanResult } from '../types/qr.types';
import { useStreamContext } from '../contexts/StreamContext';
import { PasswordInput } from '../components/shared/PasswordInput';
import { usePasswordVerification } from '../hooks/usePasswordVerification';
import { validateQRCodeURL, getQRErrorMessage } from '../utils/urlValidator';
import { ERROR_MESSAGES } from '../config/constants';
import { hashPassword } from '../utils/passwordHasher';

export function LandingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setSessionPassword, setParticipantPeer, setRemoteStream, setConnectionStatus } = useStreamContext();

    const [menuState, setMenuState] = useState<MenuState>('root');
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const [joinMode, setJoinMode] = useState<JoinMode>('input');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [qrCameraStream, setQrCameraStream] = useState<MediaStream | null>(null);

    // Password-related state (Host)
    const [hostPassword, setHostPassword] = useState('');

    // Password-related state (Participant)
    const [participantPassword, setParticipantPassword] = useState('');
    const [isAwaitingPasswordVerification, setIsAwaitingPasswordVerification] = useState(false);
    const [hostPeerIdForVerification, setHostPeerIdForVerification] = useState<string | null>(null);
    const [dataConnectionForVerification, setDataConnectionForVerification] = useState<any>(null);
    const [tempPeerForVerification, setTempPeerForVerification] = useState<any>(null);

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

    // Password verification for participant
    const {
        isVerifying,
        errorMessage: passwordError,
        submitPassword
    } = usePasswordVerification({
        hostPeerId: hostPeerIdForVerification,
        dataConnection: dataConnectionForVerification,
        onApproved: () => {
            console.log('[LandingPage] Password approved, navigating to participant page');

            // Save peer to context for reuse in ParticipantPage
            if (tempPeerForVerification) {
                console.log('[LandingPage] Saving peer to context for reuse');
                setParticipantPeer(tempPeerForVerification);
                // Don't destroy the peer - it will be reused
                setTempPeerForVerification(null);
            }

            if (hostPeerIdForVerification) {
                navigate(`/share?peer=${hostPeerIdForVerification}`, {
                    state: { fromPasswordVerification: true }
                });
            }
        },
        onRejected: (reason) => {
            console.log('[LandingPage] Password rejected:', reason);
        },
        onMaxRetriesExceeded: () => {
            console.log('[LandingPage] Max retries exceeded');
            setError(ERROR_MESSAGES.PASSWORD_MAX_RETRIES);

            // Clean up temporary peer
            if (tempPeerForVerification) {
                tempPeerForVerification.destroy();
                setTempPeerForVerification(null);
            }

            setIsAwaitingPasswordVerification(false);
            setHostPeerIdForVerification(null);
            setDataConnectionForVerification(null);
            setMenuState('root');
            setSessionId('');
        }
    });

    // Handle location state (errors and auto-join)
    const hasHandledAutoJoin = useRef(false);

    useEffect(() => {
        if (location.state?.error) {
            setError(location.state.error);
        }

        // Handle auto-join from direct link access (only once)
        if (location.state?.autoJoin && location.state?.sessionId && !hasHandledAutoJoin.current) {
            hasHandledAutoJoin.current = true;
            console.log('[LandingPage] Auto-join triggered with session ID:', location.state.sessionId);
            setMenuState('join');
            setSessionId(location.state.sessionId);
            // Trigger join after a short delay to ensure UI is ready
            setTimeout(async () => {
                // Copy the handleJoin logic here to avoid dependency issues
                const sid = location.state.sessionId;
                if (!sid.trim()) return;

                try {
                    setError(null);
                    setIsConnecting(true);
                    await peerService.validateConnection(sid);

                    const tempPeer = new (await import('peerjs')).default();
                    setTempPeerForVerification(tempPeer);

                    tempPeer.on('open', () => {
                        const dataConn = tempPeer.connect(sid);

                        dataConn.on('open', () => {
                            setIsConnecting(false);
                            setHostPeerIdForVerification(sid);
                            setDataConnectionForVerification(dataConn);
                            setIsAwaitingPasswordVerification(true);
                        });

                        dataConn.on('error', (err) => {
                            console.error('[LandingPage] Data connection error:', err);
                            setError(ERROR_MESSAGES.CONNECTION_ERROR);
                            setIsConnecting(false);
                            if (tempPeer) {
                                tempPeer.destroy();
                                setTempPeerForVerification(null);
                            }
                        });
                    });

                    tempPeer.on('error', (err) => {
                        console.error('[LandingPage] Peer error:', err);
                        setError(ERROR_MESSAGES.UNABLE_TO_CONNECT);
                        setIsConnecting(false);
                        if (tempPeer) {
                            tempPeer.destroy();
                            setTempPeerForVerification(null);
                        }
                    });
                } catch (err) {
                    console.error(err);
                    setError(ERROR_MESSAGES.UNABLE_TO_CONNECT);
                    setIsConnecting(false);
                }
            }, 100);
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
            // Note: stopScanning is automatically called by useQRScanner when enabled becomes false
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

            // Save password to context (empty string = public room)
            const trimmedPassword = hostPassword.trim();
            const hashedPassword = trimmedPassword ? await hashPassword(trimmedPassword) : null;
            setSessionPassword(hashedPassword);
            console.log('[LandingPage] Password set:', hashedPassword ? 'Protected' : 'Public');

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
                    ERROR_MESSAGES.PERMISSION_DENIED_GENERIC :
                    err.message
                );
            } else {
                setError(ERROR_MESSAGES.FAILED_TO_START_SHARING);
            }
        }
    };

    const handleStartSharing = () => {
        setError(null);
        setMenuState('share');
    };

    const handleShareSettings = () => {
        setError(null);
        setMenuState('settings');
    };

    const handleJoinSession = () => {
        setError(null);
        setMenuState('join');
    };

    const handleBack = () => {
        if (isConnecting || isVerifying) return;

        const isDesktop = window.innerWidth > 1024;

        // Cleanup QR camera
        if (joinMode === 'qr') {
            stopScanning();
            stopQRCamera();
        }

        // Handle back from settings menu
        if (menuState === 'settings') {
            setMenuState('share');
            return;
        }

        // Handle back from join menu with password verification in progress
        if (menuState === 'join' && isAwaitingPasswordVerification) {
            // Clean up temporary peer
            if (tempPeerForVerification) {
                tempPeerForVerification.destroy();
                setTempPeerForVerification(null);
            }

            setIsAwaitingPasswordVerification(false);
            setHostPeerIdForVerification(null);
            setDataConnectionForVerification(null);
            setParticipantPassword('');
            setError(null);
            setMenuState('root');
            return;
        }

        if (joinMode === 'qr' && !isDesktop) {
            // Mobile/Tablet: Return to input mode from QR mode
            setJoinMode('input');
            setIsInputFocused(false);
            setError(null);
        } else {
            // PC: Always return to root
            // Mobile: Return to root from input mode
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
                    ? { facingMode: { ideal: 'environment' } } // Mobile: Rear camera
                    : { facingMode: 'user' } // PC: Front camera
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setQrCameraStream(stream);

            if (qrVideoRef.current) {
                qrVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Failed to start QR camera:', err);
            setError(ERROR_MESSAGES.FAILED_TO_ACCESS_CAMERA);
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
            // Switch to input mode when clicked in QR mode
            stopQRCamera();
            setJoinMode('input');
        } else {
            // Switch to QR mode when clicked in input mode
            setJoinMode('qr');
            startQRCamera();
        }
        setIsInputFocused(false);
    };

    const handleQRScanError = useCallback((errorMessage: string) => {
        setError(errorMessage);
        setTimeout(() => {
            if (joinMode === 'qr') setError(null);
        }, 3000);
    }, [joinMode]);

    const handleQRCodeScanned = useCallback(async (result: QRScanResult) => {
        console.log('[LandingPage] Valid QR code scanned:', result);

        if (!result.peerId) {
            console.error('[LandingPage] QR scan missing peer ID');
            return;
        }

        try {
            // 1. Set values immediately to prevent empty states in join menu
            setSessionId(result.peerId);

            // 2. Stop camera
            stopQRCamera();

            // 3. Switch menu state (this triggers the UI transition)
            setJoinMode('input');

            // 4. Start the unified join flow instead of navigating directly
            // This ensures we stay on LandingPage for password verification if needed
            await startJoinFlow(result.peerId);
        } catch (err) {
            console.error('[LandingPage] QR scan processing error:', err);
            setError(err instanceof Error ? err.message : ERROR_MESSAGES.UNABLE_TO_CONNECT);
            setIsConnecting(false);
            // Stay in input mode with error shown
        }
    }, [stopQRCamera, setJoinMode, setError, setIsConnecting, setSessionId]);

    // QR Scanner hook
    const { stopScanning } = useQRScanner({
        videoRef: qrVideoRef,
        enabled: joinMode === 'qr' && menuState === 'join' && qrCameraStream !== null,
        onScan: handleQRCodeScanned,
        onError: handleQRScanError,
        scanInterval: 200
    });

    // Share Actions
    const handleCameraShare = () => {
        handleCapture('camera');
    };
    const handleScreenShare = () => {
        handleCapture('screen');
    };

    // Join Actions
    const startJoinFlow = async (peerIdToJoin: string) => {
        try {
            setError(null);
            setIsConnecting(true);

            // Clean up any previous session state
            if (tempPeerForVerification) {
                tempPeerForVerification.destroy();
                setTempPeerForVerification(null);
            }
            setParticipantPeer(null);
            setRemoteStream(null);
            setConnectionStatus('idle');

            // Validate connection first
            await peerService.validateConnection(peerIdToJoin);

            // Create a temporary peer to establish data connection
            const tempPeer = new (await import('peerjs')).default();
            setTempPeerForVerification(tempPeer);

            tempPeer.on('open', () => {
                console.log('[LandingPage] Temporary peer opened for verification');

                const dataConn = tempPeer.connect(peerIdToJoin);

                dataConn.on('open', () => {
                    console.log('[LandingPage] Data connection established for verification');

                    // Set up data listener IMMEDIATELY to catch host's initial response
                    // This prevents missing PASSWORD_REQUEST or PASSWORD_APPROVED messages
                    let isPasswordRoom = false;
                    dataConn.on('data', (data: any) => {
                        if (!data || typeof data !== 'object') return;

                        if (data.type === 'PASSWORD_APPROVED') {
                            // Handle PASSWORD_APPROVED for both public rooms and after password verification
                            console.log('[LandingPage] Password approved, navigating');
                            setIsConnecting(false);
                            setParticipantPeer(tempPeer);
                            setTempPeerForVerification(null);
                            navigate(`/share?peer=${peerIdToJoin}`, {
                                state: { fromPasswordVerification: true }
                            });
                        } else if (data.type === 'PASSWORD_REQUEST' && !isPasswordRoom) {
                            // Password required - show password input (only handle once)
                            isPasswordRoom = true;
                            console.log('[LandingPage] Password required');
                            setIsConnecting(false);
                            setIsAwaitingPasswordVerification(true);
                            setHostPeerIdForVerification(peerIdToJoin);
                            setDataConnectionForVerification(dataConn);
                        } else if (data.type === 'PASSWORD_REJECTED') {
                            // Password incorrect - show error (handled by usePasswordVerification)
                            console.log('[LandingPage] Password rejected');
                        }
                    });
                });

                dataConn.on('error', (err) => {
                    console.error('[LandingPage] Data connection error:', err);
                    setError(ERROR_MESSAGES.CONNECTION_ERROR);
                    setIsConnecting(false);
                    if (tempPeer) {
                        tempPeer.destroy();
                        setTempPeerForVerification(null);
                    }
                });
            });

            tempPeer.on('error', (err) => {
                console.error('[LandingPage] Peer error during join:', err);
                setError("Unable to connect. Invalid ID or Host is offline.");
                setIsConnecting(false);
                if (tempPeer) {
                    tempPeer.destroy();
                    setTempPeerForVerification(null);
                }
            });

        } catch (err) {
            console.error('[LandingPage] Join flow error:', err);
            setError(ERROR_MESSAGES.UNABLE_TO_CONNECT);
            setIsConnecting(false);
        }
    };

    const handleJoin = async () => {
        if (!sessionId.trim()) {
            setError(ERROR_MESSAGES.PLEASE_ENTER_VALID_SESSION_ID);
            return;
        }

        // Extract peer ID (supports both direct peer ID and share links)
        let peerId = sessionId.trim();

        // Check if input looks like a URL
        if (sessionId.includes('://') || sessionId.includes('#/share')) {
            const validation = validateQRCodeURL(sessionId);
            if (!validation.isValid) {
                const errorMsg = getQRErrorMessage(validation.error!);
                setError(errorMsg);
                return;
            }
            peerId = validation.peerId!;
            console.log('[LandingPage] Extracted peer ID from input URL:', peerId);
            setSessionId(peerId); // Normalise the input field
        }

        await startJoinFlow(peerId);
    };

    // Handle password submission for participant
    const handlePasswordSubmit = () => {
        if (!participantPassword.trim()) {
            setError(ERROR_MESSAGES.PLEASE_ENTER_PASSWORD);
            return;
        }
        setError(null);
        submitPassword(participantPassword);
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
                        <img src={heroImage} className="hero-bg" draggable="false" />
                    )}
                    {!(joinMode === 'qr' && menuState === 'join') && (
                        <div className="brand-title" ref={brandTitleRef}>
                            <img src={brandTitleImage} alt="Perspective" draggable="false" />
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
                                <button className="menu-button menu-button--secondary menu-button--animate-in" onClick={handleShareSettings} key="share-settings">
                                    <IconShare className="button-icon" />
                                    Share Settings
                                </button>
                                <button className="menu-button menu-button--secondary menu-button--animate-in" onClick={handleBack} key="share-back">
                                    <IconBack className="button-icon" />
                                    Back
                                </button>
                            </>
                        )}

                        {menuState === 'settings' && (
                            <>
                                <div className="password-input-wrapper">
                                    <PasswordInput
                                        value={hostPassword}
                                        onChange={setHostPassword}
                                        placeholder="Room Password (Optional)"
                                        disabled={false}
                                    />
                                </div>
                                <button className="menu-button menu-button--secondary menu-button--animate-in" onClick={handleBack} key="settings-back">
                                    <IconBack className="button-icon" />
                                    Back
                                </button>
                            </>
                        )}

                        {menuState === 'join' && (
                            <>
                                {joinMode === 'input' && !isAwaitingPasswordVerification && (
                                    <>
                                        <div className="session-id-input-container">
                                            <input
                                                type="text"
                                                className="session-id-input"
                                                placeholder="Enter Session ID"
                                                value={sessionId}
                                                onChange={(e) => setSessionId(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !isConnecting && (sessionId.trim().length === 36 || sessionId.includes('peer='))) {
                                                        handleJoin();
                                                    }
                                                }}
                                                onFocus={() => setIsInputFocused(true)}
                                                onBlur={() => setIsInputFocused(false)}
                                                disabled={isConnecting}
                                            />
                                        </div>
                                        {(isInputFocused || sessionId.trim()) && (
                                            <button
                                                className="menu-button"
                                                onClick={handleJoin}
                                                disabled={isConnecting || !(sessionId.trim().length === 36 || sessionId.includes('peer='))}
                                                key="join-confirm"
                                            >
                                                <IconJoin className="button-icon" />
                                                Join Session
                                            </button>
                                        )}
                                    </>
                                )}
                                {joinMode === 'input' && isAwaitingPasswordVerification && (
                                    <>
                                        <div className="password-input-wrapper">
                                            <PasswordInput
                                                value={participantPassword}
                                                onChange={setParticipantPassword}
                                                onSubmit={handlePasswordSubmit}
                                                placeholder="Password Required"
                                                disabled={isVerifying}
                                                error={!!passwordError}
                                            />
                                        </div>
                                        <button
                                            className="menu-button"
                                            onClick={handlePasswordSubmit}
                                            disabled={isVerifying || !participantPassword.trim()}
                                            key="password-submit"
                                        >
                                            <IconJoin className="button-icon" />
                                            {isVerifying ? 'Verifying...' : 'Submit Password'}
                                        </button>
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

                        {passwordError && isAwaitingPasswordVerification && (
                            <div className="error-message">
                                {passwordError}
                            </div>
                        )}

                        {isConnecting && (
                            <div className="error-message" style={{ color: 'var(--text-primary)' }}>
                                Connecting...
                            </div>
                        )}

                        {isVerifying && (
                            <div className="error-message" style={{ color: 'var(--text-primary)' }}>
                                Verifying password...
                            </div>
                        )}

                        <div className="landing-page__version">
                            {__COMMIT_HASH__} @ {__APP_VERSION__}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
