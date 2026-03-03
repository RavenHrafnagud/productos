/**
 * Modelo de fila de inventario usado por UI.
 */
export interface InventoryItem {
  id: string;
  productoId: string;
  productoNombre: string;
  codigoBarra: string | null;
  localId: string;
  cantidadActual: number;
  cantidadMinima: number;
  updatedAt: string;
}
