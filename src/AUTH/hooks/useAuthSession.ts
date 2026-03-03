/**
 * Hook de sesion autenticada.
 * Mantiene el estado global de login y expone acciones seguras.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getCurrentSession,
  onAuthStateChanged,
  signInWithEmail,
  signOutCurrentSession,
} from '../api/authRepository';

interface UseAuthSessionResult {
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

export function useAuthSession(): UseAuthSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentSession()
      .then((currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
      })
      .catch(() => {
        if (!mounted) return;
        setAuthError('No fue posible validar la sesion actual.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data } = onAuthStateChanged((nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<UseAuthSessionResult>(
    () => ({
      session,
      loading,
      authError,
      async signIn(email, password) {
        setAuthError(null);
        await signInWithEmail(email, password);
      },
      async signOut() {
        setAuthError(null);
        await signOutCurrentSession();
      },
      clearAuthError() {
        setAuthError(null);
      },
    }),
    [authError, loading, session],
  );

  return value;
}
