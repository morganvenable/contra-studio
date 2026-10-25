// Checks the live Pages site: dances load, and the feedback box sends.
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'https://morganvenable.github.io/contra-studio/';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
for (const id of [2321, 188, 1383, 3403]) {
  await page.goto(`${base}?ready=${id}`, { waitUntil: 'networkidle' });
  const title = await page.locator('#dance-title').textContent();
  console.log(id, JSON.stringify(title), 'feedback button:', await page.getByRole('button', { name: /^feedback$/i }).count());
}
await page.goto(`${base}?ready=188`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /^feedback$/i }).click();
await page.locator('#feedback-message').fill('Test note from Claude after deploy; please ignore.');
await page.getByRole('button', { name: /^send$/i }).click();
await page.waitForTimeout(4000);
console.log('status:', await page.locator('.feedback-status').textContent());
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
