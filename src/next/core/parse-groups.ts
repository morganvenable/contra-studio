/**
 * Row patterns for sets not made of couples (see parse-more.ts): a ring of
 * five, a line of five, rings of trios, the 9-person mixer, the Tempest.
 * Readings are listed in docs/figure-readings.md.
 */
import { call, type Pattern } from './parse-more.ts';

export const GROUPS_PATTERNS: readonly Pattern[] = [
  [
    // "1 dancer strip the willow (left allemande someone, right allemande someone else ...)"
    /^(?:1|one|the first) (?:dancer|person) strip the willow(?: left allemande someone.*)?$/,
    (_m, b) => [call('solo-strip', b, { who: 'first', hand: 'left' })],
  ],
  [
    // "birdie in the cage (other dancers circle left around the 1)"
    /^birdie in the cage(?:,? (?:the )?other (?:dancers|people|\w+) circle (left|right)(?: around the (?:1|one|birdie))?\)*)?$/,
    (m, b) => [call('birdie-cage', b, { who: 'first', direction: m[1] ?? 'left' })],
  ],
  [/^(?:slide|step) back (?:into|to) (?:your )?place$/, (_m, b) => [call('birdie-out', b, { who: 'first' })]],
  [
    // "no.1 & no.2 allemande left 1½" (a line of five, dancers by number)
    /^no\.? ?(\d) (?:&|and) no\.? ?(\d) allemande (left|right) (½|1\/2|once|1|1½|1 1\/2|twice)$/,
    (m, b) => [
      call('allemande', b, {
        who: `no.${Math.min(+m[1], +m[2])} & no.${Math.max(+m[1], +m[2])}`,
        hand: m[3],
        amount: AMOUNT[m[4]],
      }),
    ],
  ],
  [
    // "double dolphin hey - start with no.1 passing 4&5 by left (2&3) 1 (4&5)"
    /^(?:double )?dolphin hey,?(?: -)? start with no\.? ?(\d) passing (\d) ?(?:&|and) ?(\d) by (?:the )?(left|right)(?: shoulders?)?(?: .*)?$/,
    (m, b) => [
      call('tandem-hey', b, { solo: `no.${m[1]}`, toward: `no.${m[2]}`, shoulder: m[4] }),
    ],
  ],
  [
    // "Thread the Needle, and straighten the line": 2&3 arch, no.1 leads (the source's note).
    /^thread the needle(?:,? and straighten the line)?$/,
    (_m, b) => [call('thread-needle', b, { arch: ['no.2', 'no.3'], leader: 'no.1', face: 'up' })],
  ],
  [
    // "lines of three promenade anywhere in the room"
    /^(?:lines of (?:three|3)|trios) promenade(?: anywhere in the room| around the (?:ring|room|circle|hall))?$/,
    (_m, b) => [call('trio-promenade', b, {})],
  ],
  [
    // "center dancer: turn right by the right, turn left by the left, turn right by the right, then you turn back"
    /^(?:the )?centers?(?: dancers?| people)?:? ((?:,? ?(?:then )?turn (?:left|right) by the (?:left|right))+),? (?:and |then )?(?:you )?turn back$/,
    (m, b) => {
      const hands = [...m[1].matchAll(/turn (left|right) by the (left|right)/g)].map((x) => {
        if (x[1] !== x[2]) throw new Error('Turn by the hand on that side.');
        return x[1];
      });
      return [call('center-turns', b, { hands })];
    },
  ],
  [
    // "Current ends arch; current center people single file promenade clockwise around the major set under arches, until caller says ..."
    /^(?:current )?ends arch;? (?:and )?(?:the )?(?:current )?cent(?:er|re)s?(?: people| dancers)? (?:single file )?promenade (clockwise|counterclockwise|counter-clockwise)(?: around the (?:major |big )?(?:set|ring|circle))?(?: under (?:the )?arches)?(?:,? until .*)?$/,
    (m, b) => [
      call('centers-travel', b, {
        direction: m[1] === 'clockwise' ? 'clockwise' : 'counterclockwise',
      }),
    ],
  ],
  [
    // "partners long swing (basket), and end with a different person in the center"
    /^(?:partners (?:long )?swing,? basket|(?:three people|trios|lines of three) basket swing|basket swing)(?:,? and end with a different (?:person|dancer) in the (?:center|middle))?$/,
    (m, b) => [call('basket-swing', b, { shift: /different/.test(m[0]) ? 1 : 0 })],
  ],
  [
    // "first two people to make eye contact swing, remaining person promenade single to another couple to form a new line of three"
    /^(?:the )?first two (?:people|dancers) to make eye contact swing,? (?:the )?remaining (?:person|dancer) promenades? (?:single )?to (?:another|the next) couple(?: to form a new line of (?:three|3))?$/,
    (_m, b) => [call('swing-and-move-on', b, {})],
  ],
  [
    // "long lines forward & back (forward up eight, eight fall back)": the side lines, not the lonesome dancer.
    /^long lines forward (?:&|and) back,? forward up eight,? eight fall back$/,
    (_m, b) => [call('forward-back', b, { back: true, among: ['lines'] })],
  ],
  [
    // "lonesome person promenade to the bottom of the set, turn single"
    /^(?:the )?lonesome (?:person|dancer) (?:promenades?|walks?|goes) to the (top|bottom)(?: of the set)?(,? (?:and )?turn single)?$/,
    (m, b) => [call('lonesome-travel', b, { who: 'lonesome', to: m[1], turnSingle: !!m[2] })],
  ],
  [
    // "up a double and back twice, while the lonesome person promenades to the bottom of the set"
    /^(?:lines )?up a double (?:&|and) back( twice)?,? while (?:the )?lonesome (?:person|dancer) (?:promenades|walks|goes) to the (top|bottom)(?: of the set)?$/,
    (m, b) => [
      call('together', b, {
        parts: [
          { move: 'up-double', params: { who: 'lines', times: m[1] ? 2 : 1 } },
          { move: 'lonesome-travel', params: { who: 'lonesome', to: m[2] } },
        ],
      }),
    ],
  ],
  [
    // "lonesome person cross hands, join with both lines, pull them through while backing up"
    /^(?:the )?lonesome (?:person|dancer),? cross(?:es)? hands,? join(?:s)? (?:with )?both lines,? pull(?:s)? them through(?:,? while backing up)?$/,
    (_m, b) => [call('pull-ring', b, { who: 'lonesome' })],
  ],
  [
    // "circle left 9 places (hands nine)"
    /^circle (left|right) (\d+) places?,? hands (?:nine|9)$/,
    (m, b) => [call('loop-circle', b, { direction: m[1], places: Number(m[2]) })],
  ],
  [
    // "four couples swing at random, new lonesome person to the top of the set"
    /^(?:four|4) couples swing at random,? (?:the )?new lonesome (?:person|dancer) (?:goes )?to the (top|bottom)(?: of the set)?$/,
    (m, b) => [call('swing-at-random', b, { lonesome: m[1] })],
  ],
  [
    // Tempest: "down the hall and turn as a couple (two #1 cpls in line of four)"
    /^down the hall (?:&|and) turn as a couple,? two #?1s? (?:cpls|couples) in (?:a )?line of (?:four|4)$/,
    (_m, b) => [call('tempest-lead', b, {})],
  ],
  [
    // Tempest: "up the hall and turn as a couple (#1s turn to face nearest #2s)"
    /^up the hall (?:&|and) turn as a couple,? #?1s turn to face (?:the )?nearest #?2s$/,
    (_m, b) => [call('tempest-return', b, {})],
  ],
  [
    // Tempest: "circle left 2 places (two circles either side of set)"
    /^circle (left|right) (\d) places?,? two circles(?: (?:on )?either side of (?:the )?set)?$/,
    (m, b) => [call('side-circle', b, { direction: m[1], places: Number(m[2]) })],
  ],
  [
    // Tempest: "pass through across the set (two #1 couples in center of set)"
    /^pass through across the set,? two #?1s? (?:cpls|couples) in (?:the )?cent(?:er|re) of (?:the )?set$/,
    (_m, b) => [call('tempest-pass', b, {})],
  ],
  [
    // Tempest: "neighbors do si do once (the #2 couple across the set)"
    /^neighbors do si do once,? the #?2s? couple across the set$/,
    (_m, b) => [call('side-do-si-do', b, { who: 'neighbor', amount: 1, shoulder: 'right' })],
  ],
  [
    // Tempest: "partners swing (#1s end facing down; #2s face in)"
    /^partners swing,? #?1s end facing down;? #?2s face in$/,
    (_m, b) => [call('tempest-swing', b, {})],
  ],
];

const AMOUNT: Readonly<Record<string, number>> = {
  '½': 0.5,
  '1/2': 0.5,
  once: 1,
  '1': 1,
  '1½': 1.5,
  '1 1/2': 1.5,
  twice: 2,
};
