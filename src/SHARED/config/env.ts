/**
 * Fuente unica de variables de entorno.
 * Mantener aqui evita leer import.meta.env en toda la aplicacion.
 */
export const appEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  defaultLocalId: import.meta.env.VITE_DEFAULT_LOCAL_ID?.trim() ?? '',
};

export const isSupabaseConfigured = Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);
