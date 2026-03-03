/**
 * Fuente unica de variables de entorno.
 * Mantener aqui evita leer import.meta.env en toda la aplicacion.
 */
export const appEnv = {
  companyName: import.meta.env.VITE_COMPANY_NAME?.trim() || 'El Tarot como Guia',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.trim() ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '',
  defaultBranchId: import.meta.env.VITE_DEFAULT_BRANCH_ID?.trim() ?? '',
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL?.trim() || 'hrafnfreistudrr@gmail.com',
};

export const isSupabaseConfigured = Boolean(appEnv.supabaseUrl && appEnv.supabaseAnonKey);
