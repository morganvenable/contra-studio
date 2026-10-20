# Source-backed double progression: A Summer Night in Seattle

## Retained source and scope

The first complete double-progression composition is **A Summer Night in Seattle**, Mike Richardson, [ContraDB 928](https://contradb.com/dances/928). The public snapshot is retained in `test-data/double-progression/contradb-928.json`. Its notes say “Double progression”; the complete source rows occupy 16, 6, 10, 6, 10, 8 and 8 counts.

The bounded compiler recognizes the complete semantic composition, never a title or source-ID allowlist. Other double progressions, diagonal heys, Becket directions and bicycle-chain choreography do not become enabled by this adapter.

The source decomposes into:

1. Neighbor balance 4 and swing 12
2. Circle left three places 6
3. Partner swing 10
4. Circle left three places 6
5. Neighbor do-si-do one-and-a-half 10; look for new neighbors
6. Next-neighbor right-hand balance 4 and box the gnat 4
7. Right-hand star once 8; look for new-new neighbors

The first event is stated in the prose and following next-neighbor relation, despite having no progression glyph on that source row. The second retains its actual progression glyph. The original rows, source wording and unusual six/ten-count allocations are never rewritten as an ordinary eight-count sequence.

## Physical transactions and finite ends

`compileDoubleProgressionImproper(dance, couples, policy)` consumes two explicit `ProgressionEvent` entries, each with count 1 and the actual producing figure ID. The neighbor epoch changes at beat 48 and beat 64. Both declarations retain source evidence; extra fields, missing events, changed counts and conflicting markers reject.

The do-si-do completes a full orbit and a further half passage. A literal shoulder test measures the other actor's displacement against the actual body's right vector: right shoulder, backward left-shoulder return, right shoulder again. Original travel-facing is retained after the entrance preparation. Its final sideline exchange physically produces the first progression.

The new-neighbor box the gnat exchanges the next two dancers and releases to the exact 1.8-unit sideline spacing. A complete right-hand star preserves that exchanged permutation. The second event verifies the actual endpoints before rebinding; it does not translate anyone.

The source supplies no end policy. A separate required reviewed interpretation, persisted as `Dance.endPolicy` with `sameEndTurnBeats: 8` and `reentryPreparationBeats: 2`, says:

- Lark-left placement on re-entry
- Eight-count exchange across that same physical end at the beginning of each wait
- Stationary waiting after the turn until the final two counts before the event
- Reachable balance-stance preparation during those final two counts
- Neighbor rebinding and re-entry only at the next declared source event

Public waiting cues distinguish the initial same-end exchange from final re-entry preparation and identify the next event using its absolute count across repeats.

This is a selectable interpretation, not an attributed author instruction. Missing or source-explicit end-policy claims reject. The direct compiler also rejects a supplied policy that conflicts with the persisted declaration. It must remain visible in the import review and archive.

For two couples, both are out from beat 48 through the remainder of that round. They turn at their own ends, execute no fictitious next-neighbor arch or star, prepare the upcoming balance stance in counts 63–64, and re-enter at beat 64. Missing neighbors never become partners or duplicate actors. Every size from 2 through 12 discovers and verifies its actual N-round physical period; no assumed 2N cache or two-place jump is used.

An independent six-couple row oracle is:

- Initial: 0, 1, 2, 3, 4, 5
- Beat 48: 1, 0, 3, 2, 5, 4; active couple pairs (0,3), (2,5), with couples 1 and 4 out
- Beat 64: 1, 3, 0, 5, 2, 4; active couple pairs (1,3), (0,5), (2,4)

## Motion choices and body checks

The new do-si-do uses arc-length timing on a 0.9 by 0.45 ellipse. Its start/end acceleration is inside the source ten-count budget. These dimensions and the timing profile are animation choices, not additional source claims.

The right-hand star completes exactly one revolution in eight counts, gathering to a reachable 0.63-unit hub radius and releasing within those same counts. Its hands-across contact graph is the supported conventional interpretation; a wrist-grip modifier is not silently accepted. There is no extra travel beat or final formation reset.

Regression files:

- `src/double-progression-928.test.ts`: exact source, independent corners and shoulder gates, independent finite integer-row oracle, all 2–12-couple periods and encounters, persistent partners, missing-neighbor behavior, stationary same-end waits, physical/presented joins, argument consumption and input ownership, public disabled-capability/policy rejection and phase-correct waiting cues
- `src/double-progression-body.test.ts`: actual articulated Avatar cadence and fixed limb lengths, dense 200-samples-per-beat checks on the new figures, complete-star winding, wrist reach and sampled mesh clearance, including waiting-only body pairs so inherited active swing overlaps cannot conceal end collisions

The dense three-couple complete-period test reports zero new foot reach corrections, exact modeled arch/star hand anchors, and no sampled other-body overlap for the do-si-do or arch. The existing balance handoff retains a separately bounded approximately 4.15 mm wrist residual. The star still has the existing approximately 29 mm shared-hand-hub mesh overlap; outside that identified hub its sampled meshes clear. These are sampled procedural-model results, not a proof of anatomical accuracy or real-world dancer comfort.

The complete composition is registered through the public dispatcher and default source importer, with the separate `doubleProgressions` capability still available as an explicit disabled override. The actual retained source imports and archive-reimports with both source-explicit events and its separately reviewed eight-count turn / two-count preparation policy. Independent logical, body, public-waiting and source/archive audits pass. This registration is scoped to the reviewed complete composition and does not grant unrelated double-progression families.
