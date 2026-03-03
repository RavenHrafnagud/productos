/**
 * Hook de sucursales.
 * Gestiona estado de carga y creacion para poblar una base vacia.
 */
import { useCallback, useEffect, useState } from 'react';
import { createBranch, listBranches } from '../api/branchRepository';
import type { Branch, CreateBranchInput } from '../types/Branch';

interface UseBranchesResult {
  branches: Branch[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  reload: () => Promise<void>;
  addBranch: (input: CreateBranchInput) => Promise<Branch>;
}

export function useBranches(refreshKey: number): UseBranchesResult {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [status, setStatus] = useState<UseBranchesResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<UseBranchesResult['createStatus']>('idle');
  const [createError, setCreateError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const rows = await listBranches();
      setBranches(rows);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No fue posible cargar sucursales.');
    }
  }, []);

  const addBranch = useCallback(async (input: CreateBranchInput) => {
    setCreateStatus('submitting');
    setCreateError(null);
    try {
      const nextBranch = await createBranch(input);
      setCreateStatus('success');
      setBranches((prev) => [nextBranch, ...prev]);
      return nextBranch;
    } catch (err) {
      setCreateStatus('error');
      const msg = err instanceof Error ? err.message : 'No se pudo crear la sucursal.';
      setCreateError(msg);
      throw new Error(msg);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload, refreshKey]);

  return { branches, status, error, createStatus, createError, reload, addBranch };
}
