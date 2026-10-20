# Contact-bearing ricochet hey

## Source and meaning

The complete source example is [ContraDB 1067, “New Dance Dance tme,” Don Flaherty](https://contradb.com/dances/1067). Its retained snapshot is `test-data/contradb/1067.json`; the typed rehearsal fixture is `test-data/ricochet-hey/fixtures.ts`.

The source supplies 16 counts for a robin-start, right-center/left-end hey, continuing until the larks meet for the second time and ricochet back to partners. This is eight alternating event layers, with the final lark center event replaced by a bounce. The next partner balance verifies the named exit pair. An ordinary full hey would return the old side pairs and would be wrong.

The [Caller's Box glossary, “Ricochet hey”](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm) describes two-hand rebound, remaining on the original side, facing inward and backing away on the next step. Right-shoulder replacement retreats backward-left; left-shoulder replacement retreats backward-right. These conventional details remain explicit reviewed interpretation fields, rather than being silently supplied as source wording.

Source 1067 places its progression mark on the ring balance before a California twirl that names new neighbors. The archived review must explicitly choose the balance-and-twirl phrase as the progression unit. The snapshot and raw row marker remain unchanged. This source must not auto-play merely because its individual figures are recognized.

## Reusable contract

`ricochet-hey.ts` compiles explicit stable actor IDs, partner/neighbor maps, matching relationship epoch, entry order, source beat budget, four or eight layers, opposing center/end shoulders and exact ricochet role/occurrence records. Each ricochet also states both hands, across-facing and retreat direction. A center pass swaps its ordered actors; a ricochet preserves their slots. Each side layer resolves exact bound paired identities after that permutation. Unused or duplicate occurrences, incompatible shoulders, unknown extra bounce fields and stale relations fail closed.

`ricochet-hey-adapter.ts` validates a named same-sideline entry and an explicitly named paired-balance exit. Its outgoing relationship is independent of the incoming one and must match the actual resulting graph and following four-count balance. Both role/shoulder reflections, partner/neighbor entry reflections and eight/sixteen-count variants are tested. This is semantic dispatch, without title or source-ID special cases.

Ordinary pass-gate geometry is reused from `compileHeyTrajectory`; the actual ricochet graph and its trajectories are separate. The bounce gate has opposing actors 0.80 model units apart, joined with two opposing hands. Its neighboring side gates let the actor back away with the specified inward body facing. No extra staging counts or off-beat footsteps are added.

## Declared motion interpretation

The sixteen-count gate times are 2, 3.75, 5.5, 7.25, 9, 10.75, 12.5 and 14.25 counts. The eight-count implementation uses the first four gates of that schedule, ending at 7.25. These subdivisions and schematic dimensions are animation choices, not numeric timings supplied by the author. A compact 1.10-unit side-pair stance is reached inside a preceding same-pair swing. Other swing exits are unaffected.

The solved gates use 0.66-unit ordinary shoulder clearance, 1.00-unit side-gate distance from center and 1.20-unit outer-loop extent. Position and facing curves retain exact input/output poses and continuous derivatives at gate boundaries. A push contact spans up to 0.35 counts on either side of its gate with gradual acquisition and release; no contact is asserted for ordinary passes.

## Verification

- An independent source-identity oracle checks all named corners at counts 0, 16, 32, 48, 56 and 64.
- Complete finite-line periods for 2–12 couples check stable actor IDs, finite roots, clearance, hand occupancy, position/facing continuity, end waiting and exact period closure.
- Adversarial tests cover stale epochs, wrong entry/exit pairs, role/shoulder contradictions, dropped occurrences, additional modifiers and mutable input/output ownership.
- Actual `Avatar` checks cover two complete rounds plus denser samples around the ricochet and adjoining swing/balance. They test one footfall per musical beat, fixed limb lengths, exact full-strength two-hand wrist positions and zero leg-reach correction for this source.
- Independent actual-source and posed-mesh review has passed, and the capability is enabled by default. An explicit gate-off remains authoritative. Root sampling and surface sampling are regression evidence, not a continuous collision or biomechanical certificate.

## Boundaries

This adapter does not implement rotational bounce-across, diagonal group selection, inter-minor-set exchanges, noncurrent-neighbor rebinding, partner-start side-first heys, partial final passes or free-form “mad ricochet” loops. Jaded (2456) and Koren Wake's Pigeon on the Jetway (2212) therefore remain reviewable challenge sources. Their extra movements and progression semantics are never replaced with this ordinary inward-facing rebound.

## Independent body checkpoint

The independent six-couple posed-mesh sweep covers counts 15.8–32.2 at 25 samples per beat. Minimum sampled other-dancer separation is 0.1047 units for legs, 0.0410 for unrelated arms, 0.0921 for torso surfaces and 0.1097 for exact head meshes. It found no other-dancer intersection in that window.

A separate small styling defect remains: the actor's own forearm overlaps the shirt by up to 0.0198 units at count 29.52. The push has already released and there are no contacts at that instant. Replaying the identical pose with the existing ordinary-hey activity gives exactly identical arm transforms (maximum matrix-element difference zero), confirming that this is shared hand-free arm styling, not a false joined-hand target or a new contact-driven collision. It is disclosed rather than hidden by enlarging tolerances or stretching limbs. The gait and full-strength push wrists remain exact in the regressions.

The focused source/archive, primitive, full-runtime, default-capability and persisted mesh regressions pass 17 tests. This includes the adversarial primitive endpoint exchange that initially passed with deliberately permissive geometry budgets: final actor station membership is now checked as choreography, independent of collision/speed limits. The entire adapter result is immutable.
