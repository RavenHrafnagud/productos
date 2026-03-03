/**
 * Tipado de variables de entorno para Vite.
 * Define las claves permitidas usadas por la aplicacion.
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEFAULT_BRANCH_ID?: string;
  readonly VITE_COMPANY_NAME?: string;
  readonly VITE_ADMIN_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
