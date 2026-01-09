import { PASSWORD_CONFIG } from '../config/constants';

class PasswordService {
  verifyPassword(input: string, stored: string): boolean {
    // Trim whitespace for comparison
    const trimmedInput = input.trim();
    const trimmedStored = stored.trim();

    // Empty password means public room - always allow
    if (!trimmedStored) {
      return true;
    }

    // Case-sensitive comparison
    return trimmedInput === trimmedStored;
  }

  shouldRejectParticipant(retryCount: number): boolean {
    return retryCount >= PASSWORD_CONFIG.MAX_RETRIES;
  }

  getRemainingRetries(retryCount: number): number {
    return Math.max(0, PASSWORD_CONFIG.MAX_RETRIES - retryCount);
  }

  isPasswordProtected(password: string | null): boolean {
    return password !== null && password.trim() !== '';
  }
}

export const passwordService = new PasswordService();
