export const TIMING = {
  COPY_FEEDBACK_DURATION: 1000,
  AUTO_JOIN_DELAY: 100,
  JOIN_REQUEST_DELAY: 100,
  JOIN_CONNECTION_TIMEOUT: 10000,
  ERROR_DISPLAY_DURATION: 3000,
  STREAM_WAIT_TIMEOUT: 3000,
  QR_SCAN_INTERVAL: 500,
} as const;

// Losing the signaling socket does not interrupt peers that are already
// connected, so retry quietly instead of tearing the session down.
export const SIGNALING_RECONNECT = {
  MAX_ATTEMPTS: 5,
  BASE_DELAY: 1000,
} as const;
