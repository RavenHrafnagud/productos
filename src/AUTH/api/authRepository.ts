/**
 * Repositorio de autenticacion.
 * Encapsula login/logout y lectura de sesion activa en Supabase Auth.
 */
import type { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw new Error(error.message);
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
