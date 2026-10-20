# Gyre / shoulder round and Monday (#57)

## Source and retained interpretation

- ContraDB: https://contradb.com/dances/57, Monday by Jim Hemphill.
- Author collection: https://childgrove.org/index.php/mo-dances/jim-hemphill, first dance; A2 specifies a partner shoulder round followed by swing.
- The retained ContraDB A2 row says “partners meltdown swing” and supplies sixteen counts. Neither source supplies the internal split, shoulder, or turn amount. The importer must retain the ambiguous original row and require an explicit reviewed choice of meaning, shoulder, amount and phase counts. It must never silently alias this row to plain swing.
- The tested interpretation is one full right-shoulder partner gyre in four counts, then twelve counts of partner swing. Runtime figures remain separate, but both retain the single original source row. These counts are a reviewed implementation, not an author-asserted internal timing.
- The other bare source choice is right-and-left-through: right-hand crossing with partner, neighbor courtesy turn led by the lark. The sequence validator uniquely selects that receiver/crossing pairing.
- Jaded (#2456) provides a separate literal standalone source row: partner gyre, left shoulders, once, eight counts. Its remaining ricochet hey remains unsupported; successful row normalization does not claim that the entire dance runs.

## Contract

`compileGyre` binds explicit stable actor IDs, persistent couple identities, reciprocal partner/neighbor maps and a current epoch. One or two disjoint pairs name partner, neighbor, larks or robins. Shoulder, turn amount and whole-beat duration are mandatory; unsupported extra modifiers fail closed. Actors outside a selected same-role pair retain their incoming pose. Inputs are copied and returned pair/endpoint views are immutable.

The shoulder controls winding direction; the turn amount must agree with the actual exit radial angle. Pair centers are preserved. Entry/exit position, facing and zero derivatives are explicit. Root clearance, speed and yaw-rate budgets are sampled and checked; unsupported geometry is rejected instead of remapping participants.

The path gathers inside its first count, beginning orbital acceleration after the first quarter-count, and completes the declared turn inside the figure. It faces the named other dancer after its bounded entry alignment. No gyre hand contact is created. A same-person following swing has a compact endpoint and a final-count free-arm preparation cue. The next swing starts in a closed frame on its first count, with no extra count or extra footfall.

## Regression evidence

`gyre.test.ts` checks left/right winding, full/half turns, explicit facing, selected same-role actors, nonparticipants, derivative/budget rejection, ownership and unsupported modifiers.

`gyre-source-integration.test.ts` checks original source retention, exact interpretation archive replay, explicit gate/choice clearing, all complete finite periods for two through twelve couples, deterministic scrubbing, persistent actors, root clearance, unique hand ownership, free gyre hands and the fully held beat-20 swing start. Actual Avatar checks use 120 samples per musical beat for two and six couples, all segment joins, exact limb lengths and one alternating footfall per beat.

New gyre and the following partner swing show zero leg-reach corrections in those tests; held wrist error is below 1e-7. Inherited first-section allemandes require at most .0202 world units of reach correction, and the final star at most .0136. These are not gyre defects and are not claims of anatomical perfection.

## Independently reviewed articulated limitations

The existing shared swing frame has known supporting-forearm/recipient-torso overlap, approximately .125 world units in the actual-mesh probe, and approximately .033 supporting-arm overlap at the exact boundary. This is an inherited open swing-anatomy problem, not a source/timing ambiguity and not an acceptable claim of collision-free dance teaching.

The free gyre orbit clears other actors' arms, legs, torso and head in the sampled probe. Independent source, ownership, actual-Avatar and posed-mesh review cleared the scoped prototype activation. The final-count free-arm preparation has approximately .0541 world units of overlap on the future supporting-arm edge, versus .0328 in the settled swing: .02125 additional units. It introduces no unrelated-arm, leg or head intersection, and no worse self/other torso intrusion than the inherited swing. This associated support-edge ingress is explicitly accepted as a prototype styling limitation; it is not hidden as a passing collision-free check. The regression caps it at .055 overall and .0215 worse than the exact held-frame baseline. Explicit `gyres:false` still rejects playback. Numerical topology and positive root separation do not establish limb clearance or continuous biomechanical safety. GPU presentation and offline actual-mesh probes are separate evidence.
