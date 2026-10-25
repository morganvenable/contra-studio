/**
 * Gyre, roll away and turn alone rows with words after the figure that do
 * not change it: where the dancers look or end up facing, a reminder of
 * which way they go or who they meet, styling ("gaze into partner's eyes",
 * "start wide and spiral in"), counts. parse.ts reads the bare figures;
 * these patterns take the same figure when everything after it is such a
 * note (gyre notes here, plus parse-weaves.ts onlyNotes). Words that add
 * motion leave the row unparsed.
 */
import type { FigureCall } from './figure.ts';
import { canonical } from './roles.ts';
import { onlyNotes } from './parse-weaves.ts';
import { parseRow } from './parse.ts';

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];

const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});

function who(word: string): string {
  if (/^(?:next|new) neighbors?$/.test(word)) return 'next-neighbor';
  if (/^(?:prev|previous) neighbors?$/.test(word)) return 'previous-neighbor';
  const w = word.replace(/^(?:same|current|original|first|1st) /, '');
  if (/^shadows?$/.test(w)) return 'shadow';
  if (w === 'ones') return '1s';
  if (w === 'twos') return '2s';
  const c = canonical(w);
  if (c) return c;
  throw new Error(`Unknown dancers "${word}".`);
}

const AMOUNT: Readonly<Record<string, number>> = {
  once: 1,
  '½': 0.5,
  '1/2': 0.5,
  '¾': 0.75,
  '3/4': 0.75,
  '1¼': 1.25,
  '1 1/4': 1.25,
  '1½': 1.5,
  '1 1/2': 1.5,
  twice: 2,
};

/** Words after a gyre that leave it as it is. */
const GYRE_NOTES: readonly RegExp[] = [
  /^(?:in (?:the )?(?:center|middle))$/,
  /^(?:to )?trade(?: places)?$/,
  /^(?:to )?trade places(?: \(?hole[- ]in[- ]the[- ]wall\)?)?$/,
  /^\(?hole[- ]in[- ]the[- ]wall(?: cross)?\)?$/,
  /^(?:\(?same neighbor\)?|\(?new neighbor may be a bit to the left\)?)$/,
  /^gaze into (?:your )?partners?'? eyes$/,
  /^\(?start wide and spiral towards each other\)?$/,
  /^(?:and )?end in (?:a )?waltz position$/,
  /^(?:to )?face (?:your |the )?(?:partners?|neighbors?|next|across)(?: across(?: the set)?)?$/,
  /^(?:then |and )?face (?:the )?(?:next|new) (?:neighbors?|couple)$/,
  /^(?:then )?face neighbors across$/,
  /^back to (?:your )?home sides?$/,
  /^(?:and )?(?:go|return) (?:back )?to (?:your )?(?:partners?|original neighbors?)$/,
  /^(?:and )?return to (?:the )?original neighbors?$/,
  /^back to original neighbors?$/,
  /^\*?\*?(?:right|left)(?:-\d)+\*?\*?(?:-\d)*$/,
  /^\[?once around is until .*\]?$/,
  /^(?:and )?meltdown(?: (?:to|into)(?: (?:a )?swing)?)?$/,
  /^(?:to form |into )a ring$/,
  /^(?:and )?return to (?:the )?original neig\w*$/,
  /^\(?hole[- ]in[- ]the[- ]wall\)?$/,
  /^to trade(?: \(?"?hole-in-the-wall"?\)?)?$/,
];

const gyreNote = (rest: string) => {
  const r = rest
    .replace(/\*+(?:right|left)(?:-\d)+\*+(?:-\d)*/g, ' ')
    .replace(/[*]+/g, ' ')
    .replace(/^[\s,;:–-]+|[\s,;:.–-]+$/g, '')
    .replace(/\s+/g, ' ');
  // "in (the) center" first, then whatever note follows it.
  const after = r.replace(/^\(?in (?:the )?(?:center|middle)\)?,?\s*/, '');
  const note = (t: string) => !t || GYRE_NOTES.some((re) => re.test(t)) || onlyNotes(t);
  return note(r) || note(after);
};

/** Words after a roll away that leave it as it is. */
const ROLL_NOTES: readonly RegExp[] = [
  /^\(?corner (?:i|ii|1|2)\)?$/,
  /^\(?(?:larks|robins) from (?:right to left|left to right)\)?$/,
  /^(?:\(?across,? maybe past\/future neighbors\)?|\(?up or down the set, \w+ in front\)?|\(?across the set, \w+ in front\)?)$/,
  /^using (?:the )?connected hands?$/,
  /^(?:- )?join hands four with (?:the )?same neighbors$/,
  /^\(?lines should stay close .*\)?$/,
  /^(?:- )?this is your minor set$/,
  /^(?:- )?no half sashay!?(?: and face (?:new|next) neighbors)?$/,
  /^on the side of the set(?: - no half sashay!?)?(?: and face (?:new|next) neighbors)?$/,
  /^(?:- )?(?:top|bottom) two \w+ from (?:left to right|right to left)(?: along the set)?$/,
  /^\(?(?:larks|robins) stay (?:in the same place|put),? (?:larks|robins) trade places\)?$/,
  /^\[?\d\]?$/,
  /^\(?while going back,? .*\)?$/,
  /^(?:as|while) (?:the )?lines go back$/,
  /^\(?no half sashay!?\)? (?:as|while) (?:the )?lines go back$/,
];

const rollNote = (rest: string) => {
  const r = rest
    .replace(/[*]+/g, ' ')
    .replace(/^[\s,;:–-]+|[\s,;:.–-]+$/g, '')
    .replace(/\s+/g, ' ');
  return !r || ROLL_NOTES.some((re) => re.test(r)) || onlyNotes(r);
};

/** Words after "down the hall and turn ..." that leave it as it is. */
const HALL_NOTES: readonly RegExp[] = [
  /^\(?down the aisle in lines of four\)?$/,
  /^\[?line of six,? 1s in the center\]?$/,
  /^turn as (?:a )?couples?$/,
  /^towards (?:your )?neighbors?,? 4 steps,? rejoin hands in (?:a )?line of four$/,
];

export const TURN_PATTERNS: readonly (readonly [RegExp, Build])[] = [
  [
    // "down the hall and turn as a couple (down the aisle in lines of four)";
    // "down the hall and turn as a couple, come back, bend line to circle"
    // (16 beats): down, then up the hall into a ring, half the beats each.
    /^down the hall,? and turn (as a couple|alone)(.*)$/,
    (m, b) => {
      const turn = m[1] === 'alone' ? 'alone' : 'couple';
      const rest = m[2].replace(/[*]+/g, ' ').replace(/^[\s,;:–-]+|[\s,;:.–-]+$/g, '').replace(/\s+/g, ' ');
      if (/^(?:turn as (?:a )?couples? )?(?:and )?come back,? (?:and )?bend (?:the )?line (?:in)?to (?:a )?(?:circle|ring)$/.test(rest)) {
        if (b < 12) throw new Error('Down the hall and back needs 12 beats or more.');
        return [
          call('hall', b / 2, { direction: 'down', turn }),
          call('hall', b / 2, { direction: 'up', end: 'ring' }),
        ];
      }
      if (rest && !HALL_NOTES.some((re) => re.test(rest)))
        throw new Error(`The down the hall row adds "${rest}".`);
      return [call('hall', b, { direction: 'down', turn })];
    },
  ],
  [
    // "partners gyre once, then face neighbors across", "neighbors gyre 1½
    // (same neighbor)", "robins gyre ½ to trade places", "partners gyre once
    // (start wide and spiral towards each other)".
    /^((?:next |new |prev |previous |same )?\w+) gyre (?:(right|left) shoulders? )?(once|twice|½|1\/2|¾|3\/4|1¼|1 1\/4|1½|1 1\/2)(?!\w)(.*)$/,
    (m, b) => {
      if (!gyreNote(m[4])) throw new Error(`The gyre row adds "${m[4].trim()}".`);
      return [
        call('gyre', b, {
          who: who(m[1]),
          amount: AMOUNT[m[3]],
          ...(m[2] === 'left' ? { shoulder: 'left' } : {}),
        }),
      ];
    },
  ],
  [
    // "larks roll away neighbors (corner I)", "larks roll away partners with
    // a half sashay (robins from right to left)".
    /^(larks|robins) roll away (?:next |new )?(partners?|neighbors?|shadows?)(?: with (?:a )?half sashay)?(.*)$/,
    (m, b) => {
      if (!rollNote(m[3])) throw new Error(`The roll away row adds "${m[3].trim()}".`);
      return [call('roll-away', b, { who: m[1], whom: who(m[2]) })];
    },
  ],
  [
    // "turn alone to face a new neighbor", "turn alone to face your partner".
    /^turn alone,? (?:to )?face (?:a |your |the )?(?:new |next )?(?:neighbors?|partners?)$/,
    (_m, b) => [call('turn-alone', b, {})],
  ],
];

/**
 * Twirls, petronella, Rory O'More, slice and butterfly whirl rows with a
 * note after the figure: the figure as parse.ts reads it alone, when the
 * note is one of these.
 */
const CORE_NOTES: readonly (readonly [RegExp, readonly RegExp[]])[] = [
  [
    /^((?:(?:next|new) )?\w+ (?:(?:right|left) hand )?(?:balance (?:&|and) )?(?:box the gnat|swat the flea|california twirl))(.+)$/,
    [
      /^\(?couple \d\)?$/,
      /^\(?(?:right|left) hand balance\)?$/,
      /^,? ?(?:&|and) reform (?:the )?wave$/,
      /^\(?robins back[- ]to[- ]back\)?$/,
      /^- join hands with (?:the )?(?:next|new) neighbors$/,
    ],
  ],
  [
    /^(balance (?:&|and) petronella(?: (?:left|right))?)(.+)$/,
    [
      /^\(?doesn'?t matter where it takes you\)?$/,
      /^\+? ?to face a new (?:foursome|couple|ring)$/,
      /^- turn around and\.*$/,
      /^directly into\.*$/,
      /^, centers note partners and then\.*$/,
      /^, turn(?:ing)? to face (?:the )?direction of travel$/,
      /^, turning(?: to face)?$/,
      /^twirl once and a little more to face a new couple$/,
      /^and twirl one place to the right$/,
      /^around (?:the )?loop$/,
      /^form a ring from the basket$/,
      /^\.? ?“?"?petronella-nella"?”?$/,
    ],
  ],
  [
    /^(balance (?:&|and) rory o'more (?:left|right))(.+)$/,
    [
      /^,? ?waves of four$/,
      /^,? ?pass (?:your )?partner no\w*s? to nose$/,
      /^,? ?-? ?neighbors? catch right hands? in (?:a )?handshake hold$/,
      /^,? ?\w+ super twirl across$/,
    ],
  ],
  [
    /^(slice (?:left|right)(?: (?:and|&) straight back)?)(.+)$/,
    [
      /^,? ?\(?long lines slice\)?$/,
      /^,? ?\(?yearn to (?:a )?new neighbors?\)?$/,
      /^,? ?\(?with neighbors,? towards shadows\)?$/,
      /^,? ?to meet (?:the )?couple with (?:your )?partner$/,
      /^,? ?(?:and )?(?:on the way back|while backing up)\.*$/,
    ],
  ],
  [/^(butterfly whirl)(.+)$/, [/^,? ?(?:with )?(?:your )?partners?$/, /^,? ?clockwise$/]],
];

function coreWithNote(m: RegExpMatchArray, beats: number, notesFor: readonly RegExp[]) {
  const rest = m[2].replace(/[*+]+$/g, '').replace(/\s+/g, ' ').trimEnd();
  const r = rest.trim();
  if (!r || !(notesFor.some((re) => re.test(rest) || re.test(r)) || onlyNotes(r)))
    throw new Error(`The row adds "${r}".`);
  return parseRow({ beats, text: m[1] }).map((c) => ({ ...c, text: undefined }) as FigureCall);
}

export const CORE_NOTE_PATTERNS: readonly (readonly [RegExp, Build])[] = CORE_NOTES.map(
  ([re, notesFor]) => [re, (m: RegExpMatchArray, b: number) => coreWithNote(m, b, notesFor)] as const,
);
