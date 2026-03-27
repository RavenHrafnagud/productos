/**
 * Repositorio de ventas.
 * Gestiona listado y registro con flujo multiproducto por tipo de venta.
 */
import { listBranches } from '../../BRANCHES/api/branchRepository';
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { sanitizeText } from '../../SHARED/utils/validators';
import { listWarehouses } from '../../WAREHOUSES/api/warehouseRepository';
import type {
  CreateSaleInput,
  CreateSaleLineInput,
  SaleRecord,
  SaleShippingResponsible,
  SaleState,
  SaleType,
  UpdateSaleInput,
} from '../types/Sale';

const SALES_SELECT_FULL =
  'id, referencia_grupo, tipo_venta, local_id, almacen_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, descuento_porcentaje, descuento_valor, total, comision_porcentaje, comision_valor, cliente_documento, cliente_nombre, cliente_pais, cliente_ciudad, envio_responsable, requiere_envio, envio_registrado, fecha, estado, moneda, numero_comprobante, observaciones';
const SALES_SELECT_NO_NEW_COLUMNS =
  'id, local_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, total, fecha, estado, moneda, numero_comprobante, observaciones';
const SALES_SELECT_NO_MONEDA =
  'id, local_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, total, fecha, estado, numero_comprobante, observaciones';

const COMPATIBILITY_MIGRATION_HINT =
  'Ejecuta database/031_business_flow_sales_shipments_warehouses.sql, database/032_sales_individual_from_warehouse.sql y database/033_sales_discount_fields.sql en Supabase para habilitar el flujo comercial completo.';

type SaleRow = {
  id: string;
  referencia_grupo?: string | null;
  tipo_venta?: string | null;
  local_id?: string | null;
  almacen_id?: string | null;
  usuario_id?: string | null;
  producto_id?: string | null;
  cantidad?: number | string | null;
  precio_unitario?: number | string | null;
  subtotal?: number | string | null;
  impuestos?: number | string | null;
  descuento?: number | string | null;
  descuento_porcentaje?: number | string | null;
  descuento_valor?: number | string | null;
  total?: number | string | null;
  comision_porcentaje?: number | string | null;
  comision_valor?: number | string | null;
  cliente_documento?: string | null;
  cliente_nombre?: string | null;
  cliente_pais?: string | null;
  cliente_ciudad?: string | null;
  envio_responsable?: string | null;
  requiere_envio?: boolean | null;
  envio_registrado?: boolean | null;
  fecha: string;
  estado?: string | null;
  moneda?: string | null;
  numero_comprobante?: string | null;
  observaciones?: string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function splitAmountBySubtotal(
  lineItems: Array<{ cantidad: number; precioUnitario: number }>,
  totalAmount: number,
) {
  if (lineItems.length === 0) return [];
  const safeTotal = round2(Math.max(0, totalAmount));
  if (safeTotal === 0) return lineItems.map(() => 0);

  const subtotalByLine = lineItems.map((line) => round2(line.cantidad * line.precioUnitario));
  const grandSubtotal = subtotalByLine.reduce((sum, value) => sum + value, 0);
  if (grandSubtotal <= 0) return lineItems.map(() => 0);

  const parts: number[] = [];
  let assigned = 0;
  for (let index = 0; index < lineItems.length; index += 1) {
    if (index === lineItems.length - 1) {
      const remainder = round2(safeTotal - assigned);
      parts.push(remainder >= 0 ? remainder : 0);
      continue;
    }

    const proportional = round2((safeTotal * subtotalByLine[index]) / grandSubtotal);
    parts.push(proportional);
    assigned = round2(assigned + proportional);
  }

  return parts;
}

function normalizeSaleType(value: string | null | undefined, localId: string | null | undefined): SaleType {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'INDIVIDUAL') return 'INDIVIDUAL';
  if (normalized === 'SUCURSAL') return 'SUCURSAL';
  return localId ? 'SUCURSAL' : 'INDIVIDUAL';
}

function normalizeSaleState(value: string | null | undefined): SaleState {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'BORRADOR') return 'BORRADOR';
  if (normalized === 'ANULADA') return 'ANULADA';
  return 'CONFIRMADA';
}

function normalizeShippingResponsible(value: string | null | undefined): SaleShippingResponsible | null {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'CLIENTE') return 'CLIENTE';
  if (normalized === 'NOSOTROS') return 'NOSOTROS';
  return null;
}

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(usuario_id|producto_id|cantidad|precio_unitario|subtotal|impuestos|descuento|descuento_porcentaje|descuento_valor|estado|moneda|total|numero_comprobante|observaciones|tipo_venta|referencia_grupo|cliente_documento|envio_responsable|requiere_envio|envio_registrado|comision_porcentaje|comision_valor|almacen_id)/i.test(rawError);
}

function mapSale(
  row: SaleRow,
  branchNames: Map<string, string>,
  warehouseNames: Map<string, string>,
  productNames: Map<string, string>,
  userNames: Map<string, string>,
): SaleRecord {
  const cantidad = toNumber(row.cantidad);
  const precioUnitario = toNumber(row.precio_unitario);
  const subtotal = toNumber(row.subtotal) || cantidad * precioUnitario;
  const impuestos = toNumber(row.impuestos);
  const descuento = toNumber(row.descuento);
  const total = toNumber(row.total) || subtotal + impuestos - descuento;
  const tipoVenta = normalizeSaleType(row.tipo_venta, row.local_id ?? null);
  const comisionValorRaw = toNumber(row.comision_valor);
  const comisionPorcentajeRaw = toNumber(row.comision_porcentaje);
  const descuentoValorRaw = toNumber(row.descuento_valor);
  const descuentoPorcentajeRaw = toNumber(row.descuento_porcentaje);
  const comisionValor = comisionValorRaw > 0 ? comisionValorRaw : 0;
  const descuentoValor = descuentoValorRaw > 0 ? descuentoValorRaw : Math.max(descuento - comisionValor, 0);
  const comisionPorcentaje =
    comisionPorcentajeRaw > 0
      ? clampPercent(comisionPorcentajeRaw)
      : subtotal > 0
        ? clampPercent((comisionValor / subtotal) * 100)
        : 0;
  const descuentoPorcentaje =
    descuentoPorcentajeRaw > 0
      ? clampPercent(descuentoPorcentajeRaw)
      : subtotal > 0
        ? clampPercent((descuentoValor / subtotal) * 100)
        : 0;
  const localNameFallback = tipoVenta === 'INDIVIDUAL' ? 'Venta individual' : 'Sucursal no encontrada';

  return {
    id: row.id,
    referenciaGrupo: row.referencia_grupo ?? null,
    tipoVenta,
    localId: row.local_id ?? null,
    localNombre: row.local_id ? branchNames.get(row.local_id) ?? localNameFallback : localNameFallback,
    almacenId: row.almacen_id ?? null,
    almacenNombre: row.almacen_id
      ? warehouseNames.get(row.almacen_id) ?? 'Almacen no encontrado'
      : 'Sin almacen',
    usuarioId: row.usuario_id ?? '',
    usuarioNombre: row.usuario_id ? userNames.get(row.usuario_id) ?? 'Usuario no encontrado' : 'Sin usuario',
    productoId: row.producto_id ?? null,
    productoNombre: row.producto_id ? productNames.get(row.producto_id) ?? 'Producto no encontrado' : 'Sin producto',
    cantidad,
    precioUnitario,
    subtotal,
    impuestos,
    descuento,
    descuentoPorcentaje,
    descuentoValor,
    total,
    comisionPorcentaje,
    comisionValor,
    clienteDocumento: row.cliente_documento ?? null,
    clienteNombre: row.cliente_nombre ?? null,
    clientePais: row.cliente_pais ?? null,
    clienteCiudad: row.cliente_ciudad ?? null,
    envioResponsable: normalizeShippingResponsible(row.envio_responsable),
    requiereEnvio: Boolean(row.requiere_envio ?? false),
    envioRegistrado: Boolean(row.envio_registrado ?? false),
    fecha: row.fecha,
    estado: normalizeSaleState(row.estado),
    moneda: row.moneda ?? 'COP',
    numeroComprobante: row.numero_comprobante ?? null,
    observaciones: row.observaciones ?? null,
  };
}

async function querySales(selectClause: string, limit?: number, ids?: string[]) {
  const supabase = getSupabaseClient();
  let query = supabase.schema('ventas').from('ventas').select(selectClause);

  if (ids && ids.length > 0) {
    query = query.in('id', ids);
  }

  query = query.order('fecha', { ascending: false });

  if (typeof limit === 'number') {
    query = query.limit(limit);
  }

  return query;
}

async function loadSalesRows(limit = 120): Promise<SaleRow[]> {
  const selectAttempts = [SALES_SELECT_FULL, SALES_SELECT_NO_NEW_COLUMNS, SALES_SELECT_NO_MONEDA];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const result = await querySales(selection, limit);
    if (!result.error) {
      return (result.data ?? []) as unknown as SaleRow[];
    }

    if (!isCompatibilityColumnError(result.error.message)) {
      throw new Error(`[SALES] ${result.error.message}`);
    }
    lastCompatibilityError = result.error.message;
  }

  throw new Error(`[SALES] ${lastCompatibilityError ?? 'No se pudieron cargar ventas.'}`);
}

async function loadSalesRowsByIds(ids: string[]): Promise<SaleRow[]> {
  if (ids.length === 0) return [];

  const selectAttempts = [SALES_SELECT_FULL, SALES_SELECT_NO_NEW_COLUMNS, SALES_SELECT_NO_MONEDA];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const result = await querySales(selection, undefined, ids);
    if (!result.error) {
      return (result.data ?? []) as unknown as SaleRow[];
    }

    if (!isCompatibilityColumnError(result.error.message)) {
      throw new Error(`[SALES] ${result.error.message}`);
    }
    lastCompatibilityError = result.error.message;
  }

  throw new Error(`[SALES] ${lastCompatibilityError ?? 'No se pudieron leer ventas.'}`);
}

async function getUserNamesByIds(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const supabase = getSupabaseClient();
  const usersResult = await supabase
    .schema('identidad')
    .from('usuarios')
    .select('id, persona_id')
    .in('id', userIds);
  if (usersResult.error) {
    return new Map(userIds.map((userId) => [userId, userId]));
  }

  const users = (usersResult.data ?? []) as Array<{ id: string; persona_id: string }>;
  const personaIds = [...new Set(users.map((user) => user.persona_id))];
  if (personaIds.length === 0) return new Map<string, string>();

  const personasResult = await supabase
    .schema('identidad')
    .from('personas')
    .select('id, nombres, apellidos')
    .in('id', personaIds);
  if (personasResult.error) {
    return new Map(users.map((user) => [user.id, user.id]));
  }

  const personas = (personasResult.data ?? []) as Array<{ id: string; nombres: string; apellidos: string }>;
  const personaNameById = new Map(
    personas.map((persona) => [persona.id, `${persona.nombres} ${persona.apellidos}`.trim()]),
  );

  return new Map(
    users.map((user) => [user.id, personaNameById.get(user.persona_id) ?? 'Usuario sin persona vinculada']),
  );
}

async function getWarehouseNames() {
  try {
    const warehouses = await listWarehouses();
    return new Map(warehouses.map((warehouse) => [warehouse.id, warehouse.nombre]));
  } catch {
    return new Map<string, string>();
  }
}

function generateReferenceGroup() {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const randomPart = Math.random().toString(16).slice(2).padEnd(12, '0');
  return `00000000-0000-4000-8000-${randomPart.slice(0, 12)}`;
}

function normalizeLineItems(lineItems: CreateSaleLineInput[]) {
  return lineItems
    .map((item) => ({
      productoId: item.productoId.trim(),
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precioUnitario),
    }))
    .filter((item) => item.productoId && Number.isFinite(item.cantidad) && item.cantidad > 0 && Number.isFinite(item.precioUnitario) && item.precioUnitario >= 0);
}

export async function listSales(limit = 120): Promise<SaleRecord[]> {
  const rows = await loadSalesRows(limit);
  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const warehouseNames = await getWarehouseNames();
  const productIds = [...new Set(rows.map((row) => row.producto_id).filter((id): id is string => Boolean(id)))];
  const productsById = await getProductsByIds(productIds);
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userIds = [...new Set(rows.map((row) => row.usuario_id).filter((id): id is string => Boolean(id)))];
  const userNames = await getUserNamesByIds(userIds);

  return rows.map((row) => mapSale(row, branchNames, warehouseNames, productNames, userNames));
}

export async function createSale(input: CreateSaleInput): Promise<SaleRecord[]> {
  const supabase = getSupabaseClient();
  const { data: authUserData } = await supabase.auth.getUser();
  const authUserId = authUserData.user?.id;
  if (!authUserId) {
    throw new Error('No se encontro un usuario autenticado para registrar la venta.');
  }

  const lineItems = normalizeLineItems(input.lineItems);
  if (lineItems.length === 0) {
    throw new Error('Debes seleccionar al menos un producto con cantidad valida.');
  }

  const saleType = input.tipoVenta;
  const localId = input.localId?.trim() || null;
  const warehouseId = input.almacenId?.trim() || null;
  if (saleType === 'SUCURSAL' && !localId) {
    throw new Error('Debes seleccionar una sucursal para ventas tipo sucursal.');
  }

  const clienteDocumento = sanitizeText(input.clienteDocumento ?? '', 40) || null;
  const clienteNombre = sanitizeText(input.clienteNombre ?? '', 120) || null;
  const clientePais = sanitizeText(input.clientePais ?? '', 40) || null;
  const clienteCiudad = sanitizeText(input.clienteCiudad ?? '', 80) || null;
  const envioResponsable = input.envioResponsable ?? null;

  if (saleType === 'INDIVIDUAL') {
    if (!warehouseId) {
      throw new Error('Para venta individual debes seleccionar el almacen de origen.');
    }
    if (!clienteDocumento || !clienteNombre || !clientePais || !clienteCiudad) {
      throw new Error('Para venta individual debes completar cedula, nombre, pais y ciudad del comprador.');
    }
    if (envioResponsable !== 'CLIENTE' && envioResponsable !== 'NOSOTROS') {
      throw new Error('Para venta individual debes indicar quien paga el envio.');
    }
  }

  const commissionPercentage = saleType === 'SUCURSAL' ? clampPercent(input.comisionPorcentaje) : 0;
  const discountPercentage = clampPercent(input.descuentoPorcentaje);
  const referenceGroup = generateReferenceGroup();
  const cleanComprobante = sanitizeText(input.numeroComprobante, 80) || null;
  const cleanObservaciones = sanitizeText(input.observaciones, 220) || null;
  const saleDateIso = new Date(input.fecha).toISOString();
  const requiresShipping = saleType === 'INDIVIDUAL' && envioResponsable === 'NOSOTROS';
  const subtotalTotal = lineItems.reduce((sum, line) => sum + line.cantidad * line.precioUnitario, 0);
  const totalCommissionValue = round2((subtotalTotal * commissionPercentage) / 100);
  const totalDiscountValue = round2((subtotalTotal * discountPercentage) / 100);
  const commissionByLine = splitAmountBySubtotal(lineItems, totalCommissionValue);
  const discountByLine = splitAmountBySubtotal(lineItems, totalDiscountValue);

  const rowsToInsert = lineItems.map((line, index) => {
    const subtotal = round2(line.cantidad * line.precioUnitario);
    const comisionValor = commissionByLine[index] ?? 0;
    const descuentoValor = discountByLine[index] ?? 0;
    const descuentoTotal = round2(comisionValor + descuentoValor);
    return {
      referencia_grupo: referenceGroup,
      tipo_venta: saleType,
      local_id: saleType === 'SUCURSAL' ? localId : null,
      almacen_id: saleType === 'INDIVIDUAL' ? warehouseId : null,
      usuario_id: authUserId,
      producto_id: line.productoId,
      cantidad: Number(line.cantidad.toFixed(2)),
      precio_unitario: Number(line.precioUnitario.toFixed(2)),
      subtotal,
      impuestos: 0,
      descuento: descuentoTotal,
      descuento_porcentaje: discountPercentage,
      descuento_valor: descuentoValor,
      comision_porcentaje: commissionPercentage,
      comision_valor: comisionValor,
      cliente_documento: saleType === 'INDIVIDUAL' ? clienteDocumento : null,
      cliente_nombre: saleType === 'INDIVIDUAL' ? clienteNombre : null,
      cliente_pais: saleType === 'INDIVIDUAL' ? clientePais : null,
      cliente_ciudad: saleType === 'INDIVIDUAL' ? clienteCiudad : null,
      envio_responsable: saleType === 'INDIVIDUAL' ? envioResponsable : null,
      requiere_envio: requiresShipping,
      envio_registrado: false,
      fecha: saleDateIso,
      estado: input.estado,
      moneda: sanitizeText(input.moneda, 3).toUpperCase() || 'COP',
      numero_comprobante: cleanComprobante,
      observaciones: cleanObservaciones,
    };
  });

  const insertResult = await supabase
    .schema('ventas')
    .from('ventas')
    .insert(rowsToInsert)
    .select('id');

  if (insertResult.error) {
    if (/null value in column \"local_id\"/i.test(insertResult.error.message)) {
      throw new Error(`[SALES] ${COMPATIBILITY_MIGRATION_HINT}`);
    }
    if (isCompatibilityColumnError(insertResult.error.message)) {
      throw new Error(`[SALES] ${COMPATIBILITY_MIGRATION_HINT}`);
    }
    throw new Error(`[SALES] ${insertResult.error.message}`);
  }

  const createdIds = ((insertResult.data ?? []) as Array<{ id: string }>).map((row) => row.id);
  const createdRows = await loadSalesRowsByIds(createdIds);

  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const warehouseNames = await getWarehouseNames();
  const productIds = [...new Set(createdRows.map((row) => row.producto_id).filter((id): id is string => Boolean(id)))];
  const productsById = await getProductsByIds(productIds);
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userIds = [...new Set(createdRows.map((row) => row.usuario_id).filter((id): id is string => Boolean(id)))];
  const userNames = await getUserNamesByIds(userIds);

  return createdRows.map((row) => mapSale(row, branchNames, warehouseNames, productNames, userNames));
}

function toIsoNow() {
  return new Date().toISOString();
}

function composeAuditNote(previousNote: string | null, nextNote: string | null, action: string, actor: string) {
  const cleanPrevious = sanitizeText(previousNote ?? '', 220);
  const cleanNext = sanitizeText(nextNote ?? '', 220);
  const marker = `[${action}] ${toIsoNow()} por ${actor}`;
  const base = cleanNext || cleanPrevious;
  if (!base) return marker;
  return `${base} | ${marker}`.slice(0, 220);
}

async function resolveActorLabel() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? data.user?.id ?? 'usuario_desconocido';
}

async function updateSaleRecord(saleId: string, payloads: Array<Record<string, string | number | null | boolean>>) {
  const supabase = getSupabaseClient();
  let lastCompatibilityError: string | null = null;

  for (const payload of payloads) {
    const updateResult = await supabase
      .schema('ventas')
      .from('ventas')
      .update(payload)
      .eq('id', saleId);

    if (!updateResult.error) return;

    if (!isCompatibilityColumnError(updateResult.error.message)) {
      throw new Error(`[SALES] ${updateResult.error.message}`);
    }
    lastCompatibilityError = updateResult.error.message;
  }

  throw new Error(`[SALES] ${lastCompatibilityError ?? 'No se pudo actualizar la venta.'}`);
}

async function getSaleById(saleId: string): Promise<SaleRow | null> {
  const rows = await loadSalesRowsByIds([saleId]);
  return rows[0] ?? null;
}

export async function updateSale(saleId: string, input: UpdateSaleInput): Promise<SaleRecord> {
  const normalizedId = saleId.trim();
  if (!normalizedId) throw new Error('No se recibio el identificador de la venta.');

  const previous = await getSaleById(normalizedId);
  if (!previous) throw new Error('No se encontro la venta a actualizar.');

  const actor = await resolveActorLabel();
  const subtotal = input.cantidad * input.precioUnitario;
  const comisionPorcentaje = clampPercent(input.comisionPorcentaje);
  const descuentoPorcentaje = clampPercent(input.descuentoPorcentaje);
  const comisionValor = round2((subtotal * comisionPorcentaje) / 100);
  const descuentoValor = round2((subtotal * descuentoPorcentaje) / 100);
  const descuentoTotal = round2(comisionValor + descuentoValor);
  const observaciones = composeAuditNote(previous.observaciones ?? null, input.observaciones, 'EDITADA', actor);

  const payloads: Array<Record<string, string | number | null | boolean>> = [
    {
      local_id: input.localId,
      almacen_id: input.almacenId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: descuentoTotal,
      descuento_porcentaje: descuentoPorcentaje,
      descuento_valor: descuentoValor,
      comision_porcentaje: comisionPorcentaje,
      comision_valor: comisionValor,
      fecha: input.fecha,
      estado: input.estado,
      moneda: input.moneda,
      numero_comprobante: sanitizeText(input.numeroComprobante, 80) || null,
      observaciones,
      updated_at: toIsoNow(),
    },
    {
      local_id: input.localId,
      almacen_id: input.almacenId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: descuentoTotal,
      fecha: input.fecha,
      estado: input.estado,
      moneda: input.moneda,
      numero_comprobante: sanitizeText(input.numeroComprobante, 80) || null,
      observaciones,
    },
    {
      local_id: input.localId,
      almacen_id: input.almacenId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: descuentoTotal,
      fecha: input.fecha,
      estado: input.estado,
      numero_comprobante: sanitizeText(input.numeroComprobante, 80) || null,
      observaciones,
    },
  ];

  await updateSaleRecord(normalizedId, payloads);

  const updated = await getSaleById(normalizedId);
  if (!updated) throw new Error('La venta se actualizo pero no se pudo recuperar.');

  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const warehouseNames = await getWarehouseNames();
  const productsById = updated.producto_id ? await getProductsByIds([updated.producto_id]) : new Map();
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userNames = await getUserNamesByIds(updated.usuario_id ? [updated.usuario_id] : []);

  return mapSale(updated, branchNames, warehouseNames, productNames, userNames);
}

export async function annulSale(saleId: string): Promise<SaleRecord> {
  const normalizedId = saleId.trim();
  if (!normalizedId) throw new Error('No se recibio el identificador de la venta.');

  const previous = await getSaleById(normalizedId);
  if (!previous) throw new Error('No se encontro la venta a anular.');
  if (normalizeSaleState(previous.estado) === 'ANULADA') {
    throw new Error('La venta ya se encuentra anulada.');
  }

  const actor = await resolveActorLabel();
  const observaciones = composeAuditNote(previous.observaciones ?? null, previous.observaciones ?? null, 'ANULADA', actor);
  const payloads: Array<Record<string, string | number | null | boolean>> = [
    { estado: 'ANULADA', observaciones, updated_at: toIsoNow() },
    { estado: 'ANULADA', observaciones },
    { estado: 'ANULADA' },
  ];

  await updateSaleRecord(normalizedId, payloads);

  const updated = await getSaleById(normalizedId);
  if (!updated) throw new Error('La venta se anulo pero no se pudo recuperar.');

  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const warehouseNames = await getWarehouseNames();
  const productsById = updated.producto_id ? await getProductsByIds([updated.producto_id]) : new Map();
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userNames = await getUserNamesByIds(updated.usuario_id ? [updated.usuario_id] : []);

  return mapSale(updated, branchNames, warehouseNames, productNames, userNames);
}
