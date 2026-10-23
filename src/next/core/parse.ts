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
/** A long swing is an ordinary swing; a meltdown swing starts with a round. */
const swingParams = (dancers: string, style: string | undefined) => ({
  who: who(dancers),
  ...(style?.trim() === 'meltdown' ? { meltdown: true } : {}),
});
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
    /^balance the wave$/,
    (_m, b) => [call('balance', b, { formation: 'wave', style: 'right-left' })],
  ],
  [/^balance$/, (_m, b) => [call('balance', b, { formation: 'current' })]],
  [
    /^((?:next |new )?\w+) balance (?:&|and) (long |meltdown )?swing$/,
    (m, b) => [
      call('balance', 4, { formation: 'pair', who: who(m[1]), hand: 'both' }),
      call('swing', b - 4, swingParams(m[1], m[2])),
    ],
  ],
  [
    /^((?:next |new )?\w+) (long |meltdown )?swing$/,
    (m, b) => [call('swing', b, swingParams(m[1], m[2]))],
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
        // No grip named: the figure's default grip (a basket star).
        ...(m[2] ? { grip: m[2] === 'wrist grip' ? 'wrist' : 'hands-across' } : {}),
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
    /^((?:next |new )?\w+) (pass|pull) by (right|left)(?: shoulders?)?$/,
    (m, b) => [call('pass-by', b, { who: who(m[1]), shoulder: m[3], hands: m[2] === 'pull' })],
  ],
  [
    /^(\w+) roll away (\w+) with a half sashay(?: roll (?:left to right|right to left))?$/,
    (m, b) => [call('roll-away', b, { who: who(m[1]), whom: who(m[2]) })],
  ],
  [
    /^(\w+) start a (full|half) hey - (?:(right|left)s in center, (?:right|left)s on ends|(right|left)s on ends, (right|left)s in center)$/,
    (m, b) => [
      call('hey', b, {
        start: who(m[1]),
        amount: m[2] === 'full' ? 1 : 0.5,
        center: m[3] ?? m[5],
      }),
    ],
  ],
  [
    // Square through: balance the first, pull by them, turn to the next and
    // pull by; "four" does it twice. Each half: 4 beats balance, 2 + 2 pulling.
    /^square through (two|four) - (\w+) balance (?:&|and) pull by (right|left), then (\w+) pull by (right|left)(?:, then repeat)?$/,
    (m, b) => {
      const times = m[1] === 'four' ? 2 : 1;
      if (b !== 8 * times) throw new Error(`Square through ${m[1]} takes ${8 * times} beats.`);
      return Array.from({ length: times }, () => [
        call('balance', 4, { formation: 'pair', who: who(m[2]), hand: m[3] }),
        call('pass-by', 2, { who: who(m[2]), shoulder: m[3], hands: true }),
        call('pass-by', 2, { who: who(m[4]), shoulder: m[5], hands: true }),
      ]).flat();
    },
  ],
  [
    /^(\w+) give (?:&|and) take (\w+)$/,
    (m, b) => [call('give-and-take', b, { who: who(m[1]), whom: who(m[2]) })],
  ],
  [
    /^mad robin, (\w+) in front(?: (cw|ccw))?$/,
    (m, b) => [
      call('mad-robin', b, {
        front: who(m[1]),
        ...(m[2] ? { direction: m[2] === 'cw' ? 'clockwise' : 'counterclockwise' } : {}),
      }),
    ],
  ],
  [
    /^((?:next |new )?\w+) gyre (once|[^ ]+)(?: in the center)?$/,
    (m, b) => [call('gyre', b, { who: who(m[1]), amount: amount(m[2], 1) })],
  ],
  [
    /^balance (?:&|and) petronella$/,
    (_m, b) => [call('balance', 4, { formation: 'ring' }), call('petronella', b - 4, {})],
  ],
  [
    /^((?:next |new )?\w+) (?:(right|left) hand )?balance (?:&|and) (box the gnat|swat the flea)$/,
    (m, b) => {
      const style = m[3] === 'box the gnat' ? 'box-the-gnat' : 'swat-the-flea';
      const hand = m[2] ?? (style === 'box-the-gnat' ? 'right' : 'left');
      return [
        call('balance', 4, { formation: 'pair', who: who(m[1]), hand }),
        call('twirl', b - 4, { style, who: who(m[1]) }),
      ];
    },
  ],
  [
    /^((?:next |new )?\w+) (box the gnat|swat the flea|california twirl)$/,
    (m, b) => {
      const styles: Record<string, string> = {
        'box the gnat': 'box-the-gnat',
        'swat the flea': 'swat-the-flea',
        'california twirl': 'california',
      };
      return [call('twirl', b, { style: styles[m[2]], who: who(m[1]) })];
    },
  ],
  [
    /^((?:next |new )?\w+) promenade(?: across(?: the set)?)?$/,
    (m, b) => [call('promenade', b, { who: who(m[1]) })],
  ],
  [
    /^down the hall and turn (as a couple|alone)$/,
    (m, b) => [
      call('hall', b, { direction: 'down', turn: m[1] === 'alone' ? 'alone' : 'couple' }),
    ],
  ],
  [
    /^up the hall and bend into a ring$/,
    (_m, b) => [call('hall', b, { direction: 'up', end: 'ring' })],
  ],
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
    .trim()
    .replace(/[’‘]/g, "'")
    // Reminders to look for new neighbors describe the progression; the
    // progression mark carries it.
    .replace(/\s*\((?:look|with courtesy turn)[^)]*\)/gi, '')
    .replace(/(?:,\s*(?:\w+ )?|\s+(?:and |then )?)look (?:for|to) .*$/i, '')
    // Letting go at the end, and a trailing "+", are styling notes.
    .replace(/\s+(?:and \w+ let go|\+)$/i, '')
    .replace(/\s+(?:to|and face) (?:new|next) neighbors?$/i, '')
    .replace(/\s*(?:[;,]\s*|and )?(?:turn )?to face (?:the )?(?:new|next) neighbors?$/i, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return { text: plain, progression };
}

/** How a split row names its parts in labels. */
const PART_NAMES: Readonly<Record<string, string>> = { rory: 'slide', 'pass-by': 'pull by' };

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
