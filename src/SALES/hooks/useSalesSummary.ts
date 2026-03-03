/**
 * Hook de resumen de ventas por local.
 */
import { useEffect, useState } from 'react';
import { getSalesSummary } from '../api/salesRepository';
import type { SalesSummary } from '../types/SalesSummary';

interface UseSalesSummaryResult {
  summary: SalesSummary | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

export function useSalesSummary(localId: string, refreshKey: number): UseSalesSummaryResult {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [status, setStatus] = useState<UseSalesSummaryResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!localId.trim()) {
      setSummary(null);
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
        const next = await getSalesSummary(localId);
        if (!mounted) return;
        setSummary(next);
        setStatus('success');
      } catch (err) {
        if (!mounted) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No se pudo cargar ventas.');
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [localId, refreshKey]);

  return { summary, status, error };
}
