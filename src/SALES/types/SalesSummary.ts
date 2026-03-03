/**
 * Modelos de resumen y detalle de ventas para el dashboard.
 */
export interface RecentSale {
  id: string;
  fecha: string;
  total: number;
  moneda: string;
}

export interface SalesSummary {
  totalVentas: number;
  montoAcumulado: number;
  ticketPromedio: number;
  ventasRecientes: RecentSale[];
}
