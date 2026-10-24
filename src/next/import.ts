/**
 * ContraDB snapshot -> stored next-engine dance. Every dance imports, working
 * or not: rows no pattern parses become labeled holds so the timeline keeps
 * its shape, and a formation that is not built yet is recorded as such. The
 * status (ok, check, partial, unsupported) is filled in later by the corpus
 * check (status.ts); the importer only reads the source.
 *
 * Pure: no file or network access, so the app, tests and scripts share it.
 */
import type { Progression } from './core/progression.ts';
import { canonicalText } from './core/roles.ts';
import { contraDbRows, decodeEntities, parseRow } from './core/parse.ts';
import type { StoredCall, StoredDance, UnparsedRow } from './dance.ts';

export interface ContraDbSnapshot {
  readonly sourceUrl: string;
  readonly retrievedAt?: string;
  readonly html: string;
}

export interface ContraDbMeta {
  readonly title: string;
  readonly author: string;
  /** Formation as ContraDB writes it ("improper", "Becket ccw" ...). */
  readonly formation: string;
}

const text = (html: string, re: RegExp) =>
  decodeEntities((html.match(re)?.[1] ?? '').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

export function contraDbMeta(html: string): ContraDbMeta {
  return {
    title: text(html, /dance-show-title">([\s\S]*?)<\/h1>/),
    author: text(html, /dance-show-choreographer">by: ([\s\S]*?)<\/p>/),
    formation: text(html, /dance-show-formation">formation: ([\s\S]*?)<\/p>/),
  };
}

interface Shape {
  readonly formation: string;
  readonly progression: Progression['kind'];
}

/**
 * ContraDB formation text (lowercase, single spaces) -> a built formation.
 * Anything not listed is "unsupported" until its formation is built.
 */
export const FORMATION_TEXT: Readonly<Record<string, Shape>> = {
  improper: { formation: 'improper', progression: 'duple-minor' },
  'duple improper': { formation: 'improper', progression: 'duple-minor' },
  becket: { formation: 'becket', progression: 'minor-set' },
  'becket cw': { formation: 'becket', progression: 'minor-set' },
  'becket clockwise': { formation: 'becket', progression: 'minor-set' },
  'becket ccw': { formation: 'becket-ccw', progression: 'minor-set' },
  'becket counterclockwise': { formation: 'becket-ccw', progression: 'minor-set' },
  'becket counter-clockwise': { formation: 'becket-ccw', progression: 'minor-set' },
};

export function shapeOf(formation: string): Shape | undefined {
  return FORMATION_TEXT[formation.toLowerCase().replace(/\s+/g, ' ').trim()];
}

/** Usual answers the parser filled in, listed so a reviewer can change them. */
const CHOICES: readonly (readonly [(c: StoredCall) => boolean, string])[] = [
  [
    (c) => c.move === 'rory' && c.params.spin === 'full',
    "Rory O'More spins one full turn in the travel direction (the usual styling).",
  ],
  [
    (c) => c.move === 'balance' && c.params.formation === 'wave' && !!c.params.first,
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
    (c) => c.move === 'star' && !c.params.grip,
    'A star with no grip named is a basket star (wrist grip).',
  ],
  [
    (c) => c.move === 'swing' && /long swing/i.test(c.text ?? ''),
    'A long swing is drawn as an ordinary swing.',
  ],
  [
    (c) => c.move === 'swing' && !!c.params.meltdown && c.beats >= 12,
    'A meltdown swing starts with 4 beats of right-shoulder round, then swings.',
  ],
  [
    (c) => c.move === 'swing' && !!c.params.meltdown && c.beats < 12,
    'A meltdown swing shorter than 12 beats spends a third of it in the right-shoulder round.',
  ],
  [
    (c) => c.move === 'pass-by' && /^square through/i.test(c.text ?? ''),
    'Square through: each balance takes 4 beats and each pull by 2.',
  ],
  [
    (c) => c.move === 'give-and-take',
    'Give & take: half the beats to cross, half to back home holding both hands.',
  ],
  [
    (c) => c.move === 'gyre' && !c.params.shoulder,
    'A gyre goes by the right shoulder, facing each other, with no hands.',
  ],
  [
    (c) => c.move === 'box-circulate',
    'Long waves form during the balance before each box circulate: crossers face in, loopers face out; hands join only where they reach.',
  ],
  [
    (c) => c.move === 'slice' && /long lines slice/i.test(c.text ?? ''),
    'Long lines slice left & back is drawn as a slice: couples step diagonally left, then straight back.',
  ],
  [
    (c) => c.move === 'hey' && /take (?:right|left) hands/i.test(c.text ?? ''),
    'Taking hands at the end of a hey is left to the long waves that follow.',
  ],
  [
    (c) => c.move === 'swing' && c.params.end === 'down',
    'The 1s end their swing side by side in the middle of the set facing down, the way they progress.',
  ],
  [
    (c) => c.move === 'swing' && /end facing down/i.test(c.text ?? ''),
    'A swing that ends facing down the hall is drawn ending facing across; the down the hall that follows turns the lines.',
  ],
];

/**
 * Import one snapshot. `sha256` is the hex hash of `snapshot.html` (the
 * caller hashes; this module stays free of Node APIs).
 */
export function importDance(id: string, snapshot: ContraDbSnapshot, sha256: string): StoredDance {
  const html = snapshot.html;
  const meta = contraDbMeta(html);
  const shape = shapeOf(meta.formation);
  const rows = contraDbRows(html);
  const figures: StoredCall[] = [];
  const unparsed: UnparsedRow[] = [];
  const parts: { name: string; bars: number }[] = [];
  rows.forEach((row, i) => {
    const number = i + 1;
    const beats = Number.isFinite(row.beats) && row.beats > 0 ? row.beats : 0;
    const name = row.section ?? 'A1';
    if (parts.at(-1)?.name !== name) parts.push({ name, bars: 0 });
    parts.at(-1)!.bars += beats / 2;
    const label = canonicalText(row.text.replace(/⁋/g, '').replace(/\s+/g, ' ').trim());
    try {
      if (!beats && row.beats !== 0) throw new Error('The row has no beat count.');
      const calls = parseRow({ ...row, beats });
      if (calls.some((c) => !(c.beats > 0)))
        throw new Error(`${beats} beats is too short for this row's parts.`);
      for (const c of calls) figures.push({ ...c, section: row.section, row: number });
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error);
      unparsed.push({ row: number, text: label, why });
      if (beats > 0)
        figures.push({
          move: 'hold',
          beats,
          params: { reason: 'unparsed' },
          text: label,
          section: row.section,
          row: number,
          ...(row.text.includes('⁋') ? { progression: true } : {}),
        });
    }
  });
  const choices = CHOICES.filter(([test]) => figures.some(test)).map(([, t]) => t);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id,
    title: meta.title,
    author: meta.author,
    formation: shape?.formation ?? null,
    progression: shape?.progression ?? null,
    music: { meter: '2/4', parts, times: 'repeat' },
    source: {
      url: snapshot.sourceUrl,
      formation: meta.formation,
      ...(snapshot.retrievedAt ? { retrievedAt: snapshot.retrievedAt } : {}),
      sha256,
      ...(html.includes('sketchbook') ? { status: 'sketchbook' } : {}),
    },
    status: 'unchecked',
    problems: [],
    unparsed,
    choices,
    figures,
  };
}
