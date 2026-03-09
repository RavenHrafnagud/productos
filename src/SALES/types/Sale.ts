/**
 * Modelo de venta mostrado en UI.
 */
export interface SaleRecord {
  id: string;
  localId: string;
  localNombre: string;
  usuarioId: string;
  usuarioNombre: string;
  productoId: string | null;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  impuestos: number;
  descuento: number;
  total: number;
  fecha: string;
  estado: string;
  moneda: string;
  numeroComprobante: string | null;
  observaciones: string | null;
}

/**
 * Payload para registrar una venta simple.
 */
export interface CreateSaleInput {
  localId: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  impuestos: number;
  descuento: number;
  estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
  moneda: string;
  numeroComprobante: string;
  observaciones: string;
  fecha: string;
}

/**
 * Payload para actualizar una venta existente.
 */
export interface UpdateSaleInput extends CreateSaleInput {}
