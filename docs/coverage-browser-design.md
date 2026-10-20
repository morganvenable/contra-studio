# Contra Studio: transparent coverage and end-treatment design

Status: design plan for the broader choreography milestone. The current player/editor is deliberately narrower. This document adds no playable options and makes no claim that the requested examples have been implemented or validated.

## Outcome

A caller can find the figure or dance they mean, see exactly which interpretation the simulator can execute, preserve a source that cannot yet run, and understand which choices remain unresolved. A broad reference catalogue must not imply equally broad motion support.

The normal studio remains a rehearsal space. Detailed coverage appears in a dedicated **Figure & formation coverage** browser, linked from the library, Guide, import diagnostics, and unavailable editor controls.

## Navigation and layout

Desktop: a wide dialogue or dedicated app view with a search/filter rail, an expandable list of coverage cards, and a detail panel. Mobile: search and filters above a single-column card list; details open as a full-height sheet. Avoid a dense horizontal spreadsheet as the primary interface.

Header copy: **Find the movement. Know the model.**
Subtitle: “Explore documented figures, formations, progression and end treatments. Each entry shows the exact combinations this version can rehearse.”

Search matches common names, historical role terminology, source notation, aliases, choreographer and example title. Alias matches are visible rather than silently normalizing away source wording. Source titles and authors are always plain escaped text.

Filters:
- Category: figures; formations; progression; end treatments; complete dances.
- Rehearsal status: playable in a stated context; in review; documented but not implemented; needs a source/interpretation decision.
- Formation and progression as optional context filters, including an explicit “All documented contexts” view.
- “For the current dance” evaluates capabilities against its actual formation, topology and position. It must not simply compare a figure-name string.

Search results have stable IDs for bookmarks and cross-links. Every result shows name, variant summary, precise status text, and source/example count. No status is communicated by colour alone.

## Status vocabulary

Do not place one universal green check beside a family such as “hey”. Use a narrow human-readable statement derived from capability constraints, e.g. “Playable: [explicit supported variant and entry context].” The concrete wording is supplied by the domain registry, not inferred by the UI.

Primary outcomes:
1. **Playable in this context**: source interpretation, topology and implemented motion adapters agree; still subject to the model's stated movement limitations.
2. **In review**: implementation exists but is not registered for normal playback. Offer evidence/details, not a Play button.
3. **Documented; not yet playable**: known source semantics, no approved executable adapter. Preserve its source and show the missing capability.
4. **Needs clarification**: source leaves a material choice unresolved. Show the original clause and exact question.
5. **Unavailable for this context**: the figure may work elsewhere, but the current formation/relationship/timing/end state does not meet its requirements. Say why.

“Not documented” and “not implemented” are different. “Not valid” is used only when the domain validator has evidence for incompatibility, never as a synonym for missing code. Missing registry data defaults to unknown/unavailable, never supported.

## Detail panel

Each entry includes:
- Original terminology and aliases.
- Variant parameters, with only documented values represented.
- Required entry relationships, facing and formation.
- Resulting relationships and position/facing constraints.
- Source examples with authorship, verified record links and exact relevant clauses.
- Supported and excluded combinations in this build.
- Model limitations: paths, contacts, body/posture, timing, end transitions.
- Review evidence: version/date, automated checks and whether rendered/body review has occurred. “Source checked” is not “validated human motion”.

An expandable “Implementation detail” section separates four facts:
1. Source recognition/interpretation.
2. Relationship and progression compilation.
3. Movement/contact model.
4. Verification evidence and known limitations.

This prevents a parser accepting a name from masquerading as a complete dance simulation. It also makes progress visible without exposing unfinished adapters as safe choices.

## Requested families and examples

The user explicitly requested an encyclopedic scope, including Pandora’s Box attributed to Koren Wake, diagonal half-heys, double progression, reverse Becket and bicycle-chain end effects where appropriate. These are discovery targets until the domain worker provides exact source evidence and semantic variants. Do not fill the reference with assumed choreography or treat these names alone as sufficient executable instructions.

A dance example may reference multiple capability entries. Its result is evaluated for the complete sequence, including transitions and ends. A set of individually supported figures does not imply the whole dance is playable.

## Contextual end-treatment controls

Under the stage, next to Set size and Follow, show a compact summary such as **Ends: [active policy]** only once the runtime supplies an explicit policy descriptor. The current default must describe actual compiler behavior, not a guessed traditional label.

Clicking the summary opens **At the ends of the set**:
- Current policy with a short description and small schematic/example when available.
- What happens to couple identities, role sides, direction and the next active neighbours.
- Whether this comes from the original source, a declared interpretation choice, or an explicit user override.
- Available alternatives for this exact dance and topology, if any.
- Unavailable alternatives with contextual reasons, shown as explanatory items rather than deceptive enabled controls.

No checkbox labelled “Bicycle-chain ends” until an implementation and validator can establish its compatibility for the current dance. Inapplicability is not universal lack of support. Likewise, a policy implemented for one formation does not automatically become selectable for reverse Becket, double progression or a diagonal transition.

When exactly one policy is supported, present a read-only current setting plus “Why these ends?” Do not offer a select with a single effective choice just to suggest configurability.

If a policy override is supported:
1. Show the original policy and the proposed interpretation change before Apply.
2. Validate the whole finite set over the required circulation, including every end and progression phase for the selected size.
3. Keep the original source unchanged and save the explicit policy in the edited interpretation schema.
4. Apply paused at beat 1, with undo/redo independent of rehearsal time.
5. Preserve the existing playable dance if validation fails.
6. Recheck the policy when set size changes; do not silently switch policies or substitute end movements.

If no approved policy exists, the dance cannot loop through an invented transition. A domain-approved finite playable segment may be offered only with an explicit stopping boundary and reason.

## Import and editor integration

Import review should retain a source record even when it cannot compile. A future library distinguishes **Source records to review** from playable interpretations; saving the original record does not grant a Play state. Existing failed-import messaging continues to say that the current dance is unchanged.

Unsupported clauses link directly to a coverage entry or a visible “Unclassified source clause”. A recognized family does not discard unresolved parameters. For ambiguous material, present the smallest decision the caller needs to make alongside the exact source text.

The structured editor shows contextually implemented choices. A link “Browse documented figures” reveals the broader catalogue without enabling unsupported kinds. Choosing an unavailable reference item may add an explicitly unresolved draft row only if the user asks to retain it; it must never replace it with another figure or allow Apply.

Original source, original attribution and edited interpretation remain separate. Expanded schemas must preserve formation, progression multiplicity/direction, relation bindings, hey entry/pass/exit notation, and end policy before those features can become editable. Current Becket editing remains explicitly unavailable.

## Registry contract needed from the domain layer

A proposed read-only view model, not executable choreography:

- Stable capability ID, family ID, name, aliases, category.
- Parameter dimensions and documented values.
- Source references and example references, with source-check status.
- Adapter lifecycle: absent, staged or registered.
- Typed contextual requirements/exclusions: formation, progression, role/relation bindings, entry/exit, phase and timing.
- Context evaluator returning available, unavailable or unresolved plus human-readable reasons and required decisions.
- Evidence references and model limitations.
- For end policies: stable policy ID, source/interpretation provenance, applicable contexts, finite-set constraints and required validation horizon.

The UI consumes a domain-produced compatibility result. It does not invent a second semantic validator or derive availability from free-text labels. Saved archives store semantic identifiers/parameters, not display status or generated names. Status updates must not silently reinterpret older archives.

## Accessibility and responsive behavior

- Search has a persistent label; filter groups have headings and keyboard-operable controls.
- Summaries announce status and reason in text. Counts update in a restrained polite live region, not every frame.
- Each result is a single clear navigation target; disclosures and source links remain separately reachable.
- Focus returns to the originating diagnostic/editor row after closing details.
- Unavailable choices have readable reasons available to keyboard and screen-reader users, not tooltip-only explanations.
- Source text wraps safely; horizontal scroll is confined to genuinely structured notation, with an accessible text alternative.
- No motion preview autoplays. Respect reduced motion and preserve the user's rehearsal pause state.

## Acceptance checks and release sequence

1. Browse both implemented and unimplemented entries; no broad family-level support claim hides a restricted variant.
2. Search a source alias and inspect the exact retained wording.
3. Open an unsupported import diagnostic and return without losing the input or changing the scene.
4. Change formation/progression context and observe accurate availability reasons without silently changing the figure.
5. For any newly registered complete dance, test source → review → playback → export → reopen and finite-set progression across supported sizes.
6. For every selectable end policy, test all required end phases, stable identities, compatible role/relationship rebinding, failure recovery and schema roundtrip.
7. A staged adapter, missing registry entry or unresolved source never gains Play/Apply merely through a UI control.
8. Native responsive/accessibility and rendered/body review remain separate release evidence from synthetic DOM/unit tests.

Suggested order: source-backed registry and browse-only coverage; retained unsupported-source library; contextual editor expansion; per-policy validated runtime; finally interactive end-policy choice. A browse-only reference can deliver value before every figure is implemented, provided the boundaries remain explicit.
