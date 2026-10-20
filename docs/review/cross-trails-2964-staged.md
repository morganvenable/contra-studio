# Pure Ingredients: ordered cross-trails passage

Status: locally enabled after source/archive, primitive/API, all 2–12-couple finite-period, dense body and independent review pass. The registered default `crossTrails` capability is on; explicitly disabling it still blocks source activation. This is not a deployment claim.

## Source and interpretations

The retained public ContraDB record [2964, Pure Ingredients](https://contradb.com/dances/2964) credits Yoyo Zhou and specifies improper formation. Its seven source rows are:

1. A1, 8: circle left four places
2. A1, 8: neighbors do-si-do once
3. A2, 16: neighbors balance and swing
4. B1, 8: larks allemande left one and a half
5. B1, 8: partners swing
6. B2, 8: robins chain to neighbors
7. B2, 8: cross trails, partners across the set by right shoulders, then neighbors along the set by left shoulders; terminal progression glyph

The original retained page uses the role labels “gentlespoons” and “ladles.” The original source remains in `test-data/contradb/2964.json`; neither its wording nor its counts are rewritten. The sixteen-count balance/swing is reviewed as four plus twelve, and the eight-count cross trails as four plus four. The latter is a removable internal allocation, not two separately counted source rows or an extra transition.

## Independent identities and corners

Use north as negative hall z, with the music end at the top. Corner order is northwest, northeast, southeast, southwest. The seed actor order is `[1,0,3,2]`; persistent partners are `(0,1)` and `(2,3)`, and current neighbors are `(0,3)` and `(1,2)`.

- Beat 56, after the neighbor chain: `[0,1,2,3]`
- Beat 58: partners `(0,1)` and `(2,3)` cross across the set with right shoulders
- Beat 60: `[1,0,3,2]`
- Beat 62: current neighbors `(0,3)` and `(1,2)` cross along the set with left shoulders
- Beat 64: `[2,3,0,1]`, the exact named one-place improper progression

The second passage consumes the same bound neighbor epoch as the first. A gate requires both longitudinal sign reversal and the correct signed shoulder projection, independently for both actors. Rebinding cannot move roots or stand in for either crossing.

## Primitive

`src/cross-trails.ts` owns four opaque actor identities, their current reciprocal partner and neighbor maps, two explicit passage records, the hall frame, and all endpoints. It accepts only the currently reviewed partner/across/right then neighbor/along/left order, with eight counts and a four-plus-four allocation. Incorrect shoulders, axes, relationships, counts, endpoint permutations, facing, extra passage modifiers, stale epochs and mutable input changes are covered by negative tests.

Each passage occupies a separate smooth parallel lane; a counted quarter-turn is completed during the final 1.5 counts of the first passage. Endpoints and the internal corner have zero root velocity, without adding time. The bounded paths support translated/rotated hall frames and unrelated opaque actor IDs. There are no hand contacts during cross trails.

At standard spacing the standalone sampled root certificate has minimum clearance 0.88, maximum speed 0.686863 units/count and maximum yaw rate 1.963496 radians/count. These are sampled diagnostics, not a continuous collision proof or biomechanical teaching certificate.

## Source and finite-set verification

`src/cross-trails-source.test.ts` exercises the actual retained source through the public preparation/import/archive path. Source choices are removable and archive restoration retains every original source field. Fresh source mutations that remove, duplicate or move the progression marker, reverse the named actors or shoulders, or append a swing receive different snapshot identities and remain unexecutable. Renaming the dance and changing attribution do not change motion admission; it is not title/author/record-ID keyed.

For every set size from two through twelve couples, an independent directed-rank oracle checks every physical source boundary through the complete `2N` period. It validates the actual left limit of the last repeat before a cache wrap can conceal drift. Both named shoulder crossings, corners 56/60/64, stationary waiting after the same-end exchange, unchanged persistent partners, actual encounters with every other couple, and continuous roots/facings hold. Existing ordinary improper end choreography is reused unchanged; no additional end policy or source counts are fabricated.

## Actual body evidence and limits

The actual public-source Avatar test samples two complete repeats at 40 samples/count for three and six couples, plus all new passage landings and arm joins through their finite periods. Every activity has zero leg-reach correction. The body retains one landing per musical count and fixed adult arm and leg lengths. Fully held wrists are within `9.3e-16` units except the separately inherited balance-contact residual, bounded below `0.0042` units.

The generic free-arm stance initially overlapped another upper arm by about `0.0221` units near the first crossing. The source-qualified cross-trails activity now reuses the existing narrow passing-arm route, through one additional disjunct in the scene's passing predicate; prior activities retain the same predicate and posture. The final contact-free actual-source 55.5–65 sweep at 40 samples/count covers all four repeats for two couples, all six repeats for three couples, and two repeats for six couples. Its minimum other-body clearance is `+0.1711006928`, with the inherited self-forearm/shirt residual near `-0.0198172650`. `test-data/cross-trails/body-test-results.log` retains this completed result.

A wider 54.5–55.5 check exposes the existing courtesy-chain release artifact: hand/other-torso penetration near `-0.105565` and self-forearm/shirt penetration near `-0.077260`. It is **not** included in a claim that this entire source is collision-free. A same-time actual-Avatar comparison against the identical parsed source prefix with the next figure omitted proves exact root/contact parity and arm/torso/head matrix agreement within `3.94e-13`; both penetration extrema agree within `5e-16`. The next movement's future foot samples legitimately differ from a truncated prefix that stops at beat 56, so whole-body matrix parity is not claimed. The automated arm/torso parity regression and `test-data/cross-trails/chain-parity-results.json` retain this distinction.

The collision probe in `test-data/cross-trails/mesh-probe.ts` uses actual articulated Avatar meshes, bidirectional vertex checks and a 2.1-unit root broadphase. It separates self-forearm/shirt residuals from other-body results. Hand-contact pairs are excluded only from corresponding paired-arm mesh checks; torso/head checks remain visible. New contact-free crossing/entry/exit clearance and legacy held-courtesy artifacts are reported separately. All collision evidence is offline and sampled, with no GPU or continuous whole-body certificate.

## Independent review evidence

Retained independent review results are in `docs/evidence/cross-trails-2964/`:

- `contradb-2964-independent-results.json`: actual source/archive, independent named corners and both shoulders, all 2–12-couple finite periods, three tests passed
- `2964-direct-contract-results.json`: six direct invalid-option/endpoint/epoch guards rejected, plus ownership verification
- `2964-independent-mesh-results.json`: six couples, 55.5–65 at 20 samples/count, 2.1-unit broadphase and exact head/hair meshes; minimum unrelated-arm margin above 171 mm and exact head margin above 186 mm
- `2964-independent-rig-results.json`: 951 actual-Avatar frames at 100 samples/count, zero new-motion reach correction, full-strength wrist error below `4.58e-16` units and boundary joint epsilon below `1.02e-7` units

Focused automated checks: `src/cross-trails.test.ts` (four primitive/adapter tests), `src/cross-trails-source.test.ts` (two source/finite-period tests), and `src/cross-trails-body.test.ts` (two cadence/collision tests plus the separately passed inherited-chain arm/torso parity test). TypeScript checking and whitespace checking pass. These focused results are not a claim that the entire app aggregate suite has already run after activation.
