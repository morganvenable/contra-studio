# Full-set long waves: Bob the Surfer

## Source and scope

The retained source is [Bob the Surfer, Dugan Murphy, ContraDB 1591](https://contradb.com/dances/1591), in `test-data/contradb/1591.json`. The explicit source-semantic fixture is `test-data/long-wave/bob-fixture.ts`.

The eight retained rows have counts **16, 8, 8, 8, 8, 0, 8, 8**:

1. Neighbors balance and swing: interpreted as 4 + 12.
2. Larks allemande left 1½: 8.
3. Partners swing: 8.
4. Circle left three places: 8.
5. Neighbors allemande right 1½: 8.
6. Form long waves, larks facing in and robins facing out: **0**.
7. Balance and box circulate, larks crossing and robins looping right: interpreted as 4 + 4.
8. Balance and box circulate, robins crossing and larks looping right; look to next neighbors and progress: interpreted as 4 + 4.

The complete source remains 64 counts. The zero-count row is consumed as the preceding allemande's exit assertion. It cannot add a moving figure, silently reposition anyone, or retime the musical phrase. The 4+12 and 4+4 splits, balance styling, compact floor spacing, and finite-end policy are explicit reviewed interpretations; the roles, turns, counts, long-wave setup, and final progression are source statements.

## Full-set composition

`long-wave-source-sequence.ts` composes ordinary identity-bound primitives, the existing explicit four-person wave operations, and a whole-line contact layer. It does not select the dance by its title or source ID. Every input has to satisfy the actual source-count, entry, role, hand, permutation, and finite-end contracts.

`full-long-wave.ts` joins explicitly ordered west/east box segments into two complete along-hall waves. Each local segment must retain its validated right-hand edge. Between-minor-set left hands are named separately as seam edges. These outer-wave hand partners are not silently made into current contra neighbors. A missing or contradictory segment hand, duplicate/invalid actor or pose identity, unreachable spacing, missing seam, malformed line order, or stale/invalid epoch is rejected.

The fixed adult bodies and limbs are not scaled. An explicit compact floor profile uses:

- Half-width: 0.64 scene units.
- Couple-row gap: 1.28 scene units.
- Allemande orbit radius during the turn: 0.39 scene units.
- Neighbor-turn spacing preparation: each sideline pair center opens outward by at most 0.24 scene units during the first 1½ of the existing eight counts, and returns during the last 1½. The 1½ orbit, pair identities, counts, and final slots stay intact.

That last preparation avoids free-arm collisions between the two simultaneously turning neighbor pairs. It does not compress the whole hall, borrow an extra count, or modify the source's final wave slots. The right-hand turn walks tangent to its orbit, with the right shoulder toward the joined hand, so its literal 1½ exit already has larks facing in and robins facing out. The zero-count row adds neither a turn nor travel.

For the initial two-couple IDs L1=0, R1=1, L2=2, R2=3:

- At beat 48, the west wave segment is `[0, 3]`, east `[1, 2]`.
- At beat 56, the west segment is `[3, 2]`, east `[0, 1]`.
- After the second circulate, the west slots are `[2, 1]`, east `[3, 0]`.

The first circulate changes held-wave partners while keeping the contra-neighbor epoch. The second physically puts each original couple in the opposite couple row. Within its final 1¼ existing counts, dancers look toward their receiving neighbors. The last row does not regain old wave contacts while people turn away. Only after the circulation endpoint passes its position/facing oracle does the next contra-neighbor binding take effect.

The public runtime also applies the existing balance-stance layer. During the last existing counts it makes a small, continuous root adjustment toward the explicitly named receiving balance handhold. The canonical slot trajectory remains inspectable as `formationSample`; actual displayed roots use `sample`. This preparation adds no count and does not change the current neighbor epoch early. Independent retained-source tests cover the actual public roots, contacts, repeat joins, and finite ends as well as the canonical slot proof.

## Finite ends

All dancers retain persistent IDs. Waiting couples remain at their actual top or bottom end, exchange sides during the next opening eight counts, and then hold still. They remain outside the active long-wave hand graph. No dancer wraps from one end of the hall to the other, and no interior unmatched dancer can be relabeled as an end.

The compiler discovers and verifies closure from directed couple slots **and physical roots/headings**. The tested 2–12-couple states close in 2N repeats. Every couple encounters every other couple. This is verified rather than used as permission to reset bodies.

## Evidence

`long-wave-source-sequence.test.ts` covers retained source text/counts, zero-count exit continuity, named circulation slot oracles, unmodified neighbor epochs, inter-minor-set contacts, complete 2–12-couple periods, same-end wait/re-entry, all source boundaries, global root clearance/speed, malformed semantic contracts, owned immutable inputs, and a separately labeled synthetic primitive-prefix composition.

The actual production Avatar is sampled at 120 frames per musical beat over the new wave handoff and both long-wave rows. Its musical gait remains one alternating step per beat with fixed adult arm and leg lengths. The representative six-couple run has **9,650 full-strength joined-hand samples**, including seam hands, with wrist error below 1e-7 and **zero leg-reach corrections**.

`long-wave-body.test.ts` samples production arm meshes over counts 40–64, including adjacent minor sets, and separately compares the inherited lark-turn/swing handoff with the standard-spacing baseline. These are sampled regressions, not continuous proofs for every arm surface or clothing intersection.

Independent retained-source import/archive/public-runtime checks passed, including exact replay equivalence and complete 2–12-couple periods. The independent six-couple actual-public rig trace samples the entire 64-count source at 50 frames per beat: every figure has zero leg-reach corrections, and full-strength wrists in the new neighbor-turn/wave motions are exact within 3.4e-16. The sampled new-motion mesh clearances are positive for unrelated arms (96.3 mm), other torsos (112.0 mm), heads (147.7 mm), and legs (178.6 mm). Reports are `../../qa/next-independent/contradb-1591-audit-results.json`, `1591-independent-rig-results.json`, and `long-wave-independent-mesh-results.json` in that same directory.

## Explicit rendering limits

- Wave balances retain the exact hand graph and musical beat grid, but the walking rig does not yet render literal right-step/touch, left-step/touch styling.
- The new neighbor-turn/wave segment has a generic own-arm skin skim below 10 mm; other-torso and unrelated-arm clearances are positive under the sampled mesh checks.
- The earlier inherited lark-allemande-to-partner-swing preparation has an approximately 49 mm own-forearm rendering intersection. A standard-profile baseline reproduces the same depth; the compact formation does not increase it. The regression bounds it rather than presenting the inherited figure as mesh-perfect.
- The initial inherited paired balance has a maximum 4.145 mm wrist residual in the independent full-source trace. The numerical-precision contact claim applies to the new neighbor-turn/wave motions, not every inherited source figure.
- Intentional swing blade/upper-arm support is not a free-hand collision. Source progression and fixed-body root checks do not certify every inherited support-contact surface.

The complete source is registered through the `longWaves` capability after retained-source importer/archive and independent public-runtime gates passed. Passing an isolated box circulate is not sufficient to activate another full long-wave source dance. Publication of the app remains separate.
