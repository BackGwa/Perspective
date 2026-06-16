export type DomainPolicy = 'same-domain' | 'all-domains';

export type SessionMessageType = 'SESSION_JOIN_REQUEST' | 'SESSION_JOIN_REJECTED' | 'SESSION_PARTICIPANT_READY';

export interface SessionJoinRequestMessage {
  type: 'SESSION_JOIN_REQUEST';
  payload: {
    origin: string;
  };
}

export interface SessionJoinRejectedMessage {
  type: 'SESSION_JOIN_REJECTED';
  payload: {
    reason: string;
  };
}

export interface SessionParticipantReadyMessage {
  type: 'SESSION_PARTICIPANT_READY';
}

export type SessionMessage = SessionJoinRequestMessage | SessionJoinRejectedMessage | SessionParticipantReadyMessage;

export function isSessionJoinRequestMessage(data: unknown): data is SessionJoinRequestMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const message = data as SessionJoinRequestMessage;
  return message.type === 'SESSION_JOIN_REQUEST' && typeof message.payload?.origin === 'string';
}

export function isSessionJoinRejectedMessage(data: unknown): data is SessionJoinRejectedMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const message = data as SessionJoinRejectedMessage;
  return message.type === 'SESSION_JOIN_REJECTED' && typeof message.payload?.reason === 'string';
}

export function isSessionParticipantReadyMessage(data: unknown): data is SessionParticipantReadyMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const message = data as SessionParticipantReadyMessage;
  return message.type === 'SESSION_PARTICIPANT_READY';
}
