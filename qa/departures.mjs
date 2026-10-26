import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const [name, width, height] of [['mobile', 390, 844], ['desktop', 1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(async () => {
      const { PEOPLE, DEATH_YEARS, LEAVE_YEARS } = await import('/src/people.js');
      const scene = window.__interwoven.scene;
      const original = { dot: scene.drawDot, thread: scene.drawThread, labels: scene.drawLabels, text: scene.ctx.fillText };
      let rendered;
      scene.drawDot = function (person, x, y, alpha) { rendered.dots.push({ id: person.id, alpha }); return original.dot.apply(this, arguments); };
      scene.drawThread = function (person) { rendered.threads.push(person.id); return original.thread.apply(this, arguments); };
      scene.drawLabels = function (labels) { rendered.labels.push(...labels.map(label => label.p.id)); return original.labels.apply(this, arguments); };
      scene.ctx.fillText = function (text) { rendered.text.push(text); return original.text.apply(this, arguments); };
      const at = age => { rendered = { age, dots: [], threads: [], labels: [], text: [] }; scene.render(age / 85); return structuredClone(rendered); };
      const cases = [];
      try {
        for (const person of PEOPLE) {
          const end = person.endAge ?? person.leaveAge;
          if (end == null) continue;
          const duration = person.endAge != null ? DEATH_YEARS : LEAVE_YEARS;
          const before = at(end - .1);
          const middle = at(end + duration / 2);
          const after = at(end + duration + .1);
          cases.push({ id: person.id, name: person.name,
            presentBefore: before.dots.some(p => p.id === person.id),
            middleAlpha: middle.dots.find(p => p.id === person.id)?.alpha ?? 0,
            goneAfter: !after.dots.some(p => p.id === person.id) && !after.threads.includes(person.id) && !after.labels.includes(person.id) && !after.text.includes(person.name)
          });
        }
        const ending = at(85);
        at(63); const first = scene.canvas.toDataURL();
        at(3); at(63); const second = scene.canvas.toDataURL();
        return { cases, ending: ending.dots.map(p => p.id), deterministic: first === second };
      } finally {
        scene.drawDot = original.dot; scene.drawThread = original.thread;
        scene.drawLabels = original.labels; scene.ctx.fillText = original.text;
      }
    });
    for (const test of result.cases) {
      assert.ok(test.presentBefore, `${name}: ${test.name} should be present before departure`);
      assert.ok(test.middleAlpha > 0 && test.middleAlpha < 1, `${name}: ${test.name} fades smoothly`);
      assert.ok(test.goneAfter, `${name}: ${test.name} should leave no dot, name, or thread`);
    }
    assert.deepEqual(result.ending.sort(), ['child', 'me', 'partner']);
    assert.ok(result.deterministic);
    await page.evaluate(() => window.__interwoven.seek(63));
    await page.waitForFunction(() => window.__interwoven.progress * 85 > 62.9);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const description = await page.locator('canvas').getAttribute('aria-label');
    for (const name of ['Grandpa', 'Grandma', 'Mom', 'Dad']) assert.ok(!description.includes(name));
    await page.screenshot({ path: `/home/user/qa/${name}-departures-updated.png` });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ layout: name, ...result, errors }, null, 2));
    await page.close();
  }
} finally { await browser.close(); }
