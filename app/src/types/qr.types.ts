export interface QRScanResult {
  data: string;
  valid: boolean;
  peerId?: string;
  error?: QRValidationError;
}

export type QRValidationError =
  | 'INVALID_FORMAT'
  | 'MISSING_PEER_ID'
  | 'MALFORMED_URL';

export interface URLValidationResult {
  isValid: boolean;
  peerId?: string;
  error?: QRValidationError;
}
