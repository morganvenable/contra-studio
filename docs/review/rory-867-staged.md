# Reviewed Rory O’More: exact ContraDB 867

Status: independently reviewed and registered as `rorySlides`. The exact short-wave source composition, both optional spin choices, finite ends, actual Avatar contacts/cadence and scoped major-body checks are cleared. Explicitly disabling the capability still rejects this source. The staged results below are retained as implementation history, including rejected variants and prototype limitations.

## Source and retained interpretation

- [Sugarbritches 2.0 allemande variation, Dana Parkinson](https://contradb.com/dances/867), archived `test-data/contradb/867.json`, semantic snapshot `contradb:867:e0fec02cebf7b8d1`.
- Ten source rows become nine moving figures: forward 2 and the following zero-count wave assertion form one two-count entry. The source states robin left-hand centers and neighbor right-hand sides. No beat is added.
- Counts: entry 2; balance/Rory right 8; neighbor left allemande 1½ in 6; robin right allemande 1½ in 8; partner swing 8; circle left ¾ in 8; neighbor swing 8; long lines 8; left star once and progress 8. Total 64.
- The hook about matched allemandes is corroborated by the actual left-neighbor/right-robin rows. The Lauren Peckman/St Louis note is provenance, not permission to change motion.
- The source does not specify first balance direction, spin styling, the final turn/frame timing allocation, or finite-end choreography. Review must retain all these choices: `[4,4]`, right-first balance, explicitly no spin or full right spin, `[6,2]` robin turn/frame preparation, and a separate eight-count same-end wait policy. Removing a choice blocks playback.
- The complete robin 1½ turn ends at global count 22. The last two original counts prepare the adjacent partner frame; partner swing begins at 24. This is a reviewed timing interpretation, not extra counts or a reduced turn.
- Source-explicit final-star progression evidence does not authorize the separate reviewed finite-end policy.

## Primary movement definitions

[The Caller's Box glossary](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm) and [Colin Hume's teaching session](https://colinhume.com/session7.htm) distinguish face-to-face one-person travel from a half allemande: release hands, move to the held person's adjacent station, face the original wall, and rejoin with opposite hands. A full traveling turn is optional styling. [ContraDB's Rory figure definition](https://contradb.com/figures/rory-omore) supplies the source-family context.

The primitive measures right/left in each dancer's actual initial body frame. Optional right spin is one full clockwise body turn; left is the inverse. No spin retains body facing throughout. Neither is a petronella alias. Required travel is identical in both modes. The forward-side passing arc is a modeled collision-clearance choice, not a claim that the source specifies its exact curve.

## Independent actor and hand oracle

For the first two couples, stable actor IDs are top lark 0, top robin 1, bottom lark 2, bottom robin 3. West-to-east short-wave stations:

| Count | Ordered actors | Facing, radians | Hands west-to-east |
|---|---|---|---|
| 2 | 2, 1, 3, 0 | π, 0, π, 0 | RH neighbor, LH robins, RH neighbor |
| 10 | 1, 2, 0, 3 | 0, π, 0, π | LH neighbor, RH larks, LH neighbor |
| 16 | 2, 1, 3, 0 | 0, π, 0, π | LH neighbor, RH robins, LH neighbor |
| 22 | 2, 3, 1, 0 | 0, π, 0, π | Turning hands released; persistent partners adjacent |

The reviewer independently derived this permutation. Context binds actual persistent partners/current neighbors; there is no nearest-person search. Wave graph validation covers every actor and every adjacent hand, including long-wave seams. The reusable long-wave primitive is tested, but no complete long-wave-start source composition or finite long-wave end algorithm is activated by this work.

## Runtime ownership and finite ends

`rory-slide.ts`, `rory-wave-adapter.ts`, and `rory-source-sequence.ts` own snapshots and frozen public contracts. The compiler accepts explicit structural figure contracts, not a title or source ID. Unsupported suffix modifiers are rejected. Source counts, progression markers, and semantic fields are validated before inactive behavior. Every 2–12-couple finite period closes after twice the number of couples; actual endpoint rows govern rank exchange. Waiting dancers exchange sides at their physical end in the first eight counts and stay out of all active hands.

## Physical checks and honest limits

- Public `compileChoreography` tests cover all 2–12-couple periods, actor/corner/hand checkpoints, all waiting and reentry states, global roots, phase continuity, immutable inputs, and missing/malformed reviews.
- Actual Avatar tests cover 2 and 6 couples, both no-spin/full-spin, fixed arm/leg lengths, one step per beat, full-strength named wrist targets, articulated boundary continuity, and lookahead gait across the next round. New wave figures require no planted-foot reach corrections in these samples. The inherited final star still needs about 12.1 mm; the runtime warning makes it visible.
- Both swings are checked for complete named frames and immediate orbit in all 2–12-couple finite states. Their entry diagnostic is not a universal demand that every other source have instant full hold.
- Only two new Avatar routes are used: low-elbow passing during released Rory travel, and the existing central-turn frame ingress for the exact robin `[6,2]` exit. Before/after frames and every Avatar world matrix are byte-equivalent for actual sources 810, 57, and 2418 at quarter-beat samples over two rounds.
- Lateral balance roots are modeled, but literal lateral step/touch foot styling is not; the procedural walking remains beat-locked and the limitation is retained visibly.
- `test-data/rory/avatar-mesh.probe.ts` is a diagnostic actual-mesh probe outside the aggregate while major-body clearance remains unresolved. It checks new windows across adjacent groups and waiting ends in both spin modes. It is sampled CPU geometry, not a continuous or GPU collision certificate.

### Frozen mesh result (both spin choices)

At 12 samples per beat through counts 0–24 in two six-couple rounds, both styles show knee clearance 49.9 mm and head clearance 34.6 mm. They still show an unjoined left-forearm/left-upper-arm overlap of 38.1 mm at count 22.833 and a self right-hand/torso overlap of 60.0 mm at count 22.75, during explicit partner-frame preparation. The inherited settled swing at count 24 also measures a 124.9 mm forearm/other-torso overlap under this strict mesh metric. Therefore the major-body activation gate was not met at that earlier checkpoint; no-spin does not waive full-spin verification. The probe remains a failing diagnostic, not an ignored aggregate test.

Before/after SHA-256 digests (frame JSON plus every Avatar node world matrix, first two six-couple rounds at quarter-beat intervals):
- Source 810: `00d0e3834bd00b678c7775e948fd7a37cb2a757134dba57d778a4a9c3f43ed8b`
- Source 57: `410cd2f02b93d724d2ca60ca97bde20f7b9a29f24afd645276f1dd8b8ab0c75b`
- Source 2418: `20cca44f3631290e9d0c40216558e237ba4eb7a11acb24f00f09ec22edb039a7`

No dependencies were installed and nothing was published.

## Post-checkpoint isolated repair

`test-data/rory/scene-candidate.ts` (SHA-256 `0ad2a8dfe8069791e40f337b3eb2246e9a64ad573fa554ea656fe22d476fcb20`) preserves the shared settled frame and all roots. For the exact short-wave `[6,2]` ingress only, it removes the unsuitable generic forward left-hand bow/pole, offers the right hand outside its own side with a fading lateral arc, and quiets free-arm walking during acquisition. The dancers continue their quarter-circle travel throughout the two counts.

The actual two-style, six-couple probe through two new-figure windows measures unrelated-arm clearance 63.84 mm, leg clearance 49.88 mm, and head clearance 34.57 mm. The original 38 mm unrelated-arm and 60 mm self-hand preparation overlaps are removed. The remaining global self-forearm overlap is 19.82 mm during released-slide styling; the shared settled swing's 124.92 mm other-torso overlap is unchanged. Therefore the full strict mesh diagnostic still fails, and the capability remained off at that earlier checkpoint. Results are retained in `test-data/rory/rory-repair-results.json`.

At 960 samples per beat, peak preparation joint speed is 1.545 world units per beat versus 8.275 for the prior route; the peak is stable under sample refinement. Small derivative kinks remain, consistent with the existing 24 Hz gait/pelvis interpolation. This is not a C2 joint-motion claim. Fixed-limb/fully held wrist and articulated boundary continuity checks pass both styles and 2/6 couples. Exact count 22 now has an empty graph rather than zero-strength edges.

`test-data/rory/geometry/rory-frame-preparation-sheet.png` is an offline depth-buffered projection of actual posed Avatar mesh triangles, showing all four actors at counts 22, 22.5, 22.75, 23, 23.5, and 24. It is geometry inspection, not a browser screenshot. The installed Chromium launch was blocked by the sandbox; no alternative browser route or installation was attempted.

The additive frozen slide-style candidate `scene-slide-candidate.ts` (SHA-256 `01db2f05276cba964df60a57379909b14156fae2f496b731fa7405bfddf44dc0`) retains that exact ingress and moves only the released Rory free-wrist side offset from 0.18 to 0.245 m while retaining the low elbow route. This removes the slide's 19.82 mm self-forearm overlap. The final two-style six-couple result has unrelated-arm clearance 63.84 mm without spin and 32.72 mm with full spin, legs 49.88 mm, and heads 34.57 mm. The global own-torso minimum is now a 7.39 mm free-hand overlap during the ordinary neighbor-allemande window; the old settled-swing other-torso counterexample remains unchanged. Additional actual Avatar checks through after-wait reentry counts 128–152 pass for both styles and 2/6 couples. Independent review was required before landing/activation; the final signoff below closes that gate.

Independent denser checking at 40 samples/count found a peak associated supporting-forearm/torso overlap of 125.416 mm during acquisition, 0.498 mm deeper than the 124.918 mm settled baseline. The exact final frame is unchanged, but the whole acquisition window is not byte-equal to its endpoint; that measured small residual is retained for prototype-baseline classification. Independent unrelated-arm clearances are 61.69 mm during preparation and 138.89/32.42 mm during no-spin/full-spin travel; travel own-shirt clearance is 5.87 mm. The offline contact sheet was independently inspected and the continuing approach/gradual acquisition read clearly.

The reviewed narrow route is now landed in `src/scene.ts`, preserving unrelated oval and pass cues. At landing, production and frozen `01db2f0` matrices are byte-identical through three six-couple rounds for both styles (`test-data/rory/production-comparison.json`). Actual sources 810, 57, and 2418 retain their prior frame/matrix hashes (`old-source-comparison.json`). The public body test includes after-wait reentry and passes; typecheck passes. Review classifies the 0.498 mm associated-frame delta as a disclosed minor existing-frame residual rather than a blocker. Source/capability activation remains owned separately. Rejected candidates and their measured reasons are retained in `rejected-variants.json`; the strict all-torso probe intentionally continues to expose the shared prototype frame limitation.

Final independent landed signoff: exact equality of 6,558,912 posed mesh-matrix scalars across 1,158 frames, both spins and three six-couple rounds. All source, finite, cadence, contact and joint gates are closed. Core registered `rorySlides`; source/default UI and both-style archive replay are owned by the source-review layer. No publication was performed.
