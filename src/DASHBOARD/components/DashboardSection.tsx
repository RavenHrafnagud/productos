/**
 * Dashboard principal.
 * Consolida ventas + envios para analisis de rentabilidad por canal.
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useBranches } from '../../BRANCHES/hooks/useBranches';
import { useSales } from '../../SALES/hooks/useSales';
import { useShipments } from '../../SHIPMENTS/hooks/useShipments';
import { DataTable, TableWrap } from '../../SHARED/ui/DataTable';
import { Field, Fields, InputControl, SelectControl } from '../../SHARED/ui/FormControls';
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

interface DashboardSectionProps {
  refreshKey: number;
}

type SalesChannelFilter = 'TODOS' | 'TIENDA' | 'DIRECTO';

interface CommercialRecord {
  id: string;
  source: 'VENTA' | 'ENVIO';
  channel: 'TIENDA' | 'DIRECTO';
  date: string;
  branchId: string | null;
  branchName: string;
  productId: string | null;
  productName: string;
  units: number;
  gross: number;
  commission: number;
  shippingCost: number;
  net: number;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  padding: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f6f0ff 100%);
  box-shadow: 0 12px 22px rgba(37, 24, 62, 0.1);

  p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.78rem;
  }

  strong {
    margin-top: 4px;
    display: block;
    font-size: 1.02rem;
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
  const { branches, status: branchesStatus, error: branchesError } = useBranches(refreshKey);
  const { sales, status: salesStatus, error: salesError } = useSales(refreshKey);
  const { shipments, status: shipmentsStatus, error: shipmentsError } = useShipments(refreshKey);

  const [fromDate, setFromDate] = useState(() => toDateInputValue(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)));
  const [toDate, setToDate] = useState(() => toDateInputValue(new Date()));
  const [channelFilter, setChannelFilter] = useState<SalesChannelFilter>('TODOS');
  const [branchFilter, setBranchFilter] = useState<string>('TODAS');
  const [productFilter, setProductFilter] = useState<string>('TODOS');
  const [collapsed, setCollapsed] = useState(false);

  const friendlySalesError = toFriendlySupabaseMessage(salesError, 'dashboard');
  const friendlyShipmentsError = toFriendlySupabaseMessage(shipmentsError, 'envios');
  const friendlyBranchesError = toFriendlySupabaseMessage(branchesError, 'sucursales');

  const branchCommissionById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.porcentajeComision])),
    [branches],
  );
  const branchNameById = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.nombre])),
    [branches],
  );

  const records = useMemo<CommercialRecord[]>(() => {
    const fromSales: CommercialRecord[] = sales.map((sale) => {
      const commissionPct = branchCommissionById.get(sale.localId) ?? 0;
      const gross = sale.total;
      const commission = (gross * commissionPct) / 100;
      return {
        id: `VENTA-${sale.id}`,
        source: 'VENTA',
        channel: 'TIENDA',
        date: sale.fecha,
        branchId: sale.localId,
        branchName: sale.localNombre,
        productId: sale.productoId,
        productName: sale.productoNombre,
        units: sale.cantidad,
        gross,
        commission,
        shippingCost: 0,
        net: gross - commission,
      };
    });

    const fromShipments: CommercialRecord[] = shipments.map((shipment) => ({
      id: `ENVIO-${shipment.id}`,
      source: 'ENVIO',
      channel: shipment.canalVenta,
      date: shipment.fechaEnvio,
      branchId: shipment.localId,
      branchName: shipment.localNombre,
      productId: shipment.productoId,
      productName: shipment.productoNombre,
      units: shipment.cantidad,
      gross: shipment.ingresoBruto,
      commission: shipment.comisionValor,
      shippingCost: shipment.costoEnvio,
      net: shipment.gananciaNeta,
    }));

    return [...fromSales, ...fromShipments];
  }, [branchCommissionById, sales, shipments]);

  const productOptions = useMemo(
    () =>
      [...new Map(records.map((item) => [item.productId ?? item.productName, item.productName])).entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [records],
  );

  const branchOptions = useMemo(
    () =>
      [...new Map(records.map((item) => [item.branchId ?? 'SIN_SUCURSAL', item.branchName])).entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const fromTs = new Date(`${fromDate}T00:00:00`).getTime();
    const toTs = new Date(`${toDate}T23:59:59`).getTime();
    return records.filter((record) => {
      const recordTs = new Date(record.date).getTime();
      if (recordTs < fromTs || recordTs > toTs) return false;
      if (channelFilter !== 'TODOS' && record.channel !== channelFilter) return false;
      if (branchFilter !== 'TODAS' && (record.branchId ?? 'SIN_SUCURSAL') !== branchFilter) return false;
      if (productFilter !== 'TODOS' && (record.productId ?? record.productName) !== productFilter) return false;
      return true;
    });
  }, [branchFilter, channelFilter, fromDate, productFilter, records, toDate]);

  const totals = useMemo(() => {
    const operations = filteredRecords.length;
    const totalGross = filteredRecords.reduce((sum, item) => sum + item.gross, 0);
    const totalUnits = filteredRecords.reduce((sum, item) => sum + item.units, 0);
    const totalCommission = filteredRecords.reduce((sum, item) => sum + item.commission, 0);
    const totalShipping = filteredRecords.reduce((sum, item) => sum + item.shippingCost, 0);
    const totalNet = filteredRecords.reduce((sum, item) => sum + item.net, 0);
    return { operations, totalGross, totalUnits, totalCommission, totalShipping, totalNet };
  }, [filteredRecords]);

  const byDate = useMemo(() => {
    const map = new Map<string, { date: string; operations: number; gross: number; commission: number; shipping: number; net: number }>();
    for (const row of filteredRecords) {
      const dateKey = row.date.slice(0, 10);
      const current = map.get(dateKey) ?? { date: dateKey, operations: 0, gross: 0, commission: 0, shipping: 0, net: 0 };
      current.operations += 1;
      current.gross += row.gross;
      current.commission += row.commission;
      current.shipping += row.shippingCost;
      current.net += row.net;
      map.set(dateKey, current);
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filteredRecords]);

  const byProduct = useMemo(() => {
    const map = new Map<string, { name: string; units: number; gross: number; net: number }>();
    for (const row of filteredRecords) {
      const key = row.productId ?? row.productName;
      const current = map.get(key) ?? { name: row.productName, units: 0, gross: 0, net: 0 };
      current.units += row.units;
      current.gross += row.gross;
      current.net += row.net;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.net - a.net);
  }, [filteredRecords]);

  const byBranch = useMemo(() => {
    const map = new Map<string, { name: string; operations: number; gross: number; net: number }>();
    for (const row of filteredRecords) {
      const key = row.branchId ?? 'SIN_SUCURSAL';
      const current = map.get(key) ?? {
        name: row.branchId ? branchNameById.get(row.branchId) ?? row.branchName : 'Sin sucursal',
        operations: 0,
        gross: 0,
        net: 0,
      };
      current.operations += 1;
      current.gross += row.gross;
      current.net += row.net;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.net - a.net);
  }, [branchNameById, filteredRecords]);

  const byChannel = useMemo(() => {
    const map = new Map<'TIENDA' | 'DIRECTO', { channel: 'TIENDA' | 'DIRECTO'; operations: number; gross: number; net: number }>();
    for (const row of filteredRecords) {
      const current = map.get(row.channel) ?? { channel: row.channel, operations: 0, gross: 0, net: 0 };
      current.operations += 1;
      current.gross += row.gross;
      current.net += row.net;
      map.set(row.channel, current);
    }
    return [...map.values()].sort((a, b) => b.net - a.net);
  }, [filteredRecords]);

  const maxByDate = useMemo(() => Math.max(...byDate.map((row) => row.net), 1), [byDate]);
  const maxByProduct = useMemo(() => Math.max(...byProduct.map((row) => row.net), 1), [byProduct]);
  const maxByBranch = useMemo(() => Math.max(...byBranch.map((row) => row.net), 1), [byBranch]);

  const loading = salesStatus === 'loading' || shipmentsStatus === 'loading' || branchesStatus === 'loading';
  const hasError = Boolean(salesError || shipmentsError || branchesError);
  const bestError = friendlySalesError ?? friendlyShipmentsError ?? friendlyBranchesError ?? 'Error inesperado.';
  const isGuidedError = isSetupError(salesError) || isSetupError(shipmentsError) || isSetupError(branchesError);

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Dashboard comercial</SectionTitle>
        <SectionHeaderActions>
          <SectionMeta>{filteredRecords.length} operaciones en el rango</SectionMeta>
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
            <Field>
              Canal
              <SelectControl
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value as SalesChannelFilter)}
              >
                <option value="TODOS">Todos</option>
                <option value="TIENDA">Tienda</option>
                <option value="DIRECTO">Directo</option>
              </SelectControl>
            </Field>
            <Field>
              Sucursal
              <SelectControl value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                <option value="TODAS">Todas</option>
                {branchOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </SelectControl>
            </Field>
            <Field>
              Producto
              <SelectControl value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                <option value="TODOS">Todos</option>
                {productOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </SelectControl>
            </Field>
          </Fields>

          {loading && <StatusState kind="loading" message="Calculando rentabilidad consolidada..." />}
          {hasError && <StatusState kind={isGuidedError ? 'info' : 'error'} message={bestError} />}
          {!loading && !hasError && filteredRecords.length === 0 && (
            <StatusState kind="empty" message="No hay operaciones para los filtros seleccionados." />
          )}

          {!loading && !hasError && filteredRecords.length > 0 && (
            <>
              <MetricsGrid>
                <MetricCard>
                  <p>Operaciones</p>
                  <strong>{totals.operations}</strong>
                </MetricCard>
                <MetricCard>
                  <p>Unidades</p>
                  <strong>{totals.totalUnits.toFixed(2)}</strong>
                </MetricCard>
                <MetricCard>
                  <p>Ingreso bruto</p>
                  <strong>{formatMoney(totals.totalGross)}</strong>
                </MetricCard>
                <MetricCard>
                  <p>Comisiones</p>
                  <strong>{formatMoney(totals.totalCommission)}</strong>
                </MetricCard>
                <MetricCard>
                  <p>Costos de envio</p>
                  <strong>{formatMoney(totals.totalShipping)}</strong>
                </MetricCard>
                <MetricCard>
                  <p>Ganancia neta</p>
                  <strong>{formatMoney(totals.totalNet)}</strong>
                </MetricCard>
              </MetricsGrid>

              <ChartsGrid>
                <ChartCard>
                  <ChartTitle>Ganancia neta por fecha</ChartTitle>
                  <Bars>
                    {byDate.slice(0, 12).map((row) => (
                      <BarItem key={row.date}>
                        <BarLabel>
                          <span>{row.date}</span>
                          <strong>{formatMoney(row.net)}</strong>
                        </BarLabel>
                        <BarTrack>
                          <BarFill $ratio={row.net / maxByDate} />
                        </BarTrack>
                      </BarItem>
                    ))}
                  </Bars>
                </ChartCard>

                <ChartCard>
                  <ChartTitle>Top productos por ganancia neta</ChartTitle>
                  <Bars>
                    {byProduct.slice(0, 8).map((row) => (
                      <BarItem key={row.name}>
                        <BarLabel>
                          <span>{row.name}</span>
                          <strong>{formatMoney(row.net)}</strong>
                        </BarLabel>
                        <BarTrack>
                          <BarFill $ratio={row.net / maxByProduct} $tone="warn" />
                        </BarTrack>
                      </BarItem>
                    ))}
                  </Bars>
                </ChartCard>

                <ChartCard>
                  <ChartTitle>Top sucursales por ganancia neta</ChartTitle>
                  <Bars>
                    {byBranch.slice(0, 8).map((row) => (
                      <BarItem key={row.name}>
                        <BarLabel>
                          <span>{row.name}</span>
                          <strong>{formatMoney(row.net)}</strong>
                        </BarLabel>
                        <BarTrack>
                          <BarFill $ratio={row.net / maxByBranch} $tone="muted" />
                        </BarTrack>
                      </BarItem>
                    ))}
                  </Bars>
                </ChartCard>
              </ChartsGrid>

              <SectionHeader>
                <SectionTitle>Reporte por canal</SectionTitle>
              </SectionHeader>
              <TableWrap>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Canal</th>
                      <th className="num">Operaciones</th>
                      <th className="num">Ingreso bruto</th>
                      <th className="num">Ganancia neta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byChannel.map((row) => (
                      <tr key={row.channel}>
                        <td>{row.channel}</td>
                        <td className="num">{row.operations}</td>
                        <td className="num">{formatMoney(row.gross)}</td>
                        <td className="num">{formatMoney(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableWrap>

              <SectionHeader>
                <SectionTitle>Rentabilidad por fecha</SectionTitle>
              </SectionHeader>
              <TableWrap>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th className="num">Operaciones</th>
                      <th className="num">Bruto</th>
                      <th className="num">Comision</th>
                      <th className="num">Envio</th>
                      <th className="num">Neta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDate.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td className="num">{row.operations}</td>
                        <td className="num">{formatMoney(row.gross)}</td>
                        <td className="num">{formatMoney(row.commission)}</td>
                        <td className="num">{formatMoney(row.shipping)}</td>
                        <td className="num">{formatMoney(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableWrap>

              <SectionHeader>
                <SectionTitle>Rentabilidad por producto</SectionTitle>
              </SectionHeader>
              <TableWrap>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th className="num">Unidades</th>
                      <th className="num">Bruto</th>
                      <th className="num">Neta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProduct.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td className="num">{row.units.toFixed(2)}</td>
                        <td className="num">{formatMoney(row.gross)}</td>
                        <td className="num">{formatMoney(row.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableWrap>

              <SectionHeader>
                <SectionTitle>Rentabilidad por sucursal</SectionTitle>
              </SectionHeader>
              <TableWrap>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Sucursal</th>
                      <th className="num">Operaciones</th>
                      <th className="num">Bruto</th>
                      <th className="num">Neta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byBranch.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td className="num">{row.operations}</td>
                        <td className="num">{formatMoney(row.gross)}</td>
                        <td className="num">{formatMoney(row.net)}</td>
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

