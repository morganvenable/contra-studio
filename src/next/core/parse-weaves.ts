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
  // "Same roles", "same couple": whoever faces each other (core/facing.ts).
  if (/^same (?:roles?|couple)$/.test(word)) return 'facing';
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
  // What is left once parse.ts drops a trailing "new neighbor".
  /^(?:& |and |, )?(?:turn )?to(?: a| your| the)?$/,
  /^(?:& |and )?look\b.*$/,
  /^until you're next to .*$/,
  /^(?:\(?standard|traditional) .*$/,
  /^(?:the )?(?:dance starts|ones are back)\b.*$/,
  /^\(?roll (?:left to right|right to left)\)?$/,
  // Taking hands for the next figure: that figure joins them.
  /^(?:the )?(?:trailing two|new \w+|original \w+|\w+ )?\s*catch(?:ing)?(?: (?:\w+ )?(?:hands?|partners?|shadows?|neighbors?))?(?: in (?:the )?(?:left|right) hands?)?(?: \w+)?$/,
  /^(?:just )?(?:halfway|once around)$/,
  /^to progress$/,
  // Hands the next figure takes: "and take both hands with your partner",
  // "to a left hand star".
  /^(?:and )?take (?:both|right|left) hands with (?:your |their )?(?:partners?|neighbors?)$/,
  /^to an? (?:left|right)[- ]hand star$/,
  // Flaherty's heys: who veers off at the end to face the next people.
  /^but .*\bveer (?:right|left) to face .*$/,
  /^-?\s*(?:and )?end next(?: to .*)?$/,
  /^balance (?:left|right) first(?: to (?:neighbors?|partners?))?$/,
  /^;?\s*return to (?:partners?|neighbors?)$/,
  /^(?:\w+ )?drop off (?:partners?|neighbors?)$/,
  /^(?:passing )?(?:by )?(?:the )?(?:left|right)(?: shoulders?)?$/,
  /^\(?see note\)?$/,
  /^(?:one full hey in total|across set|across the set)$/,
  /^(?:\w+ )?(?:pass|pull by) (?:\w+ )?(?:right|left|r|l)(?: to start(?: hey on the end)?)?$/,
  /^(?:\w+ )?(?:pass|pull by) \w+ (?:right|left) to start$/,
  /^(?:changing places|up (?:and|&) down|to cross(?: the)?(?: set)?|to get across the set|to meet partners?|same roles|same couple)$/,
  /^(?:to |in )?(?:a |that |the )?diamond\b.*$/,
  /^(?:\w+ )?(?:turn(?:ing)?|spinning) (?:extra|a little (?:more|extra))\b.*$/,
  /^(?:everyone is home|new ring|across|shift right)$/,
  /^on the side(?: of the set)?$/,
  /^to the (?:right|left)$/,
  /^(?:then )?with (?:the )?(?:new|next|old|original|prev\w*|previous)\b.*$/,
  /^(?:seek|find)\b.*$/,
  /^to take (?:right|left) hands\b.*$/,
  /^(?:and )?(?:a bit|a little|a little bit) (?:more|extra)\b.*$/,
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
    .replace(/#\d+/g, ' ')
    .replace(/^[\s,;:&–-]+/, '')
    .replace(/[\s,;:.!&–-]+$/, '')
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
  const left = rest
    .replace(
      /(?:^|[,-]|\band\b)\s*when (?:the )?(\w+) meet (?:the )?(first|second|third|fourth) time,? they ricochet\b[^,]*/g,
      (_m, w: string, t: string) => {
        ricochet.push({ who: who(w), time: times[t] });
        return ',';
      },
    )
    .replace(
      /(?:^|[,-]|\band\b)\s*(?:the )?(\w+) ricochet(?: (?:the )?(first|second|third|fourth) time| to start| once)?(?: (?:to|back to) (?:partners?|neighbors?)| and join (?:partners?|neighbors?)| aka "?recoil"?(?: and join (?:partners?|neighbors?))?| when meeting in the middle| the first time they meet| to trade roles| across the set| \(?\w+ don't cross the set\)?| back to (?:partners?|neighbors?))?/g,
      (_m, w: string, t?: string) => {
        ricochet.push({ who: who(w), ...(t ? { time: times[t] } : {}) });
        return ',';
      },
    )
    .replace(/,\s*(?:\w+ )?finish(?:es)? (?:an? )?(?:ordinary |standard )?hey\.?/g, ',');
  if (!onlyNotes(left.replace(/,/g, ' ')))
    throw new Error(`The hey row adds "${left.replace(/^[\s,-]+|[\s,-]+$/g, '')}".`);
  return ricochet;
}

const PATTERNS: readonly (readonly [RegExp, Build])[] = [
  [
    // "larks chevron into neighbors' place" (what follows a dash spells the
    // figure out).
    /^(\w+) chevron into (?:their )?neighbors'? places?(?:\s*[—-].*)?$/,
    (m, b) => [call('chevron', b, { who: who(m[1]) })],
  ],
  [
    // Flaherty: "1/2 hey, robins start right shoulders, upon facing neighbor
    // veer to right to face new (2nd) neighbor": the half hey; the veer to
    // the next neighbor is the next row's to make.
    /^(?:with these new (?:\w+ )?neighbors,? )?(?:1\/2|half) hey,? (\w+) start (?:passing )?(right|left) shoulders?(?:,? and|,)? (?:upon|when) (?:facing|passing) .*\bveer (?:to )?(?:right|left)\b.*$/,
    (m, b) => [call('hey', b, { start: who(m[1]), amount: 0.5, center: m[2] })],
  ],
  [
    // Stars by eighths of a turn: "star l 7/8", "hands across star l 9/8",
    // "star left - hands across - 3 places (7/8ths places)". Four dancers
    // go n/8 of the way round: n/2 places, half places ending on a diamond.
    /^(?:(hands across),? )?(?:double-balance )?star (l|r|left|right)(?: - (hands across|wrist grip) -)?(?: \w+ places?)? (\d+)\/8(?:ths?)?(?: places?)?(?: around)?(.*)$/,
    (m, b) => {
      notes(
        m[5]
          .replace(/^\s*-?\s*(?:\w+ face up & down, \w+ on sides|diamond with .*|until .*)$/, '')
          .replace(/^\s*\+$/, ''),
        'star',
      );
      const grip = m[1] ?? m[3];
      return [
        call('star', b, {
          hand: m[2].startsWith('l') ? 'left' : 'right',
          places: Number(m[4]) / 2,
          ...(grip ? { grip: grip === 'wrist grip' ? 'wrist' : 'hands-across' } : {}),
        }),
      ];
    },
  ],
  [
    // "star ____ - wrist grip - 4 places": the hand left blank. A star of
    // whole turns ends where it began whichever way it goes: read as left.
    /^star ____(?: - (hands across|wrist grip) -)? (\w+) places?(.*)$/,
    (m, b) => {
      notes(m[3], 'star');
      const places = NUMBER[m[2]] ?? Number(m[2]);
      if (places % 4 !== 0) throw new Error('A star with no hand named must go whole turns.');
      return [
        call('star', b, {
          hand: 'left',
          places,
          ...(m[1] ? { grip: m[1] === 'wrist grip' ? 'wrist' : 'hands-across' } : {}),
        }),
      ];
    },
  ],
  [
    // "ends turn over right shoulder", "larks turn back": on its own (the
    // second half of a "while" row, figures/meanwhile.ts).
    /^(?:the )?(larks|robins|ones|twos|centers|ends|gentlespoons|ladles) turns? (?:back |around |out )?(?:over (?:their |your )?(right|left) shoulders?)?(.*)$/,
    (m, b) => {
      notes(m[3], 'turn');
      const w = m[1] === 'centers' || m[1] === 'ends' ? m[1] : who(m[1]);
      return [call('turn-back', b, { who: w, ...(m[2] ? { shoulder: m[2] } : {}) })];
    },
  ],
  [
    // "partners start a full circular hey - rights across, lefts along".
    /^((?:next |new )?\w+) start an? (full|half) circular hey - (right|left)s (?:across|along),? (?:right|left)s (?:across|along)(.*)$/,
    (m, b) => {
      notes(m[4], 'circular hey');
      return [
        call('circular-hey', b, {
          start: who(m[1]),
          shoulder: m[3],
          changes: m[2] === 'full' ? 4 : 2,
        }),
      ];
    },
  ],
  [
    // "three changes of a circular hey - neighbors pass right along, partners pass left across".
    /^(one|two|three|four|five|six) changes? of a circular hey - (\w+) pass (right|left) (?:along|across),? (?:\w+) pass (?:right|left) (?:along|across)(.*)$/,
    (m, b) => {
      notes(m[4], 'circular hey');
      return [call('circular-hey', b, { start: who(m[2]), shoulder: m[3], changes: NUMBER[m[1]] })];
    },
  ],
  [
    /^(?:((?:\d\w* |next |new )*\w+) )?(pass|pull) by (right|left)(?: along)?(?: (?:short |slight )?(left|right))? diagonal(.*)$/,
    (m, b) => {
      notes(m[5].replace(/^\s*-?\s*(?:partners?|robins|larks)$/, ''), 'pull by');
      const w = m[1] ? who(m[1]) : 'facing';
      return [
        call('pass-by', b, {
          who: w === 'shadow' ? 'facing' : w,
          shoulder: m[3],
          hands: m[2] === 'pull',
          // A diagonal not named: the one on the side of the hand.
          diagonal: m[4] ?? m[3],
        }),
      ];
    },
  ],
  [
    // "robins balance & pull by right, face a new neighbor", "neighbors
    // balance & pull by right along the set", "1st neighbors balance &
    // pull by right", "same roles balance & pull by right".
    /^((?:\d\w* |next |new |same )*\w+) balance (?:&|and) pull by (right|left)(?: (?:across|along|up and down)(?: the set)?)?(.*)$/,
    (m, b) => {
      notes(m[3], 'pull by');
      const w = /^same roles?$/.test(m[1]) ? 'facing' : who(m[1]);
      const pair = w === 'shadow' ? 'facing' : w;
      const balance = b >= 8 ? 4 : b / 2;
      return [
        call('balance', balance, {
          formation: 'pair',
          who: pair === 'facing' ? 'neighbor' : pair,
          hand: m[2],
        }),
        call('pass-by', b - balance, { who: pair, shoulder: m[2], hands: true }),
      ];
    },
  ],
  [
    // "neighbor ii pull by l", "neighbor i pull by r".
    /^(\w+) (?:i|ii|iii|iv) (pass|pull) by (r|l)$/,
    (m, b) => [
      call('pass-by', b, {
        who: who(m[1]),
        shoulder: m[3] === 'r' ? 'right' : 'left',
        hands: m[2] === 'pull',
      }),
    ],
  ],
  [
    // "facing star clockwise 3 places with robins putting their left hands
    // in and backing up", "facing star, robins back up 3 places".
    /^facing star,? (?:(clockwise|counter-?clockwise) )?(?:(\w+) back up )?(\w+|3\/4)(?: places?)?(?: with (\w+) putting their (?:left|right) hands in and backing up)?(.*)$/,
    (m, b) => {
      notes(
        m[5]
          .replace(/^\s*keep outside hands with partners?\b.*$/, '')
          .replace(/^\s*the facing star ends on the \w+ side$/, ''),
        'facing star',
      );
      const places = NUMBER[m[3]] ?? Number(m[3]);
      if (!Number.isInteger(places)) throw new Error(`Unknown star amount "${m[3]}".`);
      const back = who(m[4] ?? m[2] ?? 'robins');
      return [
        call('star', b, {
          hand: m[1]?.startsWith('counter') ? 'left' : 'right',
          places,
          backing: back,
        }),
      ];
    },
  ],
  [
    // "dolphin hey - start with ones passing second robins by right shoulders".
    /^dolphin hey(?: (1\/2|½))?(?: -)? start with (\w+) passing (?:first |second )?(\w+) by (right|left) shoulders?(.*)$/,
    (m, b) => {
      notes(m[5], 'dolphin hey');
      return [
        call('dolphin-hey', b, {
          pair: who(m[2]),
          first: who(m[3]),
          shoulder: m[4],
          ...(m[1] ? { amount: 0.5 } : {}),
        }),
      ];
    },
  ],
  [
    // "dolphin hey - larks one followed by robins one starts by passing robins two by the left".
    /^dolphin hey - (\w+) one followed by (\w+) one starts? by passing (\w+) two by the (right|left)(.*)$/,
    (m, b) => {
      notes(m[5], 'dolphin hey');
      return [
        call('dolphin-hey', b, { pair: '1s', first: who(m[3]), shoulder: m[4], lead: who(m[1]) }),
      ];
    },
  ],
  [
    // "neighbors California twirl (star through)": from facing, a star thru.
    /^(\w+) california twirl,? \(?star th(?:ru|rough)\)?$/,
    (m, b) => [call('star-thru', b, { who: who(m[1]) })],
  ],
  [
    // "mad robins, larks in front - mad ricochet: same role ricochet out of
    // center with both hands", "mad robins twice around, larks in front ...".
    /^mad robins?,? (?:(once|twice) around,? )?(\w+) in front\b(.*\bricochet.*)$/,
    (m, b) => [
      call('mad-ricochet', b, { front: who(m[2]), ...(m[1] === 'twice' ? { times: 2 } : {}) }),
    ],
  ],
  [
    // "mad ricochet larks start in center ...", "walking the path of a mad
    // robins do a mad ricochet larks in front ...".
    /^(?:walking the path of a mad robins? )?(?:do a )?mad ricochet,? (\w+) (?:start in (?:the )?center|in front)\b.*$/,
    (m, b) => [call('mad-ricochet', b, { front: who(m[1]) })],
  ],
  [
    // "neighbors balance and star through", "star thru (use inside hands)",
    // "neighbor star through", "star through with neighbor".
    /^(?:((?:\d\w* )*\w+) )?(?:handy hand )?(?:take inside hands,? )?(?:(\w+ )?balance (?:and|&) )?star th(?:ru|rough)(?: with (\w+))?(.*)$/,
    (m, b) => {
      notes(
        m[4]
          .replace(/^\s*(?:\w+ (?:right|left) hands?,? ?)+/, '')
          .replace(/^\s*(?:larks right,? robins left|robins left,? larks right)/, '')
          .replace(/^\s*(?:use |using |with )?(?:the )?inside hands?\b.*$/, '')
          .replace(/^\s*to (?:face in|a ring)$/, ''),
        'star thru',
      );
      const named = m[1] ?? m[2]?.trim() ?? m[3];
      const w = named && !/^same (?:roles?|couple)$/.test(named) ? who(named) : 'facing';
      const pair = w === 'shadow' ? 'facing' : w;
      const balanced = !!m[2] || /balance/.test(m[0].slice(0, m[0].indexOf('star')));
      if (!balanced) return [call('star-thru', b, { who: pair })];
      const first = b >= 8 ? 4 : b / 2;
      return [
        call('balance', first, { formation: 'pair', who: pair, hand: 'both' }),
        call('star-thru', b - first, { who: pair }),
      ];
    },
  ],
  [
    // "ones contra corners", "twos contra corners (opposite role - first
    // corners then second corners)".
    /^(\w+) contra corners(.*)$/,
    (m, b) => {
      notes(
        m[2]
          .replace(/^\s*-?\s*opposite role - first corners then second corners/, '')
          .replace(
            /^\s*(?:opposite file|home file|ending progressed|alternate with twos|up\/down - opposite-role neighbors first, same roles second)$/,
            '',
          ),
        'contra corners',
      );
      return [call('contra-corners', b, { who: who(m[1]) })];
    },
  ],
  [
    // "larks gate neighbors to face into the set", "twos gate ones to face down the set".
    /^(\w+) gate ((?:next |new )?\w+) to face (into the set|in|down|up)(?: the set| the hall)?(.*)$/,
    (m, b) => {
      notes(m[4].replace(/^\s*(?:cw|ccw)\b/, ''), 'gate');
      const face = m[3] === 'into the set' || m[3] === 'in' ? 'in' : m[3];
      return [call('gate', b, { who: who(m[1]), whom: who(m[2]), face })];
    },
  ],
  [
    // "zig left zag right", "neighbors zig right zag left".
    /^(?:(\w+) )?zig (left|right),? zag (?:right|left)(.*)$/,
    (m, b) => {
      // Whom the pairs pass or meet, and who leads, are notes: the pairs
      // trade places all the same. Anything forming a wave or another
      // figure is not.
      if (/wave|roll|swing|allemande|balance|chain/.test(m[3]))
        throw new Error(`The zig zag row adds "${m[3].trim()}".`);
      const pair = m[1] ? who(m[1]) : undefined;
      if (pair && pair !== 'partner' && pair !== 'neighbor')
        throw new Error(`Unknown zig zag pairs "${m[1]}".`);
      return [call('zig-zag', b, { first: m[2], ...(pair ? { pair } : {}) })];
    },
  ],
  [
    // "star promenade left ½ with partner", "... larks pick up partner",
    // "... scooping your partner".
    /^(?:(\w+) )?star promenade (left|right) ([^\s,]+)(.*)$/,
    (m, b) => {
      // "Larks pick up neighbor": the neighbor walks the outside instead.
      const withNeighbor = /^,? ?(?:\w+ )?pick(?:ing)? up (?:your )?neighbors?$/.test(m[4]);
      const rest = (withNeighbor ? '' : m[4]).replace(
        /^,? ?(?:with (?:your )?partners?|(?:\w+ )?(?:pick(?:ing)? up|scoop(?:ing)?|scoping)(?: up)? (?:your )?partners?(?: by the waist)?(?: back to place)?|\(?with partners?\)?)/,
        '',
      );
      notes(rest.replace(/^,?\s*\w+ drop out on \w+ side,?$/, ''), 'star promenade');
      const amounts: Readonly<Record<string, number>> = { '¼': 0.25, '½': 0.5, '¾': 0.75, once: 1 };
      const amount = amounts[m[3]];
      if (amount === undefined) throw new Error(`Unknown star promenade amount "${m[3]}".`);
      const center = m[1] ? who(m[1]) : undefined;
      return [
        call('star-promenade', b, {
          hand: m[2],
          amount,
          ...(center === 'larks' || center === 'robins' ? { center } : {}),
          ...(withNeighbor ? { pair: 'neighbor' } : {}),
        }),
      ];
    },
  ],
  [
    // "larks allemande left 1½ to pick up partner for a star promenade":
    // the allemande; the star promenade row follows.
    /^(\w+) allemande (left|right) (1½|1 1\/2|once|½|¾) (?:in (?:the )?center )?(?:and |to )?(?:pick up|scoop up|form)\b.*star promenade$/,
    (m, b) => {
      const amounts: Readonly<Record<string, number>> = {
        '1½': 1.5,
        '1 1/2': 1.5,
        once: 1,
        '½': 0.5,
        '¾': 0.75,
      };
      return [call('allemande', b, { who: who(m[1]), hand: m[2], amount: amounts[m[3]] })];
    },
  ],
  [
    // "balance the star", "balance in a left-hand star": a ring balance.
    /^balance (?:the |in a (?:left|right)[- ]hand )?star$/,
    (_m, b) => [call('balance', b, { formation: 'ring' })],
  ],
  [
    // "larks start a half hey - lefts in center, rights on ends - robins
    // ricochet", "robins start a left diagonal half hey - ...", "ones start
    // a full hey - ...".
    /^((?:next |new )?\w+) start an? (?:(left|right) diagonal )?(full|half) hey - (?:(right|left|____)s? in (?:the )?center, (?:right|left|____)s? on (?:the )?ends|(right|left)s on (?:the )?ends, (right|left)s in (?:the )?center)(.*)$/,
    (m, b) => {
      // A shoulder named after the shoulders restates the first pass's.
      const said = m[7].match(/^\s*,?\s*(?:passing )?(?:by )?(?:the )?(right|left)\b/)?.[1];
      const centerShoulder = m[4] === '____' ? undefined : (m[4] ?? m[6]);
      const firstPass = m[4] ? centerShoulder : m[5];
      if (said && firstPass && said !== firstPass)
        throw new Error(`The hey's first pass is by the ${firstPass}, not the ${said}.`);
      const ricochet = heyRest(m[7].replace(/^\s*passing (?:right|left) shoulders?/, ''));
      return [
        call('hey', b, {
          start: who(m[1]),
          amount: m[3] === 'full' ? 1 : 0.5,
          // Shoulders left blank: as the row's "passing ... shoulders" says, else rights.
          center:
            m[4] === '____'
              ? (m[7].match(/passing (right|left) shoulders?/)?.[1] ?? 'right')
              : (m[4] ?? m[6]),
          ...(ricochet.length ? { ricochet } : {}),
          ...(m[2] ? { diagonal: m[2] } : {}),
        }),
      ];
    },
  ],
  [
    // "larks start a hey - lefts in center, rights on ends - until partners
    // meet the second time": as many passes as come before that meeting.
    /^((?:next |new )?\w+) start an? (?:(left|right) diagonal )?(?:(?:full|half) )?hey - (?:(right|left)s in (?:the )?center, (?:right|left)s on (?:the )?ends|(right|left)s on (?:the )?ends, (right|left)s in (?:the )?center),? -? ?until (\w+) meet(?: (?:the|a) (first|second|third|1st|2nd|3rd) time)?(.*)$/,
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
      const ricochet = heyRest(
        m[8]
          .replace(/^\s*\w\w(?:, \w\w)+\s*/, '')
          .replace(/^\s*(?:\w+ (?:right|left),?\s*)+$/, '')
          .replace(
            /^\s*(?:back )?on (?:the )?(?:home )?side(?: of (?:the )?set)?(?: they started the dance)?$/,
            '',
          ),
      );
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
      notes(
        m[3].replace(
          /^\s*(?:forwards|\(?\w+ will be on one side of the set, \w+ on the other\)?)$/,
          '',
        ),
        'arch and dive',
      );
      return [call('arch-dive', b, { arch: who(m[1]), dive: who(m[2]) })];
    },
  ],
  [
    // "ones full figure 8": two half figure eights, around one standing
    // dancer and then the other, ending home.
    /^(\w+) (?:full|whole) figure (?:8|eight)(?: (above|below))?$/,
    (m, b) => {
      const half = { who: who(m[1]), ...(m[2] ? { around: m[2] } : {}) };
      return [call('figure-eight', b / 2, half), call('figure-eight', b / 2, half)];
    },
  ],
  [
    // "ones half figure 8 below", "twos half figure 8 above, first larks leading".
    /^(\w+) half figure (?:8|eight)(?: (above|below))?(?:,? (?:(?:first|second) )?(\w+) leading)?(.*)$/,
    (m, b) => {
      notes(
        m[4].replace(/^\s*(?:the (?:ones|twos)|down between(?: next neighbors)?)$/, ''),
        'half figure eight',
      );
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
      notes(
        m[5]
          .replace(
            /(?:,? ?(?:then )?\w+ drop out(?: at (?:home|the end)| on (?:their |the )?home side)?(?:,? \w+ stay connected)?)/,
            '',
          )
          .replace(
            /^\s*,?\s*(?:\w+ )?(?:join(?:ing)?|falling in|stepping in) behind (?:your |their )?partners?\b.*$/,
            '',
          ),
        'star',
      );
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
    /^(balance (?:&|and) )?petronella(?: \*?(left|right)\*?)?(?: turn\b)?(?: (?:–|-)? ?(?:move |spin (?:left|right) |twirl |slide right )?(?:one|1|(two|2|1½|1&½|1 1\/2)) places?(?: (?:to (?:the )?)?(right|left))?(?: instead of one)?)?(?: moving (two) places| x(2))?(.*)$/,
    (m, b) => {
      notes(
        m[7]
          .replace(/^,? ?(?:spin (?:left|right)|overspin)\b/, '')
          .replace(/^\s*,?\s*(?:a )?“?petronella-nella”?\.?$/, ''),
        'petronella',
      );
      const direction = m[2] ?? m[4];
      const many = m[3] ?? m[5] ?? m[6];
      const places = many ? (/^(?:two|2)$/.test(many) ? 2 : 1.5) : 1;
      const turn = {
        ...(direction === 'left' ? { direction: 'left' } : {}),
        ...(places !== 1 ? { places } : {}),
      };
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
    /^(\w+) roll away ((?:next |new |\d\w* )?\w+)(?: (?:with )?a? ?half[- ]sashay)?(?: (?:roll )?(?:from )?(?:left to right|right to left))?(?: \*?(across|along|alone|up and down)\*?(?: the)?(?: set)?)?(?: (?:on|as|while) (?:the )?(?:way|lines?|long lines) (?:back|go back)(?: up)?| backing up| while walking back)?(.*)$/,
    (m, b) => {
      notes(m[4], 'roll away');
      const axis = m[3] === 'up and down' || m[3] === 'alone' ? 'along' : m[3];
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
    /^(?:((?:next |new |prev |previous |same |\d\w* )*\w+) )?(pass|pull) by (right|left)(?: shoulders?| hands?)?(?: (?:straight )?(across|along)(?: the)?(?: set)?)?(?: in (?:the )?center)?(?: (?:with |w\/ ?)(?:your )?(partners?|neighbors?|shadows?))?(.*)$/,
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

/**
 * A short motion some rows add after their figure: "; robins turn back
 * over right shoulder", "robins turn around", "and pass thru to new
 * neighbors". It takes the last two beats (a quarter of a short row).
 */
const TAILS: readonly (readonly [RegExp, (m: RegExpMatchArray) => Omit<FigureCall, 'beats'>])[] = [
  [
    /[,;]?\s*(?:then |and )?(?:let go and )?(?:(\w+) )?turns? (?:turn )?(?:to face back in|(?:back|around|out)(?: in)?(?: over (?:their |your )?(right|left) shoulders?)?|over (?:their |your )?(right|left) shoulders?)(?: to face (?:back in|\w+(?: \w+)?))?$/,
    (m) => ({
      move: 'turn-back',
      params: {
        ...(m[1] ? { who: who(m[1]) } : {}),
        ...(m[2] || m[3] ? { shoulder: m[2] ?? m[3] } : {}),
      },
    }),
  ],
  [
    /[,;]?\s*(?:and |then )?pass th(?:ru|rough)(?: (?:to|across) .*)?$/,
    () => ({ move: 'pass-through', params: { shoulder: 'right' } }),
  ],
];

/**
 * Every pattern, also read with a trailing motion (TAILS) split off when
 * the row as a whole does not read: the figure first, then that motion.
 */
export const WEAVE_PATTERNS: readonly (readonly [RegExp, Build])[] = PATTERNS.map(
  ([pattern, build]) =>
    [
      pattern,
      (m: RegExpMatchArray, beats: number) => {
        try {
          return build(m, beats);
        } catch (error) {
          for (const [tail, make] of TAILS) {
            const t = m[0].match(tail);
            if (!t || !t.index) continue;
            const head = m[0].slice(0, t.index).trim().match(pattern);
            if (!head) continue;
            let extra: Omit<FigureCall, 'beats'>;
            try {
              extra = make(t);
            } catch {
              continue;
            }
            const tb = Math.min(2, beats / 4);
            const own = build(head, beats - tb);
            // A turn with no one named is done by whoever the row named.
            const named = own.at(-1)?.params.who;
            if (
              extra.move === 'turn-back' &&
              !extra.params.who &&
              (named === 'larks' || named === 'robins' || named === '1s' || named === '2s')
            )
              extra = { ...extra, params: { ...extra.params, who: named } };
            return [...own, { ...extra, beats: tb }];
          }
          throw error;
        }
      },
    ] as const,
);
