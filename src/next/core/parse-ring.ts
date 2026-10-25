/**
 * Row patterns for circle mixers and big circles (see parse-more.ts).
 * Rows arrive lowercased with parentheses dropped, role words as the
 * source wrote them (gentlespoons, ladles ...); ROLE matches any of them
 * and roles.ts names them larks or robins.
 *
 * Partner changes named in words ("this neighbor is your new partner",
 * "that's your new partner") mark that figure as the progression: the
 * mixer finds partners where they stand right after it (formation-ring.ts).
 */
import type { FigureCall } from './figure.ts';
import { call, type Pattern } from './parse-more.ts';
import { ALIASES, canonical } from './roles.ts';

const ROLE_WORDS = Object.entries(ALIASES)
  .filter(([, v]) => v === 'larks' || v === 'robins')
  .map(([k]) => k)
  .sort((a, b) => b.length - a.length)
  .join('|');
const ROLE = `(${ROLE_WORDS})`;
const MID = '(?:the )?(?:middle|center|centre)';
const role = (word: string) => {
  const c = canonical(word);
  if (c !== 'larks' && c !== 'robins') throw new Error(`Unknown dancers "${word}".`);
  return c;
};
const re = (source: string) => new RegExp(`^${source}$`);
const NUMBER: Readonly<Record<string, number>> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const count = (w: string) => NUMBER[w] ?? Number(w);
const marked = (c: FigureCall): FigureCall => ({ ...c, progression: true });

/** What may follow "partners promenade" in a ring. */
const PROMENADE_EXTRA = [
  'counter ?clockwise',
  'ccw',
  'clockwise',
  'cw',
  'along the set on the right',
  'around the (?:ring|circle|set)',
  'line of direction',
  `${ROLE} on the inside`,
  'then face the center',
  'end facing in',
  'face in',
  'the one you swung',
  'til the top of the music',
  'and walk that ring',
  'and reform circle',
  `turn into center with ${ROLE} on (?:the )?right`,
  'all join hands',
  'join up with one or more couples',
  'to find (?:a )?new group to circle with',
  'to find another pair',
  'scatter',
].join('|');

/** Words a row adds to say the figure makes a new partner. */
const NEW_PARTNER =
  "(?:this neighbor is your new partner|this is your new partner|now your neighbor is your partner|new partners?|that's your new partner|now your partner|becomes new partner|new-partners)";

export const RING_PATTERNS: readonly Pattern[] = [
  // Into the middle and back, or forward only, by one role.
  [
    re(`long lines forward (?:&|and) back,?(?: -)? ${ROLE} only`),
    (m, b) => [call('forward-back', b, { back: true, among: [role(m[1])] })],
  ],
  [
    re(
      `${ROLE} (?:go )?(?:forward|advance|in|to ${MID}|into ${MID})(?: (?:&|and) (?:back(?: out| up)?|retire|come back(?: out)?)| and clap and back up| and come back,? clap at the center)`,
    ),
    (m, b) => [call('forward-back', b, { back: true, among: [role(m[1])] })],
  ],
  [
    re(`${ROLE} (?:go )?(?:forward|advance|to ${MID}|into ${MID})`),
    (m, b) => [call('forward-back', b, { back: false, among: [role(m[1])] })],
  ],
  [
    re(`${ROLE} (?:go back|return to (?:their |your )?partners?|back out)`),
    (m, b) => [call('ring-return', b, { who: role(m[1]) })],
  ],
  [re(`${ROLE} turn alone`), (m, b) => [call('turn-alone', b, { among: [role(m[1])] })]],
  // Everyone into the middle and back.
  [
    re(
      `(?:all|everyone|everybody|big ring|the ring)?,? ?(?:go )?(?:forward|(?:in)?to ${MID}) (?:&|and) (?:come )?back(?: out)?!?`,
    ),
    (_m, b) => [call('forward-back', b, { back: true })],
  ],
  [
    re(`long lines forward (?:&|and) back,? (?:all into ${MID} and back|face partners? and take two hands)`),
    (_m, b) => [call('forward-back', b, { back: true })],
  ],
  // Claps in place.
  [
    re('(?:right hand|left hand|both hands|own legs|hands|knees): clap,? clap,? clap'),
    (_m, b) => [call('still', b, { action: 'clap' })],
  ],
  // Promenade round the ring.
  [
    re(`(?:partners )?promenade((?:,? ?-? (?:${PROMENADE_EXTRA}))+)`),
    (m, b) => {
      const cw = /\b(?:clockwise|cw)\b/.test(m[1].replace(/counter ?clockwise|ccw/g, ''));
      return [call('ring-promenade', b, { who: 'partner', ...(cw ? { direction: 'cw' } : {}) })];
    },
  ],
  // Promenade the neighbor beside you: the new partner.
  [
    re(
      '(?:neighbors (?:scatter )?promenade(?:,? henceforth,? this neighbor is (?:your )?new partner)?|neighbor is now partner, promenade anywhere in the hall - find another couple and make new hands four)',
    ),
    (_m, b) => [marked(call('meet', b, { figure: 'promenade', pair: 'beside' }))],
  ],
  [
    re(`partners balance (?:&|and) swing,? ${NEW_PARTNER}`),
    (_m, b) => [
      call('balance', 4, { formation: 'pair', who: 'partner', hand: 'both' }),
      call('swing', b - 4, { who: 'partner' }),
    ],
  ],
  // A neighbor figure that makes a new partner.
  [
    re(`(?:next )?neighbors (balance (?:&|and) )?(long )?swing,?(?: -)? ${NEW_PARTNER}`),
    (m, b) => {
      const swing = marked(call('swing', m[1] ? b - 4 : b, { who: 'neighbor' }));
      return m[1]
        ? [call('balance', 4, { formation: 'pair', who: 'neighbor', hand: 'both' }), swing]
        : [swing];
    },
  ],
  [
    re(`(?:next )?neighbors (do si do|see saw) once,?(?: -)? ${NEW_PARTNER}`),
    (m, b) => [
      marked(
        call('do-si-do', b, {
          who: 'neighbor',
          amount: 1,
          shoulder: m[1] === 'see saw' ? 'left' : 'right',
        }),
      ),
    ],
  ],
  [
    re(`partners (long )?swing,? (?:new partner,? )?(?:number \\w+|cross-handed)`),
    (_m, b) => [call('swing', b, { who: 'partner' })],
  ],
  // Elbow swings: a hand turn by the elbow, once unless named (as parse-sets.ts
  // reads "partners right elbow swing").
  [
    re('partners? swing (right|left) elbow'),
    (m, b) => [call('allemande', b, { who: 'partner', hand: m[1], amount: 1 })],
  ],
  [
    re('partners? elbow swing (r|l) (3/2|1½|once|twice)'),
    (m, b) => [
      call('allemande', b, {
        who: 'partner',
        hand: m[1] === 'r' ? 'right' : 'left',
        amount: { '3/2': 1.5, '1½': 1.5, once: 1, twice: 2 }[m[2]]!,
      }),
    ],
  ],
  // An allemande whose note says which way each role goes on.
  [
    re(
      `partners allemande (left|right) (once|1½|½) ${ROLE} progress (?:ccw|cw),? ${ROLE} progress (?:ccw|cw)`,
    ),
    (m, b) => [
      call('allemande', b, {
        who: 'partner',
        hand: m[1],
        amount: { once: 1, '1½': 1.5, '½': 0.5 }[m[2]]!,
      }),
    ],
  ],
  // One role moves on round the ring to a new partner.
  [
    re(`${ROLE} turn alone one place to (?:a )?new partner`),
    (m, b) => [call('ring-shift', b, { who: role(m[1]), direction: 'left' })],
  ],
  [
    re(`${ROLE} turn alone to meet (?:the )?(?:next|new) partners?(?: behind them)?`),
    (m, b) => [call('ring-shift', b, { who: role(m[1]), direction: 'left' })],
  ],
  [
    re('move (?:on )?to (?:your )?(?:next|new) partner'),
    (_m, b) => [call('ring-shift', b, { who: 'larks', direction: 'left' })],
  ],
  [
    re(
      `long lines forward (?:&|and) back,?(?: -)? ${ROLE} only,? turn(?:ing)? over (?:the |your )?(left|right) shoulder (?:(?:&|and) )?(?:go )?to (?:a |your |the )?(?:new|next) partner`,
    ),
    (m, b) => [
      call('ring-shift', b, { who: role(m[1]), direction: m[2], path: 'center' }),
    ],
  ],
  [
    re(`${ROLE} turn (?:&|and) walk out to (?:the )?next ${ROLE}`),
    (m, b) => [call('ring-shift', b, { who: role(m[1]), direction: 'left', path: 'center' })],
  ],
  // Slides round the ring.
  [
    re('slide (left|right) along (?:the )?set,? slide,? slide'),
    (m, b) => [call('ring-slide', b, { direction: m[1] })],
  ],
  // Sashay in and out of the ring, partners facing.
  [re('sashay in (?:&|and) out'), (_m, b) => [call('sashay', b, { who: 'partner' })]],
  // Grand right and left.
  [
    re('(?:grand right and left|right left grand),? count to (\\w+)'),
    (m, b) => [call('grand-right-left', b, { changes: count(m[1]) - 1, hand: 'right', end: 'in' })],
  ],
  [
    re(
      "(?:(?:partners|(?:next )?neighbors) )?pull by (right|left)(?: - (?:that's )?(?:number )?\\d+| -\\d+| #\\d+)",
    ),
    (m, b) => [call('grand-right-left', b, { changes: 1, hand: m[1], end: 'face' })],
  ],
  [
    re(`(?:next )?neighbors (long )?swing - number \\w+!? ${NEW_PARTNER}`),
    (_m, b) => [marked(call('meet', b, { figure: 'swing' }))],
  ],
  [
    re('circle (left|right) (\\w+) places? or however many .*'),
    (m, b) => [call('circle', b, { direction: m[1], places: count(m[2]) })],
  ],
];
