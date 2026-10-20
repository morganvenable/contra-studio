# Ring balance, current-neighbor pass, and finite ring-start compositions

## Retained sources and choices

- [Push the Button, ContraDB 671](https://contradb.com/dances/671) has unknown authorship in the supplied public snapshot. Its eight source rows and 64 counts remain intact: neighbor balance/swing 16, long lines 8, robin chain 8, robin do-si-do 8, partner swing 8, circle left three places 8, ring balance 4, pass through 4 with a progression marker. The archived choices assign four balance counts, the uniquely compatible partner chain receiver, and a current-neighbor right-shoulder pass. The bare pass wording does not itself name that shoulder or relation.
- [Ashokan Hello (var.), ContraDB 2235](https://contradb.com/dances/2235) independently composes the same final circle/ring/pass phrase after handed balances, arches, swings, long lines and a robin allemande. Its source explicitly says to reach new neighbors after the terminal pass. That qualifier does not change the person passed to an unbound future neighbor.
- [The Big Easy, Becky Hill, ContraDB 780](https://contradb.com/dances/780) starts with a genuine four-hand ring balance, then neighbor swing, long lines, robin allemande left 1½, partner balance/swing, circle left three places, ring balance and pass through. All eight rows and 64 counts are retained. The source has no progression glyph or end-effect note. Endpoint-derived progression, the right-shoulder current-neighbor pass, and the eight-count same-end lark-left waiting policy are separate removable archived interpretations.

Original snapshots are in `test-data/contradb/671.json`, `2235.json`, and `780.json`. Successful source recognition, source-derived topology and body-animation fidelity are separate results. No title or record ID selects a trajectory.

## Primitive contract

`ring-pass.ts` owns four named actors, reciprocal current partner/neighbor maps and their epoch, a unit oriented hall frame, an explicit cyclic ring, and immutable physical entry/exit constraints. It reuses `compileRingBalance` to validate the reachable 1.10 m ring and all four named hand edges. Current neighbors must be across the two rows on each sideline. The pass completes those specific row exchanges while retaining each sideline; it cannot select a receiver by proximity.

The passing shoulder is checked against actual body axes at each independently located crossing: the other dancer must lie on the actor's right. The four source counts include ring-hand release, lateral passing lanes, forward travel and outgoing facing. Root derivatives are stationary at the explicit endpoints. The primitive never advances a logical row or changes a relationship map by itself.

The ordinary adapter ends at the exchanged ±0.9 m longways slots. A finite formation owner can instead supply exact next-ring or same-end waiting destinations within the reviewed bounds. Sampled root clearance, walking speed and yaw-rate budgets fail closed. These sampled checks are not continuous collision certificates.

The pass reuses the existing low, close unheld-arm posture used for ordinary heys. Original ring contacts release continuously during the first 0.4 count. There are no invented held hands during the crossing.

## Finite opening-ring composition

`ring-source-sequence.ts` handles an explicit opening ring-to-swing and terminal ring/pass with registered intermediate primitives. It uses the common event-section and directed-couple topology contracts. Before each section is compiled, it computes the exact next binding and per-identity destinations:

- Active next groups receive reachable compact ring corners around their actual next minor-set centers.
- Newly outgoing couples receive their actual physical end row and continue facing outward until their next waiting turn.
- Existing out couples exchange at that same end during beats 4–12, remain still, then physically gather into the next ring during the terminal four counts.

The last pass receives those destinations as constraints. The compiler verifies every actual root and facing before rebinding. It discovers the finite state period and rejects a logical closure which does not match the real endpoint. It does not add counts, reset a formation, wrap a couple between hall ends, or assume a cache period to hide a mismatch.

Future-ring hand acquisition occurs only while the terminal movement actually reaches the named next group's corners. Its contact graph is explicitly derived from the next binding; the old current-neighbor epoch remains current until the boundary. Out couples never receive an invented ring with absent neighbors.

`ring-transition-adapter.ts` retains the ring's inward/outward weight change and all four contacts through beat 3 (the count-four landing), then releases the ring and opens the named sideline pair into the existing swing frame. The root preparation fits the last 1.25 source counts. Frame acquisition waits until the roots/facing are nearly settled and reuses the existing balance-to-swing hand-transfer geometry. The next swing begins at exactly those positions, facings and contacts.

## Independent identity oracle

In NW, NE, SE, SW order, the relevant 671 and 780 states are:

1. Start: `[R1, L1, R2, L2]`
2. Neighbor swing: `[L2, R2, L1, R1]`
3. Partner chain (671) or robin left allemande 1½ (780): `[L2, R1, L1, R2]`
4. Partner swing: same corner order
5. Circle left three places and ring balance: `[R1, L1, R2, L2]`
6. Pass the current neighbors on the sidelines: `[L2, R2, L1, R1]`

This is the source-validated single progression. Persistent partners never change. The choice of robins, rather than larks, in the source allemande matters to this permutation.

## Verification and fidelity limits

The tests cover original source/archive round-trips, removable interpretations and capability gates, immutable public contracts, rigid transformations and opaque IDs, literal shoulder signs and endpoints, 2–12-couple complete finite periods, every couple encounter, continuous joins, still waiting intervals, actual fixed-length Avatar limbs and one physical step per musical beat. New ring/pass intervals have zero foot-reach correction in the checked source sequences. Full-strength ring wrist targets are reached to numerical precision.

The terminal ring/pass mesh sweeps check unassociated arms, legs, torsos and head envelopes, including mixed next-ring/end destinations. The reused close-pass arm posture retains a small self-forearm/torso residual, bounded separately at 25 mm in the regression tests; it is not called anatomical separation.

The source 671/2235 terminal pass and the separate source 780 opening-ring composition have independent source, finite-topology, endpoint-identity, stepping and sampled-mesh clearance. The opening-ring arm route is carried by an explicit `BalanceCue.handRoute` emitted only for a ring-to-swing exit. Released hands wait beside their own torsos instead of using the paired-balance forward offer; frame acquisition reuses the explicit free-hand ingress route. Roots, counts, balance weight and contact timing are unchanged. Existing 1450/2040/810 wrist and elbow boundaries remain exactly unchanged per joint.

The independent 780 ingress probe finds 18.8 mm sampled separation between unassociated arms, 30.1 mm from the exact head mesh and 44.0 mm between legs; a separately bounded own-shirt residual is about 4.4 mm. These separate categories prevent the inherited supporting-torso overlap from hiding a new free-arm crossing. Actual wrist/elbow joins are numerical throughout the checked complete three- and six-couple periods. The original 53 mm free-right-arm crossing is covered by its own regression.

Important inherited limitations remain visible:

- 671's existing same-role do-si-do reaches approximately 56 mm of foot-reach correction. That is outside the new terminal pass and is not silently repaired by changing its source counts.
- 780's reused left allemande has approximately 15.5 mm of foot correction; its long-lines transition has less than 1 mm in the checked complete round.
- The existing closed-swing frame has substantial leading/supporting forearm overlap with the paired torso in the current coarse body model: about 125 mm at the settled frame and about 150–160 mm in a paired-balance ingress. This is not a small anatomical artifact. The new ring ingress is compared against that unchanged baseline and must not materially worsen it. A passing topology test does not resolve that shared swing-frame limitation.

All body checks are offline sampled procedural-mesh diagnostics, not a browser-GPU, continuous-contact, biomechanical or teaching-safety certificate. Broad arbitrary opening rings, alternate passing shoulders, two-count passes, different end policies, and unregistered middle figures remain unsupported.
