/**
 * Pantalla de acceso.
 * Incluye validacion de entradas y bloqueo temporal por intentos fallidos.
 */
import { FormEvent, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { isStrongPassword, isValidEmail } from '../../SHARED/utils/validators';

interface LoginScreenProps {
  companyName: string;
  adminEmail: string;
  busy: boolean;
  authError: string | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onClearError: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30_000;

const Layout = styled.main`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 20%, rgba(109, 61, 182, 0.2) 0%, transparent 35%),
      radial-gradient(circle at 90% 10%, rgba(210, 164, 110, 0.2) 0%, transparent 40%);
    pointer-events: none;
  }
`;

const Card = styled.section`
  width: min(460px, 100%);
  border-radius: 22px;
  border: 1px solid var(--border-soft);
  background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%);
  box-shadow: var(--shadow-soft);
  padding: 26px;
  position: relative;
  z-index: 1;

  @media (max-width: 520px) {
    padding: 20px;
    border-radius: 18px;
  }
`;

const Title = styled.h1`
  margin: 0;
  font-size: 1.75rem;

  @media (max-width: 520px) {
    font-size: 1.5rem;
  }
`;

const Subtitle = styled.p`
  margin-top: 8px;
  margin-bottom: 20px;
  color: var(--text-muted);
`;

const Label = styled.label`
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  padding: 12px;
  outline: none;
  margin-bottom: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8f6fc 100%);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  :focus {
    border-color: var(--accent-main);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: #fff;
  }
`;

const Submit = styled.button`
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 12px 14px;
  background: linear-gradient(115deg, #5f2da8 0%, #8e57df 100%);
  color: #fbf7ff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(58, 33, 94, 0.24);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  :hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 16px 28px rgba(58, 33, 94, 0.32);
  }

  :disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const Help = styled.p`
  margin-top: 14px;
  margin-bottom: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
`;

const ErrorBox = styled.div`
  border-radius: 10px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid #f1b6b6;
  background: #fff1f1;
  color: #7c2727;
`;

export function LoginScreen({
  companyName,
  adminEmail,
  busy,
  authError,
  onLogin,
  onClearError,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    if (!lockUntil) return;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockUntil]);

  const remainingMs = lockUntil ? Math.max(0, lockUntil - clock) : 0;
  const locked = remainingMs > 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (lockUntil && remainingMs <= 0) {
      setLockUntil(null);
    }
  }, [lockUntil, remainingMs]);

  const canSubmit = useMemo(
    () => !busy && !locked && email.trim().length > 0 && password.length > 0,
    [busy, email, locked, password],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    onClearError();

    if (!isValidEmail(email)) {
      setLocalError('Escribe un correo valido.');
      return;
    }

    // Se exige una clave robusta para reducir credenciales debiles.
    if (!isStrongPassword(password)) {
      setLocalError(
        'La clave debe tener minimo 12 caracteres, mayuscula, minuscula, numero y simbolo.',
      );
      return;
    }

    try {
      await onLogin(email, password);
      setAttempts(0);
    } catch (error) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= MAX_ATTEMPTS) {
        setLockUntil(Date.now() + LOCK_MS);
        setAttempts(0);
      }
      setLocalError(
        error instanceof Error
          ? `No fue posible iniciar sesion: ${error.message}`
          : 'No fue posible iniciar sesion. Verifica tus credenciales.',
      );
    }
  };

  return (
    <Layout>
      <Card>
        <Title>{companyName}</Title>
        <Subtitle>Acceso administrativo seguro</Subtitle>

        {(localError || authError) && <ErrorBox>{localError ?? authError}</ErrorBox>}

        <form onSubmit={handleSubmit}>
          <Label htmlFor="login-email">Correo</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onFocus={onClearError}
            placeholder="ejemplo@correo.com"
            required
          />

          <Label htmlFor="login-password">Clave</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onFocus={onClearError}
            placeholder="Clave segura"
            required
          />

          <Submit type="submit" disabled={!canSubmit}>
            {locked ? `Espera ${remainingSeconds}s` : busy ? 'Validando...' : 'Entrar al panel'}
          </Submit>
        </form>

        <Help>
          La autenticacion usa Supabase Auth con sesiones seguras y consultas parametrizadas.
        </Help>
      </Card>
    </Layout>
  );
}
