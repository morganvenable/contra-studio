// End-to-end flow for the figure-library engine: open the app with
// ?engine=next, load Debra's Dance from the Dance library, play a few
// seconds, seek into the Rory O'More, and check the stage renders with no
// page errors; then open recomposed Ready dances from review links (down the
// hall, petronella, a meltdown swing, a hey). Starts its own Vite dev server.
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

  // Two recomposed Ready dances open straight from a review link.
  const recomposed = [
    { id: '123', title: 'Pizza Shop', figures: 8, seek: ['36', '44'], activity: 'hall-travel' },
    {
      id: '1547',
      title: 'Jump Back Barley',
      figures: 11,
      seek: ['6', '61'],
      activity: 'petronella',
    },
    // A meltdown swing: a right-shoulder round (no hands) melting into the swing frame.
    {
      id: '188',
      title: 'Cascades',
      figures: 8,
      seek: ['2.5', '10'],
      activity: 'swing',
      frames: [
        { beat: 2.5, frame: false },
        { beat: 10, frame: true },
      ],
    },
    // A hey across the set (robins start, full hey) in a Becket dance.
    { id: '1658', title: "Bev's Becket A", figures: 7, seek: ['18.5', '24'], activity: 'hey' },
  ];
  for (const dance of recomposed) {
    const review = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const reviewErrors = [];
    review.on('pageerror', (e) => reviewErrors.push(e.message));
    review.on('console', (m) => {
      if (m.type() === 'error') reviewErrors.push(m.text());
    });
    await review.goto(`${base}?engine=next&ready=${dance.id}`, { waitUntil: 'networkidle' });
    await expect(review.getByRole('heading', { name: dance.title, exact: true })).toBeVisible({
      timeout: 60000,
    });
    const loaded = await review.evaluate(() => ({
      figures: window.__contra.state.dance.figures.length,
      beats: window.__contra.state.totalBeats,
    }));
    assert.equal(loaded.figures, dance.figures, `${dance.title} uses the next engine's calls`);
    assert.equal(loaded.beats, 64);
    for (const beat of dance.seek) {
      await review.locator('#beat-slider').fill(beat);
      await assertRenderedFrame(review, `${dance.title} beat ${beat}`);
    }
    const activity = await review.evaluate(
      (b) => window.__contra.sample(b).poses[0].activity,
      Number(dance.seek[1]),
    );
    assert.equal(activity, dance.activity, `${dance.title} at beat ${dance.seek[1]}`);
    for (const { beat, frame } of dance.frames ?? []) {
      const held = await review.evaluate(
        (b) =>
          window.__contra
            .sample(b)
            .contacts.some((c) => c.kind === 'swing-frame' && c.strength > 0.5),
        beat,
      );
      assert.equal(held, frame, `${dance.title} swing frame at beat ${beat}`);
    }
    assert.deepEqual(reviewErrors, []);
    await review.close();
    console.log(`ok - ${dance.title} (${dance.id}) opens on the next engine from ?ready=`);
  }
} catch (error) {
  failed = true;
  console.error('not ok -', error);
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
