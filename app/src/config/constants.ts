import type { PeerConfig } from '../types/peer.types';
import type { MediaConstraints } from '../types/media.types';

const getPeerServerConfig = () => {
  const host = import.meta.env.VITE_PEERJS_HOST;
  const port = import.meta.env.VITE_PEERJS_PORT;
  const path = import.meta.env.VITE_PEERJS_PATH;
  const secure = import.meta.env.VITE_PEERJS_SECURE !== 'false';

  if (!host) {
    return {};
  }

  return {
    host,
    port: port ? parseInt(port, 10) : undefined,
    path: path || '/',
    secure
  };
};

export const PEER_SERVER_CONFIG = getPeerServerConfig();

const getPeerConfig = (): PeerConfig => {
  const stunServerUrl = import.meta.env.VITE_STUN_SERVER_URL;
  const defaultStunServer = 'stun:stun.l.google.com:19302';

  return {
    iceServers: [
      {
        urls: stunServerUrl || defaultStunServer
      }
    ],
    debug: 0
  };
};

export const PEER_CONFIG: PeerConfig = getPeerConfig();

export const CAMERA_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

export const SCREEN_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  },
  audio: true
};

export const APP_CONFIG = {
  APP_NAME: 'Perspective',
  APP_DESCRIPTION: 'Share your perspective with others',
  SHARE_PATH: '/share',
  CONNECTION_TIMEOUT: 30,
  RECONNECT_ATTEMPTS: 3
} as const;

export const ERROR_MESSAGES = {
  PERMISSION_DENIED: 'Permission to access camera/screen was denied. Please allow access to continue.',
  BROWSER_NOT_SUPPORTED: 'Your browser does not support WebRTC. Please use a modern browser.',
  PEER_CONNECTION_FAILED: 'Failed to establish peer connection. Please check your network.',
  INVALID_PEER_ID: 'Invalid or expired share link. Please request a new link from the host.',
  MEDIA_CAPTURE_FAILED: 'Failed to capture media stream. Please check your device.',
  NETWORK_ERROR: 'Network error occurred. Please check your internet connection.',
  PASSWORD_INCORRECT: 'Incorrect password. Please try again.',
  PASSWORD_MAX_RETRIES: 'Maximum password attempts exceeded. Please request a new link from the host.',
  PASSWORD_REQUIRED: 'This session requires a password.'
} as const;

const getMaxPasswordRetries = (): number => {
  const retries = import.meta.env.VITE_MAX_PASSWORD_RETRIES;
  return retries ? parseInt(retries, 10) : 5;
};

export const PASSWORD_CONFIG = {
  MAX_RETRIES: getMaxPasswordRetries()
} as const;
