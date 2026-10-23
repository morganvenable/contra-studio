/**
 * Plain-text ContraDB rows -> FigureCalls: one small table of patterns per
 * move with parameters; no per-dance logic. Names go through roles.ts, so
 * stored calls and labels always say larks/robins. Usual defaults are filled in
 * explicitly (Rory spins, passes go by right shoulders) so a reviewer can see
 * and change them in the stored dance.
 */
import type { FigureCall } from './figure.ts';
import { canonical, canonicalText, roleOfGroup } from './roles.ts';

export interface SourceRow {
  readonly section?: string;
  readonly beats: number;
  readonly text: string;
}

const AMOUNTS: Readonly<Record<string, number>> = {
  '¼': 0.25,
  '1/4': 0.25,
  '½': 0.5,
  '1/2': 0.5,
  '¾': 0.75,
  '3/4': 0.75,
  once: 1,
  '1': 1,
  '1¼': 1.25,
  '1 1/4': 1.25,
  '1¾': 1.75,
  '1 3/4': 1.75,
  '1½': 1.5,
  '1 1/2': 1.5,
  'once and a half': 1.5,
  twice: 2,
};
const NUMBERS: Readonly<Record<string, number>> = { one: 1, two: 2, three: 3, four: 4 };

const who = (word: string) => {
  // "next neighbors" are the neighbors after the progression already marked.
  const w = canonical(word.replace(/^(?:next|new) /, ''));
  if (!w) throw new Error(`Unknown dancers "${word}".`);
  return w;
};
const amount = (word: string | undefined, fallback: number) => {
  if (word === undefined) return fallback;
  const a = AMOUNTS[word.trim()];
  if (a === undefined) throw new Error(`Unknown amount "${word}".`);
  return a;
};
const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];
const PATTERNS: readonly (readonly [RegExp, Build])[] = [
  [
    /^slice (left|right)(?: and straight back)?$/,
    (m, b) => [call('slice', b, { direction: m[1], back: 'straight' })],
  ],
  [
    /^pass through(?: (across|along) the set)?(?: (?:by the )?(left|right)(?: shoulders?)?)?$/,
    (m, b) => [
      call('pass-through', b, { shoulder: m[2] ?? 'right', ...(m[1] ? { axis: m[1] } : {}) }),
    ],
  ],
  [
    /^(\w+) allemande (left|right)(?: ([^ ]+(?: 1\/2| and a half)?))?(?: to (?:a )?short waves? with (\w+) in the middle)?$/,
    (m, b) => [
      call('allemande', b, {
        who: who(m[1]),
        hand: m[2],
        amount: amount(m[3], 1),
        ...(m[4] ? { wave: { middle: roleOfGroup(who(m[4])) } } : {}),
      }),
    ],
  ],
  [
    /^balance (?:&|and) rory o'more (left|right)$/,
    (m, b) => [
      call('balance', 4, { formation: 'wave', style: 'right-left', first: m[1] }),
      call('rory', b - 4, { direction: m[1], spin: 'full' }),
    ],
  ],
  [/^rory o'more (left|right)$/, (m, b) => [call('rory', b, { direction: m[1], spin: 'full' })]],
  [
    /^balance(?: the wave)?$/,
    (_m, b) => [call('balance', b, { formation: 'wave', style: 'right-left' })],
  ],
  [
    /^((?:next |new )?\w+) balance (?:&|and) (?:long |meltdown )?swing$/,
    (m, b) => [
      call('balance', 4, { formation: 'pair', who: who(m[1]), hand: 'both' }),
      call('swing', b - 4, { who: who(m[1]) }),
    ],
  ],
  [
    /^((?:next |new )?\w+) (?:long |meltdown )?swing$/,
    (m, b) => [call('swing', b, { who: who(m[1]) })],
  ],
  [/^balance the ring$/, (_m, b) => [call('balance', b, { formation: 'ring' })]],
  [
    /^((?:next |new )?\w+) (?:(right|left) hand )?balance(?: (right|left) hand)?$/,
    (m, b) => [
      call('balance', b, { formation: 'pair', who: who(m[1]), hand: m[2] ?? m[3] ?? 'both' }),
    ],
  ],
  [
    /^star (right|left)(?: - (hands across|wrist grip) -)? (\w+) places?$/,
    (m, b) => [
      call('star', b, {
        hand: m[1],
        places: NUMBERS[m[3]] ?? Number(m[3]),
        grip: m[2] === 'wrist grip' ? 'wrist' : 'hands-across',
      }),
    ],
  ],
  [
    /^(\w+) chain(?: (?:to|with) (?:their |your )?(\w+))?$/,
    (m, b) => {
      const to = m[2] ? who(m[2]) : undefined;
      return [call('chain', b, { who: who(m[1]), ...(to ? { to } : {}) })];
    },
  ],
  [
    /^long lines forward(?: (?:&|and) back)?$/,
    (m, b) => [call('long-lines', b, { back: m[0].includes('back') })],
  ],
  [
    /^((?:next |new )?\w+) (do si do|see saw) (once|twice|[^ ]+)$/,
    (m, b) => [
      call('do-si-do', b, {
        who: who(m[1]),
        amount: amount(m[3], 1),
        shoulder: m[2] === 'see saw' ? 'left' : 'right',
      }),
    ],
  ],
  [/^right left through$/, (_m, b) => [call('right-left-through', b, {})]],
  [
    /^circle (left|right)(?: (\w+) places?| ([^ ]+))?$/,
    (m, b) => {
      if (m[2])
        return [call('circle', b, { direction: m[1], places: NUMBERS[m[2]] ?? Number(m[2]) })];
      return [call('circle', b, { direction: m[1], amount: amount(m[3], 1) })];
    },
  ],
];

/** Lowercase, plain spacing, straight quotes, progression mark removed. */
export function normalizeRow(text: string): { text: string; progression: boolean } {
  const progression = text.includes('⁋');
  const plain = text
    .replace(/⁋/g, '')
    .replace(/[’‘]/g, "'")
    // Reminders to look for new neighbors describe the progression; the
    // progression mark carries it.
    .replace(/\s*\((?:look|with courtesy turn)[^)]*\)/gi, '')
    .replace(/,?\s*(?:and |then )?look (?:for|to) (?:the )?(?:new |next )*\w+(?: new)*(?: neighbors?)?.*$/i, '')
    .replace(/\s+(?:to|and face) (?:new|next) neighbors?$/i, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return { text: plain, progression };
}

/** How a split row names its parts in labels. */
const PART_NAMES: Readonly<Record<string, string>> = { rory: 'slide' };

export function parseRow(row: SourceRow): FigureCall[] {
  const { text, progression } = normalizeRow(row.text);
  for (const [pattern, build] of PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;
    const calls = build(m, row.beats);
    const label = canonicalText(row.text.replace(/⁋/g, '').replace(/\s+/g, ' ').trim());
    return calls.map((c, i) => ({
      ...c,
      text: calls.length > 1 ? `${label} · ${PART_NAMES[c.move] ?? c.move}` : label,
      ...(progression && i === calls.length - 1 ? { progression: true } : {}),
    }));
  }
  throw new Error(`No figure pattern matches "${row.text}".`);
}

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&#39;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};
const decode = (s: string) => s.replace(/&(?:amp|#39|quot|lt|gt|nbsp);/g, (e) => ENTITIES[e]);

/** Rows of a ContraDB dance page: section label, beats and figure text. */
export function contraDbRows(html: string): SourceRow[] {
  const rows: SourceRow[] = [];
  let section: string | undefined;
  for (const tr of html.split(/<tr\b/).slice(1)) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
      decode(m[1].replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim(),
    );
    if (cells.length < 3) continue;
    if (cells[0]) section = cells[0];
    rows.push({ section, beats: Number(cells[1]), text: cells[2] });
  }
  return rows;
}
