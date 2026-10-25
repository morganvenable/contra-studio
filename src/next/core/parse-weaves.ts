/**
 * Row patterns for the weaving and passing figures: heys (ricochets,
 * diagonal heys, heys started by the 1s or 2s), stars, petronella, roll
 * away, Rory O'More, and pass by / pull by, with the wordings ContraDB rows
 * use for them. parse.ts tries these after its own table.
 *
 * Trailing notes that only say who the dancers will meet next, or remind
 * them of something that does not change the motion ("star left 4 places
 * with shadows", "balance & petronella (no clap)", "rory o'more right past
 * neighbors"), are dropped: a row is read as its figure only when everything
 * after the figure is such a note (NOTES). Anything that adds motion ("larks
 * turn back over right shoulder", "end in long waves") leaves the row
 * unparsed, so it shows as a row that is not drawn yet instead of being
 * drawn wrong.
 */
import type { FigureCall } from './figure.ts';
import { canonical } from './roles.ts';

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];

const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});

/**
 * Source words for dancers -> canonical names. Ordinals and "next",
 * "previous" are carried by the progression mark, as in parse.ts.
 */
function who(word: string): string {
  const w = word
    .replace(/^(?:next|new|prev|previous|original|current|same|first|second|1st|2nd|3rd|4th) /, '')
    .replace(/^(?:\d\w* )+/, '');
  const c = canonical(w);
  if (c) return c;
  if (/^shadows?$/.test(w)) return 'shadow';
  throw new Error(`Unknown dancers "${word}".`);
}

const NUMBER: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  '¼': 1,
  '1/4': 1,
  '½': 2,
  '1/2': 2,
  halfway: 2,
  '¾': 3,
  '3/4': 3,
  once: 4,
  '1¼': 5,
  '1 1/4': 5,
};

/** Wording after a figure that changes nothing about its motion. */
const NOTES: readonly RegExp[] = [
  // Who comes next: "to new neighbors", "and go to the next couple".
  /^(?:and )?(?:go |move |progress |continue |back )?(?:on )?to (?:a |the |your |their )?(?:new|next|prev\w*|previous|original|current|same|nearest|\d\w*|first|second|third|fourth|n\d|neighbors?|partners?|shadows?|couple|home)\b.*$/,
  /^(?:and )?progress\b.*$/,
  // What is left once parse.ts drops a trailing "to new neighbors".
  /^(?:and )?(?:go|move|continue)$/,
  // Who they dance it with: "with shadows", "with prev neighbors".
  /^(?:with|w\/) (?:your |their |the |these )?(?:new |next |prev\w* |previous |original |current |same |future |nearest |\d\w* |first |second )*(?:neighbors?|partners?|shadows?|couple|n\d)(?: (?:and|&) (?:\w+ )?(?:neighbors?|partners?|shadows?))?(?: not with partners)?$/,
  /^(?:same|current|new|next|prev\w*) neighbors?$/,
  /^back to (?:current|original|same|prev\w*|your) .*$/,
  // Looking or turning to face the next person: the next figure turns them.
  /^(?:and |then |end |, )?(?:turn(?:ing)? )?(?:a little (?:more|extra) )?(?:to )?fac(?:e|ing) (?:your |the |a |their )?(?:new |next |current |prev\w* |\d\w* )*(?:neighbors?|partners?|shadows?|couple|across|in|next)\b.*$/,
  // What is left once parse.ts drops a trailing "new neighbors".
  /^(?:and |then )?(?:turn(?:ing)? )?(?:to )?fac(?:e|ing)$/,
  /^look\b.*$/,
  /^note\b.*$/,
  /^(?:and )?(?:turn |twirl |spin )?(?:a little|a bit|a little bit|slightly) (?:more|extra|less)\b(?: to (?:face|new|next) .*)?$/,
  // Whom they pass: "your shadow", "past neighbors".
  /^(?:with |past )?(?:your |the )?(?:shadows?|partners?|neighbors?)$/,
  // Walking straight over: "robins go straight to neighbor".
  /^(?:\w+ )?(?:go(?:es)?|cross(?:es)?) (?:straight )?(?:across(?: the set)?)?(?: ?to (?:your |their )?(?:partners?|neighbors?|shadows?))?$/,
  // Ordinal corrections: "(5th, not 1st)", "(#2)".
  /^\d\w*,? not \d\w*$/,
  /^#\d$/,
  /^into$/,
  /^(?:halfway|once around)$/,
  // Clapping is styling.
  /^(?:\w+ )*clap\w*(?: \w+)*$/,
  // Footnote marks.
  /^\d$/,
];

/** True when `rest` (what follows a figure's own words) is only a note. */
export function onlyNotes(rest: string): boolean {
  const r = rest
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[*+]+/g, ' ')
    .replace(/^[\s,;:–-]+/, '')
    .replace(/[\s,;:.!–-]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!r) return true;
  return NOTES.some((re) => re.test(r));
}

/** Throw unless `rest` is only notes (see NOTES). */
function notes(rest: string | undefined, what: string) {
  if (rest && !onlyNotes(rest)) throw new Error(`The ${what} row adds "${rest.trim()}".`);
}

/**
 * The rest of a hey row after its shoulders: ricochet clauses and notes.
 * "robins ricochet", "larks ricochet second time", "robins ricochet to
 * start" (the first meeting).
 */
function heyRest(rest: string) {
  const ricochet: { who: string; time?: number }[] = [];
  const times: Readonly<Record<string, number>> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
  };
  const left = rest.replace(
    /(?:^|[,-]|\band\b)\s*(\w+) ricochet(?: (first|second|third|fourth) time| to start| once)?(?: (?:to|back to) (?:partners?|neighbors?)| and join (?:partners?|neighbors?)| aka "?recoil"?)?/g,
    (_m, w: string, t?: string) => {
      ricochet.push({ who: who(w), ...(t ? { time: times[t] } : {}) });
      return ',';
    },
  );
  if (!onlyNotes(left.replace(/,/g, ' ')))
    throw new Error(`The hey row adds "${left.replace(/^[\s,-]+|[\s,-]+$/g, '')}".`);
  return ricochet;
}

export const WEAVE_PATTERNS: readonly (readonly [RegExp, Build])[] = [
  [
    // "larks start a half hey - lefts in center, rights on ends - robins
    // ricochet", "robins start a left diagonal half hey - ...", "ones start
    // a full hey - ...".
    /^(\w+) start an? (?:(left|right) diagonal )?(full|half) hey - (?:(right|left)s in (?:the )?center, (?:right|left)s on (?:the )?ends|(right|left)s on (?:the )?ends, (right|left)s in (?:the )?center)(.*)$/,
    (m, b) => {
      const ricochet = heyRest(m[7]);
      return [
        call('hey', b, {
          start: who(m[1]),
          amount: m[3] === 'full' ? 1 : 0.5,
          center: m[4] ?? m[6],
          ...(ricochet.length ? { ricochet } : {}),
          ...(m[2] ? { diagonal: m[2] } : {}),
        }),
      ];
    },
  ],
  [
    // "larks start a hey - lefts in center, rights on ends - until partners
    // meet the second time": as many passes as come before that meeting.
    /^(\w+) start an? (?:(left|right) diagonal )?hey - (?:(right|left)s in (?:the )?center, (?:right|left)s on (?:the )?ends|(right|left)s on (?:the )?ends, (right|left)s in (?:the )?center),? -? ?until (\w+) meet(?: (?:the|a) (first|second|third|1st|2nd|3rd) time)?(.*)$/,
    (m, b) => {
      const times: Readonly<Record<string, number>> = {
        first: 1,
        '1st': 1,
        second: 2,
        '2nd': 2,
        third: 3,
        '3rd': 3,
      };
      // "(rl, pr, ll, nr, rl)": the passes spelled out, a reminder.
      const ricochet = heyRest(m[8].replace(/^\s*\w\w(?:, \w\w)+\s*/, ''));
      return [
        call('hey', b, {
          start: who(m[1]),
          center: m[3] ?? m[5],
          until: { who: who(m[6]), ...(m[7] ? { time: times[m[7]] } : {}) },
          ...(ricochet.length ? { ricochet } : {}),
          ...(m[2] ? { diagonal: m[2] } : {}),
        }),
      ];
    },
  ],
  [
    // "cross trails - partners across the set right shoulders, neighbors
    // along the set left shoulders": the first pair crosses, then the second
    // passes, each in half the beats.
    /^cross trails - (\w+) (across|along) the set (right|left) shoulders?, (\w+) (across|along) the set (right|left) shoulders?(.*)$/,
    (m, b) => {
      notes(m[7], 'cross trails');
      return [
        call('pass-by', b / 2, {
          who: who(m[1]),
          shoulder: m[3],
          hands: false,
        }),
        call('pass-by', b / 2, {
          who: who(m[4]),
          shoulder: m[6],
          hands: false,
        }),
      ];
    },
  ],
  [
    // "revolving door - robins take right hands and drop off partners on
    // other side".
    /^revolving door - (\w+) take (right|left) hands and drop off ((?:\d\w* )?\w+) on (?:the )?other side(.*)$/,
    (m, b) => {
      notes(m[4], 'revolving door');
      return [
        call('revolving-door', b, {
          who: who(m[1]),
          hand: m[2],
          whom: who(m[3]),
        }),
      ];
    },
  ],
  [
    // "twos arch ones dive", "ones arch, twos duck under".
    /^(\w+) arch,? (?:and )?(\w+) (?:dive|duck)(?: under| through)?(.*)$/,
    (m, b) => {
      notes(m[3], 'arch and dive');
      return [call('arch-dive', b, { arch: who(m[1]), dive: who(m[2]) })];
    },
  ],
  [
    // "ones half figure 8 below", "twos half figure 8 above, first larks leading".
    /^(\w+) half figure (?:8|eight)(?: (above|below))?(?:,? (?:(?:first|second) )?(\w+) leading)?(.*)$/,
    (m, b) => {
      notes(m[4], 'half figure eight');
      const lead = m[3] ? who(m[3]) : undefined;
      return [
        call('figure-eight', b, {
          who: who(m[1]),
          ...(m[2] ? { around: m[2] } : {}),
          ...(lead ? { lead } : {}),
        }),
      ];
    },
  ],
  [
    // "star right 4 places hands across", "star left 3/4 wrist grip", and
    // stars with trailing notes.
    /^star (left|right)(?: - (hands across|wrist grip) -)? (1¼|1 1\/4|[¼½¾]|\d\/\d|\w+)(?: places?)?(?:,? (?:- )?(hands across|wrist grip))?(.*)$/,
    (m, b) => {
      const places = NUMBER[m[3]] ?? Number(m[3]);
      if (!Number.isInteger(places)) throw new Error(`Unknown star amount "${m[3]}".`);
      const grip = m[2] ?? m[4];
      notes(m[5].replace(/\b\w+ drop out(?: at (?:home|the end))?/, ''), 'star');
      return [
        call('star', b, {
          hand: m[1],
          places,
          ...(grip ? { grip: grip === 'wrist grip' ? 'wrist' : 'hands-across' } : {}),
        }),
      ];
    },
  ],
  [
    // "balance & petronella (no clap)", "balance & petronella left",
    // "balance & petronella one place to the right", and a petronella alone.
    /^(balance (?:&|and) )?petronella(?: (left|right))?(?: turn)?(?: (?:–|-)? ?(?:move |spin (?:left|right) |twirl )?(?:one|1) place(?: (?:to (?:the )?)?(right|left))?)?(.*)$/,
    (m, b) => {
      notes(m[4].replace(/^,? ?(?:spin (?:left|right)|overspin)\b/, ''), 'petronella');
      const direction = m[2] ?? m[3];
      const turn = direction === 'left' ? { direction: 'left' } : {};
      if (!m[1]) return [call('petronella', b, turn)];
      const balance = b >= 8 ? 4 : b / 2;
      return [
        call('balance', balance, { formation: 'ring' }),
        call('petronella', b - balance, turn),
      ];
    },
  ],
  [
    // "larks roll away neighbors", "... with a half sashay across the set",
    // "... on the way back".
    /^(\w+) roll away ((?:next |new )?\w+)(?: with a half[- ]sashay)?(?: (?:roll )?(?:left to right|right to left))?(?: (across|along|up and down)(?: the)?(?: set)?)?(?: (?:on|as) (?:the )?(?:way|lines?) back(?: up)?| backing up)?(.*)$/,
    (m, b) => {
      notes(m[4], 'roll away');
      const axis = m[3] === 'up and down' ? 'along' : m[3];
      return [
        call('roll-away', b, {
          who: who(m[1]),
          whom: who(m[2]),
          ...(axis ? { axis } : {}),
        }),
      ];
    },
  ],
  [
    // "balance & rory o'more right past shadows", "balance & larks rory
    // o'more right", "robins rory o'more left".
    /^(balance (?:&|and) )?(?:(\w+) )?rory o'? ?more (left|right)(.*)$/,
    (m, b) => {
      notes(m[4].replace(/^,? ?(?:past|nose to nose|slide nose to nose)\b.*$/, ''), "Rory O'More");
      const named = m[2] ? (m[2] === 'centers' ? { who: 'centers' } : { who: who(m[2]) }) : {};
      const rory = call('rory', m[1] ? b - 4 : b, {
        direction: m[3],
        spin: 'full',
        ...named,
      });
      if (!m[1]) return [rory];
      return [
        call('balance', 4, {
          formation: 'wave',
          style: 'right-left',
          first: m[3],
        }),
        rory,
      ];
    },
  ],
  [
    // "pull by right", "shadows pull by left", "ones pass by right
    // shoulders", "pull by right across the set w/partner", "larks pass by
    // left shoulders in center to face partner".
    /^(?:((?:next |new |prev |previous |\d\w* )*\w+) )?(pass|pull) by (right|left)(?: shoulders?| hands?)?(?: (?:straight )?(across|along)(?: the)?(?: set)?)?(?: in (?:the )?center)?(?: (?:with |w\/ ?)(?:your )?(partners?|neighbors?|shadows?))?(.*)$/,
    (m, b) => {
      notes(m[6], m[2] === 'pull' ? 'pull by' : 'pass by');
      const named = m[1] ?? m[5];
      const w = named ? who(named) : 'facing';
      return [
        call('pass-by', b, {
          // Dancers named only by a relationship the state may not carry
          // (shadows) pass whoever they face.
          who: w === 'shadow' ? 'facing' : w,
          shoulder: m[3],
          hands: m[2] === 'pull',
        }),
      ];
    },
  ],
];
