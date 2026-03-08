/**
 * Repositorio de productos.
 * Aisla acceso a Supabase para que la UI no conozca detalles de DB.
 */
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { sanitizeText } from '../../SHARED/utils/validators';
import type { CreateProductInput, Product } from '../types/Product';

const DEFAULT_LIMIT = 40;

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

function isMissingRelationError(error: { code?: string | null; message: string }) {
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message);
}

function isMissingRpcFunctionError(error: { code?: string | null; message: string }) {
  return error.code === 'PGRST202' || /Could not find the function/i.test(error.message);
}

export async function listProducts(limit = DEFAULT_LIMIT): Promise<Product[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema('catalogo')
    .from('productos')
    .select('id, codigo_barra, nombre, descripcion, precio_compra, precio_venta, activo, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[PRODUCTS] ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    codigoBarra: row.codigo_barra,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precioCompra: toNumber(row.precio_compra),
    precioVenta: toNumber(row.precio_venta),
    activo: row.activo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  if (!ids.length) return new Map();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema('catalogo')
    .from('productos')
    .select('id, codigo_barra, nombre, descripcion, precio_compra, precio_venta, activo, created_at, updated_at')
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
      descripcion: row.descripcion,
      precioCompra: toNumber(row.precio_compra),
      precioVenta: toNumber(row.precio_venta),
      activo: row.activo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
  return productMap;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const supabase = getSupabaseClient();
  const payload = {
    codigo_barra: sanitizeText(input.codigoBarra, 50) || null,
    nombre: sanitizeText(input.nombre, 120),
    descripcion: sanitizeText(input.descripcion, 300) || null,
    precio_compra: input.precioCompra,
    precio_venta: input.precioVenta,
    activo: true,
  };

  if (!payload.nombre) {
    throw new Error('El nombre del producto es obligatorio.');
  }

  const { data, error } = await supabase
    .schema('catalogo')
    .from('productos')
    .insert(payload)
    .select('id, codigo_barra, nombre, descripcion, precio_compra, precio_venta, activo, created_at, updated_at')
    .single();

  if (error) {
    throw new Error(`[PRODUCTS] ${error.message}`);
  }

  return {
    id: data.id,
    codigoBarra: data.codigo_barra,
    nombre: data.nombre,
    descripcion: data.descripcion,
    precioCompra: toNumber(data.precio_compra),
    precioVenta: toNumber(data.precio_venta),
    activo: data.activo,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteProduct(productId: string) {
  const supabase = getSupabaseClient();
  const normalizedId = productId.trim();

  if (!normalizedId) {
    throw new Error('No se recibio el identificador del producto.');
  }

  const { error: rpcError } = await (supabase as any).rpc('delete_product_cascade', {
    p_product_id: normalizedId,
  });

  if (!rpcError) return;

  if (!isMissingRpcFunctionError(rpcError)) {
    throw new Error(`[PRODUCTS] ${rpcError.message}`);
  }

  // Limpia dependencias operativas del producto antes de borrar el catalogo.
  const { error: deleteMovementsError } = await supabase
    .schema('operaciones')
    .from('movimientos_inventario')
    .delete()
    .eq('producto_id', normalizedId);

  if (deleteMovementsError) {
    throw new Error(`[PRODUCTS] ${deleteMovementsError.message}`);
  }

  const { error: deleteInventoryError } = await supabase
    .schema('operaciones')
    .from('inventario')
    .delete()
    .eq('producto_id', normalizedId);

  if (deleteInventoryError) {
    throw new Error(`[PRODUCTS] ${deleteInventoryError.message}`);
  }

  // Limpia detalle de ventas del producto (si el modulo existe).
  const { error: deleteDetailsError } = await supabase
    .schema('ventas')
    .from('detalle_venta')
    .delete()
    .eq('producto_id', normalizedId);

  if (deleteDetailsError && !isMissingRelationError(deleteDetailsError)) {
    throw new Error(`[PRODUCTS] ${deleteDetailsError.message}`);
  }

  const { error } = await supabase
    .schema('catalogo')
    .from('productos')
    .delete()
    .eq('id', normalizedId);

  if (!error) return;

  if (error.code === '23503') {
    throw new Error(
      'No puedes eliminar este producto porque aun tiene registros relacionados en otras tablas. Ejecuta database/007_secure_delete_helpers.sql.',
    );
  }

  throw new Error(`[PRODUCTS] ${error.message}`);
}
