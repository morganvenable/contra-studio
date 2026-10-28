/**
 * Row patterns for ECD-style whole sets (triplets, longways sets of four to
 * six couples): casts, travel along the middle (sashay, lead, promenade to
 * the bottom), whole-set circles, stars with no places, two-hand turns,
 * contra corners and cast-and-arch figures (see figures/ecd/).
 *
 * Couples are named by place: "ones", "1s", "couple 1", "top couple".
 */
import { call, type Pattern } from './parse-more.ts';
import { canonical } from './roles.ts';

/** "ladles", "robins" ... -> "larks" or "robins". */
const roleWord = (word: string) => {
  const c = canonical(word);
  if (c !== 'larks' && c !== 'robins') throw new Error(`Unknown role "${word}".`);
  return c;
};

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

/** One or two couples named together: "ones", "ones & twos". */
const ONE = '(?:ones|twos|threes|fours|1s|2s|3s|4s)';
const GROUP = `${ONE}(?: (?:&|and) ${ONE})?`;
const couples = (text: string) => text.split(/ (?:&|and) /).map(coupleLabel);
const AMOUNTS: Readonly<Record<string, number>> = {
  once: 1,
  twice: 2,
  '½': 0.5,
  '¾': 0.75,
  '1½': 1.5,
  '1¼': 1.25,
};
const AMOUNT = Object.keys(AMOUNTS).join('|');

const WORDS: Readonly<Record<string, number>> = { four: 4, six: 6, eight: 8 };

/** "..., twos move up", "others move up", "all move up" (said, or implied). */
const MOVE_UP = `(?:,? (?:and |while )?(?:${COUPLE}(?: (?:and|&) ${COUPLE})?|others|the others|all others|everyone else|all|everybody else) move up)?`;

export const ECD_PATTERNS: readonly Pattern[] = [
  [
    // "1s cast, 2s move up", "couple 1 cast down one place, couple 2 move up",
    // "ones cast down one couple to long lines along" (Money Musk: the cast
    // ends in the middle of the side lines, facing across).
    new RegExp(
      `^(${COUPLE}) cast(?: off| down| alone)?(?: (?:one|1) (?:place|couple))?(?: (?:in)?to long lines(?: along)?)?${MOVE_UP}$`,
    ),
    (m, b) => [call('cast', b, { who: coupleLabel(m[1]), places: 1 })],
  ],
  [
    // "ones allemande right ¾ into short lines across" (Money Musk): the
    // ones turn into the middle of lines of three across the set.
    new RegExp(`^(${COUPLE}) (?:allemande|turn) (right|left)(?: hand)? (?:¾|3/4|three quarters?) (?:in)?to (?:short )?lines(?: of three)? across$`),
    (m, b) => [
      call('lines-turn', b, { who: coupleLabel(m[1]), hand: m[2], amount: 0.75, to: 'lines' }),
    ],
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
  // Three face three (trios).
  [
    // "partners long swing (three-person basket)", "basket swing partners".
    /^(?:partners (?:long )?swing,? (?:three-person basket|throuples|as throuples|as trios)|basket swing partners|partners basket swing|trios basket swing)$/,
    (_m, b) => [call('trio-basket', b, {})],
  ],
  [
    // "neighbors do si do 1½ (as throuples)": every neighbor pair at once, lines keeping hands.
    /^neighbors do si do (once|1½|1 1\/2|twice) (?:as throuples|as trios)$/,
    (m, b) => [
      call('do-si-do', b, {
        who: 'neighbor',
        amount: m[1] === 'once' ? 1 : m[1] === 'twice' ? 2 : 1.5,
        shoulder: 'right',
      }),
    ],
  ],
  [
    /^centers on the (right|left),? (right|left) (?:elbow|hand|arm) turn(?: (?:once|(?:right|left) hand partner))*$/,
    (m, b) => [call('trio-turn', b, { side: m[1], hand: m[2], amount: 1 })],
  ],
  [
    // "same roles long swing (your opposite)".
    /^same roles (?:long )?swing,? (?:your )?(?:opposite|neighbor)s?$/,
    (_m, b) => [call('place-swing', b, { who: 'neighbor' })],
  ],
  [
    // 'neighbors do si do once "ends do-si-do your opposite"'.
    /^neighbors (do si do once|swing) "(ends|middles|centers) (?:do-si-do|do si do|swing) your opposite"$/,
    (m, b) => [
      m[1] === 'swing'
        ? call('place-swing', b, { who: 'neighbor', among: [m[2] === 'ends' ? 'outsides' : 'centers'] })
        : call('do-si-do', b, {
            who: 'neighbor',
            amount: 1,
            shoulder: 'right',
            among: [m[2] === 'ends' ? 'outsides' : 'centers'],
          }),
    ],
  ],
  [/^pass through to (?:a )?new lines?(?: of (?:3|three))?$/, (_m, b) => [call('pass-through', b, { shoulder: 'right' })]],
  [
    // "ones & twos allemande left neighbor once, threes allemande left partner once".
    new RegExp(`^(${GROUP}) allemande (left|right) (neighbor|partner)s? (${AMOUNT}),? (${GROUP}) allemande (left|right) (neighbor|partner)s? (${AMOUNT})$`),
    (m, b) => [
      call('together', b, {
        parts: [
          { move: 'allemande', params: { who: m[3], hand: m[2], amount: AMOUNTS[m[4]], among: couples(m[1]) } },
          { move: 'allemande', params: { who: m[7], hand: m[6], amount: AMOUNTS[m[8]], among: couples(m[5]) } },
        ],
      }),
    ],
  ],
  [
    // "right left through at the top", "right left through, top couples only",
    // "right left through, ones and twos only, arm around turn preferred".
    /^right left through,? (?:at the top|top couples only|(?:with )?(?:the )?top two couples|ones and twos only)(?:,? arm around turn preferred)?$/,
    (_m, b) => [call('right-left-through', b, { among: ['1s', '2s'] })],
  ],
  [
    // After a qualifier is lifted ("ones and twos allemande right 1½"): partners.
    new RegExp(`^allemande (left|right) (${AMOUNT})$`),
    (m, b) => [call('allemande', b, { who: 'partner', hand: m[1], amount: AMOUNTS[m[2]] })],
  ],
  [
    // "parallel heys for three - robins 1 pass robins 2, larks 1 pass larks 3 by right shoulders to start".
    /^parallel heys for three - (\w+) ([1-4]) pass \w+ ([1-4]),? (?:and )?(\w+) ([1-4]) pass \w+ ([1-4]) by (right|left) shoulders?(?: to start)?$/,
    (m, b) => [
      call('hey-for-three', b, {
        lines: [
          { who: roleWord(m[1]), active: `${m[2]}s`, first: `${m[3]}s` },
          { who: roleWord(m[4]), active: `${m[5]}s`, first: `${m[6]}s` },
        ],
        shoulder: m[7],
      }),
    ],
  ],
  [
    // "dip and dive, 6 changes - inside couple arch ...", "dip and dive six
    // center couple arches, face up to start", "Dip and dive, 1's starting
    // under arch formed by 2's, until everyone back home".
    /^dip and dive,? (?:(\d+|six|four|eight) changes? - (?:inside|middle|center) couple arch(?:es)?|(six|4|6) (?:center|middle|inside) couple arch(?:es)?)(?:,? .*)?$/,
    (m, b) => [
      call('dip-and-dive', b, {
        changes: WORDS[m[1] ?? m[2]] ?? Number(m[1] ?? m[2]),
        arch: 'middle',
        down: ['1s'],
      }),
    ],
  ],
  [
    /^dip and dive,? ([1-4])'?s starting under (?:the )?arch formed by ([1-4])'?s,? until everyone (?:is )?back home$/,
    (m, b) => [call('dip-and-dive', b, { changes: 'home', arch: `${m[2]}s`, down: [`${m[1]}s`] })],
  ],
  [
    new RegExp(`^(${COUPLE}) cross(?: over)?(?: the set)?(?: by (right|left) shoulders?)?$`),
    (m, b) => [call('cross', b, { who: coupleLabel(m[1]), shoulder: m[2] ?? 'right' })],
  ],
  [
    // "ones cross over and cast down below twos, twos shift up ...": half the beats each.
    new RegExp(`^(${COUPLE}) cross over and cast (?:down )?below (?:the )?(?:twos|2s),? (?:twos|2s) (?:shift|move) up.*$`),
    (m, b) => [
      call('cross', b / 2, { who: coupleLabel(m[1]) }),
      call('cast', b / 2, { who: coupleLabel(m[1]), places: 1 }),
    ],
  ],
  [
    // "cloverleaf turn single (face to face with partners) to face next neighbors".
    /^cloverleaf turn (?:a )?single,? (?:face to face with (partners|neighbors)|towards? (partners|neighbors))(?: to face next neighbors| and take inside hands)?$/,
    (m, b) => [call('turn-single', b, { toward: (m[1] ?? m[2]).replace(/s$/, '') })],
  ],
  [
    new RegExp(`^(${COUPLE}) set to (first|second) corners?$`),
    (m, b) => [call('set-to-corner', b, { who: coupleLabel(m[1]), corner: m[2] })],
  ],
  [/^neighbors (?:two[- ]hand(?:ed)? swing|swing,? two[- ]hand(?:ed)? swing)$/, (_m, b) => [call('place-swing', b, { who: 'neighbor' })]],
  [
    /^neighbors do si do once,? (?:the person(?: opposite)?|your opposite)$/,
    (_m, b) => [call('do-si-do', b, { who: 'neighbor', amount: 1, shoulder: 'right' })],
  ],
  [
    /^opposite(?: neighbors?)? two[- ]hand(?:ed)? turn(?: once)?(?:,? end in original places?)?$/,
    (_m, b) => [call('two-hand-turn', b, { who: 'neighbor', amount: 1 })],
  ],
  [
    /^lines of (?:three|3) forward (?:&|and) back,? (?:up (?:&|and) down|along the hall)$/,
    (_m, b) => [call('forward-back', b, { back: true })],
  ],
];
