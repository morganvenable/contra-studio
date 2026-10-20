# Execution timing exploration

20 October 2026. Morgan's reference is a four-count balance with two steps
forward on counts 1–2 and two back on 3–4. Dancers should prepare the next
action during the preceding phrase, rather than spend its opening counts
getting ready.

## Findings in the existing studio

- The prepared paired balance in `engine.ts` returns during local counts 2–3,
  then closes for the swing during 3.25–4. This steals part of the backward
  balance. Correcting it requires a swing entry that consumes the actual wider
  balance exit while already rotating.
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

The prepared balance has two forward counts and two backward counts. The swing
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
with actual two-count retreat, immediate swing travel, and preceding preparation.
Use explicit count-sized entrance/exit ramps and hand-transfer windows, then
measure velocity continuity as well as position continuity. Carrying velocity
through compatible transitions is a separate control from response delay.
Only then extend profiles across other adapters.

Independent mistakes, missed steps, handhold negotiation and recovery between
dancers require a contact-aware interaction model. This study does not implement
those behaviors, nor does it change buzzstep footwork.
