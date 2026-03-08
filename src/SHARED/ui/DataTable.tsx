/**
 * Tabla base para listados.
 */
import styled from 'styled-components';

export const TableWrap = styled.div`
  overflow-x: auto;
`;

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;

  th,
  td {
    padding: 9px 8px;
    text-align: left;
    border-bottom: 1px solid var(--border-soft);
    white-space: nowrap;
  }

  th {
    color: var(--text-muted);
    font-size: 0.79rem;
    text-transform: uppercase;
    letter-spacing: 0.6px;
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
