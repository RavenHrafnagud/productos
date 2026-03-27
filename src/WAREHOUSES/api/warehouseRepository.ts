/**
 * Repositorio de almacenes e inventario de almacenes.
 */
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { isValidEmail, sanitizeText } from '../../SHARED/utils/validators';
import type {
  CreateWarehouseInput,
  SaveWarehouseInventoryInput,
  UpdateWarehouseInput,
  Warehouse,
  WarehouseInventoryItem,
  WarehouseMovement,
} from '../types/Warehouse';

const WAREHOUSE_SELECT_WITH_STATUS =
  'id, nit, nombre, direccion, localidad, barrio, municipio, ciudad, pais, telefono, email, es_propio, costo_arriendo, moneda, estado, created_at';
const WAREHOUSE_SELECT_WITH_ACTIVE =
  'id, nit, nombre, direccion, localidad, barrio, municipio, ciudad, pais, telefono, email, es_propio, costo_arriendo, moneda, activo, created_at';
const WAREHOUSE_SELECT_WITH_STATUS_LEGACY =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, es_propio, costo_arriendo, moneda, estado, created_at';
const WAREHOUSE_SELECT_WITH_ACTIVE_LEGACY =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, es_propio, costo_arriendo, moneda, activo, created_at';
const WAREHOUSE_SELECT_ATTEMPTS = [
  WAREHOUSE_SELECT_WITH_STATUS,
  WAREHOUSE_SELECT_WITH_ACTIVE,
  WAREHOUSE_SELECT_WITH_STATUS_LEGACY,
  WAREHOUSE_SELECT_WITH_ACTIVE_LEGACY,
];

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(estado|activo|es_propio|costo_arriendo|moneda|localidad|barrio|municipio)/i.test(rawError);
}

type WarehouseRow = {
  id: string;
  nit?: string | null;
  nombre: string;
  direccion?: string | null;
  localidad?: string | null;
  barrio?: string | null;
  municipio?: string | null;
  ciudad?: string | null;
  pais?: string | null;
  telefono?: string | null;
  email?: string | null;
  es_propio?: boolean | null;
  costo_arriendo?: number | string | null;
  moneda?: string | null;
  estado?: boolean | null;
  activo?: boolean | null;
  created_at?: string | null;
};

function mapWarehouse(row: WarehouseRow): Warehouse {
  return {
    id: row.id,
    nit: row.nit ?? null,
    nombre: row.nombre,
    direccion: row.direccion ?? null,
    localidad:
      row.localidad ??
      (row.barrio && row.municipio ? `${row.barrio} / ${row.municipio}` : row.barrio ?? row.municipio ?? null),
    ciudad: row.ciudad ?? null,
    pais: row.pais ?? 'CO',
    telefono: row.telefono ?? null,
    email: row.email ?? null,
    esPropio: row.es_propio ?? false,
    costoArriendo: toNumber(row.costo_arriendo),
    moneda: row.moneda ?? 'COP',
    estado: row.estado ?? row.activo ?? true,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

async function findWarehouseById(warehouseId: string): Promise<Warehouse> {
  const supabase = getSupabaseClient();
  let lastCompatibilityError: string | null = null;

  for (const selection of WAREHOUSE_SELECT_ATTEMPTS) {
    const queryResult = await supabase
      .schema('operaciones')
      .from('almacenes')
      .select(selection)
      .eq('id', warehouseId)
      .maybeSingle();

    if (!queryResult.error) {
      if (!queryResult.data) throw new Error('No se encontro el almacen guardado.');
      return mapWarehouse(queryResult.data as unknown as WarehouseRow);
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[WAREHOUSES] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[WAREHOUSES] ${lastCompatibilityError ?? 'No se pudo leer el almacen guardado.'}`);
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const supabase = getSupabaseClient();
  let lastCompatibilityError: string | null = null;

  for (const selection of WAREHOUSE_SELECT_ATTEMPTS) {
    const queryResult = await supabase
      .schema('operaciones')
      .from('almacenes')
      .select(selection)
      .order('created_at', { ascending: false })
      .limit(120);

    if (!queryResult.error) {
      const rows = (queryResult.data ?? []) as unknown as WarehouseRow[];
      return rows.map(mapWarehouse);
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[WAREHOUSES] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[WAREHOUSES] ${lastCompatibilityError ?? 'No se pudieron cargar los almacenes.'}`);
}

function normalizeWarehouseInput(input: CreateWarehouseInput | UpdateWarehouseInput) {
  const cleanEmail = input.email.trim().toLowerCase();
  if (cleanEmail && !isValidEmail(cleanEmail)) {
    throw new Error('El correo del almacen no es valido.');
  }

  const normalizedLocalidad = sanitizeText(input.localidad, 120) || null;

  const payload = {
    nit: sanitizeText(input.nit, 30) || null,
    nombre: sanitizeText(input.nombre, 90),
    direccion: sanitizeText(input.direccion, 140) || null,
    localidad: normalizedLocalidad,
    barrio: normalizedLocalidad,
    municipio: normalizedLocalidad,
    ciudad: sanitizeText(input.ciudad, 80) || null,
    pais: sanitizeText(input.pais, 40) || 'CO',
    telefono: sanitizeText(input.telefono, 25) || null,
    email: cleanEmail || null,
    es_propio: input.esPropio,
    costo_arriendo: input.esPropio ? 0 : input.costoArriendo,
    moneda: sanitizeText(input.moneda, 3).toUpperCase() || 'COP',
    estado: input.estado,
    activo: input.estado,
  };

  if (!payload.nombre || !payload.ciudad || !payload.pais) {
    throw new Error('Nombre, ciudad y pais son obligatorios para el almacen.');
  }
  if (!Number.isFinite(payload.costo_arriendo) || payload.costo_arriendo < 0) {
    throw new Error('El costo de arriendo debe ser numerico y mayor o igual a cero.');
  }

  return payload;
}

export async function createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
  const supabase = getSupabaseClient();
  const payload = normalizeWarehouseInput(input);
  const attempts = [
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      localidad: payload.localidad,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      es_propio: payload.es_propio,
      costo_arriendo: payload.costo_arriendo,
      moneda: payload.moneda,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      localidad: payload.localidad,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      es_propio: payload.es_propio,
      costo_arriendo: payload.costo_arriendo,
      moneda: payload.moneda,
      activo: payload.activo,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      es_propio: payload.es_propio,
      costo_arriendo: payload.costo_arriendo,
      moneda: payload.moneda,
      estado: payload.estado,
      barrio: payload.barrio,
      municipio: payload.municipio,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      es_propio: payload.es_propio,
      costo_arriendo: payload.costo_arriendo,
      moneda: payload.moneda,
      activo: payload.activo,
      barrio: payload.barrio,
      municipio: payload.municipio,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of attempts) {
    const insertResult = await supabase
      .schema('operaciones')
      .from('almacenes')
      .insert(attempt)
      .select('id')
      .single();

    if (!insertResult.error) {
      return findWarehouseById((insertResult.data as { id: string }).id);
    }

    if (!isCompatibilityColumnError(insertResult.error.message)) {
      throw new Error(`[WAREHOUSES] ${insertResult.error.message}`);
    }
    lastCompatibilityError = insertResult.error.message;
  }

  throw new Error(`[WAREHOUSES] ${lastCompatibilityError ?? 'No se pudo crear el almacen.'}`);
}

export async function updateWarehouse(warehouseId: string, input: UpdateWarehouseInput): Promise<Warehouse> {
  const supabase = getSupabaseClient();
  const normalizedId = warehouseId.trim();
  if (!normalizedId) throw new Error('No se recibio el identificador del almacen.');

  const payload = normalizeWarehouseInput(input);
  const attempts = [
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      localidad: payload.localidad,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      es_propio: payload.es_propio,
      costo_arriendo: payload.costo_arriendo,
      moneda: payload.moneda,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      localidad: payload.localidad,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      es_propio: payload.es_propio,
      costo_arriendo: payload.costo_arriendo,
      moneda: payload.moneda,
      activo: payload.activo,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      es_propio: payload.es_propio,
      costo_arriendo: payload.costo_arriendo,
      moneda: payload.moneda,
      estado: payload.estado,
      barrio: payload.barrio,
      municipio: payload.municipio,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      es_propio: payload.es_propio,
      costo_arriendo: payload.costo_arriendo,
      moneda: payload.moneda,
      activo: payload.activo,
      barrio: payload.barrio,
      municipio: payload.municipio,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of attempts) {
    const updateResult = await supabase
      .schema('operaciones')
      .from('almacenes')
      .update(attempt)
      .eq('id', normalizedId)
      .select('id')
      .single();

    if (!updateResult.error) {
      return findWarehouseById((updateResult.data as { id: string }).id);
    }

    if (!isCompatibilityColumnError(updateResult.error.message)) {
      throw new Error(`[WAREHOUSES] ${updateResult.error.message}`);
    }
    lastCompatibilityError = updateResult.error.message;
  }

  throw new Error(`[WAREHOUSES] ${lastCompatibilityError ?? 'No se pudo actualizar el almacen.'}`);
}

function isMissingRpcFunctionError(error: { code?: string | null; message: string }) {
  return error.code === 'PGRST202' || /Could not find the function/i.test(error.message);
}

export async function deleteWarehouse(warehouseId: string) {
  const supabase = getSupabaseClient();
  const normalizedId = warehouseId.trim();
  if (!normalizedId) throw new Error('No se recibio el identificador del almacen.');

  const { error: rpcError } = await (supabase as any).rpc('delete_warehouse_cascade', {
    p_warehouse_id: normalizedId,
  });
  if (!rpcError) return;
  if (!isMissingRpcFunctionError(rpcError)) {
    throw new Error(`[WAREHOUSES] ${rpcError.message}`);
  }

  const { error: movementsError } = await supabase
    .schema('operaciones')
    .from('movimientos_almacen')
    .delete()
    .eq('almacen_id', normalizedId);
  if (movementsError) throw new Error(`[WAREHOUSES] ${movementsError.message}`);

  const { error: inventoryError } = await supabase
    .schema('operaciones')
    .from('inventario_almacen')
    .delete()
    .eq('almacen_id', normalizedId);
  if (inventoryError) throw new Error(`[WAREHOUSES] ${inventoryError.message}`);

  const { error: updateShipmentsError } = await supabase
    .schema('ventas')
    .from('envios')
    .update({ almacen_id: null })
    .eq('almacen_id', normalizedId);
  if (updateShipmentsError) throw new Error(`[WAREHOUSES] ${updateShipmentsError.message}`);

  const { error: deleteError } = await supabase
    .schema('operaciones')
    .from('almacenes')
    .delete()
    .eq('id', normalizedId);
  if (deleteError) throw new Error(`[WAREHOUSES] ${deleteError.message}`);
}

type WarehouseInventoryRow = {
  id: string;
  almacen_id: string;
  producto_id: string;
  cantidad_actual: number | string;
  cantidad_minima: number | string;
  updated_at: string;
};

export async function listWarehouseInventory(warehouseId: string): Promise<WarehouseInventoryItem[]> {
  const supabase = getSupabaseClient();
  const queryResult = await supabase
    .schema('operaciones')
    .from('inventario_almacen')
    .select('id, almacen_id, producto_id, cantidad_actual, cantidad_minima, updated_at')
    .eq('almacen_id', warehouseId)
    .order('updated_at', { ascending: false });
  if (queryResult.error) throw new Error(`[WAREHOUSE-INVENTORY] ${queryResult.error.message}`);

  const rows = (queryResult.data ?? []) as WarehouseInventoryRow[];
  const productIds = [...new Set(rows.map((row) => row.producto_id))];
  const productsById = await getProductsByIds(productIds);

  return rows.map((row) => {
    const product = productsById.get(row.producto_id);
    return {
      id: row.id,
      almacenId: row.almacen_id,
      productoId: row.producto_id,
      productoNombre: product?.nombre ?? 'Producto no encontrado',
      codigoBarra: product?.codigoBarra ?? null,
      cantidadActual: toNumber(row.cantidad_actual),
      cantidadMinima: toNumber(row.cantidad_minima),
      updatedAt: row.updated_at,
    };
  });
}

type WarehouseMovementRow = {
  id: string | number;
  almacen_id: string;
  producto_id: string;
  tipo_movimiento: string;
  cantidad: number | string;
  fecha: string;
  motivo: string | null;
  origen_tipo?: string | null;
  origen_id?: string | null;
};

export async function listWarehouseMovements(warehouseId: string): Promise<WarehouseMovement[]> {
  const supabase = getSupabaseClient();
  const queryResult = await supabase
    .schema('operaciones')
    .from('movimientos_almacen')
    .select('id, almacen_id, producto_id, tipo_movimiento, cantidad, fecha, motivo, origen_tipo, origen_id')
    .eq('almacen_id', warehouseId)
    .order('fecha', { ascending: false })
    .limit(180);
  if (queryResult.error) throw new Error(`[WAREHOUSE-INVENTORY] ${queryResult.error.message}`);

  const rows = (queryResult.data ?? []) as WarehouseMovementRow[];
  const productIds = [...new Set(rows.map((row) => row.producto_id))];
  const productsById = await getProductsByIds(productIds);

  return rows.map((row) => {
    const product = productsById.get(row.producto_id);
    return {
      id: String(row.id),
      almacenId: row.almacen_id,
      productoId: row.producto_id,
      productoNombre: product?.nombre ?? 'Producto no encontrado',
      tipoMovimiento: row.tipo_movimiento,
      cantidad: toNumber(row.cantidad),
      fecha: row.fecha,
      motivo: row.motivo,
      origenTipo: row.origen_tipo ?? null,
      origenId: row.origen_id ?? null,
    };
  });
}

export async function saveWarehouseInventory(input: SaveWarehouseInventoryInput) {
  const supabase = getSupabaseClient();
  if (!input.almacenId || !input.productoId) {
    throw new Error('Debes seleccionar almacen y producto.');
  }
  if (input.cantidadActual < 0 || input.cantidadMinima < 0) {
    throw new Error('Las cantidades no pueden ser negativas.');
  }

  const nowIso = new Date().toISOString();
  const { data: existingRow, error: existingError } = await supabase
    .schema('operaciones')
    .from('inventario_almacen')
    .select('id, cantidad_actual')
    .eq('almacen_id', input.almacenId)
    .eq('producto_id', input.productoId)
    .maybeSingle();
  if (existingError) throw new Error(`[WAREHOUSE-INVENTORY] ${existingError.message}`);

  const previousQty = existingRow ? toNumber(existingRow.cantidad_actual) : 0;
  const delta = input.cantidadActual - previousQty;

  const { data: upsertData, error: upsertError } = await supabase
    .schema('operaciones')
    .from('inventario_almacen')
    .upsert(
      {
        almacen_id: input.almacenId,
        producto_id: input.productoId,
        cantidad_actual: input.cantidadActual,
        cantidad_minima: input.cantidadMinima,
        updated_at: nowIso,
      },
      { onConflict: 'almacen_id,producto_id' },
    )
    .select('id')
    .single();
  if (upsertError) throw new Error(`[WAREHOUSE-INVENTORY] ${upsertError.message}`);

  if (delta !== 0) {
    const { data: authUserData } = await supabase.auth.getUser();
    const userId = authUserData.user?.id ?? null;
    const { error: movementError } = await supabase
      .schema('operaciones')
      .from('movimientos_almacen')
      .insert({
        almacen_id: input.almacenId,
        producto_id: input.productoId,
        tipo_movimiento: delta > 0 ? 'ENTRADA' : 'SALIDA',
        cantidad: Math.abs(delta),
        fecha: nowIso,
        motivo: 'Ajuste manual desde panel',
        origen_tipo: existingRow ? 'AJUSTE_MANUAL' : 'INICIAL_ALMACEN',
        origen_id: (upsertData as { id: string }).id,
        usuarios_id: userId,
      });
    if (movementError) throw new Error(`[WAREHOUSE-INVENTORY] ${movementError.message}`);
  }
}

export async function deleteWarehouseInventoryRow(input: {
  inventarioId: string;
  almacenId: string;
  productoId: string;
}) {
  const supabase = getSupabaseClient();
  const { error: movementsError } = await supabase
    .schema('operaciones')
    .from('movimientos_almacen')
    .delete()
    .eq('almacen_id', input.almacenId)
    .eq('producto_id', input.productoId);
  if (movementsError) throw new Error(`[WAREHOUSE-INVENTORY] ${movementsError.message}`);

  const { error: inventoryError } = await supabase
    .schema('operaciones')
    .from('inventario_almacen')
    .delete()
    .eq('id', input.inventarioId);
  if (inventoryError) throw new Error(`[WAREHOUSE-INVENTORY] ${inventoryError.message}`);
}
