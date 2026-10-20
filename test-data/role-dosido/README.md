# Same-role do-si-do 1½: actual-state boundary evidence

## Scope

The new `src/role-dosido-step.ts` adapter handles one explicitly declared same-role right-shoulder do-si-do 1½ in eight or ten source counts. It consumes the common `SequenceBoundary`, carries the actual actors, persistent partners, current neighbors and relationship epoch, and exchanges only the two named-role stations. It does not inspect a dance title, source ID, previous figure, complete figure list or successor kind.

The shared registry selects it only for same-role amount 1½ behind `stateCarryingRoleDosidos`, now enabled in the local registered capabilities after independent runtime review. This status makes no deployment claim. The evidence helper uses `REGISTERED_MOTION_CAPABILITIES` directly rather than overriding that gate. All established full do-si-do paths, including the six-count larks do-si-do in #3115, remain unchanged. The legacy public `compilePrimitiveFigure` rejection for same-role do-si-do is unchanged too; the established public dance engine already had that full-return path.

## Retained literal sources

- [Rod's Grits, ContraDB #522](https://contradb.com/dances/522), Bill Olson. Snapshot `contradb:522:6eb84edaae9cbae3`. Its row 3 is “ladles do si do 1½” in **8** counts, beginning at count 24. Its actual producer is the state-carried RLT, with partner crossing and neighbor courtesy. Its immediate receiver is partner balance 4, then partner swing 12. The later promenade 8, circle 6 and pass 2 remain literal.
- [Back to Back to Back to Back to You (variation), ContraDB #3115](https://contradb.com/dances/3115), Mattie Rynkiewicz. Snapshot `contradb:3115:460e7f5f07d6e0d8`. Its row 3 is “ladles do si do 1½” in **10** counts, beginning at count 22. Its actual producer is the established six-count larks full do-si-do, after neighbor do-si-do 6 and neighbor swing 10. Its immediate receiver is partner balance 4, then partner swing 12. The later circle 8, ring balance 4 and pass 4 remain literal.

Neither retained page has movement prose requiring a source interpretation choice. “Right shoulder” is the existing conventional interpretation of unqualified do-si-do; the amount and row counts are explicit source facts.

## Local physical contract

- Incoming hands must already be released. Any positive incoming hold is rejected rather than erased.
- Actual four-corner rectangles are measured, never replaced. Admitted half-width is 0.65–1.2 and half-depth 0.55–1.1. The declared role must occupy opposite corners. Exchanging those two exact stations must put persistent partners together on the actual sidelines.
- The first **one source count** turns the active pair to the original opposite station with stationary roots.
- The next **six or eight source counts** trace the complete **3π** ellipse with fixed body facing: right-shoulder passage, back-to-back opposite stations, left-shoulder backward return, full original-station return, another right-shoulder passage, then the final half-exchange stations. The lateral radius is 0.34. Arc-length pacing avoids a large middle speed surge; short acceleration and deceleration stay inside this orbit interval.
- The last **one source count** turns all four toward their persistent partners with stationary roots and released hands. No swing hold is invented; the next balance or other compatible successor owns its own acquisition.
- This **1 + 6/8 + 1** allocation is a disclosed schematic animation convention within the literal eight/ten counts, not extra source choreography or an added timing choice.
- The opposite-role roots remain fixed throughout. Both relation maps and the old epoch remain unchanged; only the independently declared terminal progression can advance the epoch.

The adapter exposes immutable named-pair, six-gate, phase-count and endpoint diagnostics. Gate checks use the renderer's anatomical right vector `(-cos(yaw), sin(yaw))`. A complete winding proof is independent of the endpoint permutation, so a shortcut half exchange cannot masquerade as 1½.

## Focused verification

`src/role-dosido-step.test.ts` contains seven tests:

1. Actual #522 with three couples, all six finite-period repeats.
2. Actual #522 with four couples, all eight repeats.
3. Actual #3115 with three couples, all six repeats.
4. Actual #3115 with four couples, all eight repeats.
5. An unseen long-lines producer, translated 0.78 × 0.82 half-rectangle, epoch 9 and source clock 45.5, plus unrelated successor metadata. Exact input stations survive; the new adapter neither restores canonical roots nor matches a source suffix.
6. Independent right/back-to-back/left/full-return/right/half-exchange gates and fixed orbit facing, separate from partnerward completion.
7. Input ownership, stale epoch, held contacts, source-clock precision, wrong source counts/amount/role/shoulder, unconsumed modifiers, accessor rejection without invocation, and output-mutation isolation.

The representative 3/4-couple proofs cover all source boundaries, both internal facing/orbit seams, unchanged current-neighbor bindings, all couple encounters, waiting ends, exact source counts and complete finite return. Body samples are confined to the new do-si-do path. No all-size dense body or limb sweep was run.

Measured results from `source-boundary-evidence.json`:

- Minimum root clearance during the new figure: **0.68** across both sources and both representative set sizes, including inactive actors and waiting couples.
- Eight-count root speed: approximately **1.57 units/count**; ten-count approximately **1.18 units/count**. Conservative local pacing bounds are approximately 1.5793 and 1.1845.
- Peak facing rate: approximately **4.4179 radians/count**, confined to the explicit facing preparation/completion.
- Maximum sampled root difference across a source boundary at ±1e-7 counts: **5.77e-8**; facing difference: **5.90e-8 radians**.
- All 36 local group role-exchange proofs retain the old epoch and reach the released partner-facing boundary at source count **32**.

The model's analytic inactive-corner clearance bound is intentionally conservative: perpendicular distance from an inactive corner to the active diagonal minus the entire lateral radius. The exact source rectangles have a stronger active-pair minimum of 0.68; the bounded geometric admission is not a claim about full articulated-body styling.

Reproduce focused tests with:

```sh
node --experimental-strip-types --test src/role-dosido-step.test.ts
npx tsc --noEmit
```

`test-data/role-dosido/evidence.ts` produces the retained JSON through the same public source preparation, shared registry and finite sampler, not a separate source-shaped runtime. Core integration owns affected old-path parity and central capability/event negative tests. No changes were made to the immutable 0.31 release capture.
