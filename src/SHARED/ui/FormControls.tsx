/**
 * Controles de formulario reutilizables para secciones del panel.
 */
import styled from 'styled-components';

export const FormGrid = styled.form`
  display: grid;
  gap: 12px;
`;

export const Fields = styled.div`
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 6px;
  font-size: 0.88rem;
  color: var(--text-muted);
  font-weight: 600;
`;

export const InputControl = styled.input`
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #ffffff 0%, #f6f9f8 100%);
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
    background: #f2f5f3;
    color: #87948f;
  }
`;

export const TextAreaControl = styled.textarea`
  width: 100%;
  min-height: 92px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #ffffff 0%, #f6f9f8 100%);
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
    background: #f2f5f3;
    color: #87948f;
  }
`;

export const SelectControl = styled.select`
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, #ffffff 0%, #f6f9f8 100%);
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
    background: #f2f5f3;
    color: #87948f;
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
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 700;
  color: #f3fff9;
  background: linear-gradient(125deg, #1e6b54 0%, #2a8a68 100%);
  box-shadow: 0 10px 20px rgba(20, 62, 48, 0.18);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  :hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(20, 62, 48, 0.22);
  }

  :disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const GhostButton = styled.button`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  cursor: pointer;
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.8);
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;

  :hover:not(:disabled) {
    border-color: #c7d6cf;
    background: #ffffff;
    transform: translateY(-1px);
  }

  :disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const DangerButton = styled.button`
  border: 1px solid #e2b4b4;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  cursor: pointer;
  color: #8e2b2b;
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
`;

export const Divider = styled.hr`
  margin: 14px 0;
  border: 0;
  border-top: 1px solid transparent;
  background: linear-gradient(90deg, rgba(219, 228, 223, 0) 0%, rgba(219, 228, 223, 0.9) 15%, rgba(219, 228, 223, 0.9) 85%, rgba(219, 228, 223, 0) 100%);
  height: 1px;
`;
