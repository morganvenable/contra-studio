// End-to-end flow for the figure-library engine: open the app with
// ?engine=next, load Debra's Dance from the Dance library, play a few
// seconds, seek into the Rory O'More, and check the stage renders with no
// page errors. Starts its own Vite dev server.
// node e2e/next-engine.mjs
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
import { assertRenderedFrame } from '../scripts/smoke-render-check.mjs';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl'],
});
let failed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || /context lost/i.test(m.text())) errors.push(m.text());
  });
  await page.goto(`${base}?engine=next`, { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: /Dance library/ }).click();
  await page.locator('[data-open-reviewed="2321"]').click();
  await expect(page.getByRole('heading', { name: "Debra's Dance", exact: true })).toBeVisible({
    timeout: 60000,
  });

  const engine = await page.evaluate(() => {
    const s = window.__contra.state;
    return {
      figures: s.dance.figures.length,
      first: s.dance.figures[3].label,
      beats: s.totalBeats,
    };
  });
  assert.equal(engine.figures, 11, 'the next engine splits balance & Rory into two calls');
  assert.match(engine.first, /Rory/);
  assert.equal(engine.beats, 64);

  await page.locator('[data-action="play"]').click();
  await page.waitForTimeout(3000);
  await page.locator('[data-action="play"]').click();
  const played = await page.evaluate(() => window.__contra.state.beat);
  assert.ok(played > 1, `playback advanced (beat ${played})`);

  // Into the Rory O'More right slide (beats 20-24) and the left one.
  for (const beat of ['21.5', '22', '29']) {
    await page.locator('#beat-slider').fill(beat);
    await assertRenderedFrame(page, `beat ${beat}`);
  }
  const frame = await page.evaluate(() => window.__contra.sample(22));
  assert.equal(frame.poses[0].activity, 'balance-rory-slide');

  // Layout: the stage fills a real area of the page.
  const box = await page.locator('.viewport').first().boundingBox();
  assert.ok(box && box.width > 400 && box.height > 300, `stage renders (${JSON.stringify(box)})`);
  await page.screenshot({ path: 'e2e/next-engine.png' });
  assert.deepEqual(errors, []);
  console.log(
    'ok - next engine flow: library load, play, seek into Rory, stage renders, no page errors',
  );
} catch (error) {
  failed = true;
  console.error('not ok -', error);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
