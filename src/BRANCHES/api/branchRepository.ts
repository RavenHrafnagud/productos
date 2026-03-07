/**
 * Repositorio de sucursales.
 * Encapsula lecturas/escrituras sobre operaciones.locales.
 */
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { isValidEmail, sanitizeText } from '../../SHARED/utils/validators';
import type { Branch, CreateBranchInput } from '../types/Branch';

const MAX_BRANCHES = 120;
const BRANCH_SELECT_WITH_LOCALITY =
  'id, nit, nombre, direccion, localidad, ciudad, pais, telefono, email, activo, created_at';
const BRANCH_SELECT_WITHOUT_LOCALITY =
  'id, nit, nombre, direccion, ciudad, pais, telefono, email, activo, created_at';

function mapBranch(row: {
  id: string;
  nit: string;
  nombre: string;
  direccion: string | null;
  localidad?: string | null;
  ciudad: string | null;
  pais: string;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  created_at: string;
}): Branch {
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
    activo: row.activo,
    createdAt: row.created_at,
  };
}

function isMissingLocalityColumn(rawError: string) {
  return /localidad/i.test(rawError) && /does not exist/i.test(rawError);
}

export async function listBranches() {
  const supabase = getSupabaseClient();
  const firstTry = await supabase
    .schema('operaciones')
    .from('locales')
    .select(BRANCH_SELECT_WITH_LOCALITY)
    .order('created_at', { ascending: false })
    .limit(MAX_BRANCHES);

  if (!firstTry.error) {
    return (firstTry.data ?? []).map(mapBranch);
  }

  // Compatibilidad con esquemas antiguos que aun no tienen columna "localidad".
  if (isMissingLocalityColumn(firstTry.error.message)) {
    const fallbackTry = await supabase
      .schema('operaciones')
      .from('locales')
      .select(BRANCH_SELECT_WITHOUT_LOCALITY)
      .order('created_at', { ascending: false })
      .limit(MAX_BRANCHES);

    if (fallbackTry.error) throw new Error(`[BRANCHES] ${fallbackTry.error.message}`);
    return (fallbackTry.data ?? []).map(mapBranch);
  }

  throw new Error(`[BRANCHES] ${firstTry.error.message}`);
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
    activo: true,
  };

  if (!payload.nit || !payload.nombre || !payload.ciudad || !payload.localidad || !payload.pais) {
    throw new Error('NIT, nombre, pais, ciudad y barrio/localidad son obligatorios.');
  }

  const { data, error } = await supabase
    .schema('operaciones')
    .from('locales')
    .insert(payload)
    .select(BRANCH_SELECT_WITH_LOCALITY)
    .single();

  if (!error) return mapBranch(data);

  if (isMissingLocalityColumn(error.message)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .schema('operaciones')
      .from('locales')
      .insert({
        nit: payload.nit,
        nombre: payload.nombre,
        direccion: payload.direccion,
        ciudad: payload.ciudad,
        pais: payload.pais,
        telefono: payload.telefono,
        email: payload.email,
        activo: payload.activo,
      })
      .select(BRANCH_SELECT_WITHOUT_LOCALITY)
      .single();

    if (fallbackError) throw new Error(`[BRANCHES] ${fallbackError.message}`);
    return mapBranch(fallbackData);
  }

  throw new Error(`[BRANCHES] ${error.message}`);
}
