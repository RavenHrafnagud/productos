/**
 * Hook de ventas.
 * Maneja carga, registro, edicion y anulacion de ventas para el panel.
 */
import { useCallback, useEffect, useState } from 'react';
import { annulSale, createSale, listSales, updateSale } from '../api/salesRepository';
import type { CreateSaleInput, SaleRecord, UpdateSaleInput } from '../types/Sale';

interface UseSalesResult {
  sales: SaleRecord[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  updateStatus: 'idle' | 'submitting' | 'success' | 'error';
  updateError: string | null;
  annulStatus: 'idle' | 'submitting' | 'success' | 'error';
  annulError: string | null;
  reload: () => Promise<void>;
  addSale: (input: CreateSaleInput) => Promise<void>;
  editSale: (saleId: string, input: UpdateSaleInput) => Promise<void>;
  cancelSale: (saleId: string) => Promise<void>;
}

export function useSales(refreshKey: number): UseSalesResult {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [status, setStatus] = useState<UseSalesResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<UseSalesResult['createStatus']>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UseSalesResult['updateStatus']>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [annulStatus, setAnnulStatus] = useState<UseSalesResult['annulStatus']>('idle');
  const [annulError, setAnnulError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const rows = await listSales();
      setSales(rows);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudieron cargar ventas.');
    }
  }, []);

  const addSale = useCallback(async (input: CreateSaleInput) => {
    setCreateStatus('submitting');
    setCreateError(null);
    try {
      const createdRows = await createSale(input);
      setSales((prev) => [...createdRows, ...prev]);
      setCreateStatus('success');
    } catch (err) {
      setCreateStatus('error');
      setCreateError(err instanceof Error ? err.message : 'No se pudo registrar la venta.');
      throw err;
    }
  }, []);

  const editSale = useCallback(async (saleId: string, input: UpdateSaleInput) => {
    setUpdateStatus('submitting');
    setUpdateError(null);
    try {
      const updated = await updateSale(saleId, input);
      setSales((prev) => prev.map((sale) => (sale.id === saleId ? updated : sale)));
      setUpdateStatus('success');
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(err instanceof Error ? err.message : 'No se pudo actualizar la venta.');
      throw err;
    }
  }, []);

  const cancelSale = useCallback(async (saleId: string) => {
    setAnnulStatus('submitting');
    setAnnulError(null);
    try {
      const updated = await annulSale(saleId);
      setSales((prev) => prev.map((sale) => (sale.id === saleId ? updated : sale)));
      setAnnulStatus('success');
    } catch (err) {
      setAnnulStatus('error');
      setAnnulError(err instanceof Error ? err.message : 'No se pudo anular la venta.');
      throw err;
    }
  }, []);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload, refreshKey]);

  return {
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
  };
}
