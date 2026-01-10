import type { URLValidationResult, QRValidationError } from '../types/qr.types';
import { QR_VALIDATION_ERRORS } from '../config/uiText';

export function validateQRCodeURL(scannedURL: string): URLValidationResult {
  try {
    const scannedUrl = new URL(scannedURL);
    const currentUrl = new URL(window.location.href);

    const scannedOrigin = scannedUrl.origin;
    const currentOrigin = currentUrl.origin;

    if (scannedOrigin !== currentOrigin) {
      return {
        isValid: false,
        error: 'DOMAIN_MISMATCH'
      };
    }

    const hashPart = scannedUrl.hash;

    if (!hashPart.startsWith('#/share')) {
      return {
        isValid: false,
        error: 'INVALID_FORMAT'
      };
    }

    const hashParams = new URLSearchParams(hashPart.split('?')[1]);
    const peerId = hashParams.get('peer');

    if (!peerId || peerId.trim() === '') {
      return {
        isValid: false,
        error: 'MISSING_PEER_ID'
      };
    }

    return {
      isValid: true,
      peerId: peerId.trim()
    };

  } catch (err) {
    return {
      isValid: false,
      error: 'MALFORMED_URL'
    };
  }
}

export function getQRErrorMessage(error: QRValidationError): string {
  switch (error) {
    case 'DOMAIN_MISMATCH':
      return QR_VALIDATION_ERRORS.DOMAIN_MISMATCH;
    case 'INVALID_FORMAT':
      return QR_VALIDATION_ERRORS.INVALID_FORMAT;
    case 'MISSING_PEER_ID':
      return QR_VALIDATION_ERRORS.MISSING_PEER_ID;
    case 'MALFORMED_URL':
      return QR_VALIDATION_ERRORS.MALFORMED_URL;
    default:
      return QR_VALIDATION_ERRORS.DEFAULT;
  }
}
