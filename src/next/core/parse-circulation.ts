/**
 * More ContraDB wording for circles, chains, right and left throughs,
 * square throughs, promenades, mad robins, slides and slices, and the
 * looser reading of rows that carry notes or name two figures.
 *
 * Two parts, both used only by parse.ts:
 * - CIRCULATION_PATTERNS: plain patterns, tried after parse.ts's own table.
 * - looseCalls: for a row no pattern matches, drop notes that do not change
 *   the motion ("dance starts with this couple", "to new neighbors",
 *   footnote marks) and split rows that name two figures ("circle left 2
 *   places and roll neighbor across"), each part matched by the full table.
 *
 * Every reading that is a choice is listed in docs/figure-readings.md.
 * No imports from parse.ts, so the two modules never load in a cycle.
 */
import type { FigureCall } from './figure.ts';
import { canonical } from './roles.ts';

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];
type Match = (text: string, beats: number) => FigureCall[] | undefined;

const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});
const NUMBERS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};
const count = (word: string) => NUMBERS[word] ?? Number(word);
const who = (word: string) => {
  const w = canonical(word.replace(/^(?:next|new) /, ''));
  if (!w) throw new Error(`Unknown dancers "${word}".`);
  return w;
};
const one = (word: string) => who(word).replace(/s$/, '') as string;

/** Pull bys of a square through: "neighbors pull by right". */
const PULL = /(?:next |new )?(\w+) (?:balance (?:&|and) )?pull by (right|left)/;

export const CIRCULATION_PATTERNS: readonly (readonly [RegExp, Build])[] = [
  [
    // "single-file circle left 2 places", "circle left 3 places single file"
    /^(?:single[- ]file )?circle (left|right) (\w+) places?,? single[- ]file$|^single[- ]file circle (left|right) (\w+) places?$/,
    (m, b) => [
      call('circle', b, {
        direction: m[1] ?? m[3],
        places: count(m[2] ?? m[4]),
        singleFile: true,
      }),
    ],
  ],
  [
    // "circle left 1 place (single file promenade)": a single-file ring.
    /^circle (left|right) (\w+) places? single[- ]file promenade$/,
    (m, b) => [call('circle', b, { direction: m[1], places: count(m[2]), singleFile: true })],
  ],
  [
    // "ladles left-hand chain (to partner)", "gentlespoons chain pull by left".
    /^(\w+) left[- ]hand chain(?: to (?:your |their )?(partners?|neighbors?))?$|^(\w+) chain,? (?:pull by left|left hand(?: chain)?)$/,
    (m, b) => [
      call('chain', b, {
        who: who(m[1] ?? m[3]),
        hand: 'left',
        ...(m[2] ? { to: one(m[2]) } : {}),
      }),
    ],
  ],
  [
    // "gentlespoons chain (right hand)", "gentlespoons right-hand chain RIGHT HAND CHAIN"
    /^(\w+) (?:right[- ]hand )?chain,? \[?right hand\]?(?: chain)?(?: - to (partners?|neighbors?))?$/,
    (m, b) => [call('chain', b, { who: who(m[1]), ...(m[2] ? { to: one(m[2]) } : {}) })],
  ],
  [
    // "ladles chain over and back", "ladles chain traditional full chain: across and back"
    /^(\w+) chain (?:over and back|across and back|traditional "?full chain"?:? across and back)$/,
    (m, b) => [
      call('chain', b / 2, { who: who(m[1]) }),
      call('chain', b / 2, { who: who(m[1]) }),
    ],
  ],
  [
    // "ladles chain back (to partners)", "ladles chain over", "ladles chain partner"
    /^(\w+) chain (?:back|over|across)(?: to (?:your |their )?(partners?|neighbors?))?$|^(\w+) chain (partners?|neighbors?)$/,
    (m, b) => [
      call('chain', b, {
        who: who(m[1] ?? m[3]),
        ...((m[2] ?? m[4]) ? { to: one(m[2] ?? m[4]) } : {}),
      }),
    ],
  ],
  [
    // "along the set right left through", "right and left through with partners"
    /^(?:along the set )?right (?:and |& )?left through(?: with (?:your )?(?:partners?|neighbors?))?(?: across(?: the)?(?: set)?)?$/,
    (_m, b) => [call('right-left-through', b, {})],
  ],
  [
    // Square through two, three or four, with or without balances: the
    // pulls alternate between the named pairs; "four" repeats the two.
    // Anything after the last pull ("and go to new neighbors") is a note.
    new RegExp(
      `^square through (two|three|four) - ${PULL.source}, then ${PULL.source}(?:, then ${PULL.source})?(?:,? then repeat)?(?:[ ,;-].*)?$`,
    ),
    (m, b) => {
      const n = NUMBERS[m[1]];
      const balance = /^square through \w+ - [\w ]*balance/.test(m[0]);
      const pulls: [string, string][] = [
        [m[2], m[3]],
        [m[4], m[5]],
        ...(m[6] ? [[m[6], m[7]] as [string, string]] : []),
      ];
      while (pulls.length < n) pulls.push(pulls[pulls.length - 2]);
      if (pulls.length > n) throw new Error(`Square through ${m[1]} names too many pulls.`);
      const balances = balance ? Math.ceil(n / 2) : 0;
      const each = (b - 4 * balances) / n;
      if (!(each >= 1)) throw new Error(`${b} beats is too short for square through ${m[1]}.`);
      return pulls.flatMap(([w, hand], i) => [
        ...(balance && i % 2 === 0
          ? [call('balance', 4, { formation: 'pair', who: who(w), hand })]
          : []),
        call('pass-by', each, { who: who(w), shoulder: hand, hands: true }),
      ]);
    },
  ],
  [
    // "mad robin ½ around, gentlespoons in front", "mad robin twice, ...",
    // "mad robin, gentlespoons in front (clockwise)". Words after the
    // direction ("mad ricochet ...", "around new neighbors") are notes.
    /^mad robins?(?: (½|1\/2|once|twice))?(?: around)?,? (\w+) in front,?(?: (?:and )?(?:(?:left|right) )?(?:around (?:new |next )?neighbors?,? )?\b(cw|ccw|clockwise|counterclockwise|counter clockwise)\b)?(?:[ ,;-].*)?$/,
    (m, b) => {
      const amount = { '½': 0.5, '1/2': 0.5, once: 1, twice: 2 }[m[1] ?? 'once'];
      const d = m[3]?.replace(/ /g, '');
      return [
        call('mad-robin', b, {
          front: who(m[2]),
          ...(d ? { direction: /^c(?:ounter|c)/.test(d) ? 'counterclockwise' : 'clockwise' } : {}),
          ...(amount !== 1 ? { amount } : {}),
        }),
      ];
    },
  ],
  [
    // "slide right along set past neighbor", "slide right along set (with neighbor)"
    /^slide (left|right) along (?:the )?set (?:past|with) (?:your )?(?:neighbors?|partners?)$/,
    (m, b) => [call('slide', b, { direction: m[1] })],
  ],
  [
    // "slice left and straight back in long lines / to new couple"
    /^(?:long lines )?slice (left|right) (?:and|&) (?:straight )?back (?:in long lines|to (?:face )?(?:a )?new couple|with neighbors and come back straight)$/,
    (m, b) => [call('slice', b, { direction: m[1], back: 'straight' })],
  ],
  [
    // "box circulate - gentlespoons cross while ladles loop right": the
    // waves are already formed (no balance in this row).
    /^box circulate - (\w+) cross while (\w+) loop (right|left)$/,
    (m, b) => [call('box-circulate', b, { cross: who(m[1]), loop: m[3] })],
  ],
  [
    // "pass through up and down": along the set.
    /^pass through (?:up (?:and|&) down|along the set)(?: the set)?$/,
    (_m, b) => [call('pass-through', b, { shoulder: 'right', axis: 'along' })],
  ],
  [
    // "gentlespoons roll neighbor across set with half sashay", "roll partner
    // along set left to right to swap": a roll away inside a ring, across or
    // along the set. Larks roll unless the source names the roller.
    /^(?:(\w+) )?roll (?:a way )?(?:with )?(?:your )?(partners?|part|neighbors?)(?: (across|along|alone)(?: the)?(?: set)?)?(?: (?:with |for )?(?:a )?(?:half|1\/2|11\/2) (?:sashay|shasy))?(?: (across|along|alone)(?: the)?(?: set)?)?(?: (?:from )?(?:left to right|right to left))?(?: (?:to )?(?:trade|swap)(?: places?)?)?$/,
    (m, b) => {
      const axis = (m[3] ?? m[4])?.replace('alone', 'along');
      return [
        call('roll', b, {
          who: m[1] ? who(m[1]) : 'larks',
          whom: m[2] === 'part' ? 'partner' : one(m[2]),
          ...(axis ? { axis } : {}),
        }),
      ];
    },
  ],
  [
    // "shift left with neighbor", "slide left to new couple", "slide left"
    /^(?:shift|shifting|slide|shift let) (left|right)(?: along (?:the )?(?:set|side))?(?: with ?(?:your )?(?:partners?|neighbors?))?(?: to (?:a )?new couple)?(?: along (?:the )?set)?$/,
    (m, b) => [call('slide', b, { direction: m[1] })],
  ],
  [
    // "gentlespoons give & take partners (gentlespoons take partners)": the
    // second half restates the first.
    /^(\w+) give (?:&|and) take (partners?|neighbors?)(?: (?:\(?\w+ )?(?:take|bring back) \w+\)?)?(?: to home side)?$/,
    (m, b) => [call('give-and-take', b, { who: who(m[1]), whom: one(m[2]) })],
  ],
  [
    // "pass partner along set (to face shadow)", "pass partner by right along set"
    /^pass (?:your )?(?:partners?|neighbors?)(?: by (?:the )?(right|left)(?: shoulders?)?)? along (?:the )?set(?: to face (?:a |your )?shadows?)?$/,
    (m, b) => [call('pass-through', b, { shoulder: m[1] ?? 'right', axis: 'along' })],
  ],
  [
    // "ladles chain left diagonal": the chain on that diagonal.
    /^(\w+) chain,? (?:on )?(?:the )?(left|right) diagonal$/,
    (m, b) => [call('chain', b, { who: who(m[1]), diagonal: m[2] })],
  ],
  [
    /^(?:long lines )?slice (left|right) (?:and|&) diagonal back$/,
    (m, b) => [call('slice', b, { direction: m[1], back: 'diagonal' })],
  ],
  [
    // "balance & box circulate - ... loop right robins cross set larks rotate
    // right": the words after the loop restate it.
    /^balance (?:&|and) box circulate - (\w+) cross while (\w+) loop (right|left)\b.+$/,
    (m, b) => [
      call('balance', 4, { formation: 'long-waves', in: who(m[1]) }),
      call('box-circulate', b - 4, { cross: who(m[1]), loop: m[3] }),
    ],
  ],
  [
    // Who a pass through or chain meets: the figure is the same.
    /^pass through with (?:your )?shadows?$/,
    (_m, b) => [call('pass-through', b, { shoulder: 'right' })],
  ],
  [
    /^(\w+) chain,? (?:to )?(?:your )?shadows?$/,
    (m, b) => [call('chain', b, { who: who(m[1]) })],
  ],
  [
    /^promenade (?:your )?(partners?|neighbors?)$/,
    (m, b) => [call('promenade', b, { who: one(m[1]) })],
  ],
  [
    // "entire set oval left", "big oval circle right": the whole set in one
    // ring, a place every two beats.
    /^(?:entire set|big|custom) oval(?: circle)? (left|right)(?: in (?:a )?large circle)?$/,
    (m, b) => [call('oval', b, { direction: m[1], places: Math.max(1, Math.round(b / 2)) })],
  ],
  [
    // "butterfly whirl moving right (along the line)", "butterfly whirl
    // (shift left to next couple)": the whirl, then a slide one place.
    /^butterfly whirl,? (?:moving|shift|and shift|slide) (left|right)(?: along the line)?(?: to (?:the )?next couple)?$/,
    (m, b) => [call('butterfly-whirl', b - 2, {}), call('slide', 2, { direction: m[1] })],
  ],
  [
    // Notes after a poussette's turn ("then left clockwise", "(current neighbors)").
    /^(half|full|whole) poussette - (\w+) pull (partners|neighbors) back,? (?:and )?then (left|right)\b.+$/,
    (m, b) => [
      call('poussette', b, {
        who: who(m[2]),
        pair: one(m[3]),
        then: m[4],
        amount: m[1] === 'half' ? 0.5 : 1,
      }),
    ],
  ],
  [
    /^circle (left|right) (\w+) places? once(?: around)?$/,
    (m, b) => [call('circle', b, { direction: m[1], places: count(m[2]) })],
  ],
  [
    /^((?:next |new )?\w+) promenade across (?:the )?set$/,
    (m, b) => [call('promenade', b, { who: who(m[1]) })],
  ],
];

/**
 * Notes that do not change the motion, removed one at a time from the end
 * of a row (or anywhere, for footnote marks) until the rest matches.
 */
const NOTES: readonly RegExp[] = [
  // A row ending "to" whose rest was a reminder ("chain (to new neighbor)").
  /\s+to$/,
  // Footnote marks and emphasis.
  /\s*(?:\[\^?\d+\]|[*‡†²¹+#]+|!+)\s*$/,
  /\s*\[(?:right hand|straight across)\]\s*$/,
  // Which couple the dance starts with, first-time variations.
  /,?\s*(?:and )?(?:the )?dance starts?(?: here| with (?:this|the same|same) coup?le?).*$/,
  /,?\s*(?:the )?first(?: time)?(?: through)?,? just .*$/,
  // Reminders about who is where.
  /,?\s*(?:all are|every ?one is|everyone is) home$/,
  /,?\s*(?:note|notice|identify|id) .*$/,
  /\s*-?\s*look away\b.*$/,
  /\s*(?:here there be progression|not part of original choreography|only if someone is there|if another couple there)$/,
  /,?\s*(?:to|until|til) (?:be )?(?:on )?(?:the )?(?:same side as|ones are above|gentlespoons are above|larks are above).*$/,
  /,?\s*(?:to|and go to) (?:a |the |your )?(?:new couple|new neighbors?|newneighbors|neighbors? (?:two|2)|original (?:places?|position)|home)$/,
  /,?\s*brings you to (?:neighbors? (?:two|2)|new neighbors?)$/,
  /,?\s*(?:and )?(?:to )?face (?:a |the )?new couple$/,
  /,?\s*with (?:your |the |this )?(?:original|new|next|current) (?:couple|neighbors?|foursome)(?:,? (?:and )?shadows?)?$/,
  /,?\s*with (?:the )?next couple$/,
  // Courtesy-turn and pass reminders already in the figure.
  /\s*[-,]\s*(?:new neighbors? )?courtesy turn(?: new neighbors?)?$/,
  /,?\s*(?:and )?(?:new neighbors? )?courtesy turn$/,
  /\s*-?\s*(?:you )?pull past (?:your )?partner$/,
  /,?\s*(?:and )?(?:end )?fac(?:e|ing) (?:your |the )?(?:partners?|neighbors?)(?: across)?$/,
  // Where on the floor, already the figure's own.
  /\s*(?:straight )?across(?: the)? set$/,
  /\s*straight across$/,
  // Chains to a shadow: the chain checks nothing about the turner's name.
  /\s+to (?:-?1st |2nd |your )?(?:shadows?|trail buddy)(?: (?:#?\d|quickly))?$/,
  /\s+(?:across )?to (?:-?1st )?shadows?$/,
  // Who the pass goes by, and gyre styling.
  /\s+(?:with|past|passing) (?:your )?(?:partners?|neighbors?)(?:;.*)?$/,
  /\s+(?:past|passing) (?:your )?shadows?$/,
  /,?\s*(?:and )?to face (?:in|across)$/,
  /,?\s+(?:gypsy|walk around|look(?:ing)? into|staring|into partner|robins turn over|larks turn over)\b.*$/,
  // Pace and styling words.
  /,?\s*(?:briskly|quickly|fast|zoomily|smush|book it|optionally|w\/o hands|without hands)$/,
  /,?\s*use a tw[a-z]*rl instead of courtesy turn$/,
  /,?\s*(?:and )?\w+ bring back (?:\w+)$/,
  // An alternative the caller may choose instead: the first one is drawn.
  /\s+or .*$/,
];

/** Separators between two figures named in one row. */
const SPLIT = /(?:,|;| -)? (?:and |& |then )?|(?:,|;) /g;

/**
 * Figures a two-figure row may split into: one of the two must be one of
 * these (the circles, chains, passes and shifts this module reads); lead-ins
 * and holds never split off.
 */
const SPLITS = new Set([
  'circle',
  'chain',
  'right-left-through',
  'promenade',
  'slide',
  'slice',
  'mad-robin',
  'gyre',
  'pass-through',
  'give-and-take',
  'box-circulate',
  'butterfly-whirl',
  'poussette',
  'roll',
  'turn-alone',
]);
const NEVER_SPLIT = new Set(['take', 'hold']);

/** Two lists of calls that may be read as one row's two figures. */
function splittable(a: readonly FigureCall[], b: readonly FigureCall[]) {
  const all = [...a, ...b];
  if (all.some((c) => NEVER_SPLIT.has(c.move))) return false;
  // A petronella is itself the shift ("balance & petronella shift right").
  if (a.some((c) => c.move === 'petronella') && b[0].move === 'slide') return false;
  return all.some((c) => SPLITS.has(c.move));
}

/** Natural beats for a figure that ends a two-figure row. */
const TAIL_BEATS: Readonly<Record<string, number>> = {
  'pass-through': 2,
  slide: 2,
  'turn-alone': 2,
};

/** Beats for the first figure of a two-figure row of `beats`. */
function firstBeats(first: FigureCall, second: FigureCall, beats: number): number {
  const tail = TAIL_BEATS[second.move];
  if (first.move === 'circle' && typeof first.params.places === 'number') {
    // Two beats a place, but at most what leaves the second figure two beats,
    // and at least what leaves it no more than eight.
    const places = first.params.places;
    return Math.min(Math.max(2 * places, beats - 8), beats - (tail ?? 2));
  }
  if (tail) return beats - tail;
  return beats / 2;
}

/**
 * A row no pattern matches, read loosely: notes dropped, or two figures
 * split. Returns undefined when that does not give a match either.
 */
export function looseCalls(text: string, beats: number, match: Match): FigureCall[] | undefined {
  const dropped = dropNotes(text, beats, match);
  if (dropped) return dropped;
  // Two figures: every split point, left to right; both parts must match
  // (the second may carry notes). The first part takes its natural share.
  for (const sep of text.matchAll(SPLIT)) {
    const left = text.slice(0, sep.index).trim();
    const right = text.slice(sep.index! + sep[0].length).trim();
    if (!left || !right) continue;
    const a = exact(left, 8, match);
    const b = a && (exact(right, 8, match) ?? dropNotes(right, 8, match));
    if (!a || !b || !splittable(a, b)) continue;
    const first = firstBeats(a[0], b[0], beats);
    if (!(first >= 1 && beats - first >= 1)) continue;
    const one = exact(left, first, match);
    const two = exact(right, beats - first, match) ?? dropNotes(right, beats - first, match);
    if (one && two) return [...one, ...two];
  }
  return undefined;
}

function exact(text: string, beats: number, match: Match) {
  try {
    return match(text, beats);
  } catch {
    return undefined;
  }
}

/**
 * Drop notes, one at a time, until the rest matches: every note is tried
 * on every shorter text (at most a few levels deep), shortest cuts last.
 */
function dropNotes(text: string, beats: number, match: Match): FigureCall[] | undefined {
  let level = [text];
  const seen = new Set(level);
  for (let depth = 0; depth < 4 && level.length; depth++) {
    const next: string[] = [];
    for (const t of level) {
      for (const note of NOTES) {
        const cut = t.replace(note, '').trim();
        if (!cut || seen.has(cut)) continue;
        seen.add(cut);
        const calls = exact(cut, beats, match);
        if (calls) return calls;
        next.push(cut);
      }
    }
    level = next;
  }
  return undefined;
}
