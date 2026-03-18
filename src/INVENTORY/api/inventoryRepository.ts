/**
 * Repositorio de inventario.
 * Incluye listado y carga inicial/ajuste desde la interfaz.
 */
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import type { InventoryItem, InventoryMovement, SaveInventoryInput } from '../types/InventoryItem';

const INVENTORY_SELECT_WITH_UPDATED_AT =
  'id, producto_id, local_id, cantidad_actual, cantidad_minima, updated_at';
const INVENTORY_SELECT_WITH_FECHA_ACTUALIZACION =
  'id, producto_id, local_id, cantidad_actual, cantidad_minima, fecha_actualizacion';
const MOVEMENTS_SELECT_WITH_ORIGIN =
  'id, producto_id, local_id, tipo_movimiento, cantidad, fecha, motivo, origen_tipo, origen_id';
const MOVEMENTS_SELECT_BASE = 'id, producto_id, local_id, tipo_movimiento, cantidad, fecha, motivo';

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(updated_at|fecha_actualizacion|origen_tipo|origen_id|usuarios_id|persona_id)/i.test(rawError);
}

function normalizeMovementType(rawType: string): 'ENTRADA' | 'SALIDA' | 'AJUSTE' {
  if (rawType === 'ENTRADA' || rawType === 'SALIDA' || rawType === 'AJUSTE') return rawType;
  return 'AJUSTE';
}

type InventoryRow = {
  id: string;
  producto_id: string;
  local_id: string;
  cantidad_actual: number | string;
  cantidad_minima: number | string;
  updated_at?: string | null;
  fecha_actualizacion?: string | null;
};

export async function listInventoryByBranch(branchId: string): Promise<InventoryItem[]> {
  const supabase = getSupabaseClient();
  const listAttempts: Array<{ select: string; orderBy: string }> = [
    { select: INVENTORY_SELECT_WITH_UPDATED_AT, orderBy: 'updated_at' },
    { select: INVENTORY_SELECT_WITH_FECHA_ACTUALIZACION, orderBy: 'fecha_actualizacion' },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of listAttempts) {
    const queryResult = await supabase
      .schema('operaciones')
      .from('inventario')
      .select(attempt.select)
      .eq('local_id', branchId)
      .order(attempt.orderBy, { ascending: false });

    if (!queryResult.error) {
      const rows = (queryResult.data ?? []) as unknown as InventoryRow[];
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
          updatedAt: row.updated_at ?? row.fecha_actualizacion ?? new Date().toISOString(),
        };
      });
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[INVENTORY] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[INVENTORY] ${lastCompatibilityError ?? 'No se pudo cargar inventario.'}`);
}

type MovementRow = {
  id: string | number;
  producto_id: string;
  local_id: string;
  tipo_movimiento: string;
  cantidad: number | string;
  fecha: string;
  motivo: string | null;
  origen_tipo?: string | null;
  origen_id?: string | null;
};

export async function listMovementsByBranch(branchId: string): Promise<InventoryMovement[]> {
  const supabase = getSupabaseClient();
  const listAttempts = [MOVEMENTS_SELECT_WITH_ORIGIN, MOVEMENTS_SELECT_BASE];
  let lastCompatibilityError: string | null = null;

  for (const selection of listAttempts) {
    const queryResult = await supabase
      .schema('operaciones')
      .from('movimientos_inventario')
      .select(selection)
      .eq('local_id', branchId)
      .order('fecha', { ascending: false })
      .limit(150);

    if (!queryResult.error) {
      const rows = (queryResult.data ?? []) as unknown as MovementRow[];
      const uniqueProductIds = [...new Set(rows.map((row) => row.producto_id))];
      const productsById = await getProductsByIds(uniqueProductIds);

      return rows.map((row) => {
        const product = productsById.get(row.producto_id);
        return {
          id: String(row.id),
          productoId: row.producto_id,
          productoNombre: product?.nombre ?? 'Producto no encontrado',
          sucursalId: row.local_id,
          tipoMovimiento: normalizeMovementType(row.tipo_movimiento),
          cantidad: toNumber(row.cantidad),
          fecha: row.fecha,
          motivo: row.motivo,
          origenTipo: row.origen_tipo ?? null,
          origenId: row.origen_id ?? null,
        };
      });
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[INVENTORY] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[INVENTORY] ${lastCompatibilityError ?? 'No se pudo cargar movimientos.'}`);
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

  const upsertAttempts: Array<Record<string, string | number>> = [
    {
      producto_id: input.productoId,
      local_id: input.sucursalId,
      cantidad_actual: input.cantidadActual,
      cantidad_minima: input.cantidadMinima,
      updated_at: nowIso,
    },
    {
      producto_id: input.productoId,
      local_id: input.sucursalId,
      cantidad_actual: input.cantidadActual,
      cantidad_minima: input.cantidadMinima,
      fecha_actualizacion: nowIso,
    },
  ];

  let inventoryRow: { id: string } | null = null;
  let lastCompatibilityError: string | null = null;

  for (const payload of upsertAttempts) {
    const upsertResult = await supabase
      .schema('operaciones')
      .from('inventario')
      .upsert(payload, { onConflict: 'producto_id,local_id' })
      .select('id')
      .single();

    if (!upsertResult.error) {
      inventoryRow = upsertResult.data;
      break;
    }

    if (!isCompatibilityColumnError(upsertResult.error.message)) {
      throw new Error(`[INVENTORY] ${upsertResult.error.message}`);
    }
    lastCompatibilityError = upsertResult.error.message;
  }

  if (!inventoryRow) {
    throw new Error(`[INVENTORY] ${lastCompatibilityError ?? 'No se pudo guardar inventario.'}`);
  }

  if (delta !== 0) {
    // Se usa el uid autenticado para completar trazabilidad en usuarios_id cuando el esquema lo soporta.
    const { data: authUserData } = await supabase.auth.getUser();
    const userId = authUserData.user?.id ?? null;

    // Solo registra movimiento cuando hubo cambio efectivo en existencias.
    const movementAttempts: Array<Record<string, string | number | null>> = [
      {
        producto_id: input.productoId,
        local_id: input.sucursalId,
        usuarios_id: userId,
        tipo_movimiento: delta > 0 ? 'ENTRADA' : 'SALIDA',
        cantidad: Math.abs(delta),
        fecha: nowIso,
        motivo: 'Ajuste manual desde panel',
        origen_tipo: existingRow ? 'AJUSTE' : 'INICIAL',
        origen_id: inventoryRow.id,
      },
      {
        producto_id: input.productoId,
        local_id: input.sucursalId,
        usuarios_id: userId,
        tipo_movimiento: delta > 0 ? 'ENTRADA' : 'SALIDA',
        cantidad: Math.abs(delta),
        fecha: nowIso,
        motivo: 'Ajuste manual desde panel',
      },
      {
        producto_id: input.productoId,
        local_id: input.sucursalId,
        tipo_movimiento: delta > 0 ? 'ENTRADA' : 'SALIDA',
        cantidad: Math.abs(delta),
        fecha: nowIso,
        motivo: 'Ajuste manual desde panel',
      },
    ];
    let movementSaved = false;
    let movementCompatibilityError: string | null = null;

    for (const payload of movementAttempts) {
      const movementResult = await supabase
        .schema('operaciones')
        .from('movimientos_inventario')
        .insert(payload);

      if (!movementResult.error) {
        movementSaved = true;
        break;
      }

      if (!isCompatibilityColumnError(movementResult.error.message)) {
        throw new Error(`[INVENTORY] ${movementResult.error.message}`);
      }
      movementCompatibilityError = movementResult.error.message;
    }

    if (!movementSaved) {
      throw new Error(`[INVENTORY] ${movementCompatibilityError ?? 'No se pudo guardar el movimiento.'}`);
    }
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
