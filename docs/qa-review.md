# Contra simulator: independent QA review

Status: independent numerical, parser, and DOM regression completed on the working source at 2026-10-18 16:54 UTC. Browser/WebGL rendering is not verified.

## Verdict

The two published demo sequences now pass the independent topology, identity, finite-line progression, boundary continuity, contact-occupancy, and expected-hold checks described below. Imports are source-preserving and conservatively blocked when unsupported; this is a useful limited study prototype, **not an arbitrary Caller’s Box simulator or a validated dance-teaching system**.

Remaining release gates:

- **P1, unverified rendering and interaction:** no successful real-browser WebGL render, desktop/mobile layout inspection, native keyboard activation test, or sustained browser playback/performance test. Numerical and DOM passes cannot establish these.
- **P1, modeled body motion:** gait, balance transfer, intermediate paths, and styling remain synthetic. Expected hand contacts now exist at tested central phases, but whole-body collision avoidance and biomechanical plausibility are not proven. Dense chain diagnostics still show brisk approach and rotation; inspect at ordinary calling tempo before presenting it as posture instruction.
- **P2, narrow validated coverage:** two whole dances and conservative compositional variants are covered. Becket, proper, double progression, heys, waves/diamonds, shadows, later neighbors, simultaneous clauses, alternatives, and other unsupported forms remain blocked. A successful parse is a study preview, not caller review.

The private deployed candidate inspected earlier predates some fixes. These results apply to the local working source, not automatically to an older deployed build.

## Release gates

1. **Truthfulness gate (P0):** A caller record is not automatically executable choreography. Clearly distinguish fetched, parsed, reviewed, supported, approximated, and blocked. A partial parser must not report arbitrary Caller’s Box support or silently replace an unknown phrase with an idle, generic circle, or stock dance. Preserve source provenance and exact unrecognized text.
2. **Identity and composition gate (P0):** Stable dancer IDs and fixed partner IDs throughout the dance. Each figure starts from the actual preceding state. The complete sequence must end with the stated progression and a formation that can begin the next repetition with appropriate new neighbors.
3. **Temporal gate (P0):** Declared durations sum exactly to the source phrase structure. Standard A1/A2/B1/B2 examples contain 16 beats per phrase and 64 total; nonstandard records must be supported explicitly or rejected, never stretched silently. Simultaneous figures share a time interval; sequential figures consume it.
4. **Continuity gate (P0):** No spatial teleport, identity swap, or state reset at a figure boundary, beat 64, repeat reset, scrub, camera change, or pause/resume. Numerical and visible continuity must agree.
5. **Teaching gate (P1):** Correct people, handedness, amount, turning direction, exit positions and body facing. Arms and handhold cues should agree with the current relation, not merely decorate generic movement.

## Acceptance tests to execute

### Timing and deterministic playback

- Compile the same input twice; sample equal beats in arbitrary order. Positions, facing, IDs and participant relationships match within floating-point tolerance.
- For each boundary b, sample b-epsilon, b, b+epsilon (epsilon 1e-5 beats). Position difference tends to zero as epsilon tends to zero; a fixed jump fails. Check wraparound of orientation with shortest angular distance.
- A dance with 8 figures of 8 beats has boundaries 0,8,16,24,32,40,48,56,64; active figure at an exact boundary must be defined consistently.
- Changing BPM changes only wall-clock mapping, not sample(beat). At 120 beats/min, one 64-beat cycle is 32 seconds; at 90 it is 42.667 seconds.
- Pause/resume, repeated play clicks, drag seek while playing, backward seek, first/last beat, repeat on/off, and dance change during playback do not create multiple animation clocks or stale state.
- Source nonstandard duration, zero/negative duration, a missing beat count, 63/65 totals and nonfinite values yield actionable errors. No silent rounding, padding, or global duration rescaling.

### Dancer identity, formation and progression

- Initial proper, improper and Becket layouts are distinct; Becket direction and reverse/progressed improper are not conflated.
- Partner relation is symmetric and fixed for ordinary contra; all dancer IDs remain unique, and no dancer disappears/reappears as another ID.
- Neighbor is a relationship that can change during a dance, not a fixed nearest dancer. Test same-role neighbors and explicit N0/N2/N3 references independently.
- Compare final dancer-slot permutation against the chosen source’s intended single/double progression. A repeating animation inside the same hands-four is not a progressing contra.
- At least 3 successive cycles with enough couples to expose wrong neighbor reuse; inspect one selected couple’s entire progression history.
- Full finite line: test both ends, initial odd number of couples, waiting out, role-direction reversal and crossing over where required. If an infinite/periodic line is used instead, label that assumption visibly and never claim finite end effects.
- No automatic reassignment of partner/neighbor merely to make a malformed sequence compile. Distinguish unresolved topology from a stylistic animation approximation.

### Representative figure semantics

- Circle left/right: all intended participants, correct signed rotation and fractional amount; four connected people retain ring order.
- Star: stated hand, amount and participants; a star is not visually identical to a circle with decorative lines.
- Allemande: pair identity, hand, signed rotation, amount (1/2, 3/4, 1, 1 1/2), correct exit and no third participant grasping that hand.
- Swing: correct partner/neighbor and role-relative exit facing/position; it does not always return everyone to the starting square. Swings are rotational, not two avatars independently orbiting unrelated centers.
- Dosido versus shoulder round: distinguish maintained facing versus mutual facing; do not reuse identical orientation tracks.
- Ladies/robins chain and right-and-left through: crossing and courtesy-turn phases; correct exchanges and correct role-relative handedness.
- Hey: ordered passing shoulders, amount and explicit participants determine paths; a generic sinusoid is insufficient. A full hey returns the expected original slot permutation, and a half hey does not.
- Petronella: ring balance and specified quarter travel/turn; extra turn and diamond/ring orientation matter.
- Down the hall: people order, direction, turn alone versus turn as couple, and return/bend are different outcomes.
- Progression move: new neighbors actually become available in the next figure; a final caption saying “progress” is not evidence.

### Physical readability and geometry

- Positions, rotations and hand endpoints are finite over all samples. Numerically inspect minimum torso separation; report the unit, radii and threshold used. Sample densely around crossings and endpoints rather than relying on a single screenshot.
- Collision detection must distinguish a valid close swing/hand contact from impossible torso overlap. A 0.1-beat sample is diagnostic, not proof of collision freedom between samples.
- Handhold graph has explicit side per dancer. No single hand holds two unrelated hands unless the figure explicitly requires it; handlines connect plausible limbs, not body centers.
- At connection phases, hand endpoints meet within scale-appropriate tolerance and arm lengths remain physically plausible. Release transitions do not snap over large distances.
- Facing follows intended body motion; backward steps and side steps are permitted. Never force heading to velocity for every figure.
- Selected person, partner and current neighbors remain identifiable in overhead and 3D views. Paths are useful without hiding avatars; hall direction and role key are readable.

### Import, parser and wide workflow

- Load by Caller’s Box URL/ID and by exact JSON fixture where implemented. Title, author, formation, progression, phrase labels, durations, notes and source link remain attributable to the actual record.
- Test a simple fully supported record, an advanced record, a dance with no published choreography, unknown ID, invalid URL, malformed JSON, missing phrases, repeated phrases, and network failure.
- Preserve semantically important syntax: semicolon vs comma, brackets, parentheses, fractional turns, role labels, N0/N2/N3, shadows, alternatives and “while.” Do not drop suffixes after recognizing a familiar word.
- A keyword match to “swing” in “swing through,” or “circle” in a formation note, must not claim support for that movement. Test deliberately ambiguous text.
- A failed import leaves the currently valid dance intact and reports what happened. Cancelling a load, loading twice quickly, refreshing, selecting another demo and retrying do not overwrite newer work with stale responses.
- Editing a phrase must invalidate old compilation/verification. Imported or edited content must not inherit a “verified” badge from a demo.
- Share/save/export round trip preserves structured choreography, exact source, custom edits and assumptions. If a feature is not implemented, UI should say so, not be a decorative control.
- Accessibility: keyboard play/seek and clear focus, button names, no essential color-only distinctions; narrow view no clipped primary actions; empty/loading/error states remain usable.

## Adversarial fixtures

- 8 beats: “Neighbor swing through.” Must not compile as ordinary neighbor swing.
- 8 beats: “Men allemande left 1 1/2 while women orbit clockwise.” Must account for both simultaneous participant groups or block.
- 4 beats: “Women slide right (past W); face next; form diamond.” Multiple state changes cannot be dropped after recognizing “slide.”
- 12 beats: “Hey 3/4 (N3R;WL;PR;ML;N3R;WL).” Explicit pass order matters; a generic full hey is wrong.
- 8 beats: “Partner swing // neighbor swing.” Requires an explicit alternative choice, not arbitrary first match.
- “Duple Minor - Becket, Double, CCW.” Must not reuse single improper progression.
- 8 beats: unknown move. Must be unresolved, not a plausible-looking generic fallback.

## Source checks

Caller’s Box uses compact choreography notation with distinct sequential/simultaneous punctuation, participant labels, and formation variants. Its glossary is the primary reference for interpreting those semantics: https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm

CDSS explains that a contra’s repeated figures include progression to new couples, with different finite-line end behavior across formations. Use this to check that an animation’s state changes actually support the dance’s claimed progression: https://www.cdss.org/elibrary/dart/appendix_a.htm

The Caller’s Box “Goody One Shoe” record is a useful hard negative for any early parser: it is Becket, double progression, CCW, with long waves, diamonds, shadows and later neighbors. It should remain blocked until all those state transitions are modeled: https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=150

## Final regression results

### Independent motion and topology

- Both source demos retain their actual 64-beat timing, including Simplicity Star’s 6-beat circle and 10-beat swing. No synthetic progression segment was appended.
- The Baby Rose landmark permutations at beats 16, 24, 32, 48, 56 and 64 match the separately derived source oracle. Six-couple row orders through four repeats match the independently predicted progression.
- Tested both catalog dances at every line size from 2 through 12 couples, through `2 * couples + 2` repeats at 0.25-beat intervals: **22 configurations, zero identity/numeric/contact-occupancy failures, zero position/yaw jumps at figure/repeat boundaries**, including periodic cache wrap. Maximum endpoint row drift was 3.56e-15 model units; partners stayed on the same row to floating-point tolerance.
- Separate 0.125-beat Baby Rose scan over four repeats: minimum torso-center distance 0.5141 model units, maximum sampled root speed 1.2229 units/beat. These are diagnostic samples, not continuous collision proof or certified physical units.
- Dense 0.01-beat orientation scan and internal branch-point probes find no formerly observed fixed swing-release jump. Maximum remaining sampled yaw rate is 5.8691 radians/beat during the chain approach. At 112 BPM this is roughly 10.96 radians/second, so continuity alone should not be mistaken for natural motion.
- **600 expected-hold checks passed:** for each dance over four repeats, 200 central swing pair/phases retain the joined left/right hands, lark-right-to-robin-back contact and robin-left-to-lark-upper-arm contact; 100 courtesy pair/phases retain left/left plus right/right contacts. This explicitly detects expected holds that would otherwise disappear behind a reach filter.
- Imported exact source JSON and corresponding built-in catalog dances match both position and yaw at all eight tested end/repeat probes. Imports no longer lose the final facing cue merely because they lack a catalog-only flag.
- Deterministic arbitrary scrubbing passed. Very large seek values use bounded periodic state, not billions of cached repeats; nonfinite/negative input is normalized safely.

### Parser, source, and workflow

- Whole-clause adversarial inputs are blocked rather than keyword-truncated: swing-through, simultaneous allemande/orbit, alternatives, later-neighbor partial heys, slide/face/diamond compounds, zero-denominator fractions, half dosido, ring balance, unimplemented pass-through and right-and-left-through.
- Real fixtures #10273 and #939 are accepted as study imports. #150, #2562, #10732, #1, #6953 and #3461 are blocked, with original source retained. Search-only records with no published phrases are not reconstructed.
- Source-invalid timing, formation, progression, phrase order, URL hosts/credentials/ambiguous IDs, and semantically valid syntax with invalid composition are rejected. Calling notes remain visible source notes; they are not silently executed as choreography.
- Independent rerun of the UI author’s actual-module Happy DOM harness: **22/22 passed**. It covers source-preserving preview/load/export/reimport, inert malicious title/author/clause strings, source-only persistence, corrupt storage, quota failure honesty, 500 KB envelope/file limits, stale file-read races, edit invalidation, figure seeking, explicit dancer-camera selection, dialog shortcuts, and focused-button shortcut isolation. It does not emulate native browser layout, focus painting, WebGL, audio permission, or native button activation.
- Production TypeScript/Vite build passed. App test suite passed **17/17** on this snapshot. Build reports a ~596.6 KB minified JavaScript chunk (~158.5 KB gzip); mobile cold-start and runtime performance remain unmeasured.

### Body and visual evidence limits

The body reviewer exercised the actual articulated Three.js avatar rig and generated software projections of its mesh. These are useful diagnostic views of joint/contact geometry, **not live browser screenshots**. The body report owns the detailed arm/leg length, wrist target and stance-foot measurements. Expected-hold coverage was independently added after discovering that a reach filter could hide the most important missing swing/back and courtesy contacts while all remaining contact-error tests passed.

Actual browser inspection was blocked by environment capabilities/access: local Chromium failed to establish its required IPC socket; the official headless-shell download did not produce a valid archive; the supplied cloud browser could reach the private site only as a login page; and its supported navigation rejected local file URLs. No screenshot or browser-rendering pass is claimed from those attempts.

## Resolved defects and reproducible historical evidence

All items below were reported promptly to the responsible author and retested where noted. Keeping the evidence documents why broad “smooth animation” or “all tests pass” claims were insufficient.

| ID | Severity | Defect and reproduction | Resolution/evidence |
|---|---|---|---|
| QA-01 | P1 | Simplicity Star beat 223, IDs 8/9: 10-beat swing exit crossed pair center, torso separation 0.13265. | Angular/radius exit interpolation replaces straight antipodal blend; current dense scans above. |
| QA-02 | P1 | Baby Rose beat 192: reentered couple 1 faced its original up/down direction instead of its new direction. | Current-cycle direction drives final facing; all line sizes and cache wraps pass. |
| QA-03 | P1 | Baby Rose 53.25–54.125: one robin hand targeted by two larks. | Stable chain recipient identity replaces nearest-person pairing; occupancy scan passes. |
| QA-04 | P1 | `Circle left 1/0` and `0/0` became an undefined amount and default whole turn. | Strict fractions rejected; parser adversarial regression passes. |
| QA-05 | P1 | JSON phrase order B1,A2,A1,B2 accepted despite fixed standard timeline. | Noncanonical order rejected. |
| QA-06 | P1 | Half dosido executed as full; ring balance executed as pair balance; pass-through used intersecting paths; incomplete right-and-left-through. | Inadequate adapters quarantined in parser/compiler. |
| QA-07 | P1 | Right star exposed left-hand contacts. | Contact hand now follows source direction; right-star source/rig regression included. |
| QA-08 | P1 | Courtesy refinement briefly reduced center separation to 0.228 and root speed to an implausible 2.92 units/beat. | Receiver anticipation/path rebuilt; current minimum 0.5141 and speed ~1.25 at denser sampling. |
| QA-09 | P1 | Same official source imported vs built-in differed by 135° at final star exit. | Progression/final-facing derived from topology rather than catalog-only flag; eight differential probes now exactly agree. |
| QA-10 | P2 | Duplicate keyboard handlers; Space captured focused buttons; fixed ±8 stepping ignored actual figure boundaries. | One handler owner, interactive/dialog isolation, source-derived figure stepping; DOM checks pass. |
| QA-11 | P2 | Figure loop remained active after switching dances while UI showed it off. | Main state resets loop on load. |
| QA-12 | P2 | Contact dots allocated geometry/material every frame; avatar resources leaked on reload. | Scene owner pooled/disposed resources; sustained browser memory test still pending. |
| QA-13 | P1 | Oversize or stale async file read could preserve an old executable preview; archive wrapper bypassed inner-only limit. | Invalidation/generation guard/outer size cap; asynchronous DOM regressions pass. |
| QA-14 | P2 | Calling notes were retained in data but omitted from useful source UI. | Notes now visible with non-executable interpretation warning. |
| QA-15 | P2 | Dancer camera with “Everyone” silently followed dancer 0. | Explicit first-dancer selection entering Dancer mode; Everyone returns to Perspective. |
| QA-16 | P1 | Baby Rose around beat 110.31398, dancer 11: fixed 0.257-radian internal swing exit yaw jump, missed by figure-boundary tests. | Unwrapped winding through release; dense internal scan now passes. |
| QA-17 | P1 | Courtesy yaw rotated opposite its positional frame; swing inward facing made required back holds unreachable. Reach filter silently removed expected holds. | Correct coupled-frame sign and swing offset; expected-hold harness went from 560 failures to zero across 600 checks. |

## Additional audit observation

The chain motion adapter originally selected the receiving neighbor without reading the requested relation. A 256-case generated composition search found 64 engine-repeatable sequences but zero that passed the complete validator with a partner-chain request; therefore no accepted counterexample was established. The domain author was asked to explicitly constrain or implement that relation, rather than relying on incidental rejection by other checks.

## Reproduction and evidence

Run from the app directory:

```sh
npm test
npm run build
node --experimental-strip-types ../qa/run-motion.ts
node --experimental-strip-types ../qa/run-parser.ts
node --experimental-strip-types ../qa/run-line-sizes.ts
node --experimental-strip-types ../qa/check-internal-boundaries.ts
node --experimental-strip-types ../qa/check-hold-coverage.ts
node --experimental-strip-types ../qa/compare-import.ts
node ../qa/check-ui-dom.mjs
```

The DOM harness uses its isolated QA dependency installation. Generated results are in `qa/motion-results.json`, `parser-results.json`, `line-size-results.json`, `internal-boundary-results.json`, `hold-coverage-results.json`, `import-differential-results.jsonl`, and `ui-dom-results.json`. Independent choreography landmarks are documented in `qa/baby-rose-oracle.md`. These are repeatable engineering diagnostics, not a claim that every acceptance item above passed.
