/**
 * Row patterns beyond contra duple minor: formation-specific and ECD
 * figures, in one table per area so each grows on its own:
 *
 * - parse-sets.ts: four face four, Sicilian circles, lines of three.
 * - parse-ring.ts: circle mixers, big circles.
 * - parse-square.ts: squares (heads, sides, corners, promenade home).
 * - parse-ecd.ts: triplets and other ECD-style whole sets (casts, contra
 *   corners, arches, sashays ...).
 *
 * Who dances a figure is often named as a qualifier ("star right 4 places
 * (heads)", "middle 4 star right", "ones and twos circle left"). The parser
 * first tries a row as written; if nothing matches, it lifts the qualifier
 * into the call's `among` (layout.ts) and tries again.
 */
import type { FigureCall } from './figure.ts';
import { ECD_PATTERNS } from './parse-ecd.ts';
import { RING_PATTERNS } from './parse-ring.ts';
import { SETS_PATTERNS } from './parse-sets.ts';
import { SQUARE_PATTERNS } from './parse-square.ts';
import { GROUPS_PATTERNS } from './parse-groups.ts';

export type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];
export type Pattern = readonly [RegExp, Build];

export const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});

/** Qualifier phrases and who they name; [] names everyone (all eight, hands six). */
const QUALIFIERS: readonly (readonly [string, readonly string[]])[] = [
  ['head couples', ['heads']],
  ['side couples', ['sides']],
  ['heads only', ['heads']],
  ['sides only', ['sides']],
  ['heads', ['heads']],
  ['sides', ['sides']],
  ['ones and twos', ['1s', '2s']],
  ['ones & twos', ['1s', '2s']],
  ['1s and 2s', ['1s', '2s']],
  ['twos and threes', ['2s', '3s']],
  ['twos & threes', ['2s', '3s']],
  ['2s and 3s', ['2s', '3s']],
  ['ones and threes', ['1s', '3s']],
  ['ones & threes', ['1s', '3s']],
  ['top four', ['1s', '2s']],
  ['top 4', ['1s', '2s']],
  ['bottom four', ['2s', '3s']],
  ['bottom 4', ['2s', '3s']],
  ['new middle 4 dancers', ['middle']],
  ['middle 4 dancers', ['middle']],
  ['middle four', ['middle']],
  ['middle 4', ['middle']],
  ['center four', ['middle']],
  ['center 4', ['middle']],
  ['centre four', ['middle']],
  ['inside four', ['middle']],
  ['other four', ['middle']],
  ['other 4', ['middle']],
  ['outside four', ['ends']],
  ['outside 4', ['ends']],
  ['four robins', ['robins']],
  ['four larks', ['larks']],
  ['all four robins', ['robins']],
  ['all four larks', ['larks']],
  ['all eight', []],
  ['all 8', []],
  ['hands six', []],
  ['hands eight', []],
  // The dancers the row before named; import.ts fills them in.
  ['same four', ['@same']],
  ['robins', ['robins']],
  ['larks', ['larks']],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PHRASES = QUALIFIERS.map(([p]) => escape(p)).join('|');
const LEADING = new RegExp(`^(${PHRASES})(?:,| -)? (.+)$`);
const TRAILING = new RegExp(`^(.+?)(?:,| -)? (?:with |for )?(?:the )?(${PHRASES})(?: only)?$`);
const NAMES = new Map(QUALIFIERS.map(([p, a]) => [p, a]));

/** Lift a qualifier out of a row: "star right 4 places heads" -> star + heads. */
export function qualifiers(text: string): { text: string; among?: readonly string[] } | undefined {
  const t = text.replace(/\s*\[([^\]]*)\]\s*/g, ' $1 ').replace(/\s+/g, ' ').trim();
  const lead = t.match(LEADING);
  if (lead) return { text: lead[2], among: NAMES.get(lead[1]) };
  const trail = t.match(TRAILING);
  if (trail) return { text: trail[1], among: NAMES.get(trail[2]) };
  return undefined;
}

/**
 * Rows that move nobody: "stand still", claps and stomps, heel-and-toe
 * styling. They are figures in their own right (everyone holds their place),
 * not rows the engine failed to read.
 */
const BASE: readonly Pattern[] = [
  [
    /^(?:stand still|wait|rest|hold|pause|clap,? clap|three claps,? three stomps|clap|stomp|claps?(?: and | & )stomps?|heel,? toe,? heel,? toe|heel and toe(?: twice)?|clap (?:three|3) times)$/,
    (m, b) => [call('still', b, { action: /clap|stomp/.test(m[0]) ? 'clap' : 'stand' })],
  ],
  [
    // Lines facing, rings, heads: walk forward and back.
    /^(?:(?:long )?lines(?: of (?:four|4|three|3|eight|8))?|couples|as couples|(?:the )?ring|everyone|everybody|all|ring go|hands (?:four|six|eight))?,? ?(?:forward|go forward|into the (?:middle|center|centre)|in to the (?:middle|center)|advance) ?(?:&|and) ?(?:back|retire|come back|back out)(?: lines of (?:four|4|three|3))?$/,
    (_m, b) => [call('forward-back', b, { back: true })],
  ],
  [
    /^(?:advance (?:&|and) retire|forward (?:&|and) back|go forward (?:&|and) back|walk forward (?:&|and) back)$/,
    (_m, b) => [call('forward-back', b, { back: true })],
  ],
  [
    /^(?:(?:long )?lines(?: of (?:four|4|three|3))? )?(?:forward|walk forward|go forward|into the (?:middle|center))$/,
    (_m, b) => [call('forward-back', b, { back: false })],
  ],
  [
    /^(larks|robins|heads|sides|head couples|side couples|ones|twos) (?:go )?(?:forward|to the (?:middle|center|centre)|into the (?:middle|center|centre)|in) ?(?:&|and) ?(?:back|come back|back out)$/,
    (m, b) => [call('forward-back', b, { back: true, among: [AMONG_WORD[m[1]]] })],
  ],
];

export const AMONG_WORD: Readonly<Record<string, string>> = {
  larks: 'larks',
  robins: 'robins',
  heads: 'heads',
  sides: 'sides',
  'head couples': 'heads',
  'side couples': 'sides',
  ones: '1s',
  twos: '2s',
  threes: '3s',
};

export const MORE_PATTERNS: readonly Pattern[] = [
  ...BASE,
  ...SETS_PATTERNS,
  ...RING_PATTERNS,
  ...SQUARE_PATTERNS,
  ...ECD_PATTERNS,
  ...GROUPS_PATTERNS,
];
