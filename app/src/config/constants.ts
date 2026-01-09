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

const getMediaResolution = () => {
  const width = import.meta.env.VITE_MAX_RESOLUTION_WIDTH;
  const height = import.meta.env.VITE_MAX_RESOLUTION_HEIGHT;
  const frameRate = import.meta.env.VITE_MAX_FRAMERATE;

  return {
    width: width ? parseInt(width, 10) : 1920,
    height: height ? parseInt(height, 10) : 1080,
    frameRate: frameRate ? parseInt(frameRate, 10) : 30
  };
};

const mediaSettings = getMediaResolution();

export const CAMERA_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { ideal: mediaSettings.width },
    height: { ideal: mediaSettings.height },
    frameRate: { ideal: mediaSettings.frameRate }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

export const SCREEN_CONSTRAINTS: MediaConstraints = {
  video: {
    width: { ideal: mediaSettings.width },
    height: { ideal: mediaSettings.height },
    frameRate: { ideal: mediaSettings.frameRate }
  },
  audio: true
};

const getConnectionSettings = () => {
  const timeout = import.meta.env.VITE_CONNECTION_TIMEOUT;
  const attempts = import.meta.env.VITE_RECONNECT_ATTEMPTS;

  return {
    timeout: timeout ? parseInt(timeout, 10) : 30,
    attempts: attempts ? parseInt(attempts, 10) : 3
  };
};

const connectionSettings = getConnectionSettings();

export const APP_CONFIG = {
  APP_NAME: 'Perspective',
  APP_DESCRIPTION: 'Share your perspective with others',
  SHARE_PATH: '/share',
  CONNECTION_TIMEOUT: connectionSettings.timeout,
  RECONNECT_ATTEMPTS: connectionSettings.attempts
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
  PASSWORD_REQUIRED: 'This session requires a password.',
  MAX_PARTICIPANTS_EXCEEDED: 'Session is at maximum capacity. Please try again later.'
} as const;

const getMaxPasswordRetries = (): number => {
  const retries = import.meta.env.VITE_MAX_PASSWORD_RETRIES;
  return retries ? parseInt(retries, 10) : 3;
};

export const PASSWORD_CONFIG = {
  MAX_RETRIES: getMaxPasswordRetries()
} as const;

const getMaxParticipants = (): number => {
  const maxParticipants = import.meta.env.VITE_MAX_PARTICIPANTS;
  return maxParticipants ? parseInt(maxParticipants, 10) : 24;
};

export const PARTICIPANT_CONFIG = {
  MAX_PARTICIPANTS: getMaxParticipants()
} as const;
