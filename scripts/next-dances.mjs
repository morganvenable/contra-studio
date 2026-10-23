// Shared helpers for the next-engine dance scripts: turn a retained ContraDB
// snapshot into a stored next-engine dance, and check a stored dance the way
// the corpus test does.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contraDbRows, parseRow } from '../src/next/core/parse.ts';

/** ContraDB formation text -> stored formation and progression. */
const FORMATIONS = {
  becket: { formation: 'becket', progression: 'minor-set' },
  improper: { formation: 'improper', progression: 'duple-minor' },
};

/** Usual answers the parser filled in, listed so a reviewer can change them. */
const CHOICES = [
  [
    (c) => c.move === 'rory' && c.params.spin === 'full',
    "Rory O'More spins one full turn in the travel direction (the usual styling).",
  ],
  [
    (c) => c.move === 'balance' && c.params.formation === 'wave' && c.params.first,
    'The balance before each Rory steps toward the slide direction first.',
  ],
  [
    (c) => c.move === 'pass-through' && c.params.shoulder === 'right',
    'Pass through goes by right shoulders.',
  ],
  [
    (c) => c.move === 'pass-through' && !c.params.axis,
    'A pass through from a ring goes along the set, to the dancer on your own side.',
  ],
  [(c) => c.move === 'slice', 'Slice: half the counts on the diagonal, half straight back.'],
  [
    (c) => c.move === 'balance' && c.params.formation === 'pair' && c.params.hand === 'both',
    'A balance with a partner or neighbor holds both hands.',
  ],
  [
    (c) => c.move === 'star' && /star (right|left) \d/i.test(c.text ?? ''),
    'A star with no grip named is drawn hands across.',
  ],
  [
    (c) => c.move === 'swing' && /meltdown|long swing/i.test(c.text ?? ''),
    'Meltdown and long swings are drawn as ordinary swings.',
  ],
];

export function snapshotOf(id) {
  const path = `test-data/contradb/${id}.json`;
  return { path, snapshot: JSON.parse(readFileSync(path, 'utf8')) };
}

/** Build a stored dance, or throw with the first row that does not parse. */
export function buildStored(id) {
  const { path, snapshot } = snapshotOf(id);
  const html = snapshot.html;
  const pick = (re) => (html.match(re)?.[1] ?? '').replace(/&#39;/g, "'").trim();
  const rows = contraDbRows(html);
  const figures = rows.flatMap((row) =>
    parseRow(row).map((c) => ({ section: row.section, ...c })),
  );
  const parts = [];
  for (const row of rows) {
    if (parts.at(-1)?.name !== row.section) parts.push({ name: row.section, bars: 0 });
    parts.at(-1).bars += row.beats / 2;
  }
  const formationText = pick(/formation: ([^<]+)</).toLowerCase();
  const shape = FORMATIONS[formationText];
  if (!shape) throw new Error(`Formation "${formationText}" is not built yet.`);
  const choices = CHOICES.filter(([test]) => figures.some(test)).map(([, text]) => text);
  return {
    schema: 'contra-studio/next-dance',
    version: 1,
    title: pick(/dance-show-title">([^<]+)</),
    author: pick(/choreographers\/\d+">([^<]+)</),
    ...shape,
    music: { meter: '2/4', parts, times: 'repeat' },
    source: {
      url: snapshot.sourceUrl,
      snapshot: path,
      sha256: createHash('sha256').update(html).digest('hex'),
      ...(html.includes('sketchbook') ? { status: 'sketchbook' } : {}),
    },
    choices,
    figures,
  };
}

/** The first row of a snapshot that no pattern parses, or undefined. */
export function firstUnparsed(id) {
  const { snapshot } = snapshotOf(id);
  for (const row of contraDbRows(snapshot.html)) {
    try {
      parseRow(row);
    } catch {
      return row.text;
    }
  }
  return undefined;
}
