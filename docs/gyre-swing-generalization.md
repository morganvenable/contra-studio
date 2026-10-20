# Across-set gyre into swing: next shared contract

Investigation, 20 October 2026. This is an implementation proposal, not a Ready
admission or a registered motion adapter. No choreography or progression has
been changed.

## Actual failure and measured incoming state

Retained ContraDB source 3506, *Our Friend Joan*, starts with an eight-count
neighbor gyre, then a robin-led eight-count half hey (left shoulders in the
center, right on the ends). Explicitly selecting neighbor sideline pairs and
the neutral opposite-stations exit resolves the hey. Its note, “adapted from a
found 2016 version of the dance,” can be reviewed as provenance. These choices
resolve all eight source rows, but the runtime fails at the following partner
meltdown swing, reviewed as four counts of right-shoulder gyre and twelve of
swing. The source does not supply that subdivision; it remains removable.

A direct probe executes the preceding gyre and neutral hey using actual initial
poses and current relationship maps. With local group center (0,0), half-width
.9, row spacing 1.8, and actor IDs 0=Lark A, 1=Robin A, 2=Lark B, 3=Robin B:

| Actor | Half-hey exit x,z | Partner-gyre exit x,z |
| --- | --- | --- |
| 0 | -.9, +.9 | -.31, +.9 |
| 1 | +.9, +.9 | +.31, +.9 |
| 2 | +.9, -.9 | +.31, -.9 |
| 3 | -.9, -.9 | -.31, -.9 |

Partners are (0,1) and (2,3), neighbors (0,3) and (1,2). The gyre preserves
pair centers (0,+.9) and (0,-.9), performs the declared complete right turn,
and closes each pair to .62 separation. The existing gyre primitive accepts
this geometry: sampled minimum clearance .62, maximum speed 1.109384,
maximum yaw rate 1.994662. Its final facing is toward the partner plus pi/3,
as in the existing swing preparation. These are root/facing samples only.

Failure is in `gyre-adapter.ts` when it constructs the following swing through
`compilePrimitiveFigure`: that primitive requires the named pairs already
on sidelines. The four-count gyre itself is geometrically supported. Do not
move its centers, add an extra quarter turn, change the hey's exit permutation,
or loosen the sideline assertion to hide this mismatch.

## Required shared swing contract

The new operation must consume two actual released, opposite-role pair frames
at across-set centers, with explicit partner or current-neighbor relationships,
a matching epoch, finite positions and actual facing. It must preserve actor
IDs, both relationship maps and the epoch. The incoming .62 separation and
facing are measured requirements, not coordinates to snap dancers onto.
Contact acquisition belongs to the reached swing entry and must name the same
people. Both swinging pairs must remain separated during their complete paths.

A conventional side-by-side swing exit needs one couple on each sideline,
lark on the left when facing across, and the selected relation still paired.
A general adapter must explicitly define which sideline each pair reaches.
One candidate removable choice is the lark's entry side. For this example its
exit would be 0=(-.9,-.9), 1=(-.9,+.9), 2=(+.9,+.9), 3=(+.9,-.9), facing
across. The opposite assignment also satisfies the immediate pairing and
role-order constraints. Therefore source wording plus immediate successor
alone does not yet prove this choice; it must be recorded as a convention and
validated through the complete source period before implementation/admission.

The source's next figure is **larks gyre left shoulders one-and-a-half**, then
neighbor swing, balance/petronella, ring balance and a four-count progressing
pass through. It is not a circle. After a legitimate partner swing exit, the
larks' odd half-turn swaps their stations and should put each beside the
current neighbor. Complete odd/even finite periods must additionally prove
the terminal progression, waiting ends, reentry and closure. No rebinding is
allowed within the gyre or swing. A successor cannot silently choose or move
an earlier endpoint.

## Contrasting retained sources and payoff

The local snapshot query found 279 literal meltdown-swing rows. Only four
improper sources have an immediately preceding unqualified role-first half hey:

| Source | Relevant contrast | Additional current blockers |
| --- | --- | --- |
| 3506 Our Friend Joan | Neighbor gyre, robin-first left-center half hey, partner meltdown | Across-set swing acquisition/exit described above |
| 1318 Another Smooth Bluesy Dance | Full right circle before the same hey shoulder pattern | Ricochet hey, final twirl/progression and movement prose |
| 3240 Inside Joke | Neighbor star-through before lark-first left-center hey; partner meltdown then circle left three places | Star-through, next-neighbor qualifier and movement prose |
| 3253 Neuroplasticity | Lark chain to neighbors before lark-first half hey | Lark-chain wording and final progression |

This is four structurally related candidates, not four unlocked dances; 3506
is the only one in this exact cohort currently resolved except for this motion
boundary after explicit choices. Existing same-sideline gyre/swing routes must
remain guarded and unchanged. Source 3260 is a useful contrasting admitted
neutral-hey path: it follows its hey with a chain, so requires no across-set
swing and does not establish this missing contract.

## Reproduction and next implementation gate

Ignored local probes: `research/contradb/hey-next-endpoints.mjs` executes the
actual prefix and accepted gyre; `hey-next-stack.mjs` reproduces the swing
failure; `hey-next-contrast.mjs` queries the four-source cohort. No network
retrieval, source archive regeneration, GPU or audio checks were performed.

Next establish the explicit side-choice convention and test a new standalone
swing adapter against the measured frame, translated frames, changed actor IDs,
changed current-neighbor bindings, stale epochs and held-contact rejection.
Verify no slot reset, continuous roots/facing, contact reach and inter-pair
clearance throughout all twelve source counts. Only then integrate the shared
registry and test 3506 through complete three-/four-couple periods. Do not add
a runtime source-ID, title or whole-sequence dispatch.


## Primary-resource check and endpoint counterexample

Browsed 20 October 2026. The [current source page](https://contradb.com/dances/3506)
and [the choreographer's own Tapestry program](https://contradb.com/programs/986)
repeat the same sequence and adaptation note; neither names a swing-facing exit.
No separate 2016 original was found in the targeted search. Caller Colin Hume's
[ballroom-hold teaching](https://colinhume.com/dtpositional.htm) explains how
opening the joined hands preserves each dancer's left/right position. It does
not supply the missing hall-facing direction for this particular choreography.
These references support keeping role order, not inventing a sideline destination.

A discrete four-actor endpoint audit now tests both sideline assignments and
both row-facing alternatives. Row-facing swings preserve the actual gyre pair
centers, avoiding unsupported center translation. After swapping the larks for
the literal one-and-a-half left gyre, completing the neighbor swing in the same
orientation, rotating one petronella station and passing along the hall:

| Both swing exits | Neighbors ready for along-hall pass? | Terminal result |
| --- | --- | --- |
| Sidelines, lark-entry side | No | Couples split across different logical rows |
| Sidelines, opposite side | No | Couples split across different logical rows |
| Top/bottom rows, facing inward | Yes | Original couple rows, opposite columns |
| Top/bottom rows, facing outward | Yes | Exchanged couple rows, opposite columns |

The last option initially looked promising in manual reasoning, but the executable
permutation check disproves ordinary improper repeatability: its columns are
reversed. That is not a motion failure to solve with smoother paths. None of these
four conventional endpoint choices establishes a valid whole-dance interpretation.
`research/contradb/hey-next-permutations.mjs` records the actor coordinates and
asserts these negative results; it does not certify continuous motion or finite
ends. It uses the currently implemented neutral half-hey station permutation,
which should also be independently compared against the intended hey variant.

Do not ask Morgan merely which of the first two sides looks better: both fail the
remaining source sequence. The meaningful unresolved question is whether the
retained adaptation omits a change of formation/facing/crossing, or whether its
hey intends a different endpoint convention. A verified source explanation or
an explicitly corrected choreography is needed before this becomes a release
candidate. Keep the retained source literal. Meanwhile prioritize already verified
whole-dance candidates and the separate omitted-chain-receiver cohort; those do
not depend on this unresolved swing interpretation.
