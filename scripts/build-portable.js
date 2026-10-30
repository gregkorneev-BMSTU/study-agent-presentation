import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });

const mimeTypes = {
  '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp'
};
const assetsDir = join(root, 'public/assets');
async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return nested.flat();
}

const assets = {};
for (const file of await listFiles(assetsDir)) {
  const mime = mimeTypes[extname(file).toLowerCase()];
  if (!mime) continue;
  const name = relative(assetsDir, file).split('\\').join('/');
  assets[name] = `data:${mime};base64,${(await readFile(file)).toString('base64')}`;
}

let html = await readFile(join(root, 'dist/index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
if (scripts.length !== 1) throw new Error(`Expected one bundled script, found ${scripts.length}`);
for (const [, src, tag] of scripts.map(match => [match[0], match[1], match[0]])) {
  if (src.startsWith('http:') || src.startsWith('https:')) throw new Error(`External script found: ${src}`);
  const path = join(root, 'dist', src.replace(/^\//, ''));
  const code = await readFile(path, 'utf8');
  html = html.replace(tag, `<script>window.__PRESENTATION_ASSETS__=${JSON.stringify(assets)};</script><script type="module">${code}</script>`);
}

const styles = [...html.matchAll(/<link\b[^>]*\bhref="([^"]+\.css)"[^>]*>/g)];
for (const match of styles) {
  const [, href] = match;
  if (href.startsWith('http:') || href.startsWith('https:')) throw new Error(`External stylesheet found: ${href}`);
  const path = join(root, 'dist', href.replace(/^\//, ''));
  const css = await readFile(path, 'utf8');
  html = html.replace(match[0], `<style>${css}</style>`);
}
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');

if (/<script\b[^>]*\bsrc=|<link\b[^>]*\bhref="[^"]+\.css"/.test(html)) {
  throw new Error('Output still contains a linked script or stylesheet');
}
const output = join(root, 'study-agent-presentation.html');
await writeFile(output, html);
console.log(`Portable presentation written to ${output}`);
