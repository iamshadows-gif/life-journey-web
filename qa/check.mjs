import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: '/home/user/qa/desktop-00.png' });
for (const age of [12, 23, 37, 60, 85]) {
  await page.evaluate(age => window.__interwoven.seek(age), age);
  await page.waitForFunction(age => Math.abs(window.__interwoven.progress * 85 - age) < .015, age);
  await page.screenshot({ path: `/home/user/qa/desktop-${age}.png` });
}
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(250);
for (const age of [0, 12, 37, 60, 85]) {
  await page.evaluate(age => window.__interwoven.seek(age), age);
  await page.waitForFunction(age => Math.abs(window.__interwoven.progress * 85 - age) < .015, age);
  await page.screenshot({ path: `/home/user/qa/mobile-${age}.png` });
}
const results = await page.evaluate(async () => {
  const app = window.__interwoven;
  app.scene.render(.37);
  const first = document.querySelector('canvas').toDataURL();
  app.scene.render(.81);
  app.scene.render(.37);
  const second = document.querySelector('canvas').toDataURL();
  const durations = [];
  for(let i = 0; i < 80; i++) {
    const start = performance.now(); app.scene.render(i / 85); durations.push(performance.now() - start);
  }
  return { deterministic: first === second, meanRenderMs: durations.reduce((a,b) => a+b, 0) / durations.length,
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    scrollHeight: document.documentElement.scrollHeight,
    dpr: app.scene.dpr,
    soundMuted: document.querySelector('audio').muted,
    canvas: { width: app.scene.w, height: app.scene.h }
  };
});
// Explicit sound interaction exercises the local looping audio resource.
await page.locator('#sound-toggle').click();
await page.waitForTimeout(200);
const sound = await page.locator('#ambient').evaluate(el => ({ paused: el.paused, muted: el.muted, loop: el.loop, error: el.error?.message }));
await page.locator('#sound-toggle').click();
console.log(JSON.stringify({ errors, results, sound }, null, 2));
fs.writeFileSync('/home/user/qa/results.json', JSON.stringify({ errors, results, sound }, null, 2));
await browser.close();
