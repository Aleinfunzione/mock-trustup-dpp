/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_SEED?: string;
  readonly VITE_COMPANY_SEED?: string;
  readonly VITE_CREATOR_SEED?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
