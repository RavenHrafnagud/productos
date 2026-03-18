/**
 * Dashboard principal.
 * Resume ventas por fechas, productos y sucursales.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { DataTable, TableWrap } from '../../SHARED/ui/DataTable';
import { Field, Fields, InputControl } from '../../SHARED/ui/FormControls';
import {
  SectionCard,
  SectionHeader,
  SectionHeaderActions,
  SectionMeta,
  SectionTitle,
  SectionToggle,
} from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';
import { formatMoney } from '../../SHARED/utils/format';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { useSales } from '../../SALES/hooks/useSales';

interface DashboardSectionProps {
  refreshKey: number;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: 14px;
  background: linear-gradient(135deg, #ffffff 0%, #f6f0ff 100%);
  box-shadow: 0 12px 22px rgba(37, 24, 62, 0.1);

  p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.82rem;
  }

  strong {
    margin-top: 4px;
    display: block;
    font-size: 1.12rem;
  }
`;

const ChartsGrid = styled.section`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%);
  padding: 14px;
  box-shadow: 0 12px 22px rgba(37, 24, 62, 0.1);
`;

const ChartTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 0.95rem;
`;

const Bars = styled.div`
  display: grid;
  gap: 8px;
`;

const BarItem = styled.div`
  display: grid;
  gap: 4px;
`;

const BarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
`;

const BarTrack = styled.div`
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #ece4fa;
  overflow: hidden;
`;

const BarFill = styled.div<{ $ratio: number; $tone?: 'main' | 'warn' | 'muted' }>`
  width: ${({ $ratio }) => `${Math.max(4, Math.min(100, $ratio * 100))}%`};
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
  background: ${({ $tone }) => {
    if ($tone === 'warn') return 'linear-gradient(90deg, #ffbe7d 0%, #f08a2f 100%)';
    if ($tone === 'muted') return 'linear-gradient(90deg, #d8c8f1 0%, #a68ccf 100%)';
    return 'linear-gradient(90deg, #a06ced 0%, #6a3fba 100%)';
  }};
`;

export function DashboardSection({ refreshKey }: DashboardSectionProps) {
  const { sales, status, error } = useSales(refreshKey);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'dashboard');
  const [fromDate, setFromDate] = useState(() => toDateInputValue(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)));
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [collapsed, setCollapsed] = useState(false);

  const filteredSales = useMemo(() => {
    const fromTs = new Date(`${fromDate}T00:00:00`).getTime();
    const toTs = new Date(`${toDate}T23:59:59`).getTime();
    return sales.filter((sale) => {
      const saleTs = new Date(sale.fecha).getTime();
      return saleTs >= fromTs && saleTs <= toTs;
    });
  }, [fromDate, sales, toDate]);

  const totals = useMemo(() => {
    const totalIngresos = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalUnidades = filteredSales.reduce((sum, sale) => sum + sale.cantidad, 0);
    const ticketPromedio = filteredSales.length > 0 ? totalIngresos / filteredSales.length : 0;
    return { totalIngresos, totalUnidades, ticketPromedio };
  }, [filteredSales]);

  const byProduct = useMemo(() => {
    const map = new Map<string, { nombre: string; cantidad: number; total: number }>();
    for (const sale of filteredSales) {
      const current = map.get(sale.productoId ?? sale.productoNombre) ?? {
        nombre: sale.productoNombre,
        cantidad: 0,
        total: 0,
      };
      current.cantidad += sale.cantidad;
      current.total += sale.total;
      map.set(sale.productoId ?? sale.productoNombre, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  const byBranch = useMemo(() => {
    const map = new Map<string, { nombre: string; ventas: number; total: number }>();
    for (const sale of filteredSales) {
      const current = map.get(sale.localId) ?? { nombre: sale.localNombre, ventas: 0, total: 0 };
      current.ventas += 1;
      current.total += sale.total;
      map.set(sale.localId, current);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  const byDate = useMemo(() => {
    const map = new Map<string, { fecha: string; ventas: number; total: number }>();
    for (const sale of filteredSales) {
      const dateKey = sale.fecha.slice(0, 10);
      const current = map.get(dateKey) ?? { fecha: dateKey, ventas: 0, total: 0 };
      current.ventas += 1;
      current.total += sale.total;
      map.set(dateKey, current);
    }
    return [...map.values()].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [filteredSales]);

  const maxByDate = useMemo(() => Math.max(...byDate.map((row) => row.total), 1), [byDate]);
  const maxByProduct = useMemo(() => Math.max(...byProduct.map((row) => row.total), 1), [byProduct]);
  const maxByBranch = useMemo(() => Math.max(...byBranch.map((row) => row.total), 1), [byBranch]);

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Dashboard de ventas</SectionTitle>
        <SectionHeaderActions>
          <SectionMeta>{filteredSales.length} ventas en el rango</SectionMeta>
          <SectionToggle type="button" onClick={() => setCollapsed((prev) => !prev)} aria-expanded={!collapsed}>
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </SectionToggle>
        </SectionHeaderActions>
      </SectionHeader>

      {!collapsed && (
        <>
          <Fields>
            <Field>
              Desde
              <InputControl type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </Field>
            <Field>
              Hasta
              <InputControl type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </Field>
          </Fields>

          {status === 'loading' && <StatusState kind="loading" message="Calculando estadisticas..." />}
          {status === 'error' && (
            <StatusState
              kind={isSetupError(error) ? 'info' : 'error'}
              message={friendlyLoadError ?? 'Error inesperado.'}
            />
          )}
          {status === 'success' && sales.length === 0 && (
            <StatusState kind="empty" message="No hay ventas en este rango. Ajusta las fechas o registra nuevas ventas." />
          )}

          {status === 'success' && sales.length > 0 && (
            <>
              <MetricsGrid>
                <MetricCard>
                  <p>Ingresos totales</p>
                  <strong>{formatMoney(totals.totalIngresos)}</strong>
                </MetricCard>
                <MetricCard>
                  <p>Unidades vendidas</p>
                  <strong>{totals.totalUnidades}</strong>
                </MetricCard>
                <MetricCard>
                  <p>Ticket promedio</p>
                  <strong>{formatMoney(totals.ticketPromedio)}</strong>
                </MetricCard>
              </MetricsGrid>

              <ChartsGrid>
                <ChartCard>
                  <ChartTitle>Comportamiento por fecha</ChartTitle>
                  <Bars>
                    {byDate.slice(0, 10).map((row) => (
                      <BarItem key={row.fecha}>
                        <BarLabel>
                          <span>{row.fecha}</span>
                          <strong>{formatMoney(row.total)}</strong>
                        </BarLabel>
                        <BarTrack>
                          <BarFill $ratio={row.total / maxByDate} />
                        </BarTrack>
                      </BarItem>
                    ))}
                  </Bars>
                </ChartCard>

                <ChartCard>
                  <ChartTitle>Top productos por ingresos</ChartTitle>
                  <Bars>
                    {byProduct.slice(0, 8).map((row) => (
                      <BarItem key={row.nombre}>
                        <BarLabel>
                          <span>{row.nombre}</span>
                          <strong>{formatMoney(row.total)}</strong>
                        </BarLabel>
                        <BarTrack>
                          <BarFill $ratio={row.total / maxByProduct} $tone="warn" />
                        </BarTrack>
                      </BarItem>
                    ))}
                  </Bars>
                </ChartCard>

                <ChartCard>
                  <ChartTitle>Top sucursales por ingresos</ChartTitle>
                  <Bars>
                    {byBranch.slice(0, 8).map((row) => (
                      <BarItem key={row.nombre}>
                        <BarLabel>
                          <span>{row.nombre}</span>
                          <strong>{formatMoney(row.total)}</strong>
                        </BarLabel>
                        <BarTrack>
                          <BarFill $ratio={row.total / maxByBranch} $tone="muted" />
                        </BarTrack>
                      </BarItem>
                    ))}
                  </Bars>
                </ChartCard>
              </ChartsGrid>

              <SectionHeader>
                <SectionTitle>Detalle por fecha</SectionTitle>
              </SectionHeader>
              <TableWrap>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th className="num">Ventas</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDate.map((row) => (
                      <tr key={row.fecha}>
                        <td>{row.fecha}</td>
                        <td className="num">{row.ventas}</td>
                        <td className="num">{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableWrap>

              <SectionHeader>
                <SectionTitle>Detalle por producto</SectionTitle>
              </SectionHeader>
              <TableWrap>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="num">Unidades</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProduct.map((row) => (
                      <tr key={row.nombre}>
                        <td>{row.nombre}</td>
                        <td className="num">{row.cantidad}</td>
                        <td className="num">{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableWrap>

              <SectionHeader>
                <SectionTitle>Detalle por sucursal</SectionTitle>
              </SectionHeader>
              <TableWrap>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th className="num">Ventas</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byBranch.map((row) => (
                      <tr key={row.nombre}>
                        <td>{row.nombre}</td>
                        <td className="num">{row.ventas}</td>
                        <td className="num">{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableWrap>
            </>
          )}
        </>
      )}
    </SectionCard>
  );
}
