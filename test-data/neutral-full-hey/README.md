# Neutral same-station full hey

## Local contract

`compileNeutralFullHeyStep(figure, context, incoming)` in
`src/neutral-full-hey-step.ts` consumes a measured `SequenceBoundary` and returns
a `SequencedMotionPlan` with its existing `PartialHeyTrajectory` evidence.

The declaration is a sixteen-count full hey (`amount: 1`), explicit starting
role, opposite center/end shoulders, `who: partner | neighbor` naming actual
sideline pairs, `entry: paired-sidelines`, and
`exit: same-slots-facing-across`. There is no progression on the hey. The public
route requires `stateCarryingSequences`, `stateCarryingFullHeys`, and
`ordinaryFullHeys`. The full-hey gate is now locally registered after the
independent runtime review. This records local registration, not deployment.

The adapter owns plain input data, checks the actual boundary against context,
and requires released incoming hands. It measures the incoming stations rather
than replacing them with a canonical spacing. The existing pass graph proves
eight complete alternating layers, twelve encounters, and the identity-return
permutation. The existing partial-hey kernel owns all sixteen counts, including
the initial and final connectors inside the first and last pass layers.

Output positions are each actor's exact original position. Output hands remain
released; west-side actors face east and east-side actors face west. Actor and
couple identities, partner/neighbor bindings, and relationship epoch are
unchanged. Only the source clock advances by sixteen counts. The adapter never
reads the successor, source title, URL, or dance-wide signature. Compatible
successors consume the shared boundary through the common registry.

## Literal source cohort

Retained public snapshots are owned by the source/import workstream in
`test-data/contradb/{975,1983,3214}.json`. `source-fixture.ts` invokes the normal
source review with `REGISTERED_MOTION_CAPABILITIES` directly; it does not
hand-author dance cards.

| Source | Predecessor | Literal hey | Successor |
| --- | --- | --- | --- |
| 975 | Partner swing, 10 counts | Robins first; right center, left ends; 16 counts | Robin chain to current neighbors, 8 counts |
| 1983 | Partner swing, 8 counts | Robins first; right center, left ends; 16 counts | Robin chain to current neighbors, 8 counts |
| 3214 | Neighbor balance 4 + swing 12 | Larks first; left center, right ends; 16 counts | Larks allemande left 1½, 8 counts |

The first two have pass tokens `WR NL MR PL WR NL MR PL`; the third has
`ML PR WL NR ML PR WL NR`. All three preserve their complete 64-count source
table. The two chain receivers are proven from the actual receiving-side roots
and current neighbor binding. Source 3214 retains its current table explicitly;
its comparative notes do not switch the hey/allemande to the cited right-hand
variant. Provenance/glossary treatment for 975/1983 belongs to source review.

## Full-width incoming-state measurement

The actual predecessors leave a 1.8-by-1.8 station rectangle. Earlier ordinary
hey tests primarily used 1.10-unit sideline pair spacing. Keeping full-width
incoming roots and the inherited gate times produces a sampled peak speed of
1.325014 scene units/count at local beat 1.05, about 1.9% above the old compact
adapter's 1.3 limit. This adapter alone uses a 1.35 speed budget; no root, count,
gate, or old adapter was altered to meet it.

The continuous kernel certifies maximum speed 1.348062, minimum root clearance
0.517406, and maximum yaw rate 3.752160 against budgets 1.35, 0.5, and 4. The
actual 3214 entry faces along the sidelines; that facing is carried into the
first connector and reaches the separately declared across-facing endpoint.
`full-width-probe.ts` and `full-width-results.jsonl` retain this measurement.
The probe's looser diagnostic budgets are not admission settings.

## Focused verification

- `src/neutral-full-hey-step.test.ts`: six tests for literal actor/shoulder
  order, exact station return, boundary ownership and guards, entry facing,
  translated measured dimensions, and an independent long-lines producer and
  consumer. Unknown or absent successors leave the neutral path identical.
- `src/neutral-full-hey-source.test.ts`: ten tests for literal source rows,
  current-table note retention, exact first-round actor pass oracles, actual
  current-neighbor chain receivers, and complete three- and four-couple finite
  periods for all three sources. Every hey/successor seam preserves roots,
  facing, released hands, source clocks, and epoch. A synthetic 80-count
  composition inserts long lines both before and after the hey and returns over
  its complete six-repeat period.
- `legacy-kernels.sha256`: byte-exact capture/check of `ordinary-full-hey.ts`,
  `ordinary-hey-handoff.ts`, `partial-hey.ts`, and `hey.ts`. Existing terminal,
  partner-balance, and partner-swing routes remain untouched.
- Focused legacy unit tests cover ordinary full hey, ordinary hey handoff, and
  the axis guard. The core owner separately runs public old-source parity.

This is a local root/boundary proof with representative odd/even finite periods.
It does not add an all-size dense sweep or claim a new articulated-limb audit.

Run from the app directory:

```sh
node --experimental-strip-types --test src/neutral-full-hey-step.test.ts src/neutral-full-hey-source.test.ts
node --experimental-strip-types --test src/ordinary-full-hey.test.ts src/ordinary-hey-handoff.test.ts src/hey-axis-guard.test.ts
sha256sum --check test-data/neutral-full-hey/legacy-kernels.sha256
npx tsc --noEmit
```
