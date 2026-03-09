/**
 * Seccion de ventas.
 * Permite registrar, editar, anular y consultar historial de ventas.
 */
import { FormEvent, useMemo, useState } from 'react';
import type { Branch } from '../../BRANCHES/types/Branch';
import { useProducts } from '../../PRODUCTS/hooks/useProducts';
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
import { SectionCard, SectionHeader, SectionMeta, SectionTitle } from '../../SHARED/ui/SectionCard';
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
  descuento: string;
  estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
  moneda: string;
  numeroComprobante: string;
  observaciones: string;
  fecha: string;
}

function toDatetimeLocal(date: Date | string) {
  const value = typeof date === 'string' ? new Date(date) : date;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  const hh = String(value.getHours()).padStart(2, '0');
  const mm = String(value.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

const EMPTY_FORM: SaleForm = {
  localId: '',
  productoId: '',
  cantidad: '',
  precioUnitario: '',
  impuestos: '0',
  descuento: '0',
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
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'ventas');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'ventas');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'ventas');
  const friendlyAnnulError = toFriendlySupabaseMessage(annulError, 'ventas');
  const isSubmitting = createStatus === 'submitting' || updateStatus === 'submitting';

  const branchOptions = useMemo(
    () => branches.filter((branch) => branch.estado).map((branch) => ({ id: branch.id, name: branch.nombre })),
    [branches],
  );
  const productOptions = useMemo(
    () => products.filter((product) => product.estado).map((product) => ({ id: product.id, name: product.nombre })),
    [products],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const cantidad = toPositiveNumber(form.cantidad);
    const precioUnitario = toPositiveNumber(form.precioUnitario);
    const impuestos = toPositiveNumber(form.impuestos);
    const descuento = toPositiveNumber(form.descuento);

    if (!form.localId || !form.productoId) {
      setFormError('Debes seleccionar sucursal y producto.');
      return;
    }
    if (cantidad === null || precioUnitario === null || impuestos === null || descuento === null || cantidad <= 0) {
      setFormError('Cantidad y precio deben ser numericos. La cantidad debe ser mayor a cero.');
      return;
    }

    const subtotal = cantidad * precioUnitario;
    if (descuento > subtotal + impuestos) {
      setFormError('El descuento no puede ser mayor al total bruto de la venta.');
      return;
    }

    const payload = {
      localId: form.localId,
      productoId: form.productoId,
      cantidad,
      precioUnitario,
      impuestos,
      descuento,
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
      setForm({ ...EMPTY_FORM, localId: form.localId, fecha: toDatetimeLocal(new Date()) });
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
      descuento: String(sale.descuento),
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
    setForm(EMPTY_FORM);
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
        sale.usuarioNombre,
        sale.numeroComprobante ?? '',
        sale.observaciones ?? '',
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
        <SectionMeta>{visibleSales.length} visibles / {sales.length} registradas</SectionMeta>
      </SectionHeader>

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
              onChange={(event) => setForm((prev) => ({ ...prev, productoId: event.target.value }))}
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
              placeholder="1"
              required
            />
          </Field>

          <Field>
            Precio unitario
            <InputControl
              inputMode="decimal"
              value={form.precioUnitario}
              onChange={(event) => setForm((prev) => ({ ...prev, precioUnitario: event.target.value }))}
              placeholder="90000"
              required
            />
          </Field>
          <Field>
            Impuestos
            <InputControl
              inputMode="decimal"
              value={form.impuestos}
              onChange={(event) => setForm((prev) => ({ ...prev, impuestos: event.target.value }))}
              placeholder="0"
              required
            />
          </Field>
          <Field>
            Descuento
            <InputControl
              inputMode="decimal"
              value={form.descuento}
              onChange={(event) => setForm((prev) => ({ ...prev, descuento: event.target.value }))}
              placeholder="0"
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
            <InputControl
              value={form.moneda}
              onChange={(event) => setForm((prev) => ({ ...prev, moneda: event.target.value.toUpperCase() }))}
              placeholder="COP"
              required
            />
          </Field>
        </Fields>

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
              placeholder="FAC-2026-00041"
            />
          </Field>
          <Field>
            Observaciones (opcional)
            <TextAreaControl
              value={form.observaciones}
              onChange={(event) => setForm((prev) => ({ ...prev, observaciones: event.target.value }))}
              placeholder="Observaciones de la venta."
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
        <StatusState kind="empty" message="Aun no hay ventas registradas." />
      )}

      {status === 'success' && sales.length > 0 && (
        <>
          <Fields>
            <Field>
              Buscar en historial
              <InputControl
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Sucursal, producto, usuario, comprobante..."
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

          {visibleSales.length === 0 ? (
            <StatusState kind="empty" message="No hay ventas que coincidan con tus filtros." />
          ) : (
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Sucursal</th>
                    <th>Vendedor</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>P. unit</th>
                    <th>Subtotal</th>
                    <th>Imp.</th>
                    <th>Desc.</th>
                    <th>Total</th>
                    <th>Comprobante</th>
                    <th>Observaciones</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{formatDateTime(sale.fecha)}</td>
                      <td>{sale.localNombre}</td>
                      <td>{sale.usuarioNombre}</td>
                      <td>{sale.productoNombre}</td>
                      <td>{sale.cantidad}</td>
                      <td>{formatMoney(sale.precioUnitario, sale.moneda)}</td>
                      <td>{formatMoney(sale.subtotal, sale.moneda)}</td>
                      <td>{formatMoney(sale.impuestos, sale.moneda)}</td>
                      <td>{formatMoney(sale.descuento, sale.moneda)}</td>
                      <td>{formatMoney(sale.total, sale.moneda)}</td>
                      <td>{sale.numeroComprobante ?? 'Sin comprobante'}</td>
                      <td>{sale.observaciones ?? 'Sin observaciones'}</td>
                      <td>
                        <Tag $tone={sale.estado === 'ANULADA' ? 'off' : sale.estado === 'BORRADOR' ? 'warn' : 'ok'}>
                          {sale.estado}
                        </Tag>
                      </td>
                      <td>
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
                            {annulStatus === 'submitting' && annullingSaleId === sale.id
                              ? 'Anulando...'
                              : 'Anular'}
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
