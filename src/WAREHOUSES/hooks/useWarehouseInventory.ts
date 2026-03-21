/**
 * Hook de inventario por almacen.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  deleteWarehouseInventoryRow,
  listWarehouseInventory,
  listWarehouseMovements,
  saveWarehouseInventory,
} from '../api/warehouseRepository';
import type {
  SaveWarehouseInventoryInput,
  WarehouseInventoryItem,
  WarehouseMovement,
} from '../types/Warehouse';

interface UseWarehouseInventoryResult {
  inventory: WarehouseInventoryItem[];
  movements: WarehouseMovement[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  saveStatus: 'idle' | 'submitting' | 'success' | 'error';
  saveError: string | null;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  reload: () => Promise<void>;
  saveRow: (input: SaveWarehouseInventoryInput) => Promise<void>;
  removeRow: (input: { inventarioId: string; almacenId: string; productoId: string }) => Promise<void>;
}

export function useWarehouseInventory(warehouseId: string, refreshKey: number): UseWarehouseInventoryResult {
  const [inventory, setInventory] = useState<WarehouseInventoryItem[]>([]);
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const [status, setStatus] = useState<UseWarehouseInventoryResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<UseWarehouseInventoryResult['saveStatus']>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<UseWarehouseInventoryResult['deleteStatus']>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!warehouseId.trim()) {
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
        listWarehouseInventory(warehouseId),
        listWarehouseMovements(warehouseId),
      ]);
      setInventory(inventoryRows);
      setMovements(movementRows);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudo cargar inventario del almacen.');
    }
  }, [warehouseId]);

  const saveRow = useCallback(
    async (input: SaveWarehouseInventoryInput) => {
      setSaveStatus('submitting');
      setSaveError(null);
      try {
        await saveWarehouseInventory(input);
        setSaveStatus('success');
        await reload();
      } catch (err) {
        setSaveStatus('error');
        setSaveError(err instanceof Error ? err.message : 'No se pudo guardar inventario de almacen.');
        throw err;
      }
    },
    [reload],
  );

  const removeRow = useCallback(
    async (input: { inventarioId: string; almacenId: string; productoId: string }) => {
      setDeleteStatus('submitting');
      setDeleteError(null);
      try {
        await deleteWarehouseInventoryRow(input);
        setDeleteStatus('success');
        await reload();
      } catch (err) {
        setDeleteStatus('error');
        setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar inventario de almacen.');
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

