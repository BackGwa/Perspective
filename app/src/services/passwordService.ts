import { PASSWORD_CONFIG } from '../config/constants';

class PasswordService {
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
