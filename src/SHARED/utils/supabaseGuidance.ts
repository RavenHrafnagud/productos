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

type GuidanceContext = 'sucursales' | 'productos' | 'inventario' | 'ventas' | 'usuarios' | 'dashboard' | 'general';
type ExtendedGuidanceContext = GuidanceContext | 'envios';

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
  context: ExtendedGuidanceContext,
) {
  if (!rawError) return null;

  if (/^\[USERS/i.test(rawError)) {
    return rawError;
  }

  if (/usuario_locales/i.test(rawError)) {
    return 'Hay una politica o dependencia antigua de usuario_locales. Ejecuta database/011_fix_operaciones_rls_after_usuario_locales.sql en Supabase.';
  }

  if (/persona_id|usuarios_id/i.test(rawError)) {
    return 'Hay una diferencia de esquema en movimientos de inventario. Ejecuta database/012_update_movimientos_usuario_id.sql en Supabase.';
  }

  if (/cannot insert a non-default value into column "total"|column "total" can only be updated to DEFAULT/i.test(rawError)) {
    return 'La columna total es generada por la base de datos. El formulario de ventas debe registrar subtotal, impuestos y descuento para que el total se calcule automaticamente.';
  }

  if (/stock insuficiente/i.test(rawError)) {
    return 'No hay stock suficiente para completar la operacion. Revisa inventario, envios pendientes y movimientos.';
  }

  if (/create_identity_user_account/i.test(rawError)) {
    return 'Falta la funcion de alta completa de usuarios. Ejecuta database/014_create_identity_user_with_auth.sql en Supabase.';
  }

  if (/delete_identity_user_account/i.test(rawError)) {
    return 'Falta la funcion para eliminar usuarios. Ejecuta database/021_delete_identity_user_account.sql en Supabase.';
  }

  if (/sync_inventory_from_sale|sync_inventory_from_envio|apply_inventory_delta/i.test(rawError)) {
    return 'Falta la trazabilidad automatica de inventario. Ejecuta database/026_traceability_sales_shipments.sql en Supabase.';
  }

  if (/list_identity_users|list_identity_roles|create_identity_role|get_identity_context|complete_identity_user_profile|assign_identity_role_to_user|sync_identity_session_link|get_identity_admin_snapshot|update_identity_user_profile|update_identity_user_password/i.test(rawError)) {
    return 'Faltan funciones RPC de identidad. Ejecuta database/015_identity_admin_management_rpc.sql, database/016_session_identity_link_and_permissions.sql, database/018_identity_snapshot_rpc.sql, database/020_update_identity_user_profile.sql y database/023_update_identity_user_password.sql en Supabase.';
  }

  if (/structure of query does not match function result type/i.test(rawError)) {
    return 'Hay una incompatibilidad de tipos en funciones RPC de identidad. Reejecuta database/015_identity_admin_management_rpc.sql, database/016_session_identity_link_and_permissions.sql y database/017_align_roles_administrador_gerente_usuario.sql.';
  }

  if (isSetupError(rawError)) {
    if (context === 'sucursales') {
      return 'Crea primero una sucursal.';
    }
    if (context === 'productos') {
      return 'Crea primero un producto.';
    }
    if (context === 'inventario') {
      return 'Crea primero un inventario.';
    }
    if (context === 'ventas') {
      return 'Crea primero ventas y valida que el esquema ventas este expuesto en Data API.';
    }
    if (context === 'envios') {
      return 'Configura primero la tabla ventas.envios y sus politicas. Ejecuta database/024_envios_logistica_y_sucursales.sql en Supabase.';
    }
    if (context === 'usuarios') {
      return 'Valida primero el esquema identidad y ejecuta database/013_refactor_identidad_estado_roles.sql, database/015_identity_admin_management_rpc.sql, database/016_session_identity_link_and_permissions.sql, database/018_identity_snapshot_rpc.sql y database/020_update_identity_user_profile.sql.';
    }
    if (context === 'dashboard') {
      return 'Registra primero ventas para poblar el dashboard.';
    }
    return 'Crea primero las sucursales y productos.';
  }

  if (isPermissionError(rawError)) {
    if (context === 'sucursales') {
      return 'No tienes permisos para gestionar sucursales. Ejecuta database/019_role_based_permissions.sql en Supabase.';
    }
    if (context === 'productos') {
      return 'No tienes permisos para gestionar productos. Ejecuta database/007_secure_delete_helpers.sql o revisa politicas RLS.';
    }
    if (context === 'inventario') {
      return 'No tienes permisos para gestionar inventario. Ejecuta database/019_role_based_permissions.sql o revisa politicas RLS del esquema operaciones.';
    }
    if (context === 'ventas') {
      return 'No tienes permisos para gestionar ventas. Ejecuta database/019_role_based_permissions.sql o revisa RLS del esquema ventas.';
    }
    if (context === 'envios') {
      return 'No tienes permisos para gestionar envios. Ejecuta database/024_envios_logistica_y_sucursales.sql y revisa RLS del esquema ventas.';
    }
    if (context === 'usuarios') {
      return 'No tienes permisos para gestionar identidad (usuarios/roles). Verifica que tu usuario tenga rol admin y ejecuta database/015_identity_admin_management_rpc.sql.';
    }
    return 'No tienes permisos para esta operacion. Verifica politicas RLS y rol del usuario.';
  }

  return rawError;
}
