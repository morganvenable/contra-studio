# Offline choreography coverage audit

Regenerate: `node --experimental-strip-types scripts/audit-coverage.mjs --write`.
Generated 2026-10-22T23:43:05.260Z; code revision d92469ee6e730b519eb1beb5a1b7ef3255991e4d with local modifications. Runtime 182.1 seconds.
This reads existing data only. It does not fetch sources, regenerate archives or approve suggested interpretations.

There are **2422 catalogue records**, **213 retained snapshots**, and **184 saved Ready interpretations**. **2209 catalogue records have metadata only**; their figure content and motion coverage are unknown. These are overlapping sets, not additive counts. Exact set intersections are in the JSON.

| Input view | Sources | Import admitted | Interpretation blocked | Motion/validation blocked | Unparsed |
| --- | ---: | ---: | ---: | ---: | ---: |
| rawDefaults | 213 | 0 | 213 | 0 | 0 |
| conventionalSuggestions | 213 | 171 | 34 | 8 | 0 |
| savedInterpretation | 184 | 184 | 0 | 0 | 0 |

“Import admitted” includes existing importer validation, its internal sampled checks and six-couple compile gate. It is not a new whole-period motion or visual certification. Raw defaults, hypothetical suggestions, and saved interpretations are separate views of overlapping sources.
“Interpretation blocked” identifies the importer stage, not necessarily ambiguous authorship: this stage also enforces implementation-specific context and capability gates. Read the diagnostic causes before assigning research versus engineering work.

## Blockers among retained sources without a saved Ready interpretation

This table uses hypothetical conventional suggestions to expose remaining obstacles. Suggestions are not authored facts or approvals. Counts overlap. “Sole diagnostic” means the only currently exposed diagnostic code; it does not predict that fixing it will admit the dance.

| Diagnostic | Sources | Sole diagnostic | IDs | Example cause |
| --- | ---: | ---: | --- | --- |
| unsupported-figure-variant | 14 | 1 | 266, 495, 761, 776, 907, 1312, 1632, 2006, 2026, 2212, 2456, 2672, 3363, 3533 | The complete figure wording, including qualifiers, needs a semantic/motion adapter. |
| unknown-figure | 9 | 1 | 179, 761, 776, 907, 1312, 1599, 2299, 2903, 3533 | The complete figure wording, including qualifiers, needs a semantic/motion adapter. |
| source-notes | 7 | 0 | 761, 907, 1312, 1632, 2006, 2299, 3533 | The source has prose notes that may alter movement or end effects; they are retained and block automatic playback. |
| chain-receiver | 6 | 0 | 179, 266, 495, 2494, 2672, 3280 | Choose the named receiving partner or neighbor; “chain” alone does not identify that relation. |
| source-hook | 5 | 0 | 179, 495, 2006, 2212, 2494 | The hook contains a movement, role, hand, direction, timing, scope or end-effect cue not fully corroborated by the retained source clauses. |
| motion:event-compile | 4 | 4 | 110, 427, 1926, 3310 | The literal turn ends in a degenerate named swing frame; this entry needs a separately modeled physical handoff. |
| progression-location | 4 | 0 | 1632, 2006, 2672, 3363 | The progression event is not at this formation adapter’s reviewed boundary. |
| formation | 3 | 0 | 907, 2212, 3533 | Formation “triplet” has no current complete-dance adapter. |
| source-notes-classification | 3 | 1 | 495, 1428, 2212 | Review whether the retained prose notes are provenance/dedication/history rather than movement or end-effect instructions. They are not discarded automatically. |
| source-preamble | 3 | 0 | 907, 1632, 2672 | The source has starting/variant instructions that require a dedicated semantic interpretation. |
| active-swing-source-contract | 2 | 0 | 2026, 3361 | This active-rank contract requires the complete eight-count ones-only swing, literal final facing and retained terminal progression marker. |
| active-swing-wait-choice | 2 | 0 | 2026, 3361 | Review the schematic waiting convention: while the current ones swing with their persistent partners during the source’s eight counts, the twos keep their incoming places fixed, retain their facing... |
| circulation-choice | 2 | 0 | 761, 3363 | The source says Becket without explicitly naming circulation. Select CW to use the current adapter. |
| long-wave-context | 2 | 0 | 2006, 3363 | This full-wave circulation requires the exact source-declared long-wave entry and complementary second circulation. |
| progression-count | 2 | 0 | 907, 2212 | This adapter needs exactly 1 source-declared progression event; found 0. |
| half-poussette-source-contract | 1 | 0 | 776 | This partner half-poussette keeps eight source counts and an improper partner-facing-across entry. |
| hall-composition | 1 | 0 | 2026 | This down/turn row requires its adjacent up/return/bend row and an explicitly down-facing paired swing entry. |
| hall-return-pair | 1 | 0 | 2026 | This return/bend row must be consumed with the immediately preceding down/turn source row. |
| long-wave-circulate-marker | 1 | 0 | 3363 | The final look-to-next-neighbors qualifier must retain its source progression marker. |
| mad-robin-choice | 1 | 0 | 2672 | Review one complete eight-count oval around the current neighbor while facing the persistent partner across, with robins initially passing in front. The source does not name a world direction. The ... |
| mad-robin-source-contract | 1 | 0 | 2672 | This bounded source contract retains exactly eight counts of mad robin with the source-named front role. |
| motion:compile | 1 | 1 | 729 | The courtesy leader must explicitly occupy the left slot of the incoming side-by-side pair; roles cannot be flipped to repair it. |
| motion:line-precondition | 1 | 0 | 1930 | long lines forward & back: dancers have not arrived on the two long lines. |
| motion:motion-speed | 1 | 0 | 1930 | circle left 3 places exceeds the current 2-model-unit-per-beat root-speed budget (3.27). Increase its duration or use another path adapter. |
| motion:progression-endpoint | 1 | 0 | 1930 | The complete sequence does not end in the required single-progression slots with the original dancer identities and role sides. Correct its figure amounts or transitions before playback. |
| motion:swing-entry | 1 | 0 | 1930 | neighbors swing: this swing adapter requires the named pair on the same sideline or in its explicitly prepared closed frame; its incoming formation needs a different transition adapter. |
| motion:torso-overlap | 1 | 1 | 2987 | The event composition violates torso clearance near beat 10.5. |
| partial-hey-entry | 1 | 0 | 3280 | This half-hey adapter requires an eight-beat improper current-neighbor sideline composition. |
| phrase-duration | 1 | 0 | 907 | B2 has 0 source beats; the current cycle requires 16. No timing was stretched. |
| phrase-order | 1 | 0 | 907 | Source phrases must occur once in A1, A2, B1, B2 order. |
| poussette-composition-context | 1 | 0 | 776 | This compact partner-hold entry/exit requires the complete source-declared opening half-poussette, neighbor swing and final two-hand partner twirl composition. |
| progression-qualifier | 1 | 0 | 761 | The next-neighbor qualifier has no matching progression marker. |
| progression-variant | 1 | 0 | 3363 | This source progression event has no reviewed topology adapter. |
| source-preamble-choice-conflict | 1 | 0 | 1312 | The selected preamble interpretation requires its exact retained wording and a completely resolved corroborating current table; it cannot waive setup or movement instructions. |
| source-preamble-review | 1 | 0 | 1312 | Review classifies the explicit walkthrough request as preparation before taking the dance to the floor, outside the timed choreography. The attributed feedback request and contact address remain so... |
| square-through-choice | 1 | 0 | 2903 | Review four counts for the partner right-hand balance, then two for the partner right pull-by and two for the current-neighbor left pull-by. The source states eight total counts and this named pass... |
| square-through-source-contract | 1 | 0 | 2903 | Retain exactly the named partner right-hand balance/pull-by and current-neighbor left pull-by: eight counts for two passages, or sixteen for four with the explicit complete-unit repeat. Any progres... |

**Semantically resolved but motion/validation blocked after hypothetical suggestions: 7 sources** (110, 427, 729, 1926, 1930, 2987, 3310). These have all source rows resolved under those suggestions; they are the clearest current composition/validation backlog, not promised admissions.

- 110, Liz's steady hand: The literal turn ends in a degenerate named swing frame; this entry needs a separately modeled physical handoff.
- 427, Lanny's Back: Role passage requires two or four source counts, an explicit shoulder and role, and the immediate persistent-partner swing.
- 729, Echoing Allemandes: The courtesy leader must explicitly occupy the left slot of the incoming side-by-side pair; roles cannot be flipped to repair it.
- 1926, Monday Night in Ballard: A terminal named pull-by requires exactly one explicit final passage contract.
- 1930, Lakestar Contra: circle left 3 places exceeds the current 2-model-unit-per-beat root-speed budget (3.27). Increase its duration or use another path adapter. neighbors swing: this swing adapter requires the named pair on the same sideline or in its explicitly prepared closed frame; its incoming formation needs a different transition adapter. long lines forward & back: dancers have not arrived on the two long lines. The complete sequence does not end in the required single-progression slots with the original dancer identities and role sides. Correct its figure amounts or transitions before playback.
- 2987, Stay in Touch: The event composition violates torso clearance near beat 10.5.
- 3310, Kiss the Bride variation: A paired-radial swing needs opposite measured sideline pair centers within the .65–1.2 half-width envelope.

The 29 unsaved retained records split into 0 import-admitted candidates, 7 motion/validation blocks and 22 interpretation-stage blocks.
Candidates, **not saved Ready admissions**: none.
Saved records that hypothetical suggestions cannot reconstruct: 94 (Butter; chain-receiver, circulation-choice); 363 (Midwest Folklore; circulation-choice); 549 (Jubilation (var); chain-receiver); 1529 (Joe; source-notes-classification); 1658 (Bev's Becket A; chain-receiver); 2266 (Unbelievable!; chain-receiver, source-notes-history-review); 2322 (Rollin' to the Grey Eagle; chain-receiver); 2344 (Jubilation Permutation; motion:event-compile); 3142 (Unbelievable! variation; chain-receiver, source-notes-history-review); 3185 (Fingerling Potatoes; chain-receiver, source-notes-classification); 3326 (Swamp Stomp; chain-receiver, source-notes); 3431 (Robo-nella; dosido-ring-choice); 3478 (Futon Frolic; chain-receiver, source-notes-classification). Their saved interpretation is tested separately. Thus the hypothetical admitted total must not be subtracted from saved Ready to count new candidates.

## Figure frequencies in retained raw sources

These are normalized figure occurrences recognized by the importer, not a linguistic census of every source instruction. Choices can split compound instructions into new figures: raw balance frequency is especially incomplete without balance/swing timing choices. Unsupported text can be missing here; see unresolved rows in JSON. Columns count sources containing each kind, with their different denominators; these views overlap.

| Kind | Raw / 213 | Suggested / 213 | Saved / 184 |
| --- | ---: | ---: | ---: |
| allemande | 125 | 125 | 110 |
| balance | 5 | 154 | 140 |
| balance-box-circulate | 0 | 8 | 6 |
| balance-rory-slide | 0 | 1 | 1 |
| becket-shift | 4 | 4 | 2 |
| becket-slice | 0 | 6 | 6 |
| box-the-gnat | 5 | 26 | 23 |
| butterfly-whirl | 0 | 1 | 1 |
| california-twirl | 0 | 28 | 25 |
| circle | 154 | 154 | 138 |
| couples-do-si-do | 0 | 2 | 2 |
| cross-trails | 0 | 1 | 1 |
| do-si-do | 61 | 65 | 58 |
| form-short-wave | 1 | 1 | 1 |
| give-and-take | 0 | 4 | 3 |
| gyre | 2 | 23 | 16 |
| half-poussette | 0 | 2 | 1 |
| hall-travel | 0 | 11 | 11 |
| hey | 8 | 50 | 48 |
| long-lines | 89 | 89 | 78 |
| long-lines-rollaway | 0 | 5 | 5 |
| mad-robin | 0 | 5 | 5 |
| pass-through | 5 | 47 | 43 |
| pass-to-wave-balance | 0 | 1 | 1 |
| petronella | 0 | 22 | 19 |
| promenade | 1 | 30 | 28 |
| pull-by | 8 | 8 | 6 |
| revolving-door | 0 | 1 | 1 |
| ricochet-hey | 0 | 3 | 3 |
| right-left-through | 0 | 36 | 32 |
| ring-balance | 54 | 64 | 54 |
| robins-chain | 22 | 83 | 92 |
| rollaway | 0 | 2 | 1 |
| square-through | 0 | 7 | 7 |
| star | 62 | 62 | 54 |
| star-promenade | 0 | 1 | 1 |
| swing | 167 | 210 | 184 |

## What this permits us to conclude

- Missing source acquisition is the largest measurable coverage gap; metadata alone cannot establish which figures would unlock it.
- The retained sample was selected during development. Its frequencies must not be projected onto the complete catalogue.
- JSON includes per-source blockers, unresolved row references and co-occurring blocker counts for targeted research.
- Parser categories and compiler diagnostics are implementation observations, not authoritative definitions of dancing.
- No additional full-period motion suite, GPU, audio or browser checks run in this census.
