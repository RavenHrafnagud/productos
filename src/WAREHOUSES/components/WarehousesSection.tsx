/**
 * Seccion de almacenes.
 * Gestiona sedes de almacenamiento, inventario origen y trazabilidad de movimientos.
 */
import { FormEvent, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { getCityCountByCountry, getCityOptionsByCountry, getCountryOptions } from '../../SHARED/constants/geo';
import { getWorldCurrencyOptions } from '../../SHARED/constants/currencies';
import { useProducts } from '../../PRODUCTS/hooks/useProducts';
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
import { formatDateTime, formatMoney } from '../../SHARED/utils/format';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { isValidEmail, sanitizeText, toPositiveNumber } from '../../SHARED/utils/validators';
import { useWarehouseInventory } from '../hooks/useWarehouseInventory';
import type {
  CreateWarehouseInput,
  UpdateWarehouseInput,
  Warehouse,
} from '../types/Warehouse';

interface WarehousesSectionProps {
  warehouses: Warehouse[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  updateStatus: 'idle' | 'submitting' | 'success' | 'error';
  updateError: string | null;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  onCreateWarehouse: (input: CreateWarehouseInput) => Promise<void>;
  onUpdateWarehouse: (warehouseId: string, input: UpdateWarehouseInput) => Promise<void>;
  onDeleteWarehouse: (warehouseId: string) => Promise<void>;
  onReload: () => Promise<void>;
  refreshKey: number;
}

interface WarehouseForm {
  nit: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  pais: string;
  telefono: string;
  email: string;
  esPropio: boolean;
  costoArriendo: string;
  moneda: string;
  estado: boolean;
}

interface InventoryForm {
  productId: string;
  currentQty: string;
  minQty: string;
}

const EMPTY_WAREHOUSE_FORM: WarehouseForm = {
  nit: '',
  nombre: '',
  direccion: '',
  ciudad: '',
  pais: 'CO',
  telefono: '',
  email: '',
  esPropio: true,
  costoArriendo: '0',
  moneda: 'COP',
  estado: true,
};

const EMPTY_INVENTORY_FORM: InventoryForm = {
  productId: '',
  currentQty: '',
  minQty: '',
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
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 18px rgba(22, 16, 36, 0.08);

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

const ActiveWarehousePanel = styled.section`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: 10px;
  background: linear-gradient(140deg, #ffffff 0%, #f6f0ff 100%);
  box-shadow: 0 12px 22px rgba(39, 24, 66, 0.1);
  margin-bottom: 12px;
`;

const TableActions = styled.div.attrs({ className: 'no-wrap' })`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: nowrap;
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

export function WarehousesSection({
  warehouses,
  status,
  error,
  createStatus,
  createError,
  updateStatus,
  updateError,
  deleteStatus,
  deleteError,
  onCreateWarehouse,
  onUpdateWarehouse,
  onDeleteWarehouse,
  onReload,
  refreshKey,
}: WarehousesSectionProps) {
  const { products } = useProducts(refreshKey);
  const [form, setForm] = useState<WarehouseForm>(EMPTY_WAREHOUSE_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [inventoryForm, setInventoryForm] = useState<InventoryForm>(EMPTY_INVENTORY_FORM);
  const [inventoryFormError, setInventoryFormError] = useState<string | null>(null);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [deletingInventoryId, setDeletingInventoryId] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [cityQuery, setCityQuery] = useState('');

  const {
    inventory,
    movements,
    status: inventoryStatus,
    error: inventoryError,
    saveStatus,
    saveError,
    deleteStatus: deleteInventoryStatus,
    deleteError: deleteInventoryError,
    reload: reloadInventory,
    saveRow,
    removeRow,
  } = useWarehouseInventory(selectedWarehouseId, refreshKey);

  const isSubmitting = createStatus === 'submitting' || updateStatus === 'submitting';
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'almacen');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'almacen');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'almacen');
  const friendlyDeleteError = toFriendlySupabaseMessage(deleteError, 'almacen');
  const friendlyInventoryError = toFriendlySupabaseMessage(inventoryError, 'almacen');
  const friendlyInventorySaveError = toFriendlySupabaseMessage(saveError, 'almacen');
  const friendlyInventoryDeleteError = toFriendlySupabaseMessage(deleteInventoryError, 'almacen');

  const countryOptions = useMemo(() => getCountryOptions(), []);
  const cityOptions = useMemo(
    () => getCityOptionsByCountry(form.pais, { query: cityQuery }),
    [cityQuery, form.pais],
  );
  const cityTotal = useMemo(() => getCityCountByCountry(form.pais), [form.pais]);
  const cityHasMore = cityTotal > cityOptions.length;
  const currencyOptions = useMemo(() => getWorldCurrencyOptions('es'), []);
  const productOptions = useMemo(
    () => products.filter((product) => product.estado).map((product) => ({ id: product.id, name: product.nombre })),
    [products],
  );

  const summary = useMemo(() => {
    const total = warehouses.length;
    const active = warehouses.filter((warehouse) => warehouse.estado).length;
    const own = warehouses.filter((warehouse) => warehouse.esPropio).length;
    const rented = total - own;
    const monthlyRent = warehouses
      .filter((warehouse) => !warehouse.esPropio)
      .reduce((sum, warehouse) => sum + warehouse.costoArriendo, 0);
    return { total, active, own, rented, monthlyRent };
  }, [warehouses]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ?? null,
    [selectedWarehouseId, warehouses],
  );

  const inventorySummary = useMemo(() => {
    const items = inventory.length;
    const stock = inventory.reduce((sum, row) => sum + row.cantidadActual, 0);
    const lowStock = inventory.filter((row) => row.cantidadActual <= row.cantidadMinima).length;
    return {
      items,
      stock,
      lowStock,
      movements: movements.length,
    };
  }, [inventory, movements]);

  useEffect(() => {
    if (selectedWarehouseId && warehouses.some((warehouse) => warehouse.id === selectedWarehouseId)) return;
    const nextWarehouse = warehouses.find((warehouse) => warehouse.estado) ?? warehouses[0];
    setSelectedWarehouseId(nextWarehouse?.id ?? '');
  }, [selectedWarehouseId, warehouses]);

  const handleSubmitWarehouse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const costoArriendo = form.esPropio ? 0 : toPositiveNumber(form.costoArriendo);
    const payload: CreateWarehouseInput = {
      nit: sanitizeText(form.nit, 30),
      nombre: sanitizeText(form.nombre, 90),
      direccion: sanitizeText(form.direccion, 140),
      ciudad: sanitizeText(form.ciudad, 80),
      pais: sanitizeText(form.pais, 40) || 'CO',
      telefono: sanitizeText(form.telefono, 25),
      email: form.email.trim().toLowerCase(),
      esPropio: form.esPropio,
      costoArriendo: costoArriendo ?? -1,
      moneda: sanitizeText(form.moneda, 3).toUpperCase() || 'COP',
      estado: form.estado,
    };

    if (!payload.nombre || !payload.ciudad || !payload.pais) {
      setFormError('Debes completar nombre, pais y ciudad del almacen.');
      return;
    }
    if (payload.email && !isValidEmail(payload.email)) {
      setFormError('El correo del almacen no es valido.');
      return;
    }
    if (costoArriendo === null || costoArriendo < 0) {
      setFormError('El costo de arriendo debe ser numerico y mayor o igual a cero.');
      return;
    }

    try {
      if (editingWarehouseId) {
        await onUpdateWarehouse(editingWarehouseId, payload);
        setEditingWarehouseId(null);
      } else {
        await onCreateWarehouse(payload);
      }
      setForm(EMPTY_WAREHOUSE_FORM);
      setCityQuery('');
    } catch {
      // Error detallado por createError/updateError.
    }
  };

  const handleStartEditWarehouse = (warehouse: Warehouse) => {
    setFormError(null);
    setEditingWarehouseId(warehouse.id);
    setForm({
      nit: warehouse.nit ?? '',
      nombre: warehouse.nombre,
      direccion: warehouse.direccion ?? '',
      ciudad: warehouse.ciudad ?? '',
      pais: warehouse.pais,
      telefono: warehouse.telefono ?? '',
      email: warehouse.email ?? '',
      esPropio: warehouse.esPropio,
      costoArriendo: String(warehouse.costoArriendo),
      moneda: warehouse.moneda,
      estado: warehouse.estado,
    });
    setCityQuery(warehouse.ciudad ?? '');
  };

  const handleCancelEditWarehouse = () => {
    setEditingWarehouseId(null);
    setFormError(null);
    setForm(EMPTY_WAREHOUSE_FORM);
    setCityQuery('');
  };

  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    const confirmation = window.confirm(
      `Vas a eliminar el almacen "${warehouse.nombre}". Esta accion elimina inventario/movimientos relacionados. Deseas continuar?`,
    );
    if (!confirmation) return;

    setDeletingWarehouseId(warehouse.id);
    try {
      await onDeleteWarehouse(warehouse.id);
      if (selectedWarehouseId === warehouse.id) {
        setSelectedWarehouseId('');
      }
      if (editingWarehouseId === warehouse.id) {
        handleCancelEditWarehouse();
      }
    } finally {
      setDeletingWarehouseId(null);
    }
  };

  const handleSubmitInventory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInventoryFormError(null);

    if (!selectedWarehouseId) {
      setInventoryFormError('Selecciona un almacen para gestionar su inventario.');
      return;
    }

    const cantidadActual = toPositiveNumber(inventoryForm.currentQty);
    const cantidadMinima = toPositiveNumber(inventoryForm.minQty);
    if (!inventoryForm.productId) {
      setInventoryFormError('Debes seleccionar un producto.');
      return;
    }
    if (cantidadActual === null || cantidadMinima === null) {
      setInventoryFormError('Las cantidades deben ser numericas y mayores o iguales a cero.');
      return;
    }

    try {
      await saveRow({
        almacenId: selectedWarehouseId,
        productoId: inventoryForm.productId,
        cantidadActual,
        cantidadMinima,
      });
      setInventoryForm(EMPTY_INVENTORY_FORM);
      setEditingInventoryId(null);
    } catch {
      // Error detallado por saveError.
    }
  };

  const handleStartEditInventory = (item: {
    id: string;
    productoId: string;
    cantidadActual: number;
    cantidadMinima: number;
  }) => {
    setEditingInventoryId(item.id);
    setInventoryFormError(null);
    setInventoryForm({
      productId: item.productoId,
      currentQty: String(item.cantidadActual),
      minQty: String(item.cantidadMinima),
    });
  };

  const handleCancelEditInventory = () => {
    setEditingInventoryId(null);
    setInventoryFormError(null);
    setInventoryForm(EMPTY_INVENTORY_FORM);
  };

  const handleDeleteInventory = async (input: {
    inventarioId: string;
    productoId: string;
    productoNombre: string;
  }) => {
    if (!selectedWarehouseId) return;
    const confirmation = window.confirm(
      `Vas a eliminar el inventario de "${input.productoNombre}" en este almacen. Deseas continuar?`,
    );
    if (!confirmation) return;

    setDeletingInventoryId(input.inventarioId);
    try {
      await removeRow({
        inventarioId: input.inventarioId,
        almacenId: selectedWarehouseId,
        productoId: input.productoId,
      });
    } finally {
      setDeletingInventoryId(null);
    }
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Almacen</SectionTitle>
        <SectionHeaderActions>
          <SectionMeta>{warehouses.length} almacenes registrados</SectionMeta>
          <SectionToggle type="button" onClick={() => setCollapsed((prev) => !prev)} aria-expanded={!collapsed}>
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </SectionToggle>
        </SectionHeaderActions>
      </SectionHeader>

      {!collapsed && (
        <>
          <SummaryGrid>
            <SummaryCard>
              <p>Total almacenes</p>
              <strong>{summary.total}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Activos</p>
              <strong>{summary.active}</strong>
            </SummaryCard>
            <SummaryCard>
              <p>Propios / Arrendados</p>
              <strong>
                {summary.own} / {summary.rented}
              </strong>
            </SummaryCard>
            <SummaryCard>
              <p>Arriendo mensual</p>
              <strong>{formatMoney(summary.monthlyRent)}</strong>
            </SummaryCard>
          </SummaryGrid>

          <FormGrid onSubmit={handleSubmitWarehouse}>
            <Fields>
              <Field>
                NIT (opcional)
                <InputControl
                  value={form.nit}
                  onChange={(event) => setForm((prev) => ({ ...prev, nit: event.target.value }))}
                  placeholder="Ej: 900123456-7"
                />
              </Field>
              <Field>
                Nombre del almacen
                <InputControl
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                  placeholder="Ej: Bodega Principal"
                  required
                />
              </Field>
              <Field>
                Pais
                <CompactCountrySelect
                  value={form.pais}
                  onChange={(event) => {
                    setCityQuery('');
                    setForm((prev) => ({ ...prev, pais: event.target.value, ciudad: '' }));
                  }}
                >
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
                  onChange={(event) => setForm((prev) => ({ ...prev, ciudad: event.target.value }))}
                  disabled={!form.pais}
                >
                  <option value="">Selecciona una ciudad</option>
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
                Direccion
                <InputControl
                  value={form.direccion}
                  onChange={(event) => setForm((prev) => ({ ...prev, direccion: event.target.value }))}
                  placeholder="Ej: Cra 10 # 20-30"
                />
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
                Correo
                <InputControl
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Ej: almacen@empresa.com"
                  inputMode="email"
                />
              </Field>
              <Field>
                Tipo de almacen
                <SelectControl
                  value={form.esPropio ? 'PROPIO' : 'ARRENDADO'}
                  onChange={(event) => {
                    const isOwn = event.target.value === 'PROPIO';
                    setForm((prev) => ({
                      ...prev,
                      esPropio: isOwn,
                      costoArriendo: isOwn ? '0' : prev.costoArriendo,
                    }));
                  }}
                >
                  <option value="PROPIO">Propio</option>
                  <option value="ARRENDADO">Arrendado</option>
                </SelectControl>
              </Field>
              <Field>
                Costo arriendo
                <InputControl
                  inputMode="decimal"
                  value={form.costoArriendo}
                  onChange={(event) => setForm((prev) => ({ ...prev, costoArriendo: event.target.value }))}
                  readOnly={form.esPropio}
                  placeholder="Ej: 1500000"
                />
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
              <Field>
                Estado
                <SelectControl
                  value={form.estado ? 'ACTIVO' : 'INACTIVO'}
                  onChange={(event) => setForm((prev) => ({ ...prev, estado: event.target.value === 'ACTIVO' }))}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </SelectControl>
              </Field>
            </Fields>

            {(formError || friendlyCreateError || friendlyUpdateError || friendlyDeleteError) && (
              <StatusState
                kind={formError ? 'error' : isSetupError(createError ?? updateError ?? deleteError) ? 'info' : 'error'}
                message={formError ?? friendlyCreateError ?? friendlyUpdateError ?? friendlyDeleteError ?? 'Error inesperado.'}
              />
            )}
            {createStatus === 'success' && <StatusState kind="info" message="Almacen creado correctamente." />}
            {updateStatus === 'success' && <StatusState kind="info" message="Almacen actualizado correctamente." />}
            {deleteStatus === 'success' && <StatusState kind="info" message="Almacen eliminado correctamente." />}

            <ButtonsRow>
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {editingWarehouseId
                  ? updateStatus === 'submitting'
                    ? 'Guardando almacen...'
                    : 'Guardar cambios'
                  : createStatus === 'submitting'
                    ? 'Creando almacen...'
                    : 'Registrar almacen'}
              </PrimaryButton>
              {editingWarehouseId && (
                <GhostButton type="button" onClick={handleCancelEditWarehouse}>
                  Cancelar edicion
                </GhostButton>
              )}
              <GhostButton type="button" onClick={() => onReload()}>
                Actualizar listados
              </GhostButton>
            </ButtonsRow>
          </FormGrid>

          <Divider />

          {status === 'loading' && <StatusState kind="loading" message="Cargando almacenes..." />}
          {status === 'error' && (
            <StatusState kind={isSetupError(error) ? 'info' : 'error'} message={friendlyLoadError ?? 'Error inesperado.'} />
          )}
          {status === 'success' && warehouses.length === 0 && (
            <StatusState kind="empty" message="Aun no hay almacenes registrados." />
          )}

          {status === 'success' && warehouses.length > 0 && (
            <>
              <ActiveWarehousePanel>
                <SectionHeader>
                  <SectionTitle>Listado de almacenes</SectionTitle>
                  <SectionHeaderActions>
                    <SectionMeta>
                      Almacen activo: {selectedWarehouse?.nombre ?? 'Sin seleccion'}
                    </SectionMeta>
                  </SectionHeaderActions>
                </SectionHeader>
                <TableWrap>
                  <DataTable>
                    <thead>
                      <tr>
                        <th>Almacen</th>
                        <th className="hide-mobile">Ciudad</th>
                        <th className="hide-mobile">Pais</th>
                        <th>Tipo</th>
                        <th className="hide-mobile num">Arriendo</th>
                        <th>Estado</th>
                        <th className="hide-mobile">Creado</th>
                        <th className="actions">Gestion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.map((warehouse) => (
                        <tr key={warehouse.id}>
                          <td>{warehouse.nombre}</td>
                          <td className="hide-mobile">{warehouse.ciudad ?? 'Sin ciudad'}</td>
                          <td className="hide-mobile">{warehouse.pais}</td>
                          <td>
                            <Tag $tone={warehouse.esPropio ? 'ok' : 'warn'}>
                              {warehouse.esPropio ? 'Propio' : 'Arrendado'}
                            </Tag>
                          </td>
                          <td className="hide-mobile num">
                            {warehouse.esPropio ? '-' : formatMoney(warehouse.costoArriendo)}
                          </td>
                          <td>
                            <Tag $tone={warehouse.estado ? 'ok' : 'off'}>{warehouse.estado ? 'Activo' : 'Inactivo'}</Tag>
                          </td>
                          <td className="hide-mobile">{formatDateTime(warehouse.createdAt)}</td>
                          <td className="actions">
                            <TableActions>
                              <GhostButton type="button" onClick={() => setSelectedWarehouseId(warehouse.id)}>
                                Inventario
                              </GhostButton>
                              <GhostButton type="button" onClick={() => handleStartEditWarehouse(warehouse)}>
                                Editar
                              </GhostButton>
                              <DangerButton
                                type="button"
                                onClick={() => handleDeleteWarehouse(warehouse)}
                                disabled={deleteStatus === 'submitting' && deletingWarehouseId === warehouse.id}
                              >
                                {deleteStatus === 'submitting' && deletingWarehouseId === warehouse.id
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
              </ActiveWarehousePanel>

              {selectedWarehouse && (
                <>
                  <SectionHeader>
                    <SectionTitle>Inventario de almacen: {selectedWarehouse.nombre}</SectionTitle>
                    <SectionHeaderActions>
                      <SectionMeta>
                        {inventorySummary.items} items | Stock total {inventorySummary.stock.toFixed(2)}
                      </SectionMeta>
                    </SectionHeaderActions>
                  </SectionHeader>

                  <SummaryGrid>
                    <SummaryCard>
                      <p>Productos registrados</p>
                      <strong>{inventorySummary.items}</strong>
                    </SummaryCard>
                    <SummaryCard>
                      <p>Stock total</p>
                      <strong>{inventorySummary.stock.toFixed(2)}</strong>
                    </SummaryCard>
                    <SummaryCard>
                      <p>Bajo stock</p>
                      <strong>{inventorySummary.lowStock}</strong>
                    </SummaryCard>
                    <SummaryCard>
                      <p>Movimientos</p>
                      <strong>{inventorySummary.movements}</strong>
                    </SummaryCard>
                  </SummaryGrid>

                  {inventorySummary.lowStock > 0 && (
                    <StatusState
                      kind="info"
                      message="Hay productos con stock bajo en este almacen. Revisa niveles minimos o programa reabastecimiento."
                    />
                  )}

                  <FormGrid onSubmit={handleSubmitInventory}>
                    <Fields>
                      <Field>
                        Producto
                        <SelectControl
                          value={inventoryForm.productId}
                          onChange={(event) => setInventoryForm((prev) => ({ ...prev, productId: event.target.value }))}
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
                        Cantidad actual
                        <InputControl
                          inputMode="decimal"
                          value={inventoryForm.currentQty}
                          onChange={(event) => setInventoryForm((prev) => ({ ...prev, currentQty: event.target.value }))}
                          placeholder="Ej: 25"
                        />
                      </Field>
                      <Field>
                        Cantidad minima
                        <InputControl
                          inputMode="decimal"
                          value={inventoryForm.minQty}
                          onChange={(event) => setInventoryForm((prev) => ({ ...prev, minQty: event.target.value }))}
                          placeholder="Ej: 5"
                        />
                      </Field>
                    </Fields>

                    {(inventoryFormError || friendlyInventoryError || friendlyInventorySaveError || friendlyInventoryDeleteError) && (
                      <StatusState
                        kind={
                          inventoryFormError
                            ? 'error'
                            : isSetupError(inventoryError ?? saveError ?? deleteInventoryError)
                              ? 'info'
                              : 'error'
                        }
                        message={
                          inventoryFormError ??
                          friendlyInventoryError ??
                          friendlyInventorySaveError ??
                          friendlyInventoryDeleteError ??
                          'Error inesperado.'
                        }
                      />
                    )}
                    {saveStatus === 'success' && <StatusState kind="info" message="Inventario del almacen guardado." />}
                    {deleteInventoryStatus === 'success' && (
                      <StatusState kind="info" message="Fila de inventario eliminada." />
                    )}

                    <ButtonsRow>
                      <PrimaryButton type="submit" disabled={saveStatus === 'submitting'}>
                        {saveStatus === 'submitting'
                          ? 'Guardando inventario...'
                          : editingInventoryId
                            ? 'Guardar cambios'
                            : 'Registrar inventario'}
                      </PrimaryButton>
                      {editingInventoryId && (
                        <GhostButton type="button" onClick={handleCancelEditInventory}>
                          Cancelar edicion
                        </GhostButton>
                      )}
                      <GhostButton type="button" onClick={() => reloadInventory()}>
                        Actualizar inventario
                      </GhostButton>
                    </ButtonsRow>
                  </FormGrid>

                  {inventoryStatus === 'loading' && <StatusState kind="loading" message="Cargando inventario del almacen..." />}
                  {inventoryStatus === 'success' && inventory.length === 0 && (
                    <StatusState kind="empty" message="Aun no hay productos en este almacen." />
                  )}

                  {inventory.length > 0 && (
                    <TableWrap>
                      <DataTable>
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th className="hide-mobile">Codigo</th>
                            <th className="num">Actual</th>
                            <th className="num">Minimo</th>
                            <th className="hide-mobile">Actualizado</th>
                            <th className="actions">Gestion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.map((item) => (
                            <tr key={item.id}>
                              <td>{item.productoNombre}</td>
                              <td className="hide-mobile">{item.codigoBarra ?? '-'}</td>
                              <td className="num">{item.cantidadActual.toFixed(2)}</td>
                              <td className="num">{item.cantidadMinima.toFixed(2)}</td>
                              <td className="hide-mobile">{formatDateTime(item.updatedAt)}</td>
                              <td className="actions">
                                <TableActions>
                                  <GhostButton
                                    type="button"
                                    onClick={() =>
                                      handleStartEditInventory({
                                        id: item.id,
                                        productoId: item.productoId,
                                        cantidadActual: item.cantidadActual,
                                        cantidadMinima: item.cantidadMinima,
                                      })
                                    }
                                  >
                                    Editar
                                  </GhostButton>
                                  <DangerButton
                                    type="button"
                                    onClick={() =>
                                      handleDeleteInventory({
                                        inventarioId: item.id,
                                        productoId: item.productoId,
                                        productoNombre: item.productoNombre,
                                      })
                                    }
                                    disabled={deleteInventoryStatus === 'submitting' && deletingInventoryId === item.id}
                                  >
                                    {deleteInventoryStatus === 'submitting' && deletingInventoryId === item.id
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

                  <SectionHeader>
                    <SectionTitle>Movimientos del almacen</SectionTitle>
                    <SectionHeaderActions>
                      <SectionMeta>{movements.length} registros</SectionMeta>
                    </SectionHeaderActions>
                  </SectionHeader>

                  {movements.length === 0 && (
                    <StatusState kind="empty" message="Aun no hay movimientos en este almacen." />
                  )}

                  {movements.length > 0 && (
                    <TableWrap>
                      <DataTable>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Producto</th>
                            <th className="num">Cantidad</th>
                            <th className="hide-mobile">Motivo</th>
                            <th className="hide-mobile">Origen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movements.map((movement) => (
                            <tr key={movement.id}>
                              <td>{formatDateTime(movement.fecha)}</td>
                              <td>
                                <Tag
                                  $tone={
                                    movement.tipoMovimiento === 'ENTRADA'
                                      ? 'ok'
                                      : movement.tipoMovimiento === 'SALIDA'
                                        ? 'warn'
                                        : 'off'
                                  }
                                >
                                  {movement.tipoMovimiento}
                                </Tag>
                              </td>
                              <td>{movement.productoNombre}</td>
                              <td className="num">{movement.cantidad.toFixed(2)}</td>
                              <td className="hide-mobile">{movement.motivo ?? '-'}</td>
                              <td className="hide-mobile">{movement.origenTipo ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </DataTable>
                    </TableWrap>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </SectionCard>
  );
}
