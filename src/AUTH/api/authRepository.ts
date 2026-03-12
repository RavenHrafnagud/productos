/**
 * Repositorio de autenticacion.
 * Encapsula login/logout y lectura de sesion activa en Supabase Auth.
 */
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';

export interface IdentitySessionAudit {
  auth_user_id: string;
  email: string | null;
  persona_id: string | null;
  rol_id: number | null;
  rol_nombre: string | null;
  linked: boolean;
  diagnostic: string;
}

export async function syncIdentitySessionLink(): Promise<IdentitySessionAudit | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any).rpc('sync_identity_session_link');
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as IdentitySessionAudit[];
  return rows[0] ?? null;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (/Database error querying schema/i.test(error.message)) {
      throw new Error(
        'Error de instancia Auth. Ejecuta database/022_repair_auth_instances.sql en Supabase.',
      );
    }
    throw new Error(error.message);
  }
  if (data.session) {
    try {
      await syncIdentitySessionLink();
    } catch (err) {
      // Evita bloquear el inicio de sesion por fallos de auditoria.
      // La auditoria se reintenta desde useAuthSession.
      // eslint-disable-next-line no-console
      console.warn('Auditoria de sesion fallida durante login:', err);
    }
  }
  return data.session;
}

export async function signOutCurrentSession() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export function onAuthStateChanged(callback: (session: Session | null) => void) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
