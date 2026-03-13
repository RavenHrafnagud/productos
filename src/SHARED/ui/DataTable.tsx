/**
 * Tabla base para listados.
 */
import styled from 'styled-components';

export const TableWrap = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
  background: #fff;
  border-radius: var(--radius-sm);
  overflow: hidden;

  th,
  td {
    padding: 10px 8px;
    text-align: left;
    border-bottom: 1px solid var(--border-soft);
    white-space: nowrap;
    vertical-align: top;
  }

  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .actions {
    text-align: right;
  }

  .wrap {
    white-space: normal;
  }

  td.actions > div {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: wrap;
  }

  td.actions > div.no-wrap {
    flex-wrap: nowrap;
  }

  td.actions button {
    padding: 6px 10px;
    font-size: 0.78rem;
    border-radius: 8px;
  }

  td.actions select {
    padding: 6px 30px 6px 10px;
    font-size: 0.78rem;
    border-radius: 8px;
  }

  td.actions > div > button {
    flex: 0 0 auto;
  }

  td.actions > div > select {
    flex: 0 0 160px;
    min-width: 150px;
  }

  td.actions select.fit-content {
    flex: 0 0 auto;
    width: auto;
    min-width: 120px;
    max-width: 240px;
  }

  th {
    color: var(--text-muted);
    font-size: 0.79rem;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    background: #f4f7f5;
  }

  tbody tr:nth-child(even) {
    background: #fbfcfb;
  }

  tbody tr:hover {
    background: #f0f6f3;
  }

  @media (max-width: 640px) {
    font-size: 0.86rem;

    th,
    td {
      padding: 8px 6px;
    }

    td.actions > div {
      width: 100%;
      justify-content: stretch;
    }

    td.actions button,
    td.actions select {
      width: 100%;
    }
  }

  @media (max-width: 720px) {
    .hide-mobile {
      display: none;
    }
  }
`;

export const Tag = styled.span<{ $tone?: 'ok' | 'off' | 'warn' }>`
  display: inline-block;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.45px;
  background: ${({ $tone }) => {
    if ($tone === 'off') return '#eceff3';
    if ($tone === 'warn') return '#ffedd8';
    return '#def4ea';
  }};
  color: ${({ $tone }) => {
    if ($tone === 'off') return '#555f6d';
    if ($tone === 'warn') return '#7a4a1f';
    return '#1d6046';
  }};
`;
