/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_CREDENTIALS?: string;
  readonly VITE_FEATURE_COMPLIANCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
