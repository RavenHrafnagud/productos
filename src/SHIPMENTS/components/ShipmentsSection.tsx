/**
 * Seccion de envios.
 * Registra y controla envios por tienda/directo con rentabilidad.
 */
import { FormEvent, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { Branch } from '../../BRANCHES/types/Branch';
import { useProducts } from '../../PRODUCTS/hooks/useProducts';
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
import {
  SectionCard,
  SectionHeader,
  SectionHeaderActions,
  SectionMeta,
  SectionTitle,
  SectionToggle,
} from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';
import { formatDateTime, formatMoney } from '../../SHARED/utils/format';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { sanitizeText, toPositiveNumber } from '../../SHARED/utils/validators';
import { useShipments } from '../hooks/useShipments';
import type { ShipmentDestinationType, ShipmentStatus } from '../types/Shipment';

interface ShipmentsSectionProps {
  branches: Branch[];
  refreshKey: number;
  onShipmentCreated?: () => void;
}

interface ShipmentForm {
  tipoDestino: ShipmentDestinationType;
  localId: string;
  destinatario: string;
  productoId: string;
  cantidad: string;
  precioUnitario: string;
  costoEnvio: string;
  comisionPorcentaje: string;
  estadoEnvio: ShipmentStatus;
  fechaEnvio: string;
  observaciones: string;
}

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
  box-shadow: 0 10px 18px rgba(36, 24, 60, 0.08);

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
`;

const PreviewPanel = styled.section`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: 12px;
  background: linear-gradient(145deg, #ffffff 0%, #f7f2ff 100%);
  box-shadow: 0 10px 20px rgba(36, 24, 60, 0.09);
`;

const FilterBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 8px 18px rgba(12, 26, 20, 0.06);
`;

const TableActions = styled.div.attrs({ className: 'no-wrap' })`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: nowrap;
`;

function toDatetimeLocal(date: Date | string) {
  const value = typeof date === 'string' ? new Date(date) : date;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  const hh = String(value.getHours()).padStart(2, '0');
  const mm = String(value.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

const EMPTY_FORM: ShipmentForm = {
  tipoDestino: 'TIENDA',
  localId: '',
  destinatario: '',
  productoId: '',
  cantidad: '',
  precioUnitario: '',
  costoEnvio: '0',
  comisionPorcentaje: '0',
  estadoEnvio: 'PENDIENTE',
  fechaEnvio: toDatetimeLocal(new Date()),
  observaciones: '',
};

export function ShipmentsSection({ branches, refreshKey, onShipmentCreated }: ShipmentsSectionProps) {
  const { products } = useProducts(refreshKey);
  const {
    shipments,
    status,
    error,
    createStatus,
    createError,
    updateStatus,
    updateError,
    addShipment,
    editShipmentStatus,
    reload,
  } = useShipments(refreshKey);
  const [form, setForm] = useState<ShipmentForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | ShipmentStatus>('TODOS');
  const [filterChannel, setFilterChannel] = useState<'TODOS' | 'TIENDA' | 'DIRECTO'>('TODOS');
  const [fromDate, setFromDate] = useState(() =>
    toDateInputValue(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)),
  );
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [statusDraftById, setStatusDraftById] = useState<Record<string, ShipmentStatus>>({});
  const [updatingShipmentId, setUpdatingShipmentId] = useState<string | null>(null);

  const friendlyLoadError = toFriendlySupabaseMessage(error, 'envios');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'envios');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'envios');

  const branchById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);
  const activeBranchOptions = useMemo(
    () => branches.filter((branch) => branch.estado).map((branch) => ({ id: branch.id, name: branch.nombre })),
    [branches],
  );
  const activeProducts = useMemo(
    () =>
      products
        .filter((product) => product.estado)
        .map((product) => ({ id: product.id, name: product.nombre, precio: product.precioVenta })),
    [products],
  );
  const productById = useMemo(() => new Map(activeProducts.map((product) => [product.id, product])), [activeProducts]);

  const preview = useMemo(() => {
    const cantidad = toPositiveNumber(form.cantidad) ?? 0;
    const precioUnitario = toPositiveNumber(form.precioUnitario) ?? 0;
    const costoEnvio = toPositiveNumber(form.costoEnvio) ?? 0;
    const comision = toPositiveNumber(form.comisionPorcentaje) ?? 0;
    const ingresoBruto = cantidad * precioUnitario;
    const comisionValor = (ingresoBruto * comision) / 100;
    const gananciaNeta = ingresoBruto - comisionValor - costoEnvio;
    return { costoEnvio, comision, ingresoBruto, comisionValor, gananciaNeta };
  }, [form.cantidad, form.comisionPorcentaje, form.costoEnvio, form.precioUnitario]);
  const isStoreDestination = form.tipoDestino === 'TIENDA' || form.tipoDestino === 'LOCAL';

  const filteredShipments = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const fromTs = new Date(`${fromDate}T00:00:00`).getTime();
    const toTs = new Date(`${toDate}T23:59:59`).getTime();
    return shipments.filter((shipment) => {
      const shipTs = new Date(shipment.fechaEnvio).getTime();
      if (shipTs < fromTs || shipTs > toTs) return false;
      if (filterStatus !== 'TODOS' && shipment.estadoEnvio !== filterStatus) return false;
      if (filterChannel !== 'TODOS' && shipment.canalVenta !== filterChannel) return false;
      if (!query) return true;

      const haystack = [
        shipment.destinatario,
        shipment.productoNombre,
        shipment.localNombre,
        shipment.tipoDestino,
        shipment.canalVenta,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filterChannel, filterStatus, fromDate, searchText, shipments, toDate]);

  const summary = useMemo(() => {
    const total = filteredShipments.length;
    const entregados = filteredShipments.filter((item) => item.estadoEnvio === 'ENTREGADO').length;
    const pendientes = filteredShipments.filter((item) => item.estadoEnvio === 'PENDIENTE').length;
    const enviados = filteredShipments.filter((item) => item.estadoEnvio === 'ENVIADO').length;
    const ingresoTotal = filteredShipments.reduce((acc, item) => acc + item.ingresoBruto, 0);
    const costoTotal = filteredShipments.reduce((acc, item) => acc + item.costoEnvio, 0);
    const comisionTotal = filteredShipments.reduce((acc, item) => acc + item.comisionValor, 0);
    const gananciaTotal = filteredShipments.reduce((acc, item) => acc + item.gananciaNeta, 0);
    return {
      total,
      entregados,
      pendientes,
      enviados,
      ingresoTotal,
      costoTotal,
      comisionTotal,
      gananciaTotal,
    };
  }, [filteredShipments]);

  const handleChangeDestination = (nextType: ShipmentDestinationType) => {
    setForm((prev) => {
      const mustUseStore = nextType === 'TIENDA' || nextType === 'LOCAL';
      const nextBranchId = prev.localId;
      const branchCommission = nextBranchId ? branchById.get(nextBranchId)?.porcentajeComision ?? 0 : 0;
      return {
        ...prev,
        tipoDestino: nextType,
        localId: nextBranchId,
        comisionPorcentaje: mustUseStore ? String(branchCommission) : '0',
      };
    });
  };

  const handleBranchChange = (branchId: string) => {
    const branch = branchById.get(branchId);
    setForm((prev) => ({
      ...prev,
      localId: branchId,
      comisionPorcentaje: String(branch?.porcentajeComision ?? 0),
    }));
  };

  const handleProductChange = (productId: string) => {
    const product = productById.get(productId);
    setForm((prev) => ({
      ...prev,
      productoId: productId,
      precioUnitario: product ? String(product.precio) : prev.precioUnitario,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const destinatario = sanitizeText(form.destinatario, 120);
    const cantidad = toPositiveNumber(form.cantidad);
    const precioUnitario = toPositiveNumber(form.precioUnitario);
    const costoEnvio = toPositiveNumber(form.costoEnvio);
    const comision = toPositiveNumber(form.comisionPorcentaje);
    const mustUseStore = form.tipoDestino === 'TIENDA' || form.tipoDestino === 'LOCAL';

    if (!destinatario) {
      setFormError('Debes indicar el destinatario del envio.');
      return;
    }
    if (!form.productoId || cantidad === null || cantidad <= 0) {
      setFormError('Selecciona un producto y define una cantidad mayor a cero.');
      return;
    }
    if (precioUnitario === null || costoEnvio === null || comision === null) {
      setFormError('Precio unitario, costo de envio y comision deben ser numericos.');
      return;
    }
    if (comision < 0 || comision > 100) {
      setFormError('La comision debe estar entre 0 y 100.');
      return;
    }
    if (!form.localId) {
      setFormError('Debes seleccionar una sucursal para mantener la trazabilidad del inventario.');
      return;
    }

    try {
      await addShipment({
        localId: form.localId,
        productoId: form.productoId,
        destinatario,
        tipoDestino: form.tipoDestino,
        canalVenta: form.tipoDestino === 'TIENDA' || form.tipoDestino === 'LOCAL' ? 'TIENDA' : 'DIRECTO',
        cantidad,
        precioUnitario,
        costoEnvio,
        comisionPorcentaje: comision,
        estadoEnvio: form.estadoEnvio,
        fechaEnvio: new Date(form.fechaEnvio).toISOString(),
        observaciones: sanitizeText(form.observaciones, 240),
      });
      setForm(EMPTY_FORM);
      onShipmentCreated?.();
    } catch {
      // Error visible por createError.
    }
  };

  const handleStatusDraftChange = (shipmentId: string, nextStatus: ShipmentStatus) => {
    setStatusDraftById((prev) => ({ ...prev, [shipmentId]: nextStatus }));
  };

  const handleApplyStatus = async (shipmentId: string, currentStatus: ShipmentStatus) => {
    const nextStatus = statusDraftById[shipmentId] ?? currentStatus;
    if (nextStatus === currentStatus) return;

    setUpdatingShipmentId(shipmentId);
    try {
      await editShipmentStatus({ shipmentId, estadoEnvio: nextStatus });
    } finally {
      setUpdatingShipmentId(null);
    }
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Envios</SectionTitle>
        <SectionHeaderActions>
          <SectionMeta>{filteredShipments.length} visibles / {shipments.length} registrados</SectionMeta>
          <SectionToggle type="button" onClick={() => setCollapsed((prev) => !prev)} aria-expanded={!collapsed}>
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </SectionToggle>
        </SectionHeaderActions>
      </SectionHeader>

      {!collapsed && (
        <>
          <SummaryGrid>
            <SummaryCard>
              <p>Total envios</p>
              <strong>{summary.total}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Pendientes / Enviados</p>
              <strong>
                {summary.pendientes} / {summary.enviados}
              </strong>
            </SummaryCard>
            <SummaryCard>
              <p>Entregados</p>
              <strong>{summary.entregados}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Ingreso bruto</p>
              <strong>{formatMoney(summary.ingresoTotal)}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Comisiones</p>
              <strong>{formatMoney(summary.comisionTotal)}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Costo envio</p>
              <strong>{formatMoney(summary.costoTotal)}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Ganancia neta</p>
              <strong>{formatMoney(summary.gananciaTotal)}</strong>
            </SummaryCard>
          </SummaryGrid>

          <FormGrid onSubmit={handleSubmit}>
            <Fields>
              <Field>
                Tipo de destino
                <SelectControl
                  value={form.tipoDestino}
                  onChange={(event) => handleChangeDestination(event.target.value as ShipmentDestinationType)}
                >
                  <option value="TIENDA">Tienda/sucursal</option>
                  <option value="CLIENTE">Cliente individual</option>
                  <option value="DISTRIBUIDOR">Distribuidor</option>
                  <option value="LOCAL">Otro local</option>
                </SelectControl>
              </Field>
              <Field>
                {isStoreDestination ? 'Sucursal destino' : 'Sucursal origen'}
                <SelectControl
                  value={form.localId}
                  onChange={(event) => handleBranchChange(event.target.value)}
                >
                  <option value="">
                    {isStoreDestination ? 'Selecciona sucursal destino' : 'Selecciona sucursal origen'}
                  </option>
                  {activeBranchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <Field>
                Destinatario
                <InputControl
                  value={form.destinatario}
                  onChange={(event) => setForm((prev) => ({ ...prev, destinatario: event.target.value }))}
                  placeholder="Ej: Libreria Aurora / Cliente Juan Perez"
                  required
                />
              </Field>
              <Field>
                Producto
                <SelectControl value={form.productoId} onChange={(event) => handleProductChange(event.target.value)}>
                  <option value="">Selecciona un producto</option>
                  {activeProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <Field>
                Cantidad
                <InputControl
                  inputMode="decimal"
                  value={form.cantidad}
                  onChange={(event) => setForm((prev) => ({ ...prev, cantidad: event.target.value }))}
                  placeholder="Ej: 10"
                  required
                />
              </Field>
              <Field>
                Precio unitario
                <InputControl
                  inputMode="decimal"
                  value={form.precioUnitario}
                  readOnly
                  title="Se define automaticamente segun el producto seleccionado."
                  placeholder="Ej: 90000"
                  required
                />
              </Field>
              <Field>
                Costo de envio
                <InputControl
                  inputMode="decimal"
                  value={form.costoEnvio}
                  onChange={(event) => setForm((prev) => ({ ...prev, costoEnvio: event.target.value }))}
                  placeholder="Ej: 15000"
                  required
                />
              </Field>
              <Field>
                Comision %
                <InputControl
                  inputMode="decimal"
                  value={form.comisionPorcentaje}
                  readOnly={isStoreDestination}
                  onChange={(event) => setForm((prev) => ({ ...prev, comisionPorcentaje: event.target.value }))}
                  placeholder="Ej: 25"
                  required
                />
              </Field>
              <Field>
                Estado del envio
                <SelectControl
                  value={form.estadoEnvio}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, estadoEnvio: event.target.value as ShipmentStatus }))
                  }
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="ENTREGADO">Entregado</option>
                </SelectControl>
              </Field>
              <Field>
                Fecha y hora de envio
                <InputControl
                  type="datetime-local"
                  value={form.fechaEnvio}
                  onChange={(event) => setForm((prev) => ({ ...prev, fechaEnvio: event.target.value }))}
                  required
                />
              </Field>
            </Fields>

            <Field>
              Observaciones (opcional)
              <TextAreaControl
                value={form.observaciones}
                onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                placeholder="Notas de logistica, guia, referencia o condiciones."
              />
            </Field>

            <PreviewPanel>
              <SummaryGrid>
                <SummaryCard>
                  <p>Ingreso bruto</p>
                  <strong>{formatMoney(preview.ingresoBruto)}</strong>
                </SummaryCard>
                <SummaryCard>
                  <p>Comision</p>
                  <strong>{formatMoney(preview.comisionValor)}</strong>
                </SummaryCard>
                <SummaryCard>
                  <p>Costo envio</p>
                  <strong>{formatMoney(preview.costoEnvio)}</strong>
                </SummaryCard>
                <SummaryCard>
                  <p>Ganancia neta estimada</p>
                  <strong>{formatMoney(preview.gananciaNeta)}</strong>
                </SummaryCard>
              </SummaryGrid>
            </PreviewPanel>

            {(formError || friendlyCreateError || friendlyUpdateError) && (
              <StatusState
                kind={formError ? 'error' : isSetupError(createError ?? updateError) ? 'info' : 'error'}
                message={formError ?? friendlyCreateError ?? friendlyUpdateError ?? 'Error inesperado.'}
              />
            )}
            {createStatus === 'success' && <StatusState kind="info" message="Envio registrado correctamente." />}
            {updateStatus === 'success' && <StatusState kind="info" message="Estado de envio actualizado." />}

            <ButtonsRow>
              <PrimaryButton type="submit" disabled={createStatus === 'submitting'}>
                {createStatus === 'submitting' ? 'Registrando envio...' : 'Registrar envio'}
              </PrimaryButton>
              <GhostButton type="button" onClick={() => setForm(EMPTY_FORM)}>
                Limpiar formulario
              </GhostButton>
              <GhostButton type="button" onClick={() => reload()}>
                Actualizar historial
              </GhostButton>
            </ButtonsRow>
          </FormGrid>

          <FilterBar>
            <Field>
              Buscar
              <InputControl
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Destino, producto, sucursal o canal"
              />
            </Field>
            <Field>
              Canal
              <SelectControl
                value={filterChannel}
                onChange={(event) => setFilterChannel(event.target.value as typeof filterChannel)}
              >
                <option value="TODOS">Todos</option>
                <option value="TIENDA">Tienda</option>
                <option value="DIRECTO">Directo</option>
              </SelectControl>
            </Field>
            <Field>
              Estado
              <SelectControl
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
              >
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="ENVIADO">Enviado</option>
                <option value="ENTREGADO">Entregado</option>
              </SelectControl>
            </Field>
            <Field>
              Desde
              <InputControl type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </Field>
            <Field>
              Hasta
              <InputControl type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </Field>
          </FilterBar>

          {status === 'loading' && <StatusState kind="loading" message="Cargando envios..." />}
          {status === 'error' && (
            <StatusState
              kind={isSetupError(error) ? 'info' : 'error'}
              message={friendlyLoadError ?? 'Error inesperado.'}
            />
          )}
          {status === 'success' && shipments.length === 0 && (
            <StatusState kind="empty" message="Aun no hay envios registrados." />
          )}
          {status === 'success' && shipments.length > 0 && filteredShipments.length === 0 && (
            <StatusState kind="empty" message="No hay envios que coincidan con tus filtros." />
          )}

          {status === 'success' && filteredShipments.length > 0 && (
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Canal</th>
                    <th>Destino</th>
                    <th className="hide-mobile">Sucursal</th>
                    <th>Producto</th>
                    <th className="num">Cant.</th>
                    <th className="hide-mobile num">Ingreso</th>
                    <th className="hide-mobile num">Costo envio</th>
                    <th className="hide-mobile num">Comision</th>
                    <th className="num">Neta</th>
                    <th>Estado</th>
                    <th className="actions">Gestion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => {
                    const nextStatus = statusDraftById[shipment.id] ?? shipment.estadoEnvio;
                    const statusChanged = nextStatus !== shipment.estadoEnvio;
                    return (
                      <tr key={shipment.id}>
                        <td>{formatDateTime(shipment.fechaEnvio)}</td>
                        <td>
                          <Tag $tone={shipment.canalVenta === 'TIENDA' ? 'warn' : 'off'}>{shipment.canalVenta}</Tag>
                        </td>
                        <td>{shipment.destinatario}</td>
                        <td className="hide-mobile">{shipment.localNombre}</td>
                        <td>{shipment.productoNombre}</td>
                        <td className="num">{shipment.cantidad.toFixed(2)}</td>
                        <td className="hide-mobile num">{formatMoney(shipment.ingresoBruto)}</td>
                        <td className="hide-mobile num">{formatMoney(shipment.costoEnvio)}</td>
                        <td className="hide-mobile num">{formatMoney(shipment.comisionValor)}</td>
                        <td className="num">{formatMoney(shipment.gananciaNeta)}</td>
                        <td>
                          <Tag
                            $tone={
                              shipment.estadoEnvio === 'ENTREGADO'
                                ? 'ok'
                                : shipment.estadoEnvio === 'ENVIADO'
                                  ? 'warn'
                                  : 'off'
                            }
                          >
                            {shipment.estadoEnvio}
                          </Tag>
                        </td>
                        <td className="actions">
                          <TableActions>
                            <SelectControl
                              className="fit-content"
                              value={nextStatus}
                              onChange={(event) =>
                                handleStatusDraftChange(shipment.id, event.target.value as ShipmentStatus)
                              }
                              disabled={updateStatus === 'submitting'}
                            >
                              <option value="PENDIENTE">Pendiente</option>
                              <option value="ENVIADO">Enviado</option>
                              <option value="ENTREGADO">Entregado</option>
                            </SelectControl>
                            <GhostButton
                              type="button"
                              onClick={() => handleApplyStatus(shipment.id, shipment.estadoEnvio)}
                              disabled={!statusChanged || updateStatus === 'submitting'}
                            >
                              {updateStatus === 'submitting' && updatingShipmentId === shipment.id
                                ? 'Aplicando...'
                                : 'Aplicar'}
                            </GhostButton>
                          </TableActions>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </DataTable>
            </TableWrap>
          )}
        </>
      )}
    </SectionCard>
  );
}
