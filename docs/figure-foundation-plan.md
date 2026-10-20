# Figure semantics and coverage foundation

Status: working research baseline, 20 October 2026. This replaces individual
problem dances as the default prioritization method. It does not change playback
or declare new dances supported.

## Deliverables and scope

| Deliverable | Purpose | Location |
| --- | --- | --- |
| Implementation inventory | Account for every named `FigureKind`, including aliases, compound instructions and narrow geometry assumptions | [Inventory](figure-implementation-inventory.md) |
| Researched catalogue | Separate documented movement meaning from animation choices and unresolved variants | [Research catalogue](figure-research-catalogue.md) |
| Repeatable coverage census | Explain missing data, interpretation failures and compilation failures with explicit denominators | [Report](coverage-audit.md), [data](coverage-audit.json), `scripts/audit-coverage.mjs` |
| Composition specification | Define what a reusable figure must preserve and what the sequence planner may decide | This document |
| Prioritized implementation work | Select shared missing capabilities using measured blockers, then verify actual coverage gains | Decision section below |

The inventory is exhaustive for the current application enum, not for all contra
traditions. The research catalogue is a first source-backed semantic inventory of those
families and a list of missing families. A catalogue entry is not a claim of
working animation, authoritative caller review, or demonstration-video review.

## Research protocol

For each family, record the following separately:

1. **Definition:** participants, ordered actions and essential hand/shoulder
   choices. Prefer caller-authored teaching material, original author notes and
   explicit glossary definitions; preserve a direct source link.
2. **Variants:** distinguish aliases from changes in participants, amount,
   direction, hold, passing order, final facing or progression. Do not merge
   similar names solely because one existing animation can approximate both.
3. **Entry and exit:** state actual requirements and permissible alternatives.
   Never infer a universal starting square or universal exit from one example.
4. **Timing:** preserve authored counts. Mark any internal phase allocation as
   documented, inferred, or an animation convention.
5. **Evidence:** distinguish a read definition, a retained dance example, an
   independently checked transcription, an inspected demonstration and an
   experienced caller's review. A video link alone is not inspected footage.
6. **Conflict or uncertainty:** retain competing interpretations and the precise
   missing fact. Do not silently select a convenient meaning.

Research findings must constrain implementation; passing the implementation's
own tests cannot promote an animation convention into a dance definition.
Paraphrase sources concisely; retain attribution and avoid copying teaching text
or third-party implementation code.

## Contract for one figure

This is a proposed conceptual contract. It is not a new production API.

| Part | Required information |
| --- | --- |
| Identity and provenance | Canonical family, original wording, source reference, explicit interpretation choices |
| Participants | Stable dancer IDs resolved from relationships; distinguish persistent partner, current neighbor, same-role person and any additional relationship |
| Entry requirements | Relative arrangement, facing, contact availability, participant order and any required motion direction |
| Defining action | Ordered passages, rotations, exchanges and contacts that make the action this figure |
| Musical interval | Exact source start and duration; subdivisions with evidence status |
| Exit alternatives | Reached relative arrangement, facing, remaining contacts and participant order; alternatives allowed by the definition |
| Relationship events | Which binding changes, at which reached event; no movement caused by rebinding |
| Realization choices | Path curvature, spacing, acceleration, stance and other presentation parameters, separated from semantics |
| Result | Actual endpoint and action evidence; a structured rejection if the requested variant cannot be realized |

The present `SequenceBoundary` already carries positions, facing, contacts,
partner/current-neighbor maps, clock and epoch. Preserve that investment. Its
four-person requirement and two relationship maps are restrictions of the
current carrier, not definitions of contra dancing. Additional participants,
shadows or cross-minor-set interactions must receive an explicit scope design.

## Composition responsibilities

The planner resolves people and chooses among documented exit alternatives
using adjacent requirements. A figure realizes its defining actions from the
actual incoming state. Presentation draws bodies around that same motion.

An exit alternative may prepare the next figure only when it preserves the
current figure's action and source counts. For example, a different final facing
may be allowed; deleting a named passage or borrowing undisclosed musical counts
is not. If two requirements cannot coexist, report the conflict rather than
snapping bodies, erasing a held hand or guessing a new choreography.

A future planner may need more than one-figure lookahead. That is not permission
to recognize complete dances by source ID, title or sequence signature. Planning
must operate on requirements and alternatives with a bounded, inspectable trace.

Candidate reusable operations include directed passage, rotation about a person
or group center, exchange of places, travel with maintained facing, and timed
contact acquisition/release. These are hypotheses to test against the catalogue,
not a claim that every figure reduces to the same circular interpolation.

One concrete distinction: Ravitz describes swings as ending at a phrase boundary
without a prescribed revolution count, and permits varied following figures.
The engine's `max(1, beats/4-.5)` orbit count is therefore a rendering convention,
not the meaning of "swing." Preserve authored amounts for actions that specify
them; do not confuse preserving a legacy swing trajectory with preserving
choreography. [Ravitz, Notes on Choreography, Figures](https://www.dance.ravitz.us/choreography.booklet.pdf)

Do not begin by replacing everything with physics or a numerical optimizer.
First represent the semantic alternatives explicitly and establish where shared
deterministic geometry is sufficient. If a solver is later justified, its hard
constraints are named actions, people, contacts and musical boundaries; its
preferences may include smoothness and travel distance. A solver must not trade
away choreography to improve a numerical score.

## Migration experiment

Choose one frequent composition blocker from the census. Before writing a
replacement, retain the exact affected source set and an independent semantic
oracle. Develop the shared capability in isolation, then compare:

- Different dancer IDs, positions and orientations satisfying the same contract.
- Different preceding/following figures with the same relevant requirements.
- At least two independently authored dances where available.
- A rejected example that violates the contract, with a specific explanation.
- An unchanged example on the existing route.

Retain legacy routes while their domains remain unmigrated. A failed new route
must not silently reinterpret an explicit source instruction to use an older one.
Do not scale an isolated success into a claim about all variants of a family.

## Evidence and release gates

Use four distinct evidence layers:

1. **Meaning:** source-backed participants, passage order, hands, amount and
   destination relationships. Expectations should come from the specification,
   not be copied from generated output.
2. **Composition:** actual incoming/outgoing states, contact continuity, source
   counts, complete repetitions, odd/even sets and waiting/reentry behavior.
3. **Geometry:** sampled positions, turning, spacing and reach. Numerical limits
   are model guardrails unless independently justified as physical limits.
4. **Presentation:** before/after clips or browser inspection, plus explicit
   unreviewed footwork, GPU, audio and human-review limitations.

Run cheap invariant checks widely. Run expensive articulated-body sampling on
representative changed contact families. Broaden regression when the affected
scope requires it, not to inflate a test counter. Release only a separately
verified artifact; keep the existing public build while research is incomplete.

## Measuring useful progress

The headline is newly usable source records with correct interpretation and
whole-dance evidence, plus the shared capability that enabled them. Also report:

- Catalogue records with/without retained choreography.
- Retained records requiring interpretation, with overlapping reasons.
- Fully interpreted records rejected by compilation, grouped by actual cause.
- Compile successes that have not earned reviewed playback admission.
- New reviewed admissions and regressions against the prior fixed corpus.

Do not call missing choreography an unsupported figure. Do not label conventional
review suggestions as authored instructions. Do not sum overlapping blocker
counts into an invented number of unlocked dances. The retained set is selected
and cannot estimate the entire catalogue's difficulty without broader evidence.

## Keeping development work bounded

Run the census once per relevant importer/admission change and compare its
machine-readable output. Select a blocker group, then read its contract, one
adapter and contrasting examples. Do not repeatedly feed the entire catalogue,
generated archives or historical plans into model context. The inventory points
to implementations; the catalogue points to sources; the census points to actual
records. Use these indices to keep research and implementation work local.

Preserve reviewed interpretations instead of regenerating them to inspect state.
Keep independent review targeted to semantic decisions and changed contracts.
Report distinct movement capabilities and newly admitted records; repeated
dancer/frame checks remain supporting evidence rather than a progress metric.

## Decision after the first census

The offline census measures 2,422 catalogue records, 157 retained snapshots and
129 saved Ready interpretations. The 2,265 metadata-only records cannot be
classified by figure content. The retained set is heavily selected by prior
development, so it cannot establish the most frequent missing figure across the
whole catalogue.

Among the 28 retained records without a saved Ready interpretation, hypothetical
conventional suggestions produce two compile-admitted candidates, 21 earlier
interpretation-stage holds and five later motion/validation failures. These are
not new Ready admissions. Earlier stages also contain implementation gates;
"interpretation-stage" does not mean that the author wrote something ambiguous.

The next work is ordered as follows:

1. **Establish broader evidence.** Acquire a bounded, resumable sample of the
   metadata-only records through public source access, retaining canonical source
   provenance and fetching conservatively. Start with a reproducible selection
   across catalogue formations and authors, document nonresponses, and expand
   toward a full census if the access path supports it. Do not extrapolate the
   selected 157 or claim that all 2,265 are straightforward duple-improper dances.
2. **Review the existing compile-admitted candidates.** Source 8 (Baby Rose) and
   2194 (Bristol Court) need explicit review of suggested choices and full-dance
   validation before admission. This is a separate opportunity to improve usable
   coverage without inventing another motion adapter.
3. **Make hey variants the first generalization specification experiment.**
   Retained unresolved wording identifies six records with materially different
   hey requirements: 266, 495, 776, 2212, 2456 and 3533. Develop one ordered
   encounter/loop/rebound contract, map what existing `hey.ts` already expresses,
   and identify the smallest missing semantic or formation capability before
   implementing anything. This is the largest named related wording cohort
   identified in the current small sample, not six promised admissions.
4. **Use the five later failures as composition counterexamples.** Source 110
   rejects the rollaway state boundary; 729 rejects the courtesy leader's incoming
   side; 1926 rejects a pull-by continuation endpoint; 2987 fails clearance; 3310
   rejects a radial-swing geometry envelope. Diagnose whether each is source
   meaning, an unnecessarily narrow entry condition, or an actual impossible
   realization. Source 2987 also has a documented author/database conflict;
   numerical failure alone cannot choose the correct interpretation.
5. **Then broaden shared operations with evidence.** Arch/dive wording in
   179/1599/2299 and wave/allemande-to-wave wording in 907/1632/2006/3363 are
   subsequent cohorts. They overlap other blockers. In particular, 1599's
   cast-home variant must not acquire progression just because other arch/dive
   dances progress.

The first hey experiment has a concrete review matrix:

| Retained record | Observed wording distinction | Required decision before implementation |
| --- | --- | --- |
| 266 | Second half-hey has blank shoulder fields and progression | Corroborate omitted shoulders; distinguish missing evidence from motion failure |
| 495 | Along-set encounters include gyres; later hey looks onward | Preserve the authored alternative/compound meaning and neighbor identities |
| 776 | Stop when partners meet the second time | Represent the named encounter endpoint rather than guess a universal half/full fraction |
| 2212 | Across/diagonal heys and ricochets, multiple progression markers | Separate encounter actions from formation changes and event placement |
| 2456 | Second ricochet rotates into progressed position | Specify rebound, facing and reached progression without replacing it with an ordinary ricochet |
| 3533 | Up/down hey with a trail-buddy couple | Determine required participant scope and relationships beyond the current local carrier |

These distinctions were checked against retained row text, not inferred from
titles. A generalized implementation succeeds when it realizes the documented
encounters from multiple actual entry arrangements, preserves source counts and
relationships, and produces the required endpoints without dance-ID dispatch.
Only subsequently validated and explicitly reviewed records count as admissions.

No runtime rewrite or new admission is part of this research baseline. The prior
short-swing branch also remains unreleased: full CI found source 1464's adapter
expectation mismatch, recorded in the development checkpoint. Resolve it on its
own evidence rather than mixing it into this research change.
