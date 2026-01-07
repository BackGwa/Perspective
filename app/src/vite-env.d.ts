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
