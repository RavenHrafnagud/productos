/**
 * Seccion de ventas.
 * Permite registrar, editar, anular y consultar historial de ventas.
 */
import { FormEvent, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { Branch } from '../../BRANCHES/types/Branch';
import { useProducts } from '../../PRODUCTS/hooks/useProducts';
import { getWorldCurrencyOptions } from '../../SHARED/constants/currencies';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
import {
  ButtonsRow,
  DangerButton,
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
import { useSales } from '../hooks/useSales';
import type { SaleRecord } from '../types/Sale';

interface SalesSectionProps {
  branches: Branch[];
  refreshKey: number;
  onSaleCreated?: () => void;
}

interface SaleForm {
  localId: string;
  productoId: string;
  cantidad: string;
  precioUnitario: string;
  impuestos: string;
  descuentoPorcentaje: string;
  estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
  moneda: string;
  numeroComprobante: string;
  observaciones: string;
  fecha: string;
}

const TotalsPanel = styled.section`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: linear-gradient(140deg, #ffffff 0%, #f5efff 100%);
  padding: 14px;
  box-shadow: 0 12px 24px rgba(41, 28, 68, 0.1);
`;

const TotalsGrid = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const TotalCard = styled.article<{ $featured?: boolean }>`
  border: 1px solid ${({ $featured }) => ($featured ? '#b092e8' : 'var(--border-soft)')};
  border-radius: var(--radius-sm);
  background: ${({ $featured }) =>
    $featured ? 'linear-gradient(130deg, #efe4ff 0%, #ddccfb 100%)' : 'rgba(255, 255, 255, 0.9)'};
  padding: 12px;
  box-shadow: ${({ $featured }) => ($featured ? '0 10px 18px rgba(56, 36, 90, 0.18)' : 'none')};

  p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  strong {
    margin-top: 4px;
    display: block;
    font-size: 1rem;
    color: ${({ $featured }) => ($featured ? '#5a2d9c' : 'var(--text-main)')};
  }
`;

const FilterBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 8px 18px rgba(12, 26, 20, 0.06);
`;

const TableActions = styled.div.attrs({ className: 'no-wrap' })`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const HistoryPanel = styled.section`
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%);
  padding: 12px;
  box-shadow: 0 10px 20px rgba(41, 28, 68, 0.1);
`;

const SummaryStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
`;

const SummaryChip = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.9);

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
      font-size: 0.9rem;
    }
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

function resolveDiscountPercentage(subtotal: number, descuento: number) {
  if (subtotal <= 0) return 0;
  return (descuento / subtotal) * 100;
}

const EMPTY_FORM: SaleForm = {
  localId: '',
  productoId: '',
  cantidad: '',
  precioUnitario: '',
  impuestos: '0',
  descuentoPorcentaje: '0',
  estado: 'CONFIRMADA',
  moneda: 'COP',
  numeroComprobante: '',
  observaciones: '',
  fecha: toDatetimeLocal(new Date()),
};

export function SalesSection({ branches, refreshKey, onSaleCreated }: SalesSectionProps) {
  const { products } = useProducts(refreshKey);
  const {
    sales,
    status,
    error,
    createStatus,
    createError,
    updateStatus,
    updateError,
    annulStatus,
    annulError,
    reload,
    addSale,
    editSale,
    cancelSale,
  } = useSales(refreshKey);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [annullingSaleId, setAnnullingSaleId] = useState<string | null>(null);
  const [form, setForm] = useState<SaleForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODAS' | 'BORRADOR' | 'CONFIRMADA' | 'ANULADA'>('TODAS');
  const [collapsed, setCollapsed] = useState(false);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'ventas');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'ventas');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'ventas');
  const friendlyAnnulError = toFriendlySupabaseMessage(annulError, 'ventas');
  const isSubmitting = createStatus === 'submitting' || updateStatus === 'submitting';

  const currencyOptions = useMemo(() => getWorldCurrencyOptions('es'), []);
  const branchOptions = useMemo(
    () => branches.filter((branch) => branch.estado).map((branch) => ({ id: branch.id, name: branch.nombre })),
    [branches],
  );
  const productOptions = useMemo(
    () => products.filter((product) => product.estado).map((product) => ({ id: product.id, name: product.nombre })),
    [products],
  );
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const saleCalculation = useMemo(() => {
    const cantidad = toPositiveNumber(form.cantidad) ?? 0;
    const precioUnitario = toPositiveNumber(form.precioUnitario) ?? 0;
    const impuestos = toPositiveNumber(form.impuestos) ?? 0;
    const descuentoPorcentaje = toPositiveNumber(form.descuentoPorcentaje) ?? 0;
    const safeDescuentoPorcentaje = Math.min(Math.max(descuentoPorcentaje, 0), 100);
    const subtotal = cantidad * precioUnitario;
    const descuentoValor = subtotal * (safeDescuentoPorcentaje / 100);
    const total = subtotal + impuestos - descuentoValor;
    return {
      cantidad,
      precioUnitario,
      impuestos,
      descuentoPorcentaje: safeDescuentoPorcentaje,
      subtotal,
      descuentoValor,
      total,
    };
  }, [form.cantidad, form.descuentoPorcentaje, form.impuestos, form.precioUnitario]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const { cantidad, precioUnitario, impuestos, descuentoPorcentaje, subtotal, descuentoValor } = saleCalculation;

    if (!form.localId || !form.productoId) {
      setFormError('Debes seleccionar sucursal y producto.');
      return;
    }
    if (cantidad <= 0 || precioUnitario < 0 || impuestos < 0) {
      setFormError('Cantidad, precio e impuestos deben ser numericos y validos.');
      return;
    }
    if (descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
      setFormError('El descuento debe estar entre 0% y 100%.');
      return;
    }
    if (descuentoValor > subtotal + impuestos) {
      setFormError('El descuento calculado no puede superar el total bruto de la venta.');
      return;
    }

    const payload = {
      localId: form.localId,
      productoId: form.productoId,
      cantidad,
      precioUnitario,
      impuestos,
      descuento: descuentoValor,
      estado: form.estado,
      moneda: sanitizeText(form.moneda, 3).toUpperCase() || 'COP',
      numeroComprobante: sanitizeText(form.numeroComprobante, 80),
      observaciones: sanitizeText(form.observaciones, 220),
      fecha: new Date(form.fecha).toISOString(),
    };

    try {
      if (editingSaleId) {
        await editSale(editingSaleId, payload);
        setEditingSaleId(null);
      } else {
        await addSale(payload);
      }
      setForm((prev) => ({
        ...EMPTY_FORM,
        localId: prev.localId,
        moneda: prev.moneda,
        fecha: toDatetimeLocal(new Date()),
      }));
      onSaleCreated?.();
    } catch {
      // El error detallado se comunica en updateError/createError.
    }
  };

  const handleStartEdit = (sale: SaleRecord) => {
    setFormError(null);
    setEditingSaleId(sale.id);
    setForm({
      localId: sale.localId,
      productoId: sale.productoId ?? '',
      cantidad: String(sale.cantidad),
      precioUnitario: String(sale.precioUnitario),
      impuestos: String(sale.impuestos),
      descuentoPorcentaje: resolveDiscountPercentage(sale.subtotal, sale.descuento).toFixed(2),
      estado: sale.estado as SaleForm['estado'],
      moneda: sale.moneda,
      numeroComprobante: sale.numeroComprobante ?? '',
      observaciones: sale.observaciones ?? '',
      fecha: toDatetimeLocal(sale.fecha),
    });
  };

  const handleCancelEdit = () => {
    setEditingSaleId(null);
    setFormError(null);
    setForm((prev) => ({ ...EMPTY_FORM, localId: prev.localId, moneda: prev.moneda }));
  };

  const handleAnnulSale = async (sale: SaleRecord) => {
    const confirmed = window.confirm(
      `Vas a anular la venta ${sale.numeroComprobante ?? sale.id}. Esta accion deja la venta en estado ANULADA. Deseas continuar?`,
    );
    if (!confirmed) return;

    setAnnullingSaleId(sale.id);
    try {
      await cancelSale(sale.id);
      if (editingSaleId === sale.id) {
        handleCancelEdit();
      }
      onSaleCreated?.();
    } finally {
      setAnnullingSaleId(null);
    }
  };

  const visibleSales = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return sales.filter((sale) => {
      const matchesEstado = filterEstado === 'TODAS' || sale.estado === filterEstado;
      if (!matchesEstado) return false;
      if (!query) return true;

      const haystack = [
        sale.localNombre,
        sale.productoNombre,
        sale.numeroComprobante ?? '',
        sale.observaciones ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filterEstado, sales, searchText]);

  const visibleSummary = useMemo(() => {
    const totalVentas = visibleSales.length;
    const totalIngresos = visibleSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalUnidades = visibleSales.reduce((sum, sale) => sum + sale.cantidad, 0);
    const ticketPromedio = totalVentas > 0 ? totalIngresos / totalVentas : 0;
    return { totalVentas, totalIngresos, totalUnidades, ticketPromedio };
  }, [visibleSales]);

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Ventas</SectionTitle>
        <SectionHeaderActions>
          <SectionMeta>
            {visibleSales.length} visibles / {sales.length} registradas
          </SectionMeta>
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
                Sucursal
                <SelectControl
                  value={form.localId}
                  onChange={(event) => setForm((prev) => ({ ...prev, localId: event.target.value }))}
                  required
                >
                  <option value="">Selecciona una sucursal</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </SelectControl>
              </Field>

              <Field>
                Producto
                <SelectControl
                  value={form.productoId}
                  onChange={(event) => {
                    const nextProductId = event.target.value;
                    const product = productById.get(nextProductId);
                    setForm((prev) => ({
                      ...prev,
                      productoId: nextProductId,
                      precioUnitario: product ? String(product.precioVenta) : prev.precioUnitario,
                    }));
                  }}
                  required
                >
                  <option value="">Selecciona un producto</option>
                  {productOptions.map((product) => (
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
                  placeholder="Ej: 1"
                  required
                />
              </Field>

              <Field>
                Precio unitario
                <InputControl
                  inputMode="decimal"
                  value={form.precioUnitario}
                  onChange={(event) => setForm((prev) => ({ ...prev, precioUnitario: event.target.value }))}
                  placeholder="Ej: 90000"
                  required
                />
              </Field>

              <Field>
                Impuestos (valor)
                <InputControl
                  inputMode="decimal"
                  value={form.impuestos}
                  onChange={(event) => setForm((prev) => ({ ...prev, impuestos: event.target.value }))}
                  placeholder="Ej: 0"
                  required
                />
              </Field>

              <Field>
                Descuento (%)
                <InputControl
                  inputMode="decimal"
                  value={form.descuentoPorcentaje}
                  onChange={(event) => setForm((prev) => ({ ...prev, descuentoPorcentaje: event.target.value }))}
                  placeholder="Ej: 0"
                  required
                />
              </Field>

              <Field>
                Estado
                <SelectControl
                  value={form.estado}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      estado: event.target.value as SaleForm['estado'],
                    }))
                  }
                >
                  <option value="BORRADOR">BORRADOR</option>
                  <option value="CONFIRMADA">CONFIRMADA</option>
                  <option value="ANULADA">ANULADA</option>
                </SelectControl>
              </Field>

              <Field>
                Moneda
                <SelectControl
                  value={form.moneda}
                  onChange={(event) => setForm((prev) => ({ ...prev, moneda: event.target.value }))}
                  required
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.label}
                    </option>
                  ))}
                </SelectControl>
              </Field>
            </Fields>

            <TotalsPanel>
              <TotalsGrid>
                <TotalCard>
                  <p>Subtotal</p>
                  <strong>{formatMoney(saleCalculation.subtotal, form.moneda)}</strong>
                </TotalCard>
                <TotalCard>
                  <p>Descuento ({saleCalculation.descuentoPorcentaje.toFixed(2)}%)</p>
                  <strong>{formatMoney(saleCalculation.descuentoValor, form.moneda)}</strong>
                </TotalCard>
                <TotalCard>
                  <p>Impuestos</p>
                  <strong>{formatMoney(saleCalculation.impuestos, form.moneda)}</strong>
                </TotalCard>
                <TotalCard $featured>
                  <p>Total de venta</p>
                  <strong>{formatMoney(saleCalculation.total, form.moneda)}</strong>
                </TotalCard>
              </TotalsGrid>
            </TotalsPanel>

            <Field>
              Fecha y hora de venta
              <InputControl
                type="datetime-local"
                value={form.fecha}
                onChange={(event) => setForm((prev) => ({ ...prev, fecha: event.target.value }))}
                required
              />
            </Field>

            <Fields>
              <Field>
                Numero de comprobante (opcional)
                <InputControl
                  value={form.numeroComprobante}
                  onChange={(event) => setForm((prev) => ({ ...prev, numeroComprobante: event.target.value }))}
                  placeholder="Ej: FAC-2026-00041"
                />
              </Field>
              <Field>
                Observaciones (opcional)
                <TextAreaControl
                  value={form.observaciones}
                  onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
                  placeholder="Ej: Observaciones sobre la venta."
                />
              </Field>
            </Fields>

            {(formError || friendlyCreateError || friendlyUpdateError) && (
              <StatusState
                kind={formError ? 'error' : isSetupError(createError ?? updateError) ? 'info' : 'error'}
                message={formError ?? friendlyCreateError ?? friendlyUpdateError ?? 'Error inesperado.'}
              />
            )}
            {(friendlyAnnulError || annulStatus === 'success') && (
              <StatusState
                kind={friendlyAnnulError ? 'error' : 'info'}
                message={friendlyAnnulError ?? 'Venta anulada correctamente.'}
              />
            )}
            {createStatus === 'success' && !editingSaleId && (
              <StatusState kind="info" message="Venta registrada correctamente." />
            )}
            {updateStatus === 'success' && (
              <StatusState kind="info" message="Venta actualizada correctamente." />
            )}

            <ButtonsRow>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingSaleId ? 'Guardar cambios' : 'Registrar venta'}
              </PrimaryButton>
              {editingSaleId && (
                <GhostButton type="button" onClick={handleCancelEdit}>
                  Cancelar edicion
                </GhostButton>
              )}
              <GhostButton type="button" onClick={() => reload()}>
                Actualizar historial
              </GhostButton>
            </ButtonsRow>
          </FormGrid>

          {status === 'loading' && <StatusState kind="loading" message="Cargando ventas..." />}
          {status === 'error' && (
            <StatusState
              kind={isSetupError(error) ? 'info' : 'error'}
              message={friendlyLoadError ?? 'Error inesperado.'}
            />
          )}
          {status === 'success' && sales.length === 0 && (
            <StatusState kind="empty" message="No hay ventas registradas. Registra la primera en el formulario." />
          )}

          {status === 'success' && sales.length > 0 && (
            <>
              <HistoryPanel>
                <SummaryStrip>
                  <SummaryChip>
                    <p>Ventas visibles</p>
                    <strong>{visibleSummary.totalVentas}</strong>
                  </SummaryChip>
                  <SummaryChip>
                    <p>Unidades vendidas</p>
                    <strong>{visibleSummary.totalUnidades}</strong>
                  </SummaryChip>
                  <SummaryChip>
                    <p>Ingresos</p>
                    <strong>{formatMoney(visibleSummary.totalIngresos)}</strong>
                  </SummaryChip>
                  <SummaryChip>
                    <p>Ticket promedio</p>
                    <strong>{formatMoney(visibleSummary.ticketPromedio)}</strong>
                  </SummaryChip>
                </SummaryStrip>

                <FilterBar>
                  <Field>
                    Buscar en historial
                    <InputControl
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Busca sucursal, producto o comprobante"
                    />
                  </Field>
                  <Field>
                    Estado
                    <SelectControl
                      value={filterEstado}
                      onChange={(event) => setFilterEstado(event.target.value as typeof filterEstado)}
                    >
                      <option value="TODAS">TODAS</option>
                      <option value="BORRADOR">BORRADOR</option>
                      <option value="CONFIRMADA">CONFIRMADA</option>
                      <option value="ANULADA">ANULADA</option>
                    </SelectControl>
                  </Field>
                </FilterBar>

                {visibleSales.length === 0 ? (
                  <StatusState kind="empty" message="No hay ventas que coincidan con tus filtros." />
                ) : (
                  <TableWrap>
                    <DataTable>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Sucursal</th>
                          <th>Producto</th>
                          <th className="num">Cant.</th>
                          <th className="hide-mobile">P. unit</th>
                          <th className="hide-mobile">Subtotal</th>
                          <th className="hide-mobile">Imp.</th>
                          <th className="hide-mobile">Desc.</th>
                          <th className="num">Total</th>
                          <th className="hide-mobile">Comprobante</th>
                          <th className="hide-mobile wrap">Observaciones</th>
                          <th>Estado</th>
                          <th className="actions">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSales.map((sale) => (
                          <tr key={sale.id}>
                            <td>{formatDateTime(sale.fecha)}</td>
                            <td>{sale.localNombre}</td>
                            <td>{sale.productoNombre}</td>
                            <td className="num">{sale.cantidad}</td>
                            <td className="hide-mobile num">{formatMoney(sale.precioUnitario, sale.moneda)}</td>
                            <td className="hide-mobile num">{formatMoney(sale.subtotal, sale.moneda)}</td>
                            <td className="hide-mobile num">{formatMoney(sale.impuestos, sale.moneda)}</td>
                            <td className="hide-mobile num">
                              {resolveDiscountPercentage(sale.subtotal, sale.descuento).toFixed(2)}%
                              {' / '}
                              {formatMoney(sale.descuento, sale.moneda)}
                            </td>
                            <td className="num">{formatMoney(sale.total, sale.moneda)}</td>
                            <td className="hide-mobile">{sale.numeroComprobante ?? 'Sin comprobante'}</td>
                            <td className="hide-mobile wrap">{sale.observaciones ?? 'Sin observaciones'}</td>
                            <td>
                              <Tag $tone={sale.estado === 'ANULADA' ? 'off' : sale.estado === 'BORRADOR' ? 'warn' : 'ok'}>
                                {sale.estado}
                              </Tag>
                            </td>
                            <td className="actions">
                              <TableActions>
                                <GhostButton
                                  type="button"
                                  onClick={() => handleStartEdit(sale)}
                                  disabled={isSubmitting || annulStatus === 'submitting' || sale.estado === 'ANULADA'}
                                >
                                  Editar
                                </GhostButton>
                                <DangerButton
                                  type="button"
                                  onClick={() => handleAnnulSale(sale)}
                                  disabled={annulStatus === 'submitting' || sale.estado === 'ANULADA'}
                                >
                                  {annulStatus === 'submitting' && annullingSaleId === sale.id
                                    ? 'Anulando...'
                                    : 'Anular'}
                                </DangerButton>
                              </TableActions>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </TableWrap>
                )}
              </HistoryPanel>
            </>
          )}
        </>
      )}
    </SectionCard>
  );
}
