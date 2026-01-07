import { useCallback, useEffect, useRef } from 'react';
import { mediaService } from '../services/mediaService';
import { useStreamContext } from '../contexts/StreamContext';
import type { MediaSourceType } from '../types/media.types';

interface UseMediaStreamOptions {
  cleanupOnUnmount?: boolean;
}

export function useMediaStream(options: UseMediaStreamOptions = { cleanupOnUnmount: true }) {
  const { streamState, setStream, setPaused, setMuted, setError, clearStream } = useStreamContext();

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
      mediaService.stopStream(streamState.stream);
      clearStream();
    }
  }, [streamState.stream, clearStream]);

  // ... (toggleVideo loops)

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

  const streamRef = useRef<MediaStream | null>(null);

  // Keep ref in sync
  useEffect(() => {
    streamRef.current = streamState.stream;
  }, [streamState.stream]);

  useEffect(() => {
    return () => {
      if (options.cleanupOnUnmount && streamRef.current) {
        mediaService.stopStream(streamRef.current);
      }
    };
  }, [options.cleanupOnUnmount]); // Removed streamState.stream dependency to avoid re-triggering, relying on ref/closure or just simple unmount check if possible. But standard pattern is ok.
  // Actually, wait. streamState changes. If streamState.stream changes, effect cleanup runs.
  // We want to cleanup ON UNMOUNT.
  // The original code:
  // useEffect(() => { return () => { ... } }, [])
  // This runs cleanup only on unmount.
  // But inside cleanup, `streamState.stream` would be stale (initial value) if not using a ref or dependency.
  // The original code had `[]` dependency?
  // Let's look at original code. `useEffect(..., [])`. And it used `streamState.stream`. React closures would capture initial `streamState`. 
  // If `streamState` comes from context hook, it might be updated? No, closure captures the render scope variables.
  // If `streamState` was null initially, cleanup would do nothing even if stream was set later.
  // The original hook likely had a bug if `streamState` wasn't a ref or accessed via context directly in cleanup?
  // Wait, `useStreamContext` returns *current* context value.
  // But `useEffect` with `[]` closes over the *first render* scope.
  // So `streamState` inside cleanup is the initial one.
  // The User didn't complain about leaks, but I should fix this correctly.

  // Update Plan: Use a ref to track current stream for cleanup.

  return {
    stream: streamState.stream,
    sourceType: streamState.sourceType,
    isActive: streamState.isActive,
    isPaused: streamState.isPaused,
    isMuted: streamState.isMuted,
    error: streamState.error,
    startCapture,
    stopCapture,
    toggleVideo,
    toggleAudio
  };
}
