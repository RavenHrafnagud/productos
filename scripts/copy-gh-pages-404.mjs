import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(process.cwd(), 'dist');
const indexHtml = resolve(distDir, 'index.html');
const notFoundHtml = resolve(distDir, '404.html');
const noJekyllFile = resolve(distDir, '.nojekyll');

if (!existsSync(indexHtml)) {
  process.exit(0);
}

copyFileSync(indexHtml, notFoundHtml);
writeFileSync(noJekyllFile, '');
console.log('[postbuild] Copiado dist/index.html -> dist/404.html para GitHub Pages');
console.log('[postbuild] Creado dist/.nojekyll');
