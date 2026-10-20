# Ordinary partner half poussette and Yoyo's Ma

Status: scoped reviewed and registered by default. Exact source/archive, all 2–12-couple finite periods, actual-body checks and independent default choice-withdrawal/replay workflows have passed. Explicit capability overrides still reject the family when disabled. No six-count variant is claimed.

## Retained evidence

- Susan Petrick, *Yoyo's Ma*, ContraDB #2226: https://contradb.com/dances/2226. Exact retained HTML is `test-data/contradb/2226.json`.
- First row: “half poussette - gentlespoons pull partners back then left”, eight source counts. Final four-count row specifies partner California twirl, then joining two hands, and a progression marker. The intervening chain, half hey and partner balance/swing retain their original participants and counts.
- The Caller's Box glossary, Poussette and Draw poussette: https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#Poussette, checked 2026-10-18. Ordinary poussette uses a two-hand hold while paired centers orbit, with the individuals' room-facing held constant. The separately named draw variant rotates the hold. This implementation consumes only the ordinary contract.
- Susan Petrick's *Cupid's Clout*, #776, is separately retained. Its six-count poussettes and later hey qualifier are not admitted by the eight-count adapter.

## Source facts and visible choices

Source facts are the partner relation, lark pulling role, back-then-left direction, half extent, eight total counts, following current-neighbor swing, final four-count partner twirl, two-hand join and terminal progression.

Reviewed modeling choices are explicit and archived: reachable 1.04-wide facing-partner opening hold; ordinary fixed-room orientation; six counts for the couple-center half orbit and two counts for releasing/approaching the named neighbor swing; a three-count complete California half-twirl plus one count to compact, face the same partner and join both hands. Neither preparation adds musical counts.

The finite-end interpretation is independently retained: lark-left reentry; waiting partners start with both hands joined, release after the first four counts, exchange over the next eight counts, then prepare and reacquire the partner hold in the final four source counts. There is no across-hall wrap and no selection of new neighbors by proximity.

## Independent named-corner oracle

IDs are 0=L1, 1=R1, 2=L2, 3=R2. Corners are northwest, northeast, southeast, southwest.

| Source boundary | Corner order |
| --- | --- |
| Opening partner hold | 1, 0, 3, 2 |
| Half poussette / neighbor swing, counts 6–16 | 2, 3, 0, 1 |
| Partner chain, count 24 | 2, 1, 0, 3 |
| Partner half hey / balance / swing, counts 32–48 | 0, 3, 2, 1 |
| Circle left three places / ring, counts 56–60 | 3, 2, 1, 0 |
| Partner twirl and two-hand join, count 64 | 2, 3, 0, 1 |

The half-hey pass layers are WR; NL; MR; PL. Lark 0 initially faces west, backs east and moves south on their left. Lark 2 does the opposite. Ordinary half poussette changes each partner couple's row without swapping partners' across-set sides or rotating either individual during the held orbit.

## Implementation boundaries

- `partner-half-poussette.ts`: explicit identities, reciprocal partner/neighbor epoch, immutable received entry/exit constraints, fixed-facing orbit, opposite-hand partner contacts and an eight-count budget.
- `partner-half-poussette-adapter.ts`: strictly consumed source fields, declared immediate neighbor swing, exact prepared-circle endpoint and body preparation.
- `poussette-twirl-adapter.ts`: source-qualified terminal tail; reuses the actual California path with its opposite individual winding, then moves continuously to explicit named next-hold targets. The ordinary twirl adapter remains distinct.
- `poussette-source-sequence.ts`: real finite directed couple slots, explicit waits, discovered logical period and independently checked physical closure. Rebinding happens only after all named actors arrive.

## Verification scope

Probe implementations live in `test-data/partner-half-poussette/` and are now explicitly promoted through `src/poussette-contract.test.ts` and `src/poussette-mesh.test.ts`. `src/poussette-twirl-body.test.ts` additionally freezes the ordinary California-body baseline and checks the qualified articulation. They cover entry and exit maps, fixed heading, real push/pull directions, full-strength two-hand identities, opaque IDs, frame rotations, option ownership, negative contracts, source-time joins and public capability rejection.

The independent corner oracle and continuous position/yaw boundaries pass through the public choreography route for every set size from two through twelve couples and the complete finite progression cycle. Complete source gait/contact probes include active and waiting repeats. Body probes use the actual `Avatar`, unscaled limbs, all neighboring minor sets, real contact anchors, arm/head and leg meshes, and unassociated-body checks. These dense sampled regressions are not a continuous swept-volume collision certificate.

Known inherited swing-frame residuals are measured separately from new-figure clearances. The poussette-to-swing ingress does not deepen the inherited supporting-arm/torso baseline; its support-arm transient must remain inside the previously reviewed 0.055-unit envelope. No new leg reach correction is allowed. Source balance contact reach is tracked separately and is not silently included in a new-figure success claim.

## Historical pre-repair handoff at 2026-10-18 22:11 UTC

At this earlier handoff, both capability flags were unregistered and the qualified terminal body gate was still open. The repair and final registration below supersede that status; these details preserve the measured failure and its resolution.

Passing checks:

- `./node_modules/.bin/tsc --noEmit`
- `node --experimental-strip-types --test test-data/partner-half-poussette/primitive.probe.ts`: five primitive/adapter tests
- `node --experimental-strip-types --test test-data/partner-half-poussette/source-import.probe.ts`: two exact source/archive and negative-interpretation tests
- `node --experimental-strip-types --test test-data/partner-half-poussette/sequence.probe.ts`: independent corners, public complete finite cycles for 2–12 couples, explicit capability/policy negatives, and truthful waiting-hold/reentry cues
- New half-poussette Avatar ingress: zero new leg reach correction; exact full-strength wrist targets; positive sampled leg, head, unassociated-torso and noncontact-arm clearance. Delaying swing body preparation until the last source count avoids deepening the inherited supporting-forearm/torso penetration. The final six-couple probe remains available in `avatar.probe.ts` for the final audit.

Pre-repair body findings:

- `twirl-avatar.probe.ts`: the qualified three-plus-one twirl has a held forearm/head intersection (approximately 0.0343 units at local source beat 61.2375), despite clear root/leg paths. At equal physical twirl phase, ordinary and qualified paths have identical roots, headings and contacts. The faster source-budget path changes gait pelvis lowering, so the actual raised-arm route needs its own qualified repair. The dedicated body worker owns this and must preserve ordinary four-count twirls.
- `source-avatar.probe.ts`: all figures and waiting actors retain one step per beat, fixed limbs and zero leg correction over two complete source repeats. It currently fails a separate inherited partner-balance wrist mismatch of 0.004145 units at beat 35. That mismatch is not attributed to the poussette or qualified twirl and is not masked by relaxing the new-figure gate.

The runtime warning describes the end exchange as occurring after the first four counts and over the next eight, matching the explicit offset and duration. Both capabilities stayed off until the qualified body repair and independent audit were complete. No dependency installation was required.


## Independently cleared terminal repair, 2026-10-18 22:24 UTC

The scoped terminal repair has landed. Both poussette capabilities are now registered after the independent public/default checks passed. It adds an explicit `three-count-poussette` arm-route cue, a maximum 0.231-unit under-person knee flexion, a smooth maximum 0.120-radian torso incline about the unchanged hip center, raised/releasing elbow routing, and a continuous two-hand offer. These branches are limited to the already validated three-plus-one adapter. They do not alter the ordinary four-count California-twirl adapter or universal contact resolver.

The authored roots, headings, identities, hands, contact points/strengths, and source counts remain exact. Because the under-person ducks farther, the unchanged actual-shoulder reach resolver lowers the shared rendered arch target where necessary; both fixed-length arms meet that one target. The rendered hand height is consequently not claimed to equal the old intersecting pose.

Independent actual-source validation reproduces the positive six-couple sampled clearances, complete arm/leg vertex joins at 60, 63, 63.5, 64 and the following cycle, zero gait correction, and exact held wrists. Ordinary #1450 reproduces its unchanged 641-sample mesh/gait/resolved-contact hash (`8cfb2180376368cbd3b6e27948faaee844b4b0a280a0e053d9cd3d669f1d31b8`). The critic also measured torso/torso clearance 0.05322, head/torso 0.06060 and head/head 0.10564.

The tightest actual own-head margin is 0.0009393 units between a held forearm and a hair mesh at beat 61.4125. A bounded 2,000-samples-per-beat check over 61.25–61.55 and the critic's independent 400-samples-per-count check reproduce that positive minimum. This is a tight sampled margin, not a continuous swept-volume or teaching-safety certificate. Other minima in the full six-couple 80-samples-per-beat ring/twirl window are: exact partner head 0.021346; own forearm/torso 0.002039; other arm/torso 0.010037; noncontact arm 0.009834; leg 0.068312. Exact fully held wrist error is below 1e-15, with unchanged 0.325/0.325 arm and 0.430/0.430 leg lengths.

The promoted test wrappers retain these archive dependencies: `test-data/partner-half-poussette/{primitive,sequence,source-import,avatar,twirl-avatar}.probe.ts`, `fixture.ts`, `source-fixture.ts`, and source snapshots `test-data/contradb/{1450,2226,776}.json`. #776 remains a negative six-count variant. The separate complete-source `source-avatar.probe.ts` diagnostic retains the inherited 0.0041448-unit partner-balance wrist limitation at beat 35; that earlier balance assertion is not folded into or weakened by the new-figure gate.

## Final registered checkpoint, 2026-10-18 22:33 UTC

The landed source/primitive/finite/body/ordinary-California checks passed 26/26, followed by 3/3 actual-retained-source body checks. Independent default review/archive workflows passed, including withdrawal and restoration of the half-poussette, terminal twirl and end-policy choices. The source owner additionally checked all five removable source choices. The final frozen application aggregate passed 569/569 tests, with no skipped tests. The inherited balance wrist limit and tight sampled hair margin above remain disclosed.
