/**
 * Seccion de inventario.
 * Permite cargar stock inicial y visualizar disponibilidad de cada producto.
 */
import { FormEvent, useMemo, useState } from 'react';
import type { Branch } from '../../BRANCHES/types/Branch';
import { useProducts } from '../../PRODUCTS/hooks/useProducts';
import { formatDateTime } from '../../SHARED/utils/format';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { toPositiveNumber } from '../../SHARED/utils/validators';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
import {
  ButtonsRow,
  DangerButton,
  Divider,
  Field,
  FormGrid,
  GhostButton,
  InputControl,
  PrimaryButton,
  SelectControl,
} from '../../SHARED/ui/FormControls';
import { SectionCard, SectionHeader, SectionMeta, SectionTitle } from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';
import { useInventory } from '../hooks/useInventory';

interface InventorySectionProps {
  branchId: string;
  branches: Branch[];
  onBranchChange: (branchId: string) => void;
  refreshKey: number;
}

interface InventoryForm {
  productId: string;
  currentQty: string;
  minQty: string;
}

const EMPTY_FORM: InventoryForm = {
  productId: '',
  currentQty: '',
  minQty: '',
};

export function InventorySection({ branchId, branches, onBranchChange, refreshKey }: InventorySectionProps) {
  const { products } = useProducts(refreshKey);
  const {
    inventory,
    movements,
    status,
    error,
    saveStatus,
    saveError,
    deleteStatus,
    deleteError,
    saveRow,
    removeRow,
    reload,
  } = useInventory(
    branchId,
    refreshKey,
  );
  const [form, setForm] = useState<InventoryForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [deletingInventoryId, setDeletingInventoryId] = useState<string | null>(null);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'inventario');
  const friendlySaveError = toFriendlySupabaseMessage(saveError, 'inventario');
  const friendlyDeleteError = toFriendlySupabaseMessage(deleteError, 'inventario');

  const productOptions = useMemo(
    () => products.filter((product) => product.estado).map((product) => ({ id: product.id, name: product.nombre })),
    [products],
  );
  const branchOptions = useMemo(
    () =>
      branches
        .filter((branch) => branch.estado)
        .map((branch) => ({ id: branch.id, name: branch.nombre })),
    [branches],
  );
  const selectedBranchName = useMemo(
    () => branches.find((branch) => branch.id === branchId)?.nombre ?? '',
    [branchId, branches],
  );
  const branchesById = useMemo(
    () =>
      new Map(
        branches.map((branch) => [branch.id, branch.nombre]),
      ),
    [branches],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!branchId) {
      setFormError('Selecciona una sucursal antes de cargar inventario.');
      return;
    }

    const cantidadActual = toPositiveNumber(form.currentQty);
    const cantidadMinima = toPositiveNumber(form.minQty);

    if (!form.productId) {
      setFormError('Debes seleccionar un producto.');
      return;
    }
    if (cantidadActual === null || cantidadMinima === null) {
      setFormError('Las cantidades deben ser numericas y mayores o iguales a cero.');
      return;
    }

    try {
      await saveRow({
        productoId: form.productId,
        sucursalId: branchId,
        cantidadActual,
        cantidadMinima,
      });
      setForm(EMPTY_FORM);
      setEditingInventoryId(null);
    } catch {
      // El error principal se comunica con saveError.
    }
  };

  const handleStartEditInventory = (item: {
    id: string;
    productoId: string;
    cantidadActual: number;
    cantidadMinima: number;
  }) => {
    // Carga los datos de la fila seleccionada para edicion en el formulario.
    setEditingInventoryId(item.id);
    setFormError(null);
    setForm({
      productId: item.productoId,
      currentQty: String(item.cantidadActual),
      minQty: String(item.cantidadMinima),
    });
  };

  const handleCancelEditInventory = () => {
    setEditingInventoryId(null);
    setFormError(null);
    setForm(EMPTY_FORM);
  };

  const handleDeleteInventory = async (input: {
    inventarioId: string;
    productoId: string;
    sucursalId: string;
    productoNombre: string;
  }) => {
    const confirmation = window.confirm(
      `Vas a eliminar el inventario de "${input.productoNombre}" para esta sucursal. Esta accion no se puede deshacer. Deseas continuar?`,
    );
    if (!confirmation) return;

    setDeletingInventoryId(input.inventarioId);
    try {
      await removeRow({
        inventarioId: input.inventarioId,
        productoId: input.productoId,
        sucursalId: input.sucursalId,
      });
    } finally {
      setDeletingInventoryId(null);
    }
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Inventario</SectionTitle>
        <SectionMeta>
          {branchId && selectedBranchName
            ? `Sucursal activa: ${selectedBranchName}`
            : 'Sin sucursal activa'}
        </SectionMeta>
      </SectionHeader>

      <FormGrid onSubmit={handleSubmit}>
        <Field>
          Sucursal
          <SelectControl value={branchId} onChange={(event) => onBranchChange(event.target.value)}>
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
            value={form.productId}
            onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
            disabled={Boolean(editingInventoryId)}
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
          Cantidad disponible
          <InputControl
            inputMode="decimal"
            value={form.currentQty}
            onChange={(event) => setForm((prev) => ({ ...prev, currentQty: event.target.value }))}
            placeholder="100"
            required
          />
        </Field>

        <Field>
          Cantidad minima recomendada
          <InputControl
            inputMode="decimal"
            value={form.minQty}
            onChange={(event) => setForm((prev) => ({ ...prev, minQty: event.target.value }))}
            placeholder="10"
            required
          />
        </Field>

        {(formError || friendlySaveError) && (
          <StatusState
            kind={formError ? 'error' : isSetupError(saveError) ? 'info' : 'error'}
            message={formError ?? friendlySaveError ?? 'Error inesperado.'}
          />
        )}
        {saveStatus === 'success' && <StatusState kind="info" message="Inventario actualizado." />}
        {(friendlyDeleteError || deleteStatus === 'success') && (
          <StatusState
            kind={friendlyDeleteError ? 'error' : 'info'}
            message={friendlyDeleteError ?? 'Inventario eliminado correctamente.'}
          />
        )}

        <ButtonsRow>
          <PrimaryButton type="submit" disabled={saveStatus === 'submitting'}>
            {saveStatus === 'submitting'
              ? 'Guardando...'
              : editingInventoryId
                ? 'Guardar cambios'
                : 'Guardar stock'}
          </PrimaryButton>
          {editingInventoryId && (
            <GhostButton type="button" onClick={handleCancelEditInventory}>
              Cancelar edicion
            </GhostButton>
          )}
          <GhostButton type="button" onClick={() => reload()}>
            Actualizar lista
          </GhostButton>
        </ButtonsRow>
      </FormGrid>

      <Divider />

      {!branchId && <StatusState kind="info" message="Primero selecciona o crea una sucursal." />}
      {branchId && status === 'loading' && <StatusState kind="loading" message="Cargando inventario..." />}
      {branchId && status === 'error' && (
        <StatusState
          kind={isSetupError(error) ? 'info' : 'error'}
          message={friendlyLoadError ?? 'Error inesperado.'}
        />
      )}
      {branchId && status === 'success' && inventory.length === 0 && (
        <StatusState
          kind="empty"
          message="Primero crea productos y luego carga las existencias iniciales."
        />
      )}

      {branchId && status === 'success' && inventory.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Codigo</th>
                <th>Disponible</th>
                <th>Minimo</th>
                <th>Estado</th>
                <th>Actualizado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const lowStock = item.cantidadActual <= item.cantidadMinima;
                return (
                  <tr key={item.id}>
                    <td>{item.productoNombre}</td>
                    <td>{item.codigoBarra ?? 'Sin codigo'}</td>
                    <td>{item.cantidadActual}</td>
                    <td>{item.cantidadMinima}</td>
                    <td>
                      <Tag $tone={lowStock ? 'warn' : 'ok'}>{lowStock ? 'Bajo' : 'Estable'}</Tag>
                    </td>
                    <td>{formatDateTime(item.updatedAt)}</td>
                    <td>
                      <ButtonsRow>
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
                          disabled={deleteStatus === 'submitting' || saveStatus === 'submitting'}
                        >
                          Editar
                        </GhostButton>
                        <DangerButton
                          type="button"
                          onClick={() =>
                            handleDeleteInventory({
                              inventarioId: item.id,
                              productoId: item.productoId,
                              sucursalId: item.sucursalId,
                              productoNombre: item.productoNombre,
                            })
                          }
                          disabled={deleteStatus === 'submitting' || saveStatus === 'submitting'}
                        >
                          {deleteStatus === 'submitting' && deletingInventoryId === item.id
                            ? 'Eliminando...'
                            : 'Eliminar'}
                        </DangerButton>
                      </ButtonsRow>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </TableWrap>
      )}

      {branchId && status === 'success' && (
        <>
          <Divider />
          <SectionHeader>
            <SectionTitle>Movimientos recientes</SectionTitle>
            <SectionMeta>{movements.length} registrados</SectionMeta>
          </SectionHeader>

          {movements.length === 0 && (
            <StatusState kind="empty" message="Aun no hay movimientos para esta sucursal." />
          )}

          {movements.length > 0 && (
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Sucursal</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const tone =
                      movement.tipoMovimiento === 'ENTRADA'
                        ? 'ok'
                        : movement.tipoMovimiento === 'SALIDA'
                          ? 'warn'
                          : 'off';
                    return (
                      <tr key={movement.id}>
                        <td>{formatDateTime(movement.fecha)}</td>
                        <td>{branchesById.get(movement.sucursalId) ?? 'Sucursal no encontrada'}</td>
                        <td>{movement.productoNombre}</td>
                        <td>
                          <Tag $tone={tone}>{movement.tipoMovimiento}</Tag>
                        </td>
                        <td>{movement.cantidad}</td>
                        <td>{movement.motivo ?? 'Sin motivo'}</td>
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
