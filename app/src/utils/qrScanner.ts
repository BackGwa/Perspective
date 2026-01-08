import jsQR from 'jsqr';
import type { QRScanResult } from '../types/qr.types';
import { validateQRCodeURL, getQRErrorMessage } from './urlValidator';

/**
 * Scans a video frame for QR codes
 *
 * @param video - HTMLVideoElement with active stream
 * @returns QRScanResult or null if no QR code found
 */
export function scanVideoFrame(video: HTMLVideoElement): QRScanResult | null {
  // Create canvas to capture video frame
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  // Use video dimensions
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw current video frame to canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Get image data
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  // Scan for QR code
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert', // Optimize for performance
  });

  if (!code) {
    return null; // No QR code found
  }

  // Validate the scanned data
  const validation = validateQRCodeURL(code.data);

  if (!validation.isValid) {
    return {
      data: code.data,
      valid: false,
      error: validation.error
    };
  }

  return {
    data: code.data,
    valid: true,
    peerId: validation.peerId
  };
}

/**
 * Starts a continuous scanning loop on video element
 *
 * @param video - HTMLVideoElement to scan
 * @param onScan - Callback when valid QR code is found
 * @param onError - Callback when invalid QR code is scanned
 * @param interval - Milliseconds between scans (default: 100ms = 10 scans/sec)
 * @returns Cleanup function to stop scanning
 */
export function startContinuousScanning(
  video: HTMLVideoElement,
  onScan: (result: QRScanResult) => void,
  onError: (error: string) => void,
  interval: number = 100
): () => void {
  let isScanning = true;
  let intervalId: number;

  const scan = () => {
    if (!isScanning) return;

    try {
      const result = scanVideoFrame(video);

      if (result) {
        if (result.valid) {
          // Valid QR code found - trigger callback
          isScanning = false; // Stop scanning
          clearInterval(intervalId);
          onScan(result);
        } else {
          // Invalid QR code - show error
          const errorMsg = getQRErrorMessage(result.error!);
          onError(errorMsg);
        }
      }

    } catch (err) {
      console.error('QR scan error:', err);
    }
  };

  // Start scanning loop
  intervalId = window.setInterval(scan, interval);

  // Return cleanup function
  return () => {
    isScanning = false;
    clearInterval(intervalId);
  };
}
