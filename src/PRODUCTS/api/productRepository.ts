/**
 * Repositorio de productos.
 * Aisla acceso a Supabase para que la UI no conozca detalles de DB.
 */
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { sanitizeText } from '../../SHARED/utils/validators';
import type { CreateProductInput, Product, UpdateProductInput } from '../types/Product';

const DEFAULT_LIMIT = 40;
const PRODUCT_SELECT_WITH_STATE =
  'id, codigo_barra, nombre, descripcion, precio_venta, estado, created_at, updated_at';
const PRODUCT_SELECT_WITH_ACTIVE =
  'id, codigo_barra, nombre, descripcion, precio_venta, activo, created_at, updated_at';

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

type ProductRow = {
  id: string;
  codigo_barra: string | null;
  nombre: string;
  descripcion: string | null;
  precio_venta: number | string;
  estado?: boolean | null;
  activo?: boolean | null;
  created_at: string;
  updated_at: string;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    codigoBarra: row.codigo_barra,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precioVenta: toNumber(row.precio_venta),
    estado: row.estado ?? row.activo ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingRelationError(error: { code?: string | null; message: string }) {
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message);
}

function isMissingRpcFunctionError(error: { code?: string | null; message: string }) {
  return error.code === 'PGRST202' || /Could not find the function/i.test(error.message);
}

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(estado|activo|precio_compra)/i.test(rawError);
}

export async function listProducts(limit = DEFAULT_LIMIT): Promise<Product[]> {
  const supabase = getSupabaseClient();
  const selectAttempts = [PRODUCT_SELECT_WITH_STATE, PRODUCT_SELECT_WITH_ACTIVE];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const queryResult = await supabase
      .schema('catalogo')
      .from('productos')
      .select(selection)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (!queryResult.error) {
      const rows = (queryResult.data ?? []) as unknown as ProductRow[];
      return rows.map(mapProduct);
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[PRODUCTS] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[PRODUCTS] ${lastCompatibilityError ?? 'No se pudo listar productos.'}`);
}

export async function getProductsByIds(ids: string[]): Promise<Map<string, Product>> {
  if (!ids.length) return new Map();

  const supabase = getSupabaseClient();
  const selectAttempts = [PRODUCT_SELECT_WITH_STATE, PRODUCT_SELECT_WITH_ACTIVE];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const queryResult = await supabase
      .schema('catalogo')
      .from('productos')
      .select(selection)
      .in('id', ids);

    if (!queryResult.error) {
      const productMap = new Map<string, Product>();
      const rows = (queryResult.data ?? []) as unknown as ProductRow[];
      for (const row of rows) {
        const product = mapProduct(row);
        productMap.set(product.id, product);
      }
      return productMap;
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[PRODUCTS] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[PRODUCTS] ${lastCompatibilityError ?? 'No se pudieron leer productos por ids.'}`);
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const supabase = getSupabaseClient();
  const payload = {
    codigo_barra: sanitizeText(input.codigoBarra, 50) || null,
    nombre: sanitizeText(input.nombre, 120),
    descripcion: sanitizeText(input.descripcion, 300) || null,
    precio_venta: input.precioVenta,
    estado: input.estado,
  };

  if (!payload.nombre) {
    throw new Error('El nombre del producto es obligatorio.');
  }

  const insertAttempts: Array<{
    payload: Record<string, string | number | boolean | null>;
    selection: string;
  }> = [
    {
      payload: {
        codigo_barra: payload.codigo_barra,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio_venta: payload.precio_venta,
        estado: payload.estado,
      },
      selection: PRODUCT_SELECT_WITH_STATE,
    },
    {
      // Compatibilidad temporal con esquemas antiguos antes de migrar a "estado".
      payload: {
        codigo_barra: payload.codigo_barra,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio_venta: payload.precio_venta,
        activo: payload.estado,
      },
      selection: PRODUCT_SELECT_WITH_ACTIVE,
    },
    {
      // Compatibilidad temporal con esquemas antiguos que aun exigen precio_compra.
      payload: {
        codigo_barra: payload.codigo_barra,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio_compra: payload.precio_venta,
        precio_venta: payload.precio_venta,
        activo: payload.estado,
      },
      selection: PRODUCT_SELECT_WITH_ACTIVE,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of insertAttempts) {
    const insertResult = await supabase
      .schema('catalogo')
      .from('productos')
      .insert(attempt.payload)
      .select(attempt.selection)
      .single();

    if (!insertResult.error) {
      return mapProduct(insertResult.data as unknown as ProductRow);
    }

    if (!isCompatibilityColumnError(insertResult.error.message)) {
      throw new Error(`[PRODUCTS] ${insertResult.error.message}`);
    }
    lastCompatibilityError = insertResult.error.message;
  }

  throw new Error(`[PRODUCTS] ${lastCompatibilityError ?? 'No se pudo crear el producto.'}`);
}

export async function updateProduct(productId: string, input: UpdateProductInput): Promise<Product> {
  const supabase = getSupabaseClient();
  const normalizedId = productId.trim();
  const payload = {
    codigo_barra: sanitizeText(input.codigoBarra, 50) || null,
    nombre: sanitizeText(input.nombre, 120),
    descripcion: sanitizeText(input.descripcion, 300) || null,
    precio_venta: input.precioVenta,
    estado: input.estado,
  };

  if (!normalizedId) {
    throw new Error('No se recibio el identificador del producto.');
  }

  if (!payload.nombre) {
    throw new Error('El nombre del producto es obligatorio.');
  }

  const updateAttempts: Array<{
    payload: Record<string, string | number | boolean | null>;
    selection: string;
  }> = [
    {
      payload: {
        codigo_barra: payload.codigo_barra,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio_venta: payload.precio_venta,
        estado: payload.estado,
      },
      selection: PRODUCT_SELECT_WITH_STATE,
    },
    {
      // Compatibilidad temporal con esquemas antiguos antes de migrar a "estado".
      payload: {
        codigo_barra: payload.codigo_barra,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio_venta: payload.precio_venta,
        activo: payload.estado,
      },
      selection: PRODUCT_SELECT_WITH_ACTIVE,
    },
    {
      // Compatibilidad temporal con esquemas antiguos que aun exigen precio_compra.
      payload: {
        codigo_barra: payload.codigo_barra,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio_compra: payload.precio_venta,
        precio_venta: payload.precio_venta,
        activo: payload.estado,
      },
      selection: PRODUCT_SELECT_WITH_ACTIVE,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of updateAttempts) {
    const updateResult = await supabase
      .schema('catalogo')
      .from('productos')
      .update(attempt.payload)
      .eq('id', normalizedId)
      .select(attempt.selection)
      .single();

    if (!updateResult.error) {
      return mapProduct(updateResult.data as unknown as ProductRow);
    }

    if (!isCompatibilityColumnError(updateResult.error.message)) {
      throw new Error(`[PRODUCTS] ${updateResult.error.message}`);
    }
    lastCompatibilityError = updateResult.error.message;
  }

  throw new Error(`[PRODUCTS] ${lastCompatibilityError ?? 'No se pudo actualizar el producto.'}`);
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

  // Limpia ventas relacionadas al producto con modelo integrado (si el modulo existe).
  const { error: deleteSalesError } = await supabase
    .schema('ventas')
    .from('ventas')
    .delete()
    .eq('producto_id', normalizedId);

  if (deleteSalesError && !isMissingRelationError(deleteSalesError)) {
    throw new Error(`[PRODUCTS] ${deleteSalesError.message}`);
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
