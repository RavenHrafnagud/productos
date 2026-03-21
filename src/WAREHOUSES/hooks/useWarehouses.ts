/**
 * Hook de almacenes para CRUD.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  updateWarehouse,
} from '../api/warehouseRepository';
import type { CreateWarehouseInput, UpdateWarehouseInput, Warehouse } from '../types/Warehouse';

interface UseWarehousesResult {
  warehouses: Warehouse[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  updateStatus: 'idle' | 'submitting' | 'success' | 'error';
  updateError: string | null;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  reload: () => Promise<void>;
  addWarehouse: (input: CreateWarehouseInput) => Promise<Warehouse>;
  editWarehouse: (warehouseId: string, input: UpdateWarehouseInput) => Promise<Warehouse>;
  removeWarehouse: (warehouseId: string) => Promise<void>;
}

export function useWarehouses(refreshKey: number, enabled = true): UseWarehousesResult {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [status, setStatus] = useState<UseWarehousesResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<UseWarehousesResult['createStatus']>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UseWarehousesResult['updateStatus']>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<UseWarehousesResult['deleteStatus']>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const rows = await listWarehouses();
      setWarehouses(rows);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudieron cargar almacenes.');
    }
  }, []);

  const addWarehouse = useCallback(async (input: CreateWarehouseInput) => {
    setCreateStatus('submitting');
    setCreateError(null);
    try {
      const created = await createWarehouse(input);
      setWarehouses((prev) => [created, ...prev]);
      setCreateStatus('success');
      return created;
    } catch (err) {
      setCreateStatus('error');
      const msg = err instanceof Error ? err.message : 'No se pudo crear el almacen.';
      setCreateError(msg);
      throw new Error(msg);
    }
  }, []);

  const editWarehouse = useCallback(async (warehouseId: string, input: UpdateWarehouseInput) => {
    setUpdateStatus('submitting');
    setUpdateError(null);
    try {
      const updated = await updateWarehouse(warehouseId, input);
      setWarehouses((prev) => prev.map((row) => (row.id === warehouseId ? updated : row)));
      setUpdateStatus('success');
      return updated;
    } catch (err) {
      setUpdateStatus('error');
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el almacen.';
      setUpdateError(msg);
      throw new Error(msg);
    }
  }, []);

  const removeWarehouse = useCallback(async (warehouseId: string) => {
    setDeleteStatus('submitting');
    setDeleteError(null);
    try {
      await deleteWarehouse(warehouseId);
      setWarehouses((prev) => prev.filter((row) => row.id !== warehouseId));
      setDeleteStatus('success');
    } catch (err) {
      setDeleteStatus('error');
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar el almacen.';
      setDeleteError(msg);
      throw new Error(msg);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setWarehouses([]);
      setStatus('idle');
      setError(null);
      return;
    }
    reload().catch(() => undefined);
  }, [enabled, reload, refreshKey]);

  return {
    warehouses,
    status,
    error,
    createStatus,
    createError,
    updateStatus,
    updateError,
    deleteStatus,
    deleteError,
    reload,
    addWarehouse,
    editWarehouse,
    removeWarehouse,
  };
}
