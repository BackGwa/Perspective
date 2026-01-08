import { useEffect, useRef, useCallback } from 'react';
import { startContinuousScanning } from '../utils/qrScanner';
import type { QRScanResult } from '../types/qr.types';

interface UseQRScannerOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  enabled: boolean; // Only scan when enabled
  onScan: (result: QRScanResult) => void;
  onError: (error: string) => void;
  scanInterval?: number; // Optional custom interval
}

export function useQRScanner({
  videoRef,
  enabled,
  onScan,
  onError,
  scanInterval = 100
}: UseQRScannerOptions) {
  const stopScanningRef = useRef<(() => void) | null>(null);

  // Memoize callbacks to prevent effect re-runs
  const stableOnScan = useCallback(onScan, [onScan]);
  const stableOnError = useCallback(onError, [onError]);

  useEffect(() => {
    if (!enabled || !videoRef.current) {
      return;
    }

    const video = videoRef.current;

    // Wait for video to be ready
    const startScanning = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        stopScanningRef.current = startContinuousScanning(
          video,
          stableOnScan,
          stableOnError,
          scanInterval
        );
      }
    };

    // Start immediately if ready, otherwise wait for loadeddata
    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      startScanning();
    } else {
      video.addEventListener('loadeddata', startScanning);
    }

    // Cleanup
    return () => {
      video.removeEventListener('loadeddata', startScanning);
      if (stopScanningRef.current) {
        stopScanningRef.current();
        stopScanningRef.current = null;
      }
    };
  }, [enabled, videoRef, stableOnScan, stableOnError, scanInterval]);

  // Manual stop function
  const stopScanning = useCallback(() => {
    if (stopScanningRef.current) {
      stopScanningRef.current();
      stopScanningRef.current = null;
    }
  }, []);

  return { stopScanning };
}
