# Contra motion domain and import design

Research checked 18 October 2026. This document distinguishes source transcription, semantic interpretation, geometric validity, and stylistic animation. Passing one layer does not imply passing the next.

## Decision

Build an extensible choreography compiler, not a keyword-to-animation dispatcher. An arbitrary Caller’s Box record can always be *read and inspected* if its public data is available. It cannot honestly always be *performed*: some records withhold figures, some are under-specified, and many require figure/formation adapters not yet implemented. Preserve the complete source; compile supported, unambiguous semantics; return actionable diagnostics for the rest.

The initial implementation supports a narrow 64-beat, duple-improper, single-progression study preview. It rejects unsupported material rather than inventing a replacement. End positions, identity and social relationships must be testable independently of 3D polish.

## Verified Caller’s Box interface

The actual public per-record export is:

`https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10273&format=JSON`

The HTML page explicitly links to this export. No documented bulk API, schema version or blanket reuse licence was found. An HTTP request on 18 October with an Origin header returned application/json but no Access-Control-Allow-Origin. A static cross-origin app therefore needs the official download followed by local JSON upload/paste. A later server adapter can use an allowlisted host/path, numeric ID, response-size/time limits, and caching. Do not create an arbitrary URL proxy.

Observed fields, with their exact case:

- `request`, `download_date`, `ID`, `Name`, `Authors`, `InterpretedBy`
- `Permission`, `Status`, `BasedOn`, `FormationBase`, `FormationDetail`
- `Progression`, `Direction`, `Mixer?`, `Virtual?`, `PhraseStructure`
- `Music`, `Tunes`, `phrases: [{name, figures: string[]}]`, `CallingNotes`
- `Appearances: [{source, lo?, p?, vol?, no?, altnames?}]`, `OtherNames`
- `Videos`, `VirtualVideos`, `VariantVideos`, `VariantVirtualVideos`

Most optional values are empty strings or arrays, not null. IDs are strings. Figure counts remain inline text, for example `(8) Circle left 3/4`. Appearances are source identifiers plus local offsets, not necessarily directly usable URLs. Video strings can contain annotations after a URL. The `request` field can contain HTTP even when the client used HTTPS; retain it as source data but build the display link from a validated HTTPS record ID.

The FAQ documents full-display, searchable-but-hidden, metadata-only, and omitted records. It also distinguishes broken/deprecated status and unusual phrase structures. The parser must preserve all of these. Record #2562 actually returns `Permission: "search"` and `phrases: []`. Never infer concealed instructions by querying the search engine. [Source FAQ](https://www.ibiblio.org/contradance/thecallersbox/FAQ.htm)

Permission and licensing are separate. For example, #1’s HTML displays CC-BY-NC but its JSON export did not include that label. Do not infer a licence from `Permission: "full"`, or infer licence absence from JSON alone. Keep author attribution and source links; obtain a suitable licence/permission before distributing a substantial catalogue. This is an engineering data-handling recommendation, not a legal conclusion. [Example page](https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=1)

## Source language is a notation, not plain prose

The notation distinguishes individual roles and partner/neighbor/shadow relations. Future neighbors and partial passes are meaningful. Semicolons sequence actions; commas and `||` can mean concurrency; `//` offers alternatives; brackets qualify participants. Counts belong to a composite clause and cannot simply be assigned to each inner action. [Notation reference](https://www.ibiblio.org/contradance/thecallersbox/Brief-glossary.htm)

An import must consume the entire clause. Recognizing “swing” inside “swing through,” dropping an orbit after an allemande, or treating a partial hey as a complete generic hey is an error. An LLM may propose an interpretation, but should emit a reviewable AST and uncertainties, never silently authorize playback.

## Extensible intermediate representation

The implementation’s small `Figure` interface is a first adapter, not the long-term language. The architecture should grow into the following layers.

### 1. Immutable source envelope

```
SourceEnvelope {
  source: { provider, recordId, canonicalUrl, exportUrl, fetchedAt, contentHash },
  authors, interpreters, permission, licenceEvidence, status,
  originalBytesOrText, originalFields,
  parserVersion, dialectVersion
}
```

Keep unknown fields. Preserve text spans into source clauses, enabling “why did this person move?” to link to the original instruction. Distinguish a source transcription error from an animation error.

### 2. Musical structure

```
MusicPlan {
  beatUnit, meter, phrases: [{id, measures, beatsPerMeasure, beats}],
  sections, repeatPolicy, tempoMap
}
```

Represent beats as rational numbers; seconds are a derived tempo integration. A phrase is not necessarily 16 beats, a repeat is not necessarily 64, and a waltz beat is not a fixed walking-step prescription. Support additive structures and unequal phrases without evaluating source strings as executable arithmetic. Initially reject nonstandard structure with an explicit diagnostic.

### 3. Participants, topology and relationships

```
Dancer { id, appearance, danceRole }
Couple { id, memberIds, partnershipPolicy }
SetTopology { formation, slots, majorSets, minorSets, edges, boundaryPolicy }
RelationshipRef { kind, referenceEpoch, offset?, roleFilter?, explicitIds? }
```

Dancer identity is stable. Dance role is separate from appearance, gender, color, current side, and progression direction. Ones/twos are traveling positions/directions, not permanent identities. Partner is usually stable, except explicit mixers. Neighbor N1 is bound at a particular phrase/cycle epoch; N2 cannot mean “whomever is closest now.” Shadows and corners need named mappings, not nearest-neighbor guessing.

A finite major set must have actual ends. After a valid single progression, end couples wait, cross roles/sides as appropriate, reverse direction and rejoin. Do not wrap the top to bottom unless the source formation is circular. Support odd numbers of couples, multiple progressions, reverse progression, asymmetric participation and out-of-set interactions through boundary-policy adapters. End effects are choreography, not rendering.

### 4. Structured action graph

```
Action = Sequence | Parallel | Choice | Repeat | Primitive | Unsupported
Primitive {
  verb, participants: RelationshipRef[],
  hand?, shoulder?, facing?, direction?, amount?, axis?, targetFormation?,
  duration: {beats, origin: explicit|convention|reviewed},
  preconditions, postconditions, sourceSpan, assumptions
}
```

Concurrency shares time but has disjoint or deliberately coupled actor/resource sets. Choice requires a selected branch. Duration origin must remain visible. A generic “form a diamond” is not a teleport; it is a target constraint needing a transition solver or explicit authoring.

### 5. Kinematic plan

A primitive adapter produces per-dancer root trajectories, torso/head facing, foot-phase hints, contact intervals, and exact semantic endpoint constraints. Hand contacts are typed edges:

```
Contact {
  actors, anatomicalTargets, gripStyle, startBeat, endBeat,
  weightEnvelope, reachLimit, sourceOrStyleOrigin
}
```

An endpoint is not just a coordinate: include facing, role-relative position, relationship bindings and hand availability. Model swing-frame and courtesy-turn contact anatomically; a palm grip differs from a hand on a shoulder blade. Star grip, balance direction and swing revolution count are often style decisions. Show them as model choices rather than claiming the source specifies them.

Use continuous paths and bounded acceleration; bridge feasible transitions inside allocated musical time. Never add a hidden five-beat “progress” animation or teleport at a repeat boundary. Exact figures may be geometrically infeasible at the chosen scale/tempo. Report that instead of silently distorting timing.

## First oracle: The Baby Rose

David Kaynor, Caller’s Box #10273; also documented in CDSS’s beginner-calling guide. The prototype transcribes this source and maps legacy ladies terminology to robin role labels. The attribution is retained. [Record](https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10273) · [CDSS guide, page 5](https://cdss.org/wp-content/uploads/resources/CDSS-The-Basics-of-Calling-Contras.pdf)

- Beats 0–4: neighbor balance; 4–16: neighbor swing
- 16–24: circle left three quarters; 24–32: partner do-si-do
- 32–36: partner balance; 36–48: partner swing
- 48–56: robins chain to neighbor; 56–64: left star once, face next neighbors

With corners ordered NW, NE, SE, SW, top of hall north, initial roles are `[R1,L1,R2,L2]`.

| Checkpoint | Corner occupants |
|---|---|
| Initial | R1, L1, R2, L2 |
| Neighbor swing complete | L2, R2, L1, R1 |
| Circle left ¾ complete | R2, L1, R1, L2 |
| Partner do-si-do complete | R2, L1, R1, L2 |
| Partner swing complete | L2, R1, L1, R2 |
| Chain complete | L2, R2, L1, R1 |
| Star complete | L2, R2, L1, R1 |

This is the key invariant: couples already exchanged rows. Progression is a consequence of the permutation. At the boundary, rebind groups with new adjacent couples and orient appropriately; do not translate everyone another row.

Simplicity Star by Tom Lehmann (#939) is a second source-checked sequence testing 6/10 timing, long lines and left/right stars. Its record specifies no N2 qualifier on the second star; do not invent one. Simplicity Swing (#10732) explicitly says N2 for its last do-si-do and is therefore a distinct topology case, currently rejected. [Simplicity Star](https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=939) · [Simplicity Swing](https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10732)

## Figure taxonomy and adapter roadmap

1. Partner/neighbor pair primitives: balance, swing, full do-si-do, allemande; include handedness, turn fraction and endpoint facing.
2. Four-person group primitives: circles and stars, followed by chains and courtesy turns with correct receiving dancers.
3. Lines/waves: long lines; lines of four; bends; wave balance; Rory O’More slides with retained hand/side semantics.
4. Pass networks: full/half/partial heys, square through, weave-the-line. Store ordered pass events with actual participants and shoulders.
5. Local role permutations: rollaways, California twirls, box the gnat, petronella, trades; each needs body-facing and hand changes.
6. Extended/topological figures: diagonal actions, shadows, contra corners, contra mixers, double progressions and reverse progression.
7. Additional formations: proper, Becket, indecent, progressed improper, triple minor, triplets, four-facing-four, Sicilian circles, grids, mixers and virtual dances.

These are implementation families, not a claim that each is implemented. The authoritative glossary is useful as a specification source, but definitions still require explicit geometric interpretation and testing. [Figure and formation glossary](https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm)

## Validation and honest coverage

A review result should expose independent statuses: source available; syntax consumed; relationships resolved; timing satisfied; formation supported; motion compiled; collision/reach checks passed; progression validated; human-reviewed choreography. Use “source checked” only for transcription. Do not collapse all of this into one green verified badge.

Required test layers:

- Unit: every primitive’s endpoint permutation, heading and contacts, including inverse/handed variants.
- Exact music: no dropped, duplicated or silently rescaled beats; alternatives and nested counts tested.
- Identity: stable dancer ID and partner mapping across at least an entire journey down and back.
- Finite sets: 2–12 couples, both odd and even counts, endpoints and out-couple behavior.
- Geometry: minimum torso separation, arm reach, one anatomical hand in at most one incompatible contact, continuous positions and heading.
- Regression: parse real permitted records including refused examples; never promote unsupported tails through substring recognition.
- Source fidelity: record ID, author, original clauses, variant/deprecated status and source links persist after edits.
- Coverage metrics: tested supported records / sampled records, with formation and figure-family breakdown. Also report unsupported/ambiguous/permission-hidden counts; a percent of recognized words is not useful coverage.

Initial QA deliberately rejects Goody One Shoe #150 (Becket, double progression, shadows and partial hey), Jefferson and Liberty #3461 (proper and active-only figures), Balance and Cross #6953 (line travel and partial hey), The Nice Combination #1 (line-of-four movement), and restricted #2562. Rejection is correct behavior until their adapters exist.

## Implemented import contract

`parseDanceText(text)` / `parseDance(text)` returns `{dance?, errors, warnings, record?, clauses?}`. Any unconsumed figure clause, unsupported formation/progression/musical structure, or bad phrase order blocks executable output. Successful output remains a study preview with source metadata retained. `callersBoxExportUrl(text)` validates the exact source host/path and one positive decimal ID. The UI can offer that official download and accept a local file or paste.

Files added: `src/parser.ts`, `src/catalog.ts`, `src/parser.test.ts`. Current supported import vocabulary is intentionally narrower than the union of experimental engine primitives; adapters with ignored amount/contact semantics are quarantined until verified. Five test groups cover positive source/card imports, adversarial compounds, timing/formation/phrase rejection, metadata/permission preservation and URL safety.
