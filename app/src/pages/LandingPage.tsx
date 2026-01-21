import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../styles/pages/landing.scss';
import heroImage from '../../assets/hero-image.webp';
import brandTitleImage from '../../assets/brand-title.png';
import {
    IconShare,
    IconJoin,
    IconCamera,
    IconScreen,
    IconBack,
    IconQr
} from '../components/icons';
import { LANDING_MENU, JOIN_FLOW, SESSION_SETTINGS } from '../config/uiText';
import { TIMING } from '../config/timing';
import { VALIDATION } from '../config/design';
import { cleanupParticipantPeer } from '../utils/peerCleanup';

type MenuState = 'root' | 'share' | 'settings' | 'join';
type JoinMode = 'input' | 'qr';

import { useMediaStream } from '../hooks/useMediaStream';
import type { MediaSourceType } from '../types/media.types';
import { useQRScanner } from '../hooks/useQRScanner';
import type { QRScanResult } from '../types/qr.types';
import { useStreamContext } from '../contexts/StreamContext';
import { PasswordInput } from '../components/shared/PasswordInput';
import { usePasswordVerification } from '../hooks/usePasswordVerification';
import { validateQRCodeURL, getQRErrorMessage } from '../utils/urlValidator';
import { ERROR_MESSAGES, PEER_CONFIG, PEER_SERVER_CONFIG } from '../config/constants';
import type { DataConnection } from 'peerjs';
import type Peer from 'peerjs';
import { isValidPasswordMessage } from '../types/password.types';
import type { SessionJoinRequestMessage } from '../types/session.types';
import { isSessionJoinRejectedMessage } from '../types/session.types';

export function LandingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        setSessionSecret,
        setParticipantPeer,
        setParticipantHostConnection,
        setRemoteStream,
        setConnectionStatus,
        sessionDomainPolicy,
        setSessionDomainPolicy
    } = useStreamContext();

    const [menuState, setMenuState] = useState<MenuState>('root');
    const [error, setError] = useState<string | null>(null);
    const [passwordInputError, setPasswordInputError] = useState<string | null>(null);
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
    const [dataConnectionForVerification, setDataConnectionForVerification] = useState<DataConnection | null>(null);
    const dataConnectionForVerificationRef = useRef<DataConnection | null>(null);
    const hostPeerIdForVerificationRef = useRef<string | null>(null);
    const tempPeerForVerificationRef = useRef<Peer | null>(null);

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

        // Only apply on mobile/tablet (max-width: VALIDATION.DESKTOP_BREAKPOINTpx)
        if (window.innerWidth > VALIDATION.DESKTOP_BREAKPOINT) return;

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

            // Only apply on mobile/tablet (max-width: VALIDATION.DESKTOP_BREAKPOINTpx)
            if (window.innerWidth > VALIDATION.DESKTOP_BREAKPOINT) {
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
        submitPassword,
        handlePasswordMessage
    } = usePasswordVerification({
        dataConnection: dataConnectionForVerification,
        onPasswordRequired: () => {
            setIsConnecting(false);
            setIsAwaitingPasswordVerification(true);
        },
        onApproved: () => {
            setIsConnecting(false);
            setIsAwaitingPasswordVerification(false);

            // Save peer and data connection to context for reuse in ParticipantPage
            const currentTempPeer = tempPeerForVerificationRef.current;
            if (currentTempPeer) {
                setParticipantPeer(currentTempPeer);
                // Don't destroy the peer - it will be reused
                tempPeerForVerificationRef.current = null;
            }

            // Save data connection to context for reuse
            const currentDataConnection = dataConnectionForVerificationRef.current;
            if (currentDataConnection) {
                setParticipantHostConnection(currentDataConnection);
                dataConnectionForVerificationRef.current = null;
            }

            const currentHostPeerId = hostPeerIdForVerificationRef.current;
            if (currentHostPeerId) {
                navigate(`/share?peer=${currentHostPeerId}`, {
                    state: { fromPasswordVerification: true }
                });
            }
        },
        onRejected: () => {
            setIsConnecting(false);
        },
        onMaxRetriesExceeded: () => {
            setIsConnecting(false);
            setError(ERROR_MESSAGES.PASSWORD_MAX_RETRIES);
            const cleanedPeer = cleanupParticipantPeer(tempPeerForVerificationRef.current);
            tempPeerForVerificationRef.current = cleanedPeer;
            setIsAwaitingPasswordVerification(false);
            hostPeerIdForVerificationRef.current = null;
            setDataConnectionForVerification(null);
            dataConnectionForVerificationRef.current = null;
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
            setMenuState('join');
            setSessionId(location.state.sessionId);
            setTimeout(() => {
                startJoinFlow(location.state.sessionId);
            }, TIMING.AUTO_JOIN_DELAY);
        }
    }, [location]);

    useEffect(() => {
        setPasswordInputError(null);
    }, [menuState, isAwaitingPasswordVerification]);

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

            // Save session secret to context (empty string = public room)
            const trimmedPassword = hostPassword.trim();
            const sessionSecret = trimmedPassword ? trimmedPassword : null;
            setSessionSecret(sessionSecret);

            await startCapture(source);

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

        const isDesktop = window.innerWidth > VALIDATION.DESKTOP_BREAKPOINT;

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
            const cleanedPeer = cleanupParticipantPeer(tempPeerForVerificationRef.current);
            tempPeerForVerificationRef.current = cleanedPeer;
            setIsAwaitingPasswordVerification(false);
            hostPeerIdForVerificationRef.current = null;
            setDataConnectionForVerification(null);
            dataConnectionForVerificationRef.current = null;
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
            const isMobile = window.innerWidth <= VALIDATION.DESKTOP_BREAKPOINT;
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
        }, TIMING.ERROR_DISPLAY_DURATION);
    }, [joinMode]);

    const handleQRCodeScanned = useCallback(async (result: QRScanResult) => {
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
        scanInterval: TIMING.QR_SCAN_INTERVAL
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
            const cleanedPeer = cleanupParticipantPeer(tempPeerForVerificationRef.current);
            tempPeerForVerificationRef.current = cleanedPeer;
            setParticipantPeer(null);
            setRemoteStream(null);
            setConnectionStatus('idle');
            hostPeerIdForVerificationRef.current = peerIdToJoin;

            // Create a temporary peer to establish data connection
            const { default: Peer } = await import('peerjs');
            const tempPeer = new Peer({
                ...PEER_SERVER_CONFIG,
                config: {
                    iceServers: PEER_CONFIG.iceServers
                },
                debug: PEER_CONFIG.debug
            });
            tempPeerForVerificationRef.current = tempPeer;

            tempPeer.on('open', () => {
                const dataConn = tempPeer.connect(peerIdToJoin);

                dataConn.on('open', () => {
                    setDataConnectionForVerification(dataConn);
                    dataConnectionForVerificationRef.current = dataConn;

                    const joinRequestMessage: SessionJoinRequestMessage = {
                        type: 'SESSION_JOIN_REQUEST',
                        payload: {
                            origin: window.location.origin
                        }
                    };

                    setTimeout(() => {
                        if (dataConn.open) {
                            dataConn.send(joinRequestMessage);
                        }
                    }, TIMING.JOIN_REQUEST_DELAY);

                    // Set up data listener IMMEDIATELY to catch host's initial response
                    // This prevents missing PASSWORD_REQUEST or PASSWORD_APPROVED messages
                    let isPasswordRoom = false;
                    dataConn.on('data', (data: unknown) => {
                        if (isSessionJoinRejectedMessage(data)) {
                            setError(data.payload.reason);
                            setIsConnecting(false);
                            setIsAwaitingPasswordVerification(false);
                            hostPeerIdForVerificationRef.current = null;
                            setDataConnectionForVerification(null);
                            dataConnectionForVerificationRef.current = null;
                            const cleanedPeer = cleanupParticipantPeer(tempPeer);
                            tempPeerForVerificationRef.current = cleanedPeer;
                            dataConn.close();
                            return;
                        }

                        if (!isValidPasswordMessage(data)) return;

                        if (data.type === 'PASSWORD_REQUEST') {
                            if (isPasswordRoom) return;
                            isPasswordRoom = true;
                        }

                        handlePasswordMessage(data);
                    });
                });

                dataConn.on('error', (err) => {
                    console.error('[LandingPage] Data connection error:', err);
                    setError(ERROR_MESSAGES.CONNECTION_ERROR);
                    setIsConnecting(false);
                    const cleanedPeer = cleanupParticipantPeer(tempPeer);
                    tempPeerForVerificationRef.current = cleanedPeer;
                });
            });

            tempPeer.on('error', (err) => {
                console.error('[LandingPage] Peer error during join:', err);
                setError(ERROR_MESSAGES.UNABLE_TO_CONNECT);
                setIsConnecting(false);
                const cleanedPeer = cleanupParticipantPeer(tempPeer);
                tempPeerForVerificationRef.current = cleanedPeer;
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
            setSessionId(peerId);
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
        <main className="landing-page" ref={landingPageRef}>
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
                        <img src={heroImage} alt="" className="hero-bg" draggable="false" />
                    )}
                    {!(joinMode === 'qr' && menuState === 'join') && (
                        <div className="brand-title" ref={brandTitleRef}>
                            <img src={brandTitleImage} alt="Perspective" draggable="false" />
                        </div>
                    )}
                </div>
            </div>

            <div className={`landing-page__right ${isInputFocused ? 'keyboard-open' : ''}`} ref={rightPanelRef}>
                <div
                    className="landing-page__menu-wrapper"
                    style={{ height: menuHeight === 'auto' ? 'auto' : `${menuHeight}px` }}
                >
                    <div className="landing-page__menu" ref={menuRef}>

                        {menuState === 'root' && (
                            <>
                                <button className="menu-button" onClick={handleStartSharing} key="root-share">
                                    <IconShare className="button-icon" />
                                    {LANDING_MENU.START_SHARING}
                                </button>
                                <button className="menu-button menu-button--secondary" onClick={handleJoinSession} key="root-join" data-delay="0">
                                    <IconJoin className="button-icon" />
                                    {LANDING_MENU.JOIN_SESSION}
                                </button>
                            </>
                        )}

                        {menuState === 'share' && (
                            <>
                                <button className="menu-button" onClick={handleCameraShare} key="share-camera">
                                    <IconCamera className="button-icon" />
                                    {LANDING_MENU.SHARE_CAMERA}
                                </button>
                                <button className="menu-button" onClick={handleScreenShare} key="share-screen">
                                    <IconScreen className="button-icon" />
                                    {LANDING_MENU.SHARE_SCREEN}
                                </button>
                                <button className="menu-button menu-button--secondary" onClick={handleShareSettings} key="share-settings" data-delay="0">
                                    <IconShare className="button-icon" />
                                    {LANDING_MENU.SHARE_SETTINGS}
                                </button>
                                <button className="menu-button menu-button--secondary" onClick={handleBack} key="share-back" data-delay="1">
                                    <IconBack className="button-icon" />
                                    {LANDING_MENU.BACK}
                                </button>
                            </>
                        )}

                        {menuState === 'settings' && (
                            <>
                                <div className="password-input-wrapper">
                                    <PasswordInput
                                        value={hostPassword}
                                        onChange={setHostPassword}
                                        placeholder={JOIN_FLOW.ROOM_PASSWORD_OPTIONAL}
                                        disabled={false}
                                        onValidationError={setPasswordInputError}
                                        onFocus={() => setIsInputFocused(true)}
                                        onBlur={() => setIsInputFocused(false)}
                                    />
                                </div>
                                <div
                                    className={`session-domain-toggle ${sessionDomainPolicy === 'same-domain' ? 'session-domain-toggle--same' : 'session-domain-toggle--all'}`}
                                    role="group"
                                    aria-label="Participant domain policy"
                                >
                                    <button
                                        type="button"
                                        className={`session-domain-toggle__option ${sessionDomainPolicy === 'same-domain' ? 'session-domain-toggle__option--active' : ''}`}
                                        onClick={() => setSessionDomainPolicy('same-domain')}
                                        aria-pressed={sessionDomainPolicy === 'same-domain'}
                                    >
                                        {SESSION_SETTINGS.DOMAIN_SAME}
                                    </button>
                                    <button
                                        type="button"
                                        className={`session-domain-toggle__option ${sessionDomainPolicy === 'all-domains' ? 'session-domain-toggle__option--active' : ''}`}
                                        onClick={() => setSessionDomainPolicy('all-domains')}
                                        aria-pressed={sessionDomainPolicy === 'all-domains'}
                                    >
                                        {SESSION_SETTINGS.DOMAIN_ALL}
                                    </button>
                                </div>
                                <button className="menu-button menu-button--secondary" onClick={handleBack} key="settings-back" data-delay="0">
                                    <IconBack className="button-icon" />
                                    {LANDING_MENU.BACK}
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
                                                placeholder={JOIN_FLOW.ENTER_SESSION_ID}
                                                value={sessionId}
                                                onChange={(e) => setSessionId(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !isConnecting && (sessionId.trim().length >= VALIDATION.MIN_SESSION_ID_LENGTH || sessionId.includes('peer='))) {
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
                                                disabled={isConnecting || !(sessionId.trim().length >= VALIDATION.MIN_SESSION_ID_LENGTH || sessionId.includes('peer='))}
                                                key="join-confirm"
                                            >
                                                <IconJoin className="button-icon" />
                                                {JOIN_FLOW.JOIN_SESSION}
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
                                                placeholder={JOIN_FLOW.PASSWORD_REQUIRED}
                                                disabled={isVerifying}
                                                error={!!passwordError}
                                                onValidationError={setPasswordInputError}
                                                onFocus={() => setIsInputFocused(true)}
                                                onBlur={() => setIsInputFocused(false)}
                                            />
                                        </div>
                                        <button
                                            className="menu-button"
                                            onClick={handlePasswordSubmit}
                                            disabled={isVerifying || !participantPassword.trim()}
                                            key="password-submit"
                                        >
                                            <IconJoin className="button-icon" />
                                            {isVerifying ? JOIN_FLOW.VERIFYING : JOIN_FLOW.SUBMIT_PASSWORD}
                                        </button>
                                    </>
                                )}
                                {(window.innerWidth > VALIDATION.DESKTOP_BREAKPOINT
                                    ? !(joinMode === 'input' && (isInputFocused || sessionId.trim()))
                                    : (joinMode === 'input' && !isInputFocused && !sessionId.trim())
                                ) && (
                                        <button
                                            className="menu-button"
                                            onClick={handleJoinWithQR}
                                            key="join-qr"
                                        >
                                            <IconQr className="button-icon" />
                                            {joinMode === 'qr' ? JOIN_FLOW.ENTER_MANUALLY : JOIN_FLOW.JOIN_WITH_QR}
                                        </button>
                                    )}
                                <button className="menu-button menu-button--secondary" onClick={handleBack} disabled={isConnecting} key="join-back" data-delay="0">
                                    <IconBack className="button-icon" />
                                    {LANDING_MENU.BACK}
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

                        {passwordInputError && (
                            <div className="error-message">
                                {passwordInputError}
                            </div>
                        )}

                        {isConnecting && (
                            <div className="error-message" style={{ color: 'var(--text-primary)' }}>
                                {JOIN_FLOW.CONNECTING}
                            </div>
                        )}

                        {isVerifying && (
                            <div className="error-message" style={{ color: 'var(--text-primary)' }}>
                                {JOIN_FLOW.VERIFYING_PASSWORD}
                            </div>
                        )}

                        <div className="landing-page__version">
                            {__COMMIT_HASH__} @ {__APP_VERSION__}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
