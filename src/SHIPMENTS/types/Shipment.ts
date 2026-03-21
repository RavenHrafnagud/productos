/**
 * Modelo de envio para seguimiento logistico y financiero.
 */
export type ShipmentStatus = 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO';
export type ShipmentDestinationType = 'TIENDA' | 'CLIENTE' | 'DISTRIBUIDOR' | 'LOCAL';
export type ShipmentSalesChannel = 'TIENDA' | 'DIRECTO';

export interface ShipmentRecord {
  id: string;
  almacenId: string | null;
  almacenNombre: string;
  localId: string | null;
  localNombre: string;
  usuarioId: string;
  productoId: string;
  productoNombre: string;
  destinatario: string;
  tipoDestino: ShipmentDestinationType;
  canalVenta: ShipmentSalesChannel;
  cantidad: number;
  precioUnitario: number;
  costoEnvio: number;
  comisionPorcentaje: number;
  estadoEnvio: ShipmentStatus;
  fechaEnvio: string;
  observaciones: string | null;
  ingresoBruto: number;
  comisionValor: number;
  gananciaNeta: number;
}

export interface CreateShipmentInput {
  almacenId: string | null;
  localId: string | null;
  productoId: string;
  destinatario: string;
  tipoDestino: ShipmentDestinationType;
  canalVenta: ShipmentSalesChannel;
  cantidad: number;
  precioUnitario: number;
  costoEnvio: number;
  comisionPorcentaje: number;
  estadoEnvio: ShipmentStatus;
  fechaEnvio: string;
  observaciones: string;
}

export interface UpdateShipmentStatusInput {
  shipmentId: string;
  estadoEnvio: ShipmentStatus;
}
