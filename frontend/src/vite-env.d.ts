/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL?: string;
  /** Override app origin for auth redirects (defaults to current / canonical). */
  readonly VITE_APP_URL?: string;
  /** Force site mode: "marketing" | "app". Host detection used when unset. */
  readonly VITE_SITE_MODE?: "marketing" | "app";
  /** Override marketing origin (defaults to pollean.com / current). */
  readonly VITE_MARKETING_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}



