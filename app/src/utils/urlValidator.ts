import type { URLValidationResult, QRValidationError } from '../types/qr.types';

/**
 * Validates QR code URL format and extracts peer ID
 *
 * Expected format: https://domain.com/#/share?peer=SESSION_ID
 *
 * Validation rules:
 * 1. Must use hash routing (#/)
 * 2. Must match current domain exactly (including subdomain)
 * 3. Must have /share path
 * 4. Must have peer parameter with non-empty value
 */
export function validateQRCodeURL(scannedURL: string): URLValidationResult {
  try {
    // Parse scanned URL
    const scannedUrl = new URL(scannedURL);
    const currentUrl = new URL(window.location.href);

    // 1. Validate domain match (including subdomain and port)
    const scannedOrigin = scannedUrl.origin;
    const currentOrigin = currentUrl.origin;

    if (scannedOrigin !== currentOrigin) {
      return {
        isValid: false,
        error: 'DOMAIN_MISMATCH'
      };
    }

    // 2. Validate hash routing format
    const hashPart = scannedUrl.hash; // e.g., "#/share?peer=abc123"

    if (!hashPart.startsWith('#/share')) {
      return {
        isValid: false,
        error: 'INVALID_FORMAT'
      };
    }

    // 3. Extract peer parameter from hash
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

/**
 * Get user-friendly error message for validation errors
 */
export function getQRErrorMessage(error: QRValidationError): string {
  switch (error) {
    case 'DOMAIN_MISMATCH':
      return 'QR code is for a different Perspective instance.';
    case 'INVALID_FORMAT':
      return 'Invalid QR code format. Please scan a valid share link.';
    case 'MISSING_PEER_ID':
      return 'QR code is missing session information.';
    case 'MALFORMED_URL':
      return 'Unable to read QR code. Please try again.';
    default:
      return 'Invalid QR code.';
  }
}
