/**
 * Hook de inventario por sucursal.
 * Administra lectura y registro de stock desde la interfaz.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  deleteInventoryRow,
  listInventoryByBranch,
  listMovementsByBranch,
  saveInventory,
} from '../api/inventoryRepository';
import type { InventoryItem, InventoryMovement, SaveInventoryInput } from '../types/InventoryItem';

interface UseInventoryResult {
  inventory: InventoryItem[];
  movements: InventoryMovement[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  saveStatus: 'idle' | 'submitting' | 'success' | 'error';
  saveError: string | null;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  reload: () => Promise<void>;
  saveRow: (input: SaveInventoryInput) => Promise<void>;
  removeRow: (input: { inventarioId: string; productoId: string; sucursalId: string }) => Promise<void>;
}

export function useInventory(branchId: string, refreshKey: number): UseInventoryResult {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [status, setStatus] = useState<UseInventoryResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<UseInventoryResult['saveStatus']>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<UseInventoryResult['deleteStatus']>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!branchId.trim()) {
      setInventory([]);
      setMovements([]);
      setStatus('idle');
      setError(null);
      return;
    }

    setStatus('loading');
    setError(null);
    try {
      const [inventoryRows, movementRows] = await Promise.all([
        listInventoryByBranch(branchId),
        listMovementsByBranch(branchId),
      ]);
      setInventory(inventoryRows);
      setMovements(movementRows);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudo cargar inventario.');
    }
  }, [branchId]);

  const saveRow = useCallback(
    async (input: SaveInventoryInput) => {
      setSaveStatus('submitting');
      setSaveError(null);
      try {
        await saveInventory(input);
        setSaveStatus('success');
        await reload();
      } catch (err) {
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el inventario.');
        throw err;
      }
    },
    [reload],
  );

  const removeRow = useCallback(
    async (input: { inventarioId: string; productoId: string; sucursalId: string }) => {
      setDeleteStatus('submitting');
      setDeleteError(null);
      try {
        await deleteInventoryRow(input);
        setDeleteStatus('success');
        await reload();
      } catch (err) {
        setDeleteStatus('error');
        setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el registro de inventario.');
        throw err;
      }
    },
    [reload],
  );

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload, refreshKey]);

  return {
    inventory,
    movements,
    status,
    error,
    saveStatus,
    saveError,
    deleteStatus,
    deleteError,
    reload,
    saveRow,
    removeRow,
  };
}
