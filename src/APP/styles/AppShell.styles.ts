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
  gap: 14px;

  @media (max-width: 640px) {
    padding: 20px 12px 32px;
  }

  @media (max-width: 520px) {
    padding: 16px 10px 28px;
    gap: 12px;
  }

  @media (max-width: 720px) {
    padding-bottom: calc(96px + env(safe-area-inset-bottom));
  }

  @media (max-width: 430px) {
    padding: 14px 8px 26px;
  }
`;

export const Header = styled.header`
  padding: 26px;
  border-radius: 24px;
  color: #f8f3ff;
  background:
    radial-gradient(circle at 75% 5%, rgba(245, 211, 171, 0.32) 0%, transparent 48%),
    linear-gradient(135deg, #2b174e 0%, #4d2d86 52%, #7a48ce 100%);
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

  @media (max-width: 520px) {
    padding: 14px;
    border-radius: 18px;
  }

  @media (max-width: 480px) {
    padding: 12px;
  }
`;

export const Brand = styled.p`
  margin: 0;
  color: #eadfff;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  font-size: 0.74rem;
`;

export const HeaderTitle = styled.h1`
  margin: 4px 0 8px;
  font-size: clamp(1.6rem, 2.5vw, 2.3rem);

  @media (max-width: 520px) {
    font-size: 1.4rem;
    margin: 2px 0 6px;
  }

  @media (max-width: 430px) {
    font-size: 1.32rem;
    margin: 2px 0 4px;
  }
`;

export const HeaderCopy = styled.p`
  margin: 0;
  color: #efe6ff;
  max-width: 720px;
  line-height: 1.35;

  @media (max-width: 520px) {
    font-size: 0.86rem;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  @media (max-width: 430px) {
    font-size: 0.82rem;
    line-height: 1.3;
  }
`;

export const Toolbar = styled.div`
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }

  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    margin-top: 12px;
  }

  @media (max-width: 480px) {
    gap: 6px;
  }
`;

export const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  color: #f9f3ff;
  background: rgba(255, 255, 255, 0.14);
  padding: 7px 10px;
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  :hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 18px rgba(8, 28, 22, 0.18);
    background: rgba(255, 255, 255, 0.22);
  }

  @media (max-width: 980px) {
    display: inline-flex;
  }

  @media (max-width: 520px) {
    font-size: 0.8rem;
    padding: 6px 8px;
    order: 1;
  }

  svg {
    width: 16px;
    height: 16px;
  }

  .hamburger {
    display: inline-grid;
    place-items: center;
  }
`;

export const UserPill = styled.span`
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  font-size: 0.82rem;
  backdrop-filter: blur(8px);

  @media (max-width: 640px) {
    width: 100%;
  }

  @media (max-width: 520px) {
    font-size: 0.78rem;
    padding: 6px 8px;
    order: 3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const ActionButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 10px;
  color: #f9f3ff;
  background: rgba(255, 255, 255, 0.12);
  padding: 7px 10px;
  font-weight: 700;
  font-size: 0.86rem;
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

  @media (max-width: 640px) {
    width: 100%;
    text-align: center;
  }

  @media (max-width: 520px) {
    width: auto;
    font-size: 0.8rem;
    padding: 6px 8px;
  }

  &.toolbar-refresh {
    @media (max-width: 520px) {
      order: 2;
    }
  }

  &.toolbar-logout {
    @media (max-width: 520px) {
      order: 4;
    }
  }
`;

export const AlertStrip = styled.div`
  margin-top: 14px;
  border-radius: 12px;
  border: 1px solid #f1d6ba;
  background: #fff3e6;
  color: #6e4220;
  padding: 10px 12px;
  font-size: 0.88rem;

  @media (max-width: 430px) {
    font-size: 0.84rem;
  }
`;

export const Grid = styled.section`
  display: grid;
  gap: 12px;
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
  gap: 12px;
  margin-top: 16px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 720px) {
    gap: 8px;
  }
`;

export const SideMenu = styled.aside`
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  background: linear-gradient(180deg, #ffffff 0%, #faf7ff 100%);
  box-shadow: var(--shadow-lift);
  padding: 12px;
  position: sticky;
  top: 18px;

  @media (max-width: 980px) {
    display: none;
  }

  @media (max-width: 640px) {
    padding: 10px;
  }

  @media (max-width: 520px) {
    padding: 8px;
    border-radius: var(--radius-md);
  }
`;

export const SideMenuTitle = styled.p`
  margin: 0 0 8px;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;

  @media (max-width: 720px) {
    display: none;
  }
`;

export const SideMenuList = styled.div`
  display: grid;
  gap: 8px;

  @media (max-width: 980px) {
    grid-auto-flow: column;
    grid-auto-columns: minmax(130px, 1fr);
    overflow-x: auto;
    padding-bottom: 6px;
  }

  @media (max-width: 520px) {
    grid-auto-columns: minmax(120px, 1fr);
  }

  @media (max-width: 430px) {
    grid-auto-columns: minmax(110px, 1fr);
    gap: 6px;
  }
`;

export const SideMenuButton = styled.button<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: 26px 1fr;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border-radius: 10px;
  border: 1px solid ${({ $active }) => ($active ? '#b194e8' : 'var(--border-soft)')};
  background: ${({ $active }) =>
    $active ? 'linear-gradient(125deg, #f1e9ff 0%, #e2d4ff 100%)' : 'rgba(255, 255, 255, 0.96)'};
  color: ${({ $active }) => ($active ? '#452170' : 'var(--text-main)')};
  padding: 9px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  box-shadow: ${({ $active }) => ($active ? '0 12px 20px rgba(53, 30, 88, 0.2)' : 'none')};

  .menu-icon {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: 10px;
    background: ${({ $active }) => ($active ? 'rgba(124, 67, 217, 0.16)' : 'rgba(47, 34, 76, 0.06)')};
    color: ${({ $active }) => ($active ? '#5f2ead' : 'var(--text-muted)')};
    box-shadow: ${({ $active }) =>
      $active ? '0 0 0 3px rgba(124, 67, 217, 0.2), 0 0 16px rgba(124, 67, 217, 0.28)' : 'none'};
  }

  .menu-icon svg {
    width: 18px;
    height: 18px;
  }

  .menu-text {
    display: grid;
    gap: 2px;
  }

  :hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(45, 31, 74, 0.12);
    border-color: ${({ $active }) => ($active ? '#9f7ede' : '#d6cbe8')};
  }

  strong {
    display: block;
    font-size: 0.94rem;
    margin-bottom: 2px;
  }

  small {
    color: ${({ $active }) => ($active ? '#5a378b' : 'var(--text-muted)')};
  }

  @media (max-width: 520px) {
    padding: 7px;

    strong {
      font-size: 0.88rem;
    }

    small {
      font-size: 0.75rem;
    }
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;

    strong {
      font-size: 0.88rem;
    }

    small {
      display: none;
    }

    .menu-text {
      gap: 0;
    }
  }
`;

export const MainContent = styled.section`
  min-width: 0;
  display: grid;
  gap: 14px;
`;

export const MobileMenuPanel = styled.section`
  display: none;
  margin-top: 8px;
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(82, 42, 130, 0.18);
  box-shadow: 0 10px 16px rgba(38, 24, 64, 0.14);

  @media (max-width: 980px) {
    display: block;
  }

  @media (max-width: 520px) {
    padding: 7px;
  }

  ${SideMenuButton} {
    padding: 6px;
    border-radius: 9px;
    grid-template-columns: 20px 1fr;
    gap: 6px;
    box-shadow: none;

    strong {
      font-size: 0.82rem;
      margin-bottom: 0;
    }

    small {
      display: none;
    }

    .menu-icon {
      width: 22px;
      height: 22px;
      border-radius: 8px;
    }

    @media (max-width: 430px) {
      padding: 5px;

      strong {
        font-size: 0.78rem;
      }
    }
  }
`;
