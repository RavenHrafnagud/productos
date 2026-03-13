/**
 * Superficie visual estandar para secciones.
 */
import styled from 'styled-components';

export const SectionCard = styled.section`
  background: linear-gradient(180deg, #ffffff 0%, #f8fbf9 100%);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 18px;
  box-shadow: var(--shadow-soft);
  position: relative;
  overflow: hidden;
  animation: riseIn 0.35s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: linear-gradient(90deg, rgba(30, 107, 84, 0.6) 0%, rgba(201, 122, 47, 0.5) 100%);
    opacity: 0.7;
  }
`;

export const SectionHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.12rem;
`;

export const SectionMeta = styled.small`
  color: var(--text-muted);
`;
