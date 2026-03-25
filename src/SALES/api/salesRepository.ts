/**
 * Repositorio de ventas.
 * Gestiona listado y registro con flujo multiproducto por tipo de venta.
 */
import { listBranches } from '../../BRANCHES/api/branchRepository';
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { sanitizeText } from '../../SHARED/utils/validators';
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
  'id, referencia_grupo, tipo_venta, local_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, total, comision_porcentaje, comision_valor, cliente_documento, cliente_nombre, cliente_pais, cliente_ciudad, envio_responsable, requiere_envio, envio_registrado, fecha, estado, moneda, numero_comprobante, observaciones';
const SALES_SELECT_NO_NEW_COLUMNS =
  'id, local_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, total, fecha, estado, moneda, numero_comprobante, observaciones';
const SALES_SELECT_NO_MONEDA =
  'id, local_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, total, fecha, estado, numero_comprobante, observaciones';

const COMPATIBILITY_MIGRATION_HINT =
  'Ejecuta database/031_business_flow_sales_shipments_warehouses.sql en Supabase para habilitar el flujo de ventas multiproducto.';

type SaleRow = {
  id: string;
  referencia_grupo?: string | null;
  tipo_venta?: string | null;
  local_id?: string | null;
  usuario_id?: string | null;
  producto_id?: string | null;
  cantidad?: number | string | null;
  precio_unitario?: number | string | null;
  subtotal?: number | string | null;
  impuestos?: number | string | null;
  descuento?: number | string | null;
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
  return /does not exist/i.test(rawError) && /(usuario_id|producto_id|cantidad|precio_unitario|subtotal|impuestos|descuento|estado|moneda|total|numero_comprobante|observaciones|tipo_venta|referencia_grupo|cliente_documento|envio_responsable|requiere_envio|envio_registrado|comision_porcentaje|comision_valor)/i.test(rawError);
}

function mapSale(
  row: SaleRow,
  branchNames: Map<string, string>,
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
  const comisionPorcentaje =
    toNumber(row.comision_porcentaje) || (subtotal > 0 ? clampPercent((descuento / subtotal) * 100) : 0);
  const comisionValor = toNumber(row.comision_valor) || descuento;
  const localNameFallback = tipoVenta === 'INDIVIDUAL' ? 'Venta individual' : 'Sucursal no encontrada';

  return {
    id: row.id,
    referenciaGrupo: row.referencia_grupo ?? null,
    tipoVenta,
    localId: row.local_id ?? null,
    localNombre: row.local_id ? branchNames.get(row.local_id) ?? localNameFallback : localNameFallback,
    usuarioId: row.usuario_id ?? '',
    usuarioNombre: row.usuario_id ? userNames.get(row.usuario_id) ?? 'Usuario no encontrado' : 'Sin usuario',
    productoId: row.producto_id ?? null,
    productoNombre: row.producto_id ? productNames.get(row.producto_id) ?? 'Producto no encontrado' : 'Sin producto',
    cantidad,
    precioUnitario,
    subtotal,
    impuestos,
    descuento,
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
  const productIds = [...new Set(rows.map((row) => row.producto_id).filter((id): id is string => Boolean(id)))];
  const productsById = await getProductsByIds(productIds);
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userIds = [...new Set(rows.map((row) => row.usuario_id).filter((id): id is string => Boolean(id)))];
  const userNames = await getUserNamesByIds(userIds);

  return rows.map((row) => mapSale(row, branchNames, productNames, userNames));
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
  if (saleType === 'SUCURSAL' && !localId) {
    throw new Error('Debes seleccionar una sucursal para ventas tipo sucursal.');
  }

  const clienteDocumento = sanitizeText(input.clienteDocumento ?? '', 40) || null;
  const clienteNombre = sanitizeText(input.clienteNombre ?? '', 120) || null;
  const clientePais = sanitizeText(input.clientePais ?? '', 40) || null;
  const clienteCiudad = sanitizeText(input.clienteCiudad ?? '', 80) || null;
  const envioResponsable = input.envioResponsable ?? null;

  if (saleType === 'INDIVIDUAL') {
    if (!clienteDocumento || !clienteNombre || !clientePais || !clienteCiudad) {
      throw new Error('Para venta individual debes completar cedula, nombre, pais y ciudad del comprador.');
    }
    if (envioResponsable !== 'CLIENTE' && envioResponsable !== 'NOSOTROS') {
      throw new Error('Para venta individual debes indicar quien paga el envio.');
    }
  }

  const commissionPercentage = saleType === 'SUCURSAL' ? clampPercent(input.comisionPorcentaje) : 0;
  const referenceGroup = generateReferenceGroup();
  const cleanComprobante = sanitizeText(input.numeroComprobante, 80) || null;
  const cleanObservaciones = sanitizeText(input.observaciones, 220) || null;
  const saleDateIso = new Date(input.fecha).toISOString();
  const requiresShipping = saleType === 'INDIVIDUAL' && envioResponsable === 'NOSOTROS';

  const rowsToInsert = lineItems.map((line) => {
    const subtotal = Number((line.cantidad * line.precioUnitario).toFixed(2));
    const comisionValor = Number(((subtotal * commissionPercentage) / 100).toFixed(2));
    return {
      referencia_grupo: referenceGroup,
      tipo_venta: saleType,
      local_id: saleType === 'SUCURSAL' ? localId : null,
      usuario_id: authUserId,
      producto_id: line.productoId,
      cantidad: Number(line.cantidad.toFixed(2)),
      precio_unitario: Number(line.precioUnitario.toFixed(2)),
      subtotal,
      impuestos: 0,
      descuento: comisionValor,
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
  const productIds = [...new Set(createdRows.map((row) => row.producto_id).filter((id): id is string => Boolean(id)))];
  const productsById = await getProductsByIds(productIds);
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userIds = [...new Set(createdRows.map((row) => row.usuario_id).filter((id): id is string => Boolean(id)))];
  const userNames = await getUserNamesByIds(userIds);

  return createdRows.map((row) => mapSale(row, branchNames, productNames, userNames));
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
  const comisionPorcentaje = clampPercent(subtotal > 0 ? (input.descuento / subtotal) * 100 : 0);
  const observaciones = composeAuditNote(previous.observaciones ?? null, input.observaciones, 'EDITADA', actor);

  const payloads: Array<Record<string, string | number | null | boolean>> = [
    {
      local_id: input.localId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: input.descuento,
      comision_porcentaje: comisionPorcentaje,
      comision_valor: input.descuento,
      fecha: input.fecha,
      estado: input.estado,
      moneda: input.moneda,
      numero_comprobante: sanitizeText(input.numeroComprobante, 80) || null,
      observaciones,
      updated_at: toIsoNow(),
    },
    {
      local_id: input.localId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: input.descuento,
      fecha: input.fecha,
      estado: input.estado,
      moneda: input.moneda,
      numero_comprobante: sanitizeText(input.numeroComprobante, 80) || null,
      observaciones,
    },
    {
      local_id: input.localId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: input.descuento,
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
  const productsById = updated.producto_id ? await getProductsByIds([updated.producto_id]) : new Map();
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userNames = await getUserNamesByIds(updated.usuario_id ? [updated.usuario_id] : []);

  return mapSale(updated, branchNames, productNames, userNames);
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
  const productsById = updated.producto_id ? await getProductsByIds([updated.producto_id]) : new Map();
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userNames = await getUserNamesByIds(updated.usuario_id ? [updated.usuario_id] : []);

  return mapSale(updated, branchNames, productNames, userNames);
}
