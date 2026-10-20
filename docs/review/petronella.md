# Petronella: explicit ring station and body-turn contract

Status: complete source candidate independently cleared; registration is owned by the integration/release coordinator. The targeted multi-group star-to-next-neighbor stride adjustment has passed.

## Source meaning and scope

- The [Caller's Box glossary](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#Petronella_turn) defines dropping the ring hands, moving one position to the dancer's right, and spinning clockwise. Its separate “face next” variant changes the exit, so that qualifier is not equivalent to an inward ring exit.
- [Cambridge Folk's traditional Petronella notation](https://www.cambridgefolk.org.uk/contra/dances/petronella.html) explicitly describes a three-quarter clockwise turn and repeatedly joining the ring afterward.
- The actual complete candidate is [Kitchen Stomp by Becky Hill, ContraDB 810](https://contradb.com/dances/810): neighbor balance/swing 16; larks allemande left 1½ 8; partner swing 8; robins chain 8; balance/petronella 8; balance/petronella 8; star left four places 8 with progression.
- Source omission of a clap is not a source instruction to omit it. The model therefore requires an explicitly labeled no-clap interpretation. An explicit source clap, reverse turn, two-person variant, non-four-count turn, diamond, or face-next exit remains unsupported by this contract.

## Independent rotations and identities

Figure schema: petronella, four counts, all four actors, direction right, amount ¼ (station displacement), spinDirection right, spinAmount ¾ (body winding), ring entry, ring exit, clap none.

The engine uses forward=(sin(yaw), cos(yaw)) and dancer-right=(-cos(yaw), sin(yaw)). Thus the rightward station displacement is a planar -π/2 rotation, while the clockwise body winding is yaw -3π/2. A single clockwise orbit is not a valid replacement. The endpoint is the exact preceding station in the explicitly declared positive-area cyclic order, facing inward. Tests check the full monotone unwrapped winding, not merely equal endpoint angles.

The primitive owns copied actors, relations, cyclic IDs, entry and exit constraints. It validates reciprocal partner/neighbor maps and the current relationship epoch, four adjacent inward-facing square stations, reachable ring hands, stationary endpoint derivatives, and exact declared exit identities. Position-based cyclic ordering in the adapter orders physical slots only; it does not choose or rebind anyone's partner or neighbor.

## Motion and hand timing

The path retains the incoming ring radius throughout the spin and uses short C2 speed ramps. Ring hands release in the first 0.3 count and, for a following ring balance, reacquire in the last 0.3 count. An explicit primitive hand-exit contract remains released for a following star; this changes no root, facing or timing sample. No contact is reported during the intervening free spin. When present, endpoint ring graphs preserve each exact actor and hand. The supported slot radius and physical budgets are checked before exposing a compiled plan.

The shared Avatar gait uses one alternating weight transfer per musical beat. The petronella does not add substeps to accommodate its turn. The test poses the real Avatar through a balance/turn/balance composition, checks every physical landing, fixed thigh/shin and upper/lower-arm lengths, zero new-figure reach correction, and exact full-strength wrist targets. A sampled actual-mesh check covers other-dancer nonjoined limb pairs and limb-to-torso/head surfaces throughout release, travel, turn and rejoin. This is a regression sample, not a continuous anatomical or teaching-safety certificate.

## Verification

- node --experimental-strip-types --test src/petronella.test.ts: 8/8 passed, including no world-space planted-foot slip and seek-order-independent actual geometry.
- Combined primitive, source-import and source810 integration suites: 16/16 passed.
- Independent source810 audit: 5/5 passed for source/archive, counts, exact station/spin, ring graph and all finite periods. Independent six-couple sampling at 25 samples/count measured positive leg, unrelated-arm, torso and exact-head clearance through counts 40–56 (minimums approximately 0.205, 0.155, 0.130 and 0.188 respectively).
- TypeScript no-emit check: passed after staged source/engine integration.
- Source 810 import/archive, ten exact normalized figures, chain-receiver validation, source progression, complete 2–12-couple finite periods, exact corner identities and all source joins passed.
- The complete 64-count actual Avatar test covers all six couples at 40 samples/count, fixed limbs, every physical petronella landing, exact full-strength ring/star wrists, and zero foot-reach correction across all figures and the next balance entry, including the six-couple interior-dancer handoff. A stronger check originally exposed 0.0253 at star count 63 and 0.0212 at the next balance count 64; the explicit final expansion interval below removed those residuals without extra footfalls or stretched limbs.
- Shared chain-to-ring and ring-to-star handoffs preserve all counts and logical identities. For this modeled compact-ring-to-star transition, the star completes its full orbit within its first 6½ counts and opens to its exact logical exit during its final 1½ counts. That subdivision is a modeled transition interpretation, not a finer timing claim from the source, whose eight-count total is unchanged.

## Explicit residual fidelity limits

The new ring and petronella region has positive sampled other-dancer clearance (minimum about 0.130 model unit). The star has positive noncontact clearance outside its 0.12-unit shared hand hub (greater than 0.01); the inherited center-hub hand/forearm geometry overlaps by about 0.029. The existing courtesy-chain release has an opposite-arm overlap of about 0.0506; the compact ring preparation measures about 0.0531 at the same pair and body parts, a roughly 0.00244 difference. Tests compare against that unmodified incoming chain rather than calling it collision-free. Small self-hand/torso intersections are separately bounded at 0.007 for the petronella region and 0.008 for the star. These are schematic anatomical limitations, not source, timing, actor, or progression substitutions.
