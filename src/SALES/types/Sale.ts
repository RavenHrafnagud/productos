export type SaleState = 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
export type SaleType = 'SUCURSAL' | 'INDIVIDUAL';
export type SaleShippingResponsible = 'CLIENTE' | 'NOSOTROS';

export interface SaleRecord {
  id: string;
  referenciaGrupo: string | null;
  tipoVenta: SaleType;
  localId: string | null;
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
  comisionPorcentaje: number;
  comisionValor: number;
  clienteDocumento: string | null;
  clienteNombre: string | null;
  clientePais: string | null;
  clienteCiudad: string | null;
  envioResponsable: SaleShippingResponsible | null;
  requiereEnvio: boolean;
  envioRegistrado: boolean;
  fecha: string;
  estado: SaleState;
  moneda: string;
  numeroComprobante: string | null;
  observaciones: string | null;
}

export interface CreateSaleLineInput {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CreateSaleInput {
  tipoVenta: SaleType;
  localId: string | null;
  lineItems: CreateSaleLineInput[];
  comisionPorcentaje: number;
  estado: SaleState;
  moneda: string;
  numeroComprobante: string;
  observaciones: string;
  fecha: string;
  clienteDocumento?: string;
  clienteNombre?: string;
  clientePais?: string;
  clienteCiudad?: string;
  envioResponsable?: SaleShippingResponsible | null;
}

export interface UpdateSaleInput {
  localId: string | null;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  impuestos: number;
  descuento: number;
  estado: SaleState;
  moneda: string;
  numeroComprobante: string;
  observaciones: string;
  fecha: string;
}
