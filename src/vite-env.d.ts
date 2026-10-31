/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Google OAuth web client ID (public). Enables the Calendar panel. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  /** Test-only: swap Supabase for an in-browser fake. Never set in production. */
  readonly VITE_E2E_MEMORY_BACKEND?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
