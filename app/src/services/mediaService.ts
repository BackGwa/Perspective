import { CAMERA_CONSTRAINTS, SCREEN_CONSTRAINTS, ERROR_MESSAGES } from '../config/constants';
import type { MediaSourceType } from '../types/media.types';

class MediaService {
  private currentStream: MediaStream | null = null;
  private microphoneTrack: MediaStreamTrack | null = null;
  private sourceType: MediaSourceType | null = null;

  async getCameraStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      this.currentStream = stream;
      return stream;
    } catch (error) {
      throw this.handleMediaError(error);
    }
  }

  async getScreenStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
      this.currentStream = stream;

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopStream();
      });

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

    // Add microphone track if available (except for camera which already has audio)
    if (sourceType === 'screen') {
      const micTrack = await this.getMicrophoneTrack();
      if (micTrack) {
        stream.addTrack(micTrack);
        this.microphoneTrack = micTrack;
        console.log('Screen sharing with microphone:', {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          microphoneAdded: true
        });
      }
    } else {
      // For camera, the audio track is the microphone
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        this.microphoneTrack = audioTrack;
        console.log('Camera with microphone:', {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length
        });
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
    // Toggle video tracks
    stream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });

    // If screen sharing, also toggle system audio (but not microphone)
    if (this.sourceType === 'screen') {
      stream.getAudioTracks().forEach(track => {
        // Only toggle system audio, not microphone
        if (track !== this.microphoneTrack) {
          track.enabled = enabled;
          console.log(`System audio ${enabled ? 'enabled' : 'disabled'}`);
        }
      });
    }
  }

  toggleAudio(_stream: MediaStream, enabled: boolean): void {
    // Only toggle microphone track
    if (this.microphoneTrack) {
      this.microphoneTrack.enabled = enabled;
      console.log(`Microphone ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  isVideoEnabled(stream: MediaStream): boolean {
    const videoTrack = stream.getVideoTracks()[0];
    return videoTrack ? videoTrack.enabled : false;
  }

  isAudioEnabled(_stream: MediaStream): boolean {
    // Check microphone track status
    return this.microphoneTrack ? this.microphoneTrack.enabled : false;
  }

  checkWebRTCSupport(): boolean {
    return !!(
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
      window.RTCPeerConnection
    );
  }

  private handleMediaError(error: unknown): Error {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          return new Error(ERROR_MESSAGES.PERMISSION_DENIED);
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return new Error('No camera or microphone found on this device.');
        case 'NotReadableError':
        case 'TrackStartError':
          return new Error('Device is already in use by another application.');
        case 'OverconstrainedError':
          return new Error('Camera does not support the requested constraints.');
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
