# Figure research catalogue

Research checkpoint: 2026-10-19 (local date). This is a first source-backed
semantic inventory, not a claim of complete choreography support or expert
certification. It maps every named `FigureKind` in `src/types.ts`, separates
composites from constituent actions, and records the questions a reusable
implementation must answer.

## What was actually researched

This pass read web text from caller teaching material, author dance notes,
conference syllabi, and database definitions. The reference register below
identifies the evidence used. CDSS Dart's appendix was available in indexed
excerpts; direct retrieval returned 403. No videos were watched, no bodies were
motion-captured, no caller was consulted, and no physical experiment was
performed. Video links are therefore future evidence, not completed validation.

Source descriptions are paraphrased briefly. Historical gendered role terms
identify the source's convention; our proposed contracts use explicit actor
selection and spatial roles. A source's “women” cannot silently become “whoever
currently stands on the right.” Cosmetic presentation must not choose actors.

The table is intentionally not a universal coordinate recipe. Its **evidence**
column describes the bounded source statement. Its **contract questions**
column is our engineering analysis: information that a source instruction,
carried state, or explicit interpretation must supply before motion is compiled.
An unanswered question is not permission to guess.

## Inventory and proposed semantic boundaries

“Source timing” means the duration in the particular dance remains authoritative.
The timing notes below identify conventions or examples, not replacement counts.
Every row also requires persistent actor IDs, actual incoming roots/facing,
musical start/end, and explicitly retained/released contacts.

| Code kinds | Source-backed meaning / entry and exit evidence | Contract questions and restrictions |
|---|---|---|
| `allemande` | Two dancers turn using the specified same hand; full turns return positions, fractional turns change them. [D] | Which actors, hand, winding, and approach? Which next-facing requirement? Do not equate angular travel from distant roots with the source's turn fraction; see fraction caveat below. |
| `swing` | Two dancers rotate clockwise, commonly in ballroom hold; source describes alternative holds and walking/buzz steps. Conventional role ordering governs opening out. [D] | Which pair and destination? How does approach merge into rotation? What hold is chosen? Release facing is dance-specific. No universal number of revolutions follows from “swing.” Buzzstep remains deferred. |
| `gyre` | Shoulder round: face the other dancer and move around them without hands; Lapiroff teaches the right version from right-allemande motion, with optional eye contact. [Y] Source example [K] connects one pair orbit into another, then a down-facing line. | Require actors, shoulder, amount, and final facing. Facing the person differs from mandatory eye contact. No fixed return-to-place or swing exit; see entry/exit examples below. |
| `do-si-do`, `couples-do-si-do` | Facing dancers pass right, move back-to-back, and retreat past left to place; couples can act as units. [L] | Mirror/left variants, fractional amount, individual versus coupled unit, and transition facing must be explicit. Optional personal spins cannot redefine the track. |
| `circle` | Joined dancers travel around a ring; fractional amounts change places. Facing can prepare the next call. [L] | Ring membership/order, direction, amount, arrival positions, and retained hands. Do not require everyone to face the center continuously. |
| `star` | Four dancers use the specified hands in the center; hands-across and wrist holds are documented alternatives. [D] | Membership/order, direction/amount, grip topology, and release partner. A shared center is not evidence of a particular handhold. |
| `balance`, `ring-balance` | Balances occur in pairs, rings, and waves, with multiple stepping styles. [D] | Pair/ring topology, direction, duration, retained connection, and next action. Keep balance as an action separate from the following turn or swing. |
| `wave-balance` | Alternating facing and joined hands form a wave; balance direction may need explicit instruction. [H] | Full hand/actor order and facing parity; short/long wave; right-left versus forward-back. Never infer direction solely from the word “balance.” |
| `form-short-wave`, `pass-to-wave`, `pass-to-wave-balance` | Formation and traversal are distinct semantic operations; wave evidence is in [H], pass notation in [B]. | These are compiler composites, not three unrelated primitive figures. Specify exact final hand graph/facing; pass shoulder and amount; add balance only when authored. Passage to a wave must not teleport dancers into slots. |
| `balance-rory-slide` | From a wave, balance then slide face-to-face to exchange adjacent places; a travelling spin is optional, preserving final facing. [H] | Direction, person passed, hand release/reacquisition, endpoint wave, and separate balance/travel durations. Spin styling must not change the permutation. |
| `petronella` | In the common ring-of-four form, balance then move one place right while turning clockwise. [H] | Is balance separately authored? Ring/diamond/two-person variant, reverse direction, amount, exit facing. The two-person example [P] proves the four-person form is not universal. |
| `box-the-gnat` | Facing dancers use right hands overhead, exchange positions, and finish facing one another. [H] | Under-arch actor, hand continuity, mirrored variant, exact post-turn facing. Do not treat it as an ordinary half allemande. |
| `california-twirl` | Side-by-side dancers use joined inside hands to swap places and reverse facing. [H] | Which joined hands and under-arch actor? Preserve side ordering relative to the new facing. Alternative role arrangements require explicit support. |
| `rollaway`, `long-lines-rollaway` | A rollaway includes one dancer turning in front while the other half-sashays; role/direction variants exist. [R] | Distinguish roller from initiating caller subject, translation from turn, and timing within the lines. Long-lines version is composition, not a new pair primitive. |
| `ladies-chain`, `robins-chain` | Two crossing dancers pull by right and courtesy-turn with receivers. [L] | Treat naming as an alias only after role mapping. Preserve actual crossing actors, receiver IDs, diagonal/across direction, half/full amount, and exit facing. Courtesy turn needs its own reusable contract. |
| `right-left-through` | Dart describes crossing plus courtesy turns, including over-and-back and half variants. [D] | Parse modern source amount rather than importing a historical default. Specify pass/pull-by convention, travelling companion, receiver, and final facing. |
| `promenade` | A half promenade crosses as couples and wheels to face back across. [L] | Across versus along, holding convention, passing side, amount, final wheel, and any following progression slide must be independent parameters. |
| `hall-travel` | Four-in-line travel permits different turnaround instructions. [L] | Explicit line order, direction, travel/turn/return subdivisions, turn-alone versus couple turn, and bend/cast exit. “Down and back” is not enough for a complete path. |
| `long-lines` | Facing lines advance and retreat; the cited conventional example uses four counts each way. [L] | Actual line membership/contact continuity, source duration, and inserted rollaway or shift. Do not silently reset lateral placement on retreat. |
| `hey` | Alternating shoulder passes and end loops form a weave; exit may omit a final adjustment for the following call. [L] | Ordered encounters, initiators, shoulders, fraction/pass count, end-loop rules, and unfinished last pass. Avoid one fixed sinusoid for all entrances. |
| `ricochet-hey` | Selected center passes become two-hand rebounds; participants return to their side, initially moving backward. [G] | Mark exactly which encounter rebounds and which still crosses. Contact, facing, and actor permutation differ from an ordinary hey. |
| `mad-robin` | Mohr's example follows a neighbor do-si-do track while facing partner, then turns to a new-neighbor swing. [M] | Orbit partner differs from visual-facing partner. Specify front-going actor, direction, amount, and release target. Do not hard-code “returns to original neighbor.” |
| `pull-by`, `square-through` | Pull-bys carry named actors/hands. Square-through notation counts pull-bys; balances are separate. [B] | Ordered actor encounters and intermediate direction changes, final facing, group extent, and duration per segment. Balanced square-through is a composite; [Q] provides a documented example. |
| `pass-through` | Database notation distinguishes passing an approaching person from crossing without an oncoming counterpart; it records actor and shoulder. [B] | Which lane, actor, shoulder and destination? Across versus along, single versus couple movement, retained companion contact, and subsequent facing must be explicit. |
| `cross-trails` | Typical contra usage passes right across then left along; wording can include both passes or only the latter. [G] | Preserve source wording and expand explicitly. Do not import the differently defined modern square-dance call by name alone. |
| `box-circulate`, `balance-box-circulate` | In the common long-wave form, inward-facing dancers cross and outward-facing dancers loop into another place. [G] | Explicit permutation, loop direction, group boundaries, final facing and wave contacts. Preceding balance is optional composition. Other formations need their own evidence. |
| `becket-slice` | Mohr's left slice advances diagonally to the next couple, then retreats straight. [F] | Direction, target couple, amount, endpoint relationship and end handling. Do not confuse it with a purely sideways slide. |
| `becket-shift` | A slide may move couples along their side to new people. [D] | This code name is an implementation label. Specify actual displacement/direction and reached neighbor change; no hidden movement during rebinding. |
| `give-and-take` | Syllabus describes approaching across, taking free hands, then one actor drawing the other to the designated side for a swing. [T] | Who takes whom, destination side, available hands from previous swing, and timing. Four-count intention versus eight-count practice is explicitly documented; preserve the actual dance instruction. |
| `star-promenade`, `butterfly-whirl` | Star-promenade notation identifies central dancers and hands. [B] Butterfly whirl turns a coupled pair, typically after star promenade. [L] | Separate central group rotation from individual couple rotation. Require pickup/dropoff actors, waist/hand contacts, amount, pair pivot and final facing. Dedicated alternative-entry evidence remains needed. |
| `revolving-door` | Mohr describes a reversed-side promenade entry, central right-hand turn, outside dancers dropping off, then partner swings. [F] | Composite of coupled travel, dropoff and continued hand turn. Count origin matters: database example [V] decomposes it into half star-promenade plus half allemande. |
| `half-poussette` | Two facing pairs take both hands and travel around each other without changing room-facing; halfway exchanges pair stations. The Joyride record specifies clockwise travel and a release that opens space for a hey. [J], [W] | Require held pair IDs, initial retreating actors, direction, actual destination and release. [O] shows parameter diversity. Do not substitute a rotating pair frame; other entries and exits remain unvalidated. |

`unknown` is a parse/research hold, not a motion family. All 41 named code kinds
are mapped above; this does not imply 41 distinct fundamental figures.

### Two entry/action/exit examples with direct teaching evidence

**Shoulder round / gyre.** Lapiroff's workshop distinguishes facing the other
dancer during the no-hand orbit from maintaining room-facing in a do-si-do;
eye contact is explicitly optional. [Y] That establishes the basic action,
not a single entry formation or angular extent. Sweeney's *The Honking Swan
King* starts with the two men orbiting until they can meet their neighbors,
continues through neighbor three-quarter rounds, and ends four abreast facing
down with men in the center. His teaching note calls for an additional
rightward orientation adjustment by man one. [K]

Engineering consequence: acquire the named encounter from the carried state,
perform the requested shoulder-directed orbit, and realize the specified
destination/facing. A figure need not begin from a motionless facing pair or
finish at its entry positions. These examples do not quantify acceptable
spacing, gaze angles, approach duration, or release acceleration.

**Half poussette.** Smukler's 2007 *Joyride* account describes two hands with
partner, unchanged individual orientation while the pairs orbit, and a
half-circuit exchanging the couples' stations. [J] Weberg's own instructions
specify clockwise, men initially backing. After release, women continue
backward and left to clear the men for the following left-shoulder hey. [W]
The exit therefore includes purposeful preparation, not an arbitrary snap to
four corners. The author's timing commentary concerns this dance; its
flexibility must not be applied to unrelated sources.

Engineering consequence: represent translation of a facing pair separately
from rotation of that pair's frame. This evidence closes the missing basic
movement description, but does not validate every reverse, neighbor-held,
twirl-entry, or swing-exit variant. Preserve those as explicit research scopes.

## Consequences for a general engine

These are design deductions from the inventory, not assertions that the current
engine already provides them:

1. **Actor selection and movement are different layers.** “Partner,” “next
   neighbor,” “ones,” and “right-hand person” must resolve to IDs before
   movement. Reaching new neighbors is an observable physical event.
2. **A figure needs a symbolic action and an exit obligation.** Store hands,
   pass order, turn amount, destination relationship, and facing constraints.
   Coordinates are a realization of those requirements, not their definition.
3. **Composition needs named constituent operations.** Courtesy turn,
   half-sashay, form-wave, release, couple wheel, and turn-alone should not be
   hidden differently in every adapter.
4. **Motion timing and source timing are different.** Preserve authored count
   boundaries. If a source permits elastic division inside a phrase, represent
   that permission explicitly rather than applying it globally.
5. **Contacts have topology as well as geometry.** Correct hand identities and
   release/acquisition order matter even when rendered wrists coincide.
6. **End behavior belongs to the whole dance.** A valid local four-person
   permutation does not prove correct odd/even progression, waiting or reentry.

### Three contradictions a universal template must not erase

- **Turn fractions:** the glossary explains that allemande measurement can
  depend on where entry and exit are counted. [G] Engineering implication:
  validate the named encounters and actual endpoints, not just accumulated yaw.
- **Phrase timing:** Ravitz explicitly allows counts to trade within a phrase.
  [R] This is evidence for that author's notation convention, not authority to
  change another author's fixed six-count figure into eight.
- **Same name, different decomposition:** revolving-door sources [F], [V] count
  the central motion differently. Preserve source and interpretation together;
  normalize the physical action only after verifying equivalent endpoints.

## Missing taxonomy, and what remains unverified

The live ContraDB figure index contains named categories absent from our
`FigureKind` union: contra corners, arch-and-dive, dolphin hey, figure eight,
gate, facing star, swat-the-flea, zigzag, turn-alone, and stand-still, among
others. [I] This is a **taxonomy gap**, not proof that every corresponding
movement is completely absent from the implementation.

Research priorities beyond the union:

| Family | Required evidence before generalized admission |
|---|---|
| Courtesy turn / wheel / gate / half-sashay | Distinguish pivot actor, forward/backward travel, facing, hand choice, and assisted versus unassisted variants. Resolve chain and promenade exits first. |
| Cast / half and full figure eight / contra corners | Active and supporting actors, crossing priority, displacement of others, corner identity across minor-set boundaries, finite-end behavior. |
| Arch-and-dive / dip-and-dive | Archers, divers, direction, who travels, cast/home variants, progression versus nonprogression, end turnaround. |
| Orbit / allemande-orbit / dolphin hey | Simultaneous groups and leader exchange; do not flatten concurrency into a single pair operation. |
| Zigzag / weave / diagonal progression | Destination identity, passing lane, number of couples passed, and wait/reentry rules. |
| Reverse and mirror families | Hand/shoulder reflection is not automatically a valid source interpretation. Keep mirrored motion and role selection independent. |

The catalogue still lacks a systematic visual study of entry and release
timing, experienced-caller review, and demonstrated equivalence between these
semantic contracts and existing motion adapters. Body speed thresholds, arm
reach limits, easing functions, and contact ramp times are engineering
conventions unless separately justified; none is established by these sources.

To promote a family from “described” to “semantically validated,” retain at
least a teaching definition, a source example for each materially different
entry/exit, an explicit ambiguity record, and a readable actor/hand/endpoint
trace. Visual review should record video URL and time range actually inspected,
not merely that a video link exists. Coverage reports must distinguish
definition research, parsing, executable composition, and verified whole dance.

## Evidence register

Accessed 2026-10-19. Sources retain their original rights; this file contains
short paraphrases and our own analysis, not copied teaching manuals or
implementation code. No source software was reused.

- **[D] Mary McNab Dart, Appendix B, Contra Dance Figures**, CDSS:
  https://www.cdss.org/elibrary/dart/appendix_b.htm .
  Indexed text inspected; direct fetch blocked. Historical terminology and
  conventions need context, especially right-and-left-through amount.
- **[L] CONTRALAB, Contra Dancing Definitions**:
  https://www.contralab.org/Definitions.html .
  Teaching definitions inspected. Its conventions are not universal timing law.
- **[H] Colin Hume, Caller Training Session 7**:
  https://colinhume.com/session7.htm .
  Teaching prose for wave balances, Rory O'More, petronella, and arch turns.
- **[G] Chris Page / The Caller's Box, Glossary**:
  https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm .
  Sections inspected: allemande notation, circulate, cross trail through,
  ricochet hey. Database normalization is distinguished from universal usage.
- **[B] The Caller's Box, Brief Glossary**:
  https://www.ibiblio.org/contradance/thecallersbox/Brief-glossary.htm .
  Explicit notation for participants, shoulders, partial passes and hands.
- **[R] Cary Ravitz, Contra Dances, Notation section**:
  https://www.dance.ravitz.us/ .
  Author's timing and rollaway/half-sashay terminology.
- **[M] Rick Mohr, Rad Robin**:
  https://rickmohr.net/Contra/Dances/RadRobin .
  Author's description of a chain-to-mad-robin-to-new-neighbor-swing transition.
- **[F] Rick Mohr, Favorite Dances**:
  https://rickmohr.net/Contra/Dances/Favorites .
  Author teaching notes on revolving door and left slice.
- **[T] Ralph Page Dance Legacy Weekend, 1999 syllabus, Give and Take I**:
  https://library.unh.edu/special/forms/rpdlw/syllabus1999.pdf .
  Documented teaching and contrast between Jennings's intent and floor timing.
- **[Q] Ralph Page Dance Legacy Weekend, 2006 syllabus, Square Affair**:
  https://library.unh.edu/special/forms/rpdlw/syllabus2006.pdf .
  Named balance/pull-by sequence; an example, not a universal square-through.
- **[V] The Caller's Box, The Missing Piece, revolving-door variant**:
  https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=12765 .
  Specific six-count decomposition; not independent verification of every variant.
- **[O] ContraDB, Poussette usage**:
  https://contradb.com/figures/poussette .
  Recorded parameter diversity; not a sufficient teaching definition.
- **[P] John Sweeney, Life is But A Melancholy Flower**:
  https://www.contrafusion.co.uk/Dances/LifeisButAMelancholyFlower.html .
  Author's explicit two-person petronella example.
- **[I] ContraDB, Figure index**:
  https://contradb.com/figures .
  Taxonomy comparison only; existence of a name is not an executable specification.
- **[S] John Sweeney, Swing Workshop**:
  https://contrafusion.co.uk/SwingWorkshop.html .
  Text and list of demonstrations inspected; videos **not watched**. Candidate
  evidence for a later visual study, not a validation result.
- **[Y] Harris Lapiroff, My Introductory Contra Dance Workshop**:
  https://chromamine.com/2024/04/my-contra-dance-workshop/ .
  Caller-authored 2024 teaching script; shoulder-round action and optional gaze.
  Brief factual paraphrase only; no script or demonstration copied.
- **[K] John Sweeney, The Honking Swan King**:
  https://contrafusion.co.uk/Dances/TheHonkingSwanKing.html .
  Author's shoulder-round sequence with explicit line-of-four exit and facing
  adjustment. Text inspected; embedded video not watched.
- **[J] David Smukler, Ralph Page Dance Legacy Weekend 2007 syllabus, p. 39**:
  https://library.unh.edu/special/forms/rpdlw/syllabus2007.pdf .
  Recorded Joyride teaching description specifies poussette handhold, room-facing,
  travel, progression and hey preparation.
- **[W] Erik Weberg, Joyride**:
  https://www.erikweberg.com/joyride/ .
  Author's directions and August 2011 teaching update. Supports this particular
  poussette entry/exit; not a definition of all variants.

[D]: https://www.cdss.org/elibrary/dart/appendix_b.htm
[L]: https://www.contralab.org/Definitions.html
[H]: https://colinhume.com/session7.htm
[G]: https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm
[B]: https://www.ibiblio.org/contradance/thecallersbox/Brief-glossary.htm
[R]: https://www.dance.ravitz.us/
[M]: https://rickmohr.net/Contra/Dances/RadRobin
[F]: https://rickmohr.net/Contra/Dances/Favorites
[T]: https://library.unh.edu/special/forms/rpdlw/syllabus1999.pdf
[Q]: https://library.unh.edu/special/forms/rpdlw/syllabus2006.pdf
[V]: https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=12765
[O]: https://contradb.com/figures/poussette
[P]: https://www.contrafusion.co.uk/Dances/LifeisButAMelancholyFlower.html
[I]: https://contradb.com/figures
[S]: https://contrafusion.co.uk/SwingWorkshop.html
[Y]: https://chromamine.com/2024/04/my-contra-dance-workshop/
[K]: https://contrafusion.co.uk/Dances/TheHonkingSwanKing.html
[J]: https://library.unh.edu/special/forms/rpdlw/syllabus2007.pdf
[W]: https://www.erikweberg.com/joyride/
