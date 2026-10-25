/**
 * Hands, lines, chains and partner figures: more row wordings, read after
 * every other table (parse.ts coreWithExtra), so they only catch rows
 * nothing else reads.
 *
 * Two kinds of entries:
 * - Notes: a row that names an ordinary figure and adds words that do not
 *   change its motion ("partners swing, end facing the left diagonal",
 *   "robins chain (this is shadow)", "right left through, end in a ring").
 *   The words are dropped and the rest is read by the whole table. Each
 *   reading is listed in docs/figure-readings.md.
 * - Wordings: new spellings of figures the engine already draws ("partners
 *   balance together & apart", "neighbors allemande right 3/8", "open
 *   chain", "courtesy turn").
 *
 * Same rules as parse.ts: names through roles.ts, usual defaults explicit.
 */
import type { FigureCall } from './figure.ts';

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];

export interface HandsHelpers {
  who(word: string): string;
  call(move: string, beats: number, params: Record<string, unknown>): FigureCall;
  /** Calls for a row text, read as a whole row (parse.ts parseRow). */
  match(text: string, beats: number): FigureCall[] | undefined;
}

const WHO = '((?:next |new )?[a-z_]+)';
const HAND = '(left|right|l|r)';
const handOf = (w: string) => (w === 'l' || w === 'left' ? 'left' : 'right');

/**
 * Words a row adds that do not change the figure it names. Each is cut and
 * the rest read again; several may apply in turn.
 */
type Replace = string | ((match: string, ...groups: string[]) => string);
const cut = (text: string, re: RegExp, to: Replace) =>
  (typeof to === 'string' ? text.replace(re, to) : text.replace(re, to)).trim();

const NOTES: readonly (readonly [RegExp, Replace])[] = [
  // Where to face at the end, for a figure on a diagonal next: the
  // diagonal figure gathers the couples itself (core/diagonal.ts).
  [
    /\s*[,;]?\s*-?\s*(?:and |then )?(?:end(?:ing)? (?:the )?(?:swing )?|finish(?:ing)? )?(?:and )?(?:courtesy turn )?(?:to )?(?:a little more to )?(?:fac(?:e|ing)|look)(?: on| to| for)? .*\bdiagonal\b.*$/,
    '',
  ],
  // A swing that ends facing down or up the hall: the hall figure that
  // follows turns the lines (as parse.ts already reads "end facing down").
  [/\s*,?\s*end (?:the )?swing facing (?:down|up)(?: the)? hall!?$/, ''],
  [/\s*end swing facing down to new neighbors\b.*$/, ''],
  // Who the dancers are, said again.
  [
    /^((?:next |new )?\w+ (?:balance & )?(?:meltdown |long )?swing) (?:new|swinging with .*|the one you met .*|diagonal neighbor|the larks who cross over .*)$/,
    '$1',
  ],
  [/^(.+? (?:swing|do si do [^ ]+))[,;]? (?:-\s*)?(?:end in |and form |form )(?:a |an )?(?:ring|line of four|big ring)\b.*$/, '$1'],
  [/^((?:\w+ )+chain(?: to \w+)?) (?:across set this is shadow|after larks drop|to the same neighbor they just swung|- join hands four)$/, '$1'],
  [/^((?:(?:left|right) diagonal )?\w+ chain) to reclaim partner$/, '$1 to partner'],
  [/^((?:(?:left|right) diagonal )?\w+ chain)(?: to partner)? (?:to form a circle|and end in a circle)\b.*$/, '$1'],
  [/^((?:\w+ )?\w+ chain) to n$/, '$1'],
  [/^(\w+ (?:left-hand )?chain) (?:can make it an open chain\b.*|there are no roles\b.*)$/, '$1'],
  [/^((?:(?:left|right) diagonal )?right (?:and |& )?left through)(?: with (?:partner|neighbor))?\.?,? (?!interrupted)(?:with a courtesy turn|across the set with a courtesy turn|end (?:facing|in)\b.*|pull past partner|- identify .*|identify .*|- conga line\b.*|conga line\b.*|partner swing if no one is there|power courtesy turn to face (?:up|down)|both people cross and pull their left shoulder back to wheel around|note couple on .*|pull by .*|find new neighbors across\b.*)$/, '$1'],
  [/^right (?:and |& )?left through with (?:neigbor|neighbor) on the half-(left|right) diagonal$/, '$1 diagonal right left through'],
  [/^(right (?:and |& )?left through) on (?:the )?(?:1\/2|half) (left|right) diagonal\b.*$/, '$2 diagonal $1'],
  [/^(right (?:and |& )?left through) on (left|right) 1\/2 diagonal\b.*$/, '$2 diagonal $1'],
  // Allemande notes.
  [/^(.+ allemande (?:left|right) [^ ]+) to trade$/, '$1'],
  [/^(.+ allemande (?:left|right) [^ ]+ on the (?:left|right) diagonal),? they will be closer than you think$/, '$1'],
  [/ on a (left|right) diagonal$/, ' on the $1 diagonal'],
  [/^(\w+ allemande (?:left|right) [^ ,]+),? (\w+ shift (?:left|right)) to meet partners?$/, '$1, $2'],
  // Pull by and pass by notes.
  [/^(.*pull by (?:right|left))(?: across the set)? - same dancer$/, '$1'],
  [/^(\w+ pull by (?:right|left)) swing through$/, '$1'],
  [/^(\w+ pull by (?:right|left)) - next \w+ is on (left|right) diagonal$/, '$1 on the $2 diagonal'],
  [/^(\w+ balance & pull by right) 2 along the set\b.*$/, '$1 along the set'],
  [/^(\w+ pass by (?:right|left) shoulders) \w+ trade (?:right|left) shoulder$/, '$1'],
  [/^(\w+) pass by (right|left) shoulders and take (?:rh|lh|right hands?|left hands?) as they pass$/, '$1 pull by $2'],
  [/^trade the wave - (?:dancers take one step forward, turn to face across, and )?(\w+) pass by (right|left) shoulders across$/, '$1 pass by $2 shoulders'],
  // Pass through notes.
  [/^pass through (?:improper here|pass partner right|across the set partner right|along the set neighbor right|along to shadows|straight ahead to new neighbors|to face sides|to face a new neighbor|past partners to face shadows|and form a ring|across the set)$/, 'pass through'],
  [/^pass through; pass your partner by the right to find your shadow$/, 'pass through'],
  // Balances.
  [/^balance (?:the )?(?:ocean )?wave(?: of (?:4|four)| 4| o 4)?,?(?: and)?$/, 'balance the wave'],
  [/^balance (?:the )?(?:short )?waves? (?:right & back|left & right|to the right and left)$/, 'balance the wave'],
  [/^balance (?:left & right|right & left) wave of (?:4|four)$/, 'balance the wave'],
  [/^balance (?:the )?(?:ring )?balance in and out$|^balance ring 1?$|^balance in and out$/, 'balance the ring'],
  [/^balance (?:the )?star with n1$/, 'balance the ring'],
  [/^balance the ring shift left one place$/, 'balance the ring, shift one place to the left'],
  [/^(balance the ring and twirl one place to the right) and a little more to face new neighbor$/, '$1'],
  [/^(balance & rory o'more (?:left|right)) (?:in )?long waves?$/, '$1'],
  // Do-si-dos.
  [/^((?:next |new )?\w+) do si do ([^ ,]+),? (?:tion )?as (?:a )?couples?\b.*$/, '$1 do si do $2 as couples'],
  [/^((?:next |new )?\w+) do si do$/, '$1 do si do once'],
  [/^do si do current neighbor$/, 'neighbors do si do once'],
  [/^(\w+ do si do [^ ]+) (?:option: .*|do si do neighbor in front of you)$/, '$1'],
  // Stars.
  [/^(star (?:left|right)(?: - (?:hands across|wrist grip) -)? \d places?) (?:next couple|with shadow 1 &.*|with shadows and.*|- reach right hand.*|couples 1 and 2|about [\d.]+ places for larks one|larks are behind partners - progress.*|then robins join free right hands over star before letting go of star)$/, '$1'],
  // "Star ... to long waves": the long-wave balance that follows forms them.
  [/^(star (?:left|right)(?: - (?:hands across|wrist grip) -)? \d places?),? (?:star )?(?:in)?to (?:a )?long (?:ocean )?waves?\b.*$/, '$1'],
  // "Robins dance in to a long wave in the center - balance the wave (and
  // remain)", "robins to the center to a long wavy line, balance, and stay there".
  [/^(\w+ dance in to a long wave in the center - balance the wave),? (?:and remain|and stay|there are interlinked wavy lines|current neighbor in your right hand)$/, '$1'],
  [/^(larks|robins) to the center to a long wavy line, balance, and stay there\b.*$/, '$1 dance in to a long wave in the center - balance the wave'],
  // Spellings.
  [/\bfoward\b/, 'forward'],
  [/^(\w+) chain by left hand, to partner$/, '$1 left-hand chain'],
  [/^(\w+) chain new \w+ on slight (left|right) diagonal - \w+ pull by l, right courtesy turn with partner$/, '$2 diagonal $1 left-hand chain'],
  [/^(\w+ do si do 1¼) and form an ocean wave$/, '$1 to a wave'],
  [/^(next neighbors see saw once) and form a ring with original neighbors$/, '$1'],
  [/^(partners balance & swing) wave$/, '$1'],
  [/^(partners balance) dancers must turn enough to face their partners in the other minor set$/, '$1'],
  [/^facing star (clockwise|counterclockwise) 3\/4$/, 'facing star $1 3 places'],
  [/^(larks|robins) star (l|r) halfway$/, '$1 star $2 ½'],
  // Waves named after the figure that forms them.
  [/^((?:next |new )?\w+ do si do [^ ]+) to right hand ocean wave, (larks|robins) in center$/, '$1 to a wave of four, $2 in center'],
  [/^(\w+ allemande (?:left|right) [^ ]+) to give right hand to neighbor to make wave of 4$/, '$1 to a wave of four'],
  [/^(form an ocean wave & balance - .* by (?:left|right) hands) the wave$/, '$1'],
  [/^balance the ring and twirl to (wave of four .*)$/, 'balance & petronella to a $1'],
  [/^(star (?:left|right)(?: - (?:hands across|wrist grip) -)? \d places?),? (?:then with next neighbors|then|turn away from the star toward your shadow|- turn away to meet .*|to find new neighbors)$/, '$1'],
  [/^(star (?:left|right) - (?:hands across|wrist grip) - \d places?) (?:larks are behind partners - progress to next neighbors|with robins stepping in behind their partner|- robins begin, larks join behind partner|robins begin, larks join behind partner|once and come back to original couple|robins drop out at the end, and wait briefly for partner|- larks drop out at home, robins switch to an allemande grip)$/, '$1'],
  [/^(star (?:left|right) \d places?) -+ larks join behind your partner$/, '$1'],
  [/^(star (?:left|right) \d places?), robins joining behind and ending across from neighbors$/, '$1'],
  [/^(star (?:left|right) [\d/]+) wrist grip with these prev_neighbors do not rush this$/, '$1'],
  // Star promenades.
  [/^((?:\w+ )?star promenade (?:left|right) ½) (?:scoop your partner plunder|- \w+ pick up your partner\b.*|partners are scooped up and brought across set)$/, '$1'],
  // Orbits: "X do si do while Y turn back over their left shoulders and
  // orbit counterclockwise half way around": the do-si-do with the orbit.
  [
    /^(\w+) (do si do|see saw|allemande (?:left|right))(?: ([^ ,]+))?(?: around)?(?: in the middle)?,? while (?:the )?(\w+) (?:exchange places by )?(?:turn(?:ing)? (?:back )?over (?:their )?(?:left|right) shoulders? and )?orbit(?:ing)? (clockwise|counter ?clockwise|cw|ccw) (½|1\/2|half|once)(?: way)?(?: around)?(?:[\s.,].*)?$/,
    (_m, a, f, amt, b, d, around) =>
      `${a} ${f} ${amt ?? 'once'} while ${b} orbit ${d} ${around === 'once' ? 'once' : '½'}`,
  ],
  [/^(balance the ring and twirl one place to the right) and a little more$/, '$1'],
  [/^pass through (?:straight ahead|to face a)$/, 'pass through'],
  [/^pass through across the set with a courtesy turn, right and left across the set$/, 'right left through'],
  [/^(\w+ allemande (?:left|right) ½) continue the star to partner$/, '$1'],
  [/^balance the ring (larks|robins) trade across to form ring$/, 'balance the ring, $1 trade places'],
  [/^balance the ring (larks|robins) roll partner from left to right with half sashay across set$/, 'balance the ring, $1 roll away partners'],
  [/^(circle left \d places) on left diagonal to meet partner$/, '$1 on the left diagonal'],
  [/^(circle left \d places) with couple on your (left|right) diagonal$/, '$2 diagonal $1'],
  [/^(circle left \d places) with this neighbor ready to balance and swing to a wave of 4$/, '$1'],
  [/^neighbor left hand balance & swap the flea$/, 'neighbors left hand balance & swat the flea'],
  [/^neighbors balance across set inside hands and twirl to swap$/, 'neighbors balance and twirl to swap inside hands'],
  [/^partners balance star through larks right robins left twirl to swap inside hands$/, 'partners balance & star thru'],
  [/^balance (?:and )?(larks|robins) shift (left|right)(?: in center| to \w+)?$/, 'balance & $1 slide $2'],
  [/^hands across (left|right) (\d) places$/, 'star $1 - hands across - $2 places'],
  // Two-hand turns: "larks two-hand turn, once around", "partners two-hand
  // turn and open to face across", "... any amount, end facing down ...".
  [/^((?:\w+ )?two-hand turn),? once(?: around)?$/, '$1 once'],
  [/^(\w+ two-hand turn) (?:and open to face across|any amount, end facing down in line of four)$/, '$1 once'],
  [/^two-hand turn once$/, 'partners two-hand turn once'],
  // "Larks cross by the right": they pass by that shoulder.
  [/^(larks|robins) cross by (?:the )?(right|left)$/, '$1 pass by $2 shoulders'],
  // Pass through notes.
  [/^pass through across the set(?:,? (?:to )?face out| to meet on the other side)$/, 'pass through'],
  [/^pass through(?: across the set)? to partners$/, 'pass through'],
  [/^pass through, ones split the twos$/, 'pass through'],
  [/^(right (?:and |& )?left through) - identify$/, '$1'],
  // Swing through.
  [/^swing though$/, 'swing through'],
];

/** Tries one note cut at a time, then all that apply together. */
function withoutNotes(text: string): string[] {
  const out: string[] = [];
  let all = text;
  for (const [re, to] of NOTES) {
    const one = cut(text, re, to);
    if (one && one !== text) out.push(one);
    const next = cut(all, re, to);
    if (next) all = next;
  }
  if (all !== text && !out.includes(all)) out.push(all);
  return out;
}
const NOTE_TRIGGER = new RegExp(NOTES.map(([re]) => `(?:${re.source})`).join('|'));

/** n/d of a turn: "3/8", "5/4", "4/3". */
const fraction = (n: string, d: string) => {
  const v = Number(n) / Number(d);
  if (!(v > 0 && v <= 4)) throw new Error(`Unknown amount "${n}/${d}".`);
  return v;
};

const AMOUNTS: Readonly<Record<string, number>> = {
  '½': 0.5,
  '1/2': 0.5,
  '¾': 0.75,
  '3/4': 0.75,
  once: 1,
  '1': 1,
  '1½': 1.5,
  '1 1/2': 1.5,
  twice: 2,
};
const handsAmount = (word: string) => {
  const a = AMOUNTS[word];
  if (a === undefined) throw new Error(`Unknown amount "${word}".`);
  return a;
};

let depth = 0;

export function handsPatterns(h: HandsHelpers): readonly (readonly [RegExp, Build])[] {
  const { who, call } = h;
  const again = (text: string, beats: number) => {
    if (depth > 0) return undefined;
    depth++;
    try {
      return h.match(text, beats);
    } catch {
      return undefined;
    } finally {
      depth--;
    }
  };
  return [
    // "neighbors allemande right 3/8", "centers allemande l 5/4".
    [
      new RegExp(`^${WHO} allemande ${HAND} (\\d)/(\\d)$`),
      (m, b) => [call('allemande', b, { who: who(m[1]), hand: handOf(m[2]), amount: fraction(m[3], m[4]) })],
    ],
    // "Partners courtesy turn", "new neighbor courtesy turn, face across",
    // "robins give partner left hand for a courtesy turn".
    [
      new RegExp(`^${WHO} courtesy turn(?:,? (?:to )?face across\\b.*)?$`),
      (m, b) => [call('courtesy-turn', b, { who: who(m[1]) })],
    ],
    [
      /^robins give (partner|neighbor) left hand for a courtesy turn$/,
      (m, b) => [call('courtesy-turn', b, { who: m[1] })],
    ],
    // "Partners two-hand turn 3 times": that many turns.
    [
      new RegExp(
        `^${WHO} two[- ]hand turn(?: (clockwise|counterclockwise))? (\\d|two|three|four) times$`,
      ),
      (m, b) => {
        const n = Number(m[3]) || { two: 2, three: 3, four: 4 }[m[3] as 'two'];
        return [
          call('two-hand-turn', b, {
            who: who(m[1]),
            amount: n,
            ...(m[2] ? { direction: m[2] } : {}),
          }),
        ];
      },
    ],
    // "neighbors balance inside hands", "partners balance together & apart",
    // "partners balance right hands along": a pair balance.
    [
      new RegExp(
        `^${WHO} balance(?: across set)? (?:with )?(?:inside hands?|outside hands|joined hand|handy hand\\b.*|together & apart|towards? each other and away|to(?:wards?)? and (?:from|away)(?: from)? \\w+|larks right hand, robins left hand|sideways - inside hands)$`,
      ),
      (m, b) => [call('balance', b, { formation: 'pair', who: who(m[1]), hand: 'none' })],
    ],
    [
      new RegExp(`^${WHO} balance (right|left) hands? along$`),
      (m, b) => [call('balance', b, { formation: 'pair', who: who(m[1]), hand: m[2] })],
    ],
    // "Balance (the ring/everyone)": what the dancers hold now.
    [/^balance everyone$/, (_m, b) => [call('balance', b, { formation: 'current' })]],
    // "Same roles balance, robins balance (in the center of the wave)": the
    // wave the dancers hold.
    [
      /^same[ _]roles balance(?: (?:larks|robins) balance(?: in center of (?:long )?ocean wave| long wave)?| long wave(?: in center robins)?)?$/,
      (_m, b) => [call('balance', b, { formation: 'current' })],
    ],
    // "Robins chain (open chain: robins pull by R, N allemande L 3/4)": the
    // pull by, then an allemande instead of the courtesy turn.
    [
      /^(\w+) chain open chain: \w+ pull by (r|l|right|left), (?:n|neighbors?|partners?) allemande (l|r|left|right) 3\/4$/,
      (m, b) => {
        const pull = Math.min(4, Math.max(2, Math.round(b * 0.4)));
        return [
          call('pass-by', pull, { who: who(m[1]), shoulder: handOf(m[2]), hands: true }),
          call('allemande', b - pull, { who: 'neighbor', hand: handOf(m[3]), amount: 0.75 }),
        ];
      },
    ],
    // "Larks/robins do si do ½ to trade places": half a do-si-do passes by
    // the right shoulder into the other's place, still facing the same way.
    [
      /^(larks|robins|\w+) do si do ½ to trade places$/,
      (m, b) => [call('pass-by', b, { who: who(m[1]), shoulder: 'right', hands: false })],
    ],
    // "Swing through: neighbors allemande right ½, larks allemande left ½":
    // the two half turns, half the beats each.
    [
      /^(?:swing through:? -? ?)?(?:allemande (\w+) by the (right|left) halfway|((?:next |new )?\w+) allemande? (right|left) (?:½|1\/2|halfway)),? ((?:next |new )?\w+) allemande? (?:by the )?(left|right) (?:½|1\/2|halfway)\b.*$/,
      (m, b) => [
        call('allemande', b / 2, {
          who: who(m[1] ?? m[3]),
          hand: m[2] ?? m[4],
          amount: 0.5,
        }),
        call('allemande', b / 2, { who: who(m[5]), hand: m[6], amount: 0.5 }),
      ],
    ],
    // "Partners allemande right once, larks pass left (in center) (to come
    // back to neighbor)": the allemande, then the pass in the middle.
    [
      new RegExp(
        `^${WHO} allemande (right|left) ([^ ,]+),? (larks|robins) (?:pass|cross) (left|right)(?: in (?:the )?center)?(?: to .*)?$`,
      ),
      (m, b) => {
        const turnBeats = Math.max(b - 2, b / 2);
        const amount = handsAmount(m[3]);
        return [
          call('allemande', turnBeats, { who: who(m[1]), hand: m[2], amount }),
          call('pass-by', b - turnBeats, { who: who(m[4]), shoulder: m[5], hands: false }),
        ];
      },
    ],
    // "Shadows allemande left once (and) pass partner right": the turn, then
    // partners pass by.
    [
      new RegExp(
        `^${WHO} allemande (right|left) ([^ ,]+),? (?:and )?pass (?:your )?(?:partner|prarner) (right|left)(?: and go to .*)?$`,
      ),
      (m, b) => {
        const turnBeats = Math.max(b - 2, b / 2);
        return [
          call('allemande', turnBeats, { who: who(m[1]), hand: m[2], amount: handsAmount(m[3]) }),
          call('pass-by', b - turnBeats, { who: 'partner', shoulder: m[4], hands: false }),
        ];
      },
    ],
    // "Balance (wave of 4), robins allemande left halfway (to face partner)":
    // a balance of what the dancers hold, then the allemande.
    [
      /^balance(?: the wave| wave(?: of 4)?)?,? (?:& |and )?(larks|robins) allemande (left|right) (½|halfway|once|1½)(?: to face partner| back to neighbor)?$/,
      (m, b) => [
        call('balance', 4, { formation: 'current' }),
        call('allemande', b - 4, {
          who: m[1],
          hand: m[2],
          amount: m[3] === 'halfway' ? 0.5 : handsAmount(m[3]),
        }),
      ],
    ],
    // "Balance (the wave) & larks pull by (right)": a balance of what the
    // dancers hold, then that role pulls by.
    [
      /^balance(?: the wave| wave)?,? (?:& |and )?(larks|robins) pull by(?: (right|left))?$/,
      (m, b) => [
        call('balance', 4, { formation: 'current' }),
        call('pass-by', b - 4, { who: m[1], shoulder: m[2] ?? 'right', hands: true }),
      ],
    ],
    // "Balance the ring, neighbors swing to a wave of four ...", "balance
    // wave of 4, robins allemande left once": the balance, then the rest of
    // the row as its own figure.
    [
      /^balance (the ring|ring|the wave|wave(?: of (?:4|four))?)[,;]? (?:& |and )?(?!and\b)(.+)$/,
      (m, b) => {
        if (b < 6) throw new Error('No figure pattern matches this balance row.');
        const rest = again(m[2], b - 4);
        if (!rest) throw new Error(`No figure pattern matches "${m[2]}".`);
        const ring = m[1].endsWith('ring');
        return [call('balance', 4, { formation: ring ? 'ring' : 'current' }), ...rest];
      },
    ],
    // Notes: cut them and read the rest with every table.
    [
      NOTE_TRIGGER,
      (m, b) => {
        const text = m.input!;
        for (const cut of withoutNotes(text)) {
          const calls = again(cut, b);
          if (calls) return calls;
        }
        throw new Error(`No figure pattern matches "${text}".`);
      },
    ],
  ];
}
