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
    remainingRetries?: number;
    reason?: string;
  };
}

export interface SessionPasswordState {
  password: string | null;
  isPasswordProtected: boolean;
}

export interface ParticipantPasswordState {
  isVerifying: boolean;
  retryCount: number;
  isApproved: boolean;
  errorMessage: string | null;
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
