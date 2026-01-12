export const LANDING_MENU = {
  START_SHARING: 'Start Sharing',
  JOIN_SESSION: 'Join a Session',
  SHARE_CAMERA: 'Share Camera',
  SHARE_SCREEN: 'Share Screen',
  SHARE_SETTINGS: 'Share Settings',
  BACK: 'Back',
} as const;

export const JOIN_FLOW = {
  ENTER_SESSION_ID: 'Enter Session ID',
  SCAN_QR_CODE: 'Scan QR Code',
  JOIN_SESSION: 'Join Session',
  ENTER_MANUALLY: 'Enter Manually',
  JOIN_WITH_QR: 'Join with QR',
  ROOM_PASSWORD_OPTIONAL: 'Room Password (Optional)',
  PASSWORD_REQUIRED: 'Password Required',
  VERIFYING: 'Verifying...',
  SUBMIT_PASSWORD: 'Submit Password',
  CONNECTING: 'Connecting...',
  VERIFYING_PASSWORD: 'Verifying password...',
} as const;

export const SESSION_SETTINGS = {
  DOMAIN_SAME: 'Same domain',
  DOMAIN_ALL: 'All domains',
} as const;

export const HOST_CONTROLS = {
  SWITCH_CAMERA: 'Switch Camera',
  CAMERA_SWITCH_UNAVAILABLE: 'Camera switch unavailable',
  NO_OTHER_CAMERA: 'No other camera',
  RESUME_VIDEO: 'Resume Video',
  PAUSE_VIDEO: 'Pause Video',
  UNMUTE: 'Unmute',
  MUTE: 'Mute',
  SHARE_LINK: 'Share Link',
  STOP_SHARING: 'Stop Sharing',
} as const;

export const PARTICIPANT_CONTROLS = {
  UNMUTE: 'Unmute',
  MUTE: 'Mute',
  SHARE_LINK: 'Share Link',
  LEAVE_SESSION: 'Leave Session',
} as const;

export const QR_SHARE = {
  COPY_LINK: 'Copy Link',
  COPIED: 'Copied!',
} as const;

export const ERROR_BOUNDARY = {
  SOMETHING_WENT_WRONG: 'Something went wrong',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  RELOAD_PAGE: 'Reload Page',
} as const;

export const QR_VALIDATION_ERRORS = {
  INVALID_FORMAT: 'Invalid QR code format. Please scan a valid share link.',
  MISSING_PEER_ID: 'QR code is missing session information.',
  MALFORMED_URL: 'Unable to read QR code. Please try again.',
  DEFAULT: 'Invalid QR code.',
} as const;

export const PASSWORD_VERIFICATION = {
  ATTEMPTS_REMAINING: 'attempt|attempts remaining',
} as const;

export const CLIENT_COUNT = {
  CONNECTED: 'Connected',
} as const;
