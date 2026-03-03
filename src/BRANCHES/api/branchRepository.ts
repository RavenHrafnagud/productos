/**
 * Repositorio de sucursales.
 * Encapsula lecturas/escrituras sobre operaciones.locales.
 */
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import { isValidEmail, sanitizeText } from '../../SHARED/utils/validators';
import type { Branch, CreateBranchInput } from '../types/Branch';

const MAX_BRANCHES = 120;

function mapBranch(row: {
  id: string;
  nit: string;
  nombre: string;
  direccion: string | null;
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
    pais: row.pais,
    telefono: row.telefono,
    email: row.email,
    activo: row.activo,
    createdAt: row.created_at,
  };
}

export async function listBranches() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema('operaciones')
    .from('locales')
    .select('id, nit, nombre, direccion, ciudad, pais, telefono, email, activo, created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_BRANCHES);

  if (error) throw new Error(`[BRANCHES] ${error.message}`);
  return (data ?? []).map(mapBranch);
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
    pais: sanitizeText(input.pais, 80) || 'CO',
    telefono: sanitizeText(input.telefono, 25) || null,
    email: cleanEmail || null,
    activo: true,
  };

  if (!payload.nit || !payload.nombre) {
    throw new Error('NIT y nombre son obligatorios.');
  }

  const { data, error } = await supabase
    .schema('operaciones')
    .from('locales')
    .insert(payload)
    .select('id, nit, nombre, direccion, ciudad, pais, telefono, email, activo, created_at')
    .single();

  if (error) throw new Error(`[BRANCHES] ${error.message}`);
  return mapBranch(data);
}
