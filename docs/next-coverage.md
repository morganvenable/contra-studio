# Next coverage milestone: event-based heys and Becket topology

Prepared 18 October 2026. This is an implementation plan and isolated syntax/topology fixture set. It does not register new production figures or claim the current renderer supports these dances. The existing engine remains untouched.

## Recommended sequence

1. Build a four-person hey pass-event adapter in isolation, including shoulders and real end loops.
2. Enable Hay in the Barn only after both its three-pass and final-partial-pass half heys pass geometry and endpoint tests.
3. Add a Becket layout/boundary adapter and timed shift with mid-cycle neighbor rebinding; then enable Butter.
4. Add tested right-and-left-through and pass-through adapters; then enable Centrifugal Hey. It is also a useful independent full-hey oracle before its whole dance is playable.

The first two demos were a foundation, not arbitrary-record coverage. This milestone adds two fundamentally different capabilities rather than merely more dance names.

## Three real records

### Hay in the Barn, Chart Guthrie, #10482

The source’s canonical title is “Hay in the Barn”; several other collections use “Hey in the Barn.” Improper, single progression. Source clauses are preserved in `callersbox-10482.json`.

- A1: neighbor balance 4, swing 12
- A2: chain to partner 8; half hey 8 with events `WR;NL;MR`
- B1: partner balance 4, swing 12
- B2: chain to neighbor 8; half hey 8 with events `WR;PL;MR;NL~`

The two half heys are not interchangeable. The first ends ready to balance a partner; the second has a final incomplete neighbor-left passage and exits toward new neighbors. [Source record](https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10482)

### Butter, Gene Hubert, #10320

Becket, clockwise, single progression. Source in `callersbox-10320.json`.

- A1: shift left 2, circle left three quarters 6, neighbor swing 8
- A2: long lines 8, chain to partner 8
- B1: full hey 16 with events `WR;NL;MR;PL;WR;NL;MR`
- B2: partner balance 4, swing 12

Its full hey lists seven events. Adding an eighth partner-left pass changes the specified exit. The progression happens at the start through the shift. [Source record](https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10320) · [Independent transcription](https://www.cambridgefolk.org.uk/contra/dances/gene_hubert/butter.html)

### Centrifugal Hey, Gene Hubert, #995

Improper, single progression. Source in `callersbox-995.json`.

- A1: neighbor right allemande 1¾ in 8; larks left allemande 1½ in 8
- A2: full hey 16 with events `PR;WL;NR;ML;PR;WL;NR;ML`
- B1: partner swing 16
- B2: right-and-left-through with partner 8, circle left three quarters 6, neighbor right-shoulder pass along 2

This challenges an adapter that assumes every hey begins with robins in the center. Its first event is partner passes and its center passages use left shoulders. Keep whole-dance playback blocked until its additional adapters and incoming A2 geometry are independently verified. [Source record](https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=995)

## What the source notation actually guarantees

A four-person half hey may list three or four passages; a full one may list seven or eight. A trailing tilde marks a final passage that stops shoulder-to-shoulder. The glossary permits different starting formations. These are meaningful differences, not parser noise. [Hey specification](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#hey)

Becket places partners together on a side. Clockwise progression uses the dancers’ left, and “shift” moves a couple until it faces the next opposite couple. [Formation](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#becket) · [Shift](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#shift)

## Required production schema changes

Replace the literal formation field with a descriptor, retaining the original source:

```
FormationSpec {
  family: "duple-minor",
  arrangement: "improper" | "becket",
  circulation?: "cw" | "ccw",
  roleOrder: "lark-left-robin-right",
  entryPhase: "before-first-figure",
  boundaryPolicy: "improper-single" | "becket-shift-single"
}
```

Do not silently map CCW, indecent Becket, or special FormationDetail variants into ordinary CW. A generic Becket flag without direction and role order is insufficient.

A figure’s `direction` currently conflates body-turn direction, movement direction and hand. Separate them: `hand`, `shoulder`, `rotation`, `travelAxis`. Keep `beats` and explicitly represented fractions. Add:

```
HeySpec {
  axis, orderedPasses: [{selector, shoulder, completion}],
  entryFormationConstraint,
  exitConstraint: {sideMembership, facingTargets, partialPassGate?},
  timingPolicy: {sourceTotalBeats, inferredEventGates, reviewed}
}
TopologyEvent {
  beat, kind: "rebind-neighbors" | "enter-wait" | "change-side" | "reenter",
  actors, oldEpoch, newEpoch
}
RelationshipRef { kind, ordinal, bindingEpoch }
```

Bind relationships to a known epoch. Butter’s neighbor swing uses the neighbors established *after* its shift, not whomever faced the couple before beat zero. A future N2 expression must never resolve merely by nearest Euclidean distance.

The compiler must compile successive snapshots of topology; the current fixed `groups` array for an entire cycle is insufficient. Figure plans should return `nextTopology` and exit pose constraints alongside trajectories. Derive final facing from those constraints, not a hand-authored `progression: true` decoration on one catalogue card.

## Hey topology contract

`hey-contract.ts` implements only a restricted, inspectable syntax and event graph. It is not a motion implementation and is deliberately outside `app/src`.

For the ordinary variants selected here, same-role events swap the two center actors. Relationship events are two simultaneous side passages. The two actors currently at ends make banking loops while the centers pass. Event phases alternate. Every event resolves to stable IDs before geometry is generated.

A useful one-dimensional staging order is `[outer-west, inner-west, inner-east, outer-east]`. This is logical adjacency, not a claim that all four bodies must initially stand on one line. Entry adapters transform a facing-couples formation into the first pass gates within the source’s allocated beats.

Standalone event oracles:

- Hay A2: entry `[L2,R2,R1,L1]`; `WR` swaps centers; `NL` swaps both side pairs; `MR` swaps centers. Exit logical order `[R1,L1,L2,R2]`: every dancer has crossed, and partners are together on opposite sides.
- Hay B2: entry `[L1,R2,R1,L2]`; after the first three events order is `[R1,L2,L1,R2]`. The last `NL~` involves pairs `(R1,L2)` and `(L1,R2)`, but must not produce a completed slot swap. It produces a shoulder-to-shoulder gate requiring the progressed-improper exit adapter.
- Butter: entry `[L2,R2,R1,L1]`; the seven events preserve each couple’s original side membership. Do not add an eighth event merely to restore linear staging order; the actual exit is a two-dimensional partner-balance-ready formation.
- Centrifugal standalone hey: entry `[R1,L1,L2,R2]`; the first `PR` is two side passages, followed by center `WL`. Eight events restore this staging order. This tests event semantics; matching the actual preceding allemandes to this entry geometry remains a separate integration test.

For Hay’s full-dance checkpoint constraints, use corners NW, NE, SE, SW with top of hall north. Side membership is the only asserted half-hey intermediate where exact exit geometry remains unresolved:

| Checkpoint | Occupants |
|---|---|
| Initial | R1,L1,R2,L2 |
| Neighbor swing | L2,R2,L1,R1 |
| Chain to partner | L2,R1,L1,R2 |
| A2 half hey, ready for partner balance | West side contains L1/R1; east side contains L2/R2. Exact corner/facing exit must be solved and reviewed. |
| Partner swing | L1,R2,L2,R1 |
| Chain to neighbor | L1,R1,L2,R2 |
| B2 partial-pass exit | L2,R2,L1,R1 |

The final row is the same progressed-improper slot permutation as the original Baby Rose oracle. Intermediate hey paths, shoulder clearances and exact exit orientation still require independent review; an endpoint table alone cannot validate a hey.

## Trajectory construction, not a generic wiggle

Construct explicit pass gates and end-loop gates, then fit smooth paths with tangent continuity. For a scheduled pair, the passing center and local forward vectors determine shoulder clearance. At the closest pass, the other dancer must lie on the requested side of each actor’s forward vector. With x across and z down, someone moving +x has their right side toward +z. This signed-side invariant catches mirror-image errors that endpoint permutation tests miss.

Each actor must actually pass the named person in event order, with no extra unscheduled close passage. At each center passage, end actors execute U-shaped banking loops with a forward tangent rather than standing still, snapping yaw, or rotating in place. No hand contacts are emitted for these no-hands heys.

Use arc-length walking and bounded velocity/acceleration. Model shoulder and pelvis orientation separately. Feet should continue stepping through loops and follow root speed. Contact, pose and stylistic turn choices are downstream of correct root paths.

Source counts specify the whole hey, not exact timestamps for every pass. A reviewable initial timing policy can place ordinary successive pass gates around two beats apart, reserving the remaining time for the specified entrance/exit. For three-pass half heys or seven-pass full heys, the remaining two beats are not an invented extra pass. Mark gate timing as an animation interpretation and validate that no actor requires impossible speed.

Partial final passages need an explicit exit solver. Finishing shoulder-to-shoulder is a geometric constraint with two opposite headings and a shared longitudinal pass coordinate, not merely “half the distance to an arbitrary endpoint.” For Hay B2, solve this together with the known next-neighbor/progressed-improper target slots. If those constraints cannot be met continuously in eight beats, refuse rather than snap.

## Becket layout and progression

Adopt x across the set and z down the hall. At a conventional inward-facing side couple, the lark is on the dancer’s left. On the east side the lark therefore has larger z than the robin; on the west side the lark has smaller z.

For CW shift-left, east-side couples move in +z; west-side couples move in -z. If same-side couple centers are spaced by 2·ROW_GAP, each side shifts one ROW_GAP so the two moving streams meet their new opposites. Both members retain their internal side-by-side relation during the shift. Rebind minor sets and neighbors only when the timed shift has reached its new encounter geometry, before the circle starts at beat 2.

At a finite set end, an unmatched couple enters a boundary state. It waits and moves across the *same end* to the other sideline, keeping its partner and restoring conventional inward-facing role order. On a subsequent shift it rejoins the other stream. This is not a top-to-bottom wrap and is not the current improper role-swap-in-place rule.

Starting exactly as Butter is written means the initial shift can put end couples out on the first round. Do not skip that first shift merely because callers sometimes do so in practice; any skipped first progression must be an explicit, separately labeled interpretation. Test both even and odd couple counts and ensure no cumulative drift of the set’s center.

Within each post-shift group, the circle, neighbor swing, long lines and partner chain can reuse adapters only after checking their actual relationship preconditions. The full hey returns partners to their original side for the final balance/swing; it does not itself cause the Becket progression.

## Acceptance gates

Before enabling a new source record:

- The entire clause parses, including every pass token and final tilde.
- Named-pair event order and handed shoulder clearances pass at dense sampling.
- No torso crossings, hand inventions, identity swaps, yaw snaps or velocity discontinuities occur.
- Whole-dance checkpoints match stable ID/partner/role mappings, not just anonymous occupied slots.
- At least one complete down-and-back finite-set journey is tested with 3, 4, 5, 6 and 8 couples.
- Imported and bundled content-equivalent forms produce equal root positions, facing and contacts; IDs/titles are not dispatch keys.
- Unknown hey forms, diagonals, future neighbors, ricochets, dolphin heys and with-hands variants remain blocked until their own adapters exist.

Five isolated event-contract test groups pass. They prove token preservation and the restricted adjacency transformations only. They do not prove 3D choreography or authorize new production playback.
