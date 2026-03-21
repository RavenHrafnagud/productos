/**
 * Repositorio de envios.
 * Centraliza registro y consulta de envios ligados a ventas y productos.
 */
import { listBranches } from '../../BRANCHES/api/branchRepository';
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { listWarehouses } from '../../WAREHOUSES/api/warehouseRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { sanitizeText } from '../../SHARED/utils/validators';
import type { CreateShipmentInput, ShipmentRecord, UpdateShipmentStatusInput } from '../types/Shipment';

const SHIPMENTS_SELECT_FULL =
  'id, almacen_id, local_id, usuario_id, producto_id, destinatario, tipo_destino, canal_venta, cantidad, precio_unitario, costo_envio, comision_porcentaje, estado_envio, fecha_envio, observaciones, ingreso_bruto, comision_valor, ganancia_neta, created_at, updated_at';
const SHIPMENTS_SELECT_MINIMAL =
  'id, almacen_id, local_id, usuario_id, producto_id, destinatario, tipo_destino, canal_venta, cantidad, precio_unitario, costo_envio, comision_porcentaje, estado_envio, fecha_envio, observaciones, created_at, updated_at';

type ShipmentRow = {
  id: string;
  almacen_id?: string | null;
  local_id?: string | null;
  usuario_id?: string | null;
  producto_id: string;
  destinatario: string;
  tipo_destino: ShipmentRecord['tipoDestino'];
  canal_venta?: ShipmentRecord['canalVenta'] | null;
  cantidad: number | string;
  precio_unitario: number | string;
  costo_envio?: number | string | null;
  comision_porcentaje?: number | string | null;
  estado_envio?: ShipmentRecord['estadoEnvio'] | null;
  fecha_envio: string;
  observaciones?: string | null;
  ingreso_bruto?: number | string | null;
  comision_valor?: number | string | null;
  ganancia_neta?: number | string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(almacen_id|canal_venta|ingreso_bruto|comision_valor|ganancia_neta|comision_porcentaje|estado_envio|fecha_envio)/i.test(rawError);
}

function mapShipment(
  row: ShipmentRow,
  warehouseNames: Map<string, string>,
  branchNames: Map<string, string>,
  productNames: Map<string, string>,
): ShipmentRecord {
  const cantidad = toNumber(row.cantidad);
  const precioUnitario = toNumber(row.precio_unitario);
  const costoEnvio = toNumber(row.costo_envio);
  const comisionPorcentaje = toNumber(row.comision_porcentaje);
  const ingresoBruto = toNumber(row.ingreso_bruto) || cantidad * precioUnitario;
  const comisionValor = toNumber(row.comision_valor) || (ingresoBruto * comisionPorcentaje) / 100;
  const gananciaNeta = toNumber(row.ganancia_neta) || ingresoBruto - comisionValor - costoEnvio;

  return {
    id: row.id,
    almacenId: row.almacen_id ?? null,
    almacenNombre: row.almacen_id ? warehouseNames.get(row.almacen_id) ?? 'Almacen no encontrado' : 'Sin almacen',
    localId: row.local_id ?? null,
    localNombre: row.local_id ? branchNames.get(row.local_id) ?? 'Sucursal no encontrada' : 'Sin sucursal',
    usuarioId: row.usuario_id ?? '',
    productoId: row.producto_id,
    productoNombre: productNames.get(row.producto_id) ?? 'Producto no encontrado',
    destinatario: row.destinatario,
    tipoDestino: row.tipo_destino,
    canalVenta: row.canal_venta ?? (row.tipo_destino === 'TIENDA' ? 'TIENDA' : 'DIRECTO'),
    cantidad,
    precioUnitario,
    costoEnvio,
    comisionPorcentaje,
    estadoEnvio: row.estado_envio ?? 'PENDIENTE',
    fechaEnvio: row.fecha_envio,
    observaciones: row.observaciones ?? null,
    ingresoBruto,
    comisionValor,
    gananciaNeta,
  };
}

async function getShipmentById(shipmentId: string): Promise<ShipmentRow | null> {
  const supabase = getSupabaseClient();
  const selectAttempts = [SHIPMENTS_SELECT_FULL, SHIPMENTS_SELECT_MINIMAL];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const queryResult = await supabase
      .schema('ventas')
      .from('envios')
      .select(selection)
      .eq('id', shipmentId)
      .maybeSingle();

    if (!queryResult.error) {
      return (queryResult.data ?? null) as ShipmentRow | null;
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[SHIPMENTS] ${lastCompatibilityError ?? 'No se pudo recuperar el envio creado.'}`);
}

export async function listShipments(limit = 200): Promise<ShipmentRecord[]> {
  const supabase = getSupabaseClient();
  const selectAttempts = [SHIPMENTS_SELECT_FULL, SHIPMENTS_SELECT_MINIMAL];
  let rows: ShipmentRow[] = [];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const queryResult = await supabase
      .schema('ventas')
      .from('envios')
      .select(selection)
      .order('fecha_envio', { ascending: false })
      .limit(limit);

    if (!queryResult.error) {
      rows = (queryResult.data ?? []) as unknown as ShipmentRow[];
      break;
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  if (rows.length === 0 && lastCompatibilityError) {
    throw new Error(`[SHIPMENTS] ${lastCompatibilityError}`);
  }

  const warehouses = await listWarehouses();
  const warehouseNames = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.nombre]));
  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const productIds = [...new Set(rows.map((row) => row.producto_id).filter((id) => Boolean(id)))];
  const productsById = await getProductsByIds(productIds);
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );

  return rows.map((row) => mapShipment(row, warehouseNames, branchNames, productNames));
}

export async function createShipment(input: CreateShipmentInput): Promise<ShipmentRecord> {
  const supabase = getSupabaseClient();
  const { data: authUserData } = await supabase.auth.getUser();
  const authUserId = authUserData.user?.id;

  if (!authUserId) {
    throw new Error('No se encontro un usuario autenticado para registrar el envio.');
  }

  const payload = {
    almacen_id: input.almacenId,
    local_id: input.localId,
    usuario_id: authUserId,
    producto_id: input.productoId,
    destinatario: sanitizeText(input.destinatario, 120),
    tipo_destino: input.tipoDestino,
    canal_venta: input.canalVenta,
    cantidad: input.cantidad,
    precio_unitario: input.precioUnitario,
    costo_envio: input.costoEnvio,
    comision_porcentaje: input.comisionPorcentaje,
    estado_envio: input.estadoEnvio,
    fecha_envio: input.fechaEnvio,
    observaciones: sanitizeText(input.observaciones, 240) || null,
  };

  if (!payload.almacen_id || !payload.destinatario || !payload.producto_id || payload.cantidad <= 0) {
    throw new Error('Almacen origen, destinatario, producto y cantidad son obligatorios para registrar un envio.');
  }

  const insertAttempts: Array<Record<string, string | number | null>> = [
    {
      almacen_id: payload.almacen_id,
      local_id: payload.local_id,
      usuario_id: payload.usuario_id,
      producto_id: payload.producto_id,
      destinatario: payload.destinatario,
      tipo_destino: payload.tipo_destino,
      canal_venta: payload.canal_venta,
      cantidad: payload.cantidad,
      precio_unitario: payload.precio_unitario,
      costo_envio: payload.costo_envio,
      comision_porcentaje: payload.comision_porcentaje,
      estado_envio: payload.estado_envio,
      fecha_envio: payload.fecha_envio,
      observaciones: payload.observaciones,
    },
    {
      almacen_id: payload.almacen_id,
      local_id: payload.local_id,
      usuario_id: payload.usuario_id,
      producto_id: payload.producto_id,
      destinatario: payload.destinatario,
      tipo_destino: payload.tipo_destino,
      cantidad: payload.cantidad,
      precio_unitario: payload.precio_unitario,
      costo_envio: payload.costo_envio,
      comision_porcentaje: payload.comision_porcentaje,
      estado_envio: payload.estado_envio,
      fecha_envio: payload.fecha_envio,
      observaciones: payload.observaciones,
    },
  ];

  let shipmentId: string | null = null;
  let lastCompatibilityError: string | null = null;

  for (const attempt of insertAttempts) {
    const insertResult = await supabase
      .schema('ventas')
      .from('envios')
      .insert(attempt)
      .select('id')
      .single();

    if (!insertResult.error) {
      shipmentId = (insertResult.data as { id: string }).id;
      break;
    }

    if (!isCompatibilityColumnError(insertResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${insertResult.error.message}`);
    }
    lastCompatibilityError = insertResult.error.message;
  }

  if (!shipmentId) {
    throw new Error(`[SHIPMENTS] ${lastCompatibilityError ?? 'No se pudo registrar el envio.'}`);
  }

  const created = await getShipmentById(shipmentId);
  if (!created) {
    throw new Error('[SHIPMENTS] El envio se registro pero no se pudo recuperar.');
  }

  const warehouses = await listWarehouses();
  const warehouseNames = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.nombre]));
  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const productsById = await getProductsByIds([created.producto_id]);
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );

  return mapShipment(created, warehouseNames, branchNames, productNames);
}

export async function updateShipmentStatus(input: UpdateShipmentStatusInput): Promise<ShipmentRecord> {
  const supabase = getSupabaseClient();
  const shipmentId = input.shipmentId.trim();
  if (!shipmentId) {
    throw new Error('No se recibio el identificador del envio.');
  }

  const updateAttempts: Array<Record<string, string>> = [
    {
      estado_envio: input.estadoEnvio,
      updated_at: new Date().toISOString(),
    },
    {
      estado_envio: input.estadoEnvio,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const payload of updateAttempts) {
    const updateResult = await supabase
      .schema('ventas')
      .from('envios')
      .update(payload)
      .eq('id', shipmentId);

    if (!updateResult.error) {
      const updated = await getShipmentById(shipmentId);
      if (!updated) {
        throw new Error('[SHIPMENTS] El envio se actualizo pero no se pudo recuperar.');
      }

      const warehouses = await listWarehouses();
      const warehouseNames = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.nombre]));
      const branches = await listBranches();
      const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
      const productsById = await getProductsByIds([updated.producto_id]);
      const productNames = new Map<string, string>(
        [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
      );
      return mapShipment(updated, warehouseNames, branchNames, productNames);
    }

    if (!isCompatibilityColumnError(updateResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${updateResult.error.message}`);
    }
    lastCompatibilityError = updateResult.error.message;
  }

  throw new Error(`[SHIPMENTS] ${lastCompatibilityError ?? 'No se pudo actualizar el estado del envio.'}`);
}
