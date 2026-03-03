/**
 * Modelo de producto consumido por la UI.
 */
export interface Product {
  id: string;
  codigoBarra: string | null;
  nombre: string;
  precioCompra: number;
  precioVenta: number;
  activo: boolean;
  updatedAt: string;
}
