/**
 * Hook de productos con carga y creacion.
 * Permite poblar catalogo desde una base inicialmente vacia.
 */
import { useCallback, useEffect, useState } from 'react';
import { createProduct, deleteProduct, listProducts, updateProduct } from '../api/productRepository';
import type { CreateProductInput, Product, UpdateProductInput } from '../types/Product';

interface UseProductsResult {
  products: Product[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  createStatus: 'idle' | 'submitting' | 'success' | 'error';
  createError: string | null;
  updateStatus: 'idle' | 'submitting' | 'success' | 'error';
  updateError: string | null;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  reload: () => Promise<void>;
  addProduct: (input: CreateProductInput) => Promise<void>;
  editProduct: (productId: string, input: UpdateProductInput) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
}

export function useProducts(refreshKey: number): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<UseProductsResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<UseProductsResult['createStatus']>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UseProductsResult['updateStatus']>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);
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

  const editProduct = useCallback(async (productId: string, input: UpdateProductInput) => {
    setUpdateStatus('submitting');
    setUpdateError(null);
    try {
      const updatedProduct = await updateProduct(productId, input);
      setProducts((prev) =>
        prev.map((product) => (product.id === productId ? updatedProduct : product)),
      );
      setUpdateStatus('success');
    } catch (err) {
      setUpdateStatus('error');
      setUpdateError(err instanceof Error ? err.message : 'No se pudo actualizar el producto.');
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
    updateStatus,
    updateError,
    deleteStatus,
    deleteError,
    reload,
    addProduct,
    editProduct,
    removeProduct,
  };
}
