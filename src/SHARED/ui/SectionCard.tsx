/**
 * Superficie visual estandar para secciones.
 */
import styled from 'styled-components';

export const SectionCard = styled.section`
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-soft);
`;

export const SectionHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
`;

export const SectionMeta = styled.small`
  color: var(--text-muted);
`;
