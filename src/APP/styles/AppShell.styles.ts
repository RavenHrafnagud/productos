/**
 * Contenedor principal del dashboard.
 * Centraliza layout para mantener consistencia entre modulos.
 */
import styled from 'styled-components';

export const Page = styled.main`
  max-width: 1160px;
  margin: 0 auto;
  padding: 28px 18px 36px;

  @media (max-width: 640px) {
    padding: 20px 12px 28px;
  }
`;

export const Header = styled.header`
  background: linear-gradient(120deg, #0f5a41 0%, #1f7a5a 55%, #3f9472 100%);
  color: #f2fff8;
  padding: 22px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  margin-bottom: 16px;
`;

export const HeaderTitle = styled.h1`
  margin: 0 0 8px;
  font-size: 1.65rem;
  letter-spacing: 0.2px;
`;

export const HeaderCopy = styled.p`
  margin: 0;
  color: #d2f6e6;
`;

export const Controls = styled.form`
  margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const Input = styled.input`
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.12);
  color: #f2fff8;
  padding: 12px 14px;
  outline: none;

  ::placeholder {
    color: #c5e6d8;
  }

  :focus {
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 0 3px rgba(242, 255, 248, 0.2);
  }
`;

export const ActionButton = styled.button`
  border: none;
  border-radius: var(--radius-sm);
  padding: 11px 14px;
  cursor: pointer;
  color: #10231c;
  background: #f7ead9;
  font-weight: 700;
  transition: transform 120ms ease, filter 120ms ease;

  :hover {
    filter: brightness(0.98);
    transform: translateY(-1px);
  }
`;

export const SecondaryButton = styled(ActionButton)`
  color: #f2fff8;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.35);
`;

export const AlertStrip = styled.div`
  margin: 14px 0 18px;
  border: 1px solid #f3d1ae;
  background: #fff1e5;
  color: #6f401f;
  border-radius: var(--radius-sm);
  padding: 12px;
`;

export const Grid = styled.section`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;
