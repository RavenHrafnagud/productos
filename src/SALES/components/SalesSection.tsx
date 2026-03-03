/**
 * Seccion de ventas.
 * Muestra KPIs y ultimas transacciones confirmadas.
 */
import styled from 'styled-components';
import { useSalesSummary } from '../hooks/useSalesSummary';
import { formatDateTime, formatMoney } from '../../SHARED/utils/format';
import { DataTable, TableWrap } from '../../SHARED/ui/DataTable';
import { SectionCard, SectionHeader, SectionMeta, SectionTitle } from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';

interface SalesSectionProps {
  localId: string;
  refreshKey: number;
}

const MetricsGrid = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 14px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Metric = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: var(--bg-panel-soft);
  padding: 11px;
`;

const MetricLabel = styled.small`
  display: block;
  color: var(--text-muted);
  margin-bottom: 6px;
`;

const MetricValue = styled.strong`
  font-size: 1.1rem;
`;

export function SalesSection({ localId, refreshKey }: SalesSectionProps) {
  const { summary, status, error } = useSalesSummary(localId, refreshKey);

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>SALES / Resumen</SectionTitle>
        <SectionMeta>{localId ? `Local: ${localId}` : 'Sin local seleccionado'}</SectionMeta>
      </SectionHeader>

      {!localId && <StatusState kind="info" message="Define local_id para ver ventas." />}
      {localId && status === 'loading' && <StatusState kind="loading" message="Cargando ventas..." />}
      {localId && status === 'error' && <StatusState kind="error" message={error ?? 'Error inesperado.'} />}
      {localId && status === 'success' && summary && (
        <>
          <MetricsGrid>
            <Metric>
              <MetricLabel>Total ventas</MetricLabel>
              <MetricValue>{summary.totalVentas}</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Monto acumulado</MetricLabel>
              <MetricValue>{formatMoney(summary.montoAcumulado)}</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Ticket promedio</MetricLabel>
              <MetricValue>{formatMoney(summary.ticketPromedio)}</MetricValue>
            </Metric>
          </MetricsGrid>

          {summary.ventasRecientes.length === 0 ? (
            <StatusState kind="empty" message="No hay ventas confirmadas para este local." />
          ) : (
            <TableWrap>
              <DataTable>
                <thead>
                  <tr>
                    <th>ID Venta</th>
                    <th>Fecha</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.ventasRecientes.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.id}</td>
                      <td>{formatDateTime(sale.fecha)}</td>
                      <td>{formatMoney(sale.total, sale.moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </TableWrap>
          )}
        </>
      )}
    </SectionCard>
  );
}
