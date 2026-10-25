/**
 * More row patterns, beside the table in parse.ts: shadows and other
 * relationships, orbit allemandes, long waves danced into the center, more
 * ways of forming and balancing waves, two-hand turns, couples do-si-do,
 * stand still, and the hall and long-lines variants. Same rules as
 * parse.ts: one pattern per wording, names through roles.ts, usual
 * defaults filled in explicitly.
 *
 * Also the trailing notes many rows add after a figure ("allemande right
 * 1½ to face partner", "do si do once back to neighbor"): where a figure
 * ends is its own business, so a note that names no further figure is
 * dropped (dropNotes). Notes that do name one (waves, lines, rings, other
 * figures) are kept, so the row stays unparsed rather than half drawn.
 */
import type { FigureCall } from './figure.ts';

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];

export interface ParseHelpers {
  who(word: string): string;
  amount(word: string | undefined, fallback: number): number;
  call(move: string, beats: number, params: Record<string, unknown>): FigureCall;
  numbers: Readonly<Record<string, number>>;
}

const WHO = '((?:next |new )?\\w+)';
const re = (source: string) => new RegExp(`^${source}$`);
const roleOf = (group: string) => {
  if (group !== 'larks' && group !== 'robins') throw new Error(`"${group}" is not a role.`);
  return group;
};

export function morePatterns(h: ParseHelpers): readonly (readonly [RegExp, Build])[] {
  const { who, amount, call } = h;
  const direction = (word: string) =>
    /^(?:clockwise|cw)$/.test(word) ? 'clockwise' : 'counterclockwise';
  return [
    [/^stand still$/, (_m, b) => [h.call('stand-still', b, {})]],
    [
      // A zero-beat "while:" or "alternate: ..." row only annotates its neighbors.
      /^(?:while:?|alternate: .*)$/,
      (_m, b) => {
        if (b) throw new Error('This row names no figure.');
        return [];
      },
    ],
    [
      re(
        `${WHO} (allemande (left|right)|do si do|see saw) ([^ ]+(?: 1/2)?) while (?:the )?(\\w+) orbit (clockwise|counter ?clockwise|cw|ccw) ([^ ]+)`,
      ),
      (m, b) => {
        const allemande = m[2].startsWith('allemande');
        return [
          call('orbit', b, {
            center: allemande ? 'allemande' : 'do-si-do',
            who: who(m[1]),
            ...(allemande ? { hand: m[3] } : { shoulder: m[2] === 'see saw' ? 'left' : 'right' }),
            amount: amount(m[4], 1),
            direction: direction(m[6]),
            around: amount(m[7], 0.5),
          }),
        ];
      },
    ],
    [
      /^(\w+) (?:dance in to|form) a long wave in the center( - balance the wave)?$/,
      (m, b) => [
        call('center-wave', b, { in: roleOf(who(m[1])), ...(m[2] ? { balance: true } : {}) }),
      ],
    ],
    [
      /^(\w+) dance out while (\w+) dance in to a long wave in the center( - balance the wave)?$/,
      (m, b) => [
        call('center-wave', b, {
          in: roleOf(who(m[2])),
          out: roleOf(who(m[1])),
          ...(m[3] ? { balance: true } : {}),
        }),
      ],
    ],
    [
      re(`${WHO} two[- ]hand turn(?: (clockwise|counterclockwise))?(?: (once|twice|[^ ]+))?`),
      (m, b) => [
        call('two-hand-turn', b, {
          who: who(m[1]),
          amount: amount(m[3], 1),
          ...(m[2] ? { direction: m[2] } : {}),
        }),
      ],
    ],
    [
      re(`${WHO} (?:do si do|see saw) (once|twice|[^ ]+),? as (?:a )?couples?`),
      (m, b) => [call('couples-do-si-do', b, { amount: amount(m[2], 1) })],
    ],
    [
      // The wave forms; "balance the wave" after it, or "& balance", balances it.
      re(
        `form an? (?:(left|right) diagonal )?ocean wave( (?:&|and) balance)? - (\\w+) by (left|right)(?: hands?)? (?:and )?${WHO} by (left|right)(?: hands?)?(,? balance the wave)?`,
      ),
      (m, b) => [
        call('ocean-wave', b, {
          middle: roleOf(who(m[3])),
          middleHand: m[4],
          ends: who(m[5]),
          endHand: m[6],
          ...(m[2] || m[7] ? { balance: true } : {}),
          ...(m[1] ? { diagonal: m[1] } : {}),
        }),
      ],
    ],
    [
      /^balance (?:the )?(?:ocean )?wave(?: of (?:4|four))? (left|right)(?: (?:&|and|then) (?:left|right))?$/,
      (m, b) => [call('balance', b, { formation: 'wave', style: 'right-left', first: m[1] })],
    ],
    [
      /^balance (?:the )?(?:ocean )?wave(?: of (?:4|four))? (?:fwd|forward)(?: (?:&|and) back)?$/,
      (_m, b) => [call('balance', b, { formation: 'wave', style: 'forward-back' })],
    ],
    [
      /^long lines back$/,
      (_m, b) => [call('long-lines', b, { back: true, only: 'back' })],
    ],
    [
      /^forward (?:&|and) back with current neighbors$/,
      (_m, b) => [call('long-lines', b, { back: true })],
    ],
    [/^(down|up) the hall$/, (m, b) => [call('hall', b, { direction: m[1] })]],
    [
      /^up the hall backward$/,
      (_m, b) => [call('hall', b, { direction: 'up', backward: true })],
    ],
    [
      /^down the hall and bend into a ring$/,
      (_m, b) => [call('hall', b, { direction: 'down', end: 'ring' })],
    ],
    [
      /^(\w+) turn alone over their (right|left) shoulders?$/,
      (m, b) => [call('turn-alone', b, { who: roleOf(who(m[1])), over: m[2] })],
    ],
    [
      // "Circle right 4 places and turn alone": the last 2 beats turn alone.
      /^circle (left|right) (\w+) places?,? (?:and )?turn alone$/,
      (m, b) => [
        call('circle', b - 2, { direction: m[1], places: h.numbers[m[2]] ?? Number(m[2]) }),
        call('turn-alone', 2, {}),
      ],
    ],
    [
      /^pass through(?: (across|along) the set)?,? (?:and )?turn alone$/,
      (m, b) => [
        call('pass-through', b - 2, { shoulder: 'right', ...(m[1] ? { axis: m[1] } : {}) }),
        call('turn-alone', 2, {}),
      ],
    ],
  ];
}

/** Notes after a figure that name another figure, and so must be kept. */
const KEEP =
  /wave|line|ring|circle|star|hey|promenade|orbit|while|meanwhile|slide|swing|pass|pull|chain|allemande|do si do|see saw|as (?:a )?couples?|backward|balance|twirl|roll|turn alone|cast|trade|cross|arch|dive|gate|hands|petronella|diagonal|zig|zag|mad robin|figure|gyre|through|split|mirror|basket|ricochet|facing (?:down|up)|face (?:down|up)|\bend\b|or /;

/** A figure, then a note: [figure, note]. */
const CORES: readonly RegExp[] = [
  /^((?:(?:next|new) )?\w+ allemande (?:left|right) (?:once|twice|[^ ,]+(?: 1\/2| and a half)?))([ ,;-].+)$/,
  /^((?:(?:next|new) )?\w+ (?:do si do|see saw) (?:once|twice|[^ ,]+))([ ,;-].+)$/,
  /^((?:(?:next|new) )?\w+ (?:balance (?:&|and) )?(?:long |meltdown )?swing)([ ,;-].+)$/,
  /^((?:(?:next|new) )?\w+ (?:california twirl|box the gnat|swat the flea))([ ,;-].+)$/,
  /^(turn alone)([ ,;-].+)$/,
  /^(long lines forward (?:&|and) back)([ ,;-].+)$/,
  /^((?:down|up) the hall(?: and (?:turn as a couple|turn alone|bend into a ring))?)([ ,;-].+)$/,
];

/** Wording folded to one spelling before the notes come off. */
const MORE_TIDY: readonly (readonly [RegExp, string])[] = [
  [/^_+\s*/, ''],
  [/\*/g, ''],
  [/[,;.]+$/, ''],
  [/\b1\.5\b/g, '1½'],
  [/\bdos-si-do\b|\bdo-si-do\b/g, 'do si do'],
  [/\bsee-saw\b/g, 'see saw'],
  [/^all (california twirl)/, 'partners $1'],
  [/\bjersey twirl\b/, 'california twirl'],
  [/^long lines go back$/, 'long lines back'],
  [/^balance (?:the )?wave - (right|left) then (?:left|right)$/, 'balance the wave $1'],
  [/^balance (?:the )?wave (left|right) (?:&|and) (?:left|right)$/, 'balance the wave $1'],
  // "Ones in the center" says who ends in the middle of the line; geometry decides it.
  [/,? \(?(?:ones|twos|1s|2s|tows) in the (?:center|middle)\)?$/, ''],
  [/^(up the hall and bend into a ring) to face across$/, '$1'],
  // "Neighbors swing, end in a line of four facing down": a swing ending facing down.
  [
    /^([^,]*\bswing)\b(?!.*\b(?:wave|ring|circle|star|through)\b).*?\b(?:fac(?:e|ing)|finish facing) (down|up)\b.*$/,
    '$1, end facing $2',
  ],
  // A trailing ocean-wave balance style ("- right then left", "forward and back").
  [/^(form an? .*ocean wave .*?)\s*-?\s*(?:right then left|forward and back)$/, '$1'],
  [/^(form an? .*ocean wave .*?),? (?:and form |in )short waves$/, '$1'],
];

/** Drop a trailing note that names no further figure. */
export function dropNotes(text: string): string {
  for (const core of CORES) {
    const m = text.match(core);
    if (!m) continue;
    const note = m[2];
    if (/^,? end facing (?:down|up)$/.test(note)) return text;
    return KEEP.test(note) ? text : m[1];
  }
  return text;
}

/** The extra tidying for these patterns: spelling first, then notes. */
export function moreTidy(text: string): string {
  return dropNotes(MORE_TIDY.reduce((t, [pattern, to]) => t.replace(pattern, to), text).trim());
}
