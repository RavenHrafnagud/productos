/**
 * Hook de productos con carga y creacion.
 * Permite poblar catalogo desde una base inicialmente vacia.
 */
import { useCallback, useEffect, useState } from 'react';
import { createProduct, deleteProduct, listProducts } from '../api/productRepository';
import type { CreateProductInput, Product } from '../types/Product';

interface UseProductsResult {
  products: Product[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  reload: () => Promise<void>;
  addProduct: (input: CreateProductInput) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
}

export function useProducts(refreshKey: number): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<UseProductsResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<UseProductsResult['createStatus']>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<UseProductsResult['deleteStatus']>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const rows = await listProducts();
      setProducts(rows);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'No se pudieron cargar productos.');
    }
  }, []);

  const addProduct = useCallback(async (input: CreateProductInput) => {
    setCreateStatus('submitting');
    setCreateError(null);
    try {
      const nextProduct = await createProduct(input);
      setProducts((prev) => [nextProduct, ...prev]);
      setCreateStatus('success');
    } catch (err) {
      setCreateStatus('error');
      setCreateError(err instanceof Error ? err.message : 'No se pudo crear el producto.');
      throw err;
    }
  }, []);

  const removeProduct = useCallback(async (productId: string) => {
    setDeleteStatus('submitting');
    setDeleteError(null);
    try {
      await deleteProduct(productId);
      setProducts((prev) => prev.filter((product) => product.id !== productId));
      setDeleteStatus('success');
    } catch (err) {
      setDeleteStatus('error');
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.');
      throw err;
    }
  }, []);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload, refreshKey]);

  return {
    products,
    status,
    error,
    createStatus,
    createError,
    deleteStatus,
    deleteError,
    reload,
    addProduct,
    removeProduct,
  };
}
