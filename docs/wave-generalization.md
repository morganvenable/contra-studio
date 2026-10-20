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

“Long wave” describes the connected formation; “box” describes the four people
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
  a rectangular box, half-width 0.6–1.1 and half-depth 0.35–0.65 scene units.
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
  fixed ±0.9 entry slots, unit-spaced short waves, two-count half turns and a
  particular twelve-count partner-swing exit. Do not route box circulation
  through those names merely because both use the word “wave.”

## Source cohort

The retained HTML is the source of truth; these summaries are not approvals.
All three new targets have 64 authored counts. Combined eight-count balance/
circulate rows still need an explicit timing interpretation.

| Record | Relevant actual composition | What it tests |
| --- | --- | --- |
| [1591, Bob the Surfer](https://contradb.com/dances/1591), existing baseline | Neighbor right allemande 1.5 → zero-count wave assertion → larks circulate → robins circulate → progression | Preserve established path, counts and full-wave seam contacts. |
| [2152, Minimum Fuss, Maximum Fun](https://contradb.com/dances/2152), Dean Snipes | Neighbor balance/box-the-gnat 8 → larks balance/circulate 8 → robins balance/circulate 8 → neighbor swing 8 | Different producer and nonterminal exit. No wave assertion is printed; the actual box-the-gnat endpoint must establish the formation. |
| [3265, Snap](https://contradb.com/dances/3265), Moose Flores | Lark-first full hey 16 → zero-count larks-in wave assertion → one larks balance/circulate 8 → partner swing 8 | Single circulation, hey producer and partner exit. Notes explicitly connect hey and wave formation; they do not authorize a zero-count teleport. |
| [187, Nomad's Land](https://contradb.com/dances/187), Bill Olson | Preamble starts robins-in long waves → robins circulate → larks circulate → neighbor balance/swing; ending half hey progresses | Explicit initial topology, reversed role order, repeat-entry wave requirement. |

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
   maps rather than “first circulation” versus “second circulation.”
3. Execute one source-counted circulation at a time through the existing
   kernel. Balance preserves occupancy and graph; circulation permutes them.
   Compose 1, 2 or 3 calls without requiring a complementary pair or terminal
   progression. Do not rebind relationships inside this local operation.
4. Keep whole-set seam contact release/acquisition in the full-wave owner.
   Add explicit exits for a named swing or another wave operation. A zero-count
   formation row validates the reached producer endpoint. Any required motion
   must occur inside that producer's authored counts and be explicitly owned.

Next retain the planner/kernel tests and 1591 regression, then implement the
2152 producer→two circulations→neighbor-swing seam. In parallel, inspect whether
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
- The supported circulation is explicitly right-loop. Other loop directions,
  arbitrary short-wave layouts and new initial-wave setups remain unsupported.

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
explicit initial waves; initial hands and chain receiver remain reviewed choices,
and its terminal hey must actually return to the next wave before rebinding.
