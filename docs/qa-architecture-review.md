# Independent architecture audit for broad contra coverage

18 October 2026, 17:36 UTC. This is a code-based capability audit, not approval of additional choreography. Primary-source oracles remain separate in `qa/next-independent/source-oracles.md`; the expanded named challenges were independently checked against Koren Wake’s author page after the initial audit. They remain unsupported by the current whole-dance compiler.

## Verdict

The current implementation is a useful, fail-closed compositional subset. It is not an encyclopedic contra interpreter. The new requests cannot be fulfilled by adding dance cards to the catalog or relaxing parser gates. Several core contracts must first become more expressive. Butter success is evidence for one validated composition and its finite-set model, not evidence for all heys, all Becket, all progression, or arbitrary Caller’s Box records.

The strongest reusable components are stable physical identities, lossless original text, explicit source beat budgets, independently resolved named pass events, relation-bound chain recipients, transition solvers with endpoint contracts, and deterministic sampling. Retain those strengths while replacing assumptions that currently live inside whole-dance adapters.

## Hard limits in the current whole-dance compilers

| Area | Current contract | Consequence for requested breadth |
|---|---|---|
| Formation schema | `Dance.formation` is improper or Becket; circulation permits a label for CW/CCW, but only CW has a Becket compiler. | Reverse Becket is not implemented merely because the type can spell CCW. Proper, indecent, triple-minor, four-facing-four and other arrangements have no registered whole-dance model. |
| Relationship identity | `Relation` contains partner, neighbor, larks, robins, all. Physical IDs encode original couple and role by parity. | There is no general N2/N-1/shadow/diagonal identity resolver, and no independent dynamic partner graph for mixers. Nearest-person matching would be an incorrect substitute. |
| Group membership | Improper groups are constructed once per round. Becket groups are rebuilt at one opening shift and then stay fixed for the remainder. Primitives and chains require four actors. | Figures reaching into adjacent minor sets, diagonal progression and changing groups midphrase cannot be represented faithfully by the current section compiler. |
| Progression | Improper repeatability requires each couple’s exact adjacent single-progression row. Becket explicitly requires one opening left shift and refuses additional shifts. | Double progression, midphrase progression and reverse circulation require new event semantics, not a larger endpoint tolerance or a guessed final reset. |
| Repeat/cache contract | Becket assumes 64 beats and a `2 * couples` period; improper also uses a fixed `2 * couples` cache period after validating a single-progression arrangement. | This period is valid for the reviewed end policy, not for arbitrary progression, mixers, multicycle figures or alternate end modes. |
| Hey semantics | Basic event plan supports four people/two original couples, alternating center/side phases and only current neighbors. Source parser recognizes final partial passage, but whole Butter integration requires a full 16-beat hey with side-couple entry and a following partner balance. | Diagonal half-hey progression and source-specific partial exits are not covered. Rotating the axis alone changes geometric orientation, not relationship membership or progression. |
| Phrase/time model | Import requires A1/A2/B1/B2, 16 beats each, 64 total; source counts are not rescaled. | Irregular structures and choreography spanning more than one repeat are intentionally refused. |
| End effects | Out couples follow the adapter’s predetermined wait/cross/reenter path. There is no explicit selectable end policy in source, interpretation or runtime. | Bicycle-chain/cyclic wraparound is not implemented and cannot safely be substituted for open ends without defining what identities, directions and paths do. |
| Editor schema | Explicit improper/single interpretation; unsupported formation/notation blocks editing. | Honest safeguard, but not an editor for the new requested families. Export/reimport must preserve any future topology/end-policy choices. |
| Figure dispatch | Audit found unreachable approximate branches in the old switch. Core removed them after the finding; unknown private primitive kinds now throw. | Resolved defensive concern. Future registrations still need explicit tested variant contracts. |

## New semantic-kernel review

`next/topology.ts` now stages a generic mechanism for opaque actor IDs, variable-size groups, named bindings, multiple ordered relationship events, explicit boundary dispositions and dynamic mixer partners. This is a useful first implementation of the needed separation. It is not wired into whole-dance geometry or source interpretation, and it does not itself define any actual progression or end policy.

Independent tests (`qa/next-independent/check-topology-kernel.ts`) pass immutable actor/relation/boundary snapshots, unresolved absent-neighbor behavior, original partner retention, duplicate-ID refusal and epoch overflow refusal. Two regressions were reproduced and are now fixed and independently retested (all five probes pass):

- **P1 deterministic timeline:** after compiling an event at beat 8, changing the caller’s original event to beat 100 changes `sample(8)` from epoch 1 to epoch 0. The binary search retains mutable input event references.
- **P2 provenance:** exposed event objects are only shallow frozen; nested decisions, reference arrays and replacement group arrays remain mutable aliases.

Core now snapshots transactions deeply before sorting and uses the immutable snapshot for both reporting and sampling. Original-input mutation and exposed nested-object mutation cannot alter compiled timing or provenance in the independent regression. A passing generic timeline test must not be presented as a completed diagonal-hey, double-progression or mixer dance.

## Architecture seams needed before broad support

1. **A lossless source syntax tree and separate resolved interpretation.** Keep source spans, author wording, selectors, sequencing, simultaneity, alternatives, partial passes and unresolved choices. Recognition should never silently turn an unresolved clause into a named primitive. A user-approved interpretation can fill omissions without rewriting the original source.
2. **A persistent person graph and explicit relationship epochs.** Physical dancer identity must not depend on a current slot. Resolve partner, current/future/previous neighbor, shadow, role and diagonal selections to actual IDs at a named event epoch. A relation can remain bound across a topology change when the wording says to keep that person; it must not be reevaluated as “whoever is nearest now.”
3. **A timed topology event stream.** Rebinding, pass-through, progression, role changes, couple changes and entry/exit membership should occur at the relevant source beat, potentially several times within a round. Each event needs preconditions and identity-level postconditions. Geometry cannot repair an unresolved relationship by blending endpoints.
4. **Separate formation topology, spatial embedding and boundary policy.** Open-ended waiting, reverse streams, cyclic circulation and any wraparound mode need explicit semantics. The same figure can be embedded diagonally without changing its declared shoulder. A spatial mirror must not inadvertently swap right/left hands or courtesy-turn conventions.
5. **Compositional motion contracts.** A primitive should consume a resolved actor set and incoming position/velocity/facing/contact state, then expose event constraints, outgoing state and occupied space. Partial passes end in a shoulder-to-shoulder state, not a completed permutation. The following figure must supply a real continuation constraint. All entrance/exit time stays within the source allocation.
6. **A verified capability registry.** Register supported selector, formation, role order, direction, amount, duration and entry/exit variants explicitly. “Hey supported” is too broad. Unregistered variants remain inspectable. Tests should execute the same registered implementation the live app uses, rather than a separate helper with a similar name.
7. **Derived repeat contracts.** Cache by a validated topological state cycle or a bounded deterministic state machine, not a universal `2N` assumption. Huge seeks need safe cycle reduction only after the cycle is proven. Nonperiodic or unresolved cases should expose a finite study interval honestly.
8. **Versioned interpretation/provenance for topology choices.** Future archives must retain formation, circulation, progression count, relationship binding choices and end policy. Undo/redo, storage conflict handling and strict unknown semantic-field rejection already provide a good basis.

These seams are an extension plan, not a claim that an arbitrary notation can always be disambiguated automatically. Some source cards omit necessary information; the UI must preserve the ambiguity and offer explicit interpretation rather than fabricate certainty.

## Acceptance tests for the expanded scope

The three Koren Wake challenge sources have now been independently read at https://www.korenwake.com/choreography. They explicitly require reversed courtesy roles and indecent end handling (Pandora’s Box), diagonal half-hey and ricochet composition (Pigeon on the Jetway), and a progression rollaway without a half-sashay (Dreamland Races). The author page lacks explicit per-figure numeric counts, so detailed time allocations must be recorded as interpretations or checked against an additional authoritative source. Stable-ID endpoint oracles still need to be derived independently. Do not derive expected outcomes from the same parser/compiler being tested.

### Named source challenges

- Koren Wake / Pandora’s Box and other requested dances: retain exact source, modifiers and notes; verify every selected person and progression event before motion. A catalog/name allowlist is not an implementation of its figure family.
- Diagonal half-hey progression: verify the actual four IDs, their diagonal embedding, ordered shoulder gates, partial versus completed exit, new neighbor identity and actual displacement. Include actors from adjacent former minor sets if the source requires them.
- Double progression: verify that the intended two progression events or two-place net displacement really occurs, with correct intermediate neighbors. Test small sets where one or both progression steps meet an end; an absent neighbor must not resolve to the dancer’s partner or a duplicate.
- Reverse Becket: verify opposite circulation while preserving specified handedness and role order. Use stable-ID side/row endpoints as the oracle, rather than simply mirroring a successful CW movie.
- Optional bicycle-chain mode: first define the mode against an appropriate source or user-approved convention. Then verify distinct behavior from open ends, stable partners/roles, continuous visible paths or explicitly identified diagrammatic wrap, consistent relation epochs and export/reimport of the selected policy.

### General invariants

- No dancer is simultaneously assigned incompatible paths or two uses of the same hand.
- Every selector resolves to distinct authorized participants at the correct epoch; stale and ambiguous bindings reject.
- Uninvolved dancers have an explicit continuing state, including temporarily absent end neighbors.
- Every figure’s exact start/end identity relations, facing and contact conditions match its contract.
- Smoothness is tested separately from semantic correctness; a continuous wrong pairing still fails.
- All source duration is accounted for exactly; no appended progression or invisible reset.
- Partial or unfinished motion carries its true state into the next figure.
- Boundary policy is exercised over a complete circulation for even and odd set sizes, including minimal sets. Tests must not accidentally pass because the first round has no active group.
- Sample-order independence, cache-boundary continuity, large seeks, deterministic replay and state-cycle proofs remain explicit.
- Root-clearance tests are supplemented by actual articulated body, expected contact coverage, stance drift and camera tests. Browser rendering remains a separate acceptance gate.
- Import/export/editor/storage preserve the full interpretation and original source, including future semantics they cannot edit.

## Coverage reporting requirement

Maintain a machine-readable matrix by figure variant, selector, topology, formation and end policy. Report at least: recognized text, resolved semantics, compiled trajectory, whole-dance integration, articulated checks and browser checks. A green parser test is not whole-dance coverage. A green isolated hey is not diagonal progression support. A rejected unsupported card is a passing safety test but a failed requested-capability acceptance test.

Current truth: the app demonstrates a deliberately narrow validated subset. An independent run of all 15 downloaded Koren Wake Caller’s Box records produced zero playable dances: eleven are search-only with no public figures, and the four full-text records require unsupported choreography or phrase structure. All originals are retained; the report is `qa/next-independent/expanded-coverage-results.json`. The new encyclopedic request remains unfinished until the expanded contracts and independent source acceptance cases are implemented and tested.
