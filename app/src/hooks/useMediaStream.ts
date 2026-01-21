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
      setError(null);
      const stream = await mediaService.getStream(sourceType);
      setStream(stream, sourceType);
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
      mediaService.toggleVideo(streamState.stream, enabled);
      setPaused(!enabled);
    }
  }, [streamState.stream, setPaused]);

  const toggleAudio = useCallback((enabled: boolean) => {
    if (streamState.stream) {
      mediaService.toggleAudio(streamState.stream, enabled);
      setMuted(!enabled);
    }
  }, [streamState.stream, setMuted]);

  const [canSwitchCamera, setCanSwitchCamera] = useState(false);

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
    } catch (error) {
      console.error('Failed to switch camera:', error);
      const err = error instanceof Error ? error : new Error('Failed to switch camera');
      setError(err);
    }
  }, [streamState.stream, streamState.sourceType, setError]);

  const streamRef = useRef<MediaStream | null>(null);

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
  }, [cleanupOnUnmount]);


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
