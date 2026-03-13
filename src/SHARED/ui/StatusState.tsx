/**
 * Estado visual reutilizable para loading/error/empty.
 */
import styled from 'styled-components';

interface StatusStateProps {
  kind: 'loading' | 'error' | 'empty' | 'info';
  message: string;
}

const toneByKind: Record<StatusStateProps['kind'], { bg: string; border: string; text: string }> = {
  loading: { bg: '#f2f6f4', border: '#d1ded8', text: '#1f3e34' },
  error: { bg: '#fdecec', border: '#f1b6b6', text: '#7d2b2b' },
  empty: { bg: '#f9f2ea', border: '#ead2b7', text: '#6b482a' },
  info: { bg: '#eef5ff', border: '#c1d7f2', text: '#204465' },
};

const Box = styled.div<{ $kind: StatusStateProps['kind'] }>`
  border-radius: var(--radius-sm);
  padding: 12px;
  border: 1px solid ${({ $kind }) => toneByKind[$kind].border};
  background: ${({ $kind }) => toneByKind[$kind].bg};
  color: ${({ $kind }) => toneByKind[$kind].text};
  box-shadow: 0 10px 22px rgba(18, 28, 24, 0.08);
  line-height: 1.5;
`;

export function StatusState({ kind, message }: StatusStateProps) {
  return <Box $kind={kind}>{message}</Box>;
}
