/**
 * Repositorio de sucursales.
 * Encapsula lecturas/escrituras sobre operaciones.locales.
 */
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { isValidEmail, sanitizeText } from '../../SHARED/utils/validators';
import type { Branch, CreateBranchInput, UpdateBranchInput } from '../types/Branch';

const MAX_BRANCHES = 120;
const BRANCH_SELECT_WITH_LOCALITY_AND_STATE =
  'id, nit, nombre, direccion, localidad, ciudad, pais, telefono, email, estado, created_at';
const BRANCH_SELECT_WITHOUT_LOCALITY_AND_STATE =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, estado, created_at';
const BRANCH_SELECT_WITH_LOCALITY_AND_ACTIVE =
  'id, nit, nombre, direccion, localidad, ciudad, pais, telefono, email, activo, created_at';
const BRANCH_SELECT_WITHOUT_LOCALITY_AND_ACTIVE =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, activo, created_at';

type BranchRow = {
  id: string;
  nit: string;
  nombre: string;
  direccion: string | null;
  localidad?: string | null;
  ciudad: string | null;
  pais: string;
  telefono: string | null;
  email: string | null;
  estado?: boolean | null;
  activo?: boolean | null;
  created_at: string;
};

function mapBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    nit: row.nit,
    nombre: row.nombre,
    direccion: row.direccion,
    ciudad: row.ciudad,
    localidad: row.localidad ?? null,
    pais: row.pais,
    telefono: row.telefono,
    email: row.email,
    estado: row.estado ?? row.activo ?? true,
    createdAt: row.created_at,
  };
}

function isCompatibilityColumnError(rawError: string) {
  return /does not exist/i.test(rawError) && /(localidad|estado|activo)/i.test(rawError);
}

function isMissingRelationError(error: { code?: string | null; message: string }) {
  return error.code === '42P01' || /relation .* does not exist/i.test(error.message);
}

function isMissingRpcFunctionError(error: { code?: string | null; message: string }) {
  return error.code === 'PGRST202' || /Could not find the function/i.test(error.message);
}

export async function listBranches() {
  const supabase = getSupabaseClient();
  const selectAttempts = [
    BRANCH_SELECT_WITH_LOCALITY_AND_STATE,
    BRANCH_SELECT_WITHOUT_LOCALITY_AND_STATE,
    BRANCH_SELECT_WITH_LOCALITY_AND_ACTIVE,
    BRANCH_SELECT_WITHOUT_LOCALITY_AND_ACTIVE,
  ];
  let lastCompatibilityError: string | null = null;

  for (const selection of selectAttempts) {
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
    nombre: sanitizeText(input.nombre, 80),
    direccion: sanitizeText(input.direccion, 140) || null,
    ciudad: sanitizeText(input.ciudad, 80) || null,
    localidad: sanitizeText(input.localidad, 80) || null,
    pais: sanitizeText(input.pais, 80) || 'CO',
    telefono: sanitizeText(input.telefono, 25) || null,
    email: cleanEmail || null,
    estado: input.estado,
  };

  if (!payload.nit || !payload.nombre || !payload.ciudad || !payload.localidad || !payload.pais) {
    throw new Error('NIT, nombre, pais, ciudad y barrio/localidad son obligatorios.');
  }

  const insertAttempts: Array<{
    payload: Record<string, string | boolean | null>;
    selection: string;
  }> = [
    {
      payload: {
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
      selection: BRANCH_SELECT_WITH_LOCALITY_AND_STATE,
    },
    {
      payload: {
        nit: payload.nit,
        nombre: payload.nombre,
        direccion: payload.direccion,
        ciudad: payload.ciudad,
        pais: payload.pais,
        telefono: payload.telefono,
        email: payload.email,
        estado: payload.estado,
      },
      selection: BRANCH_SELECT_WITHOUT_LOCALITY_AND_STATE,
    },
    {
      payload: {
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
      selection: BRANCH_SELECT_WITH_LOCALITY_AND_ACTIVE,
    },
    {
      payload: {
        nit: payload.nit,
        nombre: payload.nombre,
        direccion: payload.direccion,
        ciudad: payload.ciudad,
        pais: payload.pais,
        telefono: payload.telefono,
        email: payload.email,
        activo: payload.estado,
      },
      selection: BRANCH_SELECT_WITHOUT_LOCALITY_AND_ACTIVE,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of insertAttempts) {
    const insertResult = await supabase
      .schema('operaciones')
      .from('locales')
      .insert(attempt.payload)
      .select(attempt.selection)
      .single();

    if (!insertResult.error) {
      return mapBranch(insertResult.data as unknown as BranchRow);
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
    nombre: sanitizeText(input.nombre, 80),
    direccion: sanitizeText(input.direccion, 140) || null,
    ciudad: sanitizeText(input.ciudad, 80) || null,
    localidad: sanitizeText(input.localidad, 80) || null,
    pais: sanitizeText(input.pais, 80) || 'CO',
    telefono: sanitizeText(input.telefono, 25) || null,
    email: cleanEmail || null,
    estado: input.estado,
  };

  if (!payload.nit || !payload.nombre || !payload.ciudad || !payload.localidad || !payload.pais) {
    throw new Error('NIT, nombre, pais, ciudad y barrio/localidad son obligatorios.');
  }

  const updateAttempts: Array<{
    payload: Record<string, string | boolean | null>;
    selection: string;
  }> = [
    {
      payload: {
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
      selection: BRANCH_SELECT_WITH_LOCALITY_AND_STATE,
    },
    {
      payload: {
        nit: payload.nit,
        nombre: payload.nombre,
        direccion: payload.direccion,
        ciudad: payload.ciudad,
        pais: payload.pais,
        telefono: payload.telefono,
        email: payload.email,
        estado: payload.estado,
      },
      selection: BRANCH_SELECT_WITHOUT_LOCALITY_AND_STATE,
    },
    {
      payload: {
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
      selection: BRANCH_SELECT_WITH_LOCALITY_AND_ACTIVE,
    },
    {
      payload: {
        nit: payload.nit,
        nombre: payload.nombre,
        direccion: payload.direccion,
        ciudad: payload.ciudad,
        pais: payload.pais,
        telefono: payload.telefono,
        email: payload.email,
        activo: payload.estado,
      },
      selection: BRANCH_SELECT_WITHOUT_LOCALITY_AND_ACTIVE,
    },
  ];
  let lastCompatibilityError: string | null = null;

  for (const attempt of updateAttempts) {
    const updateResult = await supabase
      .schema('operaciones')
      .from('locales')
      .update(attempt.payload)
      .eq('id', normalizedId)
      .select(attempt.selection)
      .single();

    if (!updateResult.error) {
      return mapBranch(updateResult.data as unknown as BranchRow);
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

  // Limpia ventas y detalles de venta de la sucursal (si el modulo existe).
  const { data: salesRows, error: listSalesError } = await supabase
    .schema('ventas')
    .from('ventas')
    .select('id')
    .eq('local_id', normalizedId);

  if (listSalesError && !isMissingRelationError(listSalesError)) {
    throw new Error(`[BRANCHES] ${listSalesError.message}`);
  }

  const saleIds = (salesRows ?? []).map((sale) => sale.id);
  if (saleIds.length > 0) {
    const { error: deleteDetailsError } = await supabase
      .schema('ventas')
      .from('detalle_venta')
      .delete()
      .in('venta_id', saleIds);

    if (deleteDetailsError && !isMissingRelationError(deleteDetailsError)) {
      throw new Error(`[BRANCHES] ${deleteDetailsError.message}`);
    }
  }

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
