/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMAGE_PROVIDER?: 'thesportsdb' | 'none'
  readonly VITE_DATA_PROVIDER?: 'static' | 'mock'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
