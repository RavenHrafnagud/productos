/**
 * Modelo de producto consumido por la UI.
 */
export interface Product {
  id: string;
  codigoBarra: string | null;
  nombre: string;
  descripcion: string | null;
  precioVenta: number;
  estado: boolean;
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
  precioVenta: number;
  estado: boolean;
}

/**
 * Payload de actualizacion de producto.
 */
export interface UpdateProductInput extends CreateProductInput {}
