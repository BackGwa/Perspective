export type MediaSourceType = 'camera' | 'screen';

export interface MediaStreamConfig {
  source: MediaSourceType;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export interface MediaConstraints {
  video: MediaTrackConstraints | boolean;
  audio: MediaTrackConstraints | boolean;
}

export interface StreamState {
  stream: MediaStream | null;
  isActive: boolean;
  isPaused: boolean;
  isMuted: boolean;
  sourceType: MediaSourceType | null;
  error: Error | null;
}

export interface MediaDeviceError {
  name: string;
  message: string;
  constraint?: string;
}
