/**
 * Modelos para gestion de usuarios y roles.
 */
export interface RoleRecord {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface UserRecord {
  id: string;
  personaId: string | null;
  nombres: string;
  apellidos: string;
  email: string | null;
  numeroDocumento: string;
  tipoDocumento: string | null;
  telefono: string | null;
  ciudad: string | null;
  pais: string | null;
  rolId: string | null;
  rolNombre: string | null;
  estado: boolean;
  fechaAsignacion: string | null;
  profileComplete: boolean;
}

export interface MyProfile {
  id: string;
  email: string | null;
  nombres: string;
  apellidos: string;
  rolNombre: string | null;
  estado: boolean;
}

export interface CreateRoleInput {
  nombre: string;
  descripcion: string;
}

export interface CreateUserInput {
  authUserId?: string;
  password: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  email: string;
  rolId: string;
}
