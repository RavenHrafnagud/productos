/**
 * Controles de formulario reutilizables para secciones del panel.
 */
import styled from 'styled-components';

export const FormGrid = styled.form`
  display: grid;
  gap: 12px;

  @media (max-width: 520px) {
    gap: 10px;
  }
`;

export const Fields = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 520px) {
    gap: 8px;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;
  font-size: 0.88rem;
  color: var(--text-muted);
  font-weight: 600;

  @media (max-width: 520px) {
    font-size: 0.84rem;
  }
`;

export const InputControl = styled.input`
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #ffffff 0%, #f8f6fc 100%);
  color: var(--text-main);
  padding: 11px 12px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  :focus {
    border-color: var(--accent-main);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: #fff;
  }

  :disabled {
    background: #f3eff9;
    color: #887f95;
  }

  @media (max-width: 520px) {
    padding: 10px 11px;
  }
`;

export const TextAreaControl = styled.textarea`
  width: 100%;
  min-height: 92px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #ffffff 0%, #f8f6fc 100%);
  color: var(--text-main);
  padding: 11px 12px;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  :focus {
    border-color: var(--accent-main);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: #fff;
  }

  :disabled {
    background: #f3eff9;
    color: #887f95;
  }

  @media (max-width: 520px) {
    padding: 10px 11px;
  }
`;

export const SelectControl = styled.select`
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #ffffff 0%, #f8f6fc 100%);
  color: var(--text-main);
  padding: 11px 12px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20'%3E%3Cpath fill='%234c5b55' d='M5.6 7.6 10 12l4.4-4.4 1.4 1.4L10 14.8 4.2 9z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;

  :focus {
    border-color: var(--accent-main);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: #fff;
  }

  :disabled {
    background: #f3eff9;
    color: #887f95;
  }

  @media (max-width: 520px) {
    padding: 10px 11px;
  }
`;

export const ButtonsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 540px) {
    flex-direction: column;
    align-items: stretch;

    > * {
      width: 100%;
    }
  }

  @media (max-width: 430px) {
    gap: 6px;
  }
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
  color: #faf4ff;
  background: linear-gradient(125deg, #6b35bf 0%, #8b53db 100%);
  box-shadow: 0 10px 20px rgba(59, 33, 96, 0.24);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  :hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(59, 33, 96, 0.3);
  }

  :disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 520px) {
    padding: 8px 10px;
    font-size: 0.84rem;
  }
`;

export const GhostButton = styled.button`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  cursor: pointer;
  color: var(--text-main);
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.8);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;

  :hover:not(:disabled) {
    border-color: #cfc2e6;
    background: #ffffff;
    transform: translateY(-1px);
  }

  :disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 520px) {
    padding: 8px 10px;
    font-size: 0.84rem;
  }
`;

export const DangerButton = styled.button`
  border: 1px solid #e2b4b4;
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  cursor: pointer;
  color: #8e2b2b;
  font-size: 0.9rem;
  background: linear-gradient(135deg, #fff4f4 0%, #ffecec 100%);
  transition: border-color 0.2s ease, transform 0.2s ease;

  :hover:not(:disabled) {
    border-color: #d69b9b;
    transform: translateY(-1px);
  }

  :disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 520px) {
    padding: 8px 10px;
    font-size: 0.84rem;
  }
`;

export const Divider = styled.hr`
  margin: 14px 0;
  border: 0;
  border-top: 1px solid transparent;
  background: linear-gradient(90deg, rgba(222, 215, 239, 0) 0%, rgba(222, 215, 239, 0.9) 15%, rgba(222, 215, 239, 0.9) 85%, rgba(222, 215, 239, 0) 100%);
  height: 1px;
`;
