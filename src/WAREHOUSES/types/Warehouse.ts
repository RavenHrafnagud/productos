/**
 * Modelos del modulo de almacenes.
 */
export interface Warehouse {
  id: string;
  nit: string | null;
  nombre: string;
  direccion: string | null;
  barrio: string | null;
  municipio: string | null;
  ciudad: string | null;
  pais: string;
  telefono: string | null;
  email: string | null;
  esPropio: boolean;
  costoArriendo: number;
  moneda: string;
  estado: boolean;
  createdAt: string;
}

export interface CreateWarehouseInput {
  nit: string;
  nombre: string;
  direccion: string;
  barrio: string;
  municipio: string;
  ciudad: string;
  pais: string;
  telefono: string;
  email: string;
  esPropio: boolean;
  costoArriendo: number;
  moneda: string;
  estado: boolean;
}

export interface UpdateWarehouseInput extends CreateWarehouseInput {}

export interface WarehouseInventoryItem {
  id: string;
  almacenId: string;
  productoId: string;
  productoNombre: string;
  codigoBarra: string | null;
  cantidadActual: number;
  cantidadMinima: number;
  updatedAt: string;
}

export interface WarehouseMovement {
  id: string;
  almacenId: string;
  productoId: string;
  productoNombre: string;
  tipoMovimiento: string;
  cantidad: number;
  fecha: string;
  motivo: string | null;
  origenTipo: string | null;
  origenId: string | null;
}

export interface SaveWarehouseInventoryInput {
  almacenId: string;
  productoId: string;
  cantidadActual: number;
  cantidadMinima: number;
}
