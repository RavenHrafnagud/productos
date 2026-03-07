/**
 * Modelo de sucursal usado por la interfaz.
 */
export interface Branch {
  id: string;
  nit: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  localidad: string | null;
  pais: string;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  createdAt: string;
}

/**
 * Payload de creacion de sucursal.
 */
export interface CreateBranchInput {
  nit: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  localidad: string;
  pais: string;
  telefono: string;
  email: string;
}
