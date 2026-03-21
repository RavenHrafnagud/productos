/**
 * Seccion de sucursales.
 * Permite crear sucursales con select dependiente: pais -> ciudad -> barrio/localidad.
 */
import { type ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { getCityCount, getCityOptions, getCountryOptions, getLocalityCount, getLocalityOptions } from '../data/locationCatalog';
import { uploadBranchRutPdf } from '../api/branchRepository';
import { formatDateTime } from '../../SHARED/utils/format';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { isValidEmail, sanitizeText, toPositiveNumber } from '../../SHARED/utils/validators';
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
import {
  SectionCard,
  SectionHeader,
  SectionHeaderActions,
  SectionMeta,
  SectionTitle,
  SectionToggle,
} from '../../SHARED/ui/SectionCard';
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
  rut: '',
  rutPdfUrl: '',
  porcentajeComision: 0,
  nombre: '',
  direccion: '',
  ciudad: '',
  localidad: '',
  pais: 'CO',
  telefono: '',
  email: '',
  estado: true,
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

const TableActions = styled.div.attrs({ className: 'no-wrap' })`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const FileInput = styled.input`
  display: none;
`;

const FieldHint = styled.small`
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.72rem;
`;

const CompactSearchInput = styled(InputControl)`
  padding: 7px 10px;
  font-size: 0.82rem;
  min-height: 34px;

  @media (max-width: 520px) {
    padding: 6px 9px;
    font-size: 0.78rem;
    min-height: 32px;
  }
`;

const CompactCountrySelect = styled(SelectControl)`
  padding: 7px 10px;
  font-size: 0.82rem;
  min-height: 34px;
  padding-right: 30px;
  background-position: right 9px center;

  @media (max-width: 520px) {
    padding: 6px 9px;
    font-size: 0.78rem;
    min-height: 32px;
    padding-right: 28px;
    background-position: right 8px center;
  }
`;

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
  const [rutUploadStatus, setRutUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [rutUploadError, setRutUploadError] = useState<string | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [cityQuery, setCityQuery] = useState('');
  const [localityQuery, setLocalityQuery] = useState('');
  const rutFileInputRef = useRef<HTMLInputElement | null>(null);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'sucursales');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'sucursales');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'sucursales');
  const friendlyDeleteError = toFriendlySupabaseMessage(deleteError, 'sucursales');
  const isSubmitting = createStatus === 'submitting' || updateStatus === 'submitting';

  // Catalogos dependientes para experiencia guiada en ubicaciones.
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const cityOptions = useMemo(() => getCityOptions(form.pais, cityQuery), [form.pais, cityQuery]);
  const cityTotal = useMemo(() => getCityCount(form.pais), [form.pais]);
  const localityOptions = useMemo(
    () => getLocalityOptions(form.pais, form.ciudad, localityQuery),
    [form.pais, form.ciudad, localityQuery],
  );
  const localityTotal = useMemo(() => getLocalityCount(form.pais, form.ciudad), [form.pais, form.ciudad]);
  const cityHasMore = cityTotal > cityOptions.length;
  const localityHasMore = localityTotal > localityOptions.length;
  const summary = useMemo(() => {
    const total = branches.length;
    const active = branches.filter((branch) => branch.estado).length;
    const inactive = total - active;
    const withEmail = branches.filter((branch) => Boolean(branch.email)).length;
    return { total, active, inactive, withEmail };
  }, [branches]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const porcentajeComision = toPositiveNumber(String(form.porcentajeComision));
    const payload: CreateBranchInput = {
      nit: sanitizeText(form.nit, 30),
      rut: sanitizeText(form.rut, 40),
      rutPdfUrl: form.rutPdfUrl.trim(),
      porcentajeComision: porcentajeComision ?? -1,
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
      setFormError('Debes seleccionar pais, ciudad y barrio/municipio.');
      return;
    }
    if (porcentajeComision === null || porcentajeComision < 0 || porcentajeComision > 100) {
      setFormError('El porcentaje de comision debe estar entre 0 y 100.');
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
      setCityQuery('');
      setLocalityQuery('');
    } catch {
      // El detalle se muestra en createError/updateError.
    }
  };

  const handleStartEditBranch = (branch: Branch) => {
    setFormError(null);
    setRutUploadError(null);
    setRutUploadStatus('idle');
    setEditingBranchId(branch.id);
    setForm({
      nit: branch.nit,
      rut: branch.rut ?? '',
      rutPdfUrl: branch.rutPdfUrl ?? '',
      porcentajeComision: branch.porcentajeComision,
      nombre: branch.nombre,
      direccion: branch.direccion ?? '',
      ciudad: branch.ciudad ?? '',
      localidad: branch.localidad ?? '',
      pais: branch.pais,
      telefono: branch.telefono ?? '',
      email: branch.email ?? '',
      estado: branch.estado,
    });
    setCityQuery(branch.ciudad ?? '');
    setLocalityQuery(branch.localidad ?? '');
  };

  const handleCancelEdit = () => {
    setEditingBranchId(null);
    setFormError(null);
    setForm(EMPTY_FORM);
    setCityQuery('');
    setLocalityQuery('');
    setRutUploadStatus('idle');
    setRutUploadError(null);
  };

  const handleSelectRutFile = () => {
    rutFileInputRef.current?.click();
  };

  const handleUploadRutFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setRutUploadStatus('uploading');
    setRutUploadError(null);
    try {
      const reference = form.nit || form.nombre || 'sucursal';
      const publicUrl = await uploadBranchRutPdf(file, reference);
      setForm((prev) => ({ ...prev, rutPdfUrl: publicUrl }));
      setRutUploadStatus('idle');
    } catch (err) {
      setRutUploadStatus('error');
      setRutUploadError(err instanceof Error ? err.message : 'No se pudo subir el PDF RUT.');
    }
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
        <SectionHeaderActions>
          <SectionMeta>{branches.length} registradas</SectionMeta>
          <SectionToggle type="button" onClick={() => setCollapsed((prev) => !prev)} aria-expanded={!collapsed}>
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </SectionToggle>
        </SectionHeaderActions>
      </SectionHeader>
      {!collapsed && (
        <>
          <SummaryGrid>
            <SummaryCard>
              <p>Total registradas</p>
              <strong>{summary.total}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Activas</p>
              <strong>{summary.active}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Inactivas</p>
              <strong>{summary.inactive}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Con correo</p>
              <strong>{summary.withEmail}</strong>
            </SummaryCard>
          </SummaryGrid>

          <FormGrid onSubmit={handleSubmit}>
            <Fields>
              <Field>
                NIT
                <InputControl
                  value={form.nit}
                  onChange={(event) => setForm((prev) => ({ ...prev, nit: event.target.value }))}
                  placeholder="Ej: 900123456-7"
                  required
                />
              </Field>
              <Field>
                RUT
                <InputControl
                  value={form.rut}
                  onChange={(event) => setForm((prev) => ({ ...prev, rut: event.target.value }))}
                  placeholder="Ej: 900123456-7"
                />
              </Field>
              <Field>
                Nombre comercial
                <InputControl
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  placeholder="Ej: Sede Centro"
                  required
                />
              </Field>
              <Field>
                Porcentaje de comision
                <InputControl
                  inputMode="decimal"
                  value={Number.isFinite(form.porcentajeComision) ? String(form.porcentajeComision) : ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, porcentajeComision: Number(event.target.value) }))
                  }
                  placeholder="Ej: 25"
                  required
                />
              </Field>
              <Field>
                Pais
                <CompactCountrySelect
                  value={form.pais}
                  onChange={(event) => {
                    setCityQuery('');
                    setLocalityQuery('');
                    setForm((prev) => ({
                      ...prev,
                      pais: event.target.value,
                      ciudad: '',
                      localidad: '',
                    }));
                  }}
                >
                  <option value="">Selecciona un pais</option>
                  {countryOptions.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </CompactCountrySelect>
              </Field>
              <Field>
                Ciudad
                <CompactSearchInput
                  value={cityQuery}
                  onChange={(event) => setCityQuery(event.target.value)}
                  placeholder={form.pais ? 'Buscar ciudad...' : 'Primero selecciona un pais'}
                  disabled={!form.pais}
                />
                <SelectControl
                  value={form.ciudad}
                  onChange={(event) => {
                    setLocalityQuery('');
                    setForm((prev) => ({
                      ...prev,
                      ciudad: event.target.value,
                      localidad: '',
                    }));
                  }}
                  disabled={!form.pais}
                >
                  <option value="">{form.pais ? 'Selecciona una ciudad' : 'Primero selecciona un pais'}</option>
                  {cityOptions.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </SelectControl>
                <FieldHint>
                  {form.pais
                    ? `Mostrando ${cityOptions.length} de ${cityTotal} ciudades disponibles.${cityHasMore ? ' Escribe 2 letras para afinar y ver mas resultados.' : ''}`
                    : 'Selecciona un pais para cargar ciudades.'}
                </FieldHint>
              </Field>
              <Field>
                Barrio o Municipio
                <CompactSearchInput
                  value={localityQuery}
                  onChange={(event) => setLocalityQuery(event.target.value)}
                  placeholder={form.ciudad ? 'Buscar barrio o municipio...' : 'Primero selecciona una ciudad'}
                  disabled={!form.ciudad}
                />
                <SelectControl
                  value={form.localidad}
                  onChange={(event) => setForm((prev) => ({ ...prev, localidad: event.target.value }))}
                  disabled={!form.ciudad}
                >
                  <option value="">{form.ciudad ? 'Selecciona barrio o municipio' : 'Primero selecciona una ciudad'}</option>
                  {localityOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </SelectControl>
                <FieldHint>
                  {form.ciudad
                    ? `Mostrando ${localityOptions.length} de ${localityTotal} barrios/municipios disponibles.${localityHasMore ? ' Escribe 2 letras para afinar y ver mas resultados.' : ''}`
                    : 'Selecciona una ciudad para cargar barrios o municipios.'}
                </FieldHint>
              </Field>
              <Field>
                Telefono
                <InputControl
                  value={form.telefono}
                  onChange={(event) => setForm((prev) => ({ ...prev, telefono: event.target.value }))}
                  placeholder="Ej: +57 300 000 0000"
                />
              </Field>
              <Field>
                Correo de sucursal
                <InputControl
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Ej: sucursal@empresa.com"
                />
              </Field>
              <Field>
                Direccion
                <InputControl
                  value={form.direccion}
                  onChange={(event) => setForm((prev) => ({ ...prev, direccion: event.target.value }))}
                  placeholder="Ej: Cra 10 # 20-30"
                />
              </Field>
              <Field>
                Estado
                <SelectControl
                  value={form.estado ? 'ACTIVO' : 'INACTIVO'}
                  style={{ color: form.estado ? '#5a2f99' : '#5d636a' }}
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
              <Field>
                PDF RUT
                <ButtonsRow>
                  <GhostButton
                    type="button"
                    onClick={handleSelectRutFile}
                    disabled={rutUploadStatus === 'uploading'}
                  >
                    {rutUploadStatus === 'uploading' ? 'Subiendo PDF...' : 'Subir PDF RUT'}
                  </GhostButton>
                  {form.rutPdfUrl && (
                    <GhostButton type="button" as="a" href={form.rutPdfUrl} target="_blank" rel="noreferrer">
                      Ver PDF
                    </GhostButton>
                  )}
                </ButtonsRow>
                <FileInput
                  ref={rutFileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleUploadRutFile}
                />
              </Field>
            </Fields>

            {(formError || friendlyCreateError || rutUploadError) && (
              <StatusState
                kind={formError || rutUploadError ? 'error' : isSetupError(createError) ? 'info' : 'error'}
                message={formError ?? rutUploadError ?? friendlyCreateError ?? 'Error inesperado.'}
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
            <StatusState kind="empty" message="No hay sucursales registradas. Crea la primera con el formulario." />
          )}

          {status === 'success' && branches.length > 0 && (
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th className="hide-mobile">NIT</th>
                    <th className="hide-mobile">RUT</th>
                    <th>Sucursal</th>
                    <th className="hide-mobile">Pais</th>
                    <th>Ciudad</th>
                    <th className="hide-mobile">Barrio/Municipio</th>
                    <th className="num">Comision %</th>
                    <th className="hide-mobile">PDF RUT</th>
                    <th className="hide-mobile">Direccion</th>
                    <th className="hide-mobile">Telefono</th>
                    <th className="hide-mobile">Email</th>
                    <th>Estado</th>
                    <th className="hide-mobile">Creada</th>
                    <th className="actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <td className="hide-mobile">{branch.nit}</td>
                      <td className="hide-mobile">{branch.rut ?? 'Sin RUT'}</td>
                      <td>{branch.nombre}</td>
                      <td className="hide-mobile">{branch.pais}</td>
                      <td>{branch.ciudad ?? 'Sin ciudad'}</td>
                      <td className="hide-mobile">{branch.localidad ?? 'Sin localidad'}</td>
                      <td className="num">{branch.porcentajeComision.toFixed(2)}%</td>
                      <td className="hide-mobile">
                        {branch.rutPdfUrl ? (
                          <GhostButton as="a" href={branch.rutPdfUrl} target="_blank" rel="noreferrer">
                            Ver PDF
                          </GhostButton>
                        ) : (
                          'Sin PDF'
                        )}
                      </td>
                      <td className="hide-mobile">{branch.direccion ?? 'Sin direccion'}</td>
                      <td className="hide-mobile">{branch.telefono ?? 'Sin telefono'}</td>
                      <td className="hide-mobile">{branch.email ?? 'Sin email'}</td>
                      <td>
                        <Tag $tone={branch.estado ? 'ok' : 'off'}>
                          {branch.estado ? 'Activa' : 'Inactiva'}
                        </Tag>
                      </td>
                      <td className="hide-mobile">{formatDateTime(branch.createdAt)}</td>
                      <td className="actions">
                        <TableActions>
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
                        </TableActions>
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
