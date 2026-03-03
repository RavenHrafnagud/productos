/**
 * Validadores reutilizables para sanitizar datos del usuario.
 * Ayudan a prevenir entradas invalidas y reducen superficie de errores.
 */
const SAFE_TEXT = /[^\p{L}\p{N}\s.,\-()#:/]/gu;

/**
 * Limpia caracteres peligrosos o no esperados.
 */
export function sanitizeText(value: string, maxLength = 140) {
  return value.replace(SAFE_TEXT, '').trim().slice(0, maxLength);
}

/**
 * Valida correo con un patron simple y robusto para frontend.
 */
export function isValidEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/**
 * Convierte texto a decimal y retorna null cuando no es valido.
 */
export function toPositiveNumber(input: string) {
  const normalized = input.replace(',', '.').trim();
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Regla minima de password para bloquear claves debiles en el cliente.
 */
export function isStrongPassword(password: string) {
  return (
    password.length >= 12 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
