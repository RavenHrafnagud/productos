/**
 * Seccion de usuarios y roles.
 * Incluye perfil del usuario autenticado y administracion integral de identidad.
 */
import { FormEvent, useMemo, useState } from 'react';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
import {
  ButtonsRow,
  Field,
  Fields,
  FormGrid,
  GhostButton,
  InputControl,
  PrimaryButton,
  SelectControl,
  TextAreaControl,
} from '../../SHARED/ui/FormControls';
import { SectionCard, SectionHeader, SectionMeta, SectionTitle } from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { isStrongPassword, isValidEmail, sanitizeText } from '../../SHARED/utils/validators';
import type { UserRecord } from '../types/UserManagement';
import { useUserManagement } from '../hooks/useUserManagement';

interface UsersSectionProps {
  authUserId: string;
  refreshKey: number;
}

interface RoleForm {
  nombre: string;
  descripcion: string;
}

interface UserForm {
  targetAuthUserId: string;
  password: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  rolId: string;
}

const EMPTY_ROLE_FORM: RoleForm = { nombre: '', descripcion: '' };
const EMPTY_USER_FORM: UserForm = {
  targetAuthUserId: '',
  password: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  email: '',
  rolId: '',
};

function getDisplayName(user: UserRecord) {
  const fullName = `${user.nombres} ${user.apellidos}`.trim();
  const invalidName = /^sin nombres\s+sin apellidos$/i.test(fullName);
  return invalidName ? 'Sin perfil de identidad' : fullName;
}

export function UsersSection({ authUserId, refreshKey }: UsersSectionProps) {
  const {
    profile,
    users,
    roles,
    status,
    error,
    createUserStatus,
    createUserError,
    createRoleStatus,
    createRoleError,
    assignStatus,
    assignError,
    addRole,
    addUser,
    assignRole,
    reload,
  } = useUserManagement(authUserId, refreshKey);
  const [roleForm, setRoleForm] = useState<RoleForm>(EMPTY_ROLE_FORM);
  const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER_FORM);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [roleDraftByUser, setRoleDraftByUser] = useState<Record<string, string>>({});
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'usuarios');
  const friendlyCreateUserError = toFriendlySupabaseMessage(createUserError, 'usuarios');
  const friendlyCreateRoleError = toFriendlySupabaseMessage(createRoleError, 'usuarios');
  const friendlyAssignError = toFriendlySupabaseMessage(assignError, 'usuarios');

  const roleOptions = useMemo(
    () => roles.map((role) => ({ id: role.id, name: role.nombre })),
    [roles],
  );
  const pendingUsers = useMemo(() => users.filter((user) => !user.profileComplete), [users]);
  const selectedPendingUser = useMemo(
    () => pendingUsers.find((user) => user.id === userForm.targetAuthUserId) ?? null,
    [pendingUsers, userForm.targetAuthUserId],
  );
  const isCompletingExisting = Boolean(userForm.targetAuthUserId);

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRoleFormError(null);

    const nombre = sanitizeText(roleForm.nombre, 60).toLowerCase();
    const descripcion = sanitizeText(roleForm.descripcion, 180);
    if (!nombre) {
      setRoleFormError('El nombre del rol es obligatorio.');
      return;
    }

    try {
      await addRole({ nombre, descripcion });
      setRoleForm(EMPTY_ROLE_FORM);
    } catch {
      // El detalle se muestra en createRoleError.
    }
  };

  const handleUsePendingUser = (user: UserRecord) => {
    setUserFormError(null);
    setUserForm({
      targetAuthUserId: user.id,
      password: '',
      tipoDocumento: user.tipoDocumento ?? 'CC',
      numeroDocumento: user.numeroDocumento === 'Sin documento' ? '' : user.numeroDocumento,
      nombres: /^sin nombres$/i.test(user.nombres) ? '' : user.nombres,
      apellidos: /^sin apellidos$/i.test(user.apellidos) ? '' : user.apellidos,
      email: user.email ?? '',
      rolId: user.rolId ?? '',
    });
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserFormError(null);

    const numeroDocumento = sanitizeText(userForm.numeroDocumento, 40);
    const nombres = sanitizeText(userForm.nombres, 80);
    const apellidos = sanitizeText(userForm.apellidos, 80);
    const tipoDocumento = sanitizeText(userForm.tipoDocumento, 25) || 'CC';
    const rolId = userForm.rolId;
    const fallbackEmail = sanitizeText(userForm.email, 120).toLowerCase();
    const email = sanitizeText(selectedPendingUser?.email ?? fallbackEmail, 120).toLowerCase();
    const password = userForm.password.trim();

    if (!numeroDocumento || !nombres || !apellidos || !rolId) {
      setUserFormError('Documento, nombres, apellidos y rol son obligatorios.');
      return;
    }
    if (!email || !isValidEmail(email)) {
      setUserFormError('El correo del usuario no es valido.');
      return;
    }
    if (!isCompletingExisting && !isStrongPassword(password)) {
      setUserFormError(
        'La contrasena debe tener minimo 12 caracteres, una mayuscula, una minuscula, un numero y un simbolo.',
      );
      return;
    }

    try {
      await addUser({
        authUserId: isCompletingExisting ? userForm.targetAuthUserId : undefined,
        password: isCompletingExisting ? '' : password,
        tipoDocumento,
        numeroDocumento,
        nombres,
        apellidos,
        email,
        rolId,
      });
      setUserForm(EMPTY_USER_FORM);
    } catch {
      // El detalle se muestra en createUserError.
    }
  };

  const handleAssignRole = async (userId: string, currentRoleId: string | null) => {
    const roleId = roleDraftByUser[userId] ?? currentRoleId ?? '';
    if (!roleId) return;
    try {
      await assignRole(userId, roleId);
    } catch {
      // El detalle se muestra en assignError.
    }
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Usuarios y roles</SectionTitle>
        <SectionMeta>{users.length} cuentas detectadas</SectionMeta>
      </SectionHeader>

      {profile ? (
        <StatusState
          kind="info"
          message={`Sesion: ${profile.nombres} ${profile.apellidos} | Rol: ${profile.rolNombre ?? 'Sin rol'} | Estado: ${profile.estado ? 'Activo' : 'Inactivo'}`}
        />
      ) : (
        <StatusState kind="empty" message="No se encontro perfil de identidad para la sesion actual." />
      )}

      <SectionHeader>
        <SectionTitle>Crear rol</SectionTitle>
      </SectionHeader>
      <FormGrid onSubmit={handleCreateRole}>
        <Fields>
          <Field>
            Nombre del rol
            <InputControl
              value={roleForm.nombre}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="vendedor"
              required
            />
          </Field>
          <Field>
            Descripcion
            <TextAreaControl
              value={roleForm.descripcion}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Permisos comerciales para ventas e inventario."
            />
          </Field>
        </Fields>

        {(roleFormError || friendlyCreateRoleError) && (
          <StatusState
            kind={roleFormError ? 'error' : isSetupError(createRoleError) ? 'info' : 'error'}
            message={roleFormError ?? friendlyCreateRoleError ?? 'Error inesperado.'}
          />
        )}
        {createRoleStatus === 'success' && <StatusState kind="info" message="Rol creado correctamente." />}

        <ButtonsRow>
          <PrimaryButton type="submit" disabled={createRoleStatus === 'submitting'}>
            {createRoleStatus === 'submitting' ? 'Creando rol...' : 'Crear rol'}
          </PrimaryButton>
        </ButtonsRow>
      </FormGrid>

      <SectionHeader>
        <SectionTitle>Completar usuarios pendientes</SectionTitle>
        <SectionMeta>{pendingUsers.length} pendientes</SectionMeta>
      </SectionHeader>
      {pendingUsers.length === 0 ? (
        <StatusState kind="empty" message="No hay usuarios pendientes por completar." />
      ) : (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Email</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={`pending-${user.id}`}>
                  <td>{user.email ?? 'Sin email'}</td>
                  <td>
                    <Tag $tone="warn">Perfil incompleto</Tag>
                  </td>
                  <td>
                    <GhostButton type="button" onClick={() => handleUsePendingUser(user)}>
                      Completar en formulario
                    </GhostButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}

      <SectionHeader>
        <SectionTitle>Crear o completar usuario</SectionTitle>
      </SectionHeader>
      <FormGrid onSubmit={handleCreateUser}>
        <Fields>
          <Field>
            Usuario existente (opcional)
            <SelectControl
              value={userForm.targetAuthUserId}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  targetAuthUserId: event.target.value,
                  password: '',
                  email:
                    pendingUsers.find((user) => user.id === event.target.value)?.email ??
                    (event.target.value ? '' : prev.email),
                }))
              }
            >
              <option value="">Crear usuario nuevo</option>
              {pendingUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email ?? user.id}
                </option>
              ))}
            </SelectControl>
          </Field>

          <Field>
            Correo
            <InputControl
              type="email"
              value={selectedPendingUser?.email ?? userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              readOnly={isCompletingExisting}
              required
            />
          </Field>

          {!isCompletingExisting && (
            <Field>
              Contrasena inicial
              <InputControl
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Contrasena segura"
                required
              />
            </Field>
          )}

          <Field>
            Tipo documento
            <InputControl
              value={userForm.tipoDocumento}
              onChange={(event) => setUserForm((prev) => ({ ...prev, tipoDocumento: event.target.value }))}
              placeholder="CC"
            />
          </Field>
          <Field>
            Numero documento
            <InputControl
              value={userForm.numeroDocumento}
              onChange={(event) => setUserForm((prev) => ({ ...prev, numeroDocumento: event.target.value }))}
              required
            />
          </Field>
          <Field>
            Nombres
            <InputControl
              value={userForm.nombres}
              onChange={(event) => setUserForm((prev) => ({ ...prev, nombres: event.target.value }))}
              required
            />
          </Field>
          <Field>
            Apellidos
            <InputControl
              value={userForm.apellidos}
              onChange={(event) => setUserForm((prev) => ({ ...prev, apellidos: event.target.value }))}
              required
            />
          </Field>
          <Field>
            Rol inicial
            <SelectControl
              value={userForm.rolId}
              onChange={(event) => setUserForm((prev) => ({ ...prev, rolId: event.target.value }))}
              required
            >
              <option value="">Selecciona un rol</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </SelectControl>
          </Field>
        </Fields>

        {(userFormError || friendlyCreateUserError) && (
          <StatusState
            kind={userFormError ? 'error' : isSetupError(createUserError) ? 'info' : 'error'}
            message={userFormError ?? friendlyCreateUserError ?? 'Error inesperado.'}
          />
        )}

        <StatusState
          kind="info"
          message={
            isCompletingExisting
              ? 'Estas completando datos faltantes de un usuario ya existente en Authentication.'
              : 'La creacion es automatica: genera el usuario en Authentication y lo vincula a identidad.'
          }
        />

        {createUserStatus === 'success' && <StatusState kind="info" message="Usuario guardado correctamente." />}

        <ButtonsRow>
          <PrimaryButton type="submit" disabled={createUserStatus === 'submitting'}>
            {createUserStatus === 'submitting' ? 'Guardando usuario...' : 'Guardar usuario'}
          </PrimaryButton>
          <GhostButton type="button" onClick={() => setUserForm(EMPTY_USER_FORM)}>
            Limpiar formulario
          </GhostButton>
          <GhostButton type="button" onClick={() => reload()}>
            Actualizar usuarios
          </GhostButton>
        </ButtonsRow>
      </FormGrid>

      {status === 'loading' && <StatusState kind="loading" message="Cargando usuarios y roles..." />}
      {status === 'error' && (
        <StatusState
          kind={isSetupError(error) ? 'info' : 'error'}
          message={friendlyLoadError ?? 'Error inesperado.'}
        />
      )}
      {(friendlyAssignError || assignStatus === 'success') && (
        <StatusState
          kind={friendlyAssignError ? 'error' : 'info'}
          message={friendlyAssignError ?? 'Rol asignado correctamente.'}
        />
      )}

      {status === 'success' && users.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Documento</th>
                <th>Estado</th>
                <th>Rol</th>
                <th>Perfil</th>
                <th>Asignar rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{getDisplayName(user)}</td>
                  <td>{user.email ?? 'Sin email'}</td>
                  <td>{user.numeroDocumento}</td>
                  <td>
                    <Tag $tone={user.estado ? 'ok' : 'off'}>{user.estado ? 'Activo' : 'Inactivo'}</Tag>
                  </td>
                  <td>{user.rolNombre ?? 'Sin rol'}</td>
                  <td>
                    <Tag $tone={user.profileComplete ? 'ok' : 'warn'}>
                      {user.profileComplete ? 'Completo' : 'Pendiente'}
                    </Tag>
                  </td>
                  <td>
                    <ButtonsRow>
                      <SelectControl
                        value={roleDraftByUser[user.id] ?? user.rolId ?? ''}
                        onChange={(event) =>
                          setRoleDraftByUser((prev) => ({ ...prev, [user.id]: event.target.value }))
                        }
                        disabled={!user.profileComplete}
                      >
                        <option value="">Selecciona un rol</option>
                        {roleOptions.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </SelectControl>
                      <GhostButton
                        type="button"
                        onClick={() => handleAssignRole(user.id, user.rolId)}
                        disabled={assignStatus === 'submitting' || !user.profileComplete}
                      >
                        Asignar
                      </GhostButton>
                    </ButtonsRow>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </SectionCard>
  );
}
