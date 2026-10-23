# Figure implementation inventory

Audit date: 20 October 2026. This is an audit of code contracts, **not an
authoritative glossary or a claim that all variants work**. No motion tests were
run for this documentation audit. Code locations are linked below; the separate
research catalogue must establish which actions are traditional, source-specific,
optional styling, or unresolved.

22 October update: the Rory, circulation, give-and-take, hall, long-lines and across-passage rows now include the shared contracts added since the original audit. Their focused and release evidence is tracked in the [development checkpoint](development-map.md); public admission remains a separate gate.

## What the 41 names mean

[`FigureKind`](../src/types.ts) has 42 values: 41 named categories and `unknown`.
Those 41 are not 41 independent elementary figures. They include one clear
terminology alias pair (`ladies-chain` / `robins-chain`), combined calls, formation
operations, and unusually narrow implemented variants.

The table covers every named value exactly once. “Scope” describes inspected
implementation restrictions, not the complete legal domain of the traditional
figure. A code path existing does not mean an arbitrary source dance using that
name is admitted. Counts below are musical counts, called `beats` in code.

Evidence labels:

- **I**: an implementation assertion or path was inspected. This proves what the
  code requests or does, not historical/dance correctness.
- **P**: the named contract explicitly retains provenance or reviewed choices.
  It does not turn geometric constants or timing subdivisions into authored facts.
- Every row is **I**. Only rows explicitly marked **P** below make the additional
  limited provenance claim; omission does not mean no source fixtures exist.

| FigureKind | Normalized family / category | Inspected entry → action → exit and contacts | Scope and code evidence |
| --- | --- | --- | --- |
| `rollaway` | Rollaway with half sashay | Released named partner/neighbor pairs; explicit rolling and sashaying roles exchange places, with rolling direction declared; temporary hand contacts. | Four counts, two opposite-role pairs and bounded measured pair centers. [Standalone step](../src/standalone-rollaway-step.ts). |
| `couples-do-si-do` | Do-si-do variant: couple units | Persistent partners act as released units around the other unit; fixed room facing; return without relationship change. | Eight counts, one right-shoulder circuit, explicit neighbor/unit distinction. [Coupled step](../src/coupled-dosido-step.ts). |
| `becket-slice` | Formation/progression operation | Side couples advance diagonally left and return straight back; released hands; rebind only at reached progressed endpoint. | Eight counts, explicit 4+4, clockwise lark-left Becket, finite slots and waiting policy. **P**: source, timing and end-policy provenance required. [Slice](../src/becket-slice-step.ts). |
| `star-promenade` | Star with carried partners | Radial partner pairs, larks joined left centrally with partners held on right; left half-turn retains radial pairs. | Four counts, explicit half-shoulder/waist hold; not all roles/hands/amounts. [Carried star/whirl](../src/star-promenade-whirl.ts). |
| `butterfly-whirl` | Carried pair turn | Actual diagonal radial exit of star; partners whirl with lark backing and retained carriage; finish paired sidelines facing inward. | Four counts, left 1⅜ turns in this particular entry geometry. That amount is not a universal definition. [Carried star/whirl](../src/star-promenade-whirl.ts). |
| `mad-robin` | Facing-person orbit | Explicit orbit relation distinct from facing relation; selected front role and orbit direction; full return retains roots, relationships and released boundary. | Eight-count full-return step validates measured paired-side geometry. [Step](../src/mad-robin-step.ts), [primitive](../src/mad-robin.ts). |
| `square-through` | Composite: balance and named pull-bys | Partners across, current neighbors along sidelines; partner-right then neighbor-left passages; released/handed entry constraints; onward or partner-facing exit. | Implemented balanced square-through **two**, eight counts 4+2+2, standard or compact corners; terminal progression needs finite boundary. [Primitive](../src/square-through.ts), [step](../src/square-through-step.ts). |
| `pull-by` | Named handed passage | Explicit partner/neighbor/same-role actors and left/right hand; exchange along named passage. | Two/four counts; conventional adapter requires exact corner slots; carried role-to-swing and terminal-progression routes are separate. [Adapter](../src/named-pull-by-adapter.ts), [carried step](../src/role-pull-by-swing-step.ts), [terminal](../src/terminal-named-pull-by.ts). |
| `revolving-door` | Composite: carried turn and drop-off | Side couples; robin right-hand full turn carrying incoming relation, drop lark at half-turn; finish in opposite-relation swing frame. | Eight counts and immediate opposite-relation eight-count swing; phases 1.25+4.5+1.25+1 are prescribed. [Adapter](../src/revolving-door-adapter.ts). |
| `cross-trails` | Composite: ordered crossings | Partners facing across; partner/right-shoulder/across followed by neighbor/left-shoulder/along; finish facing onward; no handhold implied by passages. | Eight counts 4+4, rectangular bounded entry; not arbitrary shoulder/order variants. [Primitive](../src/cross-trails.ts). |
| `form-short-wave` | Formation acquisition | Exact facing-neighbor corners advance into robin-center wave: center left hands, neighbor right hands; facing retained. | Two counts; hand acquisition near end is a model schedule. [Rory adapter](../src/rory-wave-adapter.ts). |
| `balance-rory-slide` | Composite: wave balance and slide/spin | Actual ordered wave hand graph determines receiving station; balance then shift one station and rebuild wave; spin explicit. | Eight counts 4+4. Short-wave and explicitly parameterized full long-wave graphs have separate carried contracts; station spacing and passing bow remain reviewed geometry. [Rory adapter](../src/rory-wave-adapter.ts), [full-wave adapter](../src/carried-long-wave-rory.ts), [slide](../src/rory-slide.ts). |
| `half-poussette` | Partner poussette variant | Partners face across with two-hand hold and fixed room facing; half circuit delivers current neighbors to swing. | Eight counts; explicit pull role/direction and immediate neighbor swing. Separate twirl-related path also exists. [Adapter](../src/partner-half-poussette-adapter.ts), [twirl adapter](../src/poussette-twirl-adapter.ts). |
| `give-and-take` | Composite: approach, take, retreat | Side couples approach with joined inside hands; declared role takes named received person; finish same-person prepared swing. | Eight-count and separate four-count contracts, with explicit phase allocation, both hands and immediate same-person swing. Compact four-count version preserves its following twelve-count swing; it does not retime the eight-count adapter. [Eight counts](../src/give-and-take-adapter.ts), [four counts](../src/compact-give-take-step.ts). |
| `ricochet-hey` | Hey variant with push-back events | Explicit incoming side pairs, first role, alternating shoulders and ricochet occurrences; two-hand ricochet actions; exit named paired balance. | Half/eight or full/sixteen counts, exact side geometry, immediate four-count matching balance. [Adapter](../src/ricochet-hey-adapter.ts). |
| `gyre` | No-hand pair orbit | Explicit relation, shoulder and amount; no physical contacts in base plan; matching next swing can add presentation preparation. | Partner, neighbor or same-role pairs; swing continuation requires opposite-role pair. [Adapter](../src/gyre-adapter.ts). |
| `long-lines-rollaway` | Composite: lines forward/back with rollaway | Named rolling/sashaying roles and relation; rollaway during return; exchanges side positions. | Eight counts, opposite roles; not interchangeable with standalone four-count rollaway. [Adapter](../src/long-lines-rollaway-adapter.ts). |
| `pass-to-wave` | Composite: pass and acquire wave | Facing couples cross right shoulders; named center role takes left hand and side relation right; exits explicit wave graph. | Four counts; exact facing-across corner geometry, arky/different waves not inferred. [Wave adapter](../src/wave-figure-adapter.ts). |
| `pass-to-wave-balance` | Composite: previous operation + balance | Same crossing/wave acquisition, then explicit balance style in resulting graph. | Eight counts with explicit 4+4. **P**: optional retained row contract checks row identity/text/counts. [Wave adapter](../src/wave-figure-adapter.ts). |
| `wave-balance` | Balance variant | Actual ordered hand graph and declared hand relationships; balance within wave. | Four counts; style right-left or forward-back explicit; not a Rory alias. [Wave adapter](../src/wave-figure-adapter.ts). |
| `box-circulate` | Wave station circulation | Explicit crossing and looping roles, actor-to-destination mapping and exit hand graph; right loop changes facing by half-turn. | Four counts. The original wave adapter has right loops; the carried graph contract explicitly supports right or left loops with named crossing/looping roles and checked destinations. This is not an arbitrary circulation permutation. [Wave adapter](../src/wave-figure-adapter.ts), [carried circulation](../src/carried-wave-circulate.ts). |
| `balance-box-circulate` | Composite: wave balance + circulate | Balance actual incoming wave, then mapped crossings/loops and reformed hands. | Eight counts 4+4; explicit actual entry/exit graph, named crossing/looping roles and loop direction. [Wave adapter](../src/wave-figure-adapter.ts), [carried circulation](../src/carried-wave-circulate.ts). |
| `ring-balance` | Balance variant | Four-person both-hand ring; balance and retain ring or prepare declared partner twirl/swing route. | Four counts; compact held reach constrained; pair handoffs separately implemented. [Ring adapter](../src/ring-california-adapter.ts), [pair handoff](../src/ring-pair-handoff.ts). |
| `california-twirl` | Joined-inside-hand pair turn | Side-by-side same-facing partners, lark right/robin left, robin under; half-turn exchanges places and reverses facing. | Conventional route four counts, explicit right half-turn; other ring/poussette timings have dedicated policies. [Adapter](../src/ring-california-adapter.ts), [ring policy](../src/ring-twirl-policy.ts). |
| `promenade` | Couple travel variant | Side couples in skaters hold cross set passing left shoulders and turn left; named partner/neighbor receiver and lark courtesy leader. | Conventional half-promenade eight counts; whole-set oval is a separate route/policy, not same local primitive. [Adapter](../src/promenade-adapter.ts), [oval](../src/global-promenade.ts). |
| `hall-travel` | Composite: down, turn, return, bend | Four-person down-facing line from named side pairs; turn alone or as couples, return and bend. Contacts follow line/pair mode. | Sixteen counts, conventional 4+4+4+4, exact entry slots/facings. Actual initial partner-line and carried hall wrappers preserve reached roots and finite ends; not arbitrary hall travel. [Adapter](../src/travel-figure-adapter.ts), [actual line](../src/hall-line-step.ts), [carried hall](../src/carried-hall-step.ts). |
| `box-the-gnat` | Right-hand arch exchange | Named facing pairs, robin under right-hand arch, exchange places; following relation may require explicit width/facing preparation. | Conventional four-count route requires 1.10-unit prior stance; released-corner carried route separate. [Arch adapter](../src/extended-figures.ts), [bare arch](../src/bare-arch-step.ts). |
| `becket-shift` | Formation/progression operation | Whole-set lateral shift creates new bound minor sets; waiting actors handled by topology. | Legacy section requires opening left shift, conventional spacing and no additional mid-section shifts. Not a synonym for diagonal slice. [Section](../src/becket-compiler.ts), [topology](../src/becket.ts). |
| `balance` | Paired balance | Named pair moves in/out; ordinary two-hand or explicit right-hand arch preparation; successor can prepare same-person swing. | Primitive four counts; hand/exit conventions depend on successor. [Primitive and continuity](../src/engine.ts). |
| `swing` | Paired turn | Bound pair approaches/rotates in modeled frame, acquires contacts and exits to required formation. | Several entry adapters: prepared, released, radial and active-ones. Counts and allowable entry geometry differ; buzzstep unimplemented. [Registry](../src/sequence-registry.ts), [16-count released](../src/released-pair-swing-step.ts), [short released](../src/short-released-pair-swing-step.ts). |
| `circle` | Joined ring rotation | Actual four-person roots rotate around group center; direction/amount explicit; hands form ring. Successor may alter release/facing/width. | Ordinary primitive plus ordered exits, six-count/two-count pass and mirrored variants; no arbitrary entry guarantee. [Primitive](../src/engine.ts), [ordered step](../src/ordered-circle-step.ts), [six/two](../src/measured-six-two-step.ts). |
| `allemande` | Same-hand pair rotation | Named partner/neighbor/same-role pair rotates with declared hand and amount; held-wave and following swing/promenade preparations vary. | Primitive explicit positive amount ≤4; dedicated wave routes consume entry/exit/subdivision fields. Isolated rollaway prototypes are not general admission. [Primitive](../src/engine.ts), [wave adapter](../src/rory-wave-adapter.ts), [promenade handoff](../src/allemande-promenade-handoff.ts). |
| `do-si-do` | Facing-preserving no-hand orbit | Pair passes right shoulder and returns, preserving room facing; selected 1½ variants exchange stations. | Base primitive full right-shoulder only; role 1½ and progressing neighbor 1½ separate carried steps. [Primitive](../src/engine.ts), [role step](../src/role-dosido-step.ts), [neighbor step](../src/neighbor-dosido-step.ts). |
| `ladies-chain` | Terminology alias: robins' chain | Same implementation as next row; terminology retained at import boundary. | Do not count as separate movement capability. [Chain](../src/chain.ts). |
| `robins-chain` | Crossing + courtesy-turn composite | Robins cross right hands; explicitly bound receiving partner/neighbor lark performs left-front/right-waist courtesy turn. | Conventional lark-left role order only; receiver must already occupy valid arrival position; arky/reflected chains rejected. [Chain](../src/chain.ts), [square handoff](../src/chain-square-handoff.ts). |
| `right-left-through` | Crossing + courtesy-turn composite | Facing-across pairs cross to explicit recipients, courtesy turn, finish back facing across. | Eight counts 4+4, stationary endpoint derivatives in kernel; measured carried entry adapter separate. [Kernel](../src/right-left-through.ts), [carried adapter](../src/carried-right-left-through-adapter.ts). |
| `long-lines` | Formation travel | Whole group advances toward center then returns to original root slots, facing across. | Primitive uses fixed .52-unit advance. The carried compact contract uses a reviewed .24 m advance, actual sideline hands, finite-end travel and reached-endpoint rebinding only when source-marked. The released compact prefix also supports a reviewed .34-unit advance with actual sideline hands and unchanged return slots. These are geometry conventions, not a definition of long lines. [Compact prefix](../src/compact-released-step.ts), [Primitive](../src/engine.ts), [carried event](../src/becket-long-lines-step.ts). |
| `hey` | Ordered shoulder-pass weave | Explicit pass events or role/shoulder specification; no hand contacts; starts/ends according to selected paired or neutral geometry. | Half/full/partial/diagonal adapters and exits differ. One legacy half route requires literal ML;PR;WL;NR; exact notation and role declarations cannot mix. [Extended adapter](../src/extended-figures.ts), [event compiler](../src/hey.ts), [neutral full step](../src/neutral-full-hey-step.ts), [diagonal](../src/diagonal-hey-chain.ts). |
| `star` | Same-hand group rotation | Four roots rotate around center with declared hand/direction/amount; hands-across or wrist grip explicit; facing tangent. | Primitive and ring-entry variants; narrow right ¾ star→partner gyre has separate preparation. A carried full left wrist star returns all active roots to their incoming stations while exterior right hands reach next neighbors; its finite-end return and endpoint rebinding are explicit. [Star to wave](../src/becket-star-wave-step.ts), [Primitive](../src/engine.ts), [star/gyre step](../src/star-gyre-step.ts). |
| `pass-through` | Released passage/progression | Named actors pass specified shoulder to actual destinations; relationship change at endpoint. | Terminal four-count ring passage, two-count post-circle progression, four-count across-ring passage into partner gyre, and two-count across-sideline passage into the same partner swing are distinct contracts. Across passages do not rebind epochs. [Across ring](../src/across-ring-pass-step.ts), [across sidelines](../src/across-sideline-pass-step.ts). [Ring adapter](../src/ring-pass-adapter.ts), [six/two step](../src/measured-six-two-step.ts), [mirror](../src/mirrored-six-two-step.ts). |
| `petronella` | Ring station shift with individual turn | Release ring, move one station right while spinning, reform ring; terminal/pair exit separately prepared. | Standard adapter four counts, right ¼ station orbit and right ¾ body spin, no clap; not every styling or exit. [Adapter](../src/petronella-adapter.ts), [terminal](../src/terminal-petronella.ts). |

## What is shared, and what is not yet general

[`SequenceBoundary`](../src/sequence-boundary.ts) carries actual positions and
facings, stable actor/role/couple identities, reciprocal partner/neighbor maps,
source count, relationship epoch and held contacts. Handoff assertions protect
these quantities. This is a useful common seam.

It is still a **four-person, two-role, opposite-role partner/neighbor boundary**.
It does not itself represent arbitrary set size, trios, multiple neighbors,
same-role partnership, velocities, acceleration or an ordered wave graph.
Whole-set topology and some wave structures live elsewhere. Those limitations
must be explicit before promising a comprehensive contra model.

[`MotionPlan`](../src/extended-figures.ts) describes sampled root position,
facing and contacts. The common boundary does not carry endpoint derivatives;
some specialized kernels require stationary endpoints explicitly. Position and
facing continuity therefore do not by themselves prove velocity continuity.

[`compileSequenceStep`](../src/sequence-registry.ts) chooses bounded adapters
using current figure, successor and actual state. It otherwise returns an
`established:*` plan. Having a shared wrapper does not make an established
acquisition path equivalent to a strict carried adapter. Capability flags and
formation dispatch still gate whole-dance acceptance.

[`figureContinuity`](../src/engine.ts) contains many predecessor/successor
conditions that prescribe preparation for specific combinations. Constants such
as corner spacing, contact ramps, swing radius, fixed ingress time and turn
subdivisions remain spread across adapters. Their consistency tests can pass
without proving that those choices match how dancers execute the calls.

Concrete conventions needing a separate evidence label:

- `engine.ts` gives an ordinary swing `Math.max(1, f.beats / 4 - .5)` revolutions
  and a `.31` radius. A swing instruction does not thereby author that winding
  count. Preserving explicitly authored allemande amounts and preserving this
  computed swing amount are different obligations. The latter should be free to
  change when a better timing model preserves the actual swing semantics.
- `engine.ts` moves long lines `.52` units toward center and uses fixed fractional
  windows for circle/star contraction and release. These are staging choices.
- `revolving-door-adapter.ts` mandates `[1.25, 4.5, 1.25, 1]` internal phases,
  while `travel-figure-adapter.ts` mandates `[4, 4, 4, 4]`. The catalogue should
  preserve authored total counts while identifying whether subdivisions are
  sourced, reviewed interpretation, or merely current implementation.
- `petronella-adapter.ts` fixes a three-quarter individual spin and no clap;
  `star-promenade-whirl.ts` fixes a 1⅜-turn butterfly whirl from its diagonal
  incoming geometry. Neither restriction should become the universal glossary
  definition by accident.

## Risks the semantic catalogue should address first

1. **Name coverage masks variant gaps.** Forty-one recognized categories says
   little about arbitrary entry, duration, role order, contact graph or exit.
   Corpus reporting must separate missing names from unsupported combinations.
2. **Traditional action and interpolation are interleaved.** For example, the
   literal turn amount is choreography; choosing when to shrink radius or
   acquire a hold is modeling. Keep separate evidence for each.
3. **Successor requirements leak backward.** Swing, arch, hey and courtesy-turn
   preparation repeatedly change the previous figure. A shared semantic
   preparation model should express permitted overlap without silently
   changing a named action or borrowing unrecorded time.
4. **Contact graph identity needs semantics.** Physical equivalence is not always
   record equality: an unchanged joined hand can become an arch, and endpoint
   record order may reverse. Define allowed transitions explicitly rather than
   weakening all handoff checks.
5. **Four-person geometry dominates.** Exact ±.9 corners recur across otherwise
   unrelated figures. Generalizing transforms and entry constraints could
   unlock combinations; replacing rejection with a reset would only conceal
   the problem.
6. **Checks are not independent research.** Fixture tests prove compatibility
   with retained interpretations. Numerical checks prove sampled constraints.
   Neither supplies missing caller semantics, footage comparison or expert
   movement review.

The implementation inventory should be joined to the researched catalogue by
normalized family plus explicit variant parameters, not by adding another
ever-growing list of dance-specific exceptions.
