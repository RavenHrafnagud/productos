/**
 * Estilos globales con variables de tema.
 * Todo el CSS del proyecto pasa por styled-components.
 */
import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    --bg-page: #f4f1eb;
    --bg-panel: #ffffff;
    --bg-panel-soft: #faf7ff;
    --text-main: #1a1f1d;
    --text-muted: #4c5b55;
    --accent-main: #7c43d9;
    --accent-strong: #56269d;
    --accent-warning: #c97a2f;
    --accent-glow: rgba(124, 67, 217, 0.2);
    --border-soft: #ded7ef;
    --danger: #b13d3d;
    --radius-lg: 18px;
    --radius-md: 12px;
    --radius-sm: 8px;
    --shadow-soft: 0 20px 50px rgba(33, 21, 54, 0.13);
    --shadow-lift: 0 10px 24px rgba(38, 24, 64, 0.12);
    --font-body: "Manrope", sans-serif;
    --font-display: "Fraunces", serif;
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
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--text-main);
    background:
      radial-gradient(circle at 12% 10%, rgba(242, 214, 183, 0.55) 0%, transparent 36%),
      radial-gradient(circle at 88% 0%, rgba(194, 168, 235, 0.46) 0%, transparent 40%),
      radial-gradient(circle at 90% 90%, rgba(228, 201, 170, 0.35) 0%, transparent 42%),
      linear-gradient(180deg, #f7f3fb 0%, #f2eef9 55%, #f8f5fc 100%);
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  h1,
  h2,
  h3,
  h4,
  h5 {
    font-family: var(--font-display);
    letter-spacing: -0.01em;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  a {
    color: var(--accent-strong);
    text-decoration: none;
  }

  ::selection {
    background: rgba(124, 67, 217, 0.22);
  }

  @keyframes riseIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }

  @media (max-width: 720px) {
    body {
      font-size: 14.5px;
    }
  }

  @media (max-width: 520px) {
    body {
      font-size: 14px;
    }
  }

  @media (max-width: 430px) {
    body {
      font-size: 13.6px;
    }
  }
`;
