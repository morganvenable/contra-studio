/**
 * The last reading a row gets (parse.ts tries it after every other table
 * and the loose reading): travel figures (the hall, promenades, circles,
 * slides, walking forward), formation notes and one-off prose.
 *
 * Most rows here are an ordinary figure with words the other tables do not
 * drop ("slide left along set (slightly)", "partners promenade on the
 * left"): the pattern rewrites the row to the plain wording and reads that
 * again. Rows that only say where the dancers are, or that are a section
 * label or a comment ("A1:", "(it's a slip jig)"), read as no call: zero
 * beats, nothing drawn; with beats, everyone stands still.
 * Readings are listed in docs/figure-readings.md.
 */
import type { FigureCall } from './figure.ts';
import { parseRow } from './parse.ts';

type Build = (m: RegExpMatchArray, beats: number) => FigureCall[];

const call = (move: string, beats: number, params: Record<string, unknown>): FigureCall => ({
  move,
  beats,
  params,
});

/** The calls another wording of the row reads as (all tables), unlabeled. */
function again(text: string, beats: number): FigureCall[] {
  return parseRow({ text, beats }).map(({ move, beats: b, params }) => ({ move, beats: b, params }));
}

/** A rewrite: the row reads as `to` (with $1 ... from the match). */
const as =
  (to: string): Build =>
  (m, b) =>
    again(
      to.replace(/\$(\d)/g, (_s, i) => m[Number(i)] ?? ''),
      b,
    );

/** Nothing to draw: a zero-beat note, or everyone standing still for the row's beats. */
const nothing: Build = (_m, b) => (b > 0 ? [call('stand-still', b, {})] : []);

/** Two parts of a row: the first takes `first` beats (or a share), the second the rest. */
const both =
  (one: string, two: string, first: (beats: number) => number): Build =>
  (m, b) => {
    const fill = (t: string) => t.replace(/\$(\d)/g, (_s, i) => m[Number(i)] ?? '');
    const a = first(b);
    return [...again(fill(one), a), ...again(fill(two), b - a)];
  };

const PATTERNS: readonly (readonly [RegExp, Build])[] = [
  // ---- Slides along the set ----
  [
    // "slide left along set 2 places", "... pass two couples", "bounce off
    // first couple and go to next couple": two places.
    /^(?:slide|shift) (left|right)(?: along (?:the )?set)?(?: with partners?)? (?:2 places|two places|pass two couples|bounce off (?:the )?first(?: couple)? and go (?:to )?(?:the )?next(?: couple)?)$/,
    (m, b) => [call('slide', b, { direction: m[1], places: 2 })],
  ],
  [
    // "slide left along set one person (so the larks face larks)": half a place.
    /^slide (left|right) along (?:the )?set one person(?: .*)?$/,
    (m, b) => [call('slide', b, { direction: m[1], places: 0.5 })],
  ],
  [
    // "... come back (one couple)": back the other way one place.
    /^slide (left|right) along (?:the )?set come back(?: .*)?$/,
    (m, b) => [call('slide', b, { direction: m[1] === 'left' ? 'right' : 'left' })],
  ],
  [
    // Notes after a slide: who leads, whom it passes, what it is for.
    /^(slide (?:left|right)) (?:along (?:the )?set|pass(?:ing)? (?:partners?|neighbors?)|past (?:partners?|neighbors?))(?:[ ,-].*)?$/,
    as('$1 along set'),
  ],
  [
    // A swing that "gets ready to slide left" is the swing; "... then slide
    // left" is the swing, then the slide (2 beats).
    /^((?:next |new )?\w+) ((?:balance (?:&|and) )?(?:long |meltdown )?swing)(?:\.+|,)? (?:and )?get ready to slide left$/,
    as('$1 $2'),
  ],
  [
    /^((?:next |new )?\w+) ((?:balance (?:&|and) )?(?:long |meltdown )?swing)(?:\.+|,)? (?:and )?(?:then )?slide left$/,
    both('$1 $2', 'slide left along set', (b) => b - 2),
  ],

  // ---- Down and up the hall ----
  [
    /^down the hall and slide doors(?:[ ,].*)?$/,
    (_m, b) => [call('hall', b, { direction: 'down', turn: 'doors' })],
  ],
  [
    // A cozy line is the line of four turning to come back up close together.
    /^down the hall and form a cozy line(?: .*)?$/,
    (_m, b) => [call('hall', b, { direction: 'down', turn: 'alone' })],
  ],
  [/^(down|up) the hall,? (?:four|4) in (?:a )?line$/, as('$1 the hall')],
  [/^(down|up) the hall (?:as couples|(?:4|four) steps(?: forward)?)(?:[ ,].*)?$/, as('$1 the hall')],
  [
    /^(down|up) the hall backward(?: (?:4|four) (?:more )?steps(?: back)?)?$/,
    (m, b) => [call('hall', b, { direction: m[1], backward: true })],
  ],
  [
    // Coming up, the line bends (or hand casts, or the ends cast the middles
    // around) into a ring of four facing in.
    /^up the hall(?: -|,| and)? (?:bend the line|bend \*?out\*? to long lines|hand cast(?: off)?|(?:ones|twos|1s|2s) (?:hand )?cast)(?:[ ,].*)?$/,
    (_m, b) => [call('hall', b, { direction: 'up', end: 'ring' })],
  ],
  [
    /^up the hall backward,? (?:and )?bend the line$/,
    (_m, b) => [call('hall', b, { direction: 'up', backward: true, end: 'ring' })],
  ],
  [
    // "Up the hall forward then backward (and bend into a ring)": half the
    // beats up, half back down still facing up.
    /^up the hall forward,? (?:and )?then backward( and bend into a ring)?(?: .*)?$/,
    (m, b) => [
      call('hall', b / 2, { direction: 'up' }),
      call('hall', b / 2, { direction: 'down', backward: true, ...(m[1] ? { end: 'ring' } : {}) }),
    ],
  ],
  [
    /^up the hall and bend into a ring,? (?:the )?(?:2s|twos) arch?c?h? and (?:the )?(?:1s|ones) go through(?: .*)?$/,
    both('up the hall and bend into a ring', 'twos arch ones dive', (b) => b - 2),
  ],

  // ---- Promenades ----
  [/^(?:next|new|1st|2nd|first|second) (neighbors? promenade .*)$/, as('$1')],
  [
    // "partners promenade on the left": along the set on that side.
    /^((?:\w+ )?promenade) on the (left|right)(?:[ ,].*)?$/,
    as('$1 along the set on the $2'),
  ],
  [
    // "neighbors promenade the oval" (counterclockwise), "... back along the
    // oval": half way round the whole set, single file.
    /^(?:\w+ )?promenade (the oval|back along the oval)(?:[ ,].*)?$/,
    (m, b) => [
      call('oval', b, {
        direction: m[1] === 'the oval' ? 'right' : 'left',
        half: true,
        facing: 'travel',
      }),
    ],
  ],
  [
    // "Partners promenade and a little more (3/4) to face up and down",
    // "neighbors promenade 3/4 to face partner up & down", "promenade across
    // and continue to face along the set": three quarters round the minor set.
    /^(partners|neighbors) promenade(?: across)?(?: the)?(?: set)?,? (?:and )?(?:a little more|3\/4|¾|continue to face along)(?:[ ,].*)?$/,
    (m, b) => [
      call('promenade-around', b, { who: m[1] === 'partners' ? 'partner' : 'neighbor', amount: 0.75 }),
    ],
  ],
  [
    /^promenade (\w+) places? (cw|ccw|clockwise|counterclockwise) (?:around|aroumd) (?:the )?(?:group|ring|minor set)(?: of (?:4|four))?(?: .*)?$/,
    (m, b) => [
      call('promenade-around', b, {
        who: 'partner',
        amount: ({ one: 1, two: 2, three: 3, '1': 1, '2': 2, '3': 3 }[m[1]] ?? NaN) / 4,
        direction: /^(?:cw|clockwise)$/.test(m[2]) ? 'cw' : 'ccw',
      }),
    ],
  ],
  [
    // A wide loop after the promenade is the J-hook on to the next couple.
    /^((?:\w+ )?promenade)(?: across)?(?: and)?(?: in courtesy turn position)?(?: -)?(?: with)?(?: a)? (?:little |loop )?wide(?: loop)?(?: left)?(?:[ ,].*)?$/,
    as('$1 and loop left'),
  ],
  [
    /^((?:\w+ )?promenade)(?: across)?,? (?:passing \w+,? )?and loop(?:[ ,].*)?$/,
    as('$1 and loop left'),
  ],
  [
    /^((?:\w+ )?promenade)(?: across)?,? but during the courtesy turn shift .*$/,
    as('$1 and loop left'),
  ],
  [
    /^(\w+) promenade counterclockwise around (?:the )?set one place(?:[ ,].*)?$/,
    as('$1 promenade and loop left'),
  ],
  [
    // Who passes whom, and how the couple turns: the ordinary promenade.
    /^(\w+) (?:reverse courtesy turn and )?promenade(?: across)?(?: the)?(?: set)?,? (?:(?:larks|robins) pass (?:left|right) in (?:the )?(?:center|middle)|pass (?:left|right) as couples)(?: .*)?$/,
    as('$1 promenade'),
  ],
  [/^(\w+) reverse courtesy turn and promenade(?: across)?(?: the)?(?: set)?(?: .*)?$/, as('$1 promenade')],
  [
    // A single-file promenade along the set: one place, single file.
    /^(?:(?:partners )?turn to their right and )?single[- ]file promenade(?: along (?:the )?(?:major )?set)?(?: (clockwise|counterclockwise|cw|ccw))?(?: to (?:next|new) \w+)?(?: \(?\w+ leading (?:partner|partners)\)?)?$/,
    (m, b) => [call('slide', b, { direction: way(m[1]), facing: 'travel' })],
  ],
  [
    /^walk single file along (?:the )?set(?: \w+ leading)?(?: to (?:next|new) \w+)?$/,
    (_m, b) => [call('slide', b, { direction: 'progression', facing: 'travel' })],
  ],
  [
    // "single file promenade clockwise 1/2": round the ring of four, single file.
    /^single[- ]file promenade (clockwise|counterclockwise|cw|ccw) (1\/2|½|halfway)(?: .*)?$/,
    (m, b) => [
      call('circle', b, { direction: /^(?:cw|clockwise)$/.test(m[1]) ? 'left' : 'right', places: 2, singleFile: true }),
    ],
  ],
  [
    /^single[- ]file promenade (two|three|2|3) places$/,
    (m, b) => [call('circle', b, { direction: 'right', places: { two: 2, three: 3 }[m[1]] ?? Number(m[1]), singleFile: true })],
  ],
  [
    // Notes on how a swing ends, and reminders for the next figure.
    /^(.*\bswing),? (?:end )?(?:swing )?in promenade position$/,
    as('$1'),
  ],
  [/^(ones swing), end facing next neighbors twos: be ready .*$/, as('$1')],
  [/^(down|up) the hall and turn (alone|as a couple)(?:[ ,].*)?$/, as('$1 the hall and turn $2')],
  [/^down the hall and bend the line$/, (_m, b) => [call('hall', b, { direction: 'down', end: 'ring' })]],
  [
    // A swing (or gyre) that ends ready for a ring: the swing; the ring forms itself.
    /^((?:next |new )?\w+ (?:balance (?:&|and) )?(?:meltdown |long )?swing|\w+ gyre once),? (?:end|join|to face)(?:(?! turn ).)* (?:circle|ring)(?: at end of swing with neighbor)?$/,
    as('$1'),
  ],
  [/^ones swing ones swing in the middle of set .*$/, as('ones swing')],
  [/^(.*\bswing),? end swing,? (?:end )?facing (up|down)(?: (?:the )?hall)?$/, as('$1, end facing $2')],
  [/^with (?:neighbors?|partners?),? slide along (?:the )?set(?: to \w+)?$/, (_m, b) => [call('slide', b, { direction: 'progression' })]],
  [/^(star promenade (?:left|right) \S+) and move (left|right) along (?:the )?set(?: to (?:a )?new couple)?$/, both('$1', 'slide $2 along set', (b) => b - 2)],
  [/^(\w+ pass by (?:right|left)(?: shoulders?)?) to reform circle(?: .*)?$/, as('$1')],
  [
    // "robins allemande right 1½ with next robins; larks slide left 1 place".
    /^(\w+ allemande (?:left|right) \S+) (?:with|w\/) (?:next |new )?(?:neighbor )?\w+[;,]? (?:meanwhile,? )?(\w+) (?:slide|shift) (left|right)(?: along (?:the )?set| 1 place| one place)?$/,
    as('$1 while $2 shift $3'),
  ],
  [
    // A figure "ending in a line of four facing down": the down the hall that
    // follows forms the line.
    /^(.+?),? (?:-|and)? ?(?:end (?:in a line of (?:4|four) )?|power courtesy turn to end |)fac(?:e|ing) (?:down|up) the hall$/,
    as('$1'),
  ],
  [/^(.+?) -? ?end in a line of (?:4|four)(?: facing)? (?:down|up)(?: the hall)?$/, as('$1')],

  // ---- Circles ----
  [
    // Who is in the ring, and how it is held: the circle of the minor set.
    /^(circle (?:left|right) (?:\w+ places?|[^ ]+))(?: -|,)? (?:with (?:couple \d|neighbors?|partners?(?: and original hands four)?|right-hand couple|couple below|new neighbors ready to start dance again!?|n\d)|hands free zombie walk|hold the ring|follow your left hand|(?:robins|larks) lead|until (?:across from partners|on side of the set with neighbors)|to form,? with current neighbors,?|to face neighbor up and down set|and smush|i\.e\. ½ way|1\/2|2\/2|finish the circle .*|with next neighbors, circle r halfway|minor set|all six|larks are already going ccw|dance starts with same coupe larks lead out|join right hand with neighbor in allemande hold|whole circle set circle left|¹ and look away from this set|face partner up & down|hands six, circle halfway|end becket indecent with shadow|no hands, eyes on partner)$/,
    as('$1'),
  ],
  [/^(circle (?:left|right) \w+ places?),? (?:and )?pass (?:through|thru) to (?:new |next )?(?:neighbors?|first corners)(?: .*)?$/, as('$1 and pass through')],
  [/^(circle (?:left|right) \w+ places?),? pass (?:through|thru) to next$/, as('$1 and pass through')],
  [/^(circle (?:left|right) \w+ places?) and pass partners? right$/, both('$1', 'partners pass by right', (b) => b - 2)],
  [
    /^(circle (?:left|right) \w+ places?) and pass neighbors?(?: \d)? by left(?: shoulders?)?(?: to face .*)?$/,
    both('$1', 'neighbors pass by left', (b) => b - 2),
  ],
  [
    /^(circle (?:left|right) \w+ places?),? (?:and )?(?:collapse|reform)(?: to)? (?:a )?(?:short )?wave(?: .*)?$/,
    as('$1 to wave of four'),
  ],
  [/^(circle (?:left|right) \w+ places?) and ca twirl(?: .*)?$/, as('$1 and partners california twirl')],
  [/^(circle (?:left|right) \w+ places?) and roll neighbor alone set(?: .*)?$/, as('$1 and larks roll neighbor along set')],
  [/^(circle (?:left|right) \w+ places?) and roll larks roll (\w+) along set(?: .*)?$/, as('$1 and larks roll $2 along set')],
  [/^(circle (?:left|right) \w+ places?) larks roll (\w+) along set(?: .*)?$/, as('$1 and larks roll $2 along set')],
  [
    /^(circle (?:left|right) \w+ places?) and shift(?: let| left)?(?: with the \w+ in the lead)?(?: to new couple along set|,? to face new couple to form a circle)?$/,
    both('$1', 'slide left along set', (b) => b - 2),
  ],
  [/^circle (left|right) 3\/4\.?,? (partners|neighbors) swing(?: .*)?$/, as('circle $1 3 places, $2 swing')],
  [
    /^(circle (?:left|right) \w+ places?),? single[- ]file,? (\w+) turn back over (?:their )?(right|left) shoulders?$/,
    as('$1 single-file, $2 turn back to face partners'),
  ],
  [/^(circle (?:left|right) \w+ places?) single file (?:cw|ccw)(?:,? .*)?$/, as('$1 single file')],
  [/^promenade single file around the circle (\w+) places?$/, as('circle right $1 places single file')],
  [/^circle (left|right) (\w+) places? (?:"cloverleaf" left|as the cloverleaf|into a)$/, as('circle $1 $2 places in a cloverleaf')],
  [/^circle (left|right) (\w+) places? while facing outward from the circle(?:[ ,].*)?$/, as('clover $1 $2 places')],
  [
    // A whole set circling as one oval ("circle left 4 places as in oval").
    /^circle (left|right) (\w+) places? as in oval(?: .*)?$/,
    (m, b) => [call('oval', b, { direction: m[1], places: count(m[2]) })],
  ],
  [
    /^circle (left|right) (\w+) places? (?:in large oval|come back in oval)(?: .*)?$/,
    (m, b) => [call('oval', b, { direction: m[1], places: count(m[2]) })],
  ],

  // ---- Balances in a ring that move on ----
  [
    // "Balance the circle, slide/spin right one place" (an Allen Ortep
    // shift): a ring balance and a petronella that way.
    /^(?:balance (?:the |in a )?circle|circle balance)(?: \(?(?:on )?(?:left foot )?(?:then right)?\)?)?,?(?: starting on left foot,?| left foot first,?)? (?:and )?(?:slide\/spin|spin\/slide|shift|individually shift or spin) (left|right) one place(?:[ ,.].*)?$/,
    as('balance & petronella $1'),
  ],
  [/^allen ortep shift .*\b(left|right) one place(?: .*)?$/, as('balance & petronella $1')],
  [/^balance (?:the )?ring,? left foot first,? and spin\/slide (left|right) one place(?: .*)?$/, as('balance & petronella $1')],
  [/^balance & petronella one place to the right in circle$/, as('balance & petronella')],
  [/^balance (?:the )?circle (?:&|and) (larks|robins) roll (?:away )?(\w+) (across|along)(?: (?:the )?set)?$/, as('balance the ring, $1 roll away $2 $3 set')],
  [/^balance (?:the )?circle,? (larks|robins) trade places(?: .*)?$/, as('balance the ring, $1 trade places')],

  // ---- Forward and back, walking forward ----
  [/^balance (?:the new wave |)forward (?:&|and) back(?:ward)?$/, as('balance')],
  [/^balance forward (?:&|and) back(?:ward)?;? step forward$/, as('balance wave of 4 and move straight ahead to new wave')],
  [/^(?:drop hands,? )?walk forward along the set$/, (_m, b) => [call('walk-forward', b, {})]],
  [/^pass through,(walk forward.*)$/, as('pass through, $1')],
  [/^walk forward,? turn right,? single file promenade along the set$/, (_m, b) => [call('slide', b, { direction: 'progression', facing: 'travel' })]],
  [/^lines of three forward (?:&|and) back across$/, as('lines of three forward & back')],
  [/^(?:new square,? )?into the middle (?:&|and) (?:back|mix)$|^into the middle again(?: .*)?$/, as('into the middle & back')],
  [/^(?:long lines )?forward (?:&|and) back,? (?:and )?(?:half-)?roll(?: away)?,? (?:larks shifting right|robins right to left)$/, as('long lines forward & back, larks roll away partners')],
  [/^long lines forward (?:&|and) back half-roll robins right to left$/, as('long lines forward & back, larks roll away partners')],
  [/^unwind to an outward facing circle(?:[ ,].*)?$/, (_m, b) => [call('turn-back', b, {})]],
  [
    // The roll on the way back is the next row's (or named here).
    /^long lines forward,? (?:and )?(?:on the way back|while backing up)(?:\.*|,? (?:larks|robins) roll (?:partners? away|in front of (?:larks|robins))\b.*)$/,
    (m, b) =>
      /roll/.test(m[0]) ? again('long lines forward & back, larks roll away partners', b) : again('long lines forward', b),
  ],
  [/^long lines forward "?and attack"? and back$/, as('long lines forward & back')],
  [/^long lines forward,? join both hands with .*$/, as('long lines forward')],
  [/^wheelbarrow in (?:&|and) out$/, as('into the middle & back')],

  // ---- Ovals and grand right and left ----
  [/^oval (left|right)$/, as('entire set oval $1')],
  [/^oval (left|right),? returning to original set$/, as('entire set oval $1')],
  [
    // "Oval right, end across from new neighbors": a place short of home.
    /^oval (left|right),? end across(?: from(?: new neighbors)?)?$/,
    (m, b) => [call('oval', b, { direction: m[1], places: Math.max(1, Math.round(b / 2) - 1) })],
  ],
  [
    // "Grand right & left six (N1R, N2L ...)": along the set, pulling by
    // whoever comes next, hands alternating.
    /^grand right (?:&|and) left (six|four|eight|\d)(?: n\d[rl](?:, n\d[rl])*)?$/,
    (m, b) => {
      const n = count(m[1]);
      return Array.from({ length: n }, (_v, i) =>
        call('pass-by', b / n, { who: 'facing', shoulder: i % 2 ? 'left' : 'right', hands: true }),
      );
    },
  ],
  [/^half grand right and left to home$/, as('grand right and left')],

  // ---- One couple travelling (duple minor) ----
  [/^(ones|twos) down the center (?:rights? (?:hand )?in rights?|right hand in right)$/, as('$1 down the center')],
  [
    // "Ones up the center and cast (off / one place / around same-role
    // neighbors / hand cast off with twos)": up the middle, then cast one place.
    /^(ones|twos) up the center(?: to original neighbors)?,? (?:and )?(?:hand )?cast(?: off| a place| one place| around same-role neighbors?)?(?:[ ,].*)?$/,
    both('$1 up the center', '$1 cast', (b) => b / 2),
  ],
  [/^(ones|twos) down the outsides? (?:past \w+(?: \w+)?(?: couples?)?|one place)$/, as('$1 down the outsides')],
  [/^(ones|twos) down the outsides cast to \w+' place$/, as('$1 cast')],
  [/^(ones|twos) up the outsides,? (?:and )?(?:go between the twos|into the center for a line facing down|end in long lines\b.*)$/, as('$1 up the outsides')],

  // ---- Whole sets: a couple sashays along the middle ----
  [
    /^((?:the )?(?:top|bottom|head|foot) couple|ones|twos|same two),? sashay (?:back )?(down|up)( to (?:the )?(?:end|bottom|top)(?: of (?:the )?set)?)?(?:,? -? ?(?:others|everyone else) move up)?$/,
    (m, b) => {
      const who = /same two/.test(m[1]) ? 'top' : /ones/.test(m[1]) ? '1s' : /twos/.test(m[1]) ? '2s' : /bottom|foot/.test(m[1]) ? 'bottom' : 'top';
      const leg = m[3] ? (m[2] === 'down' ? 'bottom' : 'top') : m[2];
      return [call('center-travel', b, { who, style: 'sashay', legs: [leg] })];
    },
  ],
  [/^top couple sashay to (?:the )?bottom of (?:the )?set(?:,? -? ?(?:others|everyone else) move up)?$/, as('top couple sashay down to the bottom, others move up')],
  [/^(ones|twos) balance towards and away from the top$/, as('$1 balance')],
  [
    // No couple named: every couple sashays along the set.
    /^sashay (down|up)(?: (and back))?$/,
    (m, b) => [call('sashay-along', b, { direction: m[2] ? 'down-and-back' : m[1] })],
  ],
  [
    // The others' arches are not drawn: the top couple goes to the bottom.
    /^(?:top couple face down,? others form arch(?:es)?\.? top couple promenade down|top couple dip and dive down)$/,
    as('top couple promenade to the bottom of the set, everyone else move up'),
  ],
  [
    /^two hand arch with partners? while top couple sashay under (?:all )?to (?:the )?bottom of (?:the )?set$/,
    as('top couple sashay down to the bottom, others move up'),
  ],
  [/^two-hand turn once$/, as('partners two-hand turn once')],

  // ---- Lines and walks ----
  [/^keep circling (\w+) (?:more )?places "?sunny side out"?(?: .*)?$/, as('clover left $1 places')],
  [/^bend the line$/, (_m, b) => [call('hall', b, { direction: 'up', end: 'ring', stay: true })]],
  [/^march (left|right) along (?:the )?set$/, (m, b) => [call('slide', b, { direction: m[1], facing: 'travel' })]],
  [/^walk to (?:the )?next neighbors?(?:,? 1s up,? 2s down)?$/, (_m, b) => [call('walk-forward', b, {})]],
  [/^dance (?:forward|fwd) to (?:a )?new (?:diamond|wave)$/, (_m, b) => [call('walk-forward', b, {})]],
  [/^all walk forward,? on (?:a )?(?:very )?slight (?:right|left) diagonal,? to meet(?: new neighbors?)?\)?$/, (_m, b) => [call('walk-forward', b, {})]],
  [
    // A couple going forward on a diagonal and straight back: a slice.
    /^(?:as a couple go forward|go forward as a couple) on the (left|right) diagonal and come back straight(?: .*)?$/,
    as('slice $1 and straight back'),
  ],
  [/^(circle (?:left|right) \w+ places?),? turn alone(?: .*)?$/, as('$1 and turn alone')],
  [
    /^partners promenade single file (?:ccw|counterclockwise) (?:1x|once),? (robins|larks) turn around$/,
    as('circle right 4 places single-file, $1 turn back to face partners'),
  ],
  [/^((?:next |new )?\w+ (?:do si do|see saw|gyre) once),? (?:and )?(?:form a ring|into a ring)(?: .*)?$/, as('$1')],
  [/^(partners swing),? form ring$/, as('$1')],
  [/^((?:ones|twos) (?:balance (?:&|and) )?swing),? end swing facing (down|up)(?: .*)?$/, as('$1, end facing $2')],
  [/^all into (?:the )?cent(?:er|re) and back(?: .*)?$/, as('into the middle & back')],
  [
    /^everyone take one step forward,? turn to face right,? and single-file one place (clockwise|counterclockwise)$/,
    (m, b) => [call('slide', b, { direction: m[1] === 'clockwise' ? 'left' : 'right', facing: 'travel' })],
  ],
  [
    // Who the dancers dance with next: the progression and the figures say it.
    /^(?:look away from partners? to form (?:a )?minor set with .*|dance begins in (?:a )?group of four with shadows)$/,
    nothing,
  ],

  // ---- Passing through and walking on single file ----
  [/^pass through across(?: the set)?,? (?:and )?turn right 90 degrees$/, as('pass through across the set')],
  [
    /^pass through across(?: the set)?[;,] turn right (?:&|and) .*single file promenade along (?:the )?set$/,
    (_m, b) => [
      ...again('pass through across the set', b / 2),
      call('slide', b / 2, { direction: 'left', facing: 'travel' }),
    ],
  ],
  [/^stand still let go hands and turn$/, as('turn alone')],

  // ---- Scatter mixers, drawn round one ring ----
  [
    // Scattering to a new partner: the larks move on to the next robin.
    /^(?:individual scatter promenade|single promenade to find (?:a )?new partner|promenade single,? find (?:a )?new partner)(?: -.*)?$/,
    as('move to your next partner'),
  ],
  [/^(?:find a new partner|join in rings of any number of couples)(?: -.*)?$/, nothing],
  [/^ring go forward(?: -.*)?$/, as('into the middle & back')],
  [/^balance ring$/, as('balance the ring')],
  [/^partners promenade scatter(?: -.*)?$/, as('partners promenade')],
  [/^partners promenade,? wheel around to go back the other way$/, as('partners promenade')],
  [/^partners promenade,? wheel around to face in to the center$/, as('partners promenade clockwise')],
  [/^promenade clockwise back to place with your new partner(?:,.*)?$/, as('partners promenade clockwise')],
  [/^partners allemande right twice to form a circle wave$/, as('partners allemande right twice')],

  // ---- Clapping in place ----
  [/^(?:hand )?clapping(?: with partners?)?:? .*$|^pointing at partners?:? .*$/, (_m, b) => (b > 0 ? [call('still', b, { action: 'clap' })] : [])],

  // ---- Notes that are no figure ----
  [/^(?:larks|robins) drop out(?: at home)?$/, nothing],
  [/^reach across and behind to form (?:a )?clover(?:leaf)?$/, nothing],
  [
    // Who dances together next, said at zero beats: the next figure forms it.
    /^(?:all form a ring of six|join hands in your ring of 8|top two couples form a ring of four|open up to face new neighbors,? hands four|end progressed,? facing a new threesome|look for your partner|staying with the person you just turned,?|form a ring with next neighbor and shadow|moon dance|sun dance)$/,
    nothing,
  ],
];

const NUMBERS: Readonly<Record<string, number>> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const count = (word: string) => NUMBERS[word] ?? Number(word);

/** A direction named for a single-file walk along the set, else the progression's. */
function way(named: string | undefined) {
  if (!named) return 'progression';
  return /^(?:cw|clockwise)$/.test(named) ? 'left' : 'right';
}

/**
 * The calls the travel table reads `text` as, or undefined. `raw` is the row
 * as written: a row that is only a comment in parentheses or brackets ("(it's
 * a slip jig)") or a label ending in a colon ("A1:", "Weave the line:") is
 * no figure.
 */
export function travelCalls(text: string, beats: number, raw?: string): FigureCall[] | undefined {
  const written = raw?.replace(/⁋/g, '').trim();
  if (written && (/^[([{].*[)\]}]$/.test(written) || /^[^:]{1,60}:\s*$/.test(written)))
    return nothing([] as unknown as RegExpMatchArray, beats);
  for (const [pattern, build] of PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;
    try {
      return build(m, beats);
    } catch {
      // A rewrite that does not read lets later patterns try.
    }
  }
  return undefined;
}

export { both, nothing, as, call };
