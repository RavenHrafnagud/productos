/**
 * Hook de productos para manejar estado asincrono.
 */
import { useEffect, useState } from 'react';
import { listProducts } from '../api/productRepository';
import type { Product } from '../types/Product';

interface UseProductsResult {
  products: Product[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
}

export function useProducts(refreshKey: number): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<UseProductsResult['status']>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setStatus('loading');
      setError(null);
      try {
        const rows = await listProducts();
        if (!mounted) return;
        setProducts(rows);
        setStatus('success');
      } catch (err) {
        if (!mounted) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'No se pudo cargar productos.');
      }
    };
    run();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  return { products, status, error };
}
