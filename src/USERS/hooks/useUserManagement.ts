/**
 * Hook de gestion de usuarios.
 * Agrupa datos de perfil, usuarios y roles con acciones de administracion.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  assignRoleToUser,
  createRole,
  createUser,
  deleteUserAccount,
  getIdentitySnapshot,
  updateUserProfile,
} from '../api/userManagementRepository';
import type {
  CreateRoleInput,
  CreateUserInput,
  DeleteUserInput,
  MyProfile,
  RoleRecord,
  UpdateUserProfileInput,
  UserRecord,
} from '../types/UserManagement';

interface UseUserManagementResult {
  profile: MyProfile | null;
  users: UserRecord[];
  roles: RoleRecord[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createUserStatus: 'idle' | 'submitting' | 'success' | 'error';
  createUserError: string | null;
  createRoleStatus: 'idle' | 'submitting' | 'success' | 'error';
  createRoleError: string | null;
  updateUserStatus: 'idle' | 'submitting' | 'success' | 'error';
  updateUserError: string | null;
  deleteUserStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteUserError: string | null;
  assignStatus: 'idle' | 'submitting' | 'success' | 'error';
  assignError: string | null;
  reload: () => Promise<void>;
  addRole: (input: CreateRoleInput) => Promise<void>;
  addUser: (input: CreateUserInput) => Promise<void>;
  editUser: (input: UpdateUserProfileInput) => Promise<void>;
  removeUser: (input: DeleteUserInput) => Promise<void>;
  assignRole: (userId: string, roleId: string) => Promise<void>;
}

export function useUserManagement(authUserId: string, refreshKey: number): UseUserManagementResult {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [status, setStatus] = useState<UseUserManagementResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createUserStatus, setCreateUserStatus] = useState<UseUserManagementResult['createUserStatus']>('idle');
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createRoleStatus, setCreateRoleStatus] = useState<UseUserManagementResult['createRoleStatus']>('idle');
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);
  const [updateUserStatus, setUpdateUserStatus] = useState<UseUserManagementResult['updateUserStatus']>('idle');
  const [updateUserError, setUpdateUserError] = useState<string | null>(null);
  const [deleteUserStatus, setDeleteUserStatus] = useState<UseUserManagementResult['deleteUserStatus']>('idle');
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [assignStatus, setAssignStatus] = useState<UseUserManagementResult['assignStatus']>('idle');
  const [assignError, setAssignError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const snapshot = await getIdentitySnapshot(authUserId);
      setUsers(snapshot.users);
      setRoles(snapshot.roles);
      setProfile(snapshot.profile);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudo cargar el modulo de usuarios.');
    }
  }, [authUserId]);

  const addRole = useCallback(
    async (input: CreateRoleInput) => {
      setCreateRoleStatus('submitting');
      setCreateRoleError(null);
      try {
        await createRole(input);
        setCreateRoleStatus('success');
        await reload();
      } catch (err) {
        setCreateRoleStatus('error');
        setCreateRoleError(err instanceof Error ? err.message : 'No se pudo crear el rol.');
        throw err;
      }
    },
    [reload],
  );

  const addUser = useCallback(
    async (input: CreateUserInput) => {
      setCreateUserStatus('submitting');
      setCreateUserError(null);
      try {
        await createUser(input);
        setCreateUserStatus('success');
        await reload();
      } catch (err) {
        setCreateUserStatus('error');
        setCreateUserError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
        throw err;
      }
    },
    [reload],
  );

  const editUser = useCallback(
    async (input: UpdateUserProfileInput) => {
      setUpdateUserStatus('submitting');
      setUpdateUserError(null);
      try {
        await updateUserProfile(input);
        setUpdateUserStatus('success');
        await reload();
      } catch (err) {
        setUpdateUserStatus('error');
        setUpdateUserError(err instanceof Error ? err.message : 'No se pudo actualizar el usuario.');
        throw err;
      }
    },
    [reload],
  );

  const removeUser = useCallback(
    async (input: DeleteUserInput) => {
      setDeleteUserStatus('submitting');
      setDeleteUserError(null);
      try {
        await deleteUserAccount(input);
        setDeleteUserStatus('success');
        await reload();
      } catch (err) {
        setDeleteUserStatus('error');
        setDeleteUserError(err instanceof Error ? err.message : 'No se pudo eliminar el usuario.');
        throw err;
      }
    },
    [reload],
  );

  const assignRole = useCallback(
    async (userId: string, roleId: string) => {
      setAssignStatus('submitting');
      setAssignError(null);
      try {
        await assignRoleToUser(userId, roleId);
        setAssignStatus('success');
        await reload();
      } catch (err) {
        setAssignStatus('error');
        setAssignError(err instanceof Error ? err.message : 'No se pudo asignar el rol.');
        throw err;
      }
    },
    [reload],
  );

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload, refreshKey]);

  return {
    profile,
    users,
    roles,
    status,
    error,
    createUserStatus,
    createUserError,
    createRoleStatus,
    createRoleError,
    updateUserStatus,
    updateUserError,
    deleteUserStatus,
    deleteUserError,
    assignStatus,
    assignError,
    reload,
    addRole,
    addUser,
    editUser,
    removeUser,
    assignRole,
  };
}
