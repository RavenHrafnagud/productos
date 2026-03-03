/**
 * Repositorio de inventario.
 * Obtiene inventario del local y enriquece con datos de productos.
 */
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import type { InventoryItem } from '../types/InventoryItem';

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

export async function listInventoryByLocal(localId: string): Promise<InventoryItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema('operaciones')
    .from('inventario')
    .select('id, producto_id, local_id, cantidad_actual, cantidad_minima, updated_at')
    .eq('local_id', localId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`[INVENTORY] ${error.message}`);
  }

  const rows = data ?? [];
  const uniqueProductIds = [...new Set(rows.map((row) => row.producto_id))];
  const productsById = await getProductsByIds(uniqueProductIds);

  return rows.map((row) => {
    const product = productsById.get(row.producto_id);
    return {
      id: row.id,
      productoId: row.producto_id,
      productoNombre: product?.nombre ?? 'Producto no encontrado',
      codigoBarra: product?.codigoBarra ?? null,
      localId: row.local_id,
      cantidadActual: toNumber(row.cantidad_actual),
      cantidadMinima: toNumber(row.cantidad_minima),
      updatedAt: row.updated_at,
    };
  });
}
