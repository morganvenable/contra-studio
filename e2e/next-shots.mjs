// Review screenshots for the figure-library engine: open a Ready dance with
// ?engine=next, seek to a beat, and save the stage. Starts its own Vite dev
// server unless a base URL is given.
// node e2e/next-shots.mjs <out-dir> <ready id>@<beat>[:name][+dancer] ... [--base <url>]
// "+0" follows dancer 0 (lark 1), so the shot shows where that dancer stands.
import { mkdirSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';

const args = process.argv.slice(2);
const baseAt = args.indexOf('--base');
let base = baseAt >= 0 ? args.splice(baseAt, 2)[1] : undefined;
const [out, ...shots] = args;
if (!out || !shots.length) throw new Error('Usage: next-shots.mjs <out-dir> <id>@<beat>[:name]...');
mkdirSync(out, { recursive: true });

const server = base
  ? undefined
  : await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
if (server) {
  await server.listen();
  base = server.resolvedUrls.local[0];
}
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl'],
});
try {
  for (const shot of shots) {
    const [, id, beat, name, follow] =
      shot.match(/^(\d+)@([\d.]+)(?::([^+]+))?(?:\+(\d+))?$/) ?? [];
    if (!id) throw new Error(`Bad shot "${shot}".`);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}?engine=next&ready=${id}`, { waitUntil: 'networkidle' });
    await expect(page.locator('#beat-slider')).toBeVisible({ timeout: 60000 });
    await page.locator('#beat-slider').fill(beat);
    if (follow) await page.locator('#dancer-select').selectOption(follow);
    // CAMERA=Overhead|Side picks a camera; PATHS=1 draws the paths.
    if (process.env.CAMERA) await page.getByRole('button', { name: process.env.CAMERA }).click();
    if (process.env.PATHS) await page.getByRole('button', { name: 'Paths' }).click();
    // ZOOM=n scrolls the stage in n steps toward the set.
    const stage = page.locator('.viewport').first();
    const box = await stage.boundingBox();
    for (let i = 0; i < Number(process.env.ZOOM ?? 0); i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1500);
    const path = `${out}/${name ?? `${id}-beat-${beat}`}.png`;
    await (process.env.FULL ? page : stage).screenshot({ path });
    if (errors.length) throw new Error(`${id}: ${errors.join('; ')}`);
    console.log(`saved ${path}`);
    await page.close();
  }
} finally {
  await browser.close();
  await server?.close();
}
