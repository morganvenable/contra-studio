# Actual four-person hall line: source 840

22 October 2026. Retained source: Phoebe's Becket, Linda Leslie,
https://contradb.com/dances/840. The exact snapshot and explicit interpretation
archive are retained separately. The source preamble requires a short line of
four beside partners, facing down; the runtime starts in that actual line.

The source preserves 8 down/turn + 8 up/bend, 6 circle + 2 marked pass,
8 next-neighbor do-si-do, 16 neighbor balance/swing, 8 robin right allemande
1.5, and 8 partner swing. The pass changes neighbors at count 24 only after
its physical endpoint. The last partner swing physically reaches the next
four-person line and acquires its three adjacent hand connections before 64.
No title or source ID dispatches motion.

`compact-partner-line-hall-v1` is removable and bound to the exact snapshot.
It discloses .90 m line spacing, .60 m hall travel, 1.28 m ring, four 4-count
hall phases, the existing compact six/two passage, and .43 m role-allemande
radius. Waiting end couples yield .90 m outward and return during the hall's
sixteen counts; they never acquire absent-neighbor hands. Neighbor do-si-do
completes its return at count seven and uses its last count to approach the
1.18 m held balance. The final swing opens during its last two counts and
acquires the line hands during its last half count. These are simulation
conventions, not additional source steps or source-specified dimensions.

New modules: `hall-line-step.ts` owns actual line travel, the cyclic swing
producer, and dosido-to-held-balance preparation. `hall-line-sequence.ts`
uses the existing finite Becket ledger and circle/pass endpoint, explicitly
carrying the hall ring through circle rotation. `source-hall-line.ts` lowers
local source clauses and retains the two hall rows' compound identity.
The policy wrapper owns input data and returned frames. Existing paired
sideline hall and Becket wave paths are unchanged.

Current evidence: four new source/finite tests pass; the independent critic
reran all four and TypeScript. The independent finite-slot oracle covers full
three- and four-couple periods, actual initial line, actual partner turn,
neighbor/waiter identities, epoch 24, role-allemande hands, balance hands at its
first count, swing frames, root/yaw and contact-point/strength seams, and full
closure. Sampled maxima: speed 1.095318 m/count, yaw 2.80 rad/count, positive
contact reach .639863 m; minimum root clearance .475096 m. Each three-couple
period includes 1,944 full-strength correct robin allemande hand samples;
four couples include 3,888. Six-couple import/compilation is checked by the
ordinary importer; the dense whole-period tests cover three and four.

Sixteen existing hall, circle/pass, and Becket wave regression tests pass,
including source 123 and the contrasting actual turn-alone source 2876.
No generated Ready archive was rebuilt. Browser import, visual/body review,
UI selector, admission generation and public release belong to lead integration.
The selector key is `hallLine`, using `hallLineChoiceForSource` and the full
`HALL_LINE_DESCRIPTION`. Removing it must restore the source hold.

Opening sources without this preamble, active-ones hall entries, turn-alone
line entries, baskets, arches, and additional prose remain held. This slice
does not admit the entire hall cohort. GPU/body and audio checks are not claimed.
