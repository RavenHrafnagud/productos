/**
 * Estilos del contenedor principal del panel.
 * Define estructura visual de alto nivel para el dashboard.
 */
import styled from 'styled-components';

export const Page = styled.main`
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 18px 40px;

  @media (max-width: 640px) {
    padding: 20px 12px 28px;
  }
`;

export const Header = styled.header`
  padding: 24px;
  border-radius: 20px;
  color: #f3fff8;
  background:
    radial-gradient(circle at 78% 0%, rgba(248, 223, 188, 0.22) 0%, transparent 44%),
    linear-gradient(122deg, #173f31 0%, #1d6b4f 54%, #30946d 100%);
  box-shadow: 0 26px 54px rgba(11, 40, 30, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.24);
`;

export const Brand = styled.p`
  margin: 0;
  color: #d2f5e6;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  font-size: 0.78rem;
`;

export const HeaderTitle = styled.h1`
  margin: 4px 0 8px;
  font-size: 1.82rem;
`;

export const HeaderCopy = styled.p`
  margin: 0;
  color: #d8f8ea;
  max-width: 650px;
`;

export const Toolbar = styled.div`
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const UserPill = styled.span`
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.85rem;
`;

export const ActionButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  color: #f6fff9;
  background: rgba(255, 255, 255, 0.12);
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;

  :disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const AlertStrip = styled.div`
  margin-top: 14px;
  border-radius: 10px;
  border: 1px solid #f1d2b2;
  background: #fff4e8;
  color: #6e4220;
  padding: 12px;
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
  background: var(--bg-panel);
  box-shadow: var(--shadow-soft);
  padding: 12px;
  position: sticky;
  top: 14px;
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
  gap: 6px;
`;

export const SideMenuButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  text-align: left;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#7bc2a1' : 'var(--border-soft)')};
  background: ${({ $active }) => ($active ? 'linear-gradient(125deg, #e7f7ef 0%, #d8f2e4 100%)' : '#fff')};
  color: ${({ $active }) => ($active ? '#154432' : 'var(--text-main)')};
  padding: 10px;
  cursor: pointer;

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
`;
