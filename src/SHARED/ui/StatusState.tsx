/**
 * Estado visual reutilizable para loading/error/empty.
 */
import styled from 'styled-components';

interface StatusStateProps {
  kind: 'loading' | 'error' | 'empty' | 'info';
  message: string;
}

const toneByKind: Record<StatusStateProps['kind'], { bg: string; border: string; text: string }> = {
  loading: { bg: '#f4f7f6', border: '#d4dfda', text: '#24443a' },
  error: { bg: '#fdecec', border: '#f2bcbc', text: '#7f2323' },
  empty: { bg: '#f8f3ee', border: '#ecd8c3', text: '#6c4a2f' },
  info: { bg: '#edf6ff', border: '#bdd8f5', text: '#20496f' },
};

const Box = styled.div<{ $kind: StatusStateProps['kind'] }>`
  border-radius: var(--radius-sm);
  padding: 12px;
  border: 1px solid ${({ $kind }) => toneByKind[$kind].border};
  background: ${({ $kind }) => toneByKind[$kind].bg};
  color: ${({ $kind }) => toneByKind[$kind].text};
`;

export function StatusState({ kind, message }: StatusStateProps) {
  return <Box $kind={kind}>{message}</Box>;
}
