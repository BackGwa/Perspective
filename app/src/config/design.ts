export const QR_CODE_DESIGN = {
  BG_COLOR: '#ffffff',
  FG_COLOR: '#000000',
  ERROR_CORRECTION_LEVEL: 'M' as const,
} as const;

export const VALIDATION = {
  UUID_LENGTH: 36,
  MIN_SESSION_ID_LENGTH: 8,
  DESKTOP_BREAKPOINT: 1024,
} as const;

export const MEDIA_CONSTRAINTS = {
  ECHO_CANCELLATION: true,
  NOISE_SUPPRESSION: true,
  AUTO_GAIN_CONTROL: true,
} as const;
