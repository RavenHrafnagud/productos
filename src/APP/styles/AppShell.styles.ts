/**
 * Estilos del contenedor principal del panel.
 * Define estructura visual de alto nivel para el dashboard.
 */
import styled from 'styled-components';

export const Page = styled.main`
  max-width: 1240px;
  margin: 0 auto;
  padding: 32px 20px 56px;
  display: grid;
  gap: 16px;

  @media (max-width: 640px) {
    padding: 20px 12px 32px;
  }
`;

export const Header = styled.header`
  padding: 26px;
  border-radius: 24px;
  color: #f3fff8;
  background:
    radial-gradient(circle at 75% 5%, rgba(245, 211, 171, 0.32) 0%, transparent 48%),
    linear-gradient(135deg, #133329 0%, #1d5f4c 52%, #2f8a6b 100%);
  box-shadow: var(--shadow-soft);
  border: 1px solid rgba(255, 255, 255, 0.22);
  position: relative;
  overflow: hidden;
  animation: riseIn 0.4s ease;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.18) 0%, transparent 30%),
      radial-gradient(circle at 100% 85%, rgba(255, 255, 255, 0.12) 0%, transparent 35%);
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  @media (max-width: 640px) {
    padding: 20px;
  }
`;

export const Brand = styled.p`
  margin: 0;
  color: #d2f5e6;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  font-size: 0.74rem;
`;

export const HeaderTitle = styled.h1`
  margin: 4px 0 8px;
  font-size: clamp(1.6rem, 2.5vw, 2.3rem);
`;

export const HeaderCopy = styled.p`
  margin: 0;
  color: #d8f8ea;
  max-width: 720px;
`;

export const Toolbar = styled.div`
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const UserPill = styled.span`
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.85rem;
  backdrop-filter: blur(8px);
`;

export const ActionButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  color: #f6fff9;
  background: rgba(255, 255, 255, 0.12);
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  :hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(8, 28, 22, 0.18);
    background: rgba(255, 255, 255, 0.2);
  }

  :disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const AlertStrip = styled.div`
  margin-top: 14px;
  border-radius: 12px;
  border: 1px solid #f1d6ba;
  background: #fff3e6;
  color: #6e4220;
  padding: 12px 14px;
`;

export const Grid = styled.section`
  display: grid;
  gap: 14px;
  margin-top: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

export const ShellLayout = styled.section`
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 14px;
  margin-top: 16px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const SideMenu = styled.aside`
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  background: linear-gradient(180deg, #ffffff 0%, #f7faf8 100%);
  box-shadow: var(--shadow-lift);
  padding: 12px;
  position: sticky;
  top: 18px;

  @media (max-width: 980px) {
    position: static;
  }
`;

export const SideMenuTitle = styled.p`
  margin: 0 0 8px;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
`;

export const SideMenuList = styled.div`
  display: grid;
  gap: 8px;

  @media (max-width: 720px) {
    grid-auto-flow: column;
    grid-auto-columns: minmax(180px, 1fr);
    overflow-x: auto;
    padding-bottom: 6px;
  }
`;

export const SideMenuButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  text-align: left;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#7bc2a1' : 'var(--border-soft)')};
  background: ${({ $active }) =>
    $active ? 'linear-gradient(125deg, #e6f7ee 0%, #d4f1e2 100%)' : 'rgba(255, 255, 255, 0.96)'};
  color: ${({ $active }) => ($active ? '#154432' : 'var(--text-main)')};
  padding: 10px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  :hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(15, 32, 26, 0.08);
    border-color: ${({ $active }) => ($active ? '#6bb894' : '#cfe0d9')};
  }

  strong {
    display: block;
    font-size: 0.94rem;
    margin-bottom: 2px;
  }

  small {
    color: ${({ $active }) => ($active ? '#295c49' : 'var(--text-muted)')};
  }
`;

export const MainContent = styled.section`
  min-width: 0;
  display: grid;
  gap: 14px;
`;
