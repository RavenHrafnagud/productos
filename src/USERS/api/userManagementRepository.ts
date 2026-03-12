/**
 * Repositorio de gestion de usuarios y roles.
 * Opera con RPCs de seguridad definer para soportar RLS y auth.users.
 */
import { getSupabaseClient, getSupabaseEphemeralClient } from '../../SHARED/lib/supabase/client';
import { sanitizeText } from '../../SHARED/utils/validators';
import type {
  CreateRoleInput,
  CreateUserInput,
  DeleteUserInput,
  MyProfile,
  RoleRecord,
  UpdateUserProfileInput,
  UserRecord,
} from '../types/UserManagement';

type RpcRoleRow = {
  id: number;
  nombre: string;
  descripcion: string | null;
};

type RpcUserRow = {
  auth_user_id: string;
  email: string | null;
  persona_id: string | null;
  estado: boolean | null;
  rol_id: number | null;
  rol_nombre: string | null;
  fecha_asignacion: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  nombres: string | null;
  apellidos: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  profile_complete: boolean;
};

type RpcContextRow = {
  auth_user_id: string;
  email: string | null;
  persona_id: string | null;
  nombres: string | null;
  apellidos: string | null;
  rol_id: number | null;
  rol_nombre: string | null;
  estado: boolean | null;
};

type RpcIdentitySnapshot = {
  context?: RpcContextRow | null;
  roles?: RpcRoleRow[];
  users?: RpcUserRow[];
  is_admin?: boolean;
};

export interface IdentitySnapshot {
  profile: MyProfile | null;
  users: UserRecord[];
  roles: RoleRecord[];
}

function isMissingRpcFunctionError(error: { code?: string | null; message: string }) {
  return error.code === 'PGRST202' || /Could not find the function/i.test(error.message);
}

function normalizeRoleIdInput(roleId: string) {
  const parsed = Number(roleId);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeName(value: string | null | undefined, fallback: string) {
  const clean = sanitizeText(value ?? '', 80);
  return clean || fallback;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function mapRpcUserToRecord(row: RpcUserRow): UserRecord {
  return {
    id: row.auth_user_id,
    personaId: row.persona_id ?? null,
    nombres: normalizeName(row.nombres, 'Sin nombres'),
    apellidos: normalizeName(row.apellidos, 'Sin apellidos'),
    email: row.email ?? null,
    numeroDocumento: row.numero_documento ?? 'Sin documento',
    tipoDocumento: row.tipo_documento ?? null,
    telefono: row.telefono ?? null,
    direccion: row.direccion ?? null,
    ciudad: row.ciudad ?? null,
    pais: row.pais ?? null,
    rolId: row.rol_id !== null ? String(row.rol_id) : null,
    rolNombre: row.rol_nombre ?? null,
    estado: row.estado ?? true,
    fechaAsignacion: row.fecha_asignacion ?? null,
    profileComplete: Boolean(row.profile_complete),
  };
}

function mapContextToProfile(row: RpcContextRow): MyProfile {
  return {
    id: row.auth_user_id,
    email: row.email ?? null,
    nombres: normalizeName(row.nombres, 'Sin nombres'),
    apellidos: normalizeName(row.apellidos, 'Sin apellidos'),
    rolNombre: row.rol_nombre ?? null,
    estado: row.estado ?? true,
  };
}

function normalizeSnapshotPayload(rawData: unknown): RpcIdentitySnapshot {
  const payload = Array.isArray(rawData) ? rawData[0] : rawData;
  if (!payload || typeof payload !== 'object') return {};
  return payload as RpcIdentitySnapshot;
}

export async function getIdentitySnapshot(authUserId: string): Promise<IdentitySnapshot> {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any).rpc('get_identity_admin_snapshot');
  if (error) {
    if (isMissingRpcFunctionError(error)) {
      const [users, roles, profile] = await Promise.all([
        listUsers(),
        listRoles(),
        getMyProfile(authUserId),
      ]);
      return { users, roles, profile };
    }
    throw new Error(`[USERS:get_identity_admin_snapshot] ${error.message}`);
  }

  const snapshot = normalizeSnapshotPayload(data);
  const roles = Array.isArray(snapshot.roles)
    ? snapshot.roles.map((row) => ({
      id: String((row as RpcRoleRow).id),
      nombre: (row as RpcRoleRow).nombre,
      descripcion: (row as RpcRoleRow).descripcion ?? null,
    }))
    : [];
  const users = Array.isArray(snapshot.users)
    ? snapshot.users.map((row) => mapRpcUserToRecord(row as RpcUserRow))
    : [];
  const profileFromContext = snapshot.context ? mapContextToProfile(snapshot.context) : null;
  const currentUser = users.find((user) => user.id === authUserId) ?? null;
  const profileFromUsers = currentUser
    ? {
      id: authUserId,
      email: currentUser.email ?? null,
      nombres: currentUser.nombres,
      apellidos: currentUser.apellidos,
      rolNombre: currentUser.rolNombre ?? null,
      estado: currentUser.estado,
    }
    : null;

  return {
    users,
    roles,
    profile: profileFromContext ?? profileFromUsers,
  };
}

export async function listRoles(): Promise<RoleRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any).rpc('list_identity_roles');
  if (error) {
    if (isMissingRpcFunctionError(error)) {
      throw new Error(
        'No existe la funcion list_identity_roles. Ejecuta database/015_identity_admin_management_rpc.sql.',
      );
    }
    throw new Error(`[USERS:list_identity_roles] ${error.message}`);
  }

  const rows = (data ?? []) as RpcRoleRow[];
  return rows.map((row) => ({ id: String(row.id), nombre: row.nombre, descripcion: row.descripcion }));
}

export async function listUsers(): Promise<UserRecord[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any).rpc('list_identity_users');
  if (error) {
    if (isMissingRpcFunctionError(error)) {
      throw new Error(
        'No existe la funcion list_identity_users. Ejecuta database/015_identity_admin_management_rpc.sql.',
      );
    }
    throw new Error(`[USERS:list_identity_users] ${error.message}`);
  }

  const rows = (data ?? []) as RpcUserRow[];
  return rows.map(mapRpcUserToRecord);
}

export async function getMyProfile(authUserId: string): Promise<MyProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any).rpc('get_identity_context');
  if (error) {
    if (isMissingRpcFunctionError(error)) {
      throw new Error(
        'No existe la funcion get_identity_context. Ejecuta database/015_identity_admin_management_rpc.sql.',
      );
    }
    throw new Error(`[USERS:get_identity_context] ${error.message}`);
  }

  const rows = (data ?? []) as RpcContextRow[];
  const me = rows.find((row) => row.auth_user_id === authUserId);
  if (!me) return null;
  return mapContextToProfile(me);
}

export async function createRole(input: CreateRoleInput): Promise<RoleRecord> {
  const supabase = getSupabaseClient();
  const normalizedName = sanitizeText(input.nombre, 60).toLowerCase();
  const normalizedDescription = sanitizeText(input.descripcion, 180) || null;

  if (!normalizedName) {
    throw new Error('El nombre del rol es obligatorio.');
  }

  const { data, error } = await (supabase as any).rpc('create_identity_role', {
    p_nombre: normalizedName,
    p_descripcion: normalizedDescription,
  });

  if (error) {
    if (isMissingRpcFunctionError(error)) {
      throw new Error(
        'No existe la funcion create_identity_role. Ejecuta database/015_identity_admin_management_rpc.sql.',
      );
    }
    throw new Error(`[USERS] ${error.message}`);
  }

  return {
    id: String(data),
    nombre: normalizedName,
    descripcion: normalizedDescription,
  };
}

export async function createUser(input: CreateUserInput): Promise<void> {
  const supabase = getSupabaseClient();
  const roleIdAsNumber = normalizeRoleIdInput(input.rolId);
  if (roleIdAsNumber === null) {
    throw new Error('El rol seleccionado no es valido.');
  }

  const tipoDocumento = sanitizeText(input.tipoDocumento, 25) || 'CC';
  const numeroDocumento = sanitizeText(input.numeroDocumento, 40);
  const nombres = sanitizeText(input.nombres, 80);
  const apellidos = sanitizeText(input.apellidos, 80);
  const email = normalizeEmail(input.email);
  const telefono = sanitizeText(input.telefono ?? '', 40) || null;
  const direccion = sanitizeText(input.direccion ?? '', 120) || null;
  const ciudad = sanitizeText(input.ciudad ?? '', 60) || null;
  const pais = sanitizeText(input.pais ?? '', 40) || 'CO';
  const password = input.password?.trim() ?? '';

  if (!numeroDocumento || !nombres || !apellidos || !email) {
    throw new Error('Correo, documento, nombres y apellidos son obligatorios.');
  }

  if (input.authUserId) {
    const authUserId = input.authUserId.trim();
    const { error } = await (supabase as any).rpc('complete_identity_user_profile', {
      p_auth_user_id: authUserId,
      p_tipo_documento: tipoDocumento,
      p_numero_documento: numeroDocumento,
      p_nombres: nombres,
      p_apellidos: apellidos,
      p_rol_id: roleIdAsNumber,
      p_telefono: telefono,
      p_direccion: direccion,
      p_ciudad: ciudad,
      p_pais: pais,
    });

    if (!error) return;
    if (isMissingRpcFunctionError(error)) {
      throw new Error(
        'No existe la funcion complete_identity_user_profile. Ejecuta database/015_identity_admin_management_rpc.sql.',
      );
    }
    throw new Error(`[USERS] ${error.message}`);
  }

  if (!password) {
    throw new Error('La contrasena es obligatoria para crear un usuario nuevo.');
  }

  const authClient = getSupabaseEphemeralClient();
  const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    throw new Error(`[USERS] ${signUpError.message}`);
  }

  const createdUserId = signUpData.user?.id;
  if (!createdUserId) {
    throw new Error(
      'No se recibio el identificador del usuario creado. Verifica la configuracion de Auth.',
    );
  }

  const { error: profileError } = await (supabase as any).rpc('complete_identity_user_profile', {
    p_auth_user_id: createdUserId,
    p_tipo_documento: tipoDocumento,
    p_numero_documento: numeroDocumento,
    p_nombres: nombres,
    p_apellidos: apellidos,
    p_rol_id: roleIdAsNumber,
    p_telefono: telefono,
    p_direccion: direccion,
    p_ciudad: ciudad,
    p_pais: pais,
  });

  if (!profileError) return;
  if (isMissingRpcFunctionError(profileError)) {
    throw new Error(
      'No existe la funcion complete_identity_user_profile. Ejecuta database/015_identity_admin_management_rpc.sql.',
    );
  }
  throw new Error(`[USERS] ${profileError.message}`);
}

export async function updateUserProfile(input: UpdateUserProfileInput): Promise<void> {
  const supabase = getSupabaseClient();
  const authUserId = input.authUserId.trim();
  if (!authUserId) {
    throw new Error('No se recibio el identificador del usuario.');
  }

  const tipoDocumento = sanitizeText(input.tipoDocumento, 25) || 'CC';
  const numeroDocumento = sanitizeText(input.numeroDocumento, 40);
  const nombres = sanitizeText(input.nombres, 80);
  const apellidos = sanitizeText(input.apellidos, 80);
  const telefono = sanitizeText(input.telefono ?? '', 40) || null;
  const direccion = sanitizeText(input.direccion ?? '', 120) || null;
  const ciudad = sanitizeText(input.ciudad ?? '', 60) || null;
  const pais = sanitizeText(input.pais ?? '', 40) || 'CO';
  const password = input.password?.trim() ?? '';

  if (!numeroDocumento || !nombres || !apellidos) {
    throw new Error('Documento, nombres y apellidos son obligatorios.');
  }

  const { error } = await (supabase as any).rpc('update_identity_user_profile', {
    p_auth_user_id: authUserId,
    p_tipo_documento: tipoDocumento,
    p_numero_documento: numeroDocumento,
    p_nombres: nombres,
    p_apellidos: apellidos,
    p_telefono: telefono,
    p_direccion: direccion,
    p_ciudad: ciudad,
    p_pais: pais,
  });

  if (error) {
    if (isMissingRpcFunctionError(error)) {
      throw new Error(
        'No existe la funcion update_identity_user_profile. Ejecuta database/020_update_identity_user_profile.sql.',
      );
    }
    throw new Error(`[USERS:update_identity_user_profile] ${error.message}`);
  }

  if (password) {
    const { error: passwordError } = await (supabase as any).rpc('update_identity_user_password', {
      p_auth_user_id: authUserId,
      p_password: password,
    });

    if (passwordError) {
      if (isMissingRpcFunctionError(passwordError)) {
        throw new Error(
          'No existe la funcion update_identity_user_password. Ejecuta database/023_update_identity_user_password.sql.',
        );
      }
      throw new Error(`[USERS:update_identity_user_password] ${passwordError.message}`);
    }
  }
}

export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const roleIdAsNumber = normalizeRoleIdInput(roleId);
  if (roleIdAsNumber === null) {
    throw new Error('El rol seleccionado no es valido.');
  }

  const { error } = await (supabase as any).rpc('assign_identity_role_to_user', {
    p_auth_user_id: userId,
    p_rol_id: roleIdAsNumber,
  });

  if (error) {
    if (isMissingRpcFunctionError(error)) {
      throw new Error(
        'No existe la funcion assign_identity_role_to_user. Ejecuta database/015_identity_admin_management_rpc.sql.',
      );
    }
    throw new Error(`[USERS] ${error.message}`);
  }
}

export async function deleteUserAccount(input: DeleteUserInput): Promise<void> {
  const supabase = getSupabaseClient();
  const authUserId = input.authUserId.trim();
  if (!authUserId) {
    throw new Error('No se recibio el identificador del usuario.');
  }

  const { error } = await (supabase as any).rpc('delete_identity_user_account', {
    p_auth_user_id: authUserId,
  });

  if (!error) return;
  if (isMissingRpcFunctionError(error)) {
    throw new Error(
      'No existe la funcion delete_identity_user_account. Ejecuta database/021_delete_identity_user_account.sql.',
    );
  }
  throw new Error(`[USERS] ${error.message}`);
}
