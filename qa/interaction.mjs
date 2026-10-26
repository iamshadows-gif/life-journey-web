import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];
for(const [name, options] of [
  ['desktop-retina', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
  ['mobile-retina', { ...devices['iPhone 13'] }],
  ['small-mobile', { viewport: { width: 320, height: 568 }, deviceScaleFactor: 1 }],
  ['reduced-motion', { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', deviceScaleFactor: 3 }],
  ['landscape', { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 }]
]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  const setup = await page.evaluate(() => ({
    progress: window.__interwoven.progress,
    dpr: window.__interwoven.scene.dpr,
    reduced: window.__interwoven.scene.reduced,
    height: document.querySelector('#stage').offsetHeight,
    overflow: document.documentElement.scrollWidth > innerWidth
  }));
  assert.equal(setup.overflow, false, name);
  assert.ok(setup.dpr <= 2, name);
  if (name === 'reduced-motion') assert.ok(setup.reduced);
  await page.evaluate(() => window.__interwoven.seek(60));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `/home/user/qa/${name}-60.png` });
  const deterministic = await page.evaluate(() => {
    const app = window.__interwoven;
    app.render(.7); const first = document.querySelector('canvas').toDataURL();
    app.render(.1); app.render(.7);
    return first === document.querySelector('canvas').toDataURL();
  });
  assert.ok(deterministic, name);
  await page.evaluate(() => window.__interwoven.seek(0));
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.chapter-tick[aria-current="step"]').getAttribute('data-age'), '0');
  await page.screenshot({ path: `/home/user/qa/${name}-00.png` });
  // Chapter controls and restart must work without development hooks.
  await page.locator('[data-age="85"]').click();
  await page.waitForFunction(() => window.__interwoven.progress > .999, { timeout: 8000 });
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.chapter-tick[aria-current="step"]').getAttribute('data-age'), '85');
  assert.equal(await page.locator('#restart').getAttribute('aria-hidden'), 'false');
  await page.screenshot({ path: `/home/user/qa/${name}-85.png` });
  await page.locator('#restart').click();
  await page.waitForFunction(() => window.__interwoven.progress < .001, { timeout: 8000 });
  const perf = await page.evaluate(() => {
    const times = [];
    for(let i = 0; i < 70; i++) {
      const t = performance.now();
      window.__interwoven.render(i / 85);
      times.push(performance.now() - t);
    }
    return { avgMs: times.reduce((a,b) => a+b, 0) / times.length, maxMs: Math.max(...times) };
  });
  results.push({ name, setup, deterministic, perf, errors });
  await context.close();
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
