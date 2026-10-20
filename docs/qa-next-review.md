# Independent QA: next-phase editor and Becket/hey extension

Working review, 18 October 2026, 17:38 UTC. This report is separate from the released v0.1 review and its 17-test snapshot. New modules are not retroactively covered by that earlier result.

## Current verdict

The isolated source-equivalent Butter compiler passes the whole-dance topology and motion checks below. The structured editor passes independent schema/provenance checks and all 20 supplementary editor/storage regressions after fixes. No release-blocking editor defect remains in this tested scope. Actual browser rendering/playback remains unverified. Registered source import, runtime equivalence and the new UI/archive workflow pass. The implausible-duration regression is rejected explicitly. Full browser rendering remains an unverified acceptance gate; this review does not claim the expanded encyclopedic request is complete.

## Evidence checked independently

### Source and topology

Primary source facts and independently derived stable-ID checkpoints are kept in `qa/next-independent/source-oracles.md`, separate from implementation. Original Caller’s Box JSON fixtures reside in `qa/next-coverage/`.

- Becket shift/boundary model: 39,578 sampled frames across every 2–12-couple line and full 2N circulation. Every couple meets every other couple, stable partner distance and identities are preserved, and the set returns without drift. Relationship epoch changes at the timed two-beat shift; end couples cross the same end rather than wrapping top to bottom.
- Odd counts explicitly use one extra west-side end couple ready to enter. This is an initialization convention and should stay visible.
- Relation-aware neighbor-chain trajectories agree with the released source-based chain to approximately 2e-14 position/yaw error after the existing entry-facing blend. Partner chains now bind explicit recipients rather than choosing a nearby person.
- Four source hey variants were checked against literal independent stable-pair oracles: Butter’s seven-event full hey, Hay A2’s three-event half hey, Hay B2’s final partial neighbor-left pass, and Centrifugal Hey’s side-first eight-event full hey. Named order, shoulder sign, no extra longitudinal crossings, no invented hands and analytic derivatives pass.
- Partial heys still require an explicit continuation. Hay B2’s final partial gate is not promoted to a completed slot exchange, and whole Hay playback is not approved by these isolated tests.

### Butter composition

- First 32 beats: 17,600 frames across 2–12 couples. Each active dancer returns exactly to their post-shift Becket slot after circle, neighbor swing, long lines and partner chain. Minimum sampled torso-center gap 0.5112 model units; no conflicting hand assignments or figure-boundary position/yaw jumps.
- Whole 64 beats: 78,848 frames across every 2–12-couple line through each full 2N circulation, with 5,720 named hey-pair/physical shoulder checks. Stable IDs, correct post-shift neighbor epochs, exactly seven source hey events, 64 total beats, exact finite-set repeat closure and no hand conflicts passed. Minimum sampled torso-center gap 0.5141 units. After the flattened, C2 opening-shift profile, maximum sampled root speed is 1.2229 units/beat. Largest epsilon-boundary position/angular delta is 3.67e-7, consistent with continuous motion. The earlier cubic-shift snapshot peaked near 1.35 and is superseded by this rerun.
- The integrated Butter hey uses 2 entrance +12 named-pass +2 exit beats within the original 16-beat B1. It does not append transition beats. Independent dense measurement on the current geometry finds minimum clearance 0.66 and maximum speed about 0.886 units/beat.
- Finite-difference acceleration deltas at transition/pass joins shrink by approximately 10× per decade of epsilon, supporting continuity. An earlier fixed threshold failure under higher third derivatives was distinguished from a true fixed jump.

These are geometric samples and source semantics, not a guarantee of collision-free articulated bodies between samples or accurate human footwork.

### Registered runtime and source import

- Actual official JSON import is now enabled by default and preserves all eight original clauses. An explicit capability disable still rejects it. Catalog and imported semantics match exactly, independent of ID/title.
- 19,712 runtime frames across all 2–12-couple sizes match imported/catalog position and heading exactly. Each full 2N finite-set cache period is identical, including contacts; epsilon-boundary maximum position/angular delta is 3.67e-7.
- Required strong holds retain the correct stable receiver: 11,440 swing pair checks, 5,720 courtesy pair checks, and 770 hey samples with no hand contact passed across full 2–12-couple circulation. These check missing contacts as well as surviving-contact correctness.
- Relationship epochs change exactly at beat 2. Every active dancer has one opposite-role nonpartner neighbor; waiting couples have none. Huge seeks through MAX_SAFE_INTEGER remain bounded (under 1 ms for four sampled seeks in each local run).
- Sixteen malformed or unsupported source variants reject losslessly, including CCW/missing circulation, extra progression, wrong receiving relation, unresolved notes, partial/qualified/future-neighbor hey, restricted permission and changed exit.
- Seven malformed semantic field-type probes reject, including non-string calling instructions, formation detail, mixer/virtual flags, status and permission.
- Current build/typecheck pass. App suite: 52/52. Isolated next suite: 29/29. These suites share some moved/facade modules and must not be summed as unique coverage. Independent editor API: 9/9; baseline DOM: 22/22; editor DOM: 16/16; independent supplementary editor/storage: 20/20; set-size DOM: 6/6; registered Butter workflow: 8/8. These are new snapshots, not retroactive expansion of v0.1 coverage.

### Embodied and camera evidence

The reviewer independently inspected actual-mesh software projections for Butter’s hey entrance, central pass gate, and Becket shift. Compact arms read as deliberate no-hand passing, and individual figures remain distinguishable. Hands remain schematic mitten shapes; close-view legs overlap in projection, so articulated clearance metrics matter. These depth-buffered diagnostic images are not browser screenshots. Their chosen close cameras crop edge figures and do not establish live camera framing.

Live scene camera fitting and full articulated-body results are in the separate body review. Independent temporal-bound checks cover all three dances at every 2–12-couple size: first-two-repeat root extents contain the complete finite-circulation extents within 2.7e-14 numerical error. The earlier separate-helper concern is resolved: live scene now imports the shared choreographyBounds and fitPerspectiveCamera, and its wrapper delegates to the tested helper. Browser WebGL, native interaction, live mobile layout and GPU performance remain unverified.

### Butter workflow after registration

Eight independent checks use the actual UI module with the actual formation compiler in Happy DOM. Library selection, source B1 seek at beat 32, exact original text, disabled lossy Becket editing, actual downloaded archive, default-parser reimport, source-only persistence/reopening and set-size state reset pass. Forged executable fields in the v1 envelope are ignored; motion is reconstructed from source and exactly matches the catalog. Saved bytes remain unchanged when resizing the set.

### Editor and provenance

Independent API tests pass baseline draft reconstruction, immutable original source, separate unverified interpretation identity, stable revision identity, no aliasing, exact v2 export/import, v1 source-only reparse, strict semantic fields, unsupported version/revision rejection, size limits and invalid provenance URL rejection.

A reproduced data-loss case involving uncommitted typing followed by Close/Keep editing is fixed and independently retested. Focused supplementary review also passed undo/redo branching, the 100-snapshot history limit, 30 repeated editor reopen cycles, pending invalid Apply, deep cloning, malformed storage, startup future-version preservation, stale archive collisions, sequential stale-app saves, detected read/write interference, unknown envelope metadata and quota failure handling. The full supplementary result is 20/20 tests passed; optimistic storage comparison is not an atomic cross-tab transaction. These use Happy DOM and actual source modules; they do not prove native browser activation or layout.

## Findings and status

| ID | Severity | Finding | Current status |
|---|---|---|---|
| NEXT-01 | P1 | Typing without blur, requesting close and choosing Keep editing restored old text. | Fixed; independent reproducer now retains exact typed text. |
| NEXT-02 | P2 | v2 provenance allowed javascript/malformed/credential-bearing source URLs. | Fixed at import boundary; independent schema regression passes. No actual script execution was demonstrated. |
| NEXT-03 | P1 integration gate | Becket accepted NaN dimensions; chain accepted contradictory reciprocal relations and arky role order. | Strict validators added; all independent topology rejection tests now pass. |
| NEXT-04 | P1 integration gate | Hey entry accepted nonfinite positions and position-only input while claiming no entry adapter needed. | Fixed; finite velocity and heading are required for a complete entry-state match. |
| NEXT-05 | P1 robustness | Explicit exit sampling work grew without a duration bound, allowing enormous finite durations to hang. | Supported duration capped at 64 beats. Huge-duration tests reject before sampling. |
| NEXT-06 | P1 integration gate | Section compiler accepted zero-duration figures and missing direction/amount parameters. | Fixed; independent rerun rejects zero/nonfinite/negative timing and missing direction/amount. |
| NEXT-07 | P1 data loss | Importing an older same-ID v2 archive silently overwrote revision 7 with revision 1; same-ID conflicting provenance also replaced it. | Fixed; independent identity-collision regression passes without losing either record. |
| NEXT-08 | P1 data loss | Sequential saves from independent stale app snapshots overwrote newly saved records and future-schema records added after startup. | Fixed; independent stale-snapshot and prewrite-mutation regressions pass. This does not prove simultaneous atomic multi-tab transactions. |
| NEXT-09 | P2 measurement integrity | Integrated-hey extrema initially excluded the central path and reported only transition maxima/requested clearance. | Fixed; dense independent maximum .8856984 agrees with reported .8856983; minimum .66 agrees exactly. |
| NEXT-11 | P2 timing | A 0.001-beat shift plus 7.999-beat circle preserves phrase totals and is accepted at about 2700 model units/beat with no timing warning. | Fixed; independent .001/.01/.1/.25/.5/1-beat shift cases reject explicitly. Validator now checks duration-normalized motion speed separately from fixed-beat scans. |
| NEXT-10 | P2 continuity | A near-zero velocity fallback used end yaw for tiny positive entrance times: reproducible 90° flip at 1e-12–1e-8 beat. | Fixed; independent 1e-12–1e-7-beat probe converges to the starting heading. Ordinary-rate embodied heading still needs review. |

Supplementary editor review also reproduced loss of accepted unknown v2 envelope annotations on rewrite, stale programmatic dance changes behind an open editor, and maximum-safe revision overflow. These are fixed and independently retested; annotations survive, stale sessions are refused, and exhausted revision Apply is disabled. See `qa/next-independent/editor-extra/review.md` for precise scope/severity.

## Scope beyond this milestone

The expanded request for encyclopedic figures/progressions is unfinished. See `qa-architecture-review.md` for hard limits and the new semantic-kernel review, and `qa/next-independent/expanded-coverage-results.json` for the 15-record challenge sample. Zero of those additional records is playable today; safe refusal is not capability completion.

## Reproduction

Independent harnesses are under `qa/next-independent/`:

- `check-editor-schema.mjs`, `check-editor-pending.mjs`
- `check-topology.ts`, `check-butter-section.ts`, `check-butter-complete.ts`
- `check-hey.ts`, `check-integrated-hey.ts`, `probe-transition-yaw.ts`
- `check-runtime-import.ts`, `check-runtime-holds.ts`, `check-butter-workflow.mjs`, `probe-timing.ts`, `probe-semantic-field-types.ts`
- `check-camera-period-bounds.ts`; broader coverage and architecture are reviewed separately
- `editor-extra/check-editor-extra.mjs`

TypeScript harnesses run with `node --experimental-strip-types`; `.mjs` tests run with ordinary Node and the existing isolated QA dependencies. Their JSON result files are beside the scripts. The tested implementation source hashes are captured in `qa/next-independent/implementation-sha256.txt`; this working tree may continue to evolve after the snapshot. Author unit suites are separately run with `node --experimental-strip-types --test next/*.test.ts`; app tests/build remain separate.

Do not infer production registration, source-equivalent import, browser layout, camera framing, audio, long-running memory/performance, or complete human movement quality from these standalone passes.
