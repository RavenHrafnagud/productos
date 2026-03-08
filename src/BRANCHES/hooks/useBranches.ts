/**
 * Hook de sucursales.
 * Gestiona estado de carga y creacion para poblar una base vacia.
 */
import { useCallback, useEffect, useState } from 'react';
import { createBranch, deleteBranch, listBranches, updateBranch } from '../api/branchRepository';
import type { Branch, CreateBranchInput, UpdateBranchInput } from '../types/Branch';

interface UseBranchesResult {
  branches: Branch[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  updateStatus: 'idle' | 'submitting' | 'success' | 'error';
  updateError: string | null;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  reload: () => Promise<void>;
  addBranch: (input: CreateBranchInput) => Promise<Branch>;
  editBranch: (branchId: string, input: UpdateBranchInput) => Promise<Branch>;
  removeBranch: (branchId: string) => Promise<void>;
}

export function useBranches(refreshKey: number): UseBranchesResult {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [status, setStatus] = useState<UseBranchesResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<UseBranchesResult['createStatus']>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UseBranchesResult['updateStatus']>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<UseBranchesResult['deleteStatus']>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const removeBranch = useCallback(async (branchId: string) => {
    setDeleteStatus('submitting');
    setDeleteError(null);
    try {
      await deleteBranch(branchId);
      setDeleteStatus('success');
      setBranches((prev) => prev.filter((branch) => branch.id !== branchId));
    } catch (err) {
      setDeleteStatus('error');
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar la sucursal.';
      setDeleteError(msg);
      throw new Error(msg);
    }
  }, []);

  const editBranch = useCallback(async (branchId: string, input: UpdateBranchInput) => {
    setUpdateStatus('submitting');
    setUpdateError(null);
    try {
      const updatedBranch = await updateBranch(branchId, input);
      setUpdateStatus('success');
      setBranches((prev) =>
        prev.map((branch) => (branch.id === branchId ? updatedBranch : branch)),
      );
      return updatedBranch;
    } catch (err) {
      setUpdateStatus('error');
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar la sucursal.';
      setUpdateError(msg);
      throw new Error(msg);
    }
  }, []);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload, refreshKey]);

  return {
    branches,
    status,
    error,
    createStatus,
    createError,
    updateStatus,
    updateError,
    deleteStatus,
    deleteError,
    reload,
    addBranch,
    editBranch,
    removeBranch,
  };
}
