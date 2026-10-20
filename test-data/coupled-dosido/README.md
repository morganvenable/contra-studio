# Reusable coupled full do-si-do boundary

## Bounded contract

`compileCoupledDosidoStep(figure, context, incomingBoundary)` consumes one owned
`SequenceBoundary` and returns a `SequencedMotionPlan` with inspectable named
partner units, measured offsets, source phases, anatomical gates, analytic
root-clearance and speed/yaw bounds. It does not inspect dance titles, source
IDs, the preceding figure, or a required successor. Its only source semantics
are the explicit figure fields:

- `kind: 'couples-do-si-do'`, `who: 'neighbor'`
- `unitRelation: 'partner'`, `unitHold: 'released'`
- `passingShoulder: 'right'`, `facing: 'fixed-room'`
- `amount: 1`, `beats: 8`, no progression

No entry tag, grip, contact, width reset, new binding, or topology transaction
is introduced. Incoming held hands are rejected, including small nonzero
contacts retained by the shared boundary owner. All actual root stations
return exactly; actor IDs, persistent couples, partner/neighbor maps, and
relationship epoch remain unchanged.

The accepted measured geometry is two equal-width partner rows with larks on
the left and robins on the right when facing the opposing unit. Half-width is
.65–1.2 and center gap is 1.3–2.2 root units. This is a geometric admission, not
a source-specific admission. Rotation, translation, arbitrary actor IDs,
context order, and source clock do not determine acceptance.

## Source and interpretation distinction

The retained ContraDB snapshots are `../contradb/624.json` (Cranky Ingenuity)
and `../contradb/1702.json` (Chicago Shuffle). Both contain the eight-count row
“neighbors do si do once as couples”. The literal preceding row in 624 is
“circle left 4 places”; 1702 begins with the coupled figure. The source-review
owner separately retains source-choice provenance and whole-source tests.

Primary references supplied and checked by the source-review owner:

- https://www.billolsondance.com/cranky: “(with partner) Do sa do Neighbors (as couples)”
- https://contralab.org/Definitions.html: facing couples move as units, robins
  pass right shoulders forward, the couples pass backs, then larks pass left
  shoulders while backing to the start

Neither specifies a grip. The released display is an explicitly reviewed
schematic model choice. Source counts, actor order, and complete return are
literal. The exact ellipse and within-count facing timing are geometric model
choices, not claims that the sources prescribe a lane radius or subdivision.

Root translation begins immediately and occupies all eight authored counts.
The actual incoming yaw approaches the opposing unit's starting row during
count 0–1 while roots are already moving. The remaining seven counts retain
that fixed room facing; the units never rotate as in a promenade. This is
reported as phases `[1,7]`, with the first phase named
`orientation-during-dosido`. The orbit itself has the complete 8-count clock.
An already oriented opening, as in 1702, needs no facing change.

## Finite-width geometry and continuous certificate

The partner offsets are measured once from the incoming roots and remain
room-fixed throughout. Let h be half the measured unit-center gap, w the
measured partner half-width, and L = w + .34 the unit-center lateral radius.
The two centers trace opposite ellipses with longitudinal radius h and lateral
radius L. For the ordinary inputs h = w = .9 and L = 1.24. Unit centers are
2.48 apart laterally at shoulder passage, leaving .68 between the two nearest
actual roots. No couple is treated as a zero-width point.

For each of the four cross-unit root pairs, squared separation has the form
4h²(1 − s²) + (2Ls + k)², where s = sin(angle) and k is the measured fixed
lateral-offset difference. Its minimum is evaluated at both endpoints of
s ∈ [−1,1] and at the interior quadratic vertex when present. Any accepted
small longitudinal offset residual is subtracted using the reverse triangle
inequality. The two within-unit separations are measured directly. The
reported minimum is the least of all six pair bounds. Admission requires at
least .62 throughout, not merely at named gates. A wide/shallow test exposes
an interior minimum below its .68 shoulder clearance.

The angular clock uses short C2 endpoint ramps and constant angular progress
between them. The root-speed bound is 2π max(h,L) / (8 × .88); the yaw-rate
bound is the largest actual preparation turn times 1.875 per count. These are
root-level geometric bounds. This packet does not claim a detailed limb or
mesh collision study.

## Actual producers and gates

The isolated 624 evidence compiles the existing ordinary full left-circle
primitive and samples its actual endpoint at source beat 8. It checks the
retained ingress probe, preserves the inward yaws, and verifies raw ring
contacts have eased from nonzero near completion to zero at the boundary.
The isolated 1702 evidence uses the actual ordinary improper opening poses
and persistent partner/neighbor maps at source beat 0.

Both have the following relative gates with actual actor IDs and poses:

- 2.24: robins pass right shoulders; first-count orientation is already over
- 4: opposing units are back to back with fixed facing
- 5.76: larks pass left shoulders on the backward return
- 8: every actor returns to its exact incoming root station

In the 624 packet these absolute beats are 10.24, 12, 13.76, 16. In 1702 they
are 2.24, 4, 5.76, 8. Actual source producer measurements:

- Minimum root separation: .68; analytic lower bound .68 (roundoff only)
- Maximum root speed: 1.1066974121 root units/count
- 624 maximum yaw rate: 1.4726215561 radians/count
- 1702 maximum yaw rate: 0
- Maximum measured within-unit offset drift: 2.3e−16

## Verification and scope

`src/coupled-dosido-step.test.ts` checks both actual producers, full source
clocks, role-specific shoulders, backs, fixed facing, return, direct successor
handoff, unchanged identity/maps/epoch, independent renamed labels, translated
and rotated measured geometry, reordered arbitrary IDs, an unseen long-lines
producer, continuous all-root minima, held-contact rejection, incompatible
partner placement, stale epochs, unsupported figure modifiers, ownership,
accessor rejection, and unchanged existing individual do-si-do samples.

The artifact `isolated-evidence.json` is produced by `evidence.ts`. Its packet
is deliberately limited to the isolated boundary. Full 3/4-couple source
periods, finite ends, successor continuity in the full dances, and public
registration are owned by the shared integration work and are not claimed by
this isolated packet.

Checks run:

- `node --experimental-strip-types --test src/coupled-dosido-step.test.ts`
- `node --experimental-strip-types --test src/role-dosido-step.test.ts src/engine.test.ts`
- `npx tsc --noEmit`

See the adjacent logs and `frozen-sha256.txt` for the checked file set.
