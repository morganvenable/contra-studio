# Offline choreography coverage audit

Regenerate: `node --experimental-strip-types scripts/audit-coverage.mjs --write`.
Generated 2026-10-20T22:55:39.262Z; code revision b87b38007cd26a0efbb7f34f4118ab002f944823 with local modifications. Runtime 114.6 seconds.
This reads existing data only. It does not fetch sources, regenerate archives or approve suggested interpretations.

There are **2422 catalogue records**, **170 retained snapshots**, and **142 saved Ready interpretations**. **2252 catalogue records have metadata only**; their figure content and motion coverage are unknown. These are overlapping sets, not additive counts. Exact set intersections are in the JSON.

| Input view | Sources | Import admitted | Interpretation blocked | Motion/validation blocked | Unparsed |
| --- | ---: | ---: | ---: | ---: | ---: |
| rawDefaults | 170 | 0 | 170 | 0 | 0 |
| conventionalSuggestions | 170 | 143 | 22 | 5 | 0 |
| savedInterpretation | 142 | 142 | 0 | 0 | 0 |

“Import admitted” includes existing importer validation, its internal sampled checks and six-couple compile gate. It is not a new whole-period motion or visual certification. Raw defaults, hypothetical suggestions, and saved interpretations are separate views of overlapping sources.
“Interpretation blocked” identifies the importer stage, not necessarily ambiguous authorship: this stage also enforces implementation-specific context and capability gates. Read the diagnostic causes before assigning research versus engineering work.

## Blockers among retained sources without a saved Ready interpretation

This table uses hypothetical conventional suggestions to expose remaining obstacles. Suggestions are not authored facts or approvals. Counts overlap. “Sole diagnostic” means the only currently exposed diagnostic code; it does not predict that fixing it will admit the dance.

| Diagnostic | Sources | Sole diagnostic | IDs | Example cause |
| --- | ---: | ---: | --- | --- |
| unsupported-figure-variant | 14 | 1 | 266, 495, 761, 776, 907, 1312, 1632, 2006, 2026, 2212, 2456, 2672, 3363, 3533 | The complete figure wording, including qualifiers, needs a semantic/motion adapter. |
| unknown-figure | 10 | 1 | 179, 495, 761, 776, 907, 1312, 1599, 2299, 2903, 3533 | The complete figure wording, including qualifiers, needs a semantic/motion adapter. |
| source-notes | 7 | 0 | 761, 907, 1312, 1632, 2006, 2299, 3533 | The source has prose notes that may alter movement or end effects; they are retained and block automatic playback. |
| chain-receiver | 6 | 0 | 179, 266, 495, 2494, 2672, 3280 | Choose the named receiving partner or neighbor; “chain” alone does not identify that relation. |
| source-hook | 5 | 0 | 179, 495, 2006, 2212, 2494 | The hook contains a movement, role, hand, direction, timing, scope or end-effect cue not fully corroborated by the retained source clauses. |
| progression-location | 4 | 0 | 1632, 2006, 2672, 3363 | The progression event is not at this formation adapter’s reviewed boundary. |
| formation | 3 | 0 | 907, 2212, 3533 | Formation “triplet” has no current complete-dance adapter. |
| motion:compile | 3 | 3 | 110, 729, 1926 | A standalone rollaway requires its registered actual-state exchange boundary. |
| source-preamble | 3 | 0 | 907, 1632, 2672 | The source has starting/variant instructions that require a dedicated semantic interpretation. |
| active-swing-source-contract | 2 | 0 | 2026, 3361 | This active-rank contract requires the complete eight-count ones-only swing, literal final facing and retained terminal progression marker. |
| active-swing-wait-choice | 2 | 0 | 2026, 3361 | Review the schematic waiting convention: while the current ones swing with their persistent partners during the source’s eight counts, the twos keep their incoming places fixed, retain their facing... |
| circulation-choice | 2 | 0 | 761, 3363 | The source says Becket without explicitly naming circulation. Select CW to use the current adapter. |
| long-wave-context | 2 | 0 | 2006, 3363 | This full-wave circulation requires the exact source-declared long-wave entry and complementary second circulation. |
| progression-count | 2 | 0 | 907, 2212 | This adapter needs exactly 1 source-declared progression event; found 0. |
| source-notes-classification | 2 | 0 | 495, 2212 | Review whether the retained prose notes are provenance/dedication/history rather than movement or end-effect instructions. They are not discarded automatically. |
| half-poussette-source-contract | 1 | 0 | 776 | This partner half-poussette keeps eight source counts and an improper partner-facing-across entry. |
| hall-composition | 1 | 0 | 2026 | This down/turn row requires its adjacent up/return/bend row and an explicitly down-facing paired swing entry. |
| hall-return-pair | 1 | 0 | 2026 | This return/bend row must be consumed with the immediately preceding down/turn source row. |
| long-wave-circulate-marker | 1 | 0 | 3363 | The final look-to-next-neighbors qualifier must retain its source progression marker. |
| mad-robin-choice | 1 | 0 | 2672 | Review one complete eight-count oval around the current neighbor while facing the persistent partner across, with robins initially passing in front. The source does not name a world direction. The ... |
| mad-robin-source-contract | 1 | 0 | 2672 | This bounded source contract retains exactly eight counts of mad robin with the source-named robins in front. |
| motion:event-compile | 1 | 1 | 3310 | A paired-radial swing needs opposite measured sideline pair centers within the .65–1.2 half-width envelope. |
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

**Semantically resolved but motion/validation blocked after hypothetical suggestions: 5 sources** (110, 729, 1926, 2987, 3310). These have all source rows resolved under those suggestions; they are the clearest current composition/validation backlog, not promised admissions.

- 110, Liz's steady hand: A standalone rollaway requires its registered actual-state exchange boundary.
- 729, Echoing Allemandes: The courtesy leader must explicitly occupy the left slot of the incoming side-by-side pair; roles cannot be flipped to repair it.
- 1926, Monday Night in Ballard: This named pull-by continuation needs a separately reviewed endpoint adapter; terminal progression is not inferred.
- 2987, Stay in Touch: The event composition violates torso clearance near beat 10.5.
- 3310, Kiss the Bride variation: A paired-radial swing needs opposite measured sideline pair centers within the .65–1.2 half-width envelope.

The 28 unsaved retained records split into 2 import-admitted candidates, 5 motion/validation blocks and 21 interpretation-stage blocks.
Candidates, **not saved Ready admissions**: 8 (The Baby Rose), 2194 (Bristol Court).
Saved records that hypothetical suggestions cannot reconstruct: 94 (Butter; chain-receiver, circulation-choice). Their saved interpretation is tested separately. Thus the hypothetical admitted total must not be subtracted from saved Ready to count new candidates.

## Figure frequencies in retained raw sources

These are normalized figure occurrences recognized by the importer, not a linguistic census of every source instruction. Choices can split compound instructions into new figures: raw balance frequency is especially incomplete without balance/swing timing choices. Unsupported text can be missing here; see unresolved rows in JSON. Columns count sources containing each kind, with their different denominators; these views overlap.

| Kind | Raw / 170 | Suggested / 170 | Saved / 142 |
| --- | ---: | ---: | ---: |
| allemande | 105 | 105 | 91 |
| balance | 3 | 120 | 105 |
| balance-box-circulate | 0 | 4 | 2 |
| balance-rory-slide | 0 | 1 | 1 |
| becket-shift | 3 | 3 | 1 |
| becket-slice | 0 | 4 | 4 |
| box-the-gnat | 4 | 22 | 19 |
| butterfly-whirl | 0 | 1 | 1 |
| california-twirl | 0 | 18 | 16 |
| circle | 121 | 121 | 105 |
| couples-do-si-do | 0 | 2 | 2 |
| cross-trails | 0 | 1 | 1 |
| do-si-do | 48 | 51 | 43 |
| form-short-wave | 1 | 1 | 1 |
| give-and-take | 0 | 2 | 2 |
| gyre | 2 | 18 | 12 |
| half-poussette | 0 | 2 | 1 |
| hall-travel | 0 | 9 | 9 |
| hey | 5 | 37 | 35 |
| long-lines | 75 | 75 | 65 |
| long-lines-rollaway | 0 | 1 | 1 |
| mad-robin | 0 | 3 | 3 |
| pass-through | 0 | 32 | 30 |
| pass-to-wave-balance | 0 | 1 | 1 |
| petronella | 0 | 15 | 13 |
| promenade | 1 | 22 | 19 |
| pull-by | 7 | 7 | 5 |
| revolving-door | 0 | 1 | 1 |
| ricochet-hey | 0 | 1 | 1 |
| right-left-through | 0 | 28 | 25 |
| ring-balance | 44 | 49 | 40 |
| robins-chain | 14 | 68 | 68 |
| rollaway | 0 | 2 | 1 |
| square-through | 0 | 6 | 6 |
| star | 51 | 51 | 43 |
| star-promenade | 0 | 1 | 1 |
| swing | 129 | 167 | 142 |

## What this permits us to conclude

- Missing source acquisition is the largest measurable coverage gap; metadata alone cannot establish which figures would unlock it.
- The retained sample was selected during development. Its frequencies must not be projected onto the complete catalogue.
- JSON includes per-source blockers, unresolved row references and co-occurring blocker counts for targeted research.
- Parser categories and compiler diagnostics are implementation observations, not authoritative definitions of dancing.
- No additional full-period motion suite, GPU, audio or browser checks run in this census.
