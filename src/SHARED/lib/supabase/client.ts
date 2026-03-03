/**
 * Cliente Supabase compartido.
 * Todos los modulos de datos lo consumen desde este punto.
 */
import { createClient } from '@supabase/supabase-js';
import { appEnv, isSupabaseConfigured } from '../../config/env';
import type { Database } from '../../types/database';

const supabaseClient = isSupabaseConfigured
  ? createClient<Database>(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error(
      'Faltan variables de entorno para Supabase. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
    );
  }

  return supabaseClient;
}
