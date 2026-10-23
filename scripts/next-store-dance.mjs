// Parse a retained ContraDB snapshot into a stored next-engine dance.
// node --experimental-strip-types scripts/next-store-dance.mjs 2321
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contraDbRows, parseRow } from '../src/next/core/parse.ts';

const id = process.argv[2];
if (!/^\d+$/.test(id ?? '')) throw new Error('Usage: next-store-dance.mjs <contradb id>');
const snapshotPath = `test-data/contradb/${id}.json`;
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
const html = snapshot.html;
const pick = (re) => (html.match(re)?.[1] ?? '').replace(/&#39;/g, "'").trim();
const figures = contraDbRows(html).flatMap((row) =>
  parseRow(row).map((c) => ({ section: row.section, ...c })),
);
// Parts from the row sections; contra rows count beats of 2/4 (two per bar).
const parts = [];
for (const row of contraDbRows(html)) {
  if (parts.at(-1)?.name !== row.section) parts.push({ name: row.section, bars: 0 });
  parts.at(-1).bars += row.beats / 2;
}
const formation = pick(/formation: ([^<]+)</).toLowerCase();
const out = {
  schema: 'contra-studio/next-dance',
  version: 1,
  title: pick(/dance-show-title">([^<]+)</),
  author: pick(/choreographers\/\d+">([^<]+)</),
  formation,
  progression: 'minor-set',
  music: { meter: '2/4', parts, times: 'repeat' },
  source: {
    url: snapshot.sourceUrl,
    snapshot: snapshotPath,
    sha256: createHash('sha256').update(html).digest('hex'),
    ...(html.includes('sketchbook') ? { status: 'sketchbook' } : {}),
  },
  choices: process.argv.slice(3),
  figures,
};
writeFileSync(`src/next/dances/${id}.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote src/next/dances/${id}.json with ${figures.length} figure calls.`);
