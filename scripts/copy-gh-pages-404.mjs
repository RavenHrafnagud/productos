import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const indexHtml = resolve(distDir, 'index.html');
const notFoundHtml = resolve(distDir, '404.html');

if (!existsSync(indexHtml)) {
  process.exit(0);
}

copyFileSync(indexHtml, notFoundHtml);
console.log('[postbuild] Copiado dist/index.html -> dist/404.html para GitHub Pages');
