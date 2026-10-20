# ContraDB source adapter

Verified against live public ContraDB on 18 October 2026. This is a source adapter and a small, explicit motion subset, not an all-dances renderer.

## Implemented

- `src/contradb-source.ts` parses saved public HTML as inert, bounded data. It retains exact title/author/formation/hook/preamble/notes/table/publication fragments, all timed rows, original role terms, progression glyphs, source ID, author link, API revision metadata when provided, and stable per-record/per-snapshot identities. It never executes source HTML or declares a source playable. URL validation and matching metadata establish structural consistency, not authentication of user-supplied page contents; that distinction is explicit in provenance.
- `src/contradb-import.ts` consumes entire rows into the current `Dance` contract. Unknown qualifiers, unclaimed rows, invalid timing, extra parameters, notes, formation variants, or unmatched progression remain blocking diagnostics. Metadata-only API responses cannot become choreography.
- `readContraDbImport(input, options)` accepts saved HTML, a `contra-studio/contradb-snapshot` v1 file, or a `contra-studio/contradb-interpretation` v1 file. `isContraDbInput` supports app-level routing. Results have `dance?`, `errors`, `warnings`, `record`, `rows`, `diagnostics`, `coverage`, and `validation`.
- A combined balance/swing needs an explicit per-row four-beat balance choice. A bare chain needs an explicit named receiver. Source “Becket” without explicit circulation needs an explicit CW choice. These are preserved interpretations, not hidden source facts.
- `validateDance` and `compileChoreography` must both pass before a dance is returned. A known title never bypasses validation.
- Saved `dance.sourceText` contains the source snapshot and interpretation choices, so upload/save/reload does not drop the decisions. Saved choices are bound to the exact snapshot identity; changing that source requires a new review. The original source remains separate. `variantIdentity` uses the actual ContraDB ID; `snapshotId` is a stable non-security content fingerprint. A changed snapshot never pretends to be the same original transcription. `updated_at` remains the source revision when the public API provided it.

Example explicit interpretation for public Butter #94:

```ts
readContraDbImport(savedHtml, {
  sourceUrl: 'https://contradb.com/dances/94',
  interpretation: {
    circulation: 'cw',
    rows: {
      'contradb:94:row:4': { chainReceiver: 'partner' },
      'contradb:94:row:6': { balanceBeats: 4 },
    },
  },
});
```

The default import requests those three decisions and returns no executable dance.

## Public endpoints and transport

Official sources consulted:

- https://contradb.com/about
- https://github.com/contradb/contra
- https://github.com/contradb/contra/blob/master/config/routes.rb
- https://github.com/contradb/contra/blob/master/app/controllers/api/v1/dances_controller.rb
- https://github.com/contradb/contra/blob/master/lib/filter_dances.rb
- https://github.com/contradb/contra/blob/master/app/models/dance.rb
- https://github.com/contradb/contra/blob/master/db/schema.rb
- https://contradb.com/dances/94

The app's anonymous search POST endpoint is `https://contradb.com/api/v1/dances`; `{count, offset}` returns inventory metadata, including IDs, titles, choreographers, formations, publication states, and created/updated timestamps. It does not return complete figure JSON. The internal application's database schema has `figures_json`, but this adapter does not invent a public export or fetch private/edit endpoints.

Live requests with an Origin header on 18 October returned no Access-Control-Allow-Origin header for either the public page or API. A static cross-origin app therefore cannot directly fetch those URLs. The deployed private app now retrieves a numeric record through its own `GET /api/contradb/:id` Worker route. That route fetches only the corresponding public ContraDB dance page, with no redirects or forwarded credentials, a 12-second timeout and a 500,000-byte limit. The returned snapshot still requires semantic review. Saved HTML/snapshot import remains the offline fallback. This is not a general URL proxy.

## Inventory and sampled coverage

Public API at the final verification (18:18:19 UTC) reported 2,427 searched records, 2,426 containing figures. The bounded paginated acquisition retained 2,422 distinct metadata IDs, with no duplicates. Four offsets (490–493) returned HTTP 500 even as one-record requests. This is an incomplete snapshot, not a complete downloaded corpus. Acquired publication states: 2,232 “everywhere”, 190 “sketchbook”. No private account records were accessed.

The separate local research corpus contains 32 purposively selected saved public pages: known difficult review cases plus a coarse inventory sample. It is not a random sample, and its percentages must not be extrapolated to the full inventory.

- 32/32 source pages structurally retained
- 257 source figure rows; 225 contain recognized vocabulary; 79 fully resolved without interpretation choices
- 0/32 executable with no interpretation choices
- 3/3 specifically reviewed imports executable with explicit choices: Butter #94, The Baby Rose #1166 and Dancing in My Bones #1502
- #1166 is publicly readable but marked sketchbook. The status and a warning remain intact; it is not relabeled as published or verified.

The original Caller’s Box goal remains separate: this adapter does not merge records by title or overwrite Caller’s Box variants. Dreamland Races #2006 retains CCW. Pigeon on the Jetway #2212 retains double progression and its own B2 text. Pandora’s Box #3004 retains its reversed courtesy-turn and end-effect instructions and remains blocked.

## Licensing and provenance

ContraDB states that its software is AGPL-3.0. That is a software license, not evidence that every submitted choreography or database record is available under the same license. No ContraDB implementation was copied into this adapter; the source inspection established endpoint/record contracts only.

Choreography/source-page rights are marked `not-established`. Public readability and “shared everywhere”/“sketchbook” are retained as publication/access facts, not converted into blanket republication permissions. The small checked-in snapshots are regression inputs with author/source attribution. No bulk choreography catalog is bundled for publication. Do not automatically upload the local research corpus as app assets.

## Verification

`node --experimental-strip-types --test src/contradb-import.test.ts` covers eight actual source snapshots, two complete playable interpretations, exact source/choice roundtrips, version/identity preservation, unclaimed rows, source qualifiers, notes, contradictory/unused choices, publication/licensing distinctions, bad URLs, malformed source fields, and input bounds.

`../corpus/contradb/analyze-corpus.ts` regenerates the separate quantified report from acquired public pages. Its output distinguishes inventory counts, source parsing, lexical recognition, semantic resolution, and motion validation. The independent critic owns additional adversarial coverage under `../qa/next-independent/`.

## Reviewed motion expansion

The registered capability options `{archExchanges:true, partialHeys:true}` now permit Dancing in My Bones #1502 after source, finite-set and actual articulated sequence review. The default importer accepts it once the two balance timing choices and the chain-to-neighbor interpretation are reviewed. Callers can explicitly disable the capabilities. The generic source clauses consume a four-count right-hand balance plus four-count box the gnat, and a literal eight-count left-center half hey with four pass layers ML;PR;WL;NR. The arch explicitly selects the conventional robin-under path. Each choice is disclosed in the retained interpretation.

The half-hey primitive accepts explicit actor IDs, relationships, endpoints and a rotated frame. The registered wrapper is narrower: current neighbors on the two sidelines, ending opposite with those same neighbors for a balance. This does not enable arbitrary diagonal heys, truncated passes or alternate end policies. It consumes every source pass without appending transition beats.

Independent checks covered 19,712 whole-sequence frames and 1,529 boundaries over 2–12 couples, exact source/archive roundtrip, current-neighbor identities and final single progression. Actual-mesh review covered the new arch/half-hey transitions and both first swing counts with fixed limb lengths and one footfall per beat. Existing fast general-figure stance corrections remain schematic limitations; this is not biomechanical validation.

## October 18 evening import/usability expansion

`src/source-review.ts` is a UI-only preparation layer. The base source importer still does not invent omitted choices. Review preparation:

- Suggests conventional four-count combined balances, visibly labeled as interpretation.
- Tests at most 16 missing chain-receiver assignments and suggests one only when exactly one complete interpretation passes the current source, formation, and whole-cycle motion checks. “Unique in this model” is disclosed; it is not represented as an authored source statement.
- Reuses saved choices only for the exact source snapshot and only after revalidation. Saved interpretation envelopes remain locked until “Make a separate interpretation” explicitly unwraps a copy of the retained snapshot.
- Clearing or changing a suggestion persists through review; no subsequent hidden default re-enables it. The original source, source publication state, and exact row qualifiers remain visible.
- Keeps the existing numeric-record-only `/api/contradb/:id` downloader unchanged. Library entries are links and descriptions, not bundled choreography pages or a promise that all records execute.

The library has one-click source review for Dancing in My Bones #1502, original publicly shared Baby Rose #8, Butter #94, and Back of the Envelope #773 after independent source/topology and swing-exit checks. #8 is an alternate source of an already supported choreography, not a new unique dance. `to new neighbors` is consumed as the exact synonym of the existing trailing `to next neighbors`; additional qualifiers still block.

#773 is a genuine new complete source composition. It omits a progression glyph. The snapshot-bound choice `progression: 'end-of-cycle'` is permitted only for marker-free improper sources, adds no figure or displacement, and still requires the unchanged compiler's exact original-ID/role single-progression endpoint and continuity checks. Clearing it blocks playback. Independent source/runtime tests pass across 2–12 couples, but this is distinct from articulated-body clearance; the reported late swing/progression gait correction was fixed and independently rechecked (zero swing clamps across all 12 actual avatars and integer-beat footsteps). A remaining 51.6 mm robin allemande correction matches the disclosed legacy #1502 behavior; this is schematic motion, not biomechanical validation.

Staged source #2259 (Box the Gnat Contra) now resolves all seven source rows and the exact 64 beats through two distinct-relation balance/arch exchanges, a neighbor balance/swing, robin allemande, partner swing, right-and-left-through, and a final source-marked chain. Its new capabilities remain controlled by the integration owner. Bare right-and-left-through requires explicit saved `rightLeftThrough: {hand:'right', courtesyReceiver:'partner'|'neighbor', courtesyLeader:'lark'|'robin', crossingRelation:'partner'|'neighbor'}`. The conventional assignment is labeled, editable, and rejected when actual incoming identities disagree. Wrong hand mode, roles, relations, timing, unused choices, and nested unknown fields block.

Pandora's Box #3004's complete clause `right left through (ladles courtesy turn this same neighbor gentlespoon)` now retains robin-led neighbor courtesy roles instead of silently normalizing them to the ordinary arrangement. An incompatible lark-led partner choice is explicitly rejected. This row-level progress does not enable the complete dance: its other motion, progression, setup and end-effect notes still block.

The research expansion fetched 74 additional public pages (14 named simple candidates plus a bounded systematic 60-record blank-hook improper sample). The local page corpus is evidence for implementation, not a licensed catalog asset. Metadata inventory coverage remains 2,422 distinct records and incomplete.

Verification additions:

- `src/source-review.test.ts`: suggestions, source binding, override persistence, #773 endpoint interpretation, #8 qualifier preservation
- `src/contradb-expansion.test.ts`: actual #2259 staged composition, capability gates, adversarial RLT parameters, exact reversed-role Pandora clause
- `src/source-library.test.ts`: every featured title/author/URL checked against its actual retained source
- `../qa/contradb/check-expanded-ui.mjs`: eight passing Happy DOM workflows with real source parsing and compilation, including same-origin ID fetch, visible suggestions, override failures, archive copying, source #773, unsupported #3004 and stale-download races. This is not actual browser/network, screenshot, WebGL or GPU validation.

## Source/event and hall checkpoint (18 October 2026)

- `#138 The Nice Combination` keeps the exact adjacent 8-count down/turn and 8-count return/bend clauses. The separately stored `[4,4,4,4]` phase allocation is visible, editable and removable. A specifically down-facing paired swing is required; the two source rows retain independent provenance even though one 16-count motion composition consumes them.
- `#3490 Forgotten Treasure` reuses that composition with its exact punctuated neighbor-swing exit. Its phrase “chain to new neighbors” is ambiguous: `nextNeighborQualifier: 'after-figure'` explicitly chooses a current-neighbor courtesy turn followed by the outgoing new-neighbor endpoint. The UI and archived warning disclose that distinction. The original wording is never rewritten. Beth Parkes's published 2008 Ralph Page Dance Legacy Weekend syllabus, printed p.40, independently says “Ladies chain across”: https://library.unh.edu/special/forms/rpdlw/syllabus2008.pdf.
- `#175 Simplicity Swing` retains the marked full star and following “next neighbors” do-si-do. A typed event names the exact source figure boundary, single progression and same-end waiting role policy. The narrow hook “simple starter” remains retained as a separately accepted difficulty description, not a generic waiver of notes.
- `#3004 Pandora's Box` retains the robin-led same-neighbor courtesy, partner crossing, across-set box-the-gnat qualifier, exact right-center four-pass half hey, next-neighbor swing, and reversed waiting-role note. Source setup is mapped to clockwise circulation with an explicit disclosed choice. Source content cannot grant the independently registered event/RLT/arch-to-courtesy capabilities.
- `#185 Courageous Soul` is an additional actual public source composition found by the automated corpus pass. A final bare chain may use a uniquely endpoint-valid receiver suggestion, but remains blocked if that choice is cleared. Missing choices no longer produce a misleading extra “unsupported progression” diagnostic before a figure exists.

Saved source envelopes bind all decisions to the exact snapshot and round-trip the complete source, including hook, setup and notes. Unknown annotations or appended movement instructions reject. The structured editor rejects source event contracts and figure fields it cannot represent, avoiding lossy conversion.

The review summary describes source/timing/identity validation; body motion remains schematic. The UI checks in `qa/contradb/check-expanded-ui.mjs` use Happy DOM with controlled fetch and real compiler modules, not a live browser, GPU or WebGL session. Source/editor safety has separate bundled Node checks. Independent source/event and articulated-body checks are recorded separately by the integration reviewer.

Full corpus analysis lives outside the app bundle. Official API source exposes metadata search, not a documented full-choreography export. Acquisition uses cached public dance pages, bounded requests and backoff; raw pages are not deployed. All coverage reports distinguish structural retention, lexical recognition, resolved source semantics, explicit reviewed choices and actual complete compositions.
