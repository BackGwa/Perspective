export type PasswordMessageType =
  | 'PASSWORD_REQUEST'
  | 'PASSWORD_RESPONSE'
  | 'PASSWORD_APPROVED'
  | 'PASSWORD_REJECTED'
  | 'MAX_PARTICIPANTS_EXCEEDED';

export interface PasswordMessage {
  type: PasswordMessageType;
  payload?: {
    password?: string;
    proof?: string;
    nonce?: string;
    algorithm?: 'hmac-sha256' | 'sha-256';
    remainingRetries?: number;
    reason?: string;
  };
}

export function isValidPasswordMessage(data: unknown): data is PasswordMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const validTypes: PasswordMessageType[] = [
    'PASSWORD_REQUEST',
    'PASSWORD_RESPONSE',
    'PASSWORD_APPROVED',
    'PASSWORD_REJECTED',
    'MAX_PARTICIPANTS_EXCEEDED'
  ];

  const message = data as PasswordMessage;
  return 'type' in message && validTypes.includes(message.type);
}
