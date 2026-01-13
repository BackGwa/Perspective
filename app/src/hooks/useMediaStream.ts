import { useCallback, useEffect, useRef, useState } from 'react';
import { mediaService } from '../services/mediaService';
import { useStreamContext } from '../contexts/StreamContext';
import type { MediaSourceType } from '../types/media.types';

interface UseMediaStreamOptions {
  cleanupOnUnmount?: boolean;
  onStreamEnded?: () => void;
}

export function useMediaStream(options: UseMediaStreamOptions = { cleanupOnUnmount: true }) {
  const { cleanupOnUnmount = true, onStreamEnded } = options;
  const { streamState, setStream, setPaused, setMuted, setError, clearStream } = useStreamContext();
  const isStoppingRef = useRef(false);
  const hasHandledStreamEndRef = useRef(false);

  const startCapture = useCallback(async (sourceType: MediaSourceType) => {
    try {
      console.log('[useMediaStream] startCapture called for:', sourceType);
      setError(null);
      const stream = await mediaService.getStream(sourceType);
      console.log('[useMediaStream] Got stream from mediaService:', stream);
      console.log('[useMediaStream] Stream tracks:', stream?.getTracks());
      setStream(stream, sourceType);
      console.log('[useMediaStream] Called setStream in context');
      setPaused(false);
      setMuted(false);
      return stream;
    } catch (error) {
      console.error('[useMediaStream] startCapture error:', error);
      const err = error instanceof Error ? error : new Error('Failed to capture media');
      setError(err);
      throw err;
    }
  }, [setStream, setPaused, setMuted, setError]);

  const stopCapture = useCallback(() => {
    if (streamState.stream) {
      isStoppingRef.current = true;
      mediaService.stopStream(streamState.stream);
      clearStream();
    }
  }, [streamState.stream, clearStream]);



  const toggleVideo = useCallback((enabled: boolean) => {
    if (streamState.stream) {
      console.log('toggleVideo called with enabled:', enabled);
      mediaService.toggleVideo(streamState.stream, enabled);
      setPaused(!enabled);
      console.log('Video tracks after toggle:', streamState.stream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled })));
    }
  }, [streamState.stream, setPaused]);

  const toggleAudio = useCallback((enabled: boolean) => {
    if (streamState.stream) {
      console.log('toggleAudio called with enabled:', enabled);
      mediaService.toggleAudio(streamState.stream, enabled);
      setMuted(!enabled);
      console.log('Audio tracks after toggle:', streamState.stream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled })));
    }
  }, [streamState.stream, setMuted]);

  // Camera switching state
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);

  // Check if camera switching is available when source type changes
  useEffect(() => {
    const checkCameraSwitch = async () => {
      if (streamState.sourceType === 'camera') {
        const hasMultipleCameras = await mediaService.hasFrontAndBackCamera();
        setCanSwitchCamera(hasMultipleCameras);
      } else {
        setCanSwitchCamera(false);
      }
    };
    checkCameraSwitch();
  }, [streamState.sourceType]);

  const switchCamera = useCallback(async () => {
    if (!streamState.stream || streamState.sourceType !== 'camera') {
      console.warn('Cannot switch camera: not in camera mode');
      return;
    }

    try {
      await mediaService.switchCamera(streamState.stream);
      console.log('Camera switched successfully');
    } catch (error) {
      console.error('Failed to switch camera:', error);
      const err = error instanceof Error ? error : new Error('Failed to switch camera');
      setError(err);
    }
  }, [streamState.stream, streamState.sourceType, setError]);

  const streamRef = useRef<MediaStream | null>(null);

  // Keep ref in sync
  useEffect(() => {
    streamRef.current = streamState.stream;
  }, [streamState.stream]);

  useEffect(() => {
    isStoppingRef.current = false;
    hasHandledStreamEndRef.current = false;
  }, [streamState.stream]);

  useEffect(() => {
    const stream = streamState.stream;
    if (!stream) return;

    const handleTrackEnded = () => {
      if (isStoppingRef.current || hasHandledStreamEndRef.current) return;
      hasHandledStreamEndRef.current = true;
      stopCapture();
      onStreamEnded?.();
    };

    const addEndedListener = (track: MediaStreamTrack) => {
      if (track.kind !== 'video') return;
      track.addEventListener('ended', handleTrackEnded);
    };

    const removeEndedListener = (track: MediaStreamTrack) => {
      if (track.kind !== 'video') return;
      track.removeEventListener('ended', handleTrackEnded);
    };

    stream.getVideoTracks().forEach(addEndedListener);

    const handleAddTrack = (event: MediaStreamTrackEvent) => {
      addEndedListener(event.track);
    };

    const handleRemoveTrack = (event: MediaStreamTrackEvent) => {
      removeEndedListener(event.track);
    };

    stream.addEventListener('addtrack', handleAddTrack);
    stream.addEventListener('removetrack', handleRemoveTrack);

    return () => {
      stream.getVideoTracks().forEach(removeEndedListener);
      stream.removeEventListener('addtrack', handleAddTrack);
      stream.removeEventListener('removetrack', handleRemoveTrack);
    };
  }, [streamState.stream, stopCapture, onStreamEnded]);

  useEffect(() => {
    return () => {
      if (cleanupOnUnmount && streamRef.current) {
        mediaService.stopStream(streamRef.current);
      }
    };
  }, [cleanupOnUnmount]); // Removed streamState.stream dependency to avoid re-triggering, relying on ref/closure or just simple unmount check if possible. But standard pattern is ok.


  return {
    stream: streamState.stream,
    sourceType: streamState.sourceType,
    isPaused: streamState.isPaused,
    isMuted: streamState.isMuted,
    error: streamState.error,
    canSwitchCamera,
    startCapture,
    stopCapture,
    toggleVideo,
    toggleAudio,
    switchCamera
  };
}
