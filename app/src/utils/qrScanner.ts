import jsQR from 'jsqr';
import type { QRScanResult } from '../types/qr.types';
import { validateQRCodeURL, getQRErrorMessage } from './urlValidator';

const canvasCache = new WeakMap<HTMLVideoElement, { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }>();

const getCanvasContext = (video: HTMLVideoElement) => {
  const cached = canvasCache.get(video);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const entry = { canvas, context };
  canvasCache.set(video, entry);
  return entry;
};

export function scanVideoFrame(video: HTMLVideoElement): QRScanResult | null {
  const entry = getCanvasContext(video);
  if (!entry) {
    return null;
  }

  const { canvas, context } = entry;
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    return null;
  }

  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  context.drawImage(video, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);

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

  const intervalId = window.setInterval(scan, interval);

  return () => {
    isScanning = false;
    clearInterval(intervalId);
  };
}
