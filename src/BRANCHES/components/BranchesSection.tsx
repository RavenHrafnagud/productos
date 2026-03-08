/**
 * Seccion de sucursales.
 * Permite crear sucursales con select dependiente: pais -> ciudad -> barrio/localidad.
 */
import { FormEvent, useMemo, useState } from 'react';
import { getCityOptions, getCountryOptions, getLocalityOptions } from '../data/locationCatalog';
import { formatDateTime } from '../../SHARED/utils/format';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { isValidEmail, sanitizeText } from '../../SHARED/utils/validators';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
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
} from '../../SHARED/ui/FormControls';
import { SectionCard, SectionHeader, SectionMeta, SectionTitle } from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';
import type { Branch, CreateBranchInput, UpdateBranchInput } from '../types/Branch';

interface BranchesSectionProps {
  branches: Branch[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  updateStatus: 'idle' | 'submitting' | 'success' | 'error';
  updateError: string | null;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  onCreateBranch: (input: CreateBranchInput) => Promise<void>;
  onUpdateBranch: (branchId: string, input: UpdateBranchInput) => Promise<void>;
  onDeleteBranch: (branchId: string) => Promise<void>;
  onReload: () => Promise<void>;
}

const EMPTY_FORM: CreateBranchInput = {
  nit: '',
  nombre: '',
  direccion: '',
  ciudad: '',
  localidad: '',
  pais: 'CO',
  telefono: '',
  email: '',
  estado: true,
};

export function BranchesSection({
  branches,
  status,
  error,
  createStatus,
  createError,
  updateStatus,
  updateError,
  deleteStatus,
  deleteError,
  onCreateBranch,
  onUpdateBranch,
  onDeleteBranch,
  onReload,
}: BranchesSectionProps) {
  const [form, setForm] = useState<CreateBranchInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'sucursales');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'sucursales');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'sucursales');
  const friendlyDeleteError = toFriendlySupabaseMessage(deleteError, 'sucursales');
  const isSubmitting = createStatus === 'submitting' || updateStatus === 'submitting';

  // Catalogos dependientes para experiencia guiada en ubicaciones.
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const cityOptions = useMemo(() => getCityOptions(form.pais), [form.pais]);
  const localityOptions = useMemo(
    () => getLocalityOptions(form.pais, form.ciudad),
    [form.pais, form.ciudad],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const payload: CreateBranchInput = {
      nit: sanitizeText(form.nit, 30),
      nombre: sanitizeText(form.nombre, 80),
      direccion: sanitizeText(form.direccion, 140),
      ciudad: sanitizeText(form.ciudad, 80),
      localidad: sanitizeText(form.localidad, 80),
      pais: sanitizeText(form.pais, 80) || 'CO',
      telefono: sanitizeText(form.telefono, 25),
      email: form.email.trim().toLowerCase(),
      estado: form.estado,
    };

    if (!payload.nit || !payload.nombre) {
      setFormError('Debes completar NIT y nombre de la sucursal.');
      return;
    }
    if (!payload.pais || !payload.ciudad || !payload.localidad) {
      setFormError('Debes seleccionar pais, ciudad y barrio/localidad.');
      return;
    }
    if (payload.email && !isValidEmail(payload.email)) {
      setFormError('El correo de la sucursal no es valido.');
      return;
    }

    try {
      if (editingBranchId) {
        await onUpdateBranch(editingBranchId, payload);
        setEditingBranchId(null);
      } else {
        await onCreateBranch(payload);
      }
      setForm(EMPTY_FORM);
    } catch {
      // El detalle se muestra en createError/updateError.
    }
  };

  const handleStartEditBranch = (branch: Branch) => {
    setFormError(null);
    setEditingBranchId(branch.id);
    setForm({
      nit: branch.nit,
      nombre: branch.nombre,
      direccion: branch.direccion ?? '',
      ciudad: branch.ciudad ?? '',
      localidad: branch.localidad ?? '',
      pais: branch.pais,
      telefono: branch.telefono ?? '',
      email: branch.email ?? '',
      estado: branch.estado,
    });
  };

  const handleCancelEdit = () => {
    setEditingBranchId(null);
    setFormError(null);
    setForm(EMPTY_FORM);
  };

  const handleDeleteBranch = async (branch: Branch) => {
    const confirmation = window.confirm(
      `Vas a eliminar la sucursal "${branch.nombre}". Esta accion no se puede deshacer. Deseas continuar?`,
    );
    if (!confirmation) return;

    setDeletingBranchId(branch.id);
    try {
      await onDeleteBranch(branch.id);
      if (editingBranchId === branch.id) {
        handleCancelEdit();
      }
    } finally {
      setDeletingBranchId(null);
    }
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Sucursales</SectionTitle>
        <SectionMeta>{branches.length} registradas</SectionMeta>
      </SectionHeader>

      <FormGrid onSubmit={handleSubmit}>
        <Fields>
          <Field>
            NIT
            <InputControl
              value={form.nit}
              onChange={(event) => setForm((prev) => ({ ...prev, nit: event.target.value }))}
              placeholder="900123456-7"
              required
            />
          </Field>
          <Field>
            Nombre comercial
            <InputControl
              value={form.nombre}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="Sede Centro"
              required
            />
          </Field>
          <Field>
            Pais
            <SelectControl
              value={form.pais}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  pais: event.target.value,
                  ciudad: '',
                  localidad: '',
                }))
              }
            >
              <option value="">Selecciona un pais</option>
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field>
            Ciudad
            <SelectControl
              value={form.ciudad}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  ciudad: event.target.value,
                  localidad: '',
                }))
              }
              disabled={!form.pais}
            >
              <option value="">{form.pais ? 'Selecciona una ciudad' : 'Primero selecciona un pais'}</option>
              {cityOptions.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field>
            Barrio o Localidad
            <SelectControl
              value={form.localidad}
              onChange={(event) => setForm((prev) => ({ ...prev, localidad: event.target.value }))}
              disabled={!form.ciudad}
            >
              <option value="">{form.ciudad ? 'Selecciona una localidad' : 'Primero selecciona una ciudad'}</option>
              {localityOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectControl>
          </Field>
          <Field>
            Telefono
            <InputControl
              value={form.telefono}
              onChange={(event) => setForm((prev) => ({ ...prev, telefono: event.target.value }))}
              placeholder="+57 300 000 0000"
            />
          </Field>
          <Field>
            Correo de sucursal
            <InputControl
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="sucursal@empresa.com"
            />
          </Field>
          <Field>
            Direccion
            <InputControl
              value={form.direccion}
              onChange={(event) => setForm((prev) => ({ ...prev, direccion: event.target.value }))}
              placeholder="Cra 10 # 20-30"
            />
          </Field>
          <Field>
            Estado
            <SelectControl
              value={form.estado ? 'ACTIVO' : 'INACTIVO'}
              style={{ color: form.estado ? '#1d6046' : '#5d636a' }}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  estado: event.target.value === 'ACTIVO',
                }))
              }
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </SelectControl>
          </Field>
        </Fields>

        {(formError || friendlyCreateError) && (
          <StatusState
            kind={formError ? 'error' : isSetupError(createError) ? 'info' : 'error'}
            message={formError ?? friendlyCreateError ?? 'Error inesperado.'}
          />
        )}
        {friendlyUpdateError && (
          <StatusState
            kind={isSetupError(updateError) ? 'info' : 'error'}
            message={friendlyUpdateError}
          />
        )}
        {createStatus === 'success' && <StatusState kind="info" message="Sucursal creada correctamente." />}
        {updateStatus === 'success' && <StatusState kind="info" message="Sucursal actualizada correctamente." />}
        {(friendlyDeleteError || deleteStatus === 'success') && (
          <StatusState
            kind={friendlyDeleteError ? 'error' : 'info'}
            message={friendlyDeleteError ?? 'Sucursal eliminada correctamente.'}
          />
        )}

        <ButtonsRow>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : editingBranchId ? 'Guardar cambios' : 'Registrar sucursal'}
          </PrimaryButton>
          {editingBranchId && (
            <GhostButton type="button" onClick={handleCancelEdit}>
              Cancelar edicion
            </GhostButton>
          )}
          <GhostButton type="button" onClick={() => onReload()}>
            Actualizar listado
          </GhostButton>
        </ButtonsRow>
      </FormGrid>

      <Divider />

      {status === 'loading' && <StatusState kind="loading" message="Cargando sucursales..." />}
      {status === 'error' && (
        <StatusState
          kind={isSetupError(error) ? 'info' : 'error'}
          message={friendlyLoadError ?? 'Error inesperado.'}
        />
      )}
      {status === 'success' && branches.length === 0 && (
        <StatusState kind="empty" message="Primero crea tu primera sucursal usando el formulario." />
      )}

      {status === 'success' && branches.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>NIT</th>
                <th>Sucursal</th>
                <th>Pais</th>
                <th>Ciudad</th>
                <th>Barrio/Localidad</th>
                <th>Direccion</th>
                <th>Telefono</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Creada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td>{branch.nit}</td>
                  <td>{branch.nombre}</td>
                  <td>{branch.pais}</td>
                  <td>{branch.ciudad ?? 'Sin ciudad'}</td>
                  <td>{branch.localidad ?? 'Sin localidad'}</td>
                  <td>{branch.direccion ?? 'Sin direccion'}</td>
                  <td>{branch.telefono ?? 'Sin telefono'}</td>
                  <td>{branch.email ?? 'Sin email'}</td>
                  <td>
                    <Tag $tone={branch.estado ? 'ok' : 'off'}>
                      {branch.estado ? 'Activa' : 'Inactiva'}
                    </Tag>
                  </td>
                  <td>{formatDateTime(branch.createdAt)}</td>
                  <td>
                    <ButtonsRow>
                      <GhostButton
                        type="button"
                        onClick={() => handleStartEditBranch(branch)}
                        disabled={deleteStatus === 'submitting'}
                      >
                        Editar
                      </GhostButton>
                      <DangerButton
                        type="button"
                        onClick={() => handleDeleteBranch(branch)}
                        disabled={deleteStatus === 'submitting'}
                      >
                        {deleteStatus === 'submitting' && deletingBranchId === branch.id
                          ? 'Eliminando...'
                          : 'Eliminar'}
                      </DangerButton>
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
