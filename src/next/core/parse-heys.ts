/**
 * More hey wordings (parse-weaves.ts reads the usual "robins start a half
 * hey - rights in center, lefts on ends"):
 *
 * - The short forms: "1/2 hey, larks start right shoulder", "half hey,
 *   larks start passing right, partners pass left, robins pass right",
 *   "hey, partners passing left shoulders to start", "robins start 1/2 hey,
 *   passing right shoulders". The passes spelled out after the first are a
 *   reminder; a hey with no size is full in 12 beats or more, else half.
 * - Heys counted in passes: "three-quarters hey" (six passes), "five
 *   changes of a hey" (five), each ending at the next meeting as an "until"
 *   hey does (figures/hey.ts `passes`).
 * - "Until again facing neighbor": until the neighbors meet the second time.
 *   "Until partners meet on the side of the set they started": the second
 *   meeting in a hey of 12 beats or more, else the first.
 *
 * Who starts and the shoulder: a role (or 1s, 2s) passes in the middle by
 * that shoulder; partners or neighbors pass on the ends by it, so the middle
 * passes by the other shoulder.
 */
import type { FigureCall } from './figure.ts';
import { canonical } from './roles.ts';
import { heyRest } from './parse-weaves.ts';

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];

const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});

const MIDDLE = new Set(['larks', 'robins', '1s', '2s']);
const ENDS = new Set(['partner', 'neighbor']);

function starter(word: string): string {
  const w = word.replace(/^(?:next|new|current|same) /, '');
  const c = w === 'ones' ? '1s' : w === 'twos' ? '2s' : canonical(w);
  if (c && (MIDDLE.has(c) || ENDS.has(c))) return c;
  throw new Error(`A hey started by "${word}" is not drawn.`);
}

/** The middle's shoulder, from who starts and the shoulder they start by. */
const centerOf = (start: string, shoulder: string) =>
  MIDDLE.has(start) ? shoulder : shoulder === 'right' ? 'left' : 'right';

const PASSER = '(?:neighbors?|partners?|larks|robins|shadows?|ones|twos|1s|2s|p|n|ot|\\d[lg])';
/** "then partners pass left and then larks right", "partners right, larks left". */
const PASS_LIST = new RegExp(
  `^[\\s,.;-]*(?:(?:and )?then |and )?${PASSER} (?:pass(?:ing)? )?(?:by )?(?:right|left|r|l)(?: shoulders?)?(?=[\\s,.;-]|$)`,
);

const TIMES: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

/**
 * The words after a short-form hey: passes spelled out, "until ...", the
 * looping reminder; ricochets and notes go to heyRest.
 */
function shortRest(rest: string, beats: number) {
  let r = rest.replace(/^[\s,.]*\w+ looping over their (?:right|left) shoulders?/, '');
  for (let m = r.match(PASS_LIST); m; m = r.match(PASS_LIST)) r = r.slice(m[0].length);
  let until: { who: string; time?: number } | undefined;
  r = r
    .replace(/^[\s,.]*until again facing (?:your )?neighbors?\b/, () => {
      until = { who: 'neighbor', time: 2 };
      return '';
    })
    .replace(
      /^[\s,.]*until partners meet(?: (?:again|on (?:the )?side of (?:the )?set they started(?: the dance)?|on (?:their |the )?home sides?))?/,
      (all) => {
        until = { who: 'partner', ...(/again/.test(all) || beats >= 12 ? { time: 2 } : {}) };
        return '';
      },
    )
    .replace(/\b(\w+) immediately ricochet\b/, '$1 ricochet');
  for (let m = r.match(PASS_LIST); m; m = r.match(PASS_LIST)) r = r.slice(m[0].length);
  const ricochet = heyRest(r);
  return { until, ricochet };
}

function shortHey(who: string, shoulder: string, size: string | undefined, rest: string, beats: number) {
  const start = starter(who);
  const { until, ricochet } = shortRest(rest, beats);
  const amount = size ? (/^(?:1\/2|half)$/.test(size) ? 0.5 : 1) : beats >= 12 ? 1 : 0.5;
  return [
    call('hey', beats, {
      start,
      center: centerOf(start, shoulder),
      ...(until ? { until } : { amount }),
      ...(ricochet.length ? { ricochet } : {}),
    }),
  ];
}

export const HEY_PATTERNS: readonly (readonly [RegExp, Build])[] = [
  [
    // "1/2 hey, larks start right shoulder, finish in long waves ...",
    // "half hey, larks start passing right, partners pass left, ...",
    // "with next neighbor, start 1/2 hey robins start passing left
    // shoulders, ...", "1/2 hey starting with larks passing left shoulders",
    // "hey, partners passing left shoulders to start", "1/2 hey, neighbors
    // start left, until again facing neighbor".
    /^(?:with (?:next |new )?neighbors?,? )?(?:start )?(?:(1\/2|half|full|whole) )?hey,? (?:starting with )?((?:next |new )?\w+) (?:start )?(?:passing )?(right|left)(?: shoulders?)?(?: to start)?(.*)$/,
    (m, b) => shortHey(m[2], m[3], m[1], m[4], b),
  ],
  [
    // "robins start 1/2 hey, passing right shoulders. larks immediately ricochet ..."
    /^(\w+) start (?:a )?(1\/2|half|full|whole) hey,? passing (right|left)(?: shoulders?)?(.*)$/,
    (m, b) => shortHey(m[1], m[3], m[2], m[4], b),
  ],
  [
    // "three quarters hey, neighbors passing right", "three-quarters hey
    // larks by left in the center": six passes, ending at the next meeting.
    /^(?:three[- ]quarters?|3\/4|¾) hey,? (\w+) (?:passing |by )(right|left)(?: shoulders?)?(?: in (?:the )?center)?(?: to start)?(.*)$/,
    (m, b) => {
      const start = starter(m[1]);
      const ricochet = heyRest(m[3]);
      return [
        call('hey', b, {
          start,
          center: centerOf(start, m[2]),
          passes: 6,
          ...(ricochet.length ? { ricochet } : {}),
        }),
      ];
    },
  ],
  [
    // "five changes of a hey, larks start passing left until the second
    // time you meet your partner".
    /^(one|two|three|four|five|six|seven|eight) changes of a hey,? (\w+) start (?:passing )?(right|left)(?: shoulders?)?(?:,? until the (first|second|third) time you meet your partner)?(.*)$/,
    (m, b) => {
      const start = starter(m[2]);
      const ricochet = heyRest(m[5]);
      const time = { first: 1, second: 2, third: 3 }[m[4] as 'first'] as number | undefined;
      return [
        call('hey', b, {
          start,
          center: centerOf(start, m[3]),
          ...(time ? { until: { who: 'partner', time } } : { passes: TIMES[m[1]] }),
          ...(ricochet.length ? { ricochet } : {}),
        }),
      ];
    },
  ],
];
