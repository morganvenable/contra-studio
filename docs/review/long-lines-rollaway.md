# Directed rollaway during long-lines return

## Source and interpretation

Isaac Banner, [I Drove to Portland for Tacos, ContraDB #1972](https://contradb.com/dances/1972), is an improper 64-count dance. The retained source has eight eight-count rows. B1 first says:

> long lines forward & back, ladles roll away partners left to right on the way back

The preceding partner swing leaves larks on their partners' left. The source subject, “ladles,” identifies the person initiating the roll; the partner lark is the rolling actor. The explicitly selected interpretation is:

- Four counts forward, four counts returning, with the roll inside the return
- Lark rolls from left to right with one full right body turn
- Robin half-sashays behind the rolling lark
- Both finish in each other's original slots, still facing across the set
- Persistent partner identities and the current neighbor epoch do not change

The [Caller's Box glossary](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm) describes long-lines rollaway as simultaneous with the return and specifies the default slot exchange unless explicitly omitted. The [CALLERLAB definition](https://teaching.callerlab.org/basic-part-1/sashay-rollaway-definition/) supplies the four-count directed full turn in front of the sidestepping counterpart and changed nearest-hand connection. The contra wording “with half sashay” is retained here to make the slot exchange explicit; CALLERLAB's modern-square terminology generally omits that qualifier.

This implementation does not cover a no-half-sashay progression, a rollaway into waves, or a fractional roll. In particular, the final rollaway in Koren Wake's Dreamland Races has different no-half-sashay/progression semantics and remains a separate contract.

## Motion contract

`rollaway.ts` accepts two named stable actors, their explicit reciprocal relationship and binding epoch, original/final constraints, direction and required half-sashay declaration. It can retreat along its original facing axis to compose with a larger travel path. The roller turns one full revolution; the half-sashayer retains facing. The original nearest-hand hold releases before the opposite nearest hands acquire, with no arch or under-person metadata.

`long-lines-rollaway.ts` binds two independently named pairs to inward-facing sidelines. Four small steps advance 0.40 model units while closing the local pair spacing from 1.8 to 1.64 for a reachable handhold. During the four-count return, the roller passes 0.22 units in front of the retreating carrier and the counterpart 0.45 behind it. The final original sideline slots are exchanged exactly. These distances are schematic visual choices, not source changes or additional timing.

The original larger generic long-lines advance caused the free upper arms of opposing rollers to intersect. The smaller advance above preserves the source's small-step action and avoids that collision without changing cadence or renderer behavior.

## Focused verification

Eight tests cover mirrored directed turns, actor/relationship identity, exact endpoints, non-mutating snapshots, arbitrary actor IDs, world transforms, explicit variant rejection, return-only rotation, reachable named contacts, and the actual adult Avatar geometry.

Representative mirrored Avatar samples retain one footfall per musical beat, fixed arm/leg lengths and zero leg reach corrections. Full-strength named wrist closure is at floating-point precision. Sampled other-torso clearance is 142 mm and unrelated-arm clearance 8.9 mm. The inherited free-arm/rest styling has a small own-torso forearm graze of 7.4 mm; that residual is bounded separately and is not a claim of zero mesh clipping. Sampling is not a continuous collision certificate.

## Whole-source verification

`long-lines-rollaway-source.test.ts` verifies the retained complete source, exact archived choices, rejected changed timing/directions/half-sashay qualifiers, the independent corner permutation, every 2–12-couple set through its complete 2N progression period, and all figure boundaries. The original eight rows remain eight eight-count figures, totaling 64 counts. The right-and-left-through crosses persistent partners and courtesy-turns current neighbors with larks leading; the preceding circle prepares its across-facing entry during its existing last count.

The review UI finds that RLT relationship as the unique whole-dance-valid candidate, presents it as an interpretation, and retains it in the archive. The source itself is unchanged. Saved conflicting choices are not silently repaired.

The full-round six-couple Avatar check has no new rollaway reach corrections and exact named wrist closure. Separately measured inherited leg corrections are at most 4.6 mm in the allemande and 11.4 mm in the star. Real-engine rollaway arm meshes, including adjacent minor sets and waiting actors over the first two rounds, have sampled other-torso clearance 132 mm and unrelated-arm clearance 18.5 mm; the same small 7.4 mm own-arm styling residual is retained. These tests are sampled regression checks, not a continuous anatomical safety certificate.

Capability registration and publication remain separate decisions owned by the integration review; focused primitive success alone does not enable a dance.
