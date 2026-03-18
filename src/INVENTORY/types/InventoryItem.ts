/**
 * Modelo de fila de inventario usado por UI.
 */
export interface InventoryItem {
  id: string;
  productoId: string;
  productoNombre: string;
  codigoBarra: string | null;
  sucursalId: string;
  cantidadActual: number;
  cantidadMinima: number;
  updatedAt: string;
}

/**
 * Modelo de movimiento de inventario usado por UI.
 */
export interface InventoryMovement {
  id: string;
  productoId: string;
  productoNombre: string;
  sucursalId: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  fecha: string;
  motivo: string | null;
  origenTipo: string | null;
  origenId: string | null;
}

/**
 * Payload para ajustar o crear inventario inicial.
 */
export interface SaveInventoryInput {
  productoId: string;
  sucursalId: string;
  cantidadActual: number;
  cantidadMinima: number;
}
