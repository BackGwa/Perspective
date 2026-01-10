import jsQR from 'jsqr';
import type { QRScanResult } from '../types/qr.types';
import { validateQRCodeURL, getQRErrorMessage } from './urlValidator';

export function scanVideoFrame(video: HTMLVideoElement): QRScanResult | null {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  if (!code) {
    return null;
  }

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
          isScanning = false;
          clearInterval(intervalId);
          onScan(result);
        } else {
          const errorMsg = getQRErrorMessage(result.error!);
          onError(errorMsg);
        }
      }

    } catch (err) {
      console.error('QR scan error:', err);
    }
  };

  intervalId = window.setInterval(scan, interval);

  return () => {
    isScanning = false;
    clearInterval(intervalId);
  };
}
