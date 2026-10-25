/**
 * Row patterns for squares (see parse-more.ts): heads and sides figures
 * danced in the middle, corners, promenade home.
 *
 * Several rows are a contra row with square wording around it ("first
 * corners allemande left once", "star right 4 places (heads)"); those
 * strip the wording and parse the rest as an ordinary row (parse.ts).
 */
import type { FigureCall } from './figure.ts';
import { call, type Pattern } from './parse-more.ts';
import { parseRow } from './parse.ts';
import { canonical } from './roles.ts';
import { MIDDLE_MOVES } from '../figures/square/middle-moves.ts';

/** Parse a contra row inside a square row; the calls without labels. */
function inner(text: string, beats: number): FigureCall[] {
  return parseRow({ beats, text }).map((c) => ({ move: c.move, beats: c.beats, params: c.params }));
}

const COUPLES: Readonly<Record<string, string>> = {
  heads: 'heads',
  'head couples': 'heads',
  'end couples': 'heads',
  head: 'heads',
  h: 'heads',
  sides: 'sides',
  'side couples': 'sides',
  side: 'sides',
};
const Q = '(heads|sides|head couples|side couples|end couples|h)';
/** "heads (sides) ...", "head couples, ... (side couples)": the first time through names the heads. */
const LEADING = new RegExp(
  `^${Q}(?: (?:heads|sides|s|head couples|side couples))?,? (.+?)(?: (?:heads|sides|head couples|side couples))?$`,
);
const TRAILING = new RegExp(`^(.+?),? (?:with |for )?(?:the )?${Q}(?: only)?$`);
/** "head ladles chain across": one role of the head couples. */
const ROLE = /^(head|side) ((?:ladles|ladies|robins|gents|gentlespoons|larks) .+)$/;

function namedCouples(text: string): { among: string; rest: string } {
  const m = text.match(LEADING) ?? text.match(ROLE);
  if (m) return { among: COUPLES[m[1]], rest: m[2] };
  const t = text.match(TRAILING);
  if (t) return { among: COUPLES[t[2]], rest: t[1] };
  throw new Error(`No couples named in "${text}".`);
}

/** "along the set right left through", "promenade across": contra wording for two couples. */
const contraWording = (rest: string) =>
  rest
    .replace(/^(?:along|across) the set /, '')
    .replace(/^promenade across(?: the set)?$/, 'partners promenade across')
    .replace(/ chain across$/, ' chain');

/** Heads or sides dance a figure: in the middle when it is a figure for two couples. */
function couplesFigure(text: string, beats: number): FigureCall[] {
  const named = namedCouples(text);
  const calls = inner(contraWording(named.rest), beats);
  const among = [named.among];
  if (calls.length === 1 && MIDDLE_MOVES.has(calls[0].move)) {
    const { among: _a, ...params } = calls[0].params as Record<string, unknown>;
    return [call('square-middle', calls[0].beats, { move: calls[0].move, params, among })];
  }
  return calls.map((c) => ({ ...c, params: { ...c.params, among } }));
}

/** A neighbors figure danced with someone else ("opposites"). */
function withWho(text: string, beats: number, who: string): FigureCall[] {
  const calls = inner(text, beats);
  if (!calls.every((c) => (c.params as { who?: unknown }).who === 'neighbor'))
    throw new Error('Only a figure for two names who to dance with.');
  return calls.map((c) => ({ ...c, params: { ...c.params, who } }));
}

/** A neighbors figure danced with the robin beside each lark, by place. */
function besideCall(text: string, beats: number, side: 'left' | 'right'): FigureCall[] {
  return inner(text, beats).map((c) => {
    const { who, ...params } = c.params as Record<string, unknown>;
    if (who !== 'neighbor') throw new Error('Only a figure for two names who to dance with.');
    return call('beside', c.beats, { move: c.move, side, params });
  });
}

const ROLES = '(ladles|ladies|lady|ladle|robins|robin|gentlespoons|gentlespoon|gents|gent|larks|lark)';
const roleName = (w: string) => canonical(w === 'ladies' ? 'ladles' : w);

const NUMBERS: Readonly<Record<string, number>> = { one: 1, two: 2, three: 3, four: 4 };

const PAIR =
  '(allemande .+|do si do .+|see saw .+|(?:long |meltdown )?swing|balance (?:&|and) swing|pull by .+|pass by .+|balance|gyre .+)';

export const SQUARE_PATTERNS: readonly Pattern[] = [
  [
    // Teaching: "identify partners, neighbors, opposites". Everyone stands.
    /^identify (?:your )?(?:partners?|corners?|neighbors?|opposites?)(?:(?:,| and| &)+ (?:partners?|corners?|neighbors?|opposites?))*$/,
    (_m, b) => [call('still', b, { action: 'stand' })],
  ],
  [
    /^(?:partners |all |everyone )?promenade(?: (?:along the set on the right|around the set|around the ring|counterclockwise|ccw|anticlockwise))?(?: (?:to )?home)(?: (?:half-?way|half way)(?: around)?)?$|^(?:partners |all )?promenade (?:along the set on the right|around the set)$/,
    (_m, b) => [call('promenade-home', b, { who: 'partner' })],
  ],
  [
    // "circle left 2 places (whole square)": everyone, as the row says without it.
    /^((?:circle|star|forward|into) .+?),? (?:the )?whole (?:square|set)$/,
    (m, b) => inner(m[1], b),
  ],
  [
    /^(?:partners |all )?promenade (?:anticlockwise|counterclockwise|ccw) once(?: around)?$/,
    (_m, b) => [call('ring-promenade', b, { who: 'partner', amount: 1 })],
  ],
  [
    // Until partners meet: halfway round a square (grand-meet.ts).
    /^(?:grand right (?:and |& )?left|right (?:and |& )?left grand|grand right left|right left grand)(?:,? (?:halfway(?: around)?|half way around|(?:to |until you )?meet (?:your )?partners?))?$/,
    (_m, b) => [call('grand-meet', b, { hand: 'right' })],
  ],
  [
    // "all four ladles grand chain", "four ladies chain across".
    /^(?:all )?(?:four |4 )?(ladles|ladies|robins|gents|gentlespoons|larks) (?:grand chain|chain across|chain (?:across )?(?:to )?(?:the )?opposites?)$|^(?:all )?(?:four |4 )(ladles|ladies|robins|gents|gentlespoons|larks) chain$/,
    (m, b) => {
      const role = canonical(m[1] ?? m[2]);
      return [call('grand-chain', b, { who: role })];
    },
  ],
  [
    // Weave the ring: the same walk without hands (drawn with the ring's grand right and left).
    /^weave the ring(?:,? (?:halfway(?: around)?|(?:to |until you )?meet (?:your )?partners?))?$/,
    (_m, b) => [call('grand-meet', b, { hand: 'right' })],
  ],
  [
    // "first corners allemande left once": corners are neighbors in a square.
    new RegExp(`^(?:first |1st )?corners? ${PAIR}$`),
    (m, b) => inner(`neighbors ${m[1]}`, b),
  ],
  [
    // "neighbors allemande left once (corners)", "neighbors swing (corner)".
    new RegExp(`^(neighbors ${PAIR}),? (?:with )?(?:your )?(?:first )?corners?$`),
    (m, b) => inner(m[1], b),
  ],
  [
    // "next neighbors swing (next corner)": the robin now on the lark's left.
    new RegExp(`^next neighbors ${PAIR},? (?:with )?(?:your )?next (?:next )?corners?$`),
    (m, b) => besideCall(`neighbors ${m[1]}`, b, 'left'),
  ],
  [
    // "3rd neighbors swing ("that other gentlespoon")", "swing the one you meet":
    // the robin who has just come to stand in the lark's partner place.
    new RegExp(
      `^neighbors ${PAIR},? "?(?:that other (?:gentlespoons?|larks?|gents?|ladles?|robins?|ladies|lady)|the one you meet|the one beside you)"?$`,
    ),
    (m, b) => besideCall(`neighbors ${m[1]}`, b, 'right'),
  ],
  [
    // "2nd neighbors swing (opposites, but not in opposite place)".
    new RegExp(`^neighbors ${PAIR},? (?:with )?(?:your )?opposites?(?:,? .*)?$`),
    (m, b) => withWho(`neighbors ${m[1]}`, b, 'opposite'),
  ],
  [
    new RegExp(`^opposites? ${PAIR}$`),
    (m, b) => withWho(`neighbors ${m[1]}`, b, 'opposite'),
  ],
  [
    // "star right 3 places ladles": the four of one role, from their places.
    /^((?:star|circle) .+?),? (?:all four |the )?(ladles|ladies|robins|gents|gentlespoons|larks)(?: only)?$/,
    (m, b) => {
      const role = canonical(m[2] === 'ladies' ? 'ladles' : m[2]);
      const calls = inner(m[1], b);
      // A star of the four of one role turns in the middle (role-star.ts).
      return calls.map((c) => {
        const p = c.params as { hand?: string; places?: number; grip?: string };
        if (c.move === 'star' && p.places !== undefined && !p.grip)
          return call('role-star', c.beats, { who: role, hand: p.hand, amount: p.places / 4 });
        return { ...c, params: { ...c.params, among: [role] } };
      });
    },
  ],
  // Texas Star (star-wheel.ts, role-star.ts).
  [
    new RegExp(`^${ROLES} (?:go )?(?:to|into) the (?:center|centre|middle) (?:&|and) back(?: to the bar| out| home| again)?$`),
    (m, b) => [call('forward-back', b, { back: true, among: [roleName(m[1])] })],
  ],
  [
    new RegExp(`^${ROLES} (?:go )?(?:to|into) the (?:center|centre|middle) (?:for|with) a (right|left)[- ]hand star$`),
    (m, b) => [call('role-star', b, { who: roleName(m[1]), hand: m[2], amount: 0.5, end: 'center' })],
  ],
  [
    new RegExp(`^${ROLES} star (right|left),? (?:and )?pass (?:by )?(?:your )?partners?$`),
    (m, b) => [call('role-star', b, { who: roleName(m[1]), hand: m[2], amount: 0.75, end: 'places' })],
  ],
  [
    new RegExp(`^pick up (?:the |your )?next ${ROLES}(?: for a)?$`),
    (_m, b) => [call('still', b, { action: 'stand' })],
  ],
  [
    new RegExp(`^butterfly whirl,? (?:to )?put(?:ting)? (?:the )?${ROLES} in(?:to)? (?:the )?(?:center|centre|middle).*$`),
    (_m, b) => [call('star-whirl', b, { amount: 0.5 })],
  ],
  [/^star (right|left)$/, (m, b) => [call('star-wheel', b, { hand: m[1] })]],
  [
    // A quoted aside after a call: "partners swing "swing this ladle"".
    /^(.+?),? "[^"]*"$/,
    (m, b) => inner(m[1], b),
  ],
  [
    // "heads separate, go around two - form lines at the sides (L-L-R-R)".
    /^(heads|sides|head couples|side couples)(?: (?:heads|sides))?,? (?:separate,? (?:and )?)?go around (?:two|2)(?: (?:-|to) (?:form )?lines(?: of (?:four|4))? at the (?:sides|heads).*)?$/,
    (m, b) => [call('separate-around', b, { around: 2, end: 'lines', among: [COUPLES[m[1]]] })],
  ],
  [
    // "heads (sides) star right four places then heads (sides) separate,": the
    // separate starts the next row's going around.
    /^(heads|sides)(?: (?:heads|sides))? (star (?:right|left) \w+ places?) then (?:(?:heads|sides) )*separate,?$/,
    (m, b) => couplesFigure(`${m[1]} ${m[2]}`, b),
  ],
  // Lines of four (line-pairs.ts): roll aways and balances with the one beside you.
  [
    /^(?:two |the )?(ladles|ladies|robins|gentlespoons|gents|larks) roll away (?:same roles )?with (?:a )?half sashay.*$/,
    (m, b) => [call('line-pairs', b, { action: 'roll', pairs: canonical(m[1] === 'ladies' ? 'ladles' : m[1]) })],
  ],
  [
    /^same roles (?:roll away with (?:a )?half sashay(.*)|balance)$/,
    (m, b) => [
      call('line-pairs', b, {
        action: m[0].includes('roll away') ? 'roll' : 'balance',
        pairs: 'same-roles',
        ...(/roll left to right/.test(m[1] ?? '') ? { rolled: 'left' } : {}),
      }),
    ],
  ],
  [
    /^(?:center two roll away with (?:a )?half sashay.*|(?:gentlespoons|gents|larks) roll away neighbors with (?:a )?half sashay,? center two.*)$/,
    (_m, b) => [call('line-pairs', b, { action: 'roll', pairs: 'center' })],
  ],
  [
    /^(?:(?:everybody|everyone|all) roll away with (?:a )?half sashay.*|(?:gentlespoons|gents|larks) roll away next neighbors with (?:a )?half sashay,? corners.*)$/,
    (_m, b) => [call('line-pairs', b, { action: 'roll', pairs: 'ends' })],
  ],
  [/^neighbors balance,? center two$/, (_m, b) => [call('line-pairs', b, { action: 'balance', pairs: 'center' })]],
  [/^next neighbors balance,? corners$/, (_m, b) => [call('line-pairs', b, { action: 'balance', pairs: 'ends' })]],
  [
    // Named couples: "heads (sides) pass through and cross trail" (cross-trail.ts).
    /^pass through (?:and|&) cross trail$/,
    (_m, b) => [call('cross-trail', b, {})],
  ],
  // Monkey in the middle (cascade-swing.ts).
  [
    /^(?:the )?monkey(?: in the middle)? swings? (?:one|1)(?: person)?(?: at random)?$/,
    (_m, b) => [call('cascade-swing', b, { pairs: 1 })],
  ],
  [
    /^those two(?: people)? swing two more(?: people)?(?: at random)?$/,
    (_m, b) => [call('cascade-swing', b, { pairs: 2 })],
  ],
  [
    /^those four(?: people)? swing four more(?: people)?(?: at random)?(?:,? (?:sending (?:a )?)?new monkey (?:to|in) the middle)?$/,
    (_m, b) => [call('cascade-swing', b, { pairs: 4 })],
  ],
  [
    // "one from each couple forward and back": the robins (a reading).
    /^one from each couple (?:go )?(forward (?:and|&) back|into the (?:middle|center) (?:and|&) back)$/,
    (_m, b) => [call('forward-back', b, { back: true, among: ['robins'] })],
  ],
  [
    // "other four star right", "same four star left": a star of those four in
    // the middle, from their places and back to places (once round unless
    // places are named). import.ts names them from the row before.
    /^(other|same) four star (right|left)(?: (\w+) places?)?$/,
    (m, b) => {
      const places = m[3] ? (NUMBERS[m[3]] ?? Number(m[3])) : 4;
      return [call('role-star', b, { hand: m[2], amount: places / 4, among: [m[1] === 'same' ? '@same' : '@other'] })];
    },
  ],
  [
    // "circle left 4 places same four": the dancers the row before named
    // (import.ts fills in '@same'), in the middle when two couples.
    /^(.+?),? (?:the )?same four$/,
    (m, b) => {
      const calls = inner(m[1], b);
      const among = ['@same'];
      if (calls.length === 1 && MIDDLE_MOVES.has(calls[0].move)) {
        const { among: _a, ...params } = calls[0].params as Record<string, unknown>;
        return [call('square-middle', calls[0].beats, { move: calls[0].move, params, among })];
      }
      return calls.map((c) => ({ ...c, params: { ...c.params, among } }));
    },
  ],
  [
    // Heads or sides: "star right 4 places (heads)", "heads (sides) right left through".
    /^(?:heads|sides|head couples|side couples|end couples|h)\b.+|.+\b(?:heads|sides|head couples|side couples|end couples)(?: only)?$|^(?:head|side) (?:ladles|ladies|robins|gents|gentlespoons|larks) .+$/,
    (m, b) => couplesFigure(m[0], b),
  ],
];
