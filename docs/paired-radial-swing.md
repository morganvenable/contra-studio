# Actual paired-radial swing handoff

## Implemented contract

`src/paired-radial-swing-step.ts` handles an ordinary named swing whose actual incoming closed frame is transverse. It consumes the complete `SequenceBoundary`, including persistent actors/relations, source clock and epoch, roots, facing, and raw held contacts. It derives sideline width from the two named pair centers, requires the actual .62 frame gap, and compares the complete raw entry contacts against the unchanged ordinary swing kernel.

The core-owned primitive opt-in is `swingEntryGeometry: 'paired-radial-frame'`, with `swingEntry: 'two-hand-balance'`, `canonicalSwingLayout: true`, measured half-width and explicit row gap1.8. Default primitive admission is unchanged. The adapter returns the actual exit `SequenceBoundary` and a captured paired-sidelines `FormationState`; it inserts no beats, boundary snaps or relationship changes. Applicability inspects one swing and its measured incoming geometry, never a title, source ID or complete program signature.

## Actual source3087

Show of Hands I retains neighbor right1¼8, robin left1½8 and partner balance4/swing12. The two literal turns remain unchanged. After the balance, partner roots lie at transverse offsets±.31 around the measured sideline centers±.9. The new consumer retains that actual entry and finishes the same partners on ordinary sidelines. It does not interpret the outer frame roots±1.21 as formation width.

Focused adapter tests cover actual four/five-couple first-cycle frames and a changed-width, translated, relabeled/reordered synthetic incoming state with sourceBeat137 and epoch5. Raw contact, facing, geometry, relation and clock failures reject. The four focused tests and TypeScript check pass. Core separately reported passing whole-source three/four-couple finite-period checks; those are core-owned integration evidence, not an all-size/body sweep claim.

## Source2987 remains blocked

Stay in Touch's unchanged literal neighbor-left1¼ puts the robins outside and larks inside. Its following same-role turn has actual root clearance near .20, below the .38 threshold. The proposed spectator sidestep was rejected; no spectator motion, timing split, source rewrite or new review choice was implemented. The alternate author wording is retained separately by the source owner and is not substituted for ContraDB's fixed amount.

Historical files under `test-data/two-turn-handoff/clearance-options.*` and `design-options.md` record that rejected mathematical proposal only. They are not imported by production or durable tests.

## Exact dependencies

Production module imports:
- `src/engine.ts`: unchanged swing trajectory plus core-owned checked radial-entry profile
- `src/owned-program-cache.ts`
- `src/figure-semantics.ts`
- `src/sequence-boundary.ts`
- `src/formation-handoff.ts`
- Type-only `src/extended-figures.ts` and `src/types.ts`

Durable test: `src/paired-radial-swing-step.test.ts`. Its sole retained source fixture is `test-data/contradb/3087.json`. It uses the existing source preparation, core, capabilities and handoff modules; it does not read diagnosis files, the research report, the corpus ledger, source2987 or absolute workspace paths.

Core owns capability/registry/admission changes, default activation decisions and affected-old-path parity. The isolated worker changed no shared engine, registry, type, capability, importer, source-review, UI, build or library file.
