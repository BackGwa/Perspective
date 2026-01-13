export type MediaSourceType = 'camera' | 'screen';

export interface MediaConstraints {
  video: MediaTrackConstraints | boolean;
  audio: MediaTrackConstraints | boolean;
}

export interface StreamState {
  stream: MediaStream | null;
  isPaused: boolean;
  isMuted: boolean;
  sourceType: MediaSourceType | null;
  error: Error | null;
}
