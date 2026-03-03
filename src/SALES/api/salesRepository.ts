/**
 * Repositorio de ventas.
 * Expone un resumen compacto para pintar el panel.
 */
import { getSupabaseClient } from '../../SHARED/lib/supabase/client';
import type { RecentSale, SalesSummary } from '../types/SalesSummary';

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

export async function getSalesSummary(localId: string): Promise<SalesSummary> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .schema('ventas')
    .from('ventas')
    .select('id, fecha, total, moneda')
    .eq('local_id', localId)
    .eq('estado', 'CONFIRMADA')
    .order('fecha', { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(`[SALES] ${error.message}`);
  }

  const ventasRecientes: RecentSale[] = (data ?? []).map((row) => ({
    id: row.id,
    fecha: row.fecha,
    total: toNumber(row.total),
    moneda: row.moneda,
  }));

  const montoAcumulado = ventasRecientes.reduce((sum, row) => sum + row.total, 0);
  const totalVentas = ventasRecientes.length;
  const ticketPromedio = totalVentas > 0 ? montoAcumulado / totalVentas : 0;

  return { totalVentas, montoAcumulado, ticketPromedio, ventasRecientes };
}
