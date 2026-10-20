# Six-count circle / two-count progression

Locally registered adapter for the source semantics in ContraDB 892, *After the Solstice* by Lisa Greenleaf, following independent source, finite-period, body and default-workflow review. The original seven-row snapshot is retained at `test-data/contradb/892.json`. Public execution requires `sixTwoPasses`; explicitly disabling that capability still rejects playback. This working-tree registration is not a deployment claim.

## Source and explicit choices

The source is 64 counts: neighbor balance/swing 16; long lines 8; larks allemande left 1½ 8; partner balance/swing 16; right and left through 8; circle left three places 6; pass through 2, with its original progression glyph.

Bare right-and-left-through is interpreted as right-hand crossing with current neighbors, then persistent-partner courtesy turns led by larks. Bare passage is separately interpreted as a released right-shoulder passage with current neighbors. Both choices are removable. The retained source's snapshot ID binds the physical policy, finite-end policy and source-explicit progression event. A different snapshot, source URL or omitted convention cannot inherit execution.

The compact physical convention is also an explicit removable choice:

- Whole-source half-width 0.72 and row gap 1.44; adults and fixed limb lengths are not scaled
- Long-lines forward amplitude 0.36
- The six-count circle contains a complete literal ¾ turn over 5¼ counts, then a ¾-count released preparation
- Circle radius gathers by at most 22%, using arc-length timing
- Preparation offsets are 0.24 forward, 0.30 into the right-shoulder lane and 0.04 outward
- The subsequent passage retains exactly two source counts
- Out couples wait four counts, exchange at the same physical end over eight counts, then wait; no extra re-entry interval or source beats

These are animation conventions, not wording attributed to the choreographer. The circle's three-place station permutation completes at count 61¼. The physical preparation at 62 is tested separately from that pure rotation. No current neighbor changes before the physical endpoint at 64.

## Modules and hard boundaries

`src/six-two-pass.ts` owns the prepared circle and terminal pass contracts. The pass requires the exact incoming prepared slots, named current-neighbor pairs, explicit shoulder, rigid hall frame and exact next-row destinations. It snapshots inputs and checks a 0.65 root-clearance / 0.85 speed budget. Its independently tested shoulder gates place the named current neighbor in the pass on the dancer's actual right.

`src/six-two-source-sequence.ts` applies the declared geometry throughout the source prefix, validates each actual incoming/outgoing figure, discovers the finite-state period and calls endpoint validation before rebinding. No source title or ID selects motion. The bounded grammar supports opening neighbor balance/swing or a complete eight-count neighbor do-si-do followed by an eight-count neighbor swing, and registered middle figures only when they really deliver the final geometry.

The existing four-count `ring-pass.ts` is unchanged. A two-count pass cannot enter it, and the generic ordinary compiler refuses the new circle-exit contract. Left-hand pull-by, extra turns, changed circle fraction, missing policies and other source qualifiers remain unsupported.

## Verification and fidelity limits

- All 2–12-couple finite periods: exact 64-count budgets, complete pair encounters, physical closure and continuous positions/facings at every source boundary
- Independent source corner oracle, full ¾ angular winding, declared preparation offsets, and actual right-shoulder geometry
- Public default registration, explicit capability withdrawal, removed policy, forged source evidence, malformed nested policies, frame invariance and input ownership
- Actual articulated Avatar: one footfall per source count, fixed 0.43 upper/lower legs and fixed 0.325 upper/lower arms
- Full three-couple finite-period rig probe: circle foot-reach correction at most 2.13 mm; pass at most 0.53 mm; other figure kinds zero. An additional six-couple endpoint sweep at 100 samples/count over counts 54–65 measures a 2.074 mm pass correction at count 63.44 for actor 10, separately bounded at 2.2 mm. These small prototype residuals are disclosed, not described as zero
- Full-strength circle, allemande, swing and RLT wrists meet their actual held targets to numerical precision after a source-local allemande reach fade. The inherited two-hand balance wrist residual remains approximately 4.15 mm
- Sampled whole-source long-lines, allemande, RLT, circle/pass and finite-end noncontact meshes are checked separately

The existing shared closed swing-frame styling still has supporting hand/forearm penetration, reported separately as an inherited limit. New-path acceptance does not classify that shared contact styling as collision-free. The compact allemande’s free right hand has an approximately 8.24 mm self-torso styling residual, separately bounded at 9 mm. The close-pass free forearm/self-torso styling also retains the existing approximately 20 mm limit. Mesh sampling is a regression test, not a continuous collision or physical safety certificate.

Run with the installed toolchain:

`node --experimental-strip-types --test src/six-two-pass.test.ts src/six-two-source-sequence.test.ts src/six-two-body.test.ts`

Importer/source/archive tests live with the ContraDB import suite. No dependency installation or publication is needed.

## Complete do-si-do opening: source 443

The bounded opening extension retains the nine source rows of *The Merry-Go-Round (Das Ringelspiel)*: neighbor do-si-do 8; neighbor swing 8; long lines 8; circle left three places 8; partner do-si-do 8; partner swing 8; long lines 8; circle left three places 6; pass through 2 with the original progression glyph. Both do-si-dos complete and return to their named starting slots. Only the last passage changes neighbors. The ordinary short inward swing connection and detailed footwork remain schematic.

`src/six-two-dosido.test.ts` checks the independent named corner sequence, all 2–12-couple finite periods, every couple encounter, finite-end placement, root/facing continuity and body-center separation. The established 892 route remains byte-identical over 5,635 independent full-period samples. No shared gait or arm-route change accompanies this extension.
