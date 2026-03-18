/**
 * Repositorio de sucursales.
 * Encapsula lecturas/escrituras sobre operaciones.locales.
 */
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { isValidEmail, sanitizeText } from '../../SHARED/utils/validators';
import type { Branch, CreateBranchInput, UpdateBranchInput } from '../types/Branch';

const MAX_BRANCHES = 120;
const BRANCH_SELECT_WITH_LOCALITY_AND_STATE =
  'id, nit, rut, rut_pdf_url, porcentaje_comision, nombre, direccion, localidad, ciudad, pais, telefono, email, estado, created_at';
const BRANCH_SELECT_WITHOUT_LOCALITY_AND_STATE =
  'id, nit, rut, rut_pdf_url, porcentaje_comision, nombre, direccion, ciudad, pais, telefono, email, estado, created_at';
const BRANCH_SELECT_WITH_LOCALITY_AND_ACTIVE =
  'id, nit, rut, rut_pdf_url, porcentaje_comision, nombre, direccion, localidad, ciudad, pais, telefono, email, activo, created_at';
const BRANCH_SELECT_WITHOUT_LOCALITY_AND_ACTIVE =
  'id, nit, rut, rut_pdf_url, porcentaje_comision, nombre, direccion, ciudad, pais, telefono, email, activo, created_at';
const BRANCH_SELECT_WITH_LOCALITY_AND_STATE_LEGACY_DATE =
  'id, nit, rut, rut_pdf_url, porcentaje_comision, nombre, direccion, localidad, ciudad, pais, telefono, email, estado, fecha_creacion';
const BRANCH_SELECT_WITHOUT_LOCALITY_AND_STATE_LEGACY_DATE =
  'id, nit, rut, rut_pdf_url, porcentaje_comision, nombre, direccion, ciudad, pais, telefono, email, estado, fecha_creacion';
const BRANCH_SELECT_WITH_LOCALITY_AND_ACTIVE_LEGACY_DATE =
  'id, nit, rut, rut_pdf_url, porcentaje_comision, nombre, direccion, localidad, ciudad, pais, telefono, email, activo, fecha_creacion';
const BRANCH_SELECT_WITHOUT_LOCALITY_AND_ACTIVE_LEGACY_DATE =
  'id, nit, rut, rut_pdf_url, porcentaje_comision, nombre, direccion, ciudad, pais, telefono, email, activo, fecha_creacion';
const BRANCH_SELECT_LEGACY_WITH_LOCALITY_AND_STATE =
  'id, nit, nombre, direccion, localidad, ciudad, pais, telefono, email, estado, created_at';
const BRANCH_SELECT_LEGACY_WITHOUT_LOCALITY_AND_STATE =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, estado, created_at';
const BRANCH_SELECT_LEGACY_WITH_LOCALITY_AND_ACTIVE =
  'id, nit, nombre, direccion, localidad, ciudad, pais, telefono, email, activo, created_at';
const BRANCH_SELECT_LEGACY_WITHOUT_LOCALITY_AND_ACTIVE =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, activo, created_at';
const BRANCH_SELECT_LEGACY_WITH_LOCALITY_AND_STATE_LEGACY_DATE =
  'id, nit, nombre, direccion, localidad, ciudad, pais, telefono, email, estado, fecha_creacion';
const BRANCH_SELECT_LEGACY_WITHOUT_LOCALITY_AND_STATE_LEGACY_DATE =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, estado, fecha_creacion';
const BRANCH_SELECT_LEGACY_WITH_LOCALITY_AND_ACTIVE_LEGACY_DATE =
  'id, nit, nombre, direccion, localidad, ciudad, pais, telefono, email, activo, fecha_creacion';
const BRANCH_SELECT_LEGACY_WITHOUT_LOCALITY_AND_ACTIVE_LEGACY_DATE =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, activo, fecha_creacion';
const BRANCH_SELECT_ATTEMPTS = [
  BRANCH_SELECT_WITH_LOCALITY_AND_STATE,
  BRANCH_SELECT_WITHOUT_LOCALITY_AND_STATE,
  BRANCH_SELECT_WITH_LOCALITY_AND_ACTIVE,
  BRANCH_SELECT_WITHOUT_LOCALITY_AND_ACTIVE,
  BRANCH_SELECT_WITH_LOCALITY_AND_STATE_LEGACY_DATE,
  BRANCH_SELECT_WITHOUT_LOCALITY_AND_STATE_LEGACY_DATE,
  BRANCH_SELECT_WITH_LOCALITY_AND_ACTIVE_LEGACY_DATE,
  BRANCH_SELECT_WITHOUT_LOCALITY_AND_ACTIVE_LEGACY_DATE,
  BRANCH_SELECT_LEGACY_WITH_LOCALITY_AND_STATE,
  BRANCH_SELECT_LEGACY_WITHOUT_LOCALITY_AND_STATE,
  BRANCH_SELECT_LEGACY_WITH_LOCALITY_AND_ACTIVE,
  BRANCH_SELECT_LEGACY_WITHOUT_LOCALITY_AND_ACTIVE,
  BRANCH_SELECT_LEGACY_WITH_LOCALITY_AND_STATE_LEGACY_DATE,
  BRANCH_SELECT_LEGACY_WITHOUT_LOCALITY_AND_STATE_LEGACY_DATE,
  BRANCH_SELECT_LEGACY_WITH_LOCALITY_AND_ACTIVE_LEGACY_DATE,
  BRANCH_SELECT_LEGACY_WITHOUT_LOCALITY_AND_ACTIVE_LEGACY_DATE,
];

type BranchRow = {
  id: string;
  nit: string;
  rut?: string | null;
  rut_pdf_url?: string | null;
  porcentaje_comision?: number | string | null;
  nombre: string;
  direccion: string | null;
  localidad?: string | null;
  ciudad: string | null;
  pais: string;
  telefono: string | null;
  email: string | null;
  estado?: boolean | null;
  activo?: boolean | null;
  created_at?: string | null;
  fecha_creacion?: string | null;
};

function mapBranch(row: BranchRow): Branch {
  const porcentajeRaw = row.porcentaje_comision;
  const porcentajeComision =
    porcentajeRaw === null || porcentajeRaw === undefined
      ? 0
      : typeof porcentajeRaw === 'number'
        ? porcentajeRaw
        : Number(porcentajeRaw);

  return {
    id: row.id,
    nit: row.nit,
    rut: row.rut ?? null,
    rutPdfUrl: row.rut_pdf_url ?? null,
    porcentajeComision: Number.isFinite(porcentajeComision) ? porcentajeComision : 0,
    nombre: row.nombre,
    direccion: row.direccion,
    ciudad: row.ciudad,
    localidad: row.localidad ?? null,
    pais: row.pais,
    telefono: row.telefono,
    email: row.email,
    estado: row.estado ?? row.activo ?? true,
    createdAt: row.created_at ?? row.fecha_creacion ?? new Date().toISOString(),
  };
}

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(localidad|estado|activo|created_at|fecha_creacion|rut|rut_pdf_url|porcentaje_comision)/i.test(rawError);
}

function isMissingRelationError(error: { code?: string | null; message: string }) {
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message);
}

function isMissingRpcFunctionError(error: { code?: string | null; message: string }) {
  return error.code === 'PGRST202' || /Could not find the function/i.test(error.message);
}

export async function uploadBranchRutPdf(file: File, branchReference: string) {
  if (!file) {
    throw new Error('Debes seleccionar un archivo PDF.');
  }
  if (file.type !== 'application/pdf') {
    throw new Error('El archivo del RUT debe estar en formato PDF.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('El PDF del RUT supera el limite de 8MB.');
  }

  const supabase = getSupabaseClient();
  const normalizedReference =
    sanitizeText(branchReference, 40).replace(/\s+/g, '-').toLowerCase() || 'sucursal';
  const filePath = `rut-sucursales/${normalizedReference}-${Date.now()}.pdf`;

  const uploadResult = await supabase.storage.from('branch-rut-documents').upload(filePath, file, {
    upsert: true,
    contentType: 'application/pdf',
  });

  if (uploadResult.error) {
    throw new Error(`[BRANCHES] ${uploadResult.error.message}`);
  }

  const { data } = supabase.storage.from('branch-rut-documents').getPublicUrl(filePath);
  if (!data.publicUrl) {
    throw new Error('[BRANCHES] No fue posible obtener la URL publica del PDF RUT.');
  }

  return data.publicUrl;
}

async function findBranchById(supabase: ReturnType<typeof getSupabaseClient>, branchId: string) {
  let lastCompatibilityError: string | null = null;

  for (const selection of BRANCH_SELECT_ATTEMPTS) {
    const queryResult = await supabase
      .schema('operaciones')
      .from('locales')
      .select(selection)
      .eq('id', branchId)
      .maybeSingle();

    if (!queryResult.error) {
      if (!queryResult.data) {
        throw new Error('[BRANCHES] No se encontro la sucursal luego de guardar.');
      }
      return mapBranch(queryResult.data as unknown as BranchRow);
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[BRANCHES] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[BRANCHES] ${lastCompatibilityError ?? 'No fue posible leer la sucursal guardada.'}`);
}

export async function listBranches() {
  const supabase = getSupabaseClient();
  let lastCompatibilityError: string | null = null;

  for (const selection of BRANCH_SELECT_ATTEMPTS) {
    const queryResult = await supabase
      .schema('operaciones')
      .from('locales')
      .select(selection)
      .order('created_at', { ascending: false })
      .limit(MAX_BRANCHES);

    if (!queryResult.error) {
      const rows = (queryResult.data ?? []) as unknown as BranchRow[];
      return rows.map(mapBranch);
    }

    if (!isCompatibilityColumnError(queryResult.error.message)) {
      throw new Error(`[BRANCHES] ${queryResult.error.message}`);
    }
    lastCompatibilityError = queryResult.error.message;
  }

  throw new Error(`[BRANCHES] ${lastCompatibilityError ?? 'No fue posible leer sucursales.'}`);
}

export async function createBranch(input: CreateBranchInput) {
  const supabase = getSupabaseClient();
  const cleanEmail = input.email.trim().toLowerCase();

  if (cleanEmail && !isValidEmail(cleanEmail)) {
    throw new Error('El correo de la sucursal no es valido.');
  }

  const payload = {
    nit: sanitizeText(input.nit, 30),
    rut: sanitizeText(input.rut, 40) || null,
    rut_pdf_url: input.rutPdfUrl.trim() || null,
    porcentaje_comision: input.porcentajeComision,
    nombre: sanitizeText(input.nombre, 80),
    direccion: sanitizeText(input.direccion, 140) || null,
    ciudad: sanitizeText(input.ciudad, 80) || null,
    localidad: sanitizeText(input.localidad, 80) || null,
    pais: sanitizeText(input.pais, 80) || 'CO',
    telefono: sanitizeText(input.telefono, 25) || null,
    email: cleanEmail || null,
    estado: input.estado,
  };

  if (
    !payload.nit ||
    !payload.nombre ||
    !payload.ciudad ||
    !payload.localidad ||
    !payload.pais ||
    !Number.isFinite(payload.porcentaje_comision) ||
    payload.porcentaje_comision < 0 ||
    payload.porcentaje_comision > 100
  ) {
    throw new Error(
      'NIT, nombre, pais, ciudad, barrio/localidad y porcentaje de comision (0 a 100) son obligatorios.',
    );
  }

  const insertAttempts: Array<Record<string, string | number | boolean | null>> = [
    {
      nit: payload.nit,
      rut: payload.rut,
      rut_pdf_url: payload.rut_pdf_url,
      porcentaje_comision: payload.porcentaje_comision,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      localidad: payload.localidad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      rut: payload.rut,
      rut_pdf_url: payload.rut_pdf_url,
      porcentaje_comision: payload.porcentaje_comision,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      rut: payload.rut,
      rut_pdf_url: payload.rut_pdf_url,
      porcentaje_comision: payload.porcentaje_comision,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      localidad: payload.localidad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      activo: payload.estado,
    },
    {
      nit: payload.nit,
      rut: payload.rut,
      rut_pdf_url: payload.rut_pdf_url,
      porcentaje_comision: payload.porcentaje_comision,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      activo: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      localidad: payload.localidad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      localidad: payload.localidad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      activo: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      activo: payload.estado,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of insertAttempts) {
    const insertResult = await supabase
      .schema('operaciones')
      .from('locales')
      .insert(attempt)
      .select('id')
      .single();

    if (!insertResult.error) {
      return findBranchById(supabase, (insertResult.data as { id: string }).id);
    }

    if (!isCompatibilityColumnError(insertResult.error.message)) {
      throw new Error(`[BRANCHES] ${insertResult.error.message}`);
    }
    lastCompatibilityError = insertResult.error.message;
  }

  throw new Error(`[BRANCHES] ${lastCompatibilityError ?? 'No fue posible crear la sucursal.'}`);
}

export async function updateBranch(branchId: string, input: UpdateBranchInput) {
  const supabase = getSupabaseClient();
  const normalizedId = branchId.trim();
  const cleanEmail = input.email.trim().toLowerCase();

  if (!normalizedId) {
    throw new Error('No se recibio el identificador de la sucursal.');
  }

  if (cleanEmail && !isValidEmail(cleanEmail)) {
    throw new Error('El correo de la sucursal no es valido.');
  }

  const payload = {
    nit: sanitizeText(input.nit, 30),
    rut: sanitizeText(input.rut, 40) || null,
    rut_pdf_url: input.rutPdfUrl.trim() || null,
    porcentaje_comision: input.porcentajeComision,
    nombre: sanitizeText(input.nombre, 80),
    direccion: sanitizeText(input.direccion, 140) || null,
    ciudad: sanitizeText(input.ciudad, 80) || null,
    localidad: sanitizeText(input.localidad, 80) || null,
    pais: sanitizeText(input.pais, 80) || 'CO',
    telefono: sanitizeText(input.telefono, 25) || null,
    email: cleanEmail || null,
    estado: input.estado,
  };

  if (
    !payload.nit ||
    !payload.nombre ||
    !payload.ciudad ||
    !payload.localidad ||
    !payload.pais ||
    !Number.isFinite(payload.porcentaje_comision) ||
    payload.porcentaje_comision < 0 ||
    payload.porcentaje_comision > 100
  ) {
    throw new Error(
      'NIT, nombre, pais, ciudad, barrio/localidad y porcentaje de comision (0 a 100) son obligatorios.',
    );
  }

  const updateAttempts: Array<Record<string, string | number | boolean | null>> = [
    {
      nit: payload.nit,
      rut: payload.rut,
      rut_pdf_url: payload.rut_pdf_url,
      porcentaje_comision: payload.porcentaje_comision,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      localidad: payload.localidad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      rut: payload.rut,
      rut_pdf_url: payload.rut_pdf_url,
      porcentaje_comision: payload.porcentaje_comision,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      rut: payload.rut,
      rut_pdf_url: payload.rut_pdf_url,
      porcentaje_comision: payload.porcentaje_comision,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      localidad: payload.localidad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      activo: payload.estado,
    },
    {
      nit: payload.nit,
      rut: payload.rut,
      rut_pdf_url: payload.rut_pdf_url,
      porcentaje_comision: payload.porcentaje_comision,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      activo: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      localidad: payload.localidad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      estado: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      localidad: payload.localidad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      activo: payload.estado,
    },
    {
      nit: payload.nit,
      nombre: payload.nombre,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      pais: payload.pais,
      telefono: payload.telefono,
      email: payload.email,
      activo: payload.estado,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of updateAttempts) {
    const updateResult = await supabase
      .schema('operaciones')
      .from('locales')
      .update(attempt)
      .eq('id', normalizedId)
      .select('id')
      .single();

    if (!updateResult.error) {
      return findBranchById(supabase, normalizedId);
    }

    if (!isCompatibilityColumnError(updateResult.error.message)) {
      throw new Error(`[BRANCHES] ${updateResult.error.message}`);
    }
    lastCompatibilityError = updateResult.error.message;
  }

  throw new Error(`[BRANCHES] ${lastCompatibilityError ?? 'No fue posible actualizar la sucursal.'}`);
}

export async function deleteBranch(branchId: string) {
  const supabase = getSupabaseClient();
  const normalizedId = branchId.trim();

  if (!normalizedId) {
    throw new Error('No se recibio el identificador de la sucursal.');
  }

  const { error: rpcError } = await (supabase as any).rpc('delete_branch_cascade', {
    p_branch_id: normalizedId,
  });

  if (!rpcError) return;

  if (!isMissingRpcFunctionError(rpcError)) {
    throw new Error(`[BRANCHES] ${rpcError.message}`);
  }

  // Limpia dependencias directas operativas de la sucursal.
  const { error: deleteMovementsError } = await supabase
    .schema('operaciones')
    .from('movimientos_inventario')
    .delete()
    .eq('local_id', normalizedId);

  if (deleteMovementsError) {
    throw new Error(`[BRANCHES] ${deleteMovementsError.message}`);
  }

  const { error: deleteInventoryError } = await supabase
    .schema('operaciones')
    .from('inventario')
    .delete()
    .eq('local_id', normalizedId);

  if (deleteInventoryError) {
    throw new Error(`[BRANCHES] ${deleteInventoryError.message}`);
  }

  // Limpia ventas relacionadas de la sucursal con modelo integrado (si el modulo existe).
  const { error: deleteSalesError } = await supabase
    .schema('ventas')
    .from('ventas')
    .delete()
    .eq('local_id', normalizedId);

  if (deleteSalesError && !isMissingRelationError(deleteSalesError)) {
    throw new Error(`[BRANCHES] ${deleteSalesError.message}`);
  }

  const { error } = await supabase
    .schema('operaciones')
    .from('locales')
    .delete()
    .eq('id', normalizedId);

  if (!error) return;

  if (error.code === '23503') {
    throw new Error(
      'No puedes eliminar esta sucursal porque aun tiene registros relacionados en otras tablas. Ejecuta database/007_secure_delete_helpers.sql.',
    );
  }

  throw new Error(`[BRANCHES] ${error.message}`);
}
