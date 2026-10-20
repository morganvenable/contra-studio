# Balanced square-through-two: whole-motion contract

Status: locally registered after independent source, path and input-ownership review on 19 October 2026. Ready-card offline playback and release capture remain pending. This is schematic whole-dance motion; detailed limb animation is not an admission claim.

## Source and admission envelope

Retained actual source: [Fair and Square, John Coffman, ContraDB 3496](https://contradb.com/dances/3496), acquired 2026-10-18T20:51:49.819855+00:00. Fixture: `test-data/contradb/3496.json`. Original page bytes and author remain in the ordinary source snapshot and interpretation archive. Public readability does not establish choreography redistribution permission.

The seven source rows total 64 counts:

- A1: neighbor right-hand balance and box the gnat 8; larks allemande left 1½ 8
- A2: partner balance and swing 16
- B1: circle left three places 8; neighbor swing 8
- B2: long lines forward and back 8; square through two 8, the sole progression glyph

The literal last clause is “square through two - partners balance & pull by right, then neighbors pull by left ⁋”.

Admission is independent of title, record ID and author. The bounded whole sequence requires:

- Duple improper; complete 64 counts; one final progression declaration
- Opening neighbor right-hand balance 4 → neighbor right-hand box-the-gnat 4, robin under
- Final long-lines 8 → one balanced square-through-two 8
- Square-through declaration: who all, amount 2, hands right-left, partner-facing-across entry, progressed-neighbor exit, phaseBeats [4,2,2]
- Actual named partners across the same standard row, current neighbors on sidelines, correct role placement, and exact onward lark-left progression endpoint
- All other source clauses and the complete primitive composition still pass the normal importer and validator

The 4+2+2 subdivision, compact hand spacing, reopening sidelines and final three-quarter-count next-balance preparation are explicit modeling interpretations. They are not literal source subcounts. Four-hand, unbalanced, neighbor-first, alternate-hand, extra-turn, other opening, nonterminal and multiple-square-through variants remain blocked.

## Motion and identity ownership

`src/square-through.ts` composes the existing named-pull-by kernel:

1. Balance with the persistent partner by right hand,4 counts. Across-set spacing gathers 1.8→.92 then balances outward to1.10. The actual right hand stays joined through the count 4 handoff.
2. Partner-right pull-by,2 counts. Each actor exchanges its named partner’s compact entry slot, crosses the right-hand gate at count 5, releases, and faces its current neighbor.
3. Current-neighbor-left pull-by,2 counts. The same old-neighbor binding is retained. The left-hand gate occurs at count 7. A common outward translation of each same-side pair opens half-width .55→.9 during this passage. Each actor reaches the diagonally opposite, onward-facing standard corner at count 8.

The compact second-passage kernel is an internal scaffold with .4 inter-sideline clearance before the simultaneous outward translation. It is never public motion. The complete composition independently validates all roots against .64 minimum clearance, 1.65 maximum speed, 6 maximum yaw rate and .64 full-strength hand reach. There is no global budget relaxation.

`src/square-through-adapter.ts` captures typed FormationState boundaries at source counts 56, 60, 62, 64. Their clock, epoch, roles, persistent partners, current neighbors, physical-station occupant IDs, exact roots/facings and held contacts are independently compared against the compiled path. The compositor does not increment the relationship epoch.

## Exact shared integration hooks

The shared hooks below are landed. The historical `test-data/square-through/stage-integration.py` and proposed-hook artifact document the isolated prototype; durable `src/square-through-source.test.ts` now exercises the actual production importer and public compiler.

Core owner:

- Add FigureKind square-through and optional caller-owned MotionCapabilities.squareThroughs
- Consume only who,amount,hands,entry,exit,phaseBeats in figure-semantics
- Gate on squareThroughs and namedPullBys; call assertSquareThroughComposition on the original figures before internal progression flags are cleared
- Admit the exact hand/entry/exit contract, dispatch compileSquareThroughFigure(figure,context,segmentSourceBeat), and exempt its owned heading from generic entry-yaw mixing
- In the existing eligible-next-balance branch of stance.ts, use squareThroughPreparationBeats(figure) before the generic duration. This helper validates the full square-through declaration and returns .75. It never looks at title or source ID

Source owner:

- Row choice squareThrough: {phaseBeats: [4,2,2]}, validated by isSquareThroughChoice
- Use the literal source/glyph guard isBalancedSquareThroughTwoSource and label choice with SQUARE_THROUGH_CHOICE_DESCRIPTION
- Recognize the family but keep other variants unresolved; reject unused row choices
- Add square-through to exact source-marked event admission and archive the unchanged snapshot plus reviewed choice
- Review suggestions use squareThroughChoiceForSource, which checks the bounded opening and terminal context
- Existing review interface must expose the removable choice; this candidate introduces no new interface

Do not use terminal-named-pull-by’s 2355 preceding-star guard. This composite’s event and return are a separate contract.

## Why terminal preparation is .75 count

The generic 8-count stance rule prepares during the last2 counts and distorts the current-neighbor left gate at 63. A .5-count preparation preserves the gate but the superposed actual roots reach 2.10 units/count, above the normal validator budget 2.

The scoped .75-count preparation starts at 63.25, after the exact old-neighbor gate at 63. The old left hand releases by63.5. Anticipatory next-neighbor right-hand acquisition occurs only later; no wrist is owned by two contacts. Current-neighbor binding stays unchanged until the source boundary 64. The actual next-opening 1.10-spacing stance is reached continuously. No beat or extra figure is inserted.

## Evidence and limits

Tests:

- Production-tree isolated primitive/source-helper tests: 5 passed
- Production-tree TypeScript check passed
- Copied-tree TypeScript check passed
- Staged actual-source/import/archive/finite-period/old-family regression suite: 9 passed
- Actual 3496 covered all 2–12-couple sets and their complete 2N periods: 154 repeats, every other-couple encounter, top/bottom same-end wait, role exchange, reentry and physical left-limit loop closure
- Exact named gates at 61 and63, continuous right-hand balance→pull ownership at 60, sole progression boundary 64, source/archive mutation rejection, capability-disable rejection and title/ID independence
- Established 24, 410, 1450, 2355, 2964 trajectories identical with candidate gate enabled/disabled for 2, 3, 6, 12 couples over complete periods

Measured primitive: minimum clearance .661281; maximum speed 1.400892; maximum yaw rate 3.272492; maximum fully-held hand reach .623177.

Measured whole-source finite runs: minimum root clearance .511532; square-through phase minimum .666446 at quarter-count sampling; maximum actual final-phase speed 1.965256 at .025-count sampling; boundary root jump 1.92615e-6; boundary yaw jump 5.89049e-7.

These are sampled root/contact tests, not continuous collision certificates, articulated-mesh validation, biomechanical approval or teaching-safety claims. Existing prefix movement limits remain unchanged. The final production packet passes14/14 tests plus TypeScript, including all2–12 finite sets. Independent129 direct and53 public/source adversaries reject malformed descriptors and archive drift; rejected getters never execute. The shared plain-data capture helper is reused without changing its implementation. Native primitive maps must have the ordinary Map prototype and no own overrides; their endpoint records are captured before validation. Source clocks must preserve exact representable phase deltas. Final embedded offline Ready playback, scoped release tests and build/server checks remain required before publication. Historical dense limb tests remain available and were not rerun for this root/contact change.
