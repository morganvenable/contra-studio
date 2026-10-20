# Revolving door: isolated contract and candidate gate

Status on 2026-10-19: **candidate only**. An explicit four-person primitive and an application adapter exist, with focused contract tests. The actual-source sequence is exercised through an isolated candidate engine. This is not a production capability, a source-import registration, or an overall motion-quality pass. Final actual-mesh/cue evidence and an independent audit remain pending.

## Sources and attribution

- Rick Mohr's [Cup of Joe and Gaye's Groove](https://rickmohr.net/Contra/Dances/All), checked 2026-10-19, describe Ron Buchanan's revolving door: the women take central right hands and turn once while bringing the men across; the men leave the turn on the opposite side, and the women continue to the following partner swing. These establish the mechanism, not this candidate's musical budget: both Mohr dances allocate **six counts** to the door and ten to the swing. Mohr also suggests a short-lived joined-left-hand hold with the man's right arm behind the woman's back; that alternative is not silently substituted for the hold below.
- David Smukler's [Love's Evolution, May Heydays 2023](https://mayheydays.org.uk/dance23.html), checked 2026-10-19, explicitly starts from the preceding neighbor swing in **half shoulder-waist position**. The women keep the neighbor connection during the central right-hand turn, release the men across the set, and finish the turn toward partners. The released men continue with a clockwise outside loop into the swing. This is the source basis for the retained shoulder/waist carriage and released-lark loop.
- [You're Among Produce, ContraDB #774](https://contradb.com/dances/774), retained in `test-data/contradb/774.json`, is credited to **Bob Isaacs, Robert Cromartie, Isaac Banner**, not Chris Page. Its revolving-door row gives eight counts, right hands for the ladles, and dropping partners on the other side; the next row is an eight-count neighbor swing. The previous row is a partner swing. These establish the incoming partner relation, outgoing current-neighbor relation, and total eight-count door budget for this fixture.
- [MacKaye Harbor, ContraDB #2903](https://contradb.com/dances/2903), retained in `test-data/contradb/2903.json`, is credited to Isaac Banner. Its corresponding door carries neighbors and leads to a partner swing. The complete dance also has separate box-the-gnat/arch and square-through blockers. A neighbor-carriage primitive test does not establish this whole dance as executable.

The application translates the cited women's/ladles' role to `robin` and men's/gentlespoons' role to `lark`; these are dance roles, not assumptions about a dancer's identity. Source wording, authorship, counts, and qualifications remain distinct from implementation choices. The retained ContraDB snapshots are supplied snapshots, not network-authenticated publication records; public readability does not establish a blanket choreography republication licence.

## Reviewed modeling choices

The full central right-hand turn and crossing/drop-off mechanism are source-backed. The exact halfway drop parameter, path shapes, body targets, endpoint coordinates, and internal subdivision are reviewed animation choices. In particular, **`[1.25, 4.5, 1.25, 1]` is not a quoted source timing**:

| Local counts | Candidate action |
| --- | --- |
| 0–1.25 | Open the same named side-couple into carriage and acquire the central right-hand connection |
| 1.25–5.75 | Central robins turn halfway while carrying their named larks |
| 5.75–7 | Larks are released; robins finish the remaining half turn |
| 7–8 | Robins acquire the declared next swing; released larks finish their outside-loop approach |

The larks' released approach spans counts 5.75–8. No added preparation counts are inserted between source rows. The present contract intentionally accepts only the eight-count variant. Six-count Mohr variants, left-handed variants, reversed roles, other drop fractions, and alternative holds need separate review rather than a title-based fallback.

## Primitive contract

`src/revolving-door.ts` compiles four explicit persistent actors, complete stationary entry and exit constraints, two disjoint robin-carrier/lark-carried pairs, and current reciprocal partner and neighbor maps with a matching binding epoch. Both pairs must declare the same incoming relationship. The central role, hand, direction, full-turn amount, half-turn drop, shoulder/waist hold, and phase allocation must all be explicit.

- The same two robins hold central right hands. Each robin finishes one complete turn and returns to the original side of the set.
- Each lark crosses with its declared incoming partner or neighbor, is released on the opposite side, and approaches the other current relationship for the swing. There is no proximity-based rebinding or actor substitution.
- Carriage has two **directed body contacts** per pair: the lark's right hand supports the robin's waist/back; the robin's left hand supports the lark's shoulder/upper-arm. The central connection is robin right hand to robin right hand. A directed body target is not a fictitious joined-hand grip.
- Entry and exit headings are explicit. The exit must already match the declared opposite-relation swing frame.
- Actor, relationship, pair, endpoint, frame, and timing inputs are owned snapshots. Exposed endpoint maps and metadata are immutable; returned sample values can be changed without altering later samples.
- Stale or malformed relationships, unknown/duplicate actors, contradictory role/hand/turn fields, wrong phases, impossible endpoints, moving endpoint constraints, nonfinite samples, and unsatisfied physical budgets reject explicitly.
- The primitive accepts an explicit rigid frame. Its paths, headings, velocities, and world-space contact targets are tested under translation and rotation. This does not claim mirrored or role-reversed choreography.

### Named endpoint oracle

The retained fixtures use IDs `0=L1`, `1=R1`, `2=L2`, `3=R2`. Persistent partners are `(0,1)` and `(2,3)`; current neighbors are `(0,3)` and `(2,1)`. Coordinates below are relative to the figure center, with x across the set and z along it. Entries face across; exits use the prepared swing heading for the stated outgoing pair. Incoming magnitudes are `.9/.34`, outgoing magnitudes `.9/.31`.

| Incoming relation | Actor | Entry (x, z) | Exit (x, z) | Outgoing swing partner |
| --- | --- | --- | --- | --- |
| Partner | 0, L1 | (-.9, -.34) | (.9, .31) | 3, R2 |
| Partner | 1, R1 | (-.9, .34) | (-.9, .31) | 2, L2 |
| Partner | 2, L2 | (.9, .34) | (-.9, -.31) | 1, R1 |
| Partner | 3, R2 | (.9, -.34) | (.9, -.31) | 0, L1 |
| Neighbor | 0, L1 | (.9, .34) | (-.9, -.31) | 1, R1 |
| Neighbor | 1, R1 | (-.9, .34) | (-.9, .31) | 0, L1 |
| Neighbor | 2, L2 | (-.9, -.34) | (.9, .31) | 3, R2 |
| Neighbor | 3, R2 | (.9, -.34) | (.9, -.31) | 2, L2 |

These coordinates are a reproducible candidate fixture, not a universal dance-floor spacing rule. No internal radius or styling parameter is frozen by this document while path/body refinement remains active.

## Application adapter and registration boundary

`src/revolving-door-adapter.ts` binds the primitive to explicit current identities and consumes a complete figure contract: named incoming `who`, central robin role, right hand/direction, full amount, half-drop amount, shoulder/waist hold, side-couple entry, opposite-paired-swing exit, and the declared phases. The next figure must immediately swing the opposite current relationship. Pickup and swing preparation remain within the door's own eight counts.

The adapter follows the existing engine's world-x across-set convention. Translation and sparse ID-indexed context arrays are covered; arbitrary rotated application formations are not claimed. General rigid-frame equivariance belongs to the lower-level primitive.

There is **no production registration** for this family in the normal figure union, consumed-argument registry, dispatcher/capability defaults, or source importer. There is **no revolving-door archive mapping or saved-choice replay contract yet**. Figure names, labels, source notes, and dance titles cannot supply missing executable fields.

Current default source review still leaves #774's door unresolved and non-executable. #2903 remains unresolved at its door and at the separate arch and square-through clauses. Keeping those blockers visible is part of the gate.

## Evidence completed and evidence still required

### Focused contract evidence

`src/revolving-door.test.ts` contains 53 focused contract tests, passing in the initial isolated run. They cover both incoming relationships; independently named endpoint and hand/contact oracles; full-robin and half-lark winding; phase/contact continuity; frozen ownership; arbitrary IDs and reordered inputs; primitive rigid frames; adapter translation and swing acquisition; invalid/stale data; and explicit rejection instead of label-based inference. The local TypeScript check also completed successfully. These checks are separate from actual-body and mesh evaluation and must be rerun after path changes.

### Actual-source isolated sequence

`test-data/revolving-door/source-candidate.ts` reads the retained #774 snapshot, keeps the surrounding source rows, and explicitly substitutes the reviewed candidate contract for its unresolved door row. It uses `test-data/revolving-door/engine-candidate.ts`; this is a local experiment, not a production import path, and the candidate dance remains unverified.

`test-data/revolving-door/finite-period.probe.ts` exercises all **2–12-couple** finite sets through their **2n-repeat** periods. The reported run completed **1,375 boundary checks**, checked named lark crossings and robin side returns, and checked physical closure at selected phase times after the finite period. Boundary checks include both ends of consecutive phrases, so this count is not a claim of 1,375 distinct physical instants. It establishes scoped candidate root/heading and finite-period evidence only.

### Pending promotion gates

- Final actual-mesh and articulated-body review of the door and both neighboring swing transitions, including directed support contacts, non-contact body intersections, foot clearance, reach correction, and dense/adaptive checks around phase limits.
- Final cue/contact-strength continuity at pickup, drop-off, central release, and swing acquisition. Earlier candidate diagnostics and intermediate result files are not a final signed-off result.
- Independent audit against the exact retained source, named actor/hand oracle, full finite-set sequence, and final tested implementation.
- Only after those gates: explicit production integration review, source interpretation/archive mapping, saved-choice withdrawal/replay tests, capability-off rejection, and regression checks. None is granted by this document.

The current isolated candidate has positive sampled major unrelated mesh margins, including dense final knee clearance, and zero reach clamps through the new figure and its two neighboring swings for2/3/6couples. Directed supporting-arm/body overlaps, inherited closed-swing intersections and inherited source-prefix reach corrections remain explicit review items. See `test-data/revolving-door/review-integration.md` and its frozen evidence packet; these scoped results do not certify the complete source. There is no claim that all mesh checks pass, that the whole family is registered, or that the procedural model is biomechanically valid or safe for physical instruction.

### Reproduction

From the app directory, using installed local tools:

```sh
node --experimental-strip-types --test src/revolving-door.test.ts
./node_modules/.bin/tsc --noEmit
node --experimental-strip-types test-data/revolving-door/finite-period.probe.ts
```

The candidate body, mesh, and speed probes and their intermediate results are under `test-data/revolving-door/`. Evaluate the exact final candidate revision before reusing their measurements; filenames alone do not establish currentness or approval.

The current candidate packet also includes four actual-source/finite-period/body/mesh tests in `src/revolving-door-source-candidate.test.ts`, for57 focused tests total.


## Staged two-part waist-hand withdrawal

The bounded release repair is documented in `../test-data/revolving-door/release-repair-review.md`. It preserves the existing directed support release5.35–5.75, source counts, center turn and body paths. Only the carried lark RH withdraws behind its own side and settles during5.75–6.65, inside the existing free half turn. `rightWaistRelease:{settle}` is a frozen per-hand cue, absent outside that interval and absent for robins. The exact waypoint and short-arc elbow controls are animation conventions, not literal author instructions. The former40.13mm own-elbow intrusion is the explicit comparison target; all held-support and inherited closed-swing residuals remain disclosed. No production capability is enabled.
