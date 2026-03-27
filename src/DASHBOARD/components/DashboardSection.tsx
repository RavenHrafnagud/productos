import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useBranches } from '../../BRANCHES/hooks/useBranches';
import { useSales } from '../../SALES/hooks/useSales';
import { useShipments } from '../../SHIPMENTS/hooks/useShipments';
import { DataTable, TableWrap } from '../../SHARED/ui/DataTable';
import { ButtonsRow, Field, Fields, GhostButton, InputControl, SelectControl } from '../../SHARED/ui/FormControls';
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

function toDateLabel(dateIso: string) {
  return dateIso.slice(0, 10);
}

function calcDelta(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return { tone: 'flat' as const, label: 'Sin referencia' };
  if (previous === 0) {
    if (current === 0) return { tone: 'flat' as const, label: 'Sin cambio' };
    return { tone: 'up' as const, label: 'Nuevo' };
  }
  const value = Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
  if (value > 0) return { tone: 'up' as const, label: `+${value}%` };
  if (value < 0) return { tone: 'down' as const, label: `${value}%` };
  return { tone: 'flat' as const, label: 'Sin cambio' };
}

const FilterPanel = styled.section`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #ffffff 0%, #f7f0ff 100%);
  box-shadow: 0 12px 22px rgba(45, 22, 72, 0.1);
  padding: 12px;
`;

const KpiGrid = styled.section`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  @media (max-width: 980px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const KpiCard = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: linear-gradient(160deg, #ffffff 0%, #f4ecff 100%);
  box-shadow: 0 12px 20px rgba(36, 19, 60, 0.1);
  padding: 12px;
  display: grid;
  gap: 4px;
  p { margin: 0; font-size: 0.76rem; color: var(--text-muted); }
  strong { font-size: 1.04rem; }
`;

const DeltaPill = styled.small<{ $tone: 'up' | 'down' | 'flat' }>`
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.71rem;
  border: 1px solid ${({ $tone }) => ($tone === 'up' ? '#8ad5b2' : $tone === 'down' ? '#e9a5b7' : '#cfbde9')};
  color: ${({ $tone }) => ($tone === 'up' ? '#0f6b45' : $tone === 'down' ? '#9c2f49' : '#59467a')};
  background: ${({ $tone }) => ($tone === 'up' ? '#eefbf4' : $tone === 'down' ? '#fff1f4' : '#f3eaff')};
`;

const VisualGrid = styled.section`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const VisualCard = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: linear-gradient(180deg, #ffffff 0%, #faf5ff 100%);
  box-shadow: 0 12px 20px rgba(36, 19, 60, 0.08);
  padding: 14px;
`;

const VisualTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 0.95rem;
`;

const TopList = styled.div`
  display: grid;
  gap: 8px;
`;

const TopRow = styled.div`
  display: grid;
  gap: 4px;
`;

const TopLabel = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.79rem;
`;

const Track = styled.div`
  width: 100%;
  height: 9px;
  border-radius: 999px;
  background: #e9defb;
  overflow: hidden;
`;

const Fill = styled.div<{ $ratio: number; $tone: 'a' | 'b' }>`
  width: ${({ $ratio }) => `${Math.max(4, Math.min(100, $ratio * 100))}%`};
  height: 100%;
  border-radius: 999px;
  background: ${({ $tone }) =>
    $tone === 'a'
      ? 'linear-gradient(90deg, #7f4fdb 0%, #4b2b9b 100%)'
      : 'linear-gradient(90deg, #f4b173 0%, #df7e2b 100%)'};
`;

const DonutWrap = styled.div`
  display: grid;
  grid-template-columns: 150px 1fr;
  align-items: center;
  gap: 12px;
  @media (max-width: 560px) { grid-template-columns: 1fr; justify-items: center; }
`;

const Donut = styled.div<{ $a: number; $b: number }>`
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 1px solid var(--border-soft);
  background:
    radial-gradient(circle at center, #ffffff 38%, transparent 39%),
    conic-gradient(
      #7f4fdb 0deg ${({ $a }) => `${$a}deg`},
      #f09a52 ${({ $a }) => `${$a}deg`} ${({ $a, $b }) => `${$a + $b}deg`},
      #ddd1f0 ${({ $a, $b }) => `${$a + $b}deg`} 360deg
    );
`;

const Legend = styled.div`
  display: grid;
  gap: 8px;
  font-size: 0.8rem;
`;

const LegendRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const Dot = styled.span<{ $tone: 'a' | 'b' | 'c' }>`
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: ${({ $tone }) => ($tone === 'a' ? '#7f4fdb' : $tone === 'b' ? '#f09a52' : '#ddd1f0')};
  margin-right: 6px;
  display: inline-block;
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

  const branchNameById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.nombre])), [branches]);

  const records = useMemo<CommercialRecord[]>(() => {
    const fromSales: CommercialRecord[] = sales.map((sale) => ({
      id: `VENTA-${sale.id}`,
      channel: sale.tipoVenta === 'SUCURSAL' ? 'TIENDA' : 'DIRECTO',
      date: sale.fecha,
      branchId: sale.localId,
      branchName:
        sale.tipoVenta === 'SUCURSAL'
          ? sale.localNombre
          : sale.clienteNombre
            ? `${sale.clienteNombre} (individual)`
            : 'Venta individual',
      productId: sale.productoId,
      productName: sale.productoNombre,
      units: sale.cantidad,
      gross: sale.subtotal,
      commission: sale.comisionValor + sale.descuentoValor,
      shippingCost: 0,
      net: sale.total,
    }));

    const fromShipments: CommercialRecord[] = shipments.map((shipment) => ({
      id: `ENVIO-${shipment.id}`,
      channel: shipment.canalVenta,
      date: shipment.fechaEnvio,
      branchId: shipment.localId,
      branchName: shipment.tipoEnvio === 'SUCURSAL' ? shipment.localNombre : shipment.destinatario,
      productId: shipment.productoId,
      productName: shipment.productoNombre,
      units: shipment.cantidad,
      gross: 0,
      commission: 0,
      shippingCost: shipment.costoEnvio,
      net: -shipment.costoEnvio,
    }));

    return [...fromSales, ...fromShipments];
  }, [sales, shipments]);

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

  const fromTs = new Date(`${fromDate}T00:00:00`).getTime();
  const toTs = new Date(`${toDate}T23:59:59`).getTime();

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const recordTs = new Date(record.date).getTime();
      if (recordTs < fromTs || recordTs > toTs) return false;
      if (channelFilter !== 'TODOS' && record.channel !== channelFilter) return false;
      if (branchFilter !== 'TODAS' && (record.branchId ?? 'SIN_SUCURSAL') !== branchFilter) return false;
      if (productFilter !== 'TODOS' && (record.productId ?? record.productName) !== productFilter) return false;
      return true;
    });
  }, [branchFilter, channelFilter, fromTs, productFilter, records, toTs]);

  const previousRangeRecords = useMemo(() => {
    const diff = Math.max(1, toTs - fromTs + 1);
    const prevFrom = fromTs - diff;
    const prevTo = fromTs - 1;
    return records.filter((record) => {
      const recordTs = new Date(record.date).getTime();
      if (recordTs < prevFrom || recordTs > prevTo) return false;
      if (channelFilter !== 'TODOS' && record.channel !== channelFilter) return false;
      if (branchFilter !== 'TODAS' && (record.branchId ?? 'SIN_SUCURSAL') !== branchFilter) return false;
      if (productFilter !== 'TODOS' && (record.productId ?? record.productName) !== productFilter) return false;
      return true;
    });
  }, [branchFilter, channelFilter, fromTs, productFilter, records, toTs]);

  const totals = useMemo(() => {
    return {
      operations: filteredRecords.length,
      units: filteredRecords.reduce((sum, item) => sum + item.units, 0),
      gross: filteredRecords.reduce((sum, item) => sum + item.gross, 0),
      commission: filteredRecords.reduce((sum, item) => sum + item.commission, 0),
      shipping: filteredRecords.reduce((sum, item) => sum + item.shippingCost, 0),
      net: filteredRecords.reduce((sum, item) => sum + item.net, 0),
    };
  }, [filteredRecords]);

  const previousTotals = useMemo(() => {
    return {
      operations: previousRangeRecords.length,
      units: previousRangeRecords.reduce((sum, item) => sum + item.units, 0),
      gross: previousRangeRecords.reduce((sum, item) => sum + item.gross, 0),
      commission: previousRangeRecords.reduce((sum, item) => sum + item.commission, 0),
      shipping: previousRangeRecords.reduce((sum, item) => sum + item.shippingCost, 0),
      net: previousRangeRecords.reduce((sum, item) => sum + item.net, 0),
    };
  }, [previousRangeRecords]);

  const byDate = useMemo(() => {
    const map = new Map<string, { date: string; operations: number; gross: number; commission: number; shipping: number; net: number }>();
    for (const row of filteredRecords) {
      const key = toDateLabel(row.date);
      const current = map.get(key) ?? { date: key, operations: 0, gross: 0, commission: 0, shipping: 0, net: 0 };
      current.operations += 1;
      current.gross += row.gross;
      current.commission += row.commission;
      current.shipping += row.shippingCost;
      current.net += row.net;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filteredRecords]);

  const byProduct = useMemo(() => {
    const map = new Map<string, { name: string; net: number }>();
    for (const row of filteredRecords) {
      const key = row.productId ?? row.productName;
      const current = map.get(key) ?? { name: row.productName, net: 0 };
      current.net += row.net;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.net - a.net);
  }, [filteredRecords]);

  const byBranch = useMemo(() => {
    const map = new Map<string, { name: string; net: number }>();
    for (const row of filteredRecords) {
      const key = row.branchId ?? 'SIN_SUCURSAL';
      const current = map.get(key) ?? {
        name: row.branchId ? branchNameById.get(row.branchId) ?? row.branchName : 'Sin sucursal',
        net: 0,
      };
      current.net += row.net;
      map.set(key, current);
    }
    return [...map.values()].sort((a, b) => b.net - a.net);
  }, [branchNameById, filteredRecords]);

  const byChannel = useMemo(() => {
    const tienda = filteredRecords.filter((row) => row.channel === 'TIENDA').reduce((sum, row) => sum + row.gross, 0);
    const directo = filteredRecords.filter((row) => row.channel === 'DIRECTO').reduce((sum, row) => sum + row.gross, 0);
    const total = tienda + directo;
    const storeRatio = total > 0 ? tienda / total : 0;
    const directRatio = total > 0 ? directo / total : 0;
    return { tienda, directo, total, storeRatio, directRatio };
  }, [filteredRecords]);

  const topProducts = byProduct.slice(0, 6);
  const topBranches = byBranch.slice(0, 6);
  const maxProduct = Math.max(...topProducts.map((row) => row.net), 1);
  const maxBranch = Math.max(...topBranches.map((row) => row.net), 1);

  const loading = salesStatus === 'loading' || shipmentsStatus === 'loading' || branchesStatus === 'loading';
  const hasError = Boolean(salesError || shipmentsError || branchesError);
  const bestError = friendlySalesError ?? friendlyShipmentsError ?? friendlyBranchesError ?? 'Error inesperado.';
  const isGuidedError = isSetupError(salesError) || isSetupError(shipmentsError) || isSetupError(branchesError);

  const deltaOps = calcDelta(totals.operations, previousTotals.operations);
  const deltaUnits = calcDelta(totals.units, previousTotals.units);
  const deltaGross = calcDelta(totals.gross, previousTotals.gross);
  const deltaCom = calcDelta(totals.commission, previousTotals.commission);
  const deltaShipping = calcDelta(totals.shipping, previousTotals.shipping);
  const deltaNet = calcDelta(totals.net, previousTotals.net);

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - 1000 * 60 * 60 * 24 * (days - 1));
    setFromDate(toDateInputValue(start));
    setToDate(toDateInputValue(end));
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Dashboard comercial</SectionTitle>
        <SectionHeaderActions>
          <SectionMeta>{filteredRecords.length} operaciones filtradas</SectionMeta>
          <SectionToggle type="button" onClick={() => setCollapsed((prev) => !prev)} aria-expanded={!collapsed}>
            {collapsed ? 'Mostrar' : 'Ocultar'}
          </SectionToggle>
        </SectionHeaderActions>
      </SectionHeader>

      {!collapsed && (
        <>
          <FilterPanel>
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
                <SelectControl value={channelFilter} onChange={(event) => setChannelFilter(event.target.value as SalesChannelFilter)}>
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
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </SelectControl>
              </Field>
              <Field>
                Producto
                <SelectControl value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                  <option value="TODOS">Todos</option>
                  {productOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </SelectControl>
              </Field>
            </Fields>
            <ButtonsRow>
              <GhostButton type="button" onClick={() => setQuickRange(7)}>7 dias</GhostButton>
              <GhostButton type="button" onClick={() => setQuickRange(30)}>30 dias</GhostButton>
              <GhostButton type="button" onClick={() => setQuickRange(90)}>90 dias</GhostButton>
            </ButtonsRow>
          </FilterPanel>

          {loading && <StatusState kind="loading" message="Consolidando metricas del dashboard..." />}
          {hasError && <StatusState kind={isGuidedError ? 'info' : 'error'} message={bestError} />}
          {!loading && !hasError && filteredRecords.length === 0 && (
            <StatusState kind="empty" message="No hay operaciones para el rango y filtros seleccionados." />
          )}

          {!loading && !hasError && filteredRecords.length > 0 && (
            <>
              <KpiGrid>
                <KpiCard><p>Operaciones</p><strong>{totals.operations}</strong><DeltaPill $tone={deltaOps.tone}>{deltaOps.label}</DeltaPill></KpiCard>
                <KpiCard><p>Unidades</p><strong>{totals.units.toFixed(2)}</strong><DeltaPill $tone={deltaUnits.tone}>{deltaUnits.label}</DeltaPill></KpiCard>
                <KpiCard><p>Ingreso bruto</p><strong>{formatMoney(totals.gross)}</strong><DeltaPill $tone={deltaGross.tone}>{deltaGross.label}</DeltaPill></KpiCard>
                <KpiCard><p>Comisiones y descuentos</p><strong>{formatMoney(totals.commission)}</strong><DeltaPill $tone={deltaCom.tone}>{deltaCom.label}</DeltaPill></KpiCard>
                <KpiCard><p>Costos de envio</p><strong>{formatMoney(totals.shipping)}</strong><DeltaPill $tone={deltaShipping.tone}>{deltaShipping.label}</DeltaPill></KpiCard>
                <KpiCard><p>Ganancia neta</p><strong>{formatMoney(totals.net)}</strong><DeltaPill $tone={deltaNet.tone}>{deltaNet.label}</DeltaPill></KpiCard>
              </KpiGrid>

              <VisualGrid>
                <VisualCard>
                  <VisualTitle>Participacion por canal (ingreso bruto)</VisualTitle>
                  <DonutWrap>
                    <Donut $a={Math.max(0, Math.min(360, byChannel.storeRatio * 360))} $b={Math.max(0, Math.min(360, byChannel.directRatio * 360))} />
                    <Legend>
                      <LegendRow><span><Dot $tone="a" />Tienda</span><strong>{(byChannel.storeRatio * 100).toFixed(1)}%</strong></LegendRow>
                      <LegendRow><span><Dot $tone="b" />Directo</span><strong>{(byChannel.directRatio * 100).toFixed(1)}%</strong></LegendRow>
                      <LegendRow><span><Dot $tone="c" />Total bruto</span><strong>{formatMoney(byChannel.total)}</strong></LegendRow>
                    </Legend>
                  </DonutWrap>
                </VisualCard>

                <VisualCard>
                  <VisualTitle>Flujo financiero del periodo</VisualTitle>
                  <TopList>
                    <TopRow><TopLabel><span>Ingreso bruto</span><strong>{formatMoney(totals.gross)}</strong></TopLabel></TopRow>
                    <TopRow><TopLabel><span>- Comisiones y descuentos</span><strong>{formatMoney(totals.commission)}</strong></TopLabel></TopRow>
                    <TopRow><TopLabel><span>- Costos de envio</span><strong>{formatMoney(totals.shipping)}</strong></TopLabel></TopRow>
                    <TopRow><TopLabel><span>= Ganancia neta</span><strong>{formatMoney(totals.net)}</strong></TopLabel></TopRow>
                  </TopList>
                </VisualCard>

                <VisualCard>
                  <VisualTitle>Top productos por ganancia neta</VisualTitle>
                  <TopList>
                    {topProducts.map((row) => (
                      <TopRow key={row.name}>
                        <TopLabel><span>{row.name}</span><strong>{formatMoney(row.net)}</strong></TopLabel>
                        <Track><Fill $tone="a" $ratio={row.net / maxProduct} /></Track>
                      </TopRow>
                    ))}
                  </TopList>
                </VisualCard>

                <VisualCard>
                  <VisualTitle>Top sucursales por ganancia neta</VisualTitle>
                  <TopList>
                    {topBranches.map((row) => (
                      <TopRow key={row.name}>
                        <TopLabel><span>{row.name}</span><strong>{formatMoney(row.net)}</strong></TopLabel>
                        <Track><Fill $tone="b" $ratio={row.net / maxBranch} /></Track>
                      </TopRow>
                    ))}
                  </TopList>
                </VisualCard>
              </VisualGrid>

              <SectionHeader><SectionTitle>Detalle diario de rentabilidad</SectionTitle></SectionHeader>
              <TableWrap>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th className="num">Operaciones</th>
                      <th className="num">Bruto</th>
                      <th className="num">Com./Desc.</th>
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
            </>
          )}
        </>
      )}
    </SectionCard>
  );
}
