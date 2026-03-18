/**
 * Seccion de usuarios y roles.
 * Incluye perfil del usuario autenticado y administracion integral de identidad.
 */
import { FormEvent, useMemo, useState } from 'react';
import styled from 'styled-components';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
import { getCountryOptions as getGeoCountryOptions } from '../../SHARED/constants/geo';
import {
  ButtonsRow,
  DangerButton,
  Divider,
  Field,
  Fields,
  FormGrid,
  GhostButton,
  InputControl,
  PrimaryButton,
  SelectControl,
  TextAreaControl,
} from '../../SHARED/ui/FormControls';
import {
  SectionCard,
  SectionHeader,
  SectionHeaderActions,
  SectionMeta,
  SectionTitle,
  SectionToggle,
} from '../../SHARED/ui/SectionCard';
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
  newPassword: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  rolId: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  pais: string;
}

const EMPTY_ROLE_FORM: RoleForm = { nombre: '', descripcion: '' };
const EMPTY_USER_FORM: UserForm = {
  targetAuthUserId: '',
  password: '',
  newPassword: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  email: '',
  rolId: '',
  telefono: '',
  direccion: '',
  ciudad: '',
  pais: 'CO',
};

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
`;

const SummaryCard = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 18px rgba(12, 26, 20, 0.06);

  p {
    margin: 0;
    font-size: 0.74rem;
    color: var(--text-muted);
  }

  strong {
    display: block;
    margin-top: 4px;
    font-size: 0.98rem;
  }

  @media (max-width: 520px) {
    padding: 7px 9px;

    p {
      font-size: 0.72rem;
    }

    strong {
      font-size: 0.92rem;
    }
  }
`;

const RoleAssignRow = styled.div.attrs({ className: 'no-wrap' })`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  justify-content: flex-end;

  select {
    width: auto;
    max-width: 240px;
    min-width: 120px;
    flex: 0 0 auto;
  }

  button {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  @media (max-width: 720px) {
    flex-wrap: wrap;

    select,
    button {
      width: 100%;
    }
  }
`;

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
    updateUserStatus,
    updateUserError,
    deleteUserStatus,
    deleteUserError,
    assignStatus,
    assignError,
    addRole,
    addUser,
    editUser,
    removeUser,
    assignRole,
    reload,
  } = useUserManagement(authUserId, refreshKey);
  const [roleForm, setRoleForm] = useState<RoleForm>(EMPTY_ROLE_FORM);
  const [userForm, setUserForm] = useState<UserForm>(EMPTY_USER_FORM);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [roleDraftByUser, setRoleDraftByUser] = useState<Record<string, string>>({});
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'usuarios');
  const friendlyCreateUserError = toFriendlySupabaseMessage(createUserError, 'usuarios');
  const friendlyCreateRoleError = toFriendlySupabaseMessage(createRoleError, 'usuarios');
  const friendlyUpdateUserError = toFriendlySupabaseMessage(updateUserError, 'usuarios');
  const friendlyDeleteUserError = toFriendlySupabaseMessage(deleteUserError, 'usuarios');
  const friendlyAssignError = toFriendlySupabaseMessage(assignError, 'usuarios');

  const roleOptions = useMemo(
    () => roles.map((role) => ({ id: role.id, name: role.nombre })),
    [roles],
  );
  const pendingUsers = useMemo(() => users.filter((user) => !user.profileComplete), [users]);
  const summary = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.estado).length;
    const pending = pendingUsers.length;
    const rolesCount = roles.length;
    return { total, active, pending, rolesCount };
  }, [pendingUsers.length, roles.length, users]);
  const countryOptions = useMemo(
    () =>
      getGeoCountryOptions()
        .map((country) => ({
          code: country.value,
          label: `${country.label} (${country.value})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  );
  const selectedPendingUser = useMemo(
    () => pendingUsers.find((user) => user.id === userForm.targetAuthUserId) ?? null,
    [pendingUsers, userForm.targetAuthUserId],
  );
  const isCompletingExisting = Boolean(userForm.targetAuthUserId);
  const isEditingExisting = Boolean(editingUserId);

  const normalizeEmailInput = (value: string) => value.trim().toLowerCase();

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
    setEditingUserId(null);
    setUserForm({
      targetAuthUserId: user.id,
      password: '',
      newPassword: '',
      tipoDocumento: user.tipoDocumento ?? 'CC',
      numeroDocumento: user.numeroDocumento === 'Sin documento' ? '' : user.numeroDocumento,
      nombres: /^sin nombres$/i.test(user.nombres) ? '' : user.nombres,
      apellidos: /^sin apellidos$/i.test(user.apellidos) ? '' : user.apellidos,
      email: user.email ?? '',
      rolId: user.rolId ?? '',
      telefono: user.telefono ?? '',
      direccion: user.direccion ?? '',
      ciudad: user.ciudad ?? '',
      pais: user.pais ?? 'CO',
    });
  };

  const handleEditExistingUser = (user: UserRecord) => {
    setUserFormError(null);
    setEditingUserId(user.id);
    setUserForm({
      targetAuthUserId: '',
      password: '',
      newPassword: '',
      tipoDocumento: user.tipoDocumento ?? 'CC',
      numeroDocumento: user.numeroDocumento === 'Sin documento' ? '' : user.numeroDocumento,
      nombres: /^sin nombres$/i.test(user.nombres) ? '' : user.nombres,
      apellidos: /^sin apellidos$/i.test(user.apellidos) ? '' : user.apellidos,
      email: user.email ?? '',
      rolId: user.rolId ?? '',
      telefono: user.telefono ?? '',
      direccion: user.direccion ?? '',
      ciudad: user.ciudad ?? '',
      pais: user.pais ?? 'CO',
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
    const fallbackEmail = normalizeEmailInput(userForm.email);
    const email = normalizeEmailInput(selectedPendingUser?.email ?? fallbackEmail);
    const password = userForm.password.trim();
    const newPassword = userForm.newPassword.trim();
    const telefono = sanitizeText(userForm.telefono, 40);
    const direccion = sanitizeText(userForm.direccion, 120);
    const ciudad = sanitizeText(userForm.ciudad, 60);
    const pais = sanitizeText(userForm.pais, 40) || 'CO';

    if (!numeroDocumento || !nombres || !apellidos) {
      setUserFormError('Documento, nombres y apellidos son obligatorios.');
      return;
    }
    if (!isEditingExisting && !rolId) {
      setUserFormError('Debes seleccionar un rol.');
      return;
    }
    if (!isEditingExisting && (!email || !isValidEmail(email))) {
      setUserFormError('El correo del usuario no es valido.');
      return;
    }
    if (!isCompletingExisting && !isEditingExisting && !isStrongPassword(password)) {
      setUserFormError(
        'La contrasena debe tener minimo 12 caracteres, una mayuscula, una minuscula, un numero y un simbolo.',
      );
      return;
    }
    if (isEditingExisting && newPassword && !isStrongPassword(newPassword)) {
      setUserFormError(
        'La nueva contrasena debe tener minimo 12 caracteres, una mayuscula, una minuscula, un numero y un simbolo.',
      );
      return;
    }

    try {
      if (isEditingExisting) {
        await editUser({
          authUserId: editingUserId ?? '',
          tipoDocumento,
          numeroDocumento,
          nombres,
          apellidos,
          telefono,
          direccion,
          ciudad,
          pais,
          password: newPassword || undefined,
        });
      } else {
        await addUser({
          authUserId: isCompletingExisting ? userForm.targetAuthUserId : undefined,
          password: isCompletingExisting ? '' : password,
          tipoDocumento,
          numeroDocumento,
          nombres,
          apellidos,
          email,
          rolId,
          telefono,
          direccion,
          ciudad,
          pais,
        });
      }
      setUserForm(EMPTY_USER_FORM);
      setEditingUserId(null);
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

  const handleDeleteUser = async (user: UserRecord) => {
    if (user.id === authUserId) return;
    const name = getDisplayName(user);
    const confirmed = window.confirm(
      `Eliminar usuario ${name}?\nEsta accion elimina Auth, identidad y sus ventas/movimientos asociados.`,
    );
    if (!confirmed) return;
    try {
      setDeletingUserId(user.id);
      await removeUser({ authUserId: user.id });
    } catch {
      // El detalle se muestra en deleteUserError.
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Usuarios y roles</SectionTitle>
        <SectionHeaderActions>
          <SectionMeta>{users.length} cuentas detectadas</SectionMeta>
          <SectionToggle type="button" onClick={() => setCollapsed((prev) => !prev)} aria-expanded={!collapsed}>
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </SectionToggle>
        </SectionHeaderActions>
      </SectionHeader>
      {!collapsed && (
        <>
          <SummaryGrid>
            <SummaryCard>
              <p>Total de cuentas</p>
              <strong>{summary.total}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Usuarios activos</p>
              <strong>{summary.active}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Perfiles pendientes</p>
              <strong>{summary.pending}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Roles disponibles</p>
              <strong>{summary.rolesCount}</strong>
            </SummaryCard>
          </SummaryGrid>

      {profile ? (
        <StatusState
          kind="info"
          message={`Sesion activa: ${profile.nombres} ${profile.apellidos} | Rol: ${profile.rolNombre ?? 'Sin rol'} | Estado: ${profile.estado ? 'Activo' : 'Inactivo'}`}
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
              placeholder="Ej: vendedor"
              required
            />
          </Field>
          <Field>
            Descripcion
            <TextAreaControl
              value={roleForm.descripcion}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, descripcion: event.target.value }))}
              placeholder="Ej: Permisos comerciales para ventas e inventario."
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

      <Divider />

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

      <Divider />

      <SectionHeader>
        <SectionTitle>Crear o completar usuario</SectionTitle>
      </SectionHeader>
      <FormGrid onSubmit={handleCreateUser}>
        <Fields>
          <Field>
            Correo
            <InputControl
              type="email"
              value={selectedPendingUser?.email ?? userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
              readOnly={isCompletingExisting || isEditingExisting}
              required
            />
          </Field>

          {!isCompletingExisting && !isEditingExisting && (
            <Field>
              Contrasena inicial
              <InputControl
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Ej: Contrasena segura"
                required
              />
            </Field>
          )}
          {isEditingExisting && (
            <Field>
              Nueva contrasena (opcional)
              <InputControl
                type="password"
                value={userForm.newPassword}
                onChange={(event) => setUserForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                placeholder="Ej: Nueva contrasena segura"
              />
            </Field>
          )}

          <Field>
            Tipo documento
            <SelectControl
              value={userForm.tipoDocumento}
              onChange={(event) => setUserForm((prev) => ({ ...prev, tipoDocumento: event.target.value }))}
            >
              <option value="CC">CC</option>
              <option value="TI">TI</option>
              <option value="CE">CE</option>
              <option value="PAS">PAS</option>
              <option value="NIT">NIT</option>
              <option value="RC">RC</option>
              <option value="PEP">PEP</option>
            </SelectControl>
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
              required={!isEditingExisting}
              disabled={isEditingExisting}
            >
              <option value="">Selecciona un rol</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field>
            Telefono
            <InputControl
              value={userForm.telefono}
              onChange={(event) => setUserForm((prev) => ({ ...prev, telefono: event.target.value }))}
              placeholder="Ej: +57 300 000 0000"
            />
          </Field>
          <Field>
            Direccion
            <InputControl
              value={userForm.direccion}
              onChange={(event) => setUserForm((prev) => ({ ...prev, direccion: event.target.value }))}
              placeholder="Ej: Cra 10 # 20-30"
            />
          </Field>
          <Field>
            Ciudad
            <InputControl
              value={userForm.ciudad}
              onChange={(event) => setUserForm((prev) => ({ ...prev, ciudad: event.target.value }))}
              placeholder="Ej: Bogota"
            />
          </Field>
          <Field>
            Pais
            <SelectControl
              value={userForm.pais}
              onChange={(event) => setUserForm((prev) => ({ ...prev, pais: event.target.value }))}
            >
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </SelectControl>
          </Field>
        </Fields>

        {(userFormError || friendlyCreateUserError || friendlyUpdateUserError) && (
          <StatusState
            kind={userFormError ? 'error' : isSetupError(createUserError ?? updateUserError) ? 'info' : 'error'}
            message={userFormError ?? friendlyCreateUserError ?? friendlyUpdateUserError ?? 'Error inesperado.'}
          />
        )}

        {/* Mensajes informativos de flujo removidos por solicitud */}

        {createUserStatus === 'success' && !isEditingExisting && (
          <StatusState kind="info" message="Usuario guardado correctamente." />
        )}
        {updateUserStatus === 'success' && (
          <StatusState kind="info" message="Usuario actualizado correctamente." />
        )}

        <ButtonsRow>
          <PrimaryButton
            type="submit"
            disabled={createUserStatus === 'submitting' || updateUserStatus === 'submitting'}
          >
            {isEditingExisting
              ? updateUserStatus === 'submitting'
                ? 'Actualizando usuario...'
                : 'Actualizar usuario'
              : createUserStatus === 'submitting'
                ? 'Guardando usuario...'
                : 'Guardar usuario'}
          </PrimaryButton>
          <GhostButton type="button" onClick={() => setUserForm(EMPTY_USER_FORM)}>
            Limpiar formulario
          </GhostButton>
          {isEditingExisting && (
            <GhostButton
              type="button"
              onClick={() => {
                setEditingUserId(null);
                setUserForm(EMPTY_USER_FORM);
              }}
            >
              Cancelar edicion
            </GhostButton>
          )}
          <GhostButton type="button" onClick={() => reload()}>
            Actualizar usuarios
          </GhostButton>
        </ButtonsRow>
      </FormGrid>

      <Divider />

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
      {(friendlyDeleteUserError || deleteUserStatus === 'success') && (
        <StatusState
          kind={friendlyDeleteUserError ? 'error' : 'info'}
          message={friendlyDeleteUserError ?? 'Usuario eliminado correctamente.'}
        />
      )}

      {status === 'success' && users.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th className="hide-mobile num">Documento</th>
                <th className="hide-mobile">Tipo</th>
                <th className="hide-mobile">Telefono</th>
                <th className="hide-mobile">Ciudad</th>
                <th className="hide-mobile">Pais</th>
                <th className="hide-mobile">Direccion</th>
                <th>Estado</th>
                <th>Rol</th>
                <th>Perfil</th>
                <th className="actions">Editar</th>
                <th className="actions">Asignar rol</th>
                <th className="actions">Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {getDisplayName(user)}
                    {user.id === authUserId && <Tag $tone="ok">Tu cuenta</Tag>}
                  </td>
                  <td>{user.email ?? 'Sin email'}</td>
                  <td className="hide-mobile num">{user.numeroDocumento}</td>
                  <td className="hide-mobile">{user.tipoDocumento ?? 'Sin tipo'}</td>
                  <td className="hide-mobile">{user.telefono ?? 'Sin telefono'}</td>
                  <td className="hide-mobile">{user.ciudad ?? 'Sin ciudad'}</td>
                  <td className="hide-mobile">{user.pais ?? 'Sin pais'}</td>
                  <td className="hide-mobile">{user.direccion ?? 'Sin direccion'}</td>
                  <td>
                    <Tag $tone={user.estado ? 'ok' : 'off'}>{user.estado ? 'Activo' : 'Inactivo'}</Tag>
                  </td>
                  <td>{user.rolNombre ?? 'Sin rol'}</td>
                  <td>
                    <Tag $tone={user.profileComplete ? 'ok' : 'warn'}>
                      {user.profileComplete ? 'Completo' : 'Pendiente'}
                    </Tag>
                  </td>
                  <td className="actions">
                    <GhostButton
                      type="button"
                      onClick={() => handleEditExistingUser(user)}
                      disabled={!user.profileComplete}
                    >
                      Editar
                    </GhostButton>
                  </td>
                  <td className="actions">
                    {user.id === authUserId ? (
                      <Tag $tone="off">No aplica</Tag>
                    ) : (
                      <RoleAssignRow>
                        <SelectControl
                          className="fit-content"
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
                      </RoleAssignRow>
                    )}
                  </td>
                  <td className="actions">
                    {user.id === authUserId ? (
                      <Tag $tone="off">No aplica</Tag>
                    ) : (
                      <DangerButton
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteUserStatus === 'submitting' || deletingUserId === user.id}
                      >
                        Eliminar
                      </DangerButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
        </>
      )}
    </SectionCard>
  );
}
