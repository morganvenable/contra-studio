// Copy check: walks the dance view, Source & notes, the library, Import,
// How it works and the Timing lab, and fails if any removed tagline,
// disclaimer or parenthetical comes back. Starts its own Vite dev server.
// node e2e/ui-copy.mjs
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const banned = [
  /caller’s workspace/i, /made clear/i, /the choreography/i, /articulated movement/i,
  /find your next dance/i, /quick walkthrough/i, /every side/i, /whole picture/i,
  /person’s story/i, /then rehearse/i, /bring a dance to life/i, /meaning clear/i,
  /tiny dancers/i, /schematic/i, /inspect before teaching/i, /reusable function/i,
  /see notes\)/i, /with \d+ couples\)/i, /model warnings/i, /what the model/i,
  /designed this way/i, /invented movement/i, /uniquely valid/i, /physically validated/i,
  /one shared clock/i, /shape of the set/i, /\(optional\)/i, /gents on right/i,
];

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl'] });
let failed = false;
const check = async (page, label) => {
  const text = await page.evaluate(() => document.body.innerText);
  const hits = banned.filter((re) => re.test(text)).map((re) => { const m = text.match(re); return JSON.stringify(text.slice(Math.max(0, m.index - 60), m.index + 60)); });
  console.log(`${hits.length ? 'not ok' : 'ok'} - ${label}${hits.length ? `: ${hits.join(', ')}` : ''}`);
  if (hits.length) failed = true;
};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const id of [26, 3403, 1634, "2321&engine=old", "1502&engine=old"]) {
    await page.goto(`${base}?ready=${id}`, { waitUntil: 'networkidle' });
    await check(page, `dance ${id}`);
    await page.getByRole('button', { name: /Source & notes/ }).click();
    await check(page, `dance ${id} source & notes`);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: /Dance library/ }).first().click();
  await check(page, 'library');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'How it works' }).click();
  await check(page, 'how it works');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Import dance/ }).click();
  await check(page, 'import');
  await page.goto(`${base}timing-lab.html`, { waitUntil: 'networkidle' });
  await check(page, 'timing lab');
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
