/**
 * Repositorio de envios.
 * Soporta envios por sucursal/individual con multiproducto.
 */
import { listBranches } from '../../BRANCHES/api/branchRepository';
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { sanitizeText } from '../../SHARED/utils/validators';
import { listWarehouses } from '../../WAREHOUSES/api/warehouseRepository';
import type {
  CreateShipmentInput,
  CreateShipmentLineInput,
  PendingIndividualShipmentTarget,
  ShipmentRecord,
  ShipmentStatus,
  ShipmentType,
  UpdateShipmentStatusInput,
} from '../types/Shipment';

const SHIPMENTS_SELECT_FULL =
  'id, referencia_venta_grupo, tipo_envio, almacen_id, local_id, usuario_id, cliente_documento, cliente_nombre, producto_id, destinatario, canal_venta, cantidad, precio_unitario, costo_envio, estado_envio, fecha_envio, observaciones, ingreso_bruto, comision_valor, ganancia_neta';
const SHIPMENTS_SELECT_LEGACY =
  'id, almacen_id, local_id, usuario_id, producto_id, destinatario, tipo_destino, canal_venta, cantidad, precio_unitario, costo_envio, estado_envio, fecha_envio, observaciones, ingreso_bruto, comision_valor, ganancia_neta';

const MIGRATION_HINT =
  'Ejecuta database/031_business_flow_sales_shipments_warehouses.sql en Supabase para habilitar el flujo nuevo de envios.';

type ShipmentRow = {
  id: string;
  referencia_venta_grupo?: string | null;
  tipo_envio?: string | null;
  almacen_id?: string | null;
  local_id?: string | null;
  usuario_id?: string | null;
  cliente_documento?: string | null;
  cliente_nombre?: string | null;
  producto_id: string;
  destinatario: string;
  tipo_destino?: string | null;
  canal_venta?: string | null;
  cantidad: number | string;
  precio_unitario: number | string;
  costo_envio?: number | string | null;
  estado_envio?: string | null;
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

function normalizeShipmentType(row: ShipmentRow): ShipmentType {
  const value = row.tipo_envio?.trim().toUpperCase();
  if (value === 'INDIVIDUAL') return 'INDIVIDUAL';
  if (value === 'SUCURSAL') return 'SUCURSAL';
  return row.canal_venta?.toUpperCase() === 'TIENDA' ? 'SUCURSAL' : 'INDIVIDUAL';
}

function normalizeStatus(value: string | null | undefined): ShipmentStatus {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'ENVIADO') return 'ENVIADO';
  if (normalized === 'ENTREGADO') return 'ENTREGADO';
  return 'PENDIENTE';
}

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(tipo_envio|referencia_venta_grupo|cliente_documento|cliente_nombre|tipo_destino|ingreso_bruto|comision_valor|ganancia_neta)/i.test(rawError);
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
  const ingresoBruto = toNumber(row.ingreso_bruto) || cantidad * precioUnitario;
  const comisionValor = toNumber(row.comision_valor);
  const gananciaNeta = toNumber(row.ganancia_neta) || ingresoBruto - comisionValor - costoEnvio;

  const tipoEnvio = normalizeShipmentType(row);

  return {
    id: row.id,
    referenciaVentaGrupo: row.referencia_venta_grupo ?? null,
    tipoEnvio,
    almacenId: row.almacen_id ?? null,
    almacenNombre: row.almacen_id ? warehouseNames.get(row.almacen_id) ?? 'Almacen no encontrado' : 'Sin almacen',
    localId: row.local_id ?? null,
    localNombre: row.local_id ? branchNames.get(row.local_id) ?? 'Sucursal no encontrada' : 'Sin sucursal',
    usuarioId: row.usuario_id ?? '',
    clienteDocumento: row.cliente_documento ?? null,
    clienteNombre: row.cliente_nombre ?? null,
    productoId: row.producto_id,
    productoNombre: productNames.get(row.producto_id) ?? 'Producto no encontrado',
    destinatario: row.destinatario,
    canalVenta: row.canal_venta?.toUpperCase() === 'TIENDA' ? 'TIENDA' : 'DIRECTO',
    cantidad,
    precioUnitario,
    costoEnvio,
    estadoEnvio: normalizeStatus(row.estado_envio),
    fechaEnvio: row.fecha_envio,
    observaciones: row.observaciones ?? null,
    ingresoBruto,
    comisionValor,
    gananciaNeta,
  };
}

async function queryShipments(selectClause: string, limit?: number, ids?: string[]) {
  const supabase = getSupabaseClient();
  let query = supabase.schema('ventas').from('envios').select(selectClause);

  if (ids && ids.length > 0) {
    query = query.in('id', ids);
  }

  query = query.order('fecha_envio', { ascending: false });

  if (typeof limit === 'number') {
    query = query.limit(limit);
  }

  return query;
}

async function loadShipmentRows(limit = 200): Promise<ShipmentRow[]> {
  const selectAttempts = [SHIPMENTS_SELECT_FULL, SHIPMENTS_SELECT_LEGACY];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const result = await queryShipments(selection, limit);
    if (!result.error) {
      return (result.data ?? []) as unknown as ShipmentRow[];
    }

    if (!isCompatibilityColumnError(result.error.message)) {
      throw new Error(`[SHIPMENTS] ${result.error.message}`);
    }
    lastCompatibilityError = result.error.message;
  }

  throw new Error(`[SHIPMENTS] ${lastCompatibilityError ?? 'No se pudieron cargar envios.'}`);
}

async function loadShipmentRowsByIds(ids: string[]): Promise<ShipmentRow[]> {
  if (ids.length === 0) return [];
  const selectAttempts = [SHIPMENTS_SELECT_FULL, SHIPMENTS_SELECT_LEGACY];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const result = await queryShipments(selection, undefined, ids);
    if (!result.error) {
      return (result.data ?? []) as unknown as ShipmentRow[];
    }

    if (!isCompatibilityColumnError(result.error.message)) {
      throw new Error(`[SHIPMENTS] ${result.error.message}`);
    }
    lastCompatibilityError = result.error.message;
  }

  throw new Error(`[SHIPMENTS] ${lastCompatibilityError ?? 'No se pudieron leer envios.'}`);
}

export async function listShipments(limit = 200): Promise<ShipmentRecord[]> {
  const rows = await loadShipmentRows(limit);
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

export async function listPendingIndividualShipmentTargets(): Promise<PendingIndividualShipmentTarget[]> {
  const supabase = getSupabaseClient();
  const salesResult = await supabase
    .schema('ventas')
    .from('ventas')
    .select(
      'id, referencia_grupo, cliente_documento, cliente_nombre, cliente_pais, cliente_ciudad, fecha, cantidad, total, tipo_venta, requiere_envio, envio_registrado, estado',
    )
    .eq('tipo_venta', 'INDIVIDUAL')
    .eq('requiere_envio', true)
    .eq('envio_registrado', false)
    .order('fecha', { ascending: false })
    .limit(400);

  if (salesResult.error) {
    if (isCompatibilityColumnError(salesResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${MIGRATION_HINT}`);
    }
    throw new Error(`[SHIPMENTS] ${salesResult.error.message}`);
  }

  type SalesPendingRow = {
    referencia_grupo: string | null;
    cliente_documento: string | null;
    cliente_nombre: string | null;
    cliente_pais: string | null;
    cliente_ciudad: string | null;
    fecha: string;
    cantidad: number | string | null;
    total: number | string | null;
    estado: string | null;
  };

  const grouped = new Map<string, PendingIndividualShipmentTarget>();
  const rows = (salesResult.data ?? []) as SalesPendingRow[];

  for (const row of rows) {
    const reference = row.referencia_grupo ?? null;
    if (!reference) continue;
    if ((row.estado ?? '').toUpperCase() !== 'CONFIRMADA') continue;

    const current = grouped.get(reference);
    if (!current) {
      grouped.set(reference, {
        referenciaGrupo: reference,
        clienteDocumento: row.cliente_documento ?? 'SIN_DOCUMENTO',
        clienteNombre: row.cliente_nombre ?? 'Cliente sin nombre',
        clientePais: row.cliente_pais ?? null,
        clienteCiudad: row.cliente_ciudad ?? null,
        fechaVenta: row.fecha,
        totalItems: 1,
        totalUnidades: toNumber(row.cantidad),
        totalNeto: toNumber(row.total),
      });
      continue;
    }

    current.totalItems += 1;
    current.totalUnidades += toNumber(row.cantidad);
    current.totalNeto += toNumber(row.total);
  }

  return [...grouped.values()].sort((a, b) => (a.fechaVenta < b.fechaVenta ? 1 : -1));
}

export async function listPendingIndividualShipmentLines(referenceGroup: string): Promise<CreateShipmentLineInput[]> {
  const normalizedGroup = referenceGroup.trim();
  if (!normalizedGroup) return [];

  const supabase = getSupabaseClient();
  const salesResult = await supabase
    .schema('ventas')
    .from('ventas')
    .select('producto_id, cantidad, precio_unitario, estado, tipo_venta, requiere_envio, envio_registrado')
    .eq('tipo_venta', 'INDIVIDUAL')
    .eq('requiere_envio', true)
    .eq('envio_registrado', false)
    .eq('referencia_grupo', normalizedGroup)
    .order('fecha', { ascending: true });

  if (salesResult.error) {
    if (isCompatibilityColumnError(salesResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${MIGRATION_HINT}`);
    }
    throw new Error(`[SHIPMENTS] ${salesResult.error.message}`);
  }

  type SalesLine = {
    producto_id: string | null;
    cantidad: number | string | null;
    precio_unitario: number | string | null;
    estado: string | null;
  };

  const grouped = new Map<string, CreateShipmentLineInput>();
  const rows = (salesResult.data ?? []) as SalesLine[];

  for (const row of rows) {
    if (!row.producto_id) continue;
    if ((row.estado ?? '').toUpperCase() !== 'CONFIRMADA') continue;

    const current = grouped.get(row.producto_id);
    if (!current) {
      grouped.set(row.producto_id, {
        productoId: row.producto_id,
        cantidad: toNumber(row.cantidad),
        precioUnitario: toNumber(row.precio_unitario),
      });
      continue;
    }

    current.cantidad += toNumber(row.cantidad);
    if (!current.precioUnitario) {
      current.precioUnitario = toNumber(row.precio_unitario);
    }
  }

  return [...grouped.values()].filter((line) => line.cantidad > 0);
}

function normalizeLineItems(lineItems: CreateShipmentLineInput[]) {
  return lineItems
    .map((line) => ({
      productoId: line.productoId.trim(),
      cantidad: Number(line.cantidad),
      precioUnitario: Number(line.precioUnitario),
    }))
    .filter(
      (line) =>
        line.productoId &&
        Number.isFinite(line.cantidad) &&
        line.cantidad > 0 &&
        Number.isFinite(line.precioUnitario) &&
        line.precioUnitario >= 0,
    );
}

function distributeShippingCost(lineItems: Array<{ cantidad: number; precioUnitario: number }>, totalCost: number) {
  const safeCost = Math.max(0, Number.isFinite(totalCost) ? totalCost : 0);
  if (lineItems.length === 0) return [];
  if (lineItems.length === 1) return [safeCost];

  const bases = lineItems.map((line) => Math.max(0, line.cantidad * line.precioUnitario));
  const totalBase = bases.reduce((sum, base) => sum + base, 0);

  if (totalBase <= 0) {
    const equal = Number((safeCost / lineItems.length).toFixed(2));
    const costs = lineItems.map(() => equal);
    const diff = Number((safeCost - costs.reduce((sum, item) => sum + item, 0)).toFixed(2));
    costs[costs.length - 1] = Number((costs[costs.length - 1] + diff).toFixed(2));
    return costs;
  }

  const costs: number[] = [];
  let accumulated = 0;
  for (let index = 0; index < lineItems.length; index += 1) {
    if (index === lineItems.length - 1) {
      costs.push(Number((safeCost - accumulated).toFixed(2)));
      break;
    }
    const cost = Number(((safeCost * bases[index]) / totalBase).toFixed(2));
    costs.push(cost);
    accumulated += cost;
  }

  return costs;
}

export async function createShipment(input: CreateShipmentInput): Promise<ShipmentRecord[]> {
  const supabase = getSupabaseClient();
  const { data: authUserData } = await supabase.auth.getUser();
  const authUserId = authUserData.user?.id;

  if (!authUserId) {
    throw new Error('No se encontro un usuario autenticado para registrar el envio.');
  }

  const shipmentType = input.tipoEnvio;
  const lineItems = normalizeLineItems(input.lineItems);
  if (lineItems.length === 0) {
    throw new Error('Debes seleccionar al menos un producto con cantidad valida para registrar el envio.');
  }

  const warehouseId = input.almacenId?.trim() || null;
  if (!warehouseId) {
    throw new Error('Debes seleccionar almacen origen.');
  }

  const localId = shipmentType === 'SUCURSAL' ? input.localId?.trim() || null : null;
  if (shipmentType === 'SUCURSAL' && !localId) {
    throw new Error('Debes seleccionar la sucursal destino para envios de sucursal.');
  }

  const destinatarioRaw = sanitizeText(input.destinatario ?? '', 120);
  const customerName = sanitizeText(input.clienteNombre ?? '', 120) || null;
  const customerDocument = sanitizeText(input.clienteDocumento ?? '', 40) || null;

  const destinatario =
    shipmentType === 'SUCURSAL'
      ? destinatarioRaw || 'Sucursal destino'
      : destinatarioRaw || customerName || customerDocument || 'Cliente individual';

  const channel = shipmentType === 'SUCURSAL' ? 'TIENDA' : 'DIRECTO';
  const shippingCosts = distributeShippingCost(lineItems, input.costoEnvioTotal);

  const rowsToInsert = lineItems.map((line, index) => ({
    tipo_envio: shipmentType,
    referencia_venta_grupo: input.referenciaVentaGrupo,
    almacen_id: warehouseId,
    local_id: localId,
    usuario_id: authUserId,
    cliente_documento: shipmentType === 'INDIVIDUAL' ? customerDocument : null,
    cliente_nombre: shipmentType === 'INDIVIDUAL' ? customerName : null,
    producto_id: line.productoId,
    destinatario: destinatario,
    tipo_destino: shipmentType === 'SUCURSAL' ? 'TIENDA' : 'CLIENTE',
    canal_venta: channel,
    cantidad: Number(line.cantidad.toFixed(2)),
    precio_unitario: Number(line.precioUnitario.toFixed(2)),
    costo_envio: Number((shippingCosts[index] ?? 0).toFixed(2)),
    comision_porcentaje: 0,
    estado_envio: input.estadoEnvio,
    fecha_envio: new Date(input.fechaEnvio).toISOString(),
    observaciones: sanitizeText(input.observaciones, 240) || null,
  }));

  const insertResult = await supabase.schema('ventas').from('envios').insert(rowsToInsert).select('id');

  if (insertResult.error) {
    if (/null value in column \"local_id\"/i.test(insertResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${MIGRATION_HINT}`);
    }
    if (isCompatibilityColumnError(insertResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${MIGRATION_HINT}`);
    }
    throw new Error(`[SHIPMENTS] ${insertResult.error.message}`);
  }

  if (shipmentType === 'INDIVIDUAL' && input.referenciaVentaGrupo) {
    const salesUpdateResult = await supabase
      .schema('ventas')
      .from('ventas')
      .update({ envio_registrado: true })
      .eq('referencia_grupo', input.referenciaVentaGrupo)
      .eq('tipo_venta', 'INDIVIDUAL')
      .eq('requiere_envio', true);

    if (salesUpdateResult.error && !isCompatibilityColumnError(salesUpdateResult.error.message)) {
      throw new Error(`[SHIPMENTS] ${salesUpdateResult.error.message}`);
    }
  }

  const createdIds = ((insertResult.data ?? []) as Array<{ id: string }>).map((row) => row.id);
  const createdRows = await loadShipmentRowsByIds(createdIds);

  const warehouses = await listWarehouses();
  const warehouseNames = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.nombre]));
  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const productsById = await getProductsByIds(createdRows.map((row) => row.producto_id));
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );

  return createdRows.map((row) => mapShipment(row, warehouseNames, branchNames, productNames));
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
      const updatedRows = await loadShipmentRowsByIds([shipmentId]);
      const updated = updatedRows[0] ?? null;
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
