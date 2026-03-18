/**
 * Punto de entrada de la aplicacion.
 * Solo monta App y aplica estilos globales.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './APP/App';
import { GlobalStyles } from './APP/styles/GlobalStyles';
import { ErrorBoundary } from './SHARED/ui/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalStyles />
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);

const bootFallback = document.getElementById('boot-fallback');
if (bootFallback) {
  bootFallback.style.display = 'none';
}
