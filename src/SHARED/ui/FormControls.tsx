/**
 * Controles de formulario reutilizables para secciones del panel.
 */
import styled from 'styled-components';

export const FormGrid = styled.form`
  display: grid;
  gap: 10px;
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
`;

export const InputControl = styled.input`
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--text-main);
  padding: 10px 11px;
  outline: none;

  :focus {
    border-color: var(--accent-main);
    box-shadow: 0 0 0 3px rgba(31, 122, 90, 0.14);
  }
`;

export const TextAreaControl = styled.textarea`
  width: 100%;
  min-height: 92px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--text-main);
  padding: 10px 11px;
  resize: vertical;
  outline: none;

  :focus {
    border-color: var(--accent-main);
    box-shadow: 0 0 0 3px rgba(31, 122, 90, 0.14);
  }
`;

export const SelectControl = styled.select`
  width: 100%;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: #fff;
  color: var(--text-main);
  padding: 10px 11px;
  outline: none;

  :focus {
    border-color: var(--accent-main);
    box-shadow: 0 0 0 3px rgba(31, 122, 90, 0.14);
  }
`;

export const ButtonsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const PrimaryButton = styled.button`
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 700;
  color: #f3fff9;
  background: linear-gradient(125deg, #1e6d50 0%, #298562 100%);

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
  background: #fff;

  :disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Divider = styled.hr`
  margin: 14px 0;
  border: 0;
  border-top: 1px solid var(--border-soft);
`;
