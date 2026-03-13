/**
 * Seccion de inventario.
 * Permite cargar stock inicial y visualizar disponibilidad de cada producto.
 */
import { FormEvent, useMemo, useState } from 'react';
import styled from 'styled-components';
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
  Fields,
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

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
`;

const SummaryCard = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 18px rgba(12, 26, 20, 0.06);

  p {
    margin: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  strong {
    display: block;
    margin-top: 4px;
    font-size: 1.05rem;
  }
`;

const TableActions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const BranchPanel = styled.section`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: 12px;
  background: linear-gradient(140deg, #ffffff 0%, #f2faf6 100%);
  box-shadow: 0 12px 22px rgba(12, 26, 20, 0.08);
`;

const BranchPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const BranchPanelTitle = styled.p`
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.2px;
`;

const BranchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;

  @media (max-width: 680px) {
    grid-auto-flow: column;
    grid-auto-columns: minmax(200px, 1fr);
    overflow-x: auto;
    padding-bottom: 6px;
  }
`;

const BranchCard = styled.button<{ $active?: boolean; $disabled?: boolean }>`
  text-align: left;
  border-radius: var(--radius-sm);
  border: 1px solid ${({ $active }) => ($active ? '#7bc2a1' : 'var(--border-soft)')};
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #e3f7ed 0%, #d6f1e2 100%)' : '#ffffff'};
  padding: 10px 12px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  color: var(--text-main);
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  :hover {
    transform: ${({ $disabled }) => ($disabled ? 'none' : 'translateY(-1px)')};
    box-shadow: ${({ $disabled }) => ($disabled ? 'none' : '0 10px 18px rgba(12, 26, 20, 0.08)')};
  }

  strong {
    display: block;
    font-size: 0.95rem;
  }

  span {
    display: block;
    color: var(--text-muted);
    font-size: 0.78rem;
    margin-top: 2px;
  }
`;

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
  const summary = useMemo(() => {
    const total = inventory.length;
    const lowStock = inventory.filter((item) => item.cantidadActual <= item.cantidadMinima).length;
    const healthy = total - lowStock;
    const movimientos = movements.length;
    return { total, lowStock, healthy, movimientos };
  }, [inventory, movements]);

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
            : 'Sucursal no seleccionada'}
        </SectionMeta>
      </SectionHeader>

      <SummaryGrid>
        <SummaryCard>
          <p>Items en inventario</p>
          <strong>{summary.total}</strong>
        </SummaryCard>
        <SummaryCard>
          <p>Stock estable</p>
          <strong>{summary.healthy}</strong>
        </SummaryCard>
        <SummaryCard>
          <p>Bajo stock</p>
          <strong>{summary.lowStock}</strong>
        </SummaryCard>
        <SummaryCard>
          <p>Movimientos</p>
          <strong>{summary.movimientos}</strong>
        </SummaryCard>
      </SummaryGrid>

      <BranchPanel>
        <BranchPanelHeader>
          <BranchPanelTitle>Sucursales disponibles</BranchPanelTitle>
          <SectionMeta>
            {branchOptions.length} activas · {branchId ? 'Sucursal seleccionada' : 'Sin seleccion'}
          </SectionMeta>
        </BranchPanelHeader>
        <BranchGrid>
          {branches.map((branch) => {
            const isActive = branch.id === branchId;
            return (
              <BranchCard
                key={branch.id}
                type="button"
                $active={isActive}
                $disabled={!branch.estado}
                onClick={() => {
                  if (!branch.estado) return;
                  onBranchChange(branch.id);
                }}
              >
                <strong>{branch.nombre}</strong>
                <span>{branch.ciudad ?? 'Ciudad sin definir'}</span>
                <span>{branch.localidad ?? 'Localidad sin definir'}</span>
                <Tag $tone={branch.estado ? 'ok' : 'off'}>{branch.estado ? 'Activa' : 'Inactiva'}</Tag>
              </BranchCard>
            );
          })}
        </BranchGrid>
      </BranchPanel>

      <FormGrid onSubmit={handleSubmit}>
        <Fields>
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
              placeholder="Ej: 100"
              required
            />
          </Field>

          <Field>
            Cantidad minima recomendada
            <InputControl
              inputMode="decimal"
              value={form.minQty}
              onChange={(event) => setForm((prev) => ({ ...prev, minQty: event.target.value }))}
              placeholder="Ej: 10"
              required
            />
          </Field>
        </Fields>

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

      {!branchId && <StatusState kind="info" message="Selecciona una sucursal para ver su inventario." />}
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
          message="No hay inventario cargado para esta sucursal. Registra las existencias iniciales."
        />
      )}

      {branchId && status === 'success' && inventory.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="hide-mobile">Codigo</th>
                <th className="num">Disponible</th>
                <th className="num">Minimo</th>
                <th>Estado</th>
                <th className="hide-mobile">Actualizado</th>
                <th className="actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const lowStock = item.cantidadActual <= item.cantidadMinima;
                return (
                  <tr key={item.id}>
                    <td>{item.productoNombre}</td>
                    <td className="hide-mobile">{item.codigoBarra ?? 'Sin codigo'}</td>
                    <td className="num">{item.cantidadActual}</td>
                    <td className="num">{item.cantidadMinima}</td>
                    <td>
                      <Tag $tone={lowStock ? 'warn' : 'ok'}>{lowStock ? 'Bajo' : 'Estable'}</Tag>
                    </td>
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
                      </TableActions>
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
            <StatusState kind="empty" message="Sin movimientos para esta sucursal por ahora." />
          )}

          {movements.length > 0 && (
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th className="hide-mobile">Sucursal</th>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th className="num">Cantidad</th>
                    <th className="hide-mobile">Motivo</th>
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
                        <td className="hide-mobile">{branchesById.get(movement.sucursalId) ?? 'Sucursal no encontrada'}</td>
                        <td>{movement.productoNombre}</td>
                        <td>
                          <Tag $tone={tone}>{movement.tipoMovimiento}</Tag>
                        </td>
                        <td className="num">{movement.cantidad}</td>
                        <td className="hide-mobile">{movement.motivo ?? 'Sin motivo'}</td>
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
