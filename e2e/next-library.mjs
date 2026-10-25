// End-to-end flow for the full Dance library: open the library, wait for
// every stored ContraDB dance to list, filter by each status, and open an
// "ok", a "check" and a "partial" dance from the list (each plays its first
// beats and renders, a dance that is not ok says why), then open an
// "unsupported" one and a non-Ready dance from ?ready=<id>. No page errors.
// Starts its own Vite dev server.
// node e2e/next-library.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';
import { assertRenderedFrame } from '../scripts/smoke-render-check.mjs';

const index = JSON.parse(readFileSync('public/dances/index.json', 'utf8')).dances;
const first = (status) => index.find((e) => e.status === status);

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl'],
});
let failed = false;
const watch = (page) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || /context lost/i.test(m.text())) errors.push(m.text());
  });
  return errors;
};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = watch(page);
  await page.goto(base, { waitUntil: 'networkidle' });

  for (const status of ['ok', 'check', 'partial']) {
    const entry = first(status);
    await page.getByRole('button', { name: /Dance library/ }).click();
    const list = page.locator('#next-library-list');
    await expect(list.locator('[data-open-dance]').first()).toBeVisible({ timeout: 30000 });
    await page.locator(`[data-status-filter="${status}"]`).click();
    await expect(page.locator(`[data-status-filter="${status}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const badges = await list.locator('.status-badge').allTextContents();
    assert.ok(badges.length > 0, `some ${status} dances list`);
    assert.ok(
      badges.every((b) => b === status),
      `filter ${status} shows only ${status}`,
    );
    // Search narrows to the chosen dance, which opens from its card.
    await page.locator('#library-search').fill(entry.id);
    await list.locator(`[data-open-dance="${entry.id}"]`).click();
    await expect(page.getByRole('heading', { name: entry.title, exact: true })).toBeVisible({
      timeout: 60000,
    });
    const s = await page.evaluate(() => ({
      beats: window.__contra.state.totalBeats,
      figures: window.__contra.state.dance.figures.length,
      warning: window.__contra.state.warnings[0],
    }));
    assert.ok(s.beats > 0 && s.figures > 0, `${entry.title} has a timeline`);
    if (status !== 'ok') assert.equal(s.warning, entry.note, `${entry.title} says what's wrong`);
    if (status !== 'ok') await expect(page.locator('#warning-banner')).toContainText(entry.note);
    for (const beat of ['3', String(Math.floor(s.beats / 2))]) {
      await page.locator('#beat-slider').fill(beat);
      await assertRenderedFrame(page, `${entry.title} beat ${beat}`);
    }
    console.log(`ok - library: filter ${status}, open #${entry.id} ${entry.title}`);
  }
  const box = await page.locator('.viewport').first().boundingBox();
  assert.ok(box && box.width > 400 && box.height > 300, `stage renders (${JSON.stringify(box)})`);
  assert.deepEqual(errors, []);

  // An unsupported dance (when any is left) and the first partial non-Ready
  // dance open from review links.
  for (const entry of [
    first('unsupported'),
    index.find((e) => e.status === 'partial' && e.id !== first('partial').id),
  ].filter(Boolean)) {
    const review = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const reviewErrors = watch(review);
    await review.goto(`${base}?ready=${entry.id}`, { waitUntil: 'networkidle' });
    await expect(review.getByRole('heading', { name: entry.title, exact: true })).toBeVisible({
      timeout: 60000,
    });
    await review.locator('#beat-slider').fill('9');
    await assertRenderedFrame(review, `${entry.title} beat 9`);
    assert.deepEqual(reviewErrors, []);
    await review.close();
    console.log(`ok - ?ready=${entry.id} (${entry.status}) opens with no page errors`);
  }
} catch (error) {
  failed = true;
  console.error('not ok -', error);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
