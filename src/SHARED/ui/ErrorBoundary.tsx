/**
 * ErrorBoundary simple para evitar pantallas en blanco.
 * Muestra un mensaje amigable sin exponer datos sensibles.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import styled from 'styled-components';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

const Fallback = styled.section`
  margin: 24px auto;
  padding: 16px;
  max-width: 720px;
  border-radius: var(--radius-md);
  border: 1px solid #f1b6b6;
  background: #fdecec;
  color: #7d2b2b;
  box-shadow: 0 12px 24px rgba(16, 26, 20, 0.12);

  h2 {
    margin: 0 0 8px;
    font-size: 1.1rem;
  }

  p {
    margin: 0;
    font-size: 0.92rem;
  }
`;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: 'Ocurrio un error inesperado.',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Ocurrio un error inesperado.',
    };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Reservado para reportes internos si se habilitan.
  }

  render() {
    if (this.state.hasError) {
      return (
        <Fallback>
          <h2>Algo salio mal</h2>
          <p>{this.state.message}</p>
        </Fallback>
      );
    }
    return this.props.children;
  }
}
