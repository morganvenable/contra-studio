/**
 * Plain-text ContraDB rows -> FigureCalls: one small table of patterns per
 * move with parameters; no per-dance logic. Names go through roles.ts, so
 * stored calls and labels always say larks/robins. Usual defaults are filled in
 * explicitly (Rory spins, passes go by right shoulders) so a reviewer can see
 * and change them in the stored dance.
 */
import type { FigureCall } from './figure.ts';
import { canonical, canonicalText, roleOfGroup } from './roles.ts';
import { MORE_PATTERNS, qualifiers } from './parse-more.ts';
import { WEAVE_PATTERNS } from './parse-weaves.ts';

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
  // Decimal spellings.
  '0.25': 0.25,
  '0.5': 0.5,
  '0.75': 0.75,
  '1.25': 1.25,
  '1.5': 1.5,
  '1.75': 1.75,
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
/**
 * A long swing is an ordinary swing; a meltdown swing starts with a round.
 * The 1s end their swing in the middle facing down, the way they progress
 * (the 2s up). "End facing down the hall" after a neighbor swing is left to
 * the down-the-hall figure that follows, which turns the lines.
 */
const swingParams = (dancers: string, style: string | undefined) => {
  const w = who(dancers);
  return {
    who: w,
    ...(style?.trim() === 'meltdown' ? { meltdown: true } : {}),
    ...(w === '1s' ? { end: 'down' } : w === '2s' ? { end: 'up' } : {}),
  };
};
const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];
const PATTERNS: readonly (readonly [RegExp, Build])[] = [
  [
    // "long lines slice left & back": the lines slice as couples, as in a slice.
    /^(?:long lines )?slice (left|right)(?: (?:and|&) (?:straight )?back)?$/,
    (m, b) => [call('slice', b, { direction: m[1], back: 'straight' })],
  ],
  [/^slide (left|right) along (?:the )?set$/, (m, b) => [call('slide', b, { direction: m[1] })]],
  [
    /^pass through(?: (across|along) the set)?(?: (?:by the )?(left|right)(?: shoulders?)?)?$/,
    (m, b) => [
      call('pass-through', b, { shoulder: m[2] ?? 'right', ...(m[1] ? { axis: m[1] } : {}) }),
    ],
  ],
  [
    /^((?:next |new )?\w+) allemande (left|right)(?: ([^ ]+(?: 1\/2| and a half)?))?(?: to (?:a )?short waves? with (\w+) in the middle)?$/,
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
    /^balance (?:the )?(?:ocean )?wave(?: of (?:4|four))?$/,
    (_m, b) => [call('balance', b, { formation: 'wave', style: 'right-left' })],
  ],
  [
    // "Form an ocean wave & balance - robins by left hands and neighbors by
    // right hands", and "pass through to an ocean wave ... in the center,
    // ... on the sides": the same wave, walked into.
    /^(?:form an|pass through to an?) ocean wave( (?:&|and) balance)? - (\w+) by (left|right)(?: hands?)?(?: in the (?:center|middle))?,? (?:and )?(neighbors|partners) by (left|right)(?: hands?)?(?: on the (?:sides|ends))?$/,
    (m, b) => [
      call('ocean-wave', b, {
        middle: who(m[2]),
        middleHand: m[3],
        ends: who(m[4]),
        endHand: m[5],
        ...(m[1] ? { balance: true } : {}),
      }),
    ],
  ],
  [/^balance$/, (_m, b) => [call('balance', b, { formation: 'current' })]],
  [
    /^((?:next |new )?\w+) balance (?:&|and) (long |meltdown )?swing(?:,? end facing (?:down|up)(?: the hall)?)?$/,
    (m, b) => [
      call('balance', 4, { formation: 'pair', who: who(m[1]), hand: 'both' }),
      call('swing', b - 4, swingParams(m[1], m[2])),
    ],
  ],
  [
    /^((?:next |new )?\w+) (long |meltdown )?swing(?: - face (?:down|up) to (?:the )?next couple|,? end facing (?:down|up)(?: the hall)?)?$/,
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
    /^(\w+) chain(?: (?:to|with) (?:their |your )?((?:1st |2nd )?[\w ]+?))?$/,
    (m, b) => {
      // Shadows (on a diagonal) are not a relationship the chain checks.
      const named = m[2] && !/shadows?$|trail buddy$/.test(m[2]) ? m[2] : undefined;
      const to = named ? who(named) : undefined;
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
    // A trailing "and neighbors take right hands" is the next figure's hold
    // (the long waves it forms join hands themselves).
    /^(\w+) start a (full|half) hey - (?:(right|left)s in center, (?:right|left)s on ends|(right|left)s on ends, (right|left)s in center)(?: - and (?:next )?\w+ take (?:right|left) hands| (right|left) shoulders?)?$/,
    (m, b) => {
      // A trailing shoulder repeats the first pass's shoulder.
      const first = m[3] ?? m[4];
      if (m[6] && m[6] !== first)
        throw new Error(`The hey's first pass is by the ${first}, not the ${m[6]}.`);
      return [
        call('hey', b, {
          start: who(m[1]),
          amount: m[2] === 'full' ? 1 : 0.5,
          center: m[3] ?? m[5],
        }),
      ];
    },
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
    /^((?:next |new )?\w+) gyre (?:(right|left) shoulders? )?(once|[^ ]+)(?: in the center)?$/,
    (m, b) => [
      call('gyre', b, {
        who: who(m[1]),
        amount: amount(m[3], 1),
        ...(m[2] === 'left' ? { shoulder: 'left' } : {}),
      }),
    ],
  ],
  [
    // A zero-beat row: the box circulate that follows forms the waves itself
    // (its crossers face in), so this row adds no call of its own.
    /^form long waves - (\w+) face in, (\w+) face out(?: .*)?$/,
    () => [],
  ],
  [
    /^balance (?:&|and) box circulate - (\w+) cross while (\w+) loop (right|left)(?: - and \w+ take (?:right|left) hands)?$/,
    (m, b) => [
      call('balance', 4, { formation: 'long-waves', in: who(m[1]) }),
      call('box-circulate', b - 4, { cross: who(m[1]), loop: m[3] }),
    ],
  ],
  [
    // The balance takes 4 beats when it leaves the petronella at least 2; under 6
    // beats the two share the row evenly.
    /^balance (?:&|and) petronella$/,
    (_m, b) => {
      const balance = b >= 6 ? 4 : b / 2;
      return [call('balance', balance, { formation: 'ring' }), call('petronella', b - balance, {})];
    },
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
    (m, b) => [call('hall', b, { direction: 'down', turn: m[1] === 'alone' ? 'alone' : 'couple' })],
  ],
  [
    /^up the hall and bend into a ring$/,
    (_m, b) => [call('hall', b, { direction: 'up', end: 'ring' })],
  ],
  [/^turn alone$/, (_m, b) => [call('turn-alone', b, {})]],
  [
    /^(?:(\w+) )?star promenade (left|right) ([^ ]+)$/,
    (m, b) => [
      call('star-promenade', b, {
        hand: m[2],
        amount: amount(m[3], 0.5),
        ...(m[1] ? { center: who(m[1]) } : {}),
      }),
    ],
  ],
  [/^butterfly whirl$/, (_m, b) => [call('butterfly-whirl', b, {})]],
  [
    /^(half|full|whole) poussette - (\w+) pull (partners|neighbors) back,? (?:and )?then (left|right)$/,
    (m, b) => [
      call('poussette', b, {
        who: who(m[2]),
        pair: who(m[3]),
        then: m[4],
        amount: m[1] === 'half' ? 0.5 : 1,
      }),
    ],
  ],
  [
    // A lead-in: joins the swing in the next row (see joinLeadIns in import.ts).
    /^(\w+) take (partners|neighbors)$/,
    (m, b) => [call('take', b, { who: who(m[1]), whom: who(m[2]) })],
  ],
  [
    /^((?:next |new )?\w+) balance (?:&|and) pull by (right|left)$/,
    (m, b) => {
      // The balance takes 4 beats when it leaves the pull by at least 2; under 6
      // beats the two share the row evenly.
      const balance = b >= 6 ? 4 : b / 2;
      return [
        call('balance', balance, { formation: 'pair', who: who(m[1]), hand: m[2] }),
        call('pass-by', b - balance, { who: who(m[1]), shoulder: m[2], hands: true }),
      ];
    },
  ],
  [
    // "Circle left 3 places and pass through": the last 2 beats pass through.
    /^circle (left|right) (\w+) places?,? (?:and )?pass through(?: (across|along) the set)?$/,
    (m, b) => [
      call('circle', b - 2, { direction: m[1], places: NUMBERS[m[2]] ?? Number(m[2]) }),
      call('pass-through', 2, { shoulder: 'right', ...(m[3] ? { axis: m[3] } : {}) }),
    ],
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
    // "ID next neighbors": identify them; the progression mark carries it.
    .replace(/\s*-\s*id (?:new|next) neighbors?$/i, '')
    // Letting go at the end, and a trailing "+", are styling notes.
    .replace(/\s+(?:and \w+ let go|\+)$/i, '')
    // A row ending in "to" leads into the next row ("ladles do si do once to").
    .replace(/\s+to$/i, '')
    .replace(/\s+(?:to|and face) (?:new|next) neighbors?$/i, '')
    .replace(/\s*(?:[;,]\s*|and )?(?:turn )?to face (?:the )?(?:new|next) neighbors?$/i, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return { text: tidy(plain), progression };
}

/**
 * Wording that names the same call, folded to one spelling (applied after
 * lowercasing). Which neighbors ("next", "2nd") is carried by the
 * progression mark, so the ordinal goes; "around" after an amount and
 * "thru" are spelling.
 */
const TIDY: readonly (readonly [RegExp, string])[] = [
  [/\bthru\b/g, 'through'],
  [/\b(?:1st|2nd|3rd|4th|first|second|third|fourth) (neighbors?)\b/g, '$1'],
  [/(once|twice|¼|½|¾|1¼|1½|1¾|\d\/\d)(?: times)? around\b/g, '$1'],
  [/\s+(?:with )?(?:your |the |this is a |this is your )?(?:new|next) neighbors?$/, ''],
  [/(\bswing),? (?:and )?(?:end )?fac(?:e|ing) (down|up)(?: the hall)?$/, '$1, end facing $2'],
  [/\bright-hand chain\b/, 'chain'],
  [/(\bswing) (?:new|original)(?: neighbors?)?$/, '$1'],
  // Picking up a partner for a star promenade is part of the star promenade.
  [/,? (?:and )?scoop (?:up )?(?:your )?partners?(?: on the side)?$/, ''],
  [/^(butterfly whirl) with (?:your )?partners?(?: on the side)?$/, '$1'],
];
const tidy = (text: string) => TIDY.reduce((t, [re, to]) => t.replace(re, to), text).trim();

/** How a split row names its parts in labels. */
const PART_NAMES: Readonly<Record<string, string>> = {
  rory: 'slide',
  'pass-by': 'pull by',
  'box-circulate': 'box circulate',
  'pass-through': 'pass through',
};

/**
 * "Left diagonal robins chain", "robins allemande right 1½ on the left
 * diagonal": the figure, run on that diagonal (core/diagonal.ts).
 */
function onDiagonal(text: string): { text: string; diagonal?: 'left' | 'right' } {
  const before = text.match(/^(left|right) diagonal (.+)$/);
  if (before) return { text: before[2], diagonal: before[1] as 'left' | 'right' };
  const after = text.match(/^(.+?),? on (?:the )?(?:1\/2 |half[- ])?(left|right) diagonal$/);
  if (after) return { text: after[1], diagonal: after[2] as 'left' | 'right' };
  return { text };
}

export function parseRow(row: SourceRow): FigureCall[] {
  const normal = normalizeRow(row.text);
  const progression = normal.progression;
  const { text: plain, diagonal } = onDiagonal(normal.text);
  // As written first; then with a qualifier ("heads", "middle 4") lifted into `among`.
  const lifted = qualifiers(plain);
  const tries = [{ text: plain, among: undefined as readonly string[] | undefined }];
  if (lifted) tries.push({ text: lifted.text, among: lifted.among });
  // A pattern that matches but cannot build (an unknown dancer name, say)
  // gives later patterns a chance; its reason is kept if none builds.
  let failure: unknown;
  // The contra and formation tables read the row as written and lifted
  // before the weaving table's looser readings (which drop trailing notes).
  const attempts = [coreTable(), WEAVE_PATTERNS].flatMap((table) =>
    tries.map((t) => ({ ...t, table })),
  );
  for (const { text, among, table } of attempts) {
    const found = matchRow(table, text, row.beats, (error) => {
      failure ??= error;
    });
    if (!found) continue;
    const calls = found.map((c) => ({
      ...c,
      params: {
        ...c.params,
        ...(diagonal ? { diagonal } : {}),
        ...(among?.length ? { among } : {}),
      },
    }));
    const label = canonicalText(row.text.replace(/⁋/g, '').replace(/\s+/g, ' ').trim());
    return calls.map((c, i) => ({
      ...c,
      text: calls.length > 1 ? `${label} · ${PART_NAMES[c.move] ?? c.move}` : label,
      ...(progression && i === calls.length - 1 ? { progression: true } : {}),
    }));
  }
  // "A while B": B happens during A's last part, on other dancers.
  const both = splitMeanwhile(row, normal.text);
  if (both) return both;
  if (failure) throw failure;
  throw new Error(`No figure pattern matches "${row.text}".`);
}

/**
 * Contra patterns first, then other formations (parse-more.ts). Read at
 * call time: parse-more.ts and parse.ts import each other.
 */
const coreTable = (): readonly (readonly [RegExp, Build])[] => [...PATTERNS, ...MORE_PATTERNS];

/**
 * The calls the first matching pattern of `table` builds. A pattern whose
 * build throws is reported to `failed` and skipped.
 */
function matchRow(
  table: readonly (readonly [RegExp, Build])[],
  text: string,
  beats: number,
  failed: (error: unknown) => void,
): FigureCall[] | undefined {
  for (const [pattern, build] of table) {
    const m = text.match(pattern);
    if (!m) continue;
    try {
      return build(m, beats);
    } catch (error) {
      failed(error);
    }
  }
  return undefined;
}

/**
 * A row of two figures at once ("balance & centers Rory O'More right while
 * ends turn over right shoulder"): the first figure as usual, its last part
 * run together with the second (figures/meanwhile.ts). Undefined when the
 * row is not of that shape or either part does not read.
 */
function splitMeanwhile(row: SourceRow, text: string): FigureCall[] | undefined {
  const m = text.match(/^(.+?)(?:,? while |,? meanwhile |; meanwhile )(?:the )?(.+)$/);
  if (!m) return undefined;
  let first: FigureCall[];
  try {
    first = parseRow({ ...row, text: m[1] });
  } catch {
    return undefined;
  }
  const last = first.at(-1)!;
  let second: FigureCall[];
  try {
    second = parseRow({ ...row, text: m[2], beats: last.beats });
  } catch {
    return undefined;
  }
  if (second.length !== 1) return undefined;
  const label = canonicalText(row.text.replace(/⁋/g, '').replace(/\s+/g, ' ').trim());
  return [
    ...first.slice(0, -1),
    {
      move: 'meanwhile',
      beats: last.beats,
      params: {
        first: { move: last.move, params: last.params },
        second: { move: second[0].move, params: second[0].params },
      },
      text: first.length > 1 ? last.text : label,
      ...(last.progression ? { progression: true } : {}),
    },
  ];
}

const ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&#39;': "'",
  '&quot;': '"',
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};
export const decodeEntities = (s: string) =>
  s
    .replace(/&(?:amp|#39|quot|lt|gt|nbsp);/g, (e) => ENTITIES[e])
    .replace(/&#(\d+);/g, (_e, n) => String.fromCodePoint(Number(n)));

/** Rows of a ContraDB dance page: section label, beats and figure text. */
export function contraDbRows(html: string): SourceRow[] {
  const rows: SourceRow[] = [];
  let section: string | undefined;
  for (const tr of html.split(/<tr\b/).slice(1)) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
      decodeEntities(m[1].replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim(),
    );
    if (cells.length < 3) continue;
    if (cells[0]) section = cells[0];
    rows.push({ section, beats: Number(cells[1]), text: cells[2] });
  }
  return rows;
}
