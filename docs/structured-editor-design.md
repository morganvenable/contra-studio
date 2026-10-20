# Structured interpretation editor: next milestone

Status: implemented in the working candidate; independent release review in progress. Rendered browser/WebGL verification remains blocked by the environment. The following describes the intended interaction; implementation notes and current limits are recorded below.

## User outcome

A caller can change an implemented figure, participant relation, timing, direction/hand, or turn fraction with ordinary controls; see exactly why a draft cannot run; undo changes without altering rehearsal time; and reopen/export the edited interpretation while retaining the original dance record and authorship.

The editor changes the studio interpretation. It never changes the external source or silently rewrites the original transcription.

## Entry and layout

- Entry in Source & notes: **Edit interpretation**. Keep a secondary **Edit source text** route for expert/source correction; do not make exact command syntax the only editing path.
- Use a wide native dialog, approximately 1000 px on desktop; 24 px gutters, responsive full-height sheet on phone.
- Header: title, a small “INTERPRETATION EDITOR” eyebrow, close button.
- Metadata line: “Based on [original dance title] by [original author]”; Source link; “Modified interpretation” status when any semantic field differs from the original.
- Top toolbar: Undo, Redo, a clear unsaved-state indicator, and a short validation summary. Undo/redo are disabled at their respective ends.
- Main column: four fixed A1 / A2 / B1 / B2 groups. Each has an explicit subtotal “16 / 16 beats” or a diagnostic such as “18 / 16 · 2 beats too long”. Preserve 6- and 10-beat figures; never snap every figure to 8.
- Figure row: sequence number, figure-name select, participant/receiver select where applicable, beat count, and an expand button for direction/turn fraction. Optional removal and move controls should be added only if supported in this iteration.
- Selected figure detail: visible controlled parameters, a short plain-language generated interpretation, source clause when one exists, and errors connected to this row.
- Side panel, about 260 px: Original source (read-only), attribution, calling notes, and current validation details. On phone this becomes collapsible sections below the edited figure list.
- Footer: Cancel; Apply interpretation. Apply is disabled if there are errors, missing required parameters, or no changes.

## Field semantics

Expose only implemented combinations. This list must come from the domain module so the editor and parser cannot drift.

- Partner/neighbor balance: participants, beats.
- Partner/neighbor swing: participants, beats; turn count is intentionally not represented as an authoritative choreographic fact.
- Circle: left/right, turn amount, beats; participants are all active dancers.
- Star: left/right hand/direction, turn amount, beats; participants are all active dancers. Grip/styling remains explicitly illustrative.
- Allemande: allowed participant relations, right/left hand, amount, beats.
- Whole do-si-do: allowed participants, beats; shoulder and whole-turn support are constrained to implemented variants.
- Robins chain: explicitly named receiving relation, beats. Explain that the contact model is a right-hand pull-by and courtesy turn.
- Long lines forward/back: beats; participants are all.

Suggested fraction choices: ¼, ½, ¾, 1, 1¼, 1½, 1¾, 2, only where the domain adapter accepts them. Duration may be a positive numeric count; the validator remains authoritative about per-figure and phrase bounds. Number inputs must not silently truncate decimals.

Changing a figure kind is an explicit user edit, but it does not authorize guessing missing semantics. Retain shared parameters only when meaningful and permitted for the new kind. Clear incompatible fields. A new required participant/hand choice should show “Choose…” and block Apply until resolved. Do not fill unknown/unsupported source text with a convenient replacement.

Changing role terms is not the same as changing participant identity. Source wording remains visible, while controls use the app’s current lark/robin role terminology and partner/neighbor relationships.

## Validation behavior

1. Validate structure: supported formation, phrase order, known kind, allowed parameters, finite positive durations, bounded fractions, required relations.
2. Validate each phrase subtotal and total duration.
3. Validate semantic topology: initial assumptions, participant pairing, crossing/facing requirements, contact prerequisites, and actual endpoint progression using the common domain validator.
4. Separate warnings from blockers. Calling notes or illustrative styling warnings remain visible; missing participants, unsupported combinations, impossible transitions, or incompatible progression block Apply.
5. Show errors next to their field/row when possible and in a summary linked to the first affected row. Announce summary changes through a restrained live region; do not announce every frame or keystroke.
6. No successful “ready” status based on parsing alone. Prefer “Ready for schematic rehearsal” with the existing accuracy caveat.
7. Preserve the draft after validation failure. No silent duration stretching, reordering, participant changes, endpoint snapping, or fallback moves.

## Undo and redo

- History contains interpretation snapshots, never playback/camera state.
- Push a snapshot for each completed field edit or explicit structural action. For text/number input, coalesce the user’s typing until blur/Enter/change; do not consume one history entry per character.
- Undo/redo can traverse invalid drafts, because an intermediate timing mismatch is a normal editing state.
- A fresh edit after Undo drops the future branch.
- Resetting playback, scrubbing, or switching cameras must not clear edit history or create new entries.
- Keep a bounded in-memory history, e.g. 100 snapshots. Persist only the applied interpretation, not the full transient undo history.
- Keyboard Ctrl/Cmd+Z and redo apply to interpretation history only when focus is outside an editable text/number field. Native input editing keeps its native undo. Visible toolbar controls are always available.
- Closing with unsaved edits asks a single in-dialog “Discard these changes?” confirmation. Cancel returns to the editor. This is reversible local editing protection, not an external transmission confirmation.

## Playback interaction

- Opening the editor pauses a playing rehearsal. Keep the current beat, round, selected dancer, and camera unchanged while editing.
- Cancel does not restart playback automatically.
- Apply validates and then loads the new interpretation paused at beat 1, because altered timings can invalidate the former position. Indicate this in the apply help text: “Opens the edited interpretation at the beginning.”
- Editing/undo never seeks the underlying timeline or changes the original dance object in place.
- A user-edited library entry is distinct from the curated/source-checked original. Do not overwrite the curated catalogue entry or preserve its source-checked badge on a modified interpretation.

## Provenance and persistence

The archive must preserve two layers:

1. Original source: exact supplied text/JSON, original title, author, source URL, calling notes, and source metadata when available.
2. Current interpretation: schema-versioned structured figure data, current title, supported formation/progression, edited timing/participants/hand/fraction choices, and generated canonical card text if useful for compatibility.

Metadata should say “Original choreography by …; user-edited studio interpretation”. Do not imply that the original author endorsed edited choreography. Preserve original calling notes and label any which are not compiled.

Export/import must use the domain validator on the current interpretation. The original source is provenance, not the executable payload after editing. Conversely, unvalidated arbitrary figure JSON is never executable merely because it appears in an app archive.

Archive version 1 (source-only) remains readable. A version 2 may add original-source and structured-interpretation fields; unknown versions fail clearly without overwriting the current dance. Saving to browser storage is reported as successful only after storage succeeds; quota failure leaves a usable session-only interpretation and a download option.

Use a new stable interpretation ID for a copy derived from a curated dance. Later edits retain that interpretation’s ID only when the saved baseline still matches. Importing a different interpretation with a colliding ID, or applying against a changed saved baseline, creates a separate ID so neither copy is lost. An exact existing interpretation is reused without rolling back its revision.

## Proposed domain API contract for coordination

The exact code contract belongs to the domain worker, but the UI needs:

- A supported-figure descriptor list with kinds, display labels, permitted participant relations, hand/direction support, fraction choices, and required fields.
- A lossless draft constructor from a Dance plus provenance.
- A pure validator accepting a draft and returning structured field/figure errors, warnings, and, only when valid, a compiled-safe Dance or canonical interpretation.
- A serializer/deserializer for versioned archives, preserving provenance while validating the edited representation.
- A pure generated-label/card formatter, so labels cannot contradict the actual figure parameters.

The UI should not duplicate regex parsing or implement its own choreography semantics. It can maintain undo snapshots, focus, field display, and save state.

## Acceptance checks

- Edit an 8-beat figure to 6 and the following 8 to 10: phrase total returns to 16, original source remains unchanged, undo/redo reproduces both states.
- Change a circle to an allemande: missing participants/hand are exposed, not guessed.
- Unsupported same-role swing, future-neighbor relation, invalid fraction, or nonfinite duration cannot be applied.
- A structurally valid but nonprogressing or transition-invalid sequence is blocked by the shared validator.
- Apply produces the same validated result before and after export/import and page reload.
- Original source, author, URL, and calling notes survive edits and export.
- Source-checked curated card remains in the library and unchanged when its edited copy is saved.
- Undo/redo does not move the timeline, start playback, change the selected dancer, or reset the camera.
- Cancel/close, invalid drafts, repeated Apply, storage failure, stale async imports, and HTML-like metadata remain safe.
- Keyboard and screen-reader labels identify figure, phrase, field, and error. Mobile controls remain usable without horizontal scrolling.

## Deferred beyond this milestone

Validated human biomechanics, arbitrary Caller’s Box grammar, unsupported formations/figures, music beat detection, audiovisual export, and collaborative editing remain outside this editor milestone. The editor improves inspectability and controlled interpretation; it does not turn unsupported choreography into verified motion.


## Implementation and persistence review notes

- Implemented files: `src/editor.ts`, `src/interpretation.ts`, `src/ui.ts`, and `src/style.css`. The shared choreography validator remains authoritative.
- Undo history is capped at 100 snapshots. Pending text/number input is committed before close, discard prompts, or Apply, so Keep editing preserves in-progress typing.
- The original author and source text remain unchanged. Version 2 stores an independently editable structured interpretation and immutable source provenance. Version 1 and legacy source-text browser entries remain readable; unrelated saves retain their raw envelope.
- Each save re-reads the library and preserves all unknown/future entries and annotation fields. Conflicting identities are forked rather than overwritten; a changed active dance prevents stale-editor Apply. Unreadable or quota-blocked storage gives an explicit session-only outcome.
- Fresh-merge and pre-write byte comparison protect against stale startup snapshots and intervening writes. This is not an atomic cross-tab database transaction; genuinely simultaneous browser commits have not been tested.
- The editor rejects revision-counter overflow visibly. Unknown or unsupported figure semantics never become a convenient substitute.
- Baseline UI DOM tests: 22 checks. Editor DOM tests: 16 checks. These test synthetic DOM, serialization and action bindings, not native browser focus/event order, pixel layout, or WebGL rendering.
- The intended separate expert source-edit route, figure reorder controls, and field-level source-clause mapping are deferred; original source and calling notes are available in the read-only provenance panel.
