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
import type { Branch, CreateBranchInput } from '../types/Branch';

interface BranchesSectionProps {
  branches: Branch[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  onCreateBranch: (input: CreateBranchInput) => Promise<void>;
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
};

export function BranchesSection({
  branches,
  status,
  error,
  createStatus,
  createError,
  onCreateBranch,
  onReload,
}: BranchesSectionProps) {
  const [form, setForm] = useState<CreateBranchInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'sucursales');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'sucursales');

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
      await onCreateBranch(payload);
      setForm(EMPTY_FORM);
    } catch {
      // El detalle se muestra en createError.
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
        </Fields>

        {(formError || friendlyCreateError) && (
          <StatusState
            kind={formError ? 'error' : isSetupError(createError) ? 'info' : 'error'}
            message={formError ?? friendlyCreateError ?? 'Error inesperado.'}
          />
        )}
        {createStatus === 'success' && <StatusState kind="info" message="Sucursal creada correctamente." />}

        <ButtonsRow>
          <PrimaryButton type="submit" disabled={createStatus === 'submitting'}>
            {createStatus === 'submitting' ? 'Guardando...' : 'Registrar sucursal'}
          </PrimaryButton>
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
                <th>Sucursal</th>
                <th>Ciudad</th>
                <th>Barrio/Localidad</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Creada</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <td>{branch.nombre}</td>
                  <td>{branch.ciudad ?? 'Sin ciudad'}</td>
                  <td>{branch.localidad ?? 'Sin localidad'}</td>
                  <td>{branch.telefono ?? branch.email ?? 'Sin contacto'}</td>
                  <td>
                    <Tag $tone={branch.activo ? 'ok' : 'off'}>
                      {branch.activo ? 'Activa' : 'Inactiva'}
                    </Tag>
                  </td>
                  <td>{formatDateTime(branch.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </SectionCard>
  );
}
