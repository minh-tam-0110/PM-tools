/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REVIEW_360_URL: string
  readonly VITE_ALLOWED_ORIGINS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
