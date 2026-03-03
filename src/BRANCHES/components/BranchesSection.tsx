/**
 * Seccion de sucursales.
 * Permite crear nuevas sedes y seleccionar la sede de trabajo.
 */
import { FormEvent, useState } from 'react';
import { formatDateTime } from '../../SHARED/utils/format';
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
  selectedBranchId: string;
  branches: Branch[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  onSelectBranch: (branchId: string) => void;
  onCreateBranch: (input: CreateBranchInput) => Promise<void>;
  onReload: () => Promise<void>;
}

const EMPTY_FORM: CreateBranchInput = {
  nit: '',
  nombre: '',
  direccion: '',
  ciudad: '',
  pais: 'CO',
  telefono: '',
  email: '',
};

export function BranchesSection({
  selectedBranchId,
  branches,
  status,
  error,
  createStatus,
  createError,
  onSelectBranch,
  onCreateBranch,
  onReload,
}: BranchesSectionProps) {
  const [form, setForm] = useState<CreateBranchInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const payload: CreateBranchInput = {
      nit: sanitizeText(form.nit, 30),
      nombre: sanitizeText(form.nombre, 80),
      direccion: sanitizeText(form.direccion, 140),
      ciudad: sanitizeText(form.ciudad, 80),
      pais: sanitizeText(form.pais, 80) || 'CO',
      telefono: sanitizeText(form.telefono, 25),
      email: form.email.trim().toLowerCase(),
    };

    if (!payload.nit || !payload.nombre) {
      setFormError('Debes completar NIT y nombre de la sucursal.');
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
      // El mensaje de error real ya se muestra desde createError.
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
            Ciudad
            <InputControl
              value={form.ciudad}
              onChange={(event) => setForm((prev) => ({ ...prev, ciudad: event.target.value }))}
              placeholder="Bogota"
            />
          </Field>
          <Field>
            Pais
            <InputControl
              value={form.pais}
              onChange={(event) => setForm((prev) => ({ ...prev, pais: event.target.value }))}
              placeholder="CO"
            />
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
            Sede de trabajo actual
            <SelectControl
              value={selectedBranchId}
              onChange={(event) => onSelectBranch(event.target.value)}
            >
              <option value="">Selecciona una sede</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.nombre}
                </option>
              ))}
            </SelectControl>
          </Field>
        </Fields>

        {(formError || createError) && (
          <StatusState kind="error" message={formError ?? createError ?? 'Error inesperado.'} />
        )}
        {createStatus === 'success' && (
          <StatusState kind="info" message="Sucursal creada correctamente." />
        )}

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
      {status === 'error' && <StatusState kind="error" message={error ?? 'Error inesperado.'} />}
      {status === 'success' && branches.length === 0 && (
        <StatusState
          kind="empty"
          message="Aun no hay sucursales. Usa el formulario para registrar la primera."
        />
      )}

      {status === 'success' && branches.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Sucursal</th>
                <th>Ciudad</th>
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
