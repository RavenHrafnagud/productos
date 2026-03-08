/**
 * Traduce errores tecnicos de Supabase a mensajes guiados para el usuario final.
 */
const SCHEMA_MISSING_PATTERNS = [
  /invalid schema/i,
  /schema .* does not exist/i,
  /relation .* does not exist/i,
  /could not find .*table/i,
  /does not exist/i,
];

const PERMISSION_PATTERNS = [/permission denied/i, /not authorized/i, /new row violates row-level security/i];

type GuidanceContext = 'sucursales' | 'productos' | 'inventario' | 'general';

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

export function isSetupError(rawError: string | null | undefined) {
  if (!rawError) return false;
  return matchesAny(rawError, SCHEMA_MISSING_PATTERNS);
}

export function isPermissionError(rawError: string | null | undefined) {
  if (!rawError) return false;
  return matchesAny(rawError, PERMISSION_PATTERNS);
}

export function toFriendlySupabaseMessage(
  rawError: string | null | undefined,
  context: GuidanceContext,
) {
  if (!rawError) return null;

  if (/usuario_locales/i.test(rawError)) {
    return 'Hay una politica o dependencia antigua de usuario_locales. Ejecuta database/011_fix_operaciones_rls_after_usuario_locales.sql en Supabase.';
  }

  if (/persona_id|usuarios_id/i.test(rawError)) {
    return 'Hay una diferencia de esquema en movimientos de inventario. Ejecuta database/012_update_movimientos_usuario_id.sql en Supabase.';
  }

  if (isSetupError(rawError)) {
    if (context === 'sucursales') {
      return 'Primero crea una sucursal.';
    }
    if (context === 'productos') {
      return 'Primero crea un producto.';
    }
    if (context === 'inventario') {
      return 'Primero crea un inventario.';
    }
    return 'Primero crea las sucursales y productos.';
  }

  if (isPermissionError(rawError)) {
    if (context === 'sucursales') {
      return 'No tienes permisos para gestionar sucursales. Ejecuta database/005_fix_admin_branch_permissions.sql y database/007_secure_delete_helpers.sql en Supabase.';
    }
    if (context === 'productos') {
      return 'No tienes permisos para gestionar productos. Ejecuta database/007_secure_delete_helpers.sql o revisa politicas RLS.';
    }
    if (context === 'inventario') {
      return 'No tienes permisos para gestionar inventario. Verifica politicas RLS del esquema operaciones.';
    }
    return 'No tienes permisos para esta operacion. Verifica politicas RLS y rol del usuario.';
  }

  return rawError;
}
