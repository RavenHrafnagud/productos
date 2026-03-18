/**
 * Superficie visual estandar para secciones.
 */
import styled from 'styled-components';

export const SectionCard = styled.section`
  background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-soft);
  position: relative;
  overflow: hidden;
  animation: riseIn 0.35s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: linear-gradient(90deg, rgba(124, 67, 217, 0.64) 0%, rgba(201, 122, 47, 0.5) 100%);
    opacity: 0.7;
  }

  @media (max-width: 640px) {
    padding: 12px;
    border-radius: var(--radius-md);
  }

  @media (max-width: 520px) {
    padding: 10px;
  }
`;

export const SectionHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;

  @media (max-width: 520px) {
    margin-bottom: 8px;
  }
`;

export const SectionHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.02rem;

  @media (max-width: 520px) {
    font-size: 0.96rem;
  }
`;

export const SectionMeta = styled.small`
  color: var(--text-muted);
  font-size: 0.78rem;

  @media (max-width: 520px) {
    font-size: 0.74rem;
  }
`;

export const SectionToggle = styled.button`
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-main);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  :hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 14px rgba(12, 26, 20, 0.12);
  }

  @media (max-width: 520px) {
    padding: 4px 8px;
    font-size: 0.72rem;
  }
`;
