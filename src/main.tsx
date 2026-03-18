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

// Overlay de errores para depurar en dispositivos moviles (solo dev).
function mountDevErrorOverlay() {
  if (!import.meta.env.DEV) return;
  if (document.getElementById('dev-error-overlay')) return;

  let handling = false;
  const overlay = document.createElement('div');
  overlay.id = 'dev-error-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '12px';
  overlay.style.zIndex = '9999';
  overlay.style.padding = '10px 12px';
  overlay.style.background = 'rgba(15, 22, 19, 0.92)';
  overlay.style.color = '#f9f3ea';
  overlay.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  overlay.style.borderRadius = '12px';
  overlay.style.fontSize = '12px';
  overlay.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  overlay.style.display = 'none';
  overlay.style.overflow = 'auto';
  overlay.style.maxHeight = '60vh';
  overlay.style.whiteSpace = 'pre-wrap';
  overlay.style.boxShadow = '0 16px 30px rgba(0, 0, 0, 0.35)';
  overlay.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  document.body.appendChild(overlay);

  const show = (title: string, message: string, meta?: string) => {
    overlay.textContent = `[DEV ERROR] ${title}\n\n${message}${meta ? `\n\n${meta}` : ''}\n\n(Toca para cerrar)`;
    overlay.style.display = 'block';
  };

  window.addEventListener('error', (event) => {
    if (handling) return;
    handling = true;
    const message = event.message ?? 'Error desconocido';
    const meta = event.filename ? `Archivo: ${event.filename}\nLinea: ${event.lineno ?? '-'} Col: ${event.colno ?? '-'}` : '';
    show('window.error', String(message), meta);
    handling = false;
  });

  window.onerror = function (message, source, lineno, colno, error) {
    if (handling) return false;
    handling = true;
    const meta = source ? `Archivo: ${source}\nLinea: ${lineno ?? '-'} Col: ${colno ?? '-'}` : '';
    const detail = message ?? 'Error desconocido';
    show('window.onerror', String(detail), meta);
    handling = false;
    return false;
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (handling) return;
    handling = true;
    const reason = (event as PromiseRejectionEvent).reason;
    const message = String(reason ?? 'Rechazo desconocido');
    show('unhandledrejection', message);
    handling = false;
  });
}

mountDevErrorOverlay();

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
