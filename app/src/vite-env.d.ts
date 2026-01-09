/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PEERJS_HOST?: string
  readonly VITE_PEERJS_PORT?: string
  readonly VITE_PEERJS_PATH?: string
  readonly VITE_PEERJS_SECURE?: string
  readonly VITE_STUN_SERVER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
declare const __COMMIT_HASH__: string
