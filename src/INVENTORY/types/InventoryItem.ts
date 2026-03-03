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
 * Payload para ajustar o crear inventario inicial.
 */
export interface SaveInventoryInput {
  productoId: string;
  sucursalId: string;
  cantidadActual: number;
  cantidadMinima: number;
}
