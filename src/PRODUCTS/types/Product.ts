/**
 * Modelo de producto consumido por la UI.
 */
export interface Product {
  id: string;
  codigoBarra: string | null;
  nombre: string;
  descripcion: string | null;
  precioCompra: number;
  precioVenta: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload de creacion de producto.
 */
export interface CreateProductInput {
  codigoBarra: string;
  nombre: string;
  descripcion: string;
  precioCompra: number;
  precioVenta: number;
}
