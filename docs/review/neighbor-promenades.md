# Source-backed partner and neighbor half-promenades

Reviewed 18 October 2026. The change generalizes an explicit actor/relation contract, rather than adding title-specific choreography. The independent full-source and physical reviews are distinct.

## Retained public sources

[Fire in the Creek variation #1448](https://contradb.com/dances/1448), Jim Kitch, is the primary complete example. Its eight retained rows are:

| Counts | Exact source clause |
| --- | --- |
| 8 | neighbors do si do once |
| 8 | neighbors allemande right once |
| 8 | gentlespoons allemande left 1½ |
| 8 | partners swing |
| 6 | circle left 3 places |
| 10 | neighbors swing |
| 8 | neighbors promenade |
| 8 | star left 4 places ⁋ |

The six-count circle and ten-count neighbor swing remain six and ten counts. The final progression marker remains on the star. No timing is normalized to eight counts, and no progression marker is moved.

[Bristol Court #2194](https://contradb.com/dances/2194), Melanie Axel-Lute, supplies a second distinct source composition: eight-count neighbor right-hand balance/box-the-gnat, eight-count lark left allemande 1½, sixteen-count partner balance/swing, eight-count circle left three places, eight-count neighbor swing, eight-count neighbor promenade, and eight-count full left star. Its omitted progression marker requires a visible, archived end-of-cycle interpretation. The two combined rows also require explicit four-count balance choices. Its new promenade passes the gates below; a larger inherited star-to-next-cycle-balance gait limitation keeps it from being a clean whole-source anatomical example.

[Another First Time #1744](https://contradb.com/dances/1744), Nicholas Rockstroh, is retained as a negative example. It enters its neighbor promenade from an eight-count neighbor right allemande 1½. Its actual endpoint faces incorrectly for this contract. It remains blocked; the compiler does not replace that allemande with a swing, rotate people instantaneously, or add time to make it fit.

All three exact public-page snapshots are retained in the corresponding `test-data/contradb/<id>.json`. Source text, HTML, author, counts, progression glyphs, and source snapshot identity survive portable interpretation-archive re-import unchanged.

## Explicit convention and semantic scope

“Neighbors promenade” names the current bound neighbor. It does not itself specify the route, distance, shoulder, hold, leader slot, turn direction, or internal timing. The source review therefore asks for the same explicit convention already used for [Patience #1616](https://contradb.com/dances/1616): across-set half-promenade, lark in the left slot, larks passing left shoulders, left half-turn as the same pair, both same-name hands in skaters hold, four crossing counts followed by four turning/release counts. These are conventional choices following the [CONTRALAB definition](https://www.contralab.org/Definitions.html), not rewritten source clauses.

The supported bare source grammar admits named partner or neighbor promenade. Longer qualifiers, another route, another duration, unknown choices, missing fields, or a mismatching actual entry still fail closed. The neighbor capability is separately gated from the existing promenade capability; neither a saved interpretation nor a source title can enable it.

## Actor and physical contract

- `promenade.ts` takes two explicit disjoint leader/follower pairs, each naming `partner` or `neighbor`, immutable keyed entry/exit constraints, both reciprocal relationship maps, and a matching nonnegative topology epoch.
- Persistent couple identity is checked independently. A neighbor pair must contain different couples. No actor is rebound by proximity or label, and no persistent partner changes.
- The primitive checks the actual left/right slots and facing. A source relation change without matching physical actor slots fails rather than selecting a different person.
- The generic adapter consumes the source-named relation. It retains that same pair through the left-shoulder crossing, held half-turn, and canonical side-couple release.
- A preceding swing prepares the compact 0.68-unit stance only when its explicit partner/neighbor relation matches the following promenade. Its original duration is unchanged. Unrelated swing exits are not modified.
- The scene prepares arms only during that same-relation swing's last 15%, and the promenade's held turn/release. Negative tests cover mismatched relations and earlier swing time.
- All eight promenade counts, source figure boundaries, current-neighbor epochs, ordinary finite-set waits, and physical progression remain continuous.

## Automated verification

The added files are:

- `src/promenade-neighbor.test.ts`: current-neighbor ownership, persistent partners, exact slots/shoulders/endpoints, immutable snapshots, arbitrary stable IDs, rigid transforms, stale/misnamed bindings and unprepared ingress rejection.
- `src/promenade-neighbor-source.test.ts`: exact source/archive/capability gates, the rejected allemande ingress, full finite periods for every size from 2 through 12 couples, explicit current-neighbor contacts, deterministic scrubbing, all figure joins, fixed limbs, one footfall per musical beat, exact full-strength wrists, and preparation-scope negatives.
- `src/promenade-neighbor-preparation.test.ts`: normalized final-15% upper-arm mesh comparison against #1616, with a 17mm same-pair overlap budget and less than 1mm additional overlap for the accepted #1448 example, no outside actor pairing, and a 2.1-unit broadphase. The unfeatured #2194 has separate diagnostic budgets of 18mm and 1.5mm delta. This prevents future reports from accidentally claiming zero release overlap.
- `src/promenade-neighbor-mesh.test.ts`: actual six-couple production-mesh probes from beat 47.8 through 56.2 at 50 samples per beat, including ingress, crossing, held turn, and the following star release. The pair broadphase is 2.1 units, so arms reaching beyond 1.5 units cannot be skipped. Intentional held hand-pair contacts are excluded from unrelated arm/arm probes; other-person torso, head and leg probes remain included.

An exact stable-actor slot mapping compares each new promenade against the reviewed Patience partner promenade over all eight counts. Roots, headings, stride, lean, bounce, turn, body-driving cues, hand ownership and targets agree to numerical tolerance. The actual actors differ because the source pairs are neighbors. This is a geometric equivalence certificate for the promenade, not for the whole transition: the incoming swings last 8, 10 and 12 counts, and the new outgoing figure is a star instead of an allemande. Those changed articulated joins and meshes are sampled directly.

The independent audit passed eight source/archive/corner/finite-end tests, covering 19,712 frames and 112 waiting epochs per source. It confirmed persistent partners, current-neighbor promenade ownership, and exact physical corner permutations through the full star. The new promenade and both incoming prepared neighbor swings have zero sampled leg-reach corrections and full-strength wrist-target error below 7e-16 units.

### Final regression result

The combined command passed 35/35 tests, and TypeScript checking passed:

    node --experimental-strip-types --test src/promenade*.test.ts src/contradb*promenade.test.ts src/scene-timing.test.ts src/scene-extended.test.ts
    npx tsc --noEmit

The final six-couple, 2.1-unit-broadphase mesh minima over beats 47.8–56.2 were positive for both sources: leg mesh 0.03831, noncontact arm mesh at least 0.02416, other-person torso at least 0.07659, exact other-person head at least 0.11829, and own forearm/hand torso 0.00463 units. The wider incoming release window is explicitly budgeted below, rather than hidden by these late-ingress measurements.

The complete owner regression output is retained in `qa/neighbor-promenade-owner-regression.log` beside the application directory. The independent audit reports are in `qa/next-independent/neighbor-promenade-independent-mesh-results.json` and its source/finite-end test output.

## Inherited limitations kept separate

The full final 15% of the incoming swings retains a bounded release artifact: unjoined upper arms within the just-released named pair overlap by approximately 0.01596 units for #1448 and 0.01694 for #2194 under 0.001-normalized-progress sampling. The reviewed #1616 partner case has the same artifact, approximately 0.01562 units at normalized swing progress 0.953. The accepted #1448 differs by 0.000343 units at the same phase and introduces no outside actor pairing. The denser #2194 result differs by 0.001319 units at progress 0.954; its earlier 50-samples-per-beat estimate was less conservative, and it remains unfeatured/unreviewed as a whole-source release example. Disabling preparation worsens the compact-swing overlap to about 0.052 units. Own-forearm/torso overlap at preparation onset is unchanged from the existing swing baseline (approximately 0.009 for #1448, 0.022 for #2194, and 0.018 for #1616). The positive 47.8–56.2 mesh result is not a claim of zero overlap in the entire incoming swing. An earlier-finishing preparation ramp was tested separately, worsened both arm overlap and head margin, and was rejected without changing the implementation. The independent reviewer accepted the disclosed same-pair release artifact for #1448 under the current prototype threshold. The generic neighbor promenade capability is registered based on that complete example; this does not mark #2194 as a reviewed whole-source anatomical example.

- #1448's existing ending star has a sampled maximum leg-reach correction of approximately 0.01351 units, at beat 63.075 for a six-couple run. It is an explicit regression budget below 0.014, not attributed to the new promenade.
- #2194's opening handed arch and following lark allemande have closer existing root spacing, with a minimum approximately 0.50476 units at beat 13.9. Its six-couple final star approaches the next-cycle right-hand balance with a much larger sampled leg correction, approximately 0.09528 units at beat 63.0417. That record is not represented as a clean whole-source anatomical example. The new same-neighbor swing/promenade itself remains strict.
- #1744 remains blocked at the actual entry-facing contract. Supporting allemande ingress requires a separately reviewed within-count preparation, not a broader label match.

Mesh probes are sampled regressions, not continuous collision proofs, motion-capture claims, or browser/GPU evidence. Capability registration, whole-build regression and publication remain with the integrating owner.
