/**
 * Modelo de envio para seguimiento logistico y financiero.
 */
export type ShipmentStatus = 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO';
export type ShipmentType = 'SUCURSAL' | 'INDIVIDUAL';
export type ShipmentSalesChannel = 'TIENDA' | 'DIRECTO';

export interface ShipmentRecord {
  id: string;
  referenciaVentaGrupo: string | null;
  tipoEnvio: ShipmentType;
  almacenId: string | null;
  almacenNombre: string;
  localId: string | null;
  localNombre: string;
  usuarioId: string;
  clienteDocumento: string | null;
  clienteNombre: string | null;
  productoId: string;
  productoNombre: string;
  destinatario: string;
  canalVenta: ShipmentSalesChannel;
  cantidad: number;
  precioUnitario: number;
  costoEnvio: number;
  estadoEnvio: ShipmentStatus;
  fechaEnvio: string;
  observaciones: string | null;
  ingresoBruto: number;
  comisionValor: number;
  gananciaNeta: number;
}

export interface CreateShipmentLineInput {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CreateShipmentInput {
  tipoEnvio: ShipmentType;
  almacenId: string | null;
  localId: string | null;
  destinatario: string | null;
  clienteDocumento: string | null;
  clienteNombre: string | null;
  referenciaVentaGrupo: string | null;
  lineItems: CreateShipmentLineInput[];
  costoEnvioTotal: number;
  estadoEnvio: ShipmentStatus;
  fechaEnvio: string;
  observaciones: string;
}

export interface UpdateShipmentStatusInput {
  shipmentId: string;
  estadoEnvio: ShipmentStatus;
}

export interface PendingIndividualShipmentTarget {
  referenciaGrupo: string;
  clienteDocumento: string;
  clienteNombre: string;
  clientePais: string | null;
  clienteCiudad: string | null;
  fechaVenta: string;
  totalItems: number;
  totalUnidades: number;
  totalNeto: number;
}
