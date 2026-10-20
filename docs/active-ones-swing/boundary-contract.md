# Current-ones terminal swing boundary

## Scope

`compileActiveOnesSwingStep(figure, context, incoming, declaredRank?)` is one local eight-count consumer. It owns only the current ones' persistent-partner swing and the disclosed waiting convention for the twos. It does not choose a dance by title, source ID, whole-table signature, global couple number, initial dancer direction, role, or physical north/south row. It does not change relationship bindings or execute the progression event.

The literal lead sources are retained snapshots of [1036](https://contradb.com/dances/1036) and [2141](https://contradb.com/dances/2141). Their terminal eight-count source rows explicitly name the ones and the next-couple/next-neighbor exit. Source 1036 literally adds down-facing. Source 2141's next-neighbor facing follows the current directed rank, without adding an unstated world-down qualifier. Source 3361 has an independent opening-ring blocker and is not complete-source evidence for this boundary. The unrelated all-partner traveling swing in 3310 is outside this contract.

## Input and ownership

- Figure: `kind:'swing'`, `who:'ones'`, `beats:8`, `exit:'face-down-line'|'progressed-neighbors'`, `progression:true`; no invented entry qualifier or extra motion modifier.
- The complete immutable `SequenceBoundary` supplies actual roots, facing, all four actor identities, current partner/neighbor maps, source clock, relationship epoch and raw held contacts.
- `FigureContext.minorSetRanks` supplies `{relationshipEpoch, ones:[id,id], twos:[id,id], forwardDirection:1|-1}` derived once from the epoch-start directed couple ledger. The two declared subsets must be disjoint, exhaustive persistent-partner pairs at that same epoch.
- An isolated caller can supply rank as the fourth argument. If context also contains rank, both declarations must agree, regardless of pair-array ordering. Neither declaration can silently override the other.
- Plain-data capture rejects accessors, hidden fields and programmable payloads. Inputs are captured once and plan metadata is frozen. Sampled positions and contacts are fresh caller-owned data.
- Incoming hands must be released. Every raw held edge above the shared boundary's numerical-zero tolerance of 1e-9 is rejected rather than filtered or discarded.
- The measured roots must form two transverse partner rows, with half-width 0.65–1.2 and row gap 1.1–2.2. The geometry validates the declared input; its row signs never select the active rank.

Both sources have already placed the current ones on the progressed south row at count 56. Their actual complete-source long-lines endpoint faces across. The earlier truncated 56-count inspection applied the old compiler's terminal-facing convention because long-lines had become its final figure; that down/up yaw was not a reliable full-source ingress. The tests now extract the actual count-56 boundary from the unchanged complete source and consume its across-facing yaws continuously.

## Disclosed animation convention inside the source's eight counts

| Local count | Roots, facing and hands |
| --- | --- |
| 0–1.25 | Only the named ones close radially from their measured across-row roots to the existing 0.31 swing radius and turn continuously into the standard 60-degree frame facing. Reach-gated contacts begin after count 1 and are fully held at 1.25. |
| 1.25–6.5 | The named pair makes one clockwise 2π revolution around its measured, fixed row center. Root gap remains 0.62. The ordinary joined/back/upper-arm frame has the same hand/body targets as the established swing kernel. Its three contacts fade over 6.25–6.5. |
| 6.5–8 | Released ones return smoothly to their exact incoming, already-progressed roots and requested exit facing. Twos retain every root and turn in place toward their opposite next-neighbor direction during this same 1.5-count interval. |

The twos have no swing frame or orbit. Retaining their places and preparing their next-neighbor facing is an explicit schematic waiting convention, not a quotation of an unstated source command. No additional travel occurs at count 64. The successor wrapper alone performs the separately source-bound topology event at 64.

This uses the current standard asymmetric frame, not the unreviewed reciprocal-blade preview. Contact strength uses the established 0.68 shoulder-reach envelope and 0.035 transition width; every positive raw target is physically within that reach. The kernel makes no body-mesh collision-certification claim.

## Local proof and limits

Five focused tests cover both actual complete-source ingress boundaries, exact clock/epoch retention, root/facing joins, named-pair turn and hand ownership, inactive occupancy and release-facing, stale/missing/conflicting rank rejection, source-schema rejection, actual geometry rejection, and immutable-input/output isolation. One translated/rekeyed/re-ranked synthetic activates the north row with epoch 9 and forward direction −1; reversing the carried rank activates the other persistent couple, while a conflicting duplicate declaration is rejected.

Observed for each lead source at 257 local root/contact samples:

- Minimum root separation: 0.62
- Minimum active/inactive root separation: 1.70246377
- Maximum root speed: 0.708 units/count
- Maximum yaw rate: 2.61799387 radians/count
- Maximum positive-contact shoulder reach: 0.677202
- Named-pair winding: 2π
- Full three-edge frame from 1.25 through 6.25; all hands released by 6.5

Analytic conservative bounds are also exposed on the plan, including the inactive final-facing turn for arbitrary supported incoming yaw. Geometry alone does not determine active rank or next-neighbor direction. Complete 3/4-couple finite-period, changing-rank and endpoint proof belongs to the shared core integration evidence; it is deliberately not duplicated here.

Run the focused checks from the application root:

`node --experimental-strip-types --test src/active-ones-swing-step.test.ts`

`node --experimental-strip-types test-data/active-ones-swing/capture.ts`

`node_modules/.bin/tsc --noEmit`
