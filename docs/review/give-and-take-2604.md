# Give-and-take: explicit role, connected approach and immediate swing

## Source and interpretation

The source candidate is [Another Safe Production](https://contradb.com/dances/2604), Peter Foster. The retained snapshot is `test-data/contradb/2604.json`. Its B1 has two distinct rows: eight counts of “gentlespoons give & take partners” and eight counts of partner swing. Source role, receiver, row boundaries and total duration must remain unchanged.

The [Caller’s Box figure glossary](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm) describes an approach, two hands with the person across, and the named role backing with that person to their own sideline; its convention is four total counts. That general convention does not override this source’s explicit eight-count row. The selected runtime interpretation is four counts of connected approach and four counts of taking, releasing and preparing the next swing. Inside-hand side-couple approach hold, two-hand taking hold and the exact split are explicit retained review choices, not quoted author instructions.

The full-source sweep found no equally simple give-and-take-only record by the user’s preferred choreographers. The Isaac Banner/Sherry Nevins source #1622 additionally needs distinct long-wave entrances. Literal twelve-count compound give-and-take-and-swing rows in #1632 and #761 follow a ring balance and need a separate ring-ingress and timing contract. They remain unresolved: this implementation does not invent an eight-plus-four split or silently compress its eight-count path into four.

## Runtime contract

`compileGiveAndTake` binds four stable actor identities, reciprocal current partner/neighbor maps, persistent couple IDs, a matching nonnegative epoch, two explicit taking pairs and the taking role. Both larks and robins are supported; the received relationship may be partner or neighbor. The incoming side couples must be the opposite bound relationship, with larks on the left facing across, in the explicitly prepared compact stance.

The entry is at sideline x ±0.90 and side-pair half-spacing 0.45 in the supplied rigid frame. Endpoint maps are explicit, immutable and identity checked. The taker takes the received person to the taker’s original sideline, with a prepared 0.31-radius swing frame. A wrong taker, wrong relationship, swapped endpoint, stale epoch, unsupported phase count, nonstationary endpoint derivative or extra unconsumed modifier fails closed.

The connected side approach moves forward during counts 0–4. The original inside-hand connection releases before the new two-hand received-pair connection is acquired. Counts 4–8 take the received person back to the named role’s side. Both pairs clear the center in separate lanes before pivoting into their own swing stance; nobody is reselected by proximity. The taking hands release before free-arm swing preparation. The same-person swing begins in its full frame immediately on the next source count, with no extra gathering count or extra footfall.

The low-level solver supports rigid rotation/translation and opaque stable IDs. The formation adapter uses the existing identity-bound context. Separate staged `giveAndTakes` and `heldQuarterAllemandes` capabilities guard the new figure and its still-unreviewed precursor geometry. The precursor is blocked even in a composition without any give-and-take. Imported data cannot enable either capability.

## Verification completed for the isolated path

- `give-and-take.test.ts`: both taking roles, explicit partner and neighbor contracts, opaque actor IDs, immutable snapshots, exact endpoint positions/facing, C2 internal root/facing joins, consumed arguments, timing, unique hand ownership and physical budget checks.
- Minimum sampled root clearance: 0.62. Maximum speed: 1.05469 units/count. Maximum yaw rate: 0.40907 rad/count for lark taking, 2.04531 for robin taking.
- Production Avatar at 120 samples/count: one alternating footfall per musical count, fixed arm/leg lengths, zero new leg reach corrections, held wrist error below 1e-7, and all six swing-frame constraints fully held at the exact following swing boundary.
- `give-and-take-collision.test.ts`: production mesh at 80 samples/count for both roles and for the actual #2604 interval 32–40, including connected approach, both-hand take, release, preparation and exact swing boundary. New unrelated-arm, leg, torso and head intersections are rejected independently of root separation.
- Sampled minimum leg mesh clearance: 0.01106; unrelated arm clearance: 0.05993; unassociated torso clearance: 0.17065; exact head mesh clearance: 0.03457.

## Separately disclosed inherited anatomy limits

The reused swing frame has supporting-forearm/recipient-torso overlap of about 0.12492 units and self-elbow/torso overlap of about 0.03807. The new transition does not deepen those overlaps. The support-edge ingress transient is about 0.05402 overlap versus 0.03284 at the exact settled swing boundary, an additional 0.02118; this is bounded separately by the previously reviewed gyre-transition envelope, not described as collision free. Low free-hand/self-torso styling remains bounded at about 0.00739. These are procedural prototype limits, not evidence of safe physical teaching or continuous biomechanical validity.

## Whole-source verification

The source #2604 incoming composition now uses a generic, literal quarter-ending named allemande → opposite-hand same-role allemande continuity contract. The neighbor right allemande still turns exactly 1¾ in eight counts, retaining the reachable 0.55 held radius at its handoff instead of incorrectly releasing both larks to the same center. The same-role turn retains its full turn and returns the same named neighbor pairs to the actual original sidelines before their swing. Counts and identities are unchanged. Core prefix tests and independent review cover this shared repair separately from give-and-take.

`give-and-take-source.test.ts` passes exact original source/interpretation archive replay; missing/invalid choice, unsupported modifier, disabled capability and compound-source negatives; all complete finite periods for two through twelve couples; 1,375 root/facing source-boundary checks; exact period closure; persistent partner/taker-side identity and contact ownership. The source's bare final chain has one valid receiver assignment, neighbor, retained as a visible formation-derived suggestion.

Production Avatar sampling over the complete source round for two and six couples, with 120 samples/count through the new figure and its immediate swing join, gives zero new give-and-take or following-swing reach corrections and wrist error below 1e-7. Existing source-prefix corrections remain separate: first right star up to 0.01766, neighbor right allemande up to 0.03236, and final left star up to 0.01352. Same-role allemande, both swings, the new give-and-take and the chain have zero in this probe.

The previously blocked predecessor body routing is now repaired with a narrowly scoped quarter-ending turn handoff. During the last existing count of the named 1¾-turn allemande, the active role prepares its facing toward the next explicitly named same-role actor. Free arms stay low through that opposite-hand handoff. The later central-allemande swing ingress reuses the reviewed outside-arm route, with a small pose-settling bow that vanishes at the exact terminal frame. Root paths, literal winding, identities, source counts and planned contact timing are unchanged; no mesh pairs or new intersections are masked.

The unchanged strict six-couple production-mesh prefix probe at 40 samples/count through counts 8–24 now passes. Minimum unrelated-arm clearance is 0.03843, leg clearance 0.05670, unassociated torso clearance 0.15123 and exact head clearance 0.03457. Maximum fully held wrist error is below 5e-16. The inherited fast neighbor-allemande leg reach correction remains separately reported at 0.03236. The worst supporting-forearm/recipient-torso overlap is exactly the inherited 0.12492 terminal baseline, and self-elbow/torso overlap is exactly its 0.03807 terminal baseline. The associated supporting-arm transient is 0.04803 overlap versus 0.03284 settled, within the unchanged reviewed gyre envelope. These remaining inherited frame limits are disclosed rather than described as collision free. Actual give-and-take counts 32–40 continue to pass with zero clamps and clean unrelated-body clearances.

`allemande-routing.test.ts` additionally checks that the next same-role hands acquire and remain fully held, fixed 0.325 arm and 0.43 leg segments, one footfall phase per musical count, and continuous articulated joints at the source and routing joins. This is a staged implementation pending independent integrated review; `heldQuarterAllemandes` and `giveAndTakes` remain separate default-off capability gates until registration is approved.

Source and prototype status are not inferred from a dance title. Passing source interpretation, archive and topology tests alone does not authorize registration.

Offline actual-mesh probes and numerical continuity checks are distinct from a browser/GPU presentation review. No browser or continuous collision certificate is claimed here.
