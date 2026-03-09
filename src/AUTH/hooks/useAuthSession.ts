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
  syncIdentitySessionLink,
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

    async function auditIdentitySession() {
      try {
        const audit = await syncIdentitySessionLink();
        if (!mounted || !audit) return;
        if (!audit.linked) {
          setAuthError(
            `Sesion autenticada, pero no vinculada en identidad: ${audit.diagnostic} Contacta a un administrador para completar tu perfil.`,
          );
          return;
        }
        if (!audit.rol_id) {
          setAuthError(
            `Sesion autenticada, pero sin rol asignado: ${audit.diagnostic} Debes tener un rol para acceder a permisos del sistema.`,
          );
        }
      } catch (err) {
        if (!mounted) return;
        const reason = err instanceof Error ? err.message : 'No se pudo auditar la sesion.';
        setAuthError(`No fue posible auditar la sesion de identidad: ${reason}`);
      }
    }

    getCurrentSession()
      .then((currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        if (currentSession) {
          auditIdentitySession().catch(() => undefined);
        }
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
      if (nextSession) {
        auditIdentitySession().catch(() => undefined);
      }
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
