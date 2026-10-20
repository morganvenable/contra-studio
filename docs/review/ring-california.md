# Ring balance and California twirl

## Reviewed source

[Easy Peasy by Diane Silver, ContraDB 1450](https://contradb.com/dances/1450) is retained in `test-data/contradb/1450.json`. Its seven rows and 64 beats are preserved:

- Neighbor balance and swing: 16
- Long lines: 8
- Larks allemande left 1½: 8
- Partner balance and swing: 16
- Circle left three places: 8
- Balance the ring: 4
- Partner California twirl, progressing: 4

The archived, removable interpretation explicitly assigns four beats to each balance within balance-and-swing. It also declares the California twirl's lark-right/robin-left hands, robin under the arch, right-turning lark, and half-turn amount. Unselected or incompatible interpretations remain unsupported.

The [Caller's Box glossary](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm) supplies the reviewed definitions: a ring balance keeps all four hand connections while balancing inward and outward; California twirl starts side-by-side with nearest hands, exchanges places under an arch, and reverses both dancers' facing.

## Contracts

`compileRingBalance` receives four named actors, persistent roles/couples, a current reciprocal relationship epoch, explicit cyclic actor IDs, and immutable entry/exit maps. Its four declared left/right hand connections stay at full strength through the fourth-count outward landing. A declared `partner-california-twirl` exit then releases only neighbor hands and prepares the named partners' same-facing entry within the existing four beats.

`compileCaliforniaTwirl` receives two named persistent partners and their explicit hand/over-under assignments. It separately records the reachable physical entry and the logical entry slots. The exit exchanges exactly those logical slots and reverses facing. The lark travels the wider right-turning arc; the robin takes the tighter left-turning arc beneath their joined hands. No nearest-person relationship inference is used.

The adapters bind these contracts to `FigureContext`. Source 1450 uses a compact 1.10 m square at circle-to-ring entry. The ring opens the partner rows after the fourth-count landing; the twirl itself widens its final exchanged slots to the explicit ±0.9 m logical positions. Endpoint root, facing, and held-wrist continuity are tested. The low-level primitives support rigid world transforms; the current figure wrappers require ordinary longways hall alignment.

Compile-time guards reject stale or contradictory identities, unsupported modifiers, invalid entry/exit semantics, excess speed, root clearance below budget, and unreachable full-strength ring handholds. In particular, a centered rectangle with corners at x = ±0.86 m, z = ±0.5 m is rejected because its declared holds require 0.7724 m arms. The full-strength shoulder-to-wrist budget is 0.64 m for the fixed 0.65 m arms.

## Independent progression oracle

In NW, NE, SE, SW corner order:

1. After partner swing: `[L1, R2, L2, R1]`
2. After circle left three places: `[R2, L2, R1, L1]`
3. After partner California twirl: `[L2, R2, L1, R1]`

This is one improper progression. The ring never permutes actors or changes the relationship epoch; the twirl retains persistent partners. Only the formation compiler updates current neighbors at progression boundaries.

## Verification and limitations

- Eight primitive/adapter/actual-Avatar tests cover immutable contracts, opaque actor IDs, rigid transforms, exact endpoints, all four named ring holds, fixed limbs, and 32 literal alternating foot landings across four actors and the eight new beats.
- Four actual-source integration tests cover attribution and archive round-trips, exact choices and capability gates, all 2–12-couple complete finite periods, literal corners, boundary continuity, contacts, and complete-round Avatar cadence.
- The actual-mesh collision regression samples both new figures at 40 samples per beat, checking noncontact limbs, torsos, head envelopes and the individual posed head meshes, with zero foot reach correction and exact full-strength wrist targets.
- Existing 1502 and 2259 arch/release regressions remain green. California styling is activity-specific and does not request the widened-exit routing cue used by the other arch family.

The independent six-couple sweep across beats 55.8–64.2 clears all sampled categories; its tightest exact head-mesh clearance is positive at 0.824 mm. A separate six-couple full progression-period sweep checks all twelve repetitions, including waiting dancers, with zero foot reach correction and no sampled envelope/limb overlap. These are sampled procedural-animation checks, not continuous collision or anatomical certificates. The robin's arch passage uses a procedural 14 cm knee lowering. The existing allemande in the complete source has a separately bounded foot-reach residual of at most 7 mm; the new ring and twirl figures have none in the checked sequence.

## Corpus candidates

A scan of 1,403 retained ContraDB page snapshots found 131 mentioning California twirl and 28 containing the exact 8-beat circle-left-three, 4-beat ring balance, 4-beat partner California twirl sequence. This is an inventory of matching rows, not a playable-dance count.

- [2040, Lark in the Afternoon](https://contradb.com/dances/2040), was the closest follow-on and now has its own retained-source tests, described below.
- [1270, Don't Have to Walk but You Can Dance](https://contradb.com/dances/1270), has the exact final triplet and seven of eight resolved rows. Its neighbor promenade is outside the current persistent-partner promenade contract.
- [624, Cranky Ingenuity](https://contradb.com/dances/624), has the exact final triplet and eight of nine resolved rows. Its couple-as-unit do-si-do requires its own adapter.

[410, Hocus Pocus](https://contradb.com/dances/410), is the next existing-family candidate: neighbor balance/swing, robin chain, robin-led right-center/left-end half hey, partner balance/swing, then the exact final triplet. It needs the explicit chain receiver, paired-half-hey composition, and redundant “right shoulder” source wording checked together before being counted as playable.

Other California twirl variants must not be silently folded into this contract. For example, source 1158 explicitly calls a neighbor “Jersey twirl” with reversed hands, and source 1351 asks for a neighbor twirl to face a partner. Neither shares this persistent-partner, lark-right/robin-left contract. Intermediate progressions, including source 1403's first-phrase twirl, also need complete finite-set composition validation.

## Additional retained composition: 2040

[Lark in The Afternoon by Yoyo Zhou](https://contradb.com/dances/2040) is now retained in `test-data/contradb/2040.json`. Its source has seven rows and 64 beats. The literal final words “to progress” become `progressionFromText` in the normalized row; the raw source row still has no progression glyph. Exactly one compiled progression is checked against the resulting endpoints, with no added movement or endpoint-inference choice.

`ring-california-2040-integration.test.ts` passes five complete-source tests: source/archive/choices, exact corner oracle and all 2–12-couple finite periods, named contacts and boundary continuity, a full six-couple actual-Avatar round, and exact trajectory/contact equivalence to the collision-reviewed 1450 final phrase. The different A2 composition is larks allemande left 1½, then partner do-si-do. Final B2 and the progression permutation match 1450. Independent review is tracked separately from these implementation tests.
