/**
 * Row patterns for four face four and Sicilian circles (see parse-more.ts).
 *
 * Several rows only say an ordinary call in other words ("take hands 4 with
 * opposite couple, balance and petronella"); those are read again as the
 * ordinary call (`again`). Readings are listed in docs/figure-readings.md.
 */
import type { FigureCall } from './figure.ts';
import { call, type Pattern } from './parse-more.ts';
import { parseRow } from './parse.ts';

/** The pair a word names, for a figure any two may dance ("next neighbors" are the neighbors, as in parse.ts who()). */
const pairOf = (w: string) =>
  /^p/.test(w) ? 'partner' : /^s/.test(w) ? 'shadow' : /^(larks|robins)$/.test(w) ? w : 'neighbor';

/** Read a row again in its ordinary wording. */
const again = (text: string, beats: number): FigureCall[] => parseRow({ text, beats });

/** Two-dancer figures danced with corners (figures/sets/corners.ts). */
const CORNER_MOVES = { allemande: 1, balance: 1, 'do-si-do': 1, 'pass-by': 1 } as const;

const COUPLE: Readonly<Record<string, string>> = { ones: '1s', twos: '2s', '1s': '1s', '2s': '2s' };
const TURNS: Readonly<Record<string, number>> = {
  once: 1,
  '1': 1,
  '1x': 1,
  '½': 0.5,
  '1/2': 0.5,
  '1½': 1.5,
  '1 1/2': 1.5,
  twice: 2,
};
const turns = (word: string | undefined, fallback: number) => {
  if (word === undefined) return fallback;
  const t = TURNS[word];
  if (t === undefined) throw new Error(`Unknown amount "${word}".`);
  return t;
};

const ARCH =
  /^(ones|twos|1s|2s) (?:make an )?arch,? (?:and )?(ones|twos|1s|2s) (?:dive|duck)(?: under)?(?: (back up|backing up|backing))?(?:,? (?:and )?(pass through))?$/;

export const SETS_PATTERNS: readonly Pattern[] = [
  [
    // "ones arch twos dive", "twos arch ones dive (back up)" (rolling arches).
    ARCH,
    (m, b) => {
      if (COUPLE[m[1]] === COUPLE[m[2]]) throw new Error('One couple arches, the other dives.');
      // With a pass through in the same phrase each takes half; the arch is
      // then a quick one (arch-dive.ts).
      const pass = b / 2;
      const arch = call('arch-dive', m[4] ? b - pass : b, {
        arch: COUPLE[m[1]],
        backing: m[3] !== undefined,
      });
      return m[4] ? [arch, call('pass-through', pass, { shoulder: 'right' })] : [arch];
    },
  ],
  [
    // Two couples do-si-do as couples, partners holding inside hands.
    /^(?:as couples,? do si do|couples do si do|do si do as couples)(?: (once|1|1½|twice))?(?: with (?:the )?(?:neighbors?|other couple|opposite couple))?$/,
    (m, b) => [call('couples-do-si-do', b, { amount: turns(m[1], 1) })],
  ],
  [
    // An elbow swing is a hand turn holding elbows ("neighbor right elbow").
    /^(partners?|neighbou?rs?|shadows?|next neighbou?rs?|larks|robins) (right|left) elbow(?: swing| turn)?(?: (once|1|1½|1 1\/2|½|1\/2|twice))?$/,
    (m, b) =>
      again(`${m[1].replace(/s?$/, 's')} allemande ${m[2]}${m[3] ? ` ${m[3]}` : ''}`, b),
  ],
  [
    // Couples or lines forward & back, said twice ("as couples forward and back").
    /^(?:long lines|lines of (?:four|4)|couples|as couples),? forward (?:&|and) back,? (?:as couples|lines of (?:four|4)|as lines)(?: forward (?:&|and) back)?$/,
    (_m, b) => [call('forward-back', b, { back: true })],
  ],
  [
    // The ring of eight in four face four, named outright.
    /^(?:in a ring of (?:8|eight),? )?circle (left|right) (\d+) places?(?:,? (?:\[?all (?:8|eight)\]?|in a ring of (?:8|eight)|\[?halfway\]?|all (?:8|eight) circle all the way around))?$/,
    (m, b) => {
      const named = /all|ring of|halfway/.test(m[0]);
      return [
        call('lines-circle', b, {
          direction: m[1],
          places: Number(m[2]),
          ...(named ? { ring: 8 } : {}),
        }),
      ];
    },
  ],
  [/^balance the ring of (?:8|eight)$/, (_m, b) => [call('balance', b, { formation: 'ring' })]],
  [
    // "take hands 4 with opposite couple, balance and petronella"
    /^(?:take hands (?:4|four) with (?:the )?(?:opposite|same) couple|with (?:the )?same couple),? balance (?:&|and) petronella$/,
    (_m, b) => again('balance & petronella', b),
  ],
  [
    /^right left through(?: (?:and|&) courtesy turn)?(?: with (?:the )?(?:opposite|facing) couple)?$/,
    (_m, b) => [call('right-left-through', b, {})],
  ],
  [
    // "partners balance and California twirl": balance side by side the way they face, then twirl.
    // Neighbors or shadows side by side twirl the same way.
    /^(partners?|neighbou?rs?|shadows?|next neighbou?rs?|larks|robins) balance (?:&|and) california twirl(?: to face (?:a )?new (?:line|neighbou?rs))?$/,
    (m, b) => {
      const who = pairOf(m[1]);
      return [call('balance', 4, { formation: 'beside', who }), call('twirl', b - 4, { style: 'california', who })];
    },
  ],
  [
    /^(partners?|neighbou?rs?|shadows?|next neighbou?rs?|larks|robins) california twirl(?:,? (?:to )?face (?:a )?(?:new|next) (?:line(?: of (?:four|4))?|neighbou?rs))$/,
    (m, b) => [call('twirl', b, { style: 'california', who: pairOf(m[1]) })],
  ],
  [
    // A swing that ends facing out of the minor set, toward the next couple or line.
    /^(partners?|neighbors?) (balance (?:&|and) )?(meltdown |long )?swing(?:,| -)? (?:and )?(?:end |finish )?(?:facing|face) (?:the next|(?:a )?new lines?(?: of (?:four|4))?|(?:your |the )?direction of (?:travel|progression|progress)|(?:new|next) neighbors|out)$/,
    (m, b) => {
      const who = m[1].startsWith('partner') ? 'partner' : 'neighbor';
      const swing = { who, ...(m[3] === 'meltdown ' ? { meltdown: true } : {}) };
      return m[2]
        ? [
            call('balance', 4, { formation: 'pair', who, hand: 'both' }),
            call('swing-out', b - 4, swing),
          ]
        : [call('swing-out', b, swing)];
    },
  ],
  [
    // "star left 1x", "star right once": once round ("center 4 star left 1"
    // reaches here with its qualifier lifted).
    /^star (left|right) (?:1x|1|once)$/,
    (m, b) => [call('star', b, { hand: m[1], places: 4 })],
  ],
  [
    // In four face four your opposite is the dancer you face (the neighbor relation).
    /^opposites? (?:do[ -]?si[ -]?do|dosido)(?: (once|1|1½|twice))?$/,
    (m, b) => [call('do-si-do', b, { who: 'opposite', amount: turns(m[1], 1), shoulder: 'right' })],
  ],
  [
    // Lines pass through along the hall ("pass through up & down").
    /^(?:lines of (?:four|4),? )?pass through up (?:&|and) down$/,
    (_m, b) => [call('pass-through', b, { shoulder: 'right' })],
  ],
  [
    // A circle of four named by who is in it: the minor set, rings of four.
    /^circle (left|right) (\d+) places?,? (?:with the neighbor couple(?: above\/below you)?|in groups of (?:4|four)|in rings of (?:4|four))$/,
    (m, b) => [call('lines-circle', b, { direction: m[1], places: Number(m[2]), ring: 4 })],
  ],
  [
    // "balance & petronella, face new neighbors": the petronella ends facing them.
    /^balance (?:&|and) petronella,? (?:and )?face (?:new|next) neighbors$/,
    (_m, b) => again('balance & petronella', b),
  ],
  [
    // Lines of four pass through the line they face.
    /^(?:long )?lines(?: of (?:four|4))?,? pass through$/,
    (_m, b) => [call('pass-through', b, { shoulder: 'right' })],
  ],
  [
    // "robins chain with the couple you're facing": a chain within the minor set.
    /^(robins|larks) chain (?:with|to|across to) the couple (?:you're|you are) facing$/,
    (m, b) => again(`${m[1]} chain`, b),
  ],
  [
    // "star left 4 places the same two couples": the minor set again.
    /^(star (?:left|right) \d+ places?),? (?:with )?the same (?:two couples|four)$/,
    (m, b) => again(m[1], b),
  ],
  [
    // Corners swing; in four face four this squares the set (corner-swing.ts).
    /^(first |1st )?corners? swing(?:,? (?:and )?(?:do not trade places,? )?(?:square the set|square (?:the )?sets?|form (?:a )?square))?$/,
    (m, b) => [call('corner-swing', b, { who: m[1] ? 'neighbor' : 'corner' })],
  ],
  [
    // "[square the sets] head couples forward & back": the square is already formed.
    /^\[?square the sets?\]? (.+)$/,
    (m, b) => again(m[1], b),
  ],
  [
    // The left-hand lark of each line leads it round to the other line's place.
    /^(?:left hand|leftmost) (?:larks?|gentlespoons?|gents?) (?:of each line )?cast (?:over )?(?:the )?left(?: shoulder)?,? (?:leading (?:their|the) line|bring (?:their|the) line of (?:4|four) around (?:the )?neighbors)$/,
    (_m, b) => [call('lines-cast', b, { shoulder: 'left' })],
  ],
  [
    // "lines of four, pass through and back": the lines pass through to the
    // next line; the progression mark sits here (Dead Simple).
    /^lines of (?:four|4),? pass through and back$/,
    (_m, b) => [call('pass-through', b, { shoulder: 'right' })],
  ],
  [
    // "first corners allemande left 1¼", "corners pull by right": with the
    // corner (corners.ts), the neighbor where a square names corners so.
    /^(?:first |1st )?corners? ((?:allemande|pull by|pass by|do si do|balance)(?: .+)?)$/,
    (m, b) =>
      again(`neighbors ${m[1].replace(/\b1\.25\b/, '1¼')}`, b).map((c) => {
        if (!(c.move in CORNER_MOVES)) throw new Error(`Corners do not ${c.move}.`);
        return call('corners', c.beats, { move: c.move, params: c.params });
      }),
  ],
  [
    // "partner pull by right, grand right left halfway": until partners meet.
    /^partners? pull by (?:the )?right,? (?:for |to start )?(?:a )?(?:grand right (?:and |& )?left|right left grand|grand right left)(?:,? (?:halfway(?: around)?|until (?:they|you) meet (?:their|your) partners?))$/,
    (_m, b) => again('grand right and left halfway', b),
  ],
  [
    // "robins star right once": the four robins, once round.
    /^(robins|larks|ladles|gentlespoons) star (left|right) (?:once|1x|1)(?: around)?$/,
    (m, b) => again(`star ${m[2]} 4 places ${m[1]}`, b),
  ],
  [
    // A trailing "++" or "+++" marks a note; the row is the call before it.
    /^(.+?) ?\+{2,3}$/,
    (m, b) => again(m[1], b),
  ],
];
