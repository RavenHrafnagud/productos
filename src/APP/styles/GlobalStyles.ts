/**
 * Estilos globales con variables de tema.
 * Todo el CSS del proyecto pasa por styled-components.
 */
import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    --bg-page: #f2f5f4;
    --bg-panel: #ffffff;
    --bg-panel-soft: #f8fbfa;
    --text-main: #15211d;
    --text-muted: #4f615a;
    --accent-main: #1f7a5a;
    --accent-strong: #0f5a41;
    --accent-warning: #d66c2a;
    --border-soft: #d5e3dd;
    --danger: #b13d3d;
    --radius-lg: 16px;
    --radius-md: 12px;
    --radius-sm: 8px;
    --shadow-soft: 0 14px 45px rgba(8, 33, 23, 0.08);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    margin: 0;
    min-height: 100%;
  }

  body {
    font-family: "Space Grotesk", "Segoe UI", sans-serif;
    color: var(--text-main);
    background:
      radial-gradient(circle at 0% 0%, #d7ece3 0%, transparent 34%),
      radial-gradient(circle at 100% 100%, #ffe7d5 0%, transparent 30%),
      var(--bg-page);
    line-height: 1.45;
  }

  button,
  input {
    font: inherit;
  }
`;
