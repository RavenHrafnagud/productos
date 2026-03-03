/**
 * Hook de consulta de inventario por local.
 */
import { useEffect, useState } from 'react';
import { listInventoryByLocal } from '../api/inventoryRepository';
import type { InventoryItem } from '../types/InventoryItem';

interface UseInventoryResult {
  inventory: InventoryItem[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

export function useInventory(localId: string, refreshKey: number): UseInventoryResult {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [status, setStatus] = useState<UseInventoryResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!localId.trim()) {
      setInventory([]);
      setStatus('idle');
      setError(null);
      return () => {
        mounted = false;
      };
    }

    const run = async () => {
      setStatus('loading');
      setError(null);
      try {
        const rows = await listInventoryByLocal(localId);
        if (!mounted) return;
        setInventory(rows);
        setStatus('success');
      } catch (err) {
        if (!mounted) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No se pudo cargar inventario.');
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [localId, refreshKey]);

  return { inventory, status, error };
}
