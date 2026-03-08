/**
 * Repositorio de inventario.
 * Incluye listado y carga inicial/ajuste desde la interfaz.
 */
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import type { InventoryItem, SaveInventoryInput } from '../types/InventoryItem';

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

export async function listInventoryByBranch(branchId: string): Promise<InventoryItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema('operaciones')
    .from('inventario')
    .select('id, producto_id, local_id, cantidad_actual, cantidad_minima, updated_at')
    .eq('local_id', branchId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`[INVENTORY] ${error.message}`);

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
      sucursalId: row.local_id,
      cantidadActual: toNumber(row.cantidad_actual),
      cantidadMinima: toNumber(row.cantidad_minima),
      updatedAt: row.updated_at,
    };
  });
}

export async function saveInventory(input: SaveInventoryInput) {
  const supabase = getSupabaseClient();

  if (!input.productoId || !input.sucursalId) {
    throw new Error('Debes elegir producto y sucursal.');
  }

  if (input.cantidadActual < 0 || input.cantidadMinima < 0) {
    throw new Error('Las cantidades no pueden ser negativas.');
  }

  const nowIso = new Date().toISOString();

  // Se consulta el valor anterior para registrar movimiento por diferencia real.
  const { data: existingRow, error: existingError } = await supabase
    .schema('operaciones')
    .from('inventario')
    .select('id, cantidad_actual')
    .eq('producto_id', input.productoId)
    .eq('local_id', input.sucursalId)
    .maybeSingle();

  if (existingError) throw new Error(`[INVENTORY] ${existingError.message}`);

  const previousQty = existingRow ? toNumber(existingRow.cantidad_actual) : 0;
  const delta = input.cantidadActual - previousQty;

  const { data: inventoryRow, error: inventoryError } = await supabase
    .schema('operaciones')
    .from('inventario')
    .upsert(
      {
        producto_id: input.productoId,
        local_id: input.sucursalId,
        cantidad_actual: input.cantidadActual,
        cantidad_minima: input.cantidadMinima,
        updated_at: nowIso,
      },
      { onConflict: 'producto_id,local_id' },
    )
    .select('id')
    .single();

  if (inventoryError) throw new Error(`[INVENTORY] ${inventoryError.message}`);

  if (delta !== 0) {
    // Solo registra movimiento cuando hubo cambio efectivo en existencias.
    const { error: movementError } = await supabase
      .schema('operaciones')
      .from('movimientos_inventario')
      .insert({
        producto_id: input.productoId,
        local_id: input.sucursalId,
        tipo_movimiento: delta > 0 ? 'ENTRADA' : 'SALIDA',
        cantidad: Math.abs(delta),
        fecha: nowIso,
        motivo: 'Ajuste manual desde panel',
        origen_tipo: existingRow ? 'AJUSTE' : 'INICIAL',
        origen_id: inventoryRow.id,
      });

    if (movementError) throw new Error(`[INVENTORY] ${movementError.message}`);
  }
}

export async function deleteInventoryRow(input: {
  inventarioId: string;
  productoId: string;
  sucursalId: string;
}) {
  const supabase = getSupabaseClient();
  const inventarioId = input.inventarioId.trim();
  const productoId = input.productoId.trim();
  const sucursalId = input.sucursalId.trim();

  if (!inventarioId || !productoId || !sucursalId) {
    throw new Error('No se recibieron datos completos para eliminar inventario.');
  }

  // Limpia historial de movimientos del mismo producto/sucursal para evitar bloqueos de FK al borrar sucursal.
  const { error: movementsError } = await supabase
    .schema('operaciones')
    .from('movimientos_inventario')
    .delete()
    .eq('producto_id', productoId)
    .eq('local_id', sucursalId);

  if (movementsError) throw new Error(`[INVENTORY] ${movementsError.message}`);

  const { error: inventoryError } = await supabase
    .schema('operaciones')
    .from('inventario')
    .delete()
    .eq('id', inventarioId);

  if (!inventoryError) return;

  if (inventoryError.code === '23503') {
    throw new Error('No puedes eliminar este inventario porque tiene registros relacionados.');
  }

  throw new Error(`[INVENTORY] ${inventoryError.message}`);
}
