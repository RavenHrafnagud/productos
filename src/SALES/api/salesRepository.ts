/**
 * Repositorio de ventas.
 * Gestiona listado y registro de ventas simples para panel administrativo.
 */
import { listBranches } from '../../BRANCHES/api/branchRepository';
import { getProductsByIds } from '../../PRODUCTS/api/productRepository';
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { sanitizeText } from '../../SHARED/utils/validators';
import type { CreateSaleInput, SaleRecord, UpdateSaleInput } from '../types/Sale';

const SALES_SELECT_FULL =
  'id, local_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, total, fecha, estado, moneda, numero_comprobante, observaciones';
const SALES_SELECT_NO_MONEDA =
  'id, local_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, total, fecha, estado, numero_comprobante, observaciones';
const SALES_SELECT_MINIMAL =
  'id, local_id, usuario_id, producto_id, cantidad, precio_unitario, subtotal, impuestos, descuento, total, fecha, numero_comprobante, observaciones';

type SaleRow = {
  id: string;
  local_id: string;
  usuario_id?: string;
  producto_id?: string | null;
  cantidad?: number | string | null;
  precio_unitario?: number | string | null;
  subtotal?: number | string | null;
  impuestos?: number | string | null;
  descuento?: number | string | null;
  total?: number | string | null;
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

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(usuario_id|producto_id|cantidad|precio_unitario|subtotal|impuestos|descuento|estado|moneda|total|numero_comprobante|observaciones)/i.test(rawError);
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

  return {
    id: row.id,
    localId: row.local_id,
    localNombre: branchNames.get(row.local_id) ?? 'Sucursal no encontrada',
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
    fecha: row.fecha,
    estado: row.estado ?? 'CONFIRMADA',
    moneda: row.moneda ?? 'COP',
    numeroComprobante: row.numero_comprobante ?? null,
    observaciones: row.observaciones ?? null,
  };
}

async function getSaleById(saleId: string) {
  const supabase = getSupabaseClient();
  const selectAttempts = [SALES_SELECT_FULL, SALES_SELECT_NO_MONEDA, SALES_SELECT_MINIMAL];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const queryResult = await supabase
      .schema('ventas')
      .from('ventas')
      .select(selection)
      .eq('id', saleId)
      .maybeSingle();

    if (!queryResult.error) {
      return (queryResult.data ?? null) as SaleRow | null;
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[SALES] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[SALES] ${lastCompatibilityError ?? 'No fue posible leer la venta creada.'}`);
}

export async function listSales(limit = 120): Promise<SaleRecord[]> {
  const supabase = getSupabaseClient();
  const selectAttempts = [SALES_SELECT_FULL, SALES_SELECT_NO_MONEDA, SALES_SELECT_MINIMAL];
  let rows: SaleRow[] = [];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
    const queryResult = await supabase
      .schema('ventas')
      .from('ventas')
      .select(selection)
      .order('fecha', { ascending: false })
      .limit(limit);

    if (!queryResult.error) {
      rows = (queryResult.data ?? []) as unknown as SaleRow[];
      break;
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[SALES] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  if (rows.length === 0 && lastCompatibilityError) {
    throw new Error(`[SALES] ${lastCompatibilityError}`);
  }

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

async function getUserNamesByIds(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const supabase = getSupabaseClient();
  const usersResult = await supabase
    .schema('identidad')
    .from('usuarios')
    .select('id, persona_id')
    .in('id', userIds);
  if (usersResult.error) {
    // Si identidad no esta expuesto por RLS/Data API, usa identificador tecnico como fallback.
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

export async function createSale(input: CreateSaleInput): Promise<SaleRecord> {
  const supabase = getSupabaseClient();
  const { data: authUserData } = await supabase.auth.getUser();
  const authUserId = authUserData.user?.id;
  if (!authUserId) {
    throw new Error('No se encontro un usuario autenticado para registrar la venta.');
  }

  const subtotal = input.cantidad * input.precioUnitario;
  const total = subtotal + input.impuestos - input.descuento;
  const cleanComprobante = sanitizeText(input.numeroComprobante, 80) || null;
  const cleanObservaciones = sanitizeText(input.observaciones, 220) || null;
  const insertAttempts: Array<Record<string, string | number>> = [
    {
      local_id: input.localId,
      usuario_id: authUserId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: input.descuento,
      total,
      fecha: input.fecha,
      estado: input.estado,
      moneda: input.moneda,
      numero_comprobante: cleanComprobante ?? '',
      observaciones: cleanObservaciones ?? '',
    },
    {
      local_id: input.localId,
      usuario_id: authUserId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: input.descuento,
      fecha: input.fecha,
      estado: input.estado,
      moneda: input.moneda,
      numero_comprobante: cleanComprobante ?? '',
      observaciones: cleanObservaciones ?? '',
    },
    {
      local_id: input.localId,
      usuario_id: authUserId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: input.descuento,
      fecha: input.fecha,
      estado: input.estado,
      numero_comprobante: cleanComprobante ?? '',
      observaciones: cleanObservaciones ?? '',
    },
    {
      local_id: input.localId,
      usuario_id: authUserId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: input.descuento,
      fecha: input.fecha,
      estado: input.estado,
    },
  ];
  let createdId: string | null = null;
  let lastCompatibilityError: string | null = null;

  for (const payload of insertAttempts) {
    const insertResult = await supabase
      .schema('ventas')
      .from('ventas')
      .insert(payload)
      .select('id')
      .single();

    if (!insertResult.error) {
      createdId = (insertResult.data as { id: string }).id;
      break;
    }

    if (!isCompatibilityColumnError(insertResult.error.message)) {
      throw new Error(`[SALES] ${insertResult.error.message}`);
    }
    lastCompatibilityError = insertResult.error.message;
  }

  if (!createdId) {
    throw new Error(`[SALES] ${lastCompatibilityError ?? 'No se pudo registrar la venta.'}`);
  }

  const createdSale = await getSaleById(createdId);
  if (!createdSale) {
    throw new Error('[SALES] La venta fue creada pero no se pudo recuperar.');
  }

  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const productsById = createdSale.producto_id
    ? await getProductsByIds([createdSale.producto_id])
    : new Map();
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userNames = await getUserNamesByIds(createdSale.usuario_id ? [createdSale.usuario_id] : []);

  return mapSale(createdSale, branchNames, productNames, userNames);
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

async function updateSaleRecord(saleId: string, payloads: Array<Record<string, string | number | null>>) {
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

export async function updateSale(saleId: string, input: UpdateSaleInput): Promise<SaleRecord> {
  const normalizedId = saleId.trim();
  if (!normalizedId) throw new Error('No se recibio el identificador de la venta.');

  const previous = await getSaleById(normalizedId);
  if (!previous) throw new Error('No se encontro la venta a actualizar.');

  const actor = await resolveActorLabel();
  const subtotal = input.cantidad * input.precioUnitario;
  const total = subtotal + input.impuestos - input.descuento;
  const observaciones = composeAuditNote(previous.observaciones ?? null, input.observaciones, 'EDITADA', actor);

  const payloads: Array<Record<string, string | number | null>> = [
    {
      local_id: input.localId,
      producto_id: input.productoId,
      cantidad: input.cantidad,
      precio_unitario: input.precioUnitario,
      subtotal,
      impuestos: input.impuestos,
      descuento: input.descuento,
      total,
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
      total,
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
  const productsById = updated.producto_id
    ? await getProductsByIds([updated.producto_id])
    : new Map();
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
  if ((previous.estado ?? 'CONFIRMADA') === 'ANULADA') {
    throw new Error('La venta ya se encuentra anulada.');
  }

  const actor = await resolveActorLabel();
  const observaciones = composeAuditNote(previous.observaciones ?? null, previous.observaciones ?? null, 'ANULADA', actor);
  const payloads: Array<Record<string, string | number | null>> = [
    { estado: 'ANULADA', observaciones, updated_at: toIsoNow() },
    { estado: 'ANULADA', observaciones },
    { estado: 'ANULADA' },
  ];

  await updateSaleRecord(normalizedId, payloads);

  const updated = await getSaleById(normalizedId);
  if (!updated) throw new Error('La venta se anulo pero no se pudo recuperar.');

  const branches = await listBranches();
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));
  const productsById = updated.producto_id
    ? await getProductsByIds([updated.producto_id])
    : new Map();
  const productNames = new Map<string, string>(
    [...productsById.entries()].map(([id, product]) => [id, product.nombre]),
  );
  const userNames = await getUserNamesByIds(updated.usuario_id ? [updated.usuario_id] : []);

  return mapSale(updated, branchNames, productNames, userNames);
}
