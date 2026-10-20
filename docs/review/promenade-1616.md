# Partner half-promenade and Patience #1616

Reviewed 2026-10-18. This review separates source/identity/timing correctness from the procedural Avatar's anatomical limitations.

## Supported interpretation

The retained public [Patience record](https://contradb.com/dances/1616), credited to Chris Page, gives six rows totaling 64 beats. Its B1 first row says only “partners promenade” for eight counts. The original text remains unchanged in `test-data/contradb/1616.json` and portable interpretation exports.

The explicit interpretation selects an across-set partner half-promenade: skaters hold, both same-name hands, lark in the left slot, larks passing left shoulders, followed by a left half-turn with the same partner. This matches the half-promenade direction, handhold description, and eight-count timing in [CONTRALAB Definitions](https://www.contralab.org/Definitions.html). It is a reviewed conventional interpretation of the source, not a claim that the source specifies every detail.

The combined partner balance/swing row is interpreted as 4 + 12 counts. The final neighbor long swing retains all 16 source counts. End-of-cycle progression is an explicit choice because the source omits a progression marker. Removing required choices or the promenade capability blocks playback.

## Implementation

- `promenade.ts` takes explicit stable actor IDs, immutable entry/exit maps, reciprocal current partner/neighbor bindings, and a matching topology epoch.
- Both pairs cross together, maintaining their own partner identities. No courtesy partner is swapped or inferred by proximity.
- Four crossing counts are followed by three turning counts and one count of release/opening into canonical formation slots. No additional source time or footfalls are inserted.
- The preceding same-partner swing prepares a 0.68-unit pair separation inside its existing duration. Ordinary wide 1.8-unit entry is rejected by the speed budget rather than silently accelerated.
- Both skaters grips remain through the completed half-turn. Right hands are routed above left hands. The final 15% of the specific preceding partner swing prepares the free arms as swing grips release, avoiding a discontinuity into compact promenade position. Other swing exits remain unchanged.

## Verification

The final targeted command covering promenade, right-and-left-through regression, and articulated scene timing/extended behavior passed 29/29 tests:

    node --experimental-strip-types --test src/promenade*.test.ts src/right-left-through.test.ts src/scene-timing.test.ts src/scene-extended.test.ts

`npx tsc --noEmit` passed.

The 14 promenade-specific tests cover:

- Exact source rows, 64-count budget, explicit interpretation, capability rejection, and lossless source/interpretation archive re-import
- Persistent same-partner identity, literal left-shoulder gate, same-couple left turn, opposite-side endpoint permutation, stale-epoch rejection, arbitrary stable IDs, and immutable snapshots
- C2 root/facing trajectories and rigid world transforms
- Dense independent root clearance and speed samples
- Full finite circulation for every size from 2 through 12 couples, including odd/even ends, all figure boundaries, no duplicate hand ownership, deterministic scrubbing, and exact spatial closure
- Actual Avatar sampling at 120 samples per beat for complete source playback with 2 and 6 couples; fixed limb lengths; one gait phase per musical beat; all articulated figure joins below 0.002 units
- Actual production-mesh arm/torso samples through preparation, crossing, held turn, and release, including a rotated/translated fixture
- Negative visual scope tests for all unrelated swing exits

### New promenade measurements

- Minimum root clearance: 0.66 units
- Maximum root speed: 1.05 units per beat
- Maximum yaw rate: approximately 1.277 radians per beat
- Leg reach corrections: zero in the promenade and its preceding partner swing
- Full-strength wrist target error: below 7e-16 units
- Sampled own forearm/hand-to-torso clearance: at least 0.01186 units
- Sampled other-person arm-to-torso clearance: at least 0.10010 units
- Sampled unrelated arm-to-arm clearance: at least 0.02301 units

The original generic arm route produced up to 0.06274 units of own-torso penetration and compact-entry arm overlap. The scoped skaters route removes those sampled penetrations. These mesh measurements are sampled regression checks, not a continuous collision proof or a claim of motion-capture realism.

### Independent full-source check

A separate checker passed four independent source/archive/finite-period tests. Its actual six-couple Avatar sweep over beats 31.8–40.2 at 50 samples per beat found positive clearance for unrelated arms (0.02417), other torsos (0.08763), other heads (0.11829), and legs (0.03831). The new entry/release artifacts were cleared. A 0.00040-unit own-hand overlap at beat 40.2 is in the following inherited allemande. Results are retained in `qa/next-independent/promenade-collision-results.json`.

### Inherited full-source limitations

The existing long-lines and allemande motion still require small leg reach corrections: maxima approximately 0.01546 and 0.02015 units respectively. The six-couple ending neighbor swing has a maximum 0.00066-unit correction. The inherited partner balance has a maximum 0.02315-unit full-strength wrist discrepancy. These are explicit regression budgets in the integration test and are not attributed to the new promenade. All figures retain one footfall per musical beat; the renderer does not invent extra steps to conceal the corrections.

Publication, whole-build regression, and capability registration remain the coordinating task's responsibility. The new primitive alone does not establish support for every dance containing the word “promenade.”
