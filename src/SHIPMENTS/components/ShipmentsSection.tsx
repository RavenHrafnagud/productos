/**
 * Seccion de envios.
 * Gestiona envios por sucursal o individuales con multiproducto.
 */
import { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { sanitizeText } from '../../SHARED/utils/validators';
import type { Warehouse } from '../../WAREHOUSES/types/Warehouse';
import {
  listPendingIndividualShipmentLines,
  listPendingIndividualShipmentTargets,
} from '../api/shipmentRepository';
import { useShipments } from '../hooks/useShipments';
import type {
  CreateShipmentLineInput,
  PendingIndividualShipmentTarget,
  ShipmentStatus,
  ShipmentType,
} from '../types/Shipment';

interface ShipmentsSectionProps {
  branches: Branch[];
  warehouses: Warehouse[];
  refreshKey: number;
  onShipmentCreated?: () => void;
}

interface ShipmentForm {
  tipoEnvio: ShipmentType;
  almacenId: string;
  localId: string;
  pendingTargetRef: string;
  costoEnvioTotal: string;
  estadoEnvio: ShipmentStatus;
  fechaEnvio: string;
  observaciones: string;
}

interface ProductLineDraft {
  selected: boolean;
  cantidad: string;
  precioUnitario: number;
}

const ProductList = styled.div`
  display: grid;
  gap: 8px;
  max-height: 260px;
  overflow: auto;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 8px;
`;

const ProductRow = styled.label`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 100px 120px;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 8px;
  background: #fff;

  @media (max-width: 760px) {
    grid-template-columns: auto minmax(0, 1fr);

    .line-price,
    .line-qty {
      grid-column: 2;
    }
  }
`;

const TotalsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const TotalCard = styled.div`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 8px;
  background: rgba(255, 255, 255, 0.9);

  small {
    color: var(--text-muted);
  }

  strong {
    display: block;
    margin-top: 4px;
  }
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

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const EMPTY_FORM: ShipmentForm = {
  tipoEnvio: 'SUCURSAL',
  almacenId: '',
  localId: '',
  pendingTargetRef: '',
  costoEnvioTotal: '0',
  estadoEnvio: 'PENDIENTE',
  fechaEnvio: toDatetimeLocal(new Date()),
  observaciones: '',
};

export function ShipmentsSection({ branches, warehouses, refreshKey, onShipmentCreated }: ShipmentsSectionProps) {
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
  const [lineByProductId, setLineByProductId] = useState<Record<string, ProductLineDraft>>({});
  const [pendingTargets, setPendingTargets] = useState<PendingIndividualShipmentTarget[]>([]);
  const [pendingStatus, setPendingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [statusDraftById, setStatusDraftById] = useState<Record<string, ShipmentStatus>>({});
  const [updatingShipmentId, setUpdatingShipmentId] = useState<string | null>(null);

  const friendlyLoadError = toFriendlySupabaseMessage(error, 'envios');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'envios');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'envios');

  const activeWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.estado).map((warehouse) => ({ id: warehouse.id, name: warehouse.nombre })),
    [warehouses],
  );
  const activeBranches = useMemo(
    () => branches.filter((branch) => branch.estado).map((branch) => ({ id: branch.id, name: branch.nombre })),
    [branches],
  );
  const activeProducts = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        name: product.nombre,
        price: product.precioVenta,
      })),
    [products],
  );

  useEffect(() => {
    setLineByProductId((prev) => {
      const next: Record<string, ProductLineDraft> = {};
      for (const product of activeProducts) {
        next[product.id] =
          prev[product.id] ?? {
            selected: false,
            cantidad: '',
            precioUnitario: product.price,
          };
      }
      return next;
    });
  }, [activeProducts]);

  useEffect(() => {
    if (form.tipoEnvio !== 'INDIVIDUAL') return;
    setPendingStatus('loading');
    setPendingError(null);
    listPendingIndividualShipmentTargets()
      .then((rows) => {
        setPendingTargets(rows);
        setPendingStatus('success');
      })
      .catch((err) => {
        setPendingTargets([]);
        setPendingStatus('error');
        setPendingError(err instanceof Error ? err.message : 'No se pudieron cargar ventas pendientes de envio.');
      });
  }, [form.tipoEnvio, refreshKey]);

  useEffect(() => {
    if (form.tipoEnvio !== 'INDIVIDUAL' || !form.pendingTargetRef) return;

    listPendingIndividualShipmentLines(form.pendingTargetRef)
      .then((lines) => {
        setLineByProductId((prev) => {
          const next: Record<string, ProductLineDraft> = {};
          for (const [productId, draft] of Object.entries(prev)) {
            next[productId] = { ...draft, selected: false, cantidad: '' };
          }
          for (const line of lines) {
            next[line.productoId] = {
              selected: true,
              cantidad: String(line.cantidad),
              precioUnitario: line.precioUnitario,
            };
          }
          return next;
        });
      })
      .catch((err) => {
        setFormError(err instanceof Error ? err.message : 'No se pudieron cargar los productos de la venta.');
      });
  }, [form.pendingTargetRef, form.tipoEnvio]);

  const selectedPendingTarget = useMemo(
    () => pendingTargets.find((target) => target.referenciaGrupo === form.pendingTargetRef) ?? null,
    [form.pendingTargetRef, pendingTargets],
  );

  const selectedLines = useMemo(() => {
    const rows: CreateShipmentLineInput[] = [];
    for (const product of activeProducts) {
      const line = lineByProductId[product.id];
      if (!line?.selected) continue;
      const qty = toNumber(line.cantidad);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      rows.push({
        productoId: product.id,
        cantidad: qty,
        precioUnitario: line.precioUnitario || product.price,
      });
    }
    return rows;
  }, [activeProducts, lineByProductId]);

  const totals = useMemo(() => {
    const totalItems = selectedLines.length;
    const totalUnits = selectedLines.reduce((sum, line) => sum + line.cantidad, 0);
    const shippingCost = Math.max(0, toNumber(form.costoEnvioTotal));
    return { totalItems, totalUnits, shippingCost };
  }, [form.costoEnvioTotal, selectedLines]);

  const handleLineToggle = (productId: string, selected: boolean) => {
    if (form.tipoEnvio === 'INDIVIDUAL') return;
    setLineByProductId((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selected,
        cantidad: selected ? prev[productId]?.cantidad || '1' : '',
      },
    }));
  };

  const handleLineQty = (productId: string, cantidad: string) => {
    if (form.tipoEnvio === 'INDIVIDUAL') return;
    setLineByProductId((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        cantidad,
      },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.almacenId) {
      setFormError('Debes seleccionar almacen origen.');
      return;
    }

    if (selectedLines.length === 0) {
      setFormError('Debes seleccionar al menos un producto para el envio.');
      return;
    }

    if (form.tipoEnvio === 'SUCURSAL' && !form.localId) {
      setFormError('Debes seleccionar una sucursal destino.');
      return;
    }

    if (form.tipoEnvio === 'INDIVIDUAL' && !selectedPendingTarget) {
      setFormError('Debes seleccionar el destinatario desde ventas pendientes.');
      return;
    }

    try {
      await addShipment({
        tipoEnvio: form.tipoEnvio,
        almacenId: form.almacenId,
        localId: form.tipoEnvio === 'SUCURSAL' ? form.localId : null,
        destinatario:
          form.tipoEnvio === 'INDIVIDUAL'
            ? `${selectedPendingTarget?.clienteDocumento ?? ''} | ${selectedPendingTarget?.clienteNombre ?? ''}`
            : null,
        clienteDocumento: form.tipoEnvio === 'INDIVIDUAL' ? selectedPendingTarget?.clienteDocumento ?? null : null,
        clienteNombre: form.tipoEnvio === 'INDIVIDUAL' ? selectedPendingTarget?.clienteNombre ?? null : null,
        referenciaVentaGrupo: form.tipoEnvio === 'INDIVIDUAL' ? selectedPendingTarget?.referenciaGrupo ?? null : null,
        lineItems: selectedLines,
        costoEnvioTotal: totals.shippingCost,
        estadoEnvio: form.estadoEnvio,
        fechaEnvio: new Date(form.fechaEnvio).toISOString(),
        observaciones: sanitizeText(form.observaciones, 240),
      });

      setForm((prev) => ({
        ...EMPTY_FORM,
        tipoEnvio: prev.tipoEnvio,
        almacenId: prev.almacenId,
        fechaEnvio: toDatetimeLocal(new Date()),
      }));
      setLineByProductId((prev) => {
        const next: Record<string, ProductLineDraft> = {};
        for (const [productId, line] of Object.entries(prev)) {
          next[productId] = { ...line, selected: false, cantidad: '' };
        }
        return next;
      });
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

  const visibleShipments = shipments;

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Envios</SectionTitle>
        <SectionHeaderActions>
          <SectionMeta>{visibleShipments.length} registrados</SectionMeta>
          <SectionToggle type="button" onClick={() => setCollapsed((prev) => !prev)} aria-expanded={!collapsed}>
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </SectionToggle>
        </SectionHeaderActions>
      </SectionHeader>

      {!collapsed && (
        <>
          <FormGrid onSubmit={handleSubmit}>
            <Fields>
              <Field>
                Tipo de envio
                <SelectControl
                  value={form.tipoEnvio}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      tipoEnvio: event.target.value as ShipmentType,
                      localId: '',
                      pendingTargetRef: '',
                    }))
                  }
                >
                  <option value="SUCURSAL">Sucursales</option>
                  <option value="INDIVIDUAL">Individuales</option>
                </SelectControl>
              </Field>
              <Field>
                Almacen origen
                <SelectControl
                  value={form.almacenId}
                  onChange={(event) => setForm((prev) => ({ ...prev, almacenId: event.target.value }))}
                >
                  <option value="">Selecciona un almacen</option>
                  {activeWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </SelectControl>
              </Field>

              {form.tipoEnvio === 'SUCURSAL' && (
                <Field>
                  Sucursal destino
                  <SelectControl
                    value={form.localId}
                    onChange={(event) => setForm((prev) => ({ ...prev, localId: event.target.value }))}
                  >
                    <option value="">Selecciona sucursal</option>
                    {activeBranches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </SelectControl>
                </Field>
              )}

              {form.tipoEnvio === 'INDIVIDUAL' && (
                <Field>
                  Destinatario (desde ventas)
                  <SelectControl
                    value={form.pendingTargetRef}
                    onChange={(event) => setForm((prev) => ({ ...prev, pendingTargetRef: event.target.value }))}
                  >
                    <option value="">Selecciona cliente pendiente</option>
                    {pendingTargets.map((target) => (
                      <option key={target.referenciaGrupo} value={target.referenciaGrupo}>
                        {target.clienteDocumento} | {target.clienteNombre}
                      </option>
                    ))}
                  </SelectControl>
                  {pendingStatus === 'loading' && <StatusState kind="loading" message="Cargando destinatarios..." />}
                  {pendingStatus === 'error' && <StatusState kind="error" message={pendingError ?? 'Error de carga.'} />}
                </Field>
              )}

              <Field>
                Costo de envio total
                <InputControl
                  inputMode="decimal"
                  value={form.costoEnvioTotal}
                  onChange={(event) => setForm((prev) => ({ ...prev, costoEnvioTotal: event.target.value }))}
                />
              </Field>
              <Field>
                Estado
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
                Fecha y hora envio
                <InputControl
                  type="datetime-local"
                  value={form.fechaEnvio}
                  onChange={(event) => setForm((prev) => ({ ...prev, fechaEnvio: event.target.value }))}
                />
              </Field>
            </Fields>

            <Field>
              Productos
              <ProductList>
                {activeProducts.map((product) => {
                  const line = lineByProductId[product.id] ?? {
                    selected: false,
                    cantidad: '',
                    precioUnitario: product.price,
                  };
                  return (
                    <ProductRow key={product.id}>
                      <input
                        type="checkbox"
                        checked={line.selected}
                        onChange={(event) => handleLineToggle(product.id, event.target.checked)}
                        disabled={form.tipoEnvio === 'INDIVIDUAL'}
                      />
                      <div>{product.name}</div>
                      <div className="line-price">{formatMoney(line.precioUnitario)}</div>
                      <InputControl
                        className="line-qty"
                        inputMode="decimal"
                        value={line.cantidad}
                        onChange={(event) => handleLineQty(product.id, event.target.value)}
                        disabled={!line.selected || form.tipoEnvio === 'INDIVIDUAL'}
                      />
                    </ProductRow>
                  );
                })}
              </ProductList>
            </Field>

            <TotalsRow>
              <TotalCard>
                <small>Productos seleccionados</small>
                <strong>{totals.totalItems}</strong>
              </TotalCard>
              <TotalCard>
                <small>Unidades</small>
                <strong>{totals.totalUnits.toFixed(2)}</strong>
              </TotalCard>
              <TotalCard>
                <small>Costo total de envio</small>
                <strong>{formatMoney(totals.shippingCost)}</strong>
              </TotalCard>
            </TotalsRow>

            <Field>
              Observaciones (opcional)
              <TextAreaControl
                value={form.observaciones}
                onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
              />
            </Field>

            {(formError || friendlyCreateError || friendlyUpdateError) && (
              <StatusState
                kind={formError ? 'error' : isSetupError(createError ?? updateError) ? 'info' : 'error'}
                message={formError ?? friendlyCreateError ?? friendlyUpdateError ?? 'Error inesperado.'}
              />
            )}
            {createStatus === 'success' && <StatusState kind="info" message="Envio registrado correctamente." />}
            {updateStatus === 'success' && <StatusState kind="info" message="Estado actualizado." />}

            <ButtonsRow>
              <PrimaryButton type="submit" disabled={createStatus === 'submitting'}>
                {createStatus === 'submitting' ? 'Registrando...' : 'Registrar envio'}
              </PrimaryButton>
              <GhostButton type="button" onClick={() => reload()}>
                Actualizar historial
              </GhostButton>
            </ButtonsRow>
          </FormGrid>

          {status === 'loading' && <StatusState kind="loading" message="Cargando envios..." />}
          {status === 'error' && (
            <StatusState
              kind={isSetupError(error) ? 'info' : 'error'}
              message={friendlyLoadError ?? 'Error inesperado.'}
            />
          )}
          {status === 'success' && visibleShipments.length === 0 && (
            <StatusState kind="empty" message="Aun no hay envios registrados." />
          )}

          {status === 'success' && visibleShipments.length > 0 && (
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th className="hide-mobile">Almacen</th>
                    <th>Destino</th>
                    <th>Producto</th>
                    <th className="num">Cant.</th>
                    <th className="num">Costo envio</th>
                    <th>Estado</th>
                    <th className="actions">Gestion</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleShipments.map((shipment) => {
                    const nextStatus = statusDraftById[shipment.id] ?? shipment.estadoEnvio;
                    const statusChanged = nextStatus !== shipment.estadoEnvio;
                    return (
                      <tr key={shipment.id}>
                        <td>{formatDateTime(shipment.fechaEnvio)}</td>
                        <td>
                          <Tag $tone={shipment.tipoEnvio === 'SUCURSAL' ? 'warn' : 'off'}>{shipment.tipoEnvio}</Tag>
                        </td>
                        <td className="hide-mobile">{shipment.almacenNombre}</td>
                        <td>{shipment.tipoEnvio === 'SUCURSAL' ? shipment.localNombre : shipment.destinatario}</td>
                        <td>{shipment.productoNombre}</td>
                        <td className="num">{shipment.cantidad.toFixed(2)}</td>
                        <td className="num">{formatMoney(shipment.costoEnvio)}</td>
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
                          <ButtonsRow>
                            <SelectControl
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
                              {updateStatus === 'submitting' && updatingShipmentId === shipment.id ? 'Aplicando...' : 'Aplicar'}
                            </GhostButton>
                          </ButtonsRow>
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
