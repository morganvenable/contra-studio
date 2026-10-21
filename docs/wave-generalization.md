# Shared wave and box circulation

Working implementation specification, 20 October 2026. The shared binding and
carried-wave modules below are now implemented; the new source cohorts are not
playback admissions. Existing evidence in `wave-motion.md` and
`long-wave-motion.md` remains historical until rerun.

## Meaning and evidence

In common contra usage, dancers facing into the set cross to the opposite
station; those facing out loop to another station on their own side. The caller
must establish who crosses and which direction the loop travels. The
[Caller's Box glossary, Circulate](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm)
explicitly includes right and left loops and warns that other formations need
their dance-specific details.

â€œLong waveâ€ describes the connected formation; â€œboxâ€ describes the four people
whose stations circulate. They are not automatically two different movements.
One long wave can connect people belonging to several circulation boxes.
The [CALLERLAB box definition](https://teaching.callerlab.org/mainstream/circulate-split-and-box-definition/)
requires the group of four to be identified and describes advancing to the next
station on its circulation path. This is a primary definition of the square
dance call, not permission to override contra source timing or infer a missing
group. In particular a short wave of four is not by itself the rectangular
two-by-two box required by our present implementation.

Consequences: keep **station occupancy**, **circulation group membership**,
**held hands**, and **contra partner/neighbor relationships** separate.
Changing a handhold does not automatically change a contra neighbor.

## Existing reusable machinery and actual restrictions

- `wave-figures.ts::compileBoxCirculate` already accepts explicit four-ID
  station transfers, measured entry/exit constraints and wave graphs. It
  validates two inward crossers and two outward right-loopers, four counts,
  a rectangular box, half-width 0.6â€“1.1 and half-depth 0.35â€“0.65 scene units.
  Crossers retain room-facing; loopers turn a half-turn right. The motion
  releases the old hands and acquires the resulting graph. Reuse this kernel.
- `wave-figure-adapter.ts` provides separate balance/circulate operations and
  a reviewed 4+4 composite. Its caller currently supplies the destination map.
- `full-long-wave.ts` validates along-hall ordered waves, alternating facing,
  reachable adjacent hands, explicit between-box seam hands and binding epoch.
  It currently joins right-hand box segments with left-hand seams. Preserve
  that declared scope initially.
- `long-wave-source-sequence.ts` is the main composition bottleneck:
  `assertProgram` requires a final neighbor-right-allemande 1.5 setup followed
  by exactly two eight-count circulations, larks then robins crossing, with
  progression at the end. Its former loop chose partner/neighbor hand labels
  from a phase index; the lead replaced that loop with the shared carried
  operation during this work. The remaining source-admission restrictions
  describe one family, not circulation.
- The shared four-actor `SequenceBoundary` cannot contain a contact reaching
  into another minor set. A long-wave bridge needs a full-set graph layer;
  silently filtering seam hands to fit the four-person boundary is invalid.
- Short-wave formation and half-allemande adapters have different contracts:
  fixed Â±0.9 entry slots, unit-spaced short waves, two-count half turns and a
  particular twelve-count partner-swing exit. Do not route box circulation
  through those names merely because both use the word â€œwave.â€

## Source cohort

The retained HTML is the source of truth; these summaries are not approvals.
All three new targets have 64 authored counts. Combined eight-count balance/
circulate rows still need an explicit timing interpretation.

| Record | Relevant actual composition | What it tests |
| --- | --- | --- |
| [1591, Bob the Surfer](https://contradb.com/dances/1591), existing baseline | Neighbor right allemande 1.5 â†’ zero-count wave assertion â†’ larks circulate â†’ robins circulate â†’ progression | Preserve established path, counts and full-wave seam contacts. |
| [2152, Minimum Fuss, Maximum Fun](https://contradb.com/dances/2152), Dean Snipes | Neighbor balance/box-the-gnat 8 â†’ larks balance/circulate 8 â†’ robins balance/circulate 8 â†’ neighbor swing 8 | Different producer and nonterminal exit. No wave assertion is printed; the actual box-the-gnat endpoint must establish the formation. |
| [3265, Snap](https://contradb.com/dances/3265), Moose Flores | Lark-first full hey 16 â†’ zero-count larks-in wave assertion â†’ one larks balance/circulate 8 â†’ partner swing 8 | Single circulation, hey producer and partner exit. Notes explicitly connect hey and wave formation; they do not authorize a zero-count teleport. |
| [187, Nomad's Land](https://contradb.com/dances/187), Bill Olson | Preamble starts robins-in long waves â†’ robins circulate â†’ larks circulate â†’ neighbor balance/swing; ending half hey progresses | Explicit initial topology, reversed role order, repeat-entry wave requirement. |

New snapshots are under `research/contradb/snapshots/`.
Fingerprints: 2152 `contradb:2152:f3e7b19082779678`;
3265 `contradb:3265:15ba781f402d26a5`;
187 `contradb:187:f194c882530c1ea0`.
Do not replace these with a different dance bearing a similar name.

## First implementation slice

1. Add a pure circulation binding planner. Input: actual carried poses,
   stable actors, explicit box membership, ordered wave segments, hand edges,
   partner/neighbor maps, epoch, crossing/looping selectors, loop direction,
   and source count. Determine the four vacant destination stations from the
   declared box topology. Validate source roles against actual facing; never
   relocate an actor to make that validation pass.
2. Return a bijective actor-to-station transfer and resulting facing/hand graph.
   In the current rectangular frame `(x,z)`, a crosser reaches `(-x,z)` and a
   right-looper reaches `(x,-z)`; destination IDs name the actual previous
   occupants of those stations. Position formulas validate a supplied box,
   not a nearest-person search. Derive relationship labels from the carried
   maps rather than â€œfirst circulationâ€ versus â€œsecond circulation.â€
3. Execute one source-counted circulation at a time through the existing
   kernel. Balance preserves occupancy and graph; circulation permutes them.
   Compose 1, 2 or 3 calls without requiring a complementary pair or terminal
   progression. Do not rebind relationships inside this local operation.
4. Keep whole-set seam contact release/acquisition in the full-wave owner.
   Add explicit exits for a named swing or another wave operation. A zero-count
   formation row validates the reached producer endpoint. Any required motion
   must occur inside that producer's authored counts and be explicitly owned.

Original investigation scope (superseded by the checkpoints below): retain the
planner/kernel tests and 1591 regression, then investigate the
2152 producerâ†’two circulationsâ†’neighbor-swing seam. In parallel, inspect whether
3265's hey can reach a valid wave within its sixteen counts. Its current neutral
across-facing hey exit does **not** establish the required role-facing wave.
Keep 187 as the initial/repeat-topology contrast; do not claim its whole dance
is solved by supporting the opening calls.

Implemented checkpoint: `box-circulate-binding.ts` resolves the per-box
permutation from actual stations/facing. `carried-wave-circulate.ts` owns the
complete input and output state, including actual held contacts and seam edges,
explicit boxes, relationships, epoch, source clock, and any waiting actors.
One circulation or a 4+4 balance/circulate composes repeatedly without a fixed
call count. Its 64-samples-per-count global check includes adjacent boxes and
waiters, retaining the existing 0.45 clearance / 1.8 speed envelope. This is
sampled evidence, not a continuous whole-set certificate.

Current focused checks: four carried-module tests and three independent
1591-derived integration tests pass. They include one through four calls,
full-hand release/reacquisition, sparse/translated actor identities, 2/3/4-couple
active/waiting inputs, input ownership, malformed contact/epoch/partition
rejection, and an obstructing waiter. Production wrapper integration and
baseline comparison belong to the lead; this checkpoint alone does not certify
new whole dances, body meshes, audio or browser output.

## Acceptance and exclusions

- Independent literal station-transfer oracles, both role orders, shuffled IDs,
  translated geometry, stale maps/epoch and wrong-handed-edge rejection.
- Four right circulations restore occupancy/facing without identity rebinding;
  one, two and three are independently composable, not recognized signatures.
- Root/facing/contact continuity, named hand ownership and reachable full holds,
  including every seam between active boxes.
- Three- and four-couple complete periods: waiting dancers remain outside active
  wave graphs, return at the reached endpoint, and never wrap around the hall.
- Whole-dance tests retain source counts, choices, people and progression;
  changed titles and unrelated compatible producers/successors reuse the code.
- Documented left loops, shadow groups, corner-selected circulations, short-wave
  pivots, unusual counts and other formations stay explicit unsupported variants
  until their contracts are implemented. Do not normalize them to right loops.

Research checked the linked primary pages on 20 October 2026. No outside
implementation code or choreography license was imported; original provenance
and unresolved data-license status remain unchanged.

## Implemented shared layer

- box-circulate-binding.ts resolves crossing/looping station ownership from actual
  positions, facing, explicit roles and ordered wave lines. Tests rotate, translate
  and renumber dancers; immutable outputs retain explicit hand ownership.
- carried-wave-circulate.ts owns the entire active wave and actual handholds,
  including between-box seams, explicit box partitions, partner/neighbor maps,
  source clock, binding epoch and stationary waiting dancers. Local projections
  must reassemble the exact original full graph; they cannot discard seam hands.
- One call consumes four source counts, or eight with a reviewed 4+4 balance.
  One, two, three and four calls compose by passing actual exit state to the next
  call. No phase index chooses a partner/neighbor relation or destination.
- The existing Bob the Surfer wrapper now invokes this shared operation. Its
  guarded acquisition, final release/facing and reached progression event remain
  outside the operation. Source modifiers are checked before lowering, so unknown
  arguments cannot disappear while constructing a call.
- The supported circulation is explicitly right-loop. Other loop directions
  and arbitrary short-wave layouts remain unsupported.

Current verification: unit and source-integration tests preserve full seam hands,
actual station permutations, unchanged relationships/epochs, waiting actors,
translation and sparse actor IDs. A pre-refactor sample of 390 frames across
2/3/6 couples and two repeats agrees in roots, wrapped facing and contact points/
strengths within 3e-15, with no missing contacts. Raw yaw may differ by full turns.
Global clearance/speed checks sample all supplied actors at 64 points per count;
they are sampled envelopes, not continuous collision proofs.

Next implement explicit initial-wave and producer endpoint requirements against
the source cohort before widening import admission. A zero-count assertion cannot
move or turn dancers. Keep a complete source path, including exits and finite ends,
as the acceptance criterion for each new admission.

Final focused verification: 23 tests passed, including all 129 Ready defaults,
complete 2-12-couple periods, articulated long-wave/body regressions and 9,650
full-strength hand samples (wrist error below 3e-16; zero leg corrections).
TypeScript and isolated Pages production build passed. No new browser/GPU/audio
check or public deployment was performed. The next concrete source is 187, with
explicit initial waves; its terminal hey must actually return to the next wave
before rebinding.

## Initial formation and distinct balance exits

`initial-long-wave-state.ts` declares the initial inward role and right-hand
neighbor convention at count zero. It preserves supplied roots and relationships,
constructs complete seam hands and leaves waiting poses untouched. It cannot be
used as a runtime zero-count formation change.

`carried-wave-balance.ts` consumes four counts while retaining the complete wave
graph, including hands between boxes. A separate explicit circulation exit
prepares a two-hand neighbor balance within the last two circulation counts,
closes each pair to 1.18 spacing and acquires hands in the final quarter-count.
It returns a paired state with no wave graph. This is a declared animation
preparation, not extra authored counts. `held-pair-balance-step.ts` validates
those actual hands against the next balance's entry and preserves the subsequent
swing handoff. These helpers are not yet a new whole-dance importer route.

### Source 187: preserve version differences

The [author's original Nomad's Land instructions](https://www.billolsondance.com/nomads)
were inspected on 20 October 2026. They explicitly specify right-hand neighbors
at the start, larks facing out, a wave balance before the neighbor swing, and
left hands with original neighbors after the terminal hey. That supports the
initial hand convention and the next-wave endpoint topology.

The retained ContraDB record instead specifies neighbor balance and swing.
Its chain/hey counts are 8+8; the author's printed chain/hey counts are 4+8,
leaving that printed phrase short. Do not silently repair the original timing
or substitute its wave balance into the retained ContraDB record. They need
distinct, traceable interpretations. The initial builder and both balance
contracts deliberately remain separate.

`role-hey-wave-step.ts` now uses the shared four-pass encounter graph and existing
trajectory solver to reach explicit wave stations in eight counts. It preserves
the measured width and center, verifies the half-hey permutation, and retains
the existing 1.3 speed / 4 yaw limits. It returns a released local boundary;
complete next-wave hands and endpoint rebinding belong to the global wrapper.
Tests include a real chain producer and translated, renumbered carried state.

Earlier composition verification: 28 tests passed across initial formation,
standalone wave balance, circulation, paired balance/swing handoffs and existing
long-wave source/body regressions. The three wave-endpoint hey tests also pass.
All 129 Ready defaults pass separately; TypeScript and an isolated production
build pass. These are not new browser/GPU/audio checks.

The finite wrapper now passes whole periods for 2â€“12 couples in both the
retained paired-balance composition and a separately labeled synthetic wave-balance
composition. The latter demonstrates wave-balance-to-swing capability; it does
not resolve the author's printed count discrepancy.

Retained source 187 now imports through the public compiler with a strict initial
wave policy. Required choices, including the chain receiver and preparations, can
be removed; remembered omissions stay omitted. Source preamble matching consumes
the complete role-facing instruction and rejects appended actions. Changed titles
and figure identifiers do not change motion. Public source tests validate complete
3/4-couple periods, musical joins and endpoint-only relationship changes.

Ready now contains 130 entries. Promotion generated the exact reviewed 187 archive;
SHA-256 comparison confirms all previous 129 archive strings are unchanged.

## Current CPU playback evidence

The final production `initial-wave-body.test.ts` run passes all three tests.
Synthetic wave-balance compositions with 3 and 4 couples exercise two complete
repeats at eight samples/count and selected phases throughout their finite
periods. Production Avatar cadence and fixed arm/leg lengths pass, and every
sample has zero leg reach corrections. Full-strength wrist targets on the new
wave, circulation, neighbor-swing and circle path agree within 5e-16. A separate
public `prepareContraDbReview` -> `compileChoreography` check of retained source
187 samples counts 12-24 at 32 samples/count: the paired-balance variant also has
exact held wrists and no leg corrections. Its stance wrapper is included.
The synthetic wave-balance program has no ordinary paired balance, so
`withBalanceStance` is explicitly checked to leave it unchanged.

Reach-aware timing is part of the motion contract. The released circle drops
ring hands over counts 5-5.5, gathers to its actual prepared-swing endpoint over
5.5-7.5 and acquires the reachable frame over 7.5-8. This replaces the sharp late
reach-gated acquisition without adding counts. The wave-return half hey uses
encounter gates [1.95, 3.575, 5.2, 6.9], retaining all six encounters, the source's
eight counts and the existing 1.3 speed / 4 yaw bounds. Earlier timing caused leg
reach corrections; final CPU checks pass without relaxing the rig assertions.

The following legacy partner swing still has an approximately 0.0355 world-unit
upper-arm wrist offset at count 46.25. The body test independently compares its
roots and every contact with the unchanged standalone primitive on the same
actual incoming state. This inherited frame limitation is recorded separately;
the test does not claim exact wrists throughout the whole dance or validate a
new buzzstep. These are sampled CPU rig checks, not a continuous mesh-intersection
proof. Hardware GPU rendering, browser playback, audio synchronization and caller
review have not been rerun for this checkpoint.

Inventory remains 130 Ready entries and 159 checked-in fixtures. Broader variant
counts below describe retained evidence, not additional playable dances.
## Broader retained-source variant inventory

A separate text scan of all 2,422 canonical retained records finds 99 sources
with 182 circulation rows. This is broader than the exact standard right-loop
cohort above, and is not a count of playable dances. The bounded local evidence
is `research/contradb/wave-variant-inventory.json`.

- Explicit left loops: 965, 966, 1846, 1856, 2033, 2329, 2916 and 3056
  (ten rows).
- Different participants or formations: shadow 1713; short-wave endpoint 1845;
  corner selectors 942/2432; ones/twos 2244/2245; figure-eight circulation 2980;
  three-person subset 3242.
- Nonstandard row counts: 1188, 1372, 2244, 2245, 3342, 2328 and 2653.
- Alternative wording, including 1256, 1429 and 1651, is retained separately
  from unambiguous variants. No explicit all-eight clause was found by this scan;
  that does not establish that none exists outside this retained corpus.

These require separate semantic contracts. Do not map them to the implemented
right-loop four-station operation merely because their text says circulate.

Release check (2026-10-20): 66 focused motion/source/Ready tests and 29 script tests pass; TypeScript and isolated Pages build pass. Playwright Chromium with software WebGL opens Nomad's Land, scrubs counts 6/14/20/38/54/62, and plays across count 64 into the next round without page errors. Perspective screenshots were inspected. This supersedes the browser-unrun status above; hardware GPU, audio synchronization and caller review remain unrun. The first release was canceled before publishing to tighten terminal-hey modifier rejection.

## Left-loop capability checkpoint - 21 October 2026

Measured box binding, the four-count kernel and full-set carried circulation
accept explicit left loops from actual left-hand box segments, retaining
right-hand between-box seams. Changing only direction on a right-loop wave
rejects. Binding retains right as its legacy default; carried calls require an
explicit direction. Left-loop paired-balance preparation remains rejected.

New tests reflect each local root and facing sample at 1/64 count, reject mixed
loop directions and incompatible stations, and compose four calls through
3- and 4-couple sets. They check exact source-clock increments, unchanged
relationships/epochs, stationary waiting actors, contact graph and occupancy
closure. These are local composition periods, not progressing whole-dance
admissions. No Ready archives or source routes change in this slice.

Historical textual inventory identifies eight explicit-left-loop sources:
965, 966, 1846, 1856, 2033, 2329, 2916 and 3056. Producer boundaries and
whole-source finite progression remain the next integration seam.

## Counted left-wave producer and paired exit - 21 October 2026

`carried-hey-wave-producer.ts` composes the existing measured role half-hey
trajectory over explicit boxes and acquires the declared reached full-wave graph
in its last quarter-count. The declared partner/neighbor receiver must match
actual station occupants. Waiting actors remain stationary and seam hands belong
to the full-set owner. No zero-count assertion moves a dancer.

`carried-wave-circulate.ts` now supports the mirrored left-loop paired exit and
an explicit partner-balance receiver as well as neighbor balance. The reached
along-hall pair geometry must satisfy the same existing preparation envelope.
`carried-paired-balance-swing.ts` consumes those actual two-hand contacts for an
explicit 4+12 balance/swing. It releases its swing frame during the count before
radial expansion, preserving source counts and the existing .64 reach envelope.
The raw primitive retained weak targets beyond reach late in expansion; those
contacts are not carried into this new adapter.

Retained source2329 supplies the bounded target: source rows24-64 are half hey
(rights in center), partner left-hand wave, robin-first then lark-first left-loop
circulations, and partner balance/swing. Tests reach count64 from a real compact
chain endpoint in3/4-couple sets, checking actual partner then neighbor then
partner contacts, unchanged clocks/epochs, stationary waiters and explicit
hand acquisition/release. Renumbering/translation and rejection tests exercise
the contracts independently of source identity. The4+12 split and release are
explicit interpretation/program choices, not additional authored counts.

This is a source-backed40-count composition, not a whole-dance finite-period
certificate or Ready admission. Source2329's opening circle6/pass2 progresses
inside a Becket dance; the existing finite Becket wrapper owns only its literal
slice event. That reached pass endpoint and its end behavior remain the next
whole-source integration seam. No generated archives changed. GPU/audio unrun.
