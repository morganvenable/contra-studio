# Reviewed whole-set bicycle-chain promenade: Ben’s Brilliance

Status: **registered scoped prototype support**. The actual-source importer/archive, all finite-set periods, production body routes and independent source/body review pass. `wholeSetOvalPromenades` is enabled for the exact consumed composition. An explicit capability withdrawal still blocks it. The whole-line/waiting geometry and closing-marker scope remain reviewed simulation conventions. No existing dance gains a generic end toggle.

## Evidence and limits

[Ben’s Brilliance, Tony Parkes, ContraDB 2373](https://contradb.com/dances/2373) retains a bicycle-chain hook, neighbor swing with robins inside, a 6-count along-line promenade, 4-count couple turn putting larks inside, and 6-count return. Its raw progression glyph is on the RLT row, followed by an unmarked chain. The retained snapshot is `contradb:2373:8484ab5ffaf95417` in `test-data/contradb/2373.json`. The snapshot is a transcription; the printed reference to *Son of Shadrack*, page 16, has not been corroborated with primary full text.

[American Country Dances On-Line](https://www.quiteapair.us/calling/ACDOL.html) provides author-permission examples of the practice: Gene Hubert’s *Martha’s Choice* explicitly wraps an along-line neighbor promenade around the ends; George Walker’s *Anticipation* and Carol Ormand’s *Unexpected Pleasure #2* specify bicycle-chain handling for along-line heys. These establish figure-specific physical end arcs, not a universal waiting rule or the details of Parkes’s dance.

No currently registered dance supplies this global travel contract. Adding it to an unrelated dance would change the dance.

## Explicit reviewed simulation convention

`OvalSourceDance.ovalPolicy` uses the shared typed policy, with separately typed figure route and hold discriminators. Its evidence must say `reviewed-interpretation` and match the dance source URL plus the supplied immutable record snapshot identity. The 2373 regression retains its exact snapshot; the runtime admits consumed semantics rather than a hard-coded title, URL or ID. No author-explicit claim is made for these selections:

- One clockwise whole-set oval, 1.2-unit cap radius, .34-unit pair radius, 1.8-unit rank spacing, 2.8-unit outbound travel.
- Current neighbors promenade while active. Waiting dancers participate with their own persistent partner. Partners are never renamed neighbors.
- Inside-hand hold, not the existing skaters hold.
- Source phases remain exactly 6 + 4 + 6. The couple turn is leftward. The last return count releases the hold and turns active actors across. Waiting partners retain the returning tangent.
- Neighbor-swing tangent exit uses its last 2.5 counts. Waiting couples use 8 counts for their same-end exchange, 8 for entry to the oval, and 8 for return from it.
- Larks complete the full left allemande 1½ in the first 6 of its 8 counts; the final 2 prepare the partner-swing frame using a radius-preserving partner pivot with an .08-unit smooth radial bow. No swing counts are borrowed.
- The raw RLT glyph remains in the source archive. The selected runtime interpretation scopes it to the closing phrase, with new-neighbor binding only after the chain endpoint at count 64. This interpretation is not externally corroborated author wording.

The importer exposes and retains these choices separately from the raw source. `interpretation.wholeSetOval` records the route/hold/geometry/timing convention; the RLT row separately records `closingPhraseProgression: after-following-chain` and its conventional partner courtesy; the final chain row records the neighbor receiver. Source review/editor controls expose these choices. `src/contradb-oval.test.ts` verifies all nine raw rows, exact compound-row linkage, archive replay and withdrawal of each required choice. Durable motion/body gates obtain the dance through this actual-source importer, then use public choreography dispatch with the staged capability explicitly enabled.

## Physical and identity contract

`src/global-promenade.ts` parameterizes a continuous stadium track by arclength. Its modulo join is at the same physical north-cap endpoint. There is no coordinate wrap from top to bottom. Pairs partition every dancer, use an explicit reciprocal relation and epoch, and must enter at exact physical positions and tangents. The center path reverses on return; named pairs do not change.

`src/global-promenade-source.ts` composes the exact source rhythm and changes the finite-set binding only at a physically verified endpoint. Waiting partners finish on the same physical end row with reversed direction. Discovered periods are 2N repeats for every tested 2–12-couple set, including the 2-couple all-wait repeat. The compiler verifies closure; it does not synthesize a reset.

For one minor set, corner order is west-top, east-top, east-bottom, west-bottom. The independent expected actor order is:

- Count 0: `[1,0,3,2]`
- Count 48, after partner swing: `[0,3,2,1]`
- Count 56, after RLT: `[2,1,0,3]`
- Count 64, after chain: `[2,3,0,1]`

Neighbors remain `[0,3]` and `[1,2]` until count 64 under the selected scope.

## Validation and remaining integration gates

Evidence paths beginning with `qa/` are relative to the repository root (`contra`), not the `app` directory.

Run with installed local tools:

```
node --experimental-strip-types --test src/global-promenade.test.ts src/global-promenade-source.test.ts src/global-promenade-body.test.ts src/global-promenade-staging.test.ts
./node_modules/.bin/tsc --noEmit
```

The 2–12-couple root suite covers all full periods, every pair of couples meeting, stable participants, exclusive hand occupancy, all source/subphase boundary joins, same-end waiting returns, exact source corners, mutation ownership and backward seeks. The accepted source full-period root minimum is 0.514103048 and maximum sampled speed is 1.222883140 units/count. The source-owned partner preparation keeps its pair gap at least .62. The full sweep also verifies actual contact relationships: active neighbors, waiting persistent partners, same-minor-set larks, and persistent partner preparation/swing. The global primitive independently checks 120 samples/count.

The isolated body candidate remains `src/oval-scene-candidate.ts` for review. Only its typed oval predicates, low free-arm target/pole and source-owned central-ingress cue were merged into `scene.ts`; the older candidate was not copied wholesale. New inside-hand preparation and optional swing preparation have explicit route discriminators. A paired regression compares ordinary registered skaters output against the frozen pre-oval production Avatar byte-for-byte. The landed narrow patch is retained in `qa/bicycle-chain-scene-landed.patch`.

Full-period 2- and 3-couple Avatar tests show exact beat cadence, fixed segment lengths, zero foot-reach clamps, exact full-strength wrists and continuous articulated boundaries. New oval travel has positive sampled other-body clearance. The end transfers have positive other-body clearance; their shallow neutral hand/self-torso residual is about −.00133, within the existing .008 probe tolerance and reported rather than hidden.

The source-owned allemande-to-swing ingress now reuses the approved central-turn outside-arm route. A straight-line gathering experiment shrank the partner gap and introduced new arm intersections; it was rejected. The accepted production route preserves radius through its two-count partner pivot and retains the exact target and musical boundary.

The stricter source2604 mesh categories at 80 samples/count through the whole count32–40 interval pass for 2 and 6 couples:

- Root gap at least .62; leg mesh clearance .0286931; unrelated arm clearance .0165223.
- Unassociated torso clearance .2099865; exact head clearance .0345709.
- Zero foot reach clamps; maximum fully held wrist error below 4.7e-16.
- Supporting-forearm/recipient-torso overlap −.1249182 and self-elbow/torso overlap −.0380671 are exactly the existing settled-frame baselines, not new transient intersections.
- Intended supporting-arm edge overlap is −.0540406, versus −.0328389 settled. The .0212018 difference remains inside the unchanged .0215 envelope already used for reviewed gyre/give-and-take transitions. No unrelated arm pair is assigned to that allowance.
- Free-hand/self-torso residual is −.0073878, inside the existing .008 styling bound.

The incoming neighbor swing uses the existing moving DSD-to-swing connection: 1.12 counts of gathering, then orbit, with full grip at 1.6 counts. These are part of its eight source counts and are explicitly tested. Its durable upper-arm release probe now covers the entire new 2.5-count tangent exit (13.5–16), at .001 normalized phase over six couples with a 2.1-unit broadphase, and is strictly positive (.0911689), compared with the earlier registered compact-swing release allowance. The inherited closed swing itself is not described as collision-free.

The earlier failed oval ingress reached −.1657196 upper-arm/other-torso penetration, beyond the −.1249182 inherited baseline. That experiment is rejected, not relabeled as inherited. The current source-owned central cue and radius-preserving pivot remove that new crossing without changing identities or counts.

The independent whole-oval mesh audit clears counts 16–32 for three couples in both end-parity classes and six couples, at 20 samples/count with 2.1-unit broadphase and whole-hand/exact head geometry. Its minima are leg+.10847, unrelated-arm+.06824, other-torso+.09214, head/hair≥.11775 and own forearm/hand torso+.00519. Evidence: `qa/next-independent/oval-independent-mesh-results.json`. This is distinct from the preceding tangent exit and following allemande ingress.

The actual imported source passes 17 focused primitive/source/production-body tests with 0 TODO (`qa/bicycle-chain-imported-production.log`). Its independently authored seven-figure reference produces identical roots, contacts and topology through full periods for 2, 3 and 6 couples (`qa/bicycle-chain-import-parity.log`). Actual source/archive coverage passes 3 tests (`qa/bicycle-chain-actual-source.log`). After the independent Rory/pass route landings, the current production mesh matrices and gait remain byte-identical to the frozen reviewed oval candidate for 2, 3 and 6 couples across both end parities; the registered skaters regression also remains exact (`qa/bicycle-chain-final-scene-parity.log`).

Independent actual-source/archive/finite review passes 4/4 (`qa/next-independent/contradb-2373-independent-results.json`). The expanded 2.1-unit tangent-window audit gives unrelated arms +.04248, legs +.02643 and exact head +.03460. Supporting-forearm/recipient-torso depth is .14727, below the reviewed ordinary compact-promenade release baseline .14907. Own-forearm depth is .02114 versus .02002 in that baseline, a disclosed .00112-unit increase. The reviewer clears this scoped prototype while retaining that styling limitation; it is not a collision-free claim. The source-owned count32–40 integration remains within the unchanged shared support-frame envelope. Evidence: `qa/next-independent/2373-transitions-independent-mesh-results.json`.

The separate capability is now registered, and the default source-review/archive workflow has passed its choice-withdrawal and replay checks. The authoritative aggregate and release capture remain the release owner's responsibility. No collision-free whole-dance claim follows from these focused probes.


## Room, stage and camera integration

`src/global-promenade-staging.test.ts` verifies every set size from 2 through 12 against the existing bounds-driven room staging. It samples the complete finite period at four samples/count for the conservative performer envelope, and both spatial/end parities at two samples/count for actual articulated meshes and the animated band. The music-end stage/band stays at least .61 units beyond the full-period performer envelope and .85 units beyond the actual mesh envelope. No dancer traverses the stage, and no special fixed stage offset was added.

Perspective, overhead and side room presets are checked at six aspect ratios from .4 to 2.4. Full-period dancer, actual body and animated band bounds stay inside the camera frustum; maximum projected horizontal/vertical extent is .909091. The dancer-follow camera is intentionally not a full-room preset. Evidence: `qa/bicycle-chain-room-staging.log`.
