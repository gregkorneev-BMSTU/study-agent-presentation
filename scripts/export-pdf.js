import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { access, readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

const port = 4173;
const url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  stdio: 'ignore',
  env: process.env,
});
let browser;

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Preview server exited with code ${server.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Preview server did not become ready at ${url} within 30 seconds`);
}

try {
  await waitForServer();
  const executablePath = process.env.CHROMIUM_PATH;
  if (executablePath) await access(executablePath);
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(`${url}/?print-pdf`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('.reveal .slides > section, .reveal .slides > .pdf-page').length === 15 && document.querySelector('.reveal.ready'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    document.querySelector('.library-interface')?.classList.add('is-expanded');
    const caption = document.querySelector('.arch-step-label');
    if (caption) caption.textContent = 'Ответ сопровождается ссылками на найденные источники';
    window.deck?.layout();
  });
  await page.addStyleTag({ content: `
    @media print {
      html.print-pdf .reveal-viewport,
      html.print-pdf .reveal { background: #e5e6e1 !important; }
      html.print-pdf .reveal .slides section {
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 1122px !important;
        padding: 72px 100px !important;
        background: #e5e6e1 !important;
      }
      html.print-pdf .cover-content > * {
        opacity: 1 !important;
        visibility: visible !important;
        transform: none !important;
      }
      html.print-pdf .reveal h2 {
        color: #20211f !important;
        font-size: 72px !important;
        line-height: 1.03 !important;
        letter-spacing: -.055em !important;
      }
      html.print-pdf .reveal .slides section.dark-slide { background: #1c1c1e !important; }
      html.print-pdf .reveal .slides section.dark-slide h2 { color: #f5f5f5 !important; letter-spacing: .03em !important; font-kerning: none !important; }
    }
  ` });
  await page.pdf({
    path: 'study-agent-presentation.pdf',
    width: '1920px',
    height: '1080px',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });
  const pdf = await PDFDocument.load(await readFile('study-agent-presentation.pdf'));
  const pages = pdf.getPageCount();
  if (pages !== 15) throw new Error(`Expected 15 PDF pages, got ${pages}`);
  console.log(`Exported study-agent-presentation.pdf (${pages} pages)`);
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}
