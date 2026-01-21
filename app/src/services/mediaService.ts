import { CAMERA_CONSTRAINTS, SCREEN_CONSTRAINTS, ERROR_MESSAGES } from '../config/constants';
import type { MediaSourceType } from '../types/media.types';

export type CameraFacingMode = 'user' | 'environment';
type VideoContentHint = 'detail' | 'motion' | 'text' | 'none';

const applyVideoContentHint = (track: MediaStreamTrack | undefined, hint: VideoContentHint) => {
  if (!track) return;
  if ('contentHint' in track) {
    track.contentHint = hint;
  }
};

class MediaService {
  private currentStream: MediaStream | null = null;
  private microphoneTrack: MediaStreamTrack | null = null;
  private sourceType: MediaSourceType | null = null;
  private currentFacingMode: CameraFacingMode = 'user';
  private availableCameras: MediaDeviceInfo[] = [];
  private lastCameraQueryAt: number | null = null;
  private hasDeviceChangeListener = false;
  private readonly devicesCacheTtlMs = 5000;

  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      if (!this.hasDeviceChangeListener && navigator.mediaDevices?.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', () => {
          this.availableCameras = [];
          this.lastCameraQueryAt = null;
        });
        this.hasDeviceChangeListener = true;
      }

      const now = Date.now();
      if (this.lastCameraQueryAt && now - this.lastCameraQueryAt < this.devicesCacheTtlMs) {
        return this.availableCameras;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(device => device.kind === 'videoinput');
      this.lastCameraQueryAt = now;
      return this.availableCameras;
    } catch (error) {
      console.warn('Failed to enumerate devices:', error);
      return [];
    }
  }

  async hasFrontAndBackCamera(): Promise<boolean> {
    const cameras = await this.getAvailableCameras();
    if (cameras.length < 2) return false;

    const hasBack = cameras.some(cam =>
      cam.label.toLowerCase().includes('back') ||
      cam.label.toLowerCase().includes('rear') ||
      cam.label.toLowerCase().includes('environment')
    );
    const hasFront = cameras.some(cam =>
      cam.label.toLowerCase().includes('front') ||
      cam.label.toLowerCase().includes('user') ||
      cam.label.toLowerCase().includes('facetime')
    );

    return (hasBack && hasFront) || cameras.length >= 2;
  }

  async getCameraStream(facingMode?: CameraFacingMode): Promise<MediaStream> {
    try {
      const targetFacingMode = facingMode || this.currentFacingMode;
      const baseVideoConstraints = typeof CAMERA_CONSTRAINTS.video === 'object'
        ? CAMERA_CONSTRAINTS.video
        : {};
      const constraints = {
        ...CAMERA_CONSTRAINTS,
        video: {
          ...baseVideoConstraints,
          facingMode: { ideal: targetFacingMode }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      applyVideoContentHint(stream.getVideoTracks()[0], 'motion');
      this.currentStream = stream;
      this.currentFacingMode = targetFacingMode;
      return stream;
    } catch (error) {
      throw this.handleMediaError(error);
    }
  }

  async getScreenStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
      applyVideoContentHint(stream.getVideoTracks()[0], 'detail');
      this.currentStream = stream;

      return stream;
    } catch (error) {
      throw this.handleMediaError(error);
    }
  }

  async getMicrophoneTrack(): Promise<MediaStreamTrack | null> {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const micTrack = micStream.getAudioTracks()[0];
      if (micTrack) {
        micTrack.contentHint = 'speech';
      }
      return micTrack;
    } catch (error) {
      console.warn('Microphone not available:', error);
      return null;
    }
  }

  async getStream(sourceType: MediaSourceType): Promise<MediaStream> {
    this.sourceType = sourceType;
    const stream = sourceType === 'camera'
      ? await this.getCameraStream()
      : await this.getScreenStream();

    if (sourceType === 'screen') {
      const micTrack = await this.getMicrophoneTrack();
      if (micTrack) {
        stream.addTrack(micTrack);
        this.microphoneTrack = micTrack;
      }
    } else {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        this.microphoneTrack = audioTrack;
      }
    }

    return stream;
  }

  stopStream(stream?: MediaStream): void {
    const targetStream = stream || this.currentStream;
    if (targetStream) {
      targetStream.getTracks().forEach(track => {
        track.stop();
      });
      if (targetStream === this.currentStream) {
        this.currentStream = null;
        this.microphoneTrack = null;
        this.sourceType = null;
      }
    }
  }

  toggleVideo(stream: MediaStream, enabled: boolean): void {
    stream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });

    if (this.sourceType === 'screen') {
      stream.getAudioTracks().forEach(track => {
        if (track !== this.microphoneTrack) {
          track.enabled = enabled;
        }
      });
    }
  }

  toggleAudio(_stream: MediaStream, enabled: boolean): void {
    if (this.microphoneTrack) {
      this.microphoneTrack.enabled = enabled;
    }
  }

  async switchCamera(currentStream: MediaStream): Promise<MediaStream> {
    if (this.sourceType !== 'camera') {
      throw new Error(ERROR_MESSAGES.CAMERA_SWITCHING_ONLY_AVAILABLE);
    }

    const newFacingMode: CameraFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      const currentVideoTrack = currentStream.getVideoTracks()[0];
      if (currentVideoTrack) {
        currentVideoTrack.stop();
        currentStream.removeTrack(currentVideoTrack);
      }

      const newStream = await this.getCameraStream(newFacingMode);
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (newVideoTrack) {
        currentStream.addTrack(newVideoTrack);
      }

      newStream.getAudioTracks().forEach(track => track.stop());
      return currentStream;
    } catch (error) {
      throw this.handleMediaError(error);
    }
  }

  private handleMediaError(error: unknown): Error {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          return new Error(ERROR_MESSAGES.PERMISSION_DENIED);
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return new Error(ERROR_MESSAGES.NO_CAMERA_OR_MICROPHONE);
        case 'NotReadableError':
        case 'TrackStartError':
          return new Error(ERROR_MESSAGES.DEVICE_ALREADY_IN_USE);
        case 'OverconstrainedError':
          return new Error(ERROR_MESSAGES.CAMERA_CONSTRAINTS_NOT_SUPPORTED);
        case 'NotSupportedError':
          return new Error(ERROR_MESSAGES.BROWSER_NOT_SUPPORTED);
        default:
          return new Error(ERROR_MESSAGES.MEDIA_CAPTURE_FAILED);
      }
    }
    return error instanceof Error ? error : new Error(ERROR_MESSAGES.MEDIA_CAPTURE_FAILED);
  }
}

export const mediaService = new MediaService();
