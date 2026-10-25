/**
 * Row patterns for ECD-style whole sets (triplets, longways sets of four to
 * six couples): casts, travel along the middle (sashay, lead, promenade to
 * the bottom), whole-set circles, stars with no places, two-hand turns,
 * contra corners and cast-and-arch figures (see figures/ecd/).
 *
 * Couples are named by place: "ones", "1s", "couple 1", "top couple".
 */
import { call, type Pattern } from './parse-more.ts';

/** Words naming one couple. */
const COUPLE =
  '(?:the )?(?:ones|twos|threes|fours|1s|2s|3s|4s|1st couple|2nd couple|3rd couple|first couple|second couple|third couple|top couple|bottom couple|couple [1-4]|#[1-4]s)';

const LABELS: Readonly<Record<string, string>> = {
  ones: '1s',
  twos: '2s',
  threes: '3s',
  fours: '4s',
  'first couple': '1s',
  'second couple': '2s',
  'third couple': '3s',
  '1st couple': '1s',
  '2nd couple': '2s',
  '3rd couple': '3s',
  'top couple': 'top',
  'bottom couple': 'bottom',
};

/** Canonical label for a couple named in a row. */
export function coupleLabel(text: string): string {
  const t = text.replace(/^the /, '');
  const n = t.match(/^(?:couple |#)([1-4])s?$/);
  if (n) return `${n[1]}s`;
  if (/^[1-4]s$/.test(t)) return t;
  const label = LABELS[t];
  if (!label) throw new Error(`Unknown couple "${text}".`);
  return label;
}

const PLACE: Readonly<Record<string, number>> = {
  second: 2,
  '2nd': 2,
  third: 3,
  '3rd': 3,
  fourth: 4,
  '4th': 4,
};

/** "..., twos move up", "others move up", "all move up" (said, or implied). */
const MOVE_UP = `(?:,? (?:and |while )?(?:${COUPLE}(?: (?:and|&) ${COUPLE})?|others|the others|all others|everyone else|all|everybody else) move up)?`;

export const ECD_PATTERNS: readonly Pattern[] = [
  [
    // "1s cast, 2s move up", "couple 1 cast down one place, couple 2 move up".
    new RegExp(
      `^(${COUPLE}) cast(?: off| down| alone)?(?: (?:one|1) (?:place|couple))?${MOVE_UP}$`,
    ),
    (m, b) => [call('cast', b, { who: coupleLabel(m[1]), places: 1 })],
  ],
  [
    // "1s cast to bottom, others move up", "top couple cast off to bottom, all move up".
    new RegExp(
      `^(${COUPLE}) (?:separate,? )?cast(?: off| down| alone)?(?:,? walk down)? to (?:the )?bottom(?: of the set)?${MOVE_UP}$`,
    ),
    (m, b) => [call('cast', b, { who: coupleLabel(m[1]), to: 'bottom' })],
  ],
  [
    // "ones cast to second position, twos move up".
    new RegExp(
      `^(${COUPLE}) cast(?: off| down)? to (second|third|fourth|2nd|3rd|4th) (?:position|place)${MOVE_UP}$`,
    ),
    (m, b) => [call('cast', b, { who: coupleLabel(m[1]), to: PLACE[m[2]] })],
  ],
  [
    // "top couple sashay down & up & down, everyone else move up".
    new RegExp(`^(${COUPLE}) sashay down (?:&|and) up (?:&|and) down${MOVE_UP}$`),
    (m, b) => [
      call('center-travel', b, {
        who: coupleLabel(m[1]),
        style: 'sashay',
        legs: ['bottom', 'top', 'bottom'],
      }),
    ],
  ],
  [
    // "Top couple sashay down and back", "top couple sashay down the middle & back".
    new RegExp(
      `^(${COUPLE}) (sashay|lead) down(?: the (?:middle|center|centre))? (?:&|and) back(?: up)?$`,
    ),
    (m, b) => [
      call('center-travel', b, {
        who: coupleLabel(m[1]),
        style: m[2] === 'lead' ? 'lead' : 'sashay',
        legs: ['down', 'top'],
      }),
    ],
  ],
  [
    // "ones sashay down the center to the bottom".
    new RegExp(
      `^(${COUPLE}) sashay down(?: the (?:middle|center|centre))? to (?:the )?bottom(?: of the set)?${MOVE_UP}$`,
    ),
    (m, b) => [
      call('center-travel', b, { who: coupleLabel(m[1]), style: 'sashay', legs: ['bottom'] }),
    ],
  ],
  [
    // "ones down the center sashay", "ones up the center sashay".
    new RegExp(`^(${COUPLE}) (down|up) the (?:middle|center|centre),? sashay$`),
    (m, b) => [
      call('center-travel', b, { who: coupleLabel(m[1]), style: 'sashay', legs: [m[2]] }),
    ],
  ],
  [
    // "top couple promenade to the bottom of the set, everyone else move up".
    new RegExp(
      `^(${COUPLE}) (?:promenade|lead|walk) (?:down )?(?:the (?:middle|center|centre) )?to (?:the )?bottom(?: of the set)?${MOVE_UP}$`,
    ),
    (m, b) => [
      call('center-travel', b, { who: coupleLabel(m[1]), style: 'lead', legs: ['bottom'] }),
    ],
  ],
  [
    /^(?:whole set circle|oval|all circle|circle all|big circle) (left|right)$/,
    (m, b) => [call('set-circle', b, { direction: m[1] })],
  ],
  [/^star (right|left)$/, (m, b) => [call('star-around', b, { hand: m[1] })]],
  [
    /^(partners?) (?:two[- ]hand(?:ed)? turn|turn two hands?|swing two hands?)(?: (once|twice|1½|1 1\/2))?$/,
    (m, b) => [
      call('two-hand-turn', b, {
        who: 'partner',
        amount: m[2] === 'twice' ? 2 : m[2] && m[2] !== 'once' ? 1.5 : 1,
      }),
    ],
  ],
  [
    // "ones contra corners", "twos contra corners (actives)".
    new RegExp(`^(${COUPLE}) (?:turn )?contra corners(?: actives)?$`),
    (m, b) => [call('contra-corners', b, { who: coupleLabel(m[1]) })],
  ],
  [
    // "peel the banana #1s cast to bottom and form arch while others follow ...".
    new RegExp(`^peel the banana(?: (${COUPLE})(?: .*)?)?$`),
    (m, b) => [call('peel', b, { who: m[1] ? coupleLabel(m[1]) : 'top', part: 'all' })],
  ],
  [
    // "ones down the outsides, followed by twos threes fours", "top couple
    // cast off, make an arch at the bottom of the set" (the others follow).
    new RegExp(
      `^(${COUPLE}) (?:down the outsides?,? followed by .*|cast off,? (?:others|everyone|all) follow(?:ing)?|cast off,? (?:and )?make an arch at the bottom(?: of the set)?)$`,
    ),
    (m, b) => [call('peel', b, { who: coupleLabel(m[1]), part: 'cast' })],
  ],
  [
    // A zero-beat "ones form an arch": the cast before it made the arch.
    new RegExp(`^(${COUPLE}) (?:form|make) an arch$`),
    (_m, b) => {
      if (b) throw new Error('Forming the arch takes no beats of its own here.');
      return [];
    },
  ],
  [
    // "twos up the center under the arch, followed by threes fours",
    // "everyone else go through the arch".
    new RegExp(
      `^(?:(${COUPLE}) up the (?:middle|center|centre) under the arch,? followed by .*|everyone else go through the arch(?:es)?|all (?:the )?others go (?:up )?through the arch)$`,
    ),
    (_m, b) => [call('peel', b, { who: 'bottom', part: 'through' })],
  ],
  [
    new RegExp(`^(${COUPLE}) strip the willow$`),
    (m, b) => [call('strip-the-willow', b, { who: coupleLabel(m[1]) })],
  ],
  [
    // "ones go down the outside into the twos' place, twos move up".
    new RegExp(
      `^(${COUPLE}) (?:separate and )?go down the outsides? into the (twos|threes|fours|2s|3s|4s)'? place${MOVE_UP}$`,
    ),
    (m, b) => [call('cast', b, { who: coupleLabel(m[1]), places: 1 })],
  ],
  [
    // "ones up the center and cast alone to the bottom", "ones up the center
    // cast round the outside and down to the bottom, threes move up".
    new RegExp(
      `^(${COUPLE}) up the (?:middle|center|centre),? (?:and )?cast(?: alone| off)?(?: round the outside and down)? to (?:the )?bottom${MOVE_UP}$`,
    ),
    (m, b) => [call('cast', b, { who: coupleLabel(m[1]), to: 'bottom', via: 'center' })],
  ],
];
