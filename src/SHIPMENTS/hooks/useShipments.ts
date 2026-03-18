/**
 * Hook de envios.
 * Maneja carga y creacion de envios con estado de UI.
 */
import { useCallback, useEffect, useState } from 'react';
import { createShipment, listShipments, updateShipmentStatus } from '../api/shipmentRepository';
import type { CreateShipmentInput, ShipmentRecord, UpdateShipmentStatusInput } from '../types/Shipment';

interface UseShipmentsResult {
  shipments: ShipmentRecord[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  updateStatus: 'idle' | 'submitting' | 'success' | 'error';
  updateError: string | null;
  reload: () => Promise<void>;
  addShipment: (input: CreateShipmentInput) => Promise<void>;
  editShipmentStatus: (input: UpdateShipmentStatusInput) => Promise<void>;
}

export function useShipments(refreshKey: number): UseShipmentsResult {
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [status, setStatus] = useState<UseShipmentsResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<UseShipmentsResult['createStatus']>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UseShipmentsResult['updateStatus']>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const rows = await listShipments();
      setShipments(rows);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los envios.');
    }
  }, []);

  const addShipment = useCallback(async (input: CreateShipmentInput) => {
    setCreateStatus('submitting');
    setCreateError(null);
    try {
      const created = await createShipment(input);
      setShipments((prev) => [created, ...prev]);
      setCreateStatus('success');
    } catch (err) {
      setCreateStatus('error');
      setCreateError(err instanceof Error ? err.message : 'No se pudo registrar el envio.');
      throw err;
    }
  }, []);

  const editShipmentStatus = useCallback(async (input: UpdateShipmentStatusInput) => {
    setUpdateStatus('submitting');
    setUpdateError(null);
    try {
      const updated = await updateShipmentStatus(input);
      setShipments((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setUpdateStatus('success');
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del envio.');
      throw err;
    }
  }, []);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload, refreshKey]);

  return {
    shipments,
    status,
    error,
    createStatus,
    createError,
    updateStatus,
    updateError,
    reload,
    addShipment,
    editShipmentStatus,
  };
}
