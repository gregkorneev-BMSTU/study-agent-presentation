import { chromium, webkit } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';

const port = 4174;
const baseURL = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const failures = [];

try {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(baseURL)).ok) break; } catch {}
    if (server.exitCode !== null) throw new Error(`Preview server exited with ${server.exitCode}`);
    await delay(200);
  }
  browser = await chromium.launch({ headless: true });
  await mkdir('screenshots', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', error => failures.push(`JavaScript: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`Console: ${message.text()}`); });
  page.on('request', request => { if (!request.url().startsWith(baseURL) && !request.url().startsWith('data:')) failures.push(`External request: ${request.url()}`); });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.deck?.isReady());
  const slideCount = await page.locator('.reveal .slides > section').count();
  if (slideCount !== 15) failures.push(`Expected 15 slides, found ${slideCount}`);

  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(180);
    for (let index = 0; index < 15; index++) {
      await page.evaluate(i => window.deck.slide(i, 0, 99), index);
      await page.waitForTimeout(900);
      const state = await page.evaluate(() => {
        const root = document.querySelector('.reveal .slides > section.present');
        const rect = root.getBoundingClientRect();
        const images = [...root.querySelectorAll('img')].map(img => ({ src: img.currentSrc, complete: img.complete && img.naturalWidth > 0 }));
        const overflow = [...root.querySelectorAll('*')].filter(el => {
          const style = getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || el.closest('.notes') || el.matches('script,style,path,defs,marker')) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.left < rect.left - 2 || r.top < rect.top - 2 || r.right > rect.right + 2 || r.bottom > rect.bottom + 2);
        }).map(el => ({ tag: el.tagName, className: typeof el.className === 'string' ? el.className : '', text: el.textContent.trim().slice(0, 40) })).slice(0, 5);
        return { images, overflow, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
      });
      for (const image of state.images) if (!image.complete) failures.push(`Broken image on slide ${index + 1}: ${image.src}`);
      if (state.overflow.length) failures.push(`Possible overflow at ${viewport.width}x${viewport.height}, slide ${index + 1}: ${JSON.stringify(state.overflow)}`);
      if (viewport.width === 1920) {
        await page.screenshot({ path: `screenshots/slide-${index + 1}.png` });
      }
    }
  }

  await page.setViewportSize({ width: 1920, height: 1080 });
  for (let step = 0; step <= 10; step++) {
    await page.evaluate(step => window.deck.slide(3, 0, step - 1), step);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `screenshots/slide-4-step-${String(step).padStart(2, '0')}.png` });
  }

  for (let slide = 0; slide < 15; slide++) {
    await page.evaluate(i => window.deck.slide(i, 0, -1), slide);
    await page.waitForTimeout(350);
    const before = await page.evaluate(() => window.deck.getIndices());
    const fragmentCount = await page.evaluate(i => window.deck.getSlide(i).querySelectorAll('.fragment').length, slide);
    for (let fragment = 0; fragment < fragmentCount; fragment++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(55);
    }
    for (let fragment = 0; fragment < fragmentCount; fragment++) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(55);
    }
    const current = await page.evaluate(() => window.deck.getIndices());
    if (current.h !== before.h || current.v !== before.v || current.f !== before.f) failures.push(`Back-navigation did not restore slide ${slide + 1}: ${JSON.stringify({ before, current })}`);
  }
  for (const slide of [8, 2, 7, 0, 5, 3]) await page.evaluate(i => window.deck.slide(i, 0, -1), slide);
  await page.waitForTimeout(900);
  if (await page.evaluate(() => window.deck.getIndices().h) !== 3) failures.push('Rapid slide switching did not settle on the requested slide');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (!await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)) failures.push('Reduced-motion emulation did not activate');

  const reducedContext = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(baseURL, { waitUntil: 'networkidle' });
  await reducedPage.evaluate(() => window.deck.slide(3, 0, -1));
  await reducedPage.waitForTimeout(350);
  await reducedPage.keyboard.press('ArrowRight');
  const reducedNode = await reducedPage.locator('.arch-node[data-stage="1"]').evaluate(node => ({ opacity: getComputedStyle(node).opacity, visible: getComputedStyle(node).visibility, transform: getComputedStyle(node).transform }));
  if (reducedNode.opacity !== '1' || reducedNode.visible !== 'visible' || reducedNode.transform !== 'matrix(1, 0, 0, 1, 0, 0)') failures.push(`Reduced-motion architecture did not jump to a stable state: ${JSON.stringify(reducedNode)}`);
  await reducedContext.close();

  const popupEvent = page.waitForEvent('popup', { timeout: 3000 }).catch(() => null);
  await page.keyboard.press('s');
  const speaker = await popupEvent;
  if (!speaker) failures.push('Speaker View shortcut did not open a popup');
  else { await speaker.waitForLoadState('domcontentloaded'); await speaker.close(); }

  const safariBrowser = await webkit.launch();
  const safariPage = await safariBrowser.newPage({ viewport: { width: 1920, height: 1080 } });
  safariPage.on('pageerror', error => failures.push(`WebKit JavaScript: ${error.message}`));
  safariPage.on('console', message => { if (message.type() === 'error') failures.push(`WebKit console: ${message.text()}`); });
  safariPage.on('request', request => { if (!request.url().startsWith(baseURL) && !request.url().startsWith('data:')) failures.push(`WebKit external request: ${request.url()}`); });
  await safariPage.goto(baseURL, { waitUntil: 'networkidle' });
  await safariPage.waitForFunction(() => window.deck?.isReady());
  const fallback = await safariPage.locator('.lg-host').first().getAttribute('data-lg-renderer');
  if (fallback !== 'css') failures.push(`WebKit did not select the CSS glass fallback: ${fallback}`);
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
    await safariPage.setViewportSize(viewport);
    for (let index = 0; index < 15; index++) {
      await safariPage.evaluate(i => window.deck.slide(i, 0, 99), index);
      await safariPage.waitForTimeout(400);
      if (!await safariPage.locator('.reveal .slides > section.present').count()) failures.push(`WebKit did not show slide ${index + 1}`);
    }
  }
  await safariPage.setViewportSize({ width: 1920, height: 1080 });
  await safariPage.evaluate(() => window.deck.slide(3, 0, 99));
  await safariPage.waitForTimeout(900);
  await safariPage.screenshot({ path: 'screenshots/webkit-architecture.png' });
  await safariBrowser.close();

  if (failures.length) throw new Error(`Presentation checks failed:\n- ${failures.join('\n- ')}`);
  console.log('Verified 15 slides in Chromium and WebKit at 1280×720, 1920×1080 and 2560×1440; fragment navigation, reduced motion, assets, local requests, overflow, CSS glass fallback and Speaker View passed. Screenshots refreshed.');
} finally {
  await browser?.close();
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}
