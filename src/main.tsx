/**
 * Punto de entrada de la aplicacion.
 * Solo monta App y aplica estilos globales.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './APP/App';
import { GlobalStyles } from './APP/styles/GlobalStyles';
import { ErrorBoundary } from './SHARED/ui/ErrorBoundary';

const AppRouter = import.meta.env.PROD ? HashRouter : BrowserRouter;
const routerProps = import.meta.env.PROD ? {} : { basename: import.meta.env.BASE_URL };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalStyles />
    <AppRouter {...routerProps}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </AppRouter>
  </StrictMode>,
);

const bootFallback = document.getElementById('boot-fallback');
if (bootFallback) {
  bootFallback.style.display = 'none';
}
