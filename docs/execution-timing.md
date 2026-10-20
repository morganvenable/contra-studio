# Execution timing exploration

20 October 2026. Morgan's reference is a four-count balance with two steps
forward on counts 1–2 and two back on 3–4. Dancers should prepare the next
action during the preceding phrase, rather than spend its opening counts
getting ready.

## Findings in the existing studio

- The prepared paired balance in `engine.ts` returns during local counts 2-3,
  then closes for the swing during 3.25-4. The initial audit called this
  "stealing" the backward count. Morgan clarified that the fourth planted step
  pushes the body inward toward the swing catch. An inward body path is not
  itself an error: the supporting foot and weight transfer must be represented.
- Forward/back wave balance in `wave-figures.ts` uses successive offsets
  `[0, 1, 0, -1, 0]`. It reverses each count. The requested two-forward/two-back
  rhythm requires a separate correction; right/left styling is not equivalent.
- An unprepared primitive swing gathers for 14% of its duration and acquires
  its frame over 20%. Longer figures therefore produce longer hesitation.
- Circle/star acceleration and deceleration each use 16% of figure duration.
  Several facing and contact changes also use duration fractions.
- Most boundary checks establish matching positions and contacts, but do not
  establish useful velocity through a compatible handoff.

These are implementation observations, not claims about all contra styles.
The prior release remains unchanged by the study.

## Interactive study

`timing-lab.html` compares two schematic pairs on one musical clock. It is a
synthetic balance/swing/preparation loop, not a retained dance, body simulation,
or replacement for the studio's choreography compiler.

| Parameter | Range, in counts | What changes |
| --- | --- | --- |
| Preparation lead | 0–1 | How early the next balance position and facing are ready |
| Transition duration | 0.25–2 | Time spent closing into the swing or opening for the balance |
| Response delay | 0–1 | How late the pair responds at the balance entry |
| Recovery duration | 2–8 | How gradually that pair catches up to the music |

The prepared balance has two forward foot placements and two backward foot
placements. During the late fourth count the rear foot stays fixed while the
body pushes inward toward the catch. Each support foot has a fixed world-space
position and heading; the other foot lifts and steps to its next contact. The swing
orbits immediately while closing. Both dancers share an execution clock; music
keeps its own fixed clock. Delayed execution is visibly behind that clock.
Profiles are deterministic under seeking; there is no random timing noise.
Sliders are exploration ranges, not physically validated dancer limits.

## Production integration

Do not apply independent per-dancer time offsets to the existing compiler.
They would split held contacts and could move relationship events before the
corresponding physical endpoint. Root motion, the scene's foot-target sampler,
and trails must all see the same executed trajectory; music and count markers
must remain on the musical clock.

The next implementation should repair one measured balance-to-swing family,
with planted stepping, fourth-step inward push, immediate swing travel, and
preceding preparation.
Use explicit count-sized entrance/exit ramps and hand-transfer windows, then
measure velocity continuity as well as position continuity. Carrying velocity
through compatible transitions is a separate control from response delay.
Only then extend profiles across other adapters.

Independent mistakes, missed steps, handhold negotiation and recovery between
dancers require a contact-aware interaction model. This study does not implement
those behaviors, nor does it change production buzzstep footwork.

## Foot-contact correction

The first timing lab attached decorative feet to the moving body. This literally
slid both feet; it has been replaced by independent world-space foot plans.
The study exposes support points, moving-foot lift and the fourth-step push.
This remains schematic and is not a force or full-body contact solver.

A separate production Avatar probe covered four balances in The Baby Rose,
Simplicity Star and Butter, dancer 0 in the second repeat: 496 sampled frames,
maximum planted-foot drift 1.11e-16, zero IK foot corrections. That limited check
found no stance slip. Production airborne feet still follow the root trajectory
with only 0.035 lift, which may look slippery; that needs separate visual work.
Do not generalize the lab's defect to all production gait.

## Simple buzz-step study

Morgan clarified that both inside right feet sit side by side, approximately
outside edge to outside edge, rotating about the same shared center. Each right
foot steps on every count; each outside left foot pushes and recovers between
those steps. The previous walking-foot planner was inappropriate during a
rotating swing: its held headings could oppose the body by almost 180 degrees.

The study uses a dedicated swing foot mode. The two right-foot centers trace
opposing small circles about the pair midpoint; outside left-foot motion
supplies a short push and recovery. Pelvis and torso share the root orientation,
and leg links originate on that same pelvis frame. Foot contact distinguishes
pivoting from fixed balance support and airborne recovery. Right-foot touchdown
must coincide with each integer execution count, not merely repeat once/count.
This is a schematic exploration, not a full force, joint or floor-friction model.
The main studio's 3D choreography and gait are unchanged.
