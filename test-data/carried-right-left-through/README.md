# Carried right-and-left-through adapter

## Scope and ownership

This packet adds one local state adapter, `compileCarriedRightLeftThroughStep(figure, context, incoming, requiredExit?)`, and a pre-compilation applicability test, `needsCarriedRightLeftThroughEntry(incoming)`. The separate core/source owners register the adapter, interpret retained source clauses, and test full finite source circulation. No parser, registry, source recipe, presentation, or legacy binder file is changed by this packet.

Owned implementation files:

- `src/carried-right-left-through-adapter.ts`
- `src/carried-right-left-through-adapter.test.ts`
- The minimal opt-in `entryGeometry: 'measured-rectangle'` addition to `src/right-left-through.ts`

The incoming state uses the already audited owned-data `SequenceBoundary` capture and handoff seam. Actor identities, current relationship epoch, source beat, physical roots, facing and positive-strength incoming holds are retained. Wrong named crossing/courtesy relations, wrong leader slot, stale epochs, incompatible input holds and infeasible turning are rejected. There is no source-ID, title or complete-prefix recognition, and no try/catch fallback after semantic failure.

## Actual incoming states

The retained measured prefix evidence is `test-data/measured-six-two/prefix-results.json`:

- Literal340: source beat48, square half-dimensions .675, inward-facing, four strength1 clockwise right-to-left joined ring contacts. RLT names partner courtesy, lark leader, current-neighbor crossing.
- Literal682: source beat16, rectangular half-dimensions .9 × .55, tangent-facing full right-star release. Its four raw wrist-edge records all have strength0. The shared boundary normalizes these to a released state. RLT names current-neighbor courtesy, lark leader, persistent-partner crossing. The retained prefix report's earlier provisional RLT interpretation was wrong for those roots; the source owner separately reviews the star's `+` return-to-entry note and current source recipe. This packet does not claim source admission on its own.

Corner order [NW, NE, SE, SW], north=-z:

-340 entry [0,3,2,1], exit [2,1,0,3]
-682 entry [2,3,0,1], exit [0,1,2,3]

## Counted transition and explicit output

Without an output requirement, the adapter reflects the actual incoming rectangle through its center. An optional ordinary formation requirement `{halfWidth:.9, halfDepth:.9}` is explicit, owned, immutable and reported as `plan.requiredExit`. It does not purport to be source-author metric wording.

- Counts0–.5: retain the exact ring targets at entry and release their strength continuously. Released star input remains released.
- Counts0–2: retain incoming facing at entry, then turn continuously to the named across crossing. Root motion is already the crossing curve.
- Counts1.5–2: acquire the named right-hand contacts; both named right-shoulder gates occur at count2.
- Counts2–4: the existing crossing curve physically reaches the required opposite-side courtesy center, including any explicit change of across width.
- Counts4–7: unchanged conventional courtesy half-turn with both named holds.
- Counts7–8: unchanged-style courtesy reopening physically reaches the required final depth; holds release by7.2. No terminal snap or extra musical count is added.

For compact depth, the opt-in crossing shoulder radius is `min(.33, actualHalfDepth/2)`, balancing inner and outer gate spacing. The old default remains .33 with its original .7 entry-depth minimum and exact arithmetic. All plans still use the original positive root/speed/yaw budgets; no limb polish is added.

Measured independent3201-sample results for the explicit .9-square requirement:

| Incoming | Minimum root clearance | Maximum root speed/count | Maximum yaw/count |
| --- | ---: | ---: | ---: |
|340 | .6600000000 |1.0499999998 |1.2770701845 |
|682 | .5500000000 |1.0499999998 |1.9868866211 |

Those are sampled root/contact checks, not a full-body collision certificate. Schematic release targets remain the producer's actual targets during their brief fade. Ordinary, already-valid released/across entries delegate the old binder byte-for-byte. The applicability helper returns false for such entries even if their supported width differs from .9, so the registry can avoid imposing a new footprint on old paths.

## Validation

- `focused-results.log`:11 local tests passed, including actual340/682 measured entries, explicit .9-square output, contact release/acquisition, named gate identities, count and root/facing joins, a translated/reordered/relabelled synthetic rectangle with different current relationship geometry, wrong identity/epoch/hold rejection, snapshot ownership, and canonical old binder parity.
- `default-parity-results.log`:16 plans and10256 samples exactly match the pre-edit git-HEAD primitive, including positions, velocities, accelerations, facing derivatives, contacts, endpoint constraints, phase boundaries and metrics. `legacy-right-left-through.ts` is that baseline with only type-import paths adjusted for its evidence directory.
- `legacy-and-focused-results.log`: existing RLT primitive/binder/source integration suites plus the local suite pass. Existing old-source body regressions were rerun unchanged; no new body certificate is claimed.
- `typecheck-results.log`: `npx tsc --noEmit` passed.
- `manifest.sha256`: final implementation/test and evidence hashes.

Representative full-source odd/even finite closure and existing complete-source parity are owned by the core integration worker and deliberately not duplicated here.
