/**
 * More row patterns, beside the table in parse.ts: shadows and other
 * relationships, orbit allemandes, long waves danced into the center, more
 * ways of forming and balancing waves, two-hand turns, couples do-si-do,
 * stand still, and the hall and long-lines variants. Same rules as
 * parse.ts: one pattern per wording, names through roles.ts, usual
 * defaults filled in explicitly.
 *
 * Also the trailing notes many rows add after a figure ("allemande right
 * 1½ to face partner", "do si do once back to neighbor"): where a figure
 * ends is its own business, so a note that names no further figure is
 * dropped (dropNotes). Notes that do name one (waves, lines, rings, other
 * figures) are kept, so the row stays unparsed rather than half drawn.
 */
import type { FigureCall } from './figure.ts';

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];

export interface ParseHelpers {
  who(word: string): string;
  amount(word: string | undefined, fallback: number): number;
  call(move: string, beats: number, params: Record<string, unknown>): FigureCall;
  numbers: Readonly<Record<string, number>>;
  /** Calls for a part of a row (tidied text), from all patterns. */
  match(text: string, beats: number): FigureCall[] | undefined;
}

const WHO = '((?:next |new )?\\w+)';
const re = (source: string) => new RegExp(`^${source}$`);
const roleOf = (group: string) => {
  if (group !== 'larks' && group !== 'robins') throw new Error(`"${group}" is not a role.`);
  return group;
};

export function morePatterns(h: ParseHelpers): readonly (readonly [RegExp, Build])[] {
  const { who, amount, call } = h;
  const direction = (word: string) =>
    /^(?:clockwise|cw)$/.test(word) ? 'clockwise' : 'counterclockwise';
  return [
    [/^stand still$/, (_m, b) => [h.call('stand-still', b, {})]],
    [
      /^balance the ring and circle left one place$/,
      (_m, b) => [
        call('balance', 4, { formation: 'ring' }),
        call('circle', b - 4, { direction: 'left', places: 1 }),
      ],
    ],
    [
      /^balance (?:the )?wave forward (?:and|&) back,? (?:and )?walk forward(?: to new waves?)?$/,
      (_m, b) => [
        call('balance', 4, { formation: 'wave', style: 'forward-back' }),
        call('walk-forward', b - 4, {}),
      ],
    ],
    [
      /^(?:turn the )?clover(?:leaf)? (left|right) (\w+) places?$|^circle (left|right) (\w+) places? in (?:a )?cloverleaf$/,
      (m, b) => [
        call('cloverleaf', b, {
          direction: m[1] ?? m[3],
          places: h.numbers[m[2] ?? m[4]] ?? Number(m[2] ?? m[4]),
        }),
      ],
    ],
    [
      /^(down|up) the hall and bend into a cloverleaf\b.*$/,
      (m, b) => [call('hall', b, { direction: m[1], end: 'ring' })],
    ],
    [
      // "Robins trade passing right in the middle", "... by the left shoulder".
      /^(\w+) trade (?:passing |by (?:the )?)?(r|right|l|left)(?: shoulders?)?(?: in (?:the )?(?:middle|center))?(?:,? catch (?:left|right) hands)?$/,
      (m, b) => [
        call('pass-by', b, {
          who: roleOf(who(m[1])),
          shoulder: m[2].startsWith('r') ? 'right' : 'left',
          hands: false,
        }),
      ],
    ],
    [
      // "Next neighbors mirror do si do, ones splitting twos".
      re(
        `${WHO} mirror do si do(?: (once|twice|[^ ,]+))?,? (ones|twos|1s|2s) splitting (?:the )?(?:ones|twos|1s|2s)`,
      ),
      (m, b) => [
        call('do-si-do', b, { who: who(m[1]), amount: amount(m[2], 1), split: who(m[3]) }),
      ],
    ],
    [
      // "Ones split the twos with a handy hand allemande 1½", "ones mirror allemande neighbors 1½".
      /^(ones|twos|1s|2s) (?:split (?:the )?(?:ones|twos|1s|2s) with a (?:handy hand |mirror )?allemande|mirror allemande (?:neighbors?|partners?)) ([^ ]+)$/,
      (m, b) => [
        call('allemande', b, { who: 'neighbor', amount: amount(m[2], 1), split: who(m[1]) }),
      ],
    ],
    [
      re(`${WHO} (do si do|see saw) ([^ ]+) to a wave`),
      (m, b) => [
        call('do-si-do', b, {
          who: who(m[1]),
          amount: amount(m[3], 1),
          shoulder: m[2] === 'see saw' ? 'left' : 'right',
          wave: true,
        }),
      ],
    ],
    [
      // Long lines, rolling away on the way back: forward, then the roll away.
      /^long lines forward (?:&|and) back,? (?:and )?(\w+) roll (?:away )?(partners?|neighbors?|new n|a new neighbor|the robins|the larks|the ladles|the gentlespoons)(?: away)?(?: (?:left to right|right to left))?(?: on the way back)?$/,
      (m, b) => {
        const whom = /^partner|^the /.test(m[2]) ? 'partner' : 'neighbor';
        return [
          call('long-lines', b / 2, { back: false }),
          call('roll-away', b / 2, { who: roleOf(who(m[1])), whom }),
        ];
      },
    ],
    [
      // "Balance (the wave) and move straight ahead to a new wave": balance, walk forward.
      /^balance(?: the)?(?: ocean)?(?: wave)?(?: of (?:4|four))?,? (?:and )?(?:(?:move|go|walk) (?:straight|forward)|straight)(?: ahead)?(?: to (?:a )?new (?:wave|ocean|neighbor)(?: of (?:4|four))?)?(?: .*)?$/,
      // A row too short to balance as well (4 beats) only walks forward.
      (_m, b) =>
        b < 8
          ? [call('walk-forward', b, {})]
          : [call('balance', 4, { formation: 'current' }), call('walk-forward', b - 4, {})],
    ],
    [
      /^(?:dance|walk) forward to (?:form )?new waves? and balance$/,
      (_m, b) => [call('walk-forward', b - 4, {}), call('balance', 4, { formation: 'current' })],
    ],
    [
      /^pass through,? (?:and )?walk forward(?: to (?:a )?new waves?)?$/,
      (_m, b) => [
        call('pass-through', b / 2, { shoulder: 'right' }),
        call('walk-forward', b / 2, {}),
      ],
    ],
    [
      // "Balance the ring, larks roll neighbor along the set (half sashay)".
      /^balance the ring,? (?:and )?(\w+) roll (?:away )?(partners?|neighbors?)(?: with (?:a )?half sashay)?(?: (?:alone|along|across)(?: the)?(?: set)?)?$/,
      (m, b) => [
        call('balance', 4, { formation: 'ring' }),
        call('roll-away', b - 4, {
          who: roleOf(who(m[1])),
          whom: m[2].startsWith('partner') ? 'partner' : 'neighbor',
        }),
      ],
    ],
    [
      /^balance the ring,? (?:&|and) pass through(?: (across|along) the set)?$/,
      (m, b) => [
        call('balance', 4, { formation: 'ring' }),
        call('pass-through', b - 4, { shoulder: 'right', ...(m[1] ? { axis: m[1] } : {}) }),
      ],
    ],
    [
      /^circle (left|right) (\w+) places?,? (?:and )?walk forward$/,
      (m, b) => [
        call('circle', b - 2, { direction: m[1], places: h.numbers[m[2]] ?? Number(m[2]) }),
        call('walk-forward', 2, {}),
      ],
    ],
    [/^balance alone$/, (_m, b) => [call('balance', b, { formation: 'solo' })]],
    [
      // "Balance the ring, larks trade places": the ring balance, then they trade.
      /^balance the ring,? (?:and )?(\w+) trade(?: places)?(?: (?:passing )?(right|left)(?: shoulders?)?)?(?: to face partners?)?$/,
      (m, b) => [
        call('balance', 4, { formation: 'ring' }),
        call('pass-by', b - 4, { who: roleOf(who(m[1])), shoulder: m[2] ?? 'right', hands: false }),
      ],
    ],
    [
      // "Larks give & take partners and swing": half the beats each.
      /^(\w+) give (?:&|and) take (partners|neighbors) and swing$/,
      (m, b) => [
        call('give-and-take', b / 2, { who: who(m[1]), whom: who(m[2]) }),
        call('swing', b / 2, { who: who(m[2]) }),
      ],
    ],
    [
      // "Partners allemande right ½ and reform short wave with larks in the middle".
      re(
        `${WHO} allemande (right|left) (?:½|1/2),? (?:and )?reform (?:the |a )?(?:short )?wave with (\\w+) in the (?:middle|center)`,
      ),
      (m, b) => [
        call('allemande', b, {
          who: who(m[1]),
          hand: m[2],
          amount: 0.5,
          wave: { middle: roleOf(who(m[3])) === 'larks' ? 'lark' : 'robin' },
        }),
      ],
    ],
    [
      /^balance the ring and partners california twirl$/,
      (_m, b) => [
        call('balance', 4, { formation: 'ring' }),
        call('twirl', b - 4, { style: 'california', who: 'partner' }),
      ],
    ],
    [
      // A swing through spelled out: two half allemandes.
      re(
        `swing through,? ${WHO} allemande (right|left) (?:by )?(?:½|1/2|half),? ${WHO} allemande (right|left) (?:by )?(?:½|1/2|half)`,
      ),
      (m, b) => [
        call('allemande', b / 2, { who: who(m[1]), hand: m[2], amount: 0.5 }),
        call('allemande', b / 2, { who: who(m[3]), hand: m[4], amount: 0.5 }),
      ],
    ],
    [
      // "Robins allemande left ½, hold on to form waves", "... 1½ to a short wave".
      re(
        `(larks|robins|gentlespoons?|ladles?) allemande (left|right) ([^ ,]+),? (?:- )?(?:hold on )?(?:(?:and|&) )?(?:to )?(?:form )?(?:a |an )?(?:short |ocean )?(?:waves?|wavy lines?)(?: of (?:4|four))?((?:[ ,.].*)?)`,
      ),
      (m, b) => [
        call('allemande', b, {
          who: roleOf(who(m[1])),
          hand: m[2],
          amount: amount(m[3], 1),
          wave: {
            middle: who(m[1]) === 'larks' ? 'lark' : 'robin',
            ...(/\b(?:r|right)(?: hands?)? to (?:your )?partners?\b/.test(m[4] ?? '')
              ? { ends: 'partner' }
              : /\b(?:r|right)(?: hands?)? to (?:your )?neighbors?\b/.test(m[4] ?? '')
                ? { ends: 'neighbor' }
                : {}),
          },
        }),
      ],
    ],
    [
      re(`${WHO} allemande (left|right) ([^ ]+) to long waves`),
      (m, b) => [
        call('allemande', b, {
          who: who(m[1]),
          hand: m[2],
          amount: amount(m[3], 1),
          longWaves: true,
        }),
      ],
    ],
    [
      /^(?:all )?(?:walk|dance|move) forward(?: (?:\d+ steps|along the set))?(?: to (?:a |the )?(?:new|next)?(?: (?:wave|wavy line|couple|neighbors?|minor set))?(?: of (?:4|four))?(?: with (?:next|new) neighbors)?)?(?: progression)?$/,
      (_m, b) => [call('walk-forward', b, {})],
    ],
    [
      // "Robins allemande left once, larks shift left", "... while larks walk forward".
      re(
        `${WHO} allemande (left|right) ([^ ,]+)(?: next \\w+)?(?: in (?:the )?center)?,? (?:while )?(?:the )?(\\w+) (shift (left|right)(?: one place)?|walk forward(?: .*)?|move straight ahead(?: .*)?)`,
      ),
      (m, b) => [
        call('orbit', b, {
          center: 'allemande',
          who: who(m[1]),
          hand: m[2],
          amount: amount(m[3], 1),
          others: m[6] ? `shift-${m[6]}` : 'forward',
        }),
      ],
    ],
    [
      // A zero-beat "while:" or "alternate: ..." row only annotates its neighbors.
      /^(?:while:?|alternate: .*|"?swing through"?:)$/,
      (_m, b) => {
        if (b) throw new Error('This row names no figure.');
        return [];
      },
    ],
    [
      re(
        `${WHO} (allemande (left|right)|do si do|see saw) ([^ ]+(?: 1/2)?) while (?:the )?(\\w+) orbit (clockwise|counter ?clockwise|cw|ccw) ([^ ]+)(?: around)?(?: to (?:meet |face )?(?:your )?(?:partners?|neighbors?|shadows?)(?: across(?: the)? set)?)?`,
      ),
      (m, b) => {
        const allemande = m[2].startsWith('allemande');
        return [
          call('orbit', b, {
            center: allemande ? 'allemande' : 'do-si-do',
            who: who(m[1]),
            ...(allemande ? { hand: m[3] } : { shoulder: m[2] === 'see saw' ? 'left' : 'right' }),
            amount: amount(m[4], 1),
            direction: direction(m[6]),
            around: amount(m[7], 0.5),
          }),
        ];
      },
    ],
    [
      // With zero beats it only says where the dancers are (import.ts drops it).
      /^(\w+) (?:dance in to|form) a long wave in the center( - balance the wave)?$/,
      (m, b) => [
        call('center-wave', b, { in: roleOf(who(m[1])), ...(m[2] ? { balance: true } : {}) }),
      ],
    ],
    [
      /^(\w+) dance out while (\w+) dance in to a long wave in the center( - balance the wave)?$/,
      (m, b) => [
        call('center-wave', b, {
          in: roleOf(who(m[2])),
          out: roleOf(who(m[1])),
          ...(m[3] ? { balance: true } : {}),
        }),
      ],
    ],
    [
      re(`${WHO} two[- ]hand turn(?: (clockwise|counterclockwise))?(?: (once|twice|[^ ]+))?`),
      (m, b) => [
        call('two-hand-turn', b, {
          who: who(m[1]),
          amount: amount(m[3], 1),
          ...(m[2] ? { direction: m[2] } : {}),
        }),
      ],
    ],
    [
      re(`${WHO} (?:do si do|see saw) (once|twice|[^ ]+),? as (?:a )?couples?`),
      (m, b) => [call('couples-do-si-do', b, { amount: amount(m[2], 1) })],
    ],
    [
      // The wave forms; "balance the wave" after it, or "& balance", balances it.
      re(
        `form an? (?:(left|right) diagonal )?ocean wave( (?:&|and) balance)? - (\\w+) by (left|right)(?: hands?)? (?:and )?${WHO} by (left|right)(?: hands?)?(,? balance the wave)?`,
      ),
      (m, b) => [
        call('ocean-wave', b, {
          middle: roleOf(who(m[3])),
          middleHand: m[4],
          ends: who(m[5]),
          endHand: m[6],
          ...(m[2] || m[7] ? { balance: true } : {}),
          ...(m[1] ? { diagonal: m[1] } : {}),
        }),
      ],
    ],
    [
      /^balance (?:the )?(?:ocean )?wave(?: of (?:4|four))? (left|right)(?: (?:&|and|then) (?:left|right))?$/,
      (m, b) => [call('balance', b, { formation: 'wave', style: 'right-left', first: m[1] })],
    ],
    [
      /^balance (?:the )?(?:ocean )?wave(?: of (?:4|four))? (?:fwd|forward)(?: (?:&|and) back)?$/,
      (_m, b) => [call('balance', b, { formation: 'wave', style: 'forward-back' })],
    ],
    [/^long lines back$/, (_m, b) => [call('long-lines', b, { back: true, only: 'back' })]],
    [
      /^forward (?:&|and) back with current neighbors$/,
      (_m, b) => [call('long-lines', b, { back: true })],
    ],
    [
      // A swing through: the allemande ½, then the middles pass in the center.
      /^(\w+) allemande (right|left) ½,? (?:and )?(\w+) pass (left|right)(?: shoulders?)?(?: in(?: the)? center)?(?: to (?:face|reach) (?:partners?|neighbors?))?(?: .*)?$/,
      (m, b) => [
        call('allemande', b / 2, { who: who(m[1]), hand: m[2], amount: 0.5 }),
        call('pass-by', b / 2, { who: roleOf(who(m[3])), shoulder: m[4], hands: false }),
      ],
    ],
    [
      /^(ones|twos|1s|2s) (down|up) the (center|outsides?)(?: and turn (alone|as a couple))?$/,
      (m, b) => [
        call('couple-travel', b, {
          who: who(m[1]),
          route: m[3] === 'center' ? 'center' : 'outside',
          direction: m[2],
          ...(m[4] ? { turn: m[4] === 'alone' ? 'alone' : 'couple' } : {}),
        }),
      ],
    ],
    [
      /^down the hall forward,? (?:and )?then backward$/,
      (_m, b) => [
        call('hall', b / 2, { direction: 'down' }),
        call('hall', b / 2, { direction: 'up', backward: true }),
      ],
    ],
    [
      // "Circle left 3 places, partners swing" in one 16-beat row.
      re(`circle (left|right) (\\w+) places?,? (?:then )?${WHO} swing`),
      (m, b) => [
        call('circle', b / 2, { direction: m[1], places: h.numbers[m[2]] ?? Number(m[2]) }),
        call('swing', b / 2, { who: who(m[3]) }),
      ],
    ],
    [/^(down|up) the hall$/, (m, b) => [call('hall', b, { direction: m[1] })]],
    [
      /^up the hall and turn (as a couple|alone)$/,
      (m, b) => [call('hall', b, { direction: 'up', turn: m[1] === 'alone' ? 'alone' : 'couple' })],
    ],
    [
      // Becket: swing, then slide left along the set to the next neighbors.
      re(`${WHO} (?:(balance) (?:&|and) )?swing,? slide left(?: to (?:progress|new neighbors))?`),
      (m, b) => [
        ...(m[2] ? [call('balance', 4, { formation: 'pair', who: who(m[1]), hand: 'both' })] : []),
        call('swing', b - (m[2] ? 6 : 2), { who: who(m[1]) }),
        call('slide', 2, { direction: 'left' }),
      ],
    ],
    [/^up the hall backward$/, (_m, b) => [call('hall', b, { direction: 'up', backward: true })]],
    [
      /^down the hall and bend into a ring$/,
      (_m, b) => [call('hall', b, { direction: 'down', end: 'ring' })],
    ],
    [
      /^(\w+) turn alone$/,
      (m, b) => {
        const w = who(m[1]);
        return [call('turn-alone', b, { who: w === '1s' || w === '2s' ? w : roleOf(w) })];
      },
    ],
    [
      /^(\w+) turn alone over their (right|left) shoulders?$/,
      (m, b) => [call('turn-alone', b, { who: roleOf(who(m[1])), over: m[2] })],
    ],
    [
      // "Circle right 4 places and turn alone": the last 2 beats turn alone.
      /^circle (left|right) (\w+) places?,? (?:and )?turn alone$/,
      (m, b) => [
        call('circle', b - 2, { direction: m[1], places: h.numbers[m[2]] ?? Number(m[2]) }),
        call('turn-alone', 2, {}),
      ],
    ],
    [
      /^pass through(?: (across|along) the set)?,? (?:and )?turn alone$/,
      (m, b) => [
        call('pass-through', b - 2, { shoulder: 'right', ...(m[1] ? { axis: m[1] } : {}) }),
        call('turn-alone', 2, {}),
      ],
    ],
    [
      // "Circle left 3 places to a diamond, robins in the center": the figure,
      // then 2 beats to shift an eighth around into the diamond.
      /^(.+?),? (?:(?:and )?a little (?:bit )?more |- turn a little extra |turn a little extra )?(?:and )?to (?:form )?(?:a )?diamonds?(?:,? (\w+) in the (?:center|middle))?(?:[ ,].*)?$/,
      (m, b) => {
        if (b < 4) throw new Error('Too short to dance a figure and then shift to a diamond.');
        const base = moreTidy(m[1].replace(/ -$/, ''))
          .replace(/^(balance (?:&|and) petronella) 1½ places$/, '$1')
          .replace(/^(circle (?:left|right)) (?:1\.5|1½) places$/, '$1 one place');
        const calls = h.match(base, b - 2);
        if (!calls) throw new Error(`No figure pattern matches "${base}".`);
        const center = m[2] ? who(m[2]) : undefined;
        return [
          ...calls,
          call('diamond', 2, center === 'larks' || center === 'robins' ? { center } : {}),
        ];
      },
    ],
    [
      // A figure that ends in a wave of four ("circle left 3 places to wave of
      // four, robins in center left hands, right hand to neighbor"): the
      // figure, then 2 beats to step into the wave the row describes.
      // "... to a wave and balance" balances it too (4 beats for both).
      /^(.+?),? (?:and )?(?:end (?:the )?swing in|(?:step )?(?:in)?to(?: form)?) (?:a |an |new |original |the original )?(?:short |ocean )?wav(?:e|y line)s?(?: of (?:4|four))?(?: across)?(?: with (?:next |new )?neighbors)?(?:,? -? ?(.*))?$/,
      (m, b) => {
        if (/\blong\b|\bwave\b/.test(m[1])) throw new Error('A long wave is not a wave of four.');
        const note = m[2] ?? '';
        const balance = /^(?:and )?balance\b/.test(note);
        const waveBeats = balance ? 4 : 2;
        if (b - waveBeats < 2) throw new Error('Too short to dance a figure and then form a wave.');
        const base = h.match(moreTidy(m[1]), b - waveBeats);
        if (!base) throw new Error(`No figure pattern matches "${m[1]}".`);
        return [
          ...base,
          call('ocean-wave', waveBeats, {
            ...waveFrom(note),
            ...(balance ? { balance: true } : {}),
          }),
        ];
      },
    ],
  ];
}

/**
 * The ocean wave a note describes: "robins in center left hands, right hand
 * to neighbor". Unnamed, robins in the middle by the left and neighbors by
 * the right.
 */
function waveFrom(note: string) {
  const roleIn = note.match(
    /\b(larks|robins|ladles|gentlespoons) (?:in (?:the )?(?:center|middle)|(?:take )?(?:left|right) hands? in (?:the )?(?:center|middle)|by (?:left|right))/,
  );
  const middle = roleIn
    ? /^(?:larks|gentlespoons)$/.test(roleIn[1])
      ? 'larks'
      : 'robins'
    : 'robins';
  const middleHand =
    /\bright(?: hands?)? in (?:the )?(?:center|middle)|in (?:the )?(?:center|middle),? right/.test(
      note,
    )
      ? 'right'
      : 'left';
  const endsMatch = note.match(/\b(right|left)(?: hands?)? to (partners?|neighbors?)/);
  return {
    middle,
    middleHand,
    ends: endsMatch?.[2].startsWith('partner') ? 'partner' : 'neighbor',
    endHand: middleHand === 'left' ? 'right' : 'left',
  };
}

/** Notes after a figure that name another figure, and so must be kept. */
const KEEP =
  /\b(?:waves?|wavy|lines?|ring|circle|star|hey|promenade|orbit|while|meanwhile|slide|swing|pass|pull|chain|allemande|do si do|see saw|as (?:a )?couples?|backward|balance|clover\w*|diamonds?|twirl|roll|turn alone|cast|trade|cross|arch|dive|gate|hands|petronella|diagonal|zig|zag|mad robin|figure|gyre|through|split|mirror|basket|ricochet|shift|places?|facing (?:down|up)|face (?:down|up))\b/;

const SWING_CORE =
  /^((?:(?:next|new) )?\w+ (?:balance (?:&|and) )?(?:long |meltdown )?swing)([ ,;-].+)$/;

/** A figure, then a note: [figure, note]. */
const CORES: readonly RegExp[] = [
  /^((?:(?:next|new) )?\w+ allemande (?:left|right) (?:once|twice|[^ ,]+(?: 1\/2| and a half)?))([ ,;-].+)$/,
  /^((?:(?:next|new) )?\w+ (?:do si do|see saw) (?:once|twice|[^ ,]+))([ ,;-].+)$/,
  SWING_CORE,
  /^((?:(?:next|new) )?\w+ (?:california twirl|box the gnat|swat the flea))([ ,;-].+)$/,
  /^((?:\w+ )?turn alone(?: over their (?:right|left) shoulders?)?)([ ,;-].+)$/,
  /^(balance the ring)([ ,;-].+)$/,
  /^((?:\w+ )?\w+ (?:pass|pull) by (?:right|left)(?: shoulders?)?)([ ,;-].+)$/,
  /^(long lines forward (?:&|and) back)([ ,;-].+)$/,
  /^((?:down|up) the hall(?: and (?:turn as a couple|turn alone|bend into a ring))?)([ ,;-].+)$/,
];

/** Wording folded to one spelling before the notes come off. */
const MORE_TIDY: readonly (readonly [RegExp, string])[] = [
  // Role names to larks and robins first, so the wordings below match them.
  [/\b(?:gentlespoons?|gents?|men)\b/g, 'larks'],
  [/\b(?:ladles?|ladies|women)\b/g, 'robins'],
  [/^_+\s*/, ''],
  [/[\[\]]/g, ''],
  [/\*/g, ''],
  [/[,;.]+$/, ''],
  [/\b1\.5\b/g, '1½'],
  [/\bdos-si-do\b|\bdo-si-do\b/g, 'do si do'],
  [/\bsee-saw\b/g, 'see saw'],
  [/^all (california twirl)/, 'partners $1'],
  [/\bjersey twirl\b/, 'california twirl'],
  // Alternatives ("... or cross left for a longer swing"): the first one.
  [/^((?:\w+ ){1,3}(?:allemande|do si do|see saw|swing|balance)\b[^,]*?) or .*$/, '$1'],
  [/^(\w+) balance (left|right) hands?$/, '$1 $2 hand balance'],
  [/^(\w+) balance towards and away from each other$/, '$1 balance'],
  [/^(?:california|jersey) twirl\b/, 'partners california twirl'],
  [/^(\w+ california twirl),? (?:then join two hands|and face back into the original ring)$/, '$1'],
  [/^(\w+ do si do [^ ,]+),? step back into line$/, '$1'],
  [/( - balance the wave),? (?:left|right),? then (?:left|right)$/, '$1'],
  [/^(\w+ form a long wave in the center) fleeting$/, '$1'],
  [/\s*\+{1,3}$/, ''],
  [/\bcounter-clockwise\b/g, 'counterclockwise'],
  // Ordinals that only count which neighbors these are ("4th 1st neighbors").
  [/\b(?:\d+(?:st|nd|rd|th) )+(neighbors?)\b/g, '$1'],
  [/,? 9th, not 1st$/, ''],
  [/^do si do (once|twice|[^ ]+)(?: new neighbors?)?$/, 'neighbors do si do $1'],
  [/^partners balance 1s only$/, '1s balance'],
  [/^(pass through(?: across the set)?,? (?:and )?turn alone) to face back in$/, '$1'],
  [/^pass through (?:straight ahead|in line of direction) to /, 'pass through to '],
  [/^(down the hall forward,? (?:and )?then backward) gay gord[eo]n$/, '$1'],
  [/( - balance the wave),? robins fall back .*$/, '$1'],
  [/^(\w+ do si do [^ ]+ as (?:a )?couples?),? larks lead .*$/, '$1'],
  [/^neighbors do si do once do si do as a couple .*$/, 'neighbors do si do once as couples'],
  [/^(\w+ two[- ]hand turn counterclockwise) 1\/2\/3\+ times\b.*$/, '$1 once'],
  // Where an allemande ends, told as a note.
  [
    /^((?:(?:next|new) )?\w+ allemande (?:left|right) [^ ,]+),? (?:with the next \w+ )?(?:to trade places(?: and step into a ring)?|form a ring with partners? and neighbors?|end back to back facing partners in a line of four|end facing partners? in (?:a )?line of four.*|in hands four with shadows|and go to new neighbors to do si do|this is .*)$/,
    '$1',
  ],
  [/^(\w+ allemande (?:left|right) [^ ,]+) in the center (to (?:a )?wavy line)/, '$1 $2'],
  [
    /^balance the ring,? (?:and )?roll (partners?|neighbors?) across(?: set)? half sashay$/,
    'balance the ring larks roll $1 across',
  ],
  [
    /^balance the ring,? (?:and )?roll (partners?|neighbors?)( .*)?$/,
    'balance the ring larks roll $1$2',
  ],
  [
    /^balance the ring (?:1\/2 sashay|and) roll (neighbors?|partners?) (?:with half sashay )?alone set$/,
    'balance the ring larks roll $1 along set',
  ],
  [
    /^(\w+) balance and twirl to swap(?: with)? inside hands$/,
    '$1 right hand balance & box the gnat',
  ],
  [/^(\w+ california twirl),? keep hands and reach back to partners to form a cloverleaf$/, '$1'],
  [/^balance (?:the )?wave,? -? ?right and left(?: partners? first)?$/, 'balance the wave'],
  [/^(\w+ give (?:&|and) take (?:partners|neighbors)) (?:larks|robins) bring back (?:larks|robins|partners?|neighbors?)$/, '$1'],
  [/^balance the ring,? shift one place to (?:the )?left$/, 'balance the ring and circle left one place'],
  [/^balance yourself(?:,? end facing\b.*)?$/, 'balance alone'],
  [/\b3\/2\b/g, '1½'],
  [/^balance (?:the )?wave 0f/, 'balance wave of'],
  [/^balance new wave of (?:4|four)\b.*$/, 'balance the wave'],
  [/^balance right and then left$/, 'balance'],
  [/^custom (balance the wave)$/, '$1'],
  [/^balance the ring (?:&|and) twirl right one place$/, 'balance & petronella'],
  [/\b11\/2 sashay\b/, 'half sashay'],
  [
    /^balance the ring (?:and )?half sashay roll (partners?|neighbors?) (?:across|along|alone)(?: set)?$/,
    'balance the ring larks roll $1 with half sashay across',
  ],
  [
    /roll (partners?|neighbors?) across with (?:a )?half sashay$/,
    'roll $1 with half sashay across',
  ],
  [
    /^balance the ring and roll across with (partners?|neighbors?) half sashay$/,
    'balance the ring larks roll $1 with half sashay across',
  ],
  [/^(balance (?:&|and) petronella) (?:in)?to long waves,? \w+ face (?:in|out)$/, '$1'],
  [
    /^(form an? .*ocean wave .*? by (?:left|right)(?: hands?)?) (?:smush|with next \w+ and next neighbors)$/,
    '$1',
  ],
  [/\bto along ocean wave\b/, 'to a long ocean wave'],
  [
    /^(.*allemande (?:left|right) ½),? and reform the wave - (\w+) by \w+ in the center.*$/,
    '$1 and reform the wave with $2 in the middle',
  ],
  [
    /(\bswing),? (?:end swing facing across to rejoin (?:the )?ring|end in a ring|form a ring|- and get ready to slide along (?:the )?set left)$/,
    '$1',
  ],
  // Giving two hands to the partner across is the figure that follows (give & take).
  [
    /,? (?:and )?(?:to (?:end swing and )?)?give two hands to (?:partners?|neighbors?)(?: across(?: the)? set)?$/,
    '',
  ],
  [/^(\w+ two[- ]hand turn \w+) and open into long lines$/, '$1'],
  [/^(\w+ california twirl) to (?:a )?new ring(?: progression)?$/, '$1'],
  [/^balance the ring,? (?:and )?(california twirl)\b.*$/, 'balance the ring and partners $1'],
  // Taking hands in long lines is the long lines figure that follows.
  [/,? and take hands with (?:next |new )?neighbors in long lines$/, ''],
  [/,? (?:and )?take hands(?: four)?$/, ''],
  [/^long lines go back$/, 'long lines back'],
  [/^balance (?:right|left),? (?:(?:&|and|then) )?(?:right|left)$/, 'balance'],
  [/^balance (?:the )?long waves?$/, 'balance'],
  // "(swing through)" labels an allemande ½ and a pass in the center.
  [/^(.*\b(?:allemande|pass)\b.*?)\s*\bswing through\b\s*(.*)$/, '$1 $2'],
  [/^(\w+) balance (right|left)$/, '$1 $2 hand balance'],
  [/^long lines balance$/, 'long lines forward & back'],
  [
    /^((?:(?:next|new) )?\w+ do si do [^ ,]+),? (?:in)?to (?:a |short )?(?:ocean )?waves?(?: of (?:4|four))?$/,
    '$1 to a wave',
  ],
  // "Allemande right ¾ to long wave, robins facing in", "..., forming long waves".
  [
    /^((?:(?:next|new) )?\w+ allemande (?:left|right) [^ ,]+)(?:,? (?:to|and|ending in|to take hands in|,)? ?(?:form(?:ing)? |make (?:new )?)?(?:a |new )?long (?:ocean )?wav(?:es?|y lines?)\b.*)$/,
    '$1 to long waves',
  ],
  [
    /^balance (?:the )?wave,? -? ?(right|left),? (?:&|and|then) (?:left|right)$/,
    'balance the wave $1',
  ],
  [/^(\w+) balance (?:right|left),? (?:then|and|&) (?:right|left)$/, '$1 balance'],
  [/^(\w+) balance by (?:the )?(right|left) hands?$/, '$1 $2 hand balance'],
  [
    /^as (?:a )?couples?,? (?:\w+ )?do si do(?: with \w+ couples?)?$/,
    'neighbors do si do once as couples',
  ],
  [/(\bswing),? end in a line$/, '$1'],
  [/(\bmeltdown swing) rsr then swing$/, '$1'],
  // Picking up a partner for the star promenade that follows is part of it.
  [
    /\s+to pick ?up (?:your )?partners?(?: (?:for|to form) (?:a )?(?:left hand )?star promenade)?$/,
    '',
  ],
  // A ring balance and a one-place twirl to the right is a petronella.
  [
    /^balance the ring,? (?:and )?twirl (?:right )?one (?:place|palace|palce) (?:to the right|in circle)$/,
    'balance & petronella',
  ],
  [/^balance (?:the )?(?:ring )?diamond$/, 'balance the ring'],
  [
    /^balance (?:the )?star$|^balance (?:in a |the )?clover(?:leaf)?$|^balance forward and back$/,
    'balance',
  ],
  [/^balance short waves$/, 'balance the wave'],
  [/^balance short waves forward\/back$/, 'balance the wave forward'],
  [/^(\w+ (?:right |left )?hand balance (?:&|and) (?:box the gnat|swat the flea)) across$/, '$1'],
  [/^(form long waves - \w+ face in, \w+ face out)[,.].*$/, '$1'],
  [
    /^(\w+ (?:balance (?:&|and) )?swing) \(?slide left( to (?:progress|new neighbors))?\)?$/,
    '$1, slide left$2',
  ],
  [/^balance (?:the )?wave - (right|left) then (?:left|right)$/, 'balance the wave $1'],
  [/^balance (?:the )?wave (left|right) (?:&|and) (?:left|right)$/, 'balance the wave $1'],
  // "Ones in the center" says who ends in the middle of the line; geometry decides it.
  [/,? \(?(?:ones|twos|1s|2s|tows) in the (?:center|middle)\)?$/, ''],
  [/^(up the hall and bend into a ring) to face across$/, '$1'],
  // "Neighbors swing, end in a line of four facing down": a swing ending facing down.
  [
    /^([^,]*\bswing)\b(?!.*\b(?:wave|ring|circle|star|through)\b).*?\b(?:fac(?:e|ing)|finish facing) (down|up)\b.*$/,
    '$1, end facing $2',
  ],
  // A trailing ocean-wave balance style ("- right then left", "forward and back").
  [/^(form an? .*ocean wave .*?)\s*-?\s*(?:right then left|forward and back)$/, '$1'],
  [/^(form an? .*ocean wave .*?),? (?:and form |in )short waves$/, '$1'],
  [
    /^(form an? .*ocean wave .*? by (?:left|right)(?: hands?)?)\s*-?\s*(?:the original wave|next (?:larks|robins)|with shadows in the wave|id this wave for later|new neighbors)$/,
    '$1',
  ],
];

/** Drop a trailing note that names no further figure. */
export function dropNotes(text: string): string {
  for (const core of CORES) {
    const m = text.match(core);
    if (!m) continue;
    // A swing's note often says "swing" again ("end swing facing across").
    const note = core === SWING_CORE ? m[2].replace(/\bswing\b/g, '') : m[2];
    if (/^,? end facing (?:down|up)$/.test(note)) return text;
    return KEEP.test(note) ? text : m[1];
  }
  return text;
}

/** The extra tidying for these patterns: spelling first, then notes. */
export function moreTidy(text: string): string {
  return dropNotes(MORE_TIDY.reduce((t, [pattern, to]) => t.replace(pattern, to), text).trim());
}
