/**
 * Repositorio de productos.
 * Aisla acceso a Supabase para que la UI no conozca detalles de DB.
 */
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import type { Product } from '../types/Product';

const DEFAULT_LIMIT = 40;

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

export async function listProducts(limit = DEFAULT_LIMIT): Promise<Product[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema('catalogo')
    .from('productos')
    .select('id, codigo_barra, nombre, precio_compra, precio_venta, activo, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[PRODUCTS] ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    codigoBarra: row.codigo_barra,
    nombre: row.nombre,
    precioCompra: toNumber(row.precio_compra),
    precioVenta: toNumber(row.precio_venta),
    activo: row.activo,
    updatedAt: row.updated_at,
  }));
}

export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  if (!ids.length) return new Map();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema('catalogo')
    .from('productos')
    .select('id, codigo_barra, nombre, precio_compra, precio_venta, activo, updated_at')
    .in('id', ids);

  if (error) {
    throw new Error(`[PRODUCTS] ${error.message}`);
  }

  const productMap = new Map<string, Product>();
  for (const row of data ?? []) {
    productMap.set(row.id, {
      id: row.id,
      codigoBarra: row.codigo_barra,
      nombre: row.nombre,
      precioCompra: toNumber(row.precio_compra),
      precioVenta: toNumber(row.precio_venta),
      activo: row.activo,
      updatedAt: row.updated_at,
    });
  }
  return productMap;
}
