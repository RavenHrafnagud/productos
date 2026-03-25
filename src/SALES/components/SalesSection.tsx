/**
 * Seccion de ventas.
 * Soporta ventas por sucursal o individuales con multiproducto.
 */
import { FormEvent, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { Branch } from '../../BRANCHES/types/Branch';
import { useProducts } from '../../PRODUCTS/hooks/useProducts';
import { getWorldCurrencyOptions } from '../../SHARED/constants/currencies';
import { getCityOptionsByCountry, getCountryOptions } from '../../SHARED/constants/geo';
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
import { sanitizeText } from '../../SHARED/utils/validators';
import { useSales } from '../hooks/useSales';
import type { CreateSaleLineInput, SaleRecord, SaleShippingResponsible, SaleType } from '../types/Sale';

interface SalesSectionProps {
  branches: Branch[];
  refreshKey: number;
  onSaleCreated?: () => void;
}

interface SaleForm {
  tipoVenta: SaleType;
  localId: string;
  estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
  moneda: string;
  numeroComprobante: string;
  observaciones: string;
  fecha: string;
  clienteDocumento: string;
  clienteNombre: string;
  clientePais: string;
  clienteCiudad: string;
  envioResponsable: SaleShippingResponsible;
}

interface ProductLineDraft {
  selected: boolean;
  cantidad: string;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
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

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const EMPTY_FORM: SaleForm = {
  tipoVenta: 'SUCURSAL',
  localId: '',
  estado: 'CONFIRMADA',
  moneda: 'COP',
  numeroComprobante: '',
  observaciones: '',
  fecha: toDatetimeLocal(new Date()),
  clienteDocumento: '',
  clienteNombre: '',
  clientePais: 'CO',
  clienteCiudad: '',
  envioResponsable: 'CLIENTE',
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
  const [lineByProductId, setLineByProductId] = useState<Record<string, ProductLineDraft>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODAS' | 'BORRADOR' | 'CONFIRMADA' | 'ANULADA'>('TODAS');
  const [collapsed, setCollapsed] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  const friendlyLoadError = toFriendlySupabaseMessage(error, 'ventas');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'ventas');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'ventas');
  const friendlyAnnulError = toFriendlySupabaseMessage(annulError, 'ventas');
  const isSubmitting = createStatus === 'submitting' || updateStatus === 'submitting';

  const currencyOptions = useMemo(() => getWorldCurrencyOptions('es'), []);
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const filteredCountryOptions = useMemo(() => {
    const query = normalizeText(countryQuery.trim());
    if (!query) return countryOptions;
    return countryOptions.filter((country) => normalizeText(country.label).includes(query));
  }, [countryOptions, countryQuery]);

  const cityOptions = useMemo(
    () => getCityOptionsByCountry(form.clientePais, { query: cityQuery }),
    [cityQuery, form.clientePais],
  );

  const branchById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch])), [branches]);
  const branchOptions = useMemo(
    () => branches.filter((branch) => branch.estado).map((branch) => ({ id: branch.id, name: branch.nombre })),
    [branches],
  );
  const activeProducts = useMemo(
    () =>
      products.filter((product) => product.estado).map((product) => ({
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
        next[product.id] = prev[product.id] ?? { selected: false, cantidad: '' };
      }
      return next;
    });
  }, [activeProducts]);

  const selectedLineItems = useMemo(() => {
    const rows: CreateSaleLineInput[] = [];
    for (const product of activeProducts) {
      const line = lineByProductId[product.id];
      if (!line?.selected) continue;
      const qty = toNumber(line.cantidad);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      rows.push({ productoId: product.id, cantidad: qty, precioUnitario: product.price });
    }
    return rows;
  }, [activeProducts, lineByProductId]);

  const commissionPct = useMemo(() => {
    if (form.tipoVenta !== 'SUCURSAL' || !form.localId) return 0;
    return Math.max(0, Math.min(100, branchById.get(form.localId)?.porcentajeComision ?? 0));
  }, [branchById, form.localId, form.tipoVenta]);

  const totals = useMemo(() => {
    const subtotal = selectedLineItems.reduce((sum, line) => sum + line.cantidad * line.precioUnitario, 0);
    const comision = subtotal * (commissionPct / 100);
    const total = subtotal - comision;
    const units = selectedLineItems.reduce((sum, line) => sum + line.cantidad, 0);
    return { subtotal, comision, total, units, products: selectedLineItems.length };
  }, [commissionPct, selectedLineItems]);

  const clearLines = () => {
    setLineByProductId((prev) => {
      const next: Record<string, ProductLineDraft> = {};
      for (const key of Object.keys(prev)) {
        next[key] = { selected: false, cantidad: '' };
      }
      return next;
    });
  };

  const resetForm = () => {
    setEditingSaleId(null);
    setForm((prev) => ({
      ...EMPTY_FORM,
      tipoVenta: prev.tipoVenta,
      localId: prev.tipoVenta === 'SUCURSAL' ? prev.localId : '',
      moneda: prev.moneda,
      clientePais: prev.clientePais,
      fecha: toDatetimeLocal(new Date()),
    }));
    setCityQuery('');
    clearLines();
  };

  const handleLineToggle = (productId: string, selected: boolean) => {
    setLineByProductId((prev) => ({
      ...prev,
      [productId]: {
        selected,
        cantidad: selected ? prev[productId]?.cantidad || '1' : '',
      },
    }));
  };

  const handleLineQty = (productId: string, cantidad: string) => {
    setLineByProductId((prev) => ({
      ...prev,
      [productId]: {
        selected: prev[productId]?.selected ?? false,
        cantidad,
      },
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (selectedLineItems.length === 0) {
      setFormError('Debes seleccionar al menos un producto con cantidad mayor a cero.');
      return;
    }

    if (form.tipoVenta === 'SUCURSAL' && !form.localId) {
      setFormError('Debes seleccionar una sucursal para este tipo de venta.');
      return;
    }

    if (form.tipoVenta === 'INDIVIDUAL') {
      if (!sanitizeText(form.clienteDocumento, 40) || !sanitizeText(form.clienteNombre, 120)) {
        setFormError('Debes completar cedula y nombre del comprador.');
        return;
      }
      if (!sanitizeText(form.clientePais, 40) || !sanitizeText(form.clienteCiudad, 80)) {
        setFormError('Debes completar pais y ciudad del comprador.');
        return;
      }
    }

    const fechaIso = new Date(form.fecha).toISOString();

    if (editingSaleId) {
      if (selectedLineItems.length !== 1) {
        setFormError('Para editar una venta existente debes dejar solo un producto seleccionado.');
        return;
      }
      const line = selectedLineItems[0];
      const subtotal = line.cantidad * line.precioUnitario;
      const descuento = subtotal * (commissionPct / 100);
      try {
        await editSale(editingSaleId, {
          localId: form.tipoVenta === 'SUCURSAL' ? form.localId : null,
          productoId: line.productoId,
          cantidad: line.cantidad,
          precioUnitario: line.precioUnitario,
          impuestos: 0,
          descuento,
          estado: form.estado,
          moneda: sanitizeText(form.moneda, 3).toUpperCase() || 'COP',
          numeroComprobante: sanitizeText(form.numeroComprobante, 80),
          observaciones: sanitizeText(form.observaciones, 220),
          fecha: fechaIso,
        });
        resetForm();
        onSaleCreated?.();
      } catch {
        // El error se comunica por updateError.
      }
      return;
    }

    try {
      await addSale({
        tipoVenta: form.tipoVenta,
        localId: form.tipoVenta === 'SUCURSAL' ? form.localId : null,
        lineItems: selectedLineItems,
        comisionPorcentaje: commissionPct,
        estado: form.estado,
        moneda: sanitizeText(form.moneda, 3).toUpperCase() || 'COP',
        numeroComprobante: sanitizeText(form.numeroComprobante, 80),
        observaciones: sanitizeText(form.observaciones, 220),
        fecha: fechaIso,
        clienteDocumento: sanitizeText(form.clienteDocumento, 40),
        clienteNombre: sanitizeText(form.clienteNombre, 120),
        clientePais: sanitizeText(form.clientePais, 40),
        clienteCiudad: sanitizeText(form.clienteCiudad, 80),
        envioResponsable: form.tipoVenta === 'INDIVIDUAL' ? form.envioResponsable : null,
      });
      resetForm();
      onSaleCreated?.();
    } catch {
      // El error se comunica por createError.
    }
  };

  const handleStartEdit = (sale: SaleRecord) => {
    setFormError(null);
    setEditingSaleId(sale.id);
    setForm({
      tipoVenta: sale.tipoVenta,
      localId: sale.localId ?? '',
      estado: sale.estado,
      moneda: sale.moneda,
      numeroComprobante: sale.numeroComprobante ?? '',
      observaciones: sale.observaciones ?? '',
      fecha: toDatetimeLocal(sale.fecha),
      clienteDocumento: sale.clienteDocumento ?? '',
      clienteNombre: sale.clienteNombre ?? '',
      clientePais: sale.clientePais ?? 'CO',
      clienteCiudad: sale.clienteCiudad ?? '',
      envioResponsable: sale.envioResponsable ?? 'CLIENTE',
    });
    setCityQuery(sale.clienteCiudad ?? '');
    setLineByProductId((prev) => {
      const next: Record<string, ProductLineDraft> = {};
      for (const key of Object.keys(prev)) {
        next[key] = { selected: false, cantidad: '' };
      }
      if (sale.productoId) {
        next[sale.productoId] = { selected: true, cantidad: String(sale.cantidad) };
      }
      return next;
    });
  };

  const handleCancelEdit = () => {
    setEditingSaleId(null);
    setFormError(null);
    setForm((prev) => ({ ...EMPTY_FORM, tipoVenta: prev.tipoVenta, localId: prev.localId, moneda: prev.moneda }));
    setCountryQuery('');
    setCityQuery('');
    clearLines();
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
        sale.clienteNombre ?? '',
        sale.clienteDocumento ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [filterEstado, sales, searchText]);

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
                Tipo de venta
                <SelectControl
                  value={form.tipoVenta}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      tipoVenta: event.target.value as SaleType,
                      localId: event.target.value === 'SUCURSAL' ? prev.localId : '',
                    }))
                  }
                >
                  <option value="SUCURSAL">Sucursales</option>
                  <option value="INDIVIDUAL">Individuales</option>
                </SelectControl>
              </Field>

              {form.tipoVenta === 'SUCURSAL' && (
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
              )}

              {form.tipoVenta === 'SUCURSAL' && (
                <Field>
                  Comision de sucursal (%)
                  <InputControl value={commissionPct.toFixed(2)} readOnly />
                </Field>
              )}

              {form.tipoVenta === 'INDIVIDUAL' && (
                <>
                  <Field>
                    Cedula comprador
                    <InputControl
                      value={form.clienteDocumento}
                      onChange={(event) => setForm((prev) => ({ ...prev, clienteDocumento: event.target.value }))}
                    />
                  </Field>
                  <Field>
                    Nombre comprador
                    <InputControl
                      value={form.clienteNombre}
                      onChange={(event) => setForm((prev) => ({ ...prev, clienteNombre: event.target.value }))}
                    />
                  </Field>
                  <Field>
                    Pais (buscar)
                    <InputControl
                      value={countryQuery}
                      onChange={(event) => setCountryQuery(event.target.value)}
                      placeholder="Buscar pais..."
                    />
                    <SelectControl
                      value={form.clientePais}
                      onChange={(event) => {
                        setCityQuery('');
                        setForm((prev) => ({ ...prev, clientePais: event.target.value, clienteCiudad: '' }));
                      }}
                    >
                      {filteredCountryOptions.map((country) => (
                        <option key={country.value} value={country.value}>
                          {country.label}
                        </option>
                      ))}
                    </SelectControl>
                  </Field>
                  <Field>
                    Ciudad comprador
                    <InputControl
                      value={cityQuery}
                      onChange={(event) => setCityQuery(event.target.value)}
                      placeholder="Buscar ciudad..."
                    />
                    <SelectControl
                      value={form.clienteCiudad}
                      onChange={(event) => setForm((prev) => ({ ...prev, clienteCiudad: event.target.value }))}
                    >
                      <option value="">Selecciona ciudad</option>
                      {cityOptions.map((city) => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </SelectControl>
                  </Field>
                  <Field>
                    Envio
                    <SelectControl
                      value={form.envioResponsable}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          envioResponsable: event.target.value as SaleShippingResponsible,
                        }))
                      }
                    >
                      <option value="CLIENTE">Pagado por el cliente</option>
                      <option value="NOSOTROS">Pagado por nosotros</option>
                    </SelectControl>
                  </Field>
                </>
              )}

              <Field>
                Estado
                <SelectControl
                  value={form.estado}
                  onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value as SaleForm['estado'] }))}
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
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.label}
                    </option>
                  ))}
                </SelectControl>
              </Field>
            </Fields>

            <Field>
              Productos (seleccion multiple)
              <ProductList>
                {activeProducts.map((product) => {
                  const line = lineByProductId[product.id] ?? { selected: false, cantidad: '' };
                  return (
                    <ProductRow key={product.id}>
                      <input
                        type="checkbox"
                        checked={line.selected}
                        onChange={(event) => handleLineToggle(product.id, event.target.checked)}
                      />
                      <div>{product.name}</div>
                      <div className="line-price">{formatMoney(product.price, form.moneda)}</div>
                      <InputControl
                        className="line-qty"
                        inputMode="decimal"
                        value={line.cantidad}
                        onChange={(event) => handleLineQty(product.id, event.target.value)}
                        disabled={!line.selected}
                        placeholder="Cantidad"
                      />
                    </ProductRow>
                  );
                })}
              </ProductList>
            </Field>

            <TotalsRow>
              <TotalCard>
                <small>Productos</small>
                <strong>{totals.products}</strong>
              </TotalCard>
              <TotalCard>
                <small>Unidades</small>
                <strong>{totals.units.toFixed(2)}</strong>
              </TotalCard>
              <TotalCard>
                <small>Comision</small>
                <strong>{formatMoney(totals.comision, form.moneda)}</strong>
              </TotalCard>
              <TotalCard>
                <small>Total venta</small>
                <strong>{formatMoney(totals.total, form.moneda)}</strong>
              </TotalCard>
            </TotalsRow>

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
                Numero comprobante (opcional)
                <InputControl
                  value={form.numeroComprobante}
                  onChange={(event) => setForm((prev) => ({ ...prev, numeroComprobante: event.target.value }))}
                />
              </Field>
              <Field>
                Observaciones (opcional)
                <TextAreaControl
                  value={form.observaciones}
                  onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
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
          {status === 'success' && visibleSales.length === 0 && (
            <StatusState kind="empty" message="No hay ventas registradas." />
          )}

          {status === 'success' && sales.length > 0 && (
            <Fields>
              <Field>
                Buscar en historial
                <InputControl
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Sucursal, producto, cliente o comprobante"
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
            </Fields>
          )}

          {status === 'success' && visibleSales.length > 0 && (
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Canal / Cliente</th>
                    <th>Producto</th>
                    <th className="num">Cant.</th>
                    <th className="hide-mobile num">Comision</th>
                    <th className="num">Total</th>
                    <th>Estado</th>
                    <th className="actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{formatDateTime(sale.fecha)}</td>
                      <td>
                        <Tag $tone={sale.tipoVenta === 'SUCURSAL' ? 'warn' : 'off'}>{sale.tipoVenta}</Tag>
                      </td>
                      <td>
                        {sale.tipoVenta === 'SUCURSAL'
                          ? sale.localNombre
                          : `${sale.clienteNombre ?? 'Cliente'} (${sale.clienteDocumento ?? 'Sin documento'})`}
                      </td>
                      <td>{sale.productoNombre}</td>
                      <td className="num">{sale.cantidad.toFixed(2)}</td>
                      <td className="hide-mobile num">{formatMoney(sale.comisionValor, sale.moneda)}</td>
                      <td className="num">{formatMoney(sale.total, sale.moneda)}</td>
                      <td>
                        <Tag $tone={sale.estado === 'ANULADA' ? 'off' : sale.estado === 'BORRADOR' ? 'warn' : 'ok'}>
                          {sale.estado}
                        </Tag>
                      </td>
                      <td className="actions">
                        <ButtonsRow>
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
                            {annulStatus === 'submitting' && annullingSaleId === sale.id ? 'Anulando...' : 'Anular'}
                          </DangerButton>
                        </ButtonsRow>
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
