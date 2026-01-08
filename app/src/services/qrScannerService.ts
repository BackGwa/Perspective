import { peerService } from './peerService';
import type { QRScanResult } from '../types/qr.types';

class QRScannerService {
  /**
   * Processes a valid QR scan result and initiates connection
   *
   * This orchestrates:
   * 1. Validation (already done by scanner)
   * 2. Connection validation via peerService
   * 3. Returns peer ID for navigation
   *
   * @param scanResult - Valid QR scan result with peer ID
   * @returns Promise with peer ID on success
   * @throws Error if connection validation fails
   */
  async processQRScan(scanResult: QRScanResult): Promise<string> {
    if (!scanResult.valid || !scanResult.peerId) {
      throw new Error('Invalid QR scan result');
    }

    const peerId = scanResult.peerId;

    // Validate peer connection (same as manual input)
    try {
      await peerService.validateConnection(peerId);
      return peerId;
    } catch (err) {
      throw new Error('Unable to connect. Invalid ID or Host is offline.');
    }
  }
}

export const qrScannerService = new QRScannerService();
