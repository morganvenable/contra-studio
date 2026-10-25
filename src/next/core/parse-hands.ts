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
  // Round 2c: rows that add motion, read the standard way.
  [/^balance (?:the )?wave(?: of (?:4|four)| 4)?,? (?:and )?(larks|robins) (?:move straight(?: ahead)?|move forward)(?: to (?:a )?new wave(?: of 4)?)? while (larks|robins) (?:cross left to partner|slide left in center)\b.*$/, 'balance the wave & $1 walk forward while $2 slide left'],
  [/^balance (?:the )?wave(?: of (?:4|four)| 4)?,? (?:and )?(larks|robins) move straight(?: ahead)? while (larks|robins) cross left to partner\b.*$/, 'balance the wave & $1 walk forward while $2 slide left'],
  [/^balance larks move straight ahead while robins cross left to partner\b.*$/, 'balance the wave & larks walk forward while robins slide left'],
  [/^balance (?:the )?wave(?: of (?:4|four)| 4)?,? (?:just the )?(larks|robins) (?:move (?:straight ahead|forward))(?: to new wave.*| to new wave of 4 while (?:larks|robins) stay at home)?$/, 'balance the wave & $1 walk forward'],
  [/^balance wave 4 (robins|larks) move straight ahead to new wave of 4 while (?:larks|robins) stay at home$/, 'balance the wave & $1 walk forward'],
  [/^balance wave of 4, just the (larks|robins) move forward to new wave\b.*$/, 'balance the wave & $1 walk forward'],
  [/^balance (?:the )?(?:ocean )?wave(?: of (?:4|four)| 4)?,? (?:and )?(?:couples )?(?:move|moves) (?:forward )?on (?:the )?(?:left|right) diagonal\b.*$/, 'balance and move straight ahead to a new wave'],
  [/^balance & move forward to new wave on the (?:left|right) diagonal\b.*$/, 'balance and move straight ahead to a new wave'],
  [/^balance wave of 4 and (robins|larks) slide left in center pass each other!?$/, 'balance & $1 slide left'],
  [/^(larks allemande right 1½) to face new neighbor on right diagonal$/, '$1'],
  [/^(robins allemande right 1½) (?:new robins, )?on (?:the )?right diagonal,? (?:larks turn to face partner|while larks move up to meet partner)$/, 'right diagonal $1'],
  [/^(robins allemande left 1½) on the left diagonal with new robins\b.*$/, 'left diagonal $1'],
  [/^(robins allemande right 1½) larks cross straight across to partner$/, '$1 while larks pass through'],
  [/^robins allemande right ½ - ¾ while larks loop right$/, 'robins allemande right ¾ while larks turn alone'],
  [/^(robins allemande right ¾) new robins, larks slide r slightly$/, '$1, larks shift right'],
  [/^(larks allemande left ¾),? (?:with next larks, )?robins (?:shift left slightly|slide along set)$/, '$1, robins shift left'],
  [/^robins allemande ____ 1½ to face new neighbors and larks just turn around$/, 'robins allemande left 1½ while larks turn alone'],
  [/^(robins allemande left ½) new robins ,.*$/, '$1'],
  [/^(\w+ allemande (?:left|right) ¾) (?:in the like the larks would form a long wave|as if to form a long wave in center of set)\b.*$/, '$1 to a long wave'],
  [/^(next neighbors allemande left ¾) robins pass right shoulder in center to face partner$/, '$1, robins pass right in center'],
  [/^allemande shadow left once, allemande partner 1\/2\b.*$/, 'shadows allemande left once, partners allemande right ½'],
  [/^(robins do si do once),? (?:while )?larks (?:go straight across set|orbit half to meet partner across set)$/, (_m: string, a: string) => `${a} while larks ${_m.includes('orbit') ? 'orbit clockwise ½' : 'pass through'}`],
  [/^(neighbors do si do (?:1 1\/2|1½)),? (?:ending with larks facing in.*|progress to new neighbors in short wavy lines)$/, '$1'],
  [/^(neighbors do si do once), melt into a wavy ring\b.*$/, '$1'],
  [/^do si do current neighbor, finish in long waves\b.*$/, 'neighbors do si do once'],
  [/^see saw prev_neighbor, finishing in long wavy lines\b.*$/, 'prev_neighbors see saw once'],
  [/^(partners do si do once) end in long wavy lines\b.*$/, '$1'],
  [/^(star left 3 places) putting everyone on side of set they started the dance then larks turn turn back over right shoulder$/, '$1, larks turn alone'],
  [/^(star right - hands across - 4 places) - larks drop out, robins pull by to start$/, '$1'],
  [/^(neighbors meltdown swing) for the robins who cross over .*$/, '$1 to a wave of four'],
  [/^larks pull by left, robins cast over right shoulder$/, 'larks pull by left while robins turn alone'],
  [/^pass through left shoulders across the set larks to (?:face partner|neighbor)$/, 'pass through by the left'],
  [/^pass through across the set larks to face partner$/, 'pass through'],
  [/^larks walk across the set while robins step left, partners take right hands$/, 'larks pass through while robins shift left'],
  [/^balance & petronella shift right and make a wave of four, robins taking left hands in the wave$/, 'balance & petronella to a wave of four, robins in center left hands'],
  [/^balance & trade the wave - partners passing right\b.*$/, 'balance the wave, partners pass by right shoulders'],
  [/^trade the wave - partners passing right\b.*$/, 'partners pass by right shoulders'],
  // Round 2b: one-off rows read the standard way (docs/figure-readings.md).
  [/\.$/, ''],
  [/^balance (?:and|ans) swing(?: with neighbors?(?: 2)?)?$/, 'neighbors balance & swing'],
  [/^(?:dosido|do si do) and swing (neighbors?|partners?)(?:, end facing across)?$/, '$1 do si do once, $1 swing'],
  [/^swing partner$/, 'partners swing'],
  [/^swing the neighbor$/, 'neighbors swing'],
  [/^all swing$/, 'partners swing'],
  [/^elbow swing$/, 'partners allemande right once'],
  [/^(neighbors swing)\. neighbors then become$/, '$1'],
  [/^neighbors catch and swing$/, 'neighbors swing'],
  [/^(neighbors|partners) right shoulder and melt into swing$/, '$1 meltdown swing'],
  [/^((?:\w+ )?(?:balance & )?(?:meltdown )?swing)(?: new(?: neighbor)?)? end swing, end facing (?:down|up)$/, '$1'],
  [/^(neighbors meltdown swing) (?:everyone joins hands in large oval|new neighbor in the next wave .*)$/, '$1'],
  [/^((?:next )?neighbors (?:balance & )?swing) (?:- join hands four.*|and take hands in long lines|at the end of swing .*)$/, '$1'],
  [/^(partners (?:balance & )?(?:long )?swing),? (?:balance optional, if timing permits|preceding balance optional.*|optional balance|end facing new neighbors with 2s ready to split|and face shadows in contra lines)$/, '$1'],
  [/^partners balance & swing by balance the the ring first$/, 'balance the ring, partners swing'],
  [/^(partners meltdown swing) this is a traveling swing.*$/, '$1'],
  [/^(neighbors) long swing twirl to the swing on other side of set$/, '$1 swing'],
  [/^new partner, in right hand, balance & swing$/, 'partners balance & swing'],
  [/^this one is the new neighbor\. do si do$/, 'neighbors do si do once'],
  [/^(neighbors do si do once) and threes face up$/, '$1'],
  [/^do si do (?:once )?as couples(?:, once and a little more.*)?$/, 'partners do si do once as couples'],
  [/^mirror do si do, (ones|twos) between (?:ones|twos)$/, 'neighbors mirror do si do once, $1 splitting twos'],
  [/^neighbors do si do once mirror, (ones|twos) split (?:ones|twos)$/, 'neighbors mirror do si do once, $1 splitting twos'],
  [/^(ones|twos) split (?:ones|twos) for a mirror do si do$/, 'neighbors mirror do si do once, $1 splitting twos'],
  [/^neighbors mirror image do si do (ones|twos) split the (?:ones|twos)$/, 'neighbors mirror do si do once, $1 splitting twos'],
  [/^(?:neighbors handy hand allemande|handy hand allemande neighbor) (?:1½|1 1\/2)$/, 'ones split the twos with a handy hand allemande 1½'],
  [/^neighbor handy-hand allemande ones split the twos$/, 'ones split the twos with a handy hand allemande once'],
  [/^neighbors allemande ____ once handy hand - ones split twos$/, 'ones split the twos with a handy hand allemande once'],
  [/^neighbors mirror image allemande ones split the twos$/, 'ones split the twos with a handy hand allemande once'],
  [/^neighbors allemande ____ ¾ with connected hands, putting 1s in middle of the set$/, 'ones split the twos with a handy hand allemande ¾'],
  [/^((?:larks|robins) allemande) ____ (.*)$/, '$1 left $2'],
  [/^(larks allemande left 1½) larks allemande$/, '$1'],
  [/^(\w+ allemande (?:left|right) [^ ,]+),? (?:keep(?:ing)? (?:left )?hands\b.*|scooping up your partner.*|to face partner across the set, take hands in a ring|while (?:robins|larks) drop out|to partner, while larks drop out|to trade back to the proper side.*)$/, '$1'],
  [/^(\w+ allemande (?:left|right) [^ ,]+) while (?:robins|larks) face (?:counter)?clockwise$/, '$1'],
  [/^(\w+ allemande (?:left|right) [^ ]+) while (larks|robins) loop back over their right shoulders$/, '$1 while $2 turn alone'],
  [/^(robins allemande left ¾) with next, (larks shift left)$/, '$1, $2'],
  [/^(robins allemande left 1½) - hold on, catch neighbors by right hands$/, '$1 to a wave of four'],
  [/^((?:next |prev_)?neighbors allemande left once),? (?:on the )?(left|right) diagonal(?:, your previous partner)?$/, '$1 on the $2 diagonal'],
  [/^(next neighbors allemande right once),? and form a ring$/, '$1'],
  [/^(robins chain) (?:to opposite neighbor|to corner ii?|, end facing partner across, give right hand to partner)$/, '$1'],
  [/^robins chain – across and back$/, 'robins chain over and back'],
  [/^(robins chain to neighbor), courtesy turn ¾ .*$/, '$1'],
  [/^(robins left-hand chain) courtesy turn is optional$/, '$1'],
  [/^(left diagonal robins chain to shadow) only if there is someone there$/, '$1'],
  [/^(left diagonal larks chain) to partners with original neighbors\/larks$/, '$1'],
  [/^(larks chain) then turn$/, '$1'],
  [/^(star (?:left|right) \d places?) (?:and scatter single|four robins return to partner|into a new wave|to find|back|robins to partner|couples 1 and 1 all the way back)$/, '$1'],
  [/^(star (?:left|right) - (?:hands across|wrist grip) - \d places?),? (?:and face 2nd neigbors|- join right hand .*|left hands are conveniently placed|until larks are on their home side)$/, '$1'],
  [/^(star promenade left ½),? (?:and move right (?:along set|alone) to (?:face )?new couple|no butterfly twirl but promenade right to new couple to face across)$/, '$1, slide right'],
  [/^(star promenade left ½) the old neighbor directly across$/, '$1'],
  [/^pull by right across the set robins trade$/, 'robins pull by right'],
  [/^right hand handshake to your partner & pull by$/, 'partners pull by right'],
  [/^neighbors balance across and pull by across using right hands$/, 'neighbors balance & pull by right'],
  [/^neighbors balance by the left$/, 'neighbors left hand balance'],
  [/^pass through across the set just the robins$/, 'robins pass by right shoulders'],
  [/^(robins|larks) pass by (left|right) shoulders,? (?:across, )?((?:larks|robins) shift (?:left|right))$/, '$1 pass by $2 shoulders while $3'],
  [/^balance (?:short wave|the line right then left|the wave l, r|the wave r, l|the wave right & back with n1|the wave fwd & back\/right)$/, 'balance the wave'],
  [/^balance (?:- forward\/left & back\/right|long lines|short lines|lines of three|three face three|the line toward your partner)$/, 'balance'],
  [/^balance the ring and twirl one place to rhe right$/, 'balance the ring and twirl one place to the right'],
  [/^balance the ring and shift left one place$/, 'balance the ring, shift one place to the left'],
  [/^balance the ring larks roll neighbor half sashay.*$/, 'balance the ring, larks roll away neighbors'],
  [/^balance the ring partner roll with 1\/2 sashay$/, 'balance the ring, larks roll away partners'],
  [/^balance the ring robins cross back to partner side$/, 'balance the ring, robins trade places'],
  [/^balance and move to new wave straight ahead to new wave of 4$/, 'balance and move straight ahead to a new wave'],
  [/^balance (?:right and left|right then left|to and from neighbor|toward and away neighbor|towards and away neighbor|towards and way then away from current neighbor|towards and the away person in right hand.*?)[,;]? (?:and )?(?:spin|slide)(?: or slide|\/spin)? (?:by|past|to) .*$/, 'neighbors balance towards and away, neighbors pass by right shoulders'],
  [/^((?:next )?neighbors balance towards and away)(?: in long lines - .*)?$/, '$1'],
  [/^partners balance twirl to swap with partners$/, 'partners balance and twirl to swap inside hands'],
  [/^(partners do si do once) new partners on the left diagonal$/, '$1'],
  [/^robins do si do 1¼, catch right hands$/, 'robins do si do 1¼ to a wave'],
  [/^(robins do si do 1½) on right diagonal and go to partner$/, '$1 on the right diagonal'],
  [/^slide left along set to couple on slight left diagonal$/, 'slide left along set'],
  [/^robins pull partner to your home side into a swing$/, 'partners swing'],
  [/^(?:larks|robins) take (partners|neighbors),? (?:&|and) swing$/, '$1 swing'],
  [/^(robins give & take partners), swing$/, '$1, partners swing'],
  [/^((?:larks|robins) give & take partners) (?:to (?:the )?(?:larks|robins)'?s? (?:home )?side|ending with larks on the right)$/, '$1'],
  [/^(robins take partners) (?:back to her side of set|robins draw back parter|to robins' side with underarm turn)$/, '$1'],
  [/^(larks take (?:neighbors|partners)) (?:and go to neighbors|robins go straight across to partner)$/, '$1'],
  [/^(trios basket swing), end facing across$/, '$1'],
  [/^(twos swing) and face up to form a ring$/, '$1'],
  [/^neighbors balance & swing larks who cross over .*$/, 'neighbors balance & swing'],
  [/^right (?:and|&) left through with (?:a second )?new neighbors?\b.*$/, 'right left through'],
  [/^right left through (?:straight across, face partner up & down|courtesy turn 3\/4 til robins join right hands to begin star)$/, 'right left through'],
  [/^right left through - ones and twos only -$/, 'right left through, ones and twos only'],
  [/^(right (?:and |& )?left through) with (?:neigbor|neighbor)s?$/, '$1'],
  [/^larks reach under to take partners right hand and box the gnat.*$/, 'partners box the gnat'],
  [/^balance partner right hand and pull by right across set pass neighbor left$/, 'partners balance & pull by right'],
  // Corners (core/corners.ts): "second corners swing", "1st corners ...".
  [/\b(?:first|1st) corners?\b/g, 'first_corners'],
  [/\b(?:second|2nd) corners?\b/g, 'second_corners'],
  [/^corner (allemande|swing|balance|do si do|pull by)\b/, 'corners $1'],
  [/^(.+ allemande) l\b/, '$1 left'],
  [/^(.+ allemande) r\b/, '$1 right'],
  [/\s*\[?i\.e\. .*$/, ''],
  [/^(\S+) balance (right|left), pull by$/, '$1 balance & pull by $2'],
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
    if (depth > 1) return undefined;
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
    // "Robins courtesy turn larks": the robins turn; with the neighbor
    // beside them unless the row names partners.
    [
      /^(larks|robins) courtesy turn (?:the )?(?:(partners?|neighbors?) )?(?:larks|robins)$/,
      (m, b) => [
        call('courtesy-turn', b, {
          who: m[2]?.startsWith('partner') ? 'partner' : 'neighbor',
          turner: m[1],
        }),
      ],
    ],
    // "Partners courtesy turn 1¼ to face the center": that many turns round.
    [
      new RegExp(`^${WHO} courtesy turn (1¼|1½|once|¾)(?: to face (?:the )?(?:center|across|in))?$`),
      (m, b) => [
        call('courtesy-turn', b, {
          who: who(m[1]),
          turns: { '1¼': 1.25, '1½': 1.5, once: 1, '¾': 0.75 }[m[2]],
        }),
      ],
    ],
    // "Right left through (larks on right)", "(robins courtesy turn this same
    // neighbor larks)": the robins courtesy turn.
    [
      /^(?:(left|right) diagonal )?right (?:and |& )?left through,? (?:(larks|robins) on (?:the )?right|(larks|robins) courtesy turn\b.*)$/,
      (m, b) => {
        const turner = m[2] ? (m[2] === 'larks' ? 'robins' : 'larks') : m[3];
        return [
          call('right-left-through', b, { turner, ...(m[1] ? { diagonal: m[1] } : {}) }),
        ];
      },
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
