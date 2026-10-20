# Bare arch / same-role pull-by carried boundary

## Scope and APIs

- `src/bare-arch-step.ts`: `assertBareArchFigure`, `assertRolePullByFigure`, `compileBareArchStep`.
- `src/role-pull-by-swing-step.ts`: `compileRolePullBySwingStep`.
- Both compilers take `(figure, FigureContext, SequenceBoundary)` and return an owned `SequencedMotionPlan` with independently captured `entryState` and `exitState`.
- Public admission uses the shared state-carried registry and `stateCarryingArchPullBys` gate. Neither compiler receives a title, source ID, full prefix, or complete dance row list. Legacy arch and pull primitives are unchanged.

## Exact local contracts

The explicit bare-arch declaration is `box-the-gnat`, four counts, current `partner` or `neighbor`, right hands, robin under, `entry:'paired-sidelines'`, `exit:'paired-sidelines'`.

Its incoming boundary must retain four actual standard longways corners (1.8-unit width and paired gap), with the named arch pairs already on their sidelines. Actual facing is retained, then turned toward that same named person. Existing raw held contacts are rejected, including low-strength contacts. The first of the four source counts physically closes from 1.8 to 1.10 and smoothly acquires reachable right hands. The unchanged arch primitive owns the remaining three counts and expands into the exact exchanged original slots. It finishes facing the same named person with released hands. This 1+3 internal allocation is a model convention; the source still declares only four counts, with no inserted balance or source subdivision choice.

The following passage declares larks or robins, left hands, and exactly two or four counts. Its existing named-pull spatial curve physically exchanges those same-role actors' exact entry slots; other roots remain stationary. Its immediate ordinary named partner/neighbor swing determines only the receiver-facing endpoint. Actual swapped roots must put each receiver on the same sideline. The passage finishes with no contact, and the established swing owns its own subsequent acquisition and all its own source counts.

Both steps retain persistent actor/couple identities, reciprocal current relations, relationship epoch, literal source clock, actual roots/facing, and raw hold state via `ownSequenceBoundary`, `capturePlainData`, and `assertSequenceHandoff`. Shared schema/ownership tests remain the authority for malformed plain-data cases.

## Motion certificates and caveats

No default primitive budget, old trajectory, or source count changed. The two-count diagonal same-role path is explicitly admitted with a local maximum-speed certificate of 1.70 units/count instead of the primitive's default 1.65. Its measured peak is 1.68555854, with root clearance 0.70 and yaw rate 5.99956930. This is an explicit 2.16% overrun of the old speed certificate, not a retiming or hidden extra count. Four-count passages retain the default 1.65 certificate and measured speed 0.84277933.

The new bare arch measured minimum root clearance 0.52, maximum speed 1.16387883, and yaw rate 1.27707018 on the ordinary opening boundary. The tests check continuous ingress/arch roots and facing, reachable hand targets, released endpoint holds, and named crossing gates. These are sampled whole-motion checks, not an anatomical or teaching-safety certification. No limb styling was added.

## Acceptance evidence

- `src/bare-arch-sequence.test.ts`: five local tests, including both literal pull durations, exact named corner swaps, the later partner-box/robin-pull/neighbor-swing arrangement, incompatible actual geometry/receiver/live holds, captured ownership, and unchanged established four-count pull path/contact parity.
- `src/bare-arch-sequence-source.test.ts`: actual retained sources 1098 and 115 through full periods at representative three- and four-couple sizes; strict carried proofs preserve counts, roots, raw holds and relations; every figure seam checks continuous roots/facing; quarter-count samples remain finite; all complete-period poses/contacts return exactly.
- The same public compiler also accepts an independent 72-count rearrangement with long lines before the first bare arch. The new ingress consumes that producer's actual facing and its source beat 8.
- Source 1098 uses N-box4 / larks-left2 / P-swing10 and existing later square units. Source 115 uses N-box4 / larks-left4 / P-swing8 and later P-box4 / robins-left4 / N-swing8. No source-specific compiler exists.
- `focused-results.log`: new local tests plus existing arch, named-pull and shared boundary regression tests.
- `source-period-results.log`: terminal actual-source and synthetic full-period results.
- `typecheck-results.log`: TypeScript validation. Core/source owners maintain their separate public-gate, archive, old-route parity and aggregate evidence.
