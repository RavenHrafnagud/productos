/**
 * Punto de entrada de la aplicacion.
 * Solo monta App y aplica estilos globales.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './APP/App';
import { GlobalStyles } from './APP/styles/GlobalStyles';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalStyles />
    <App />
  </StrictMode>,
);
