# Explicit wave motion and the Undercurrent candidate

## Implemented boundaries

`wave-figures.ts` owns four distinct operations: a four-count right-shoulder pass to a short wave, a four-count wave balance, a four-count box circulate, and a two-count half-allemande in a short wave. Every operation receives four stable actor IDs, keyed entry/exit poses, explicit facing and velocity constraints, ordered wave slots, and an adjacent named-hand graph. Circulate additionally requires the complete actor-to-vacated-slot permutation and distinguishes cross from loop-right. No operation chooses a partner, neighbor, or receiving dancer by proximity.

`wave-figure-adapter.ts` binds role/current-relationship declarations to those explicit identities. It consumes source rows as either four-count operations or declared four-plus-four composites. A balance retains the hand graph and does not permute people; a circulate changes occupied slots. Rory-style slides/spins are not implemented aliases.

`wave-transition-adapter.ts` preserves literal two-count half-turns. The RH side turns exchange each named side pair; the LH center turn exchanges only the two role-selected centers. Its following twelve-count partner swing starts rotating in the actual horizontal partner frame on count one. Center, radius, facing, and frame acquisition prepare concurrently during the first 1.5 counts, with no additional beat or separate gather. Full contact is reached only when that frame is physically within the fixed-arm envelope.

The program compiler retains the current ordered wave graph, named-hand relationships, and declared exit for each bound group. Ordinary primitives cannot silently discard that state. It accepts separately counted pass/balance phases and checked ordinary primitives before or after the wave, provided the explicit entry contracts, source total, actual final row permutation, and complete finite-set closure all pass. This is broader than one fixed nine-figure list; it does not register arbitrary long-wave/circulate programs. Synthetic composition regressions are labeled test fixtures, not additional public dances.

Compiled primitives own immutable copies of their inputs. Extra wrapper fields, stale relation epochs, incorrect hand graphs, impossible facings, unsupported aliases, incomplete permutations, and incorrect source budgets reject rather than becoming partial animations.

## Complete retained-source candidate

Source: [Undercurrent, Jacqui Grennan, ContraDB 1992](https://contradb.com/dances/1992). The retained snapshot is `test-data/contradb/1992.json`; the explicit interpreted fixture is `test-data/progression/wave-fixture.ts`.

The source's eight rows have counts **8, 8, 2, 2, 12, 8, 8, 16**:

1. Long lines forward/back, 8.
2. Pass to an ocean wave and balance, 8; larks hold LH in the middle and neighbors hold RH on the sides.
3. Neighbors allemande RH halfway, 2.
4. Robins allemande LH halfway, 2.
5. Partners swing, 12.
6. Right and left through, 8.
7. Robins allemande RH one and a half, 8.
8. Neighbors balance and swing, 16, followed by progression.

The combined last row is a declared **4 + 12 reviewed interpretation**, with the progression transaction after the swing. `compileShortWaveImproper` composes the entire source and proves that the actual final roots exchange the two couple rows before rebinding. Out couples exchange sides at the same physical end during the next opening eight counts. Finite-state closure is discovered and checked against physical roots and facings rather than assumed from a `2N` period.

For the normal two-couple starting IDs (L1=0, R1=1, L2=2, R2=3), the ordered left-to-right short-wave oracle is:

- After pass/balance, beat 16: `[3, 0, 2, 1]`.
- After RH neighbor half, beat 18: `[0, 3, 1, 2]`.
- After LH robin half, beat 20: `[0, 1, 3, 2]`.

Partners are then adjacent horizontally with opposite along-hall facing. Neither half-turn secretly resets them into vertical swing slots.

The compiler is registered through the `shortWaves` capability after independent retained-source import/archive and public-runtime review. Progression events and any separately used figure capabilities remain required. Publication of the app is separate from this implementation registration.

## Evidence and explicit rendering limits

The wave test files currently contain 21 passing tests. They cover source row text/counts, endpoint and role oracles, exact handed turns, right-loop chirality, four-circulate closure, finite derivatives, immutable inputs, rejected malformed semantics, first-count swing rotation, and complete finite-set playback for 2–12 couples. Every couple meets every other couple; all joins preserve root/facing continuity; the global root-clearance check includes waiting dancers and adjacent minor sets.

Representative tests instantiate the actual `Avatar` and sample at 120 frames per musical beat. They assert one alternating footfall per musical beat and fixed adult leg/arm lengths, rather than testing only abstract points. Pass/balance/circulate examples and the horizontal-entry partner swing need no foot-reach correction. Full-strength joined wrists and support contacts meet their declared targets to numerical precision.

Two rendering limits are deliberately visible:

- Wave balance root motion is body-relative and beat-locked, but the generic walking rig does not yet implement literal right-step/touch, left-step/touch styling.
- The source's two-count half-allemandes retain their exact semicircular paths and counts. The generic stance solver corrects fixed-bone foot reach by up to **0.054 scene units** (neighbor RH half) and **0.042** (center LH half). Regression tests bound those corrections and require clean pass/swing gait. This is a schematic gait limitation, not a timing or topology substitution.

These checks do not certify all possible arm/torso or clothing intersections.

## Full-set long-wave source

[Bob the Surfer, Dugan Murphy, ContraDB 1591](https://contradb.com/dances/1591) now has a complete retained-source composition through the separately registered `longWaves` capability. Its 64-count sequence consumes the zero-count long-wave setup as the preceding neighbor allemande's physical exit. Named hands span minor-set boundaries, both role-specific balance/circulate rows retain explicit 4+4 budgets, and the final circulation physically establishes the new-neighbor progression before rebinding.

Independent retained-source import/archive, public-runtime, complete 2–12-couple finite-period, full-set graph, contact, gait, and sampled major-collision checks passed. Full-strength wrists in the new neighbor-turn/wave motions are exact to numerical precision, with no leg-reach corrections. Known inherited rendering limits remain documented. See [full-set long-wave contracts, evidence, and limits](long-wave-motion.md) for the explicit spacing preparation, same-end wait/re-entry policy, and source interpretation. Publication remains a separate action.

## Sources and variants still blocked

Dreamland Races (2006) has additional rollaway and source-interpretation requirements. Wave support alone does not make that complete dance playable. Rory-style slides/spins are also unimplemented; neither the short-wave operations nor the complete Bob the Surfer composition substitutes for those variants.
