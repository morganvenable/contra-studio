# Contra Studio: experience and visual design

## Product promise and boundaries

A teacher's rehearsal workbench for understanding an entire contra dance, including individual facing, hand connections, transitions, progression, and end effects. The animation must help users inspect a choreographic interpretation; it must not imply that abbreviated source text uniquely specifies human motion.

Default workflow: choose a dance → review source and interpretation → rehearse at beat/figure/full-dance scale → inspect one dancer or couple → use a clean teaching view.

Do not call a model “verified” merely because its text imported. Use three separate concepts: original source; supported interpretation; schematic motion. Exact footwork, grip pressure, balance, and body mechanics require human teaching and should not be claimed as authoritative. Preserve attribution and links on every dance.

## Visual direction

Editorial precision meets a sunny rehearsal room. Warm off-white application surfaces, deep forest ink, restrained sage accents, and a pale neutral 3D floor. The focal point is clearly articulated people and their relationships, not decorative graphics. Avoid dark game-engine chrome, neon stage grids, generic dashboard cards, heavy shadows, stock photography, and ornamental charts.

Working title: **Contra Studio**. Small green interlocking-path symbol, wordmark, and a tiny “CHOREOGRAPHY LAB” eyebrow. Primary navigation: Studio / Dance library / Guide. Buttons have simple line icons with visible text where space allows.

Tokens:
- App background `#F5F3EE`; card `#FFFEFA`; stage `#EBEFE9`.
- Primary ink `#243D36`; secondary ink `#66746D`; hairline `#DFE4DB`.
- Primary action `#285E4D`; selected surface `#E9F0E6`.
- Dancer role A `#4B8A88` and role B `#D48558`. Never encode role only by color: show L/R or A/B labels and distinct symbol shapes.
- Warning background `#FFF3D9`, ink `#7B571C`; error background `#FCE9E2`, ink `#8B3F2B`.
- System UI font stack; 14 px body, 12 px metadata, 24–28 px dance title, 11 px letterspaced section labels, tabular figures for beat counters.
- 8 px spacing basis; 10 px controls; 14 px major cards; 22 px stage corners. Shadows only on popovers/dialogs.

## Desktop layout

At 1440 × 900:
1. A 64 px application header with wordmark left, Studio/Library/Guide tabs, source/import actions right.
2. An 82 px dance header with title and choreographer left, formation/progression pills, supported/needs-review state, and an outlined Import dance action.
3. A two-column workbench with 20 px outer gutters and 18 px gap: 278 px score rail and a flexible stage column. No third permanent column.
4. Score rail: title “The choreography”, 4 compact phrase groups, clickable figure rows showing beat range and name, current figure highlighted. A footer contains Source & interpretation and keyboard-help controls. The rail scrolls independently.
5. Stage column: large 3D canvas with a 48 px toolbar containing camera choices Overview / Overhead / Dancer and Reset view. Lower corners carry role legend and discreet orbit/zoom help. Always show a “Toward the music” orientation cue; rotate it consistently with the view.
6. A slim current-figure strip below the canvas: large figure name, phrase and beat in figure, instructional detail, “Next” text. Avoid a large translucent paragraph covering the people.
7. A 154 px timeline/transport panel: play controls, tempo/speed, repeat and metronome toggles; then four phrase blocks A1/A2/B1/B2 with proportional figure segments; then an accessible exact beat slider. Give the play button strong visual priority.
8. Inspector, library, guide, and import occupy dialogs/drawers when requested. Keep the default teaching workspace uncluttered.

At 1024 px: rail reduces to 244 px, controls wrap without overlapping canvas. At 760 px: one column, stage first, transport sticky, choreography in a lower tab/panel. At 430 px: hide redundant nav labels, keep Import reachable; canvas is at least 330 px high; use 44 px controls and native sheet/modal scrolling.

## Dancers and stage

- People must have discernible torso, head, pelvis, upper/lower arms, elbow/wrist, upper/lower legs, and feet. Avoid using identical featureless pegs as if they depict posture.
- Use natural soft materials, shadows under feet, and an uncluttered room/floor. The stage is warm pale stone/wood; avoid a visually busy checkerboard.
- Identity is stable: a dancer's identifier and color never change when neighbors change. Couple identity and current neighbor relationship are separate data.
- Show front/facing through the body, a small ground chevron, and optional gaze arrow. The overhead view retains direction clearly.
- Select one dancer or couple via click/tap or a dropdown. Selected halo is a precise floor ring, other dancers fade mildly rather than disappear. Show selected identity, role, partner, current neighbor, and current progression state in the inspector.
- Label role terminology explicitly. If using Larks/Robins, allow/source-map original terms; roles do not determine avatar gender. Source terminology is preserved in the source panel.
- Trajectory overlay defaults off. When enabled, show the selected dancer's recent solid path and upcoming dashed path, with arrowheads. Keep full-set paths optional because they become cluttered.
- Contact overlay defaults on only when faithfully represented: explicit joined-hand endpoints and a thin connection, distinguished from proximity. Never draw a hand connection merely because people are close.
- Show progression on repeated dances with stable identities and correct neighbor changes. End-out status must be visible. If end effects are unsupported, offer a clearly named repeating minor-set demo instead of a false full-line simulation.

## Playback and timeline

- One master beat clock drives dancers, figure highlighting, cue text, progress, and optional click. Scrubbing gives deterministic exact poses and contacts, with no jump to a different phase after release.
- Display phrase-local beat and total beat, e.g. “A2 · 5 / 16” and “21 / 64”. Do not mix musical bars with dance beats.
- Click a figure to seek its start. Playhead and active figure are synchronized. Previous/next figure and one-beat back/forward are available.
- Default playback is paused. Space toggles playback when focus is outside fields; arrows step one beat, Shift+arrows jump figures, Home resets, Escape exits dialogs/focus views.
- Speed presets 0.25×, 0.5×, 0.75×, 1×. Distinguish rehearsal speed from musical BPM if both exist. Do not label a metronome as full music.
- Loop scope: full dance or selected figure. At a loop boundary, preserve appropriate meaning: looping one figure is a rehearsal reset, not a claim about progression.
- Music upload, if implemented, is local and accompanied by explicit tempo/offset alignment. Never imply beat detection or synchronization when absent.

## Camera and teaching mode

Overview is a stable three-quarter perspective across the set. Overhead is near-orthographic and excellent for paths. Dancer is an eye-level/over-shoulder view of a chosen persistent dancer; avoid automatic spinning or head bob. Keep a return-to-overview button.

Camera presets do not reset dance time. Switching dancers preserves the beat. Orbit and zoom remain smooth and bounded. “Reset view” resets only camera. Track couple keeps their center framed; it does not relabel the couple.

Teaching mode hides editing chrome, enlarges the current and next figure, preserves transport, and offers a restrained beat pulse. Fullscreen should be an actual supported browser action, with an exit hint.

## Import and ambiguity review

Import accepts original dance text / structured JSON only when those parsing paths exist. A URL field must not pretend to fetch a remote record if CORS/backend support is absent. Instead explain “Open the record and paste its choreography” and link to Caller's Box.

Review is a two-column source/interpretation dialog. Show original text unchanged; list parsed phrases and figures with editable beat lengths, participants, hand/shoulder, turn amount, direction, and exit facing as relevant.

Caller's Box uses semicolon for sequence; comma and double-pipe for simultaneous actions; question mark for unknown/variable content; double slash for alternatives. These distinctions are real parser inputs. Never automatically reinterpret a simultaneous action as sequential.

Statuses:
- **Supported interpretation**: every figure has an implementation and required parameters are specified. State that motion remains schematic.
- **Needs your choice**: a source ambiguity or alternative exists. Highlight the relevant text and ask a bounded question such as “Right or left shoulder?”
- **Unsupported figure**: retain text and beat range; stop before the figure or show a frozen annotated stage. Offer replacing it with a supported figure only as a user edit. Never animate an unrelated default move.
- **Timing mismatch**: visible phrase subtotal and expected duration. Do not stretch durations silently.
- **Transition issue**: participants/facing/contacts do not satisfy the next figure's prerequisites. Show that next figure and reason.

The Review action changes the editable interpretation; the original source remains unchanged. Export should clearly name the output as a studio interpretation and preserve original author/source plus user changes.

## Accessibility and functional honesty

- Every icon button has an accessible name; toggles have pressed state; tabs and dialogs have correct roles and focus behavior. Escape closes dialogs and returns focus to the opener.
- Provide text-based choreography and figure details independently of WebGL. Include a “3D unavailable” state with usable text, controls, and explanation.
- Respect reduced motion: no auto camera motion or decorative transitions; playback remains user-controlled.
- Keyboard-operable transport, selectors, sliders, import fields, and camera presets. Visible dark green focus ring.
- Do not rely on color for validation, dancer role, selected state, or timeline status. Include icons/text/patterns. Set normal text contrast to WCAG AA.
- Touch targets ≥ 44 px where practical. No hover-only essential instruction.
- Performance state: if rendering slows, offer reduced-quality shadows/avatars. Preserve choreography/clock semantics when reducing visual detail.
- No placebo controls. Hide or disable unimplemented actions with a short explanation. Do not claim “Saved”, “Imported”, “Exported”, or “Copied” before an action succeeds.

## Verification checklist

1. At least two supported dances show distinct actual sequences, not renamed versions of one animation.
2. Figure selection, play/pause, reset, speed, seek, loop, camera, overlays, dancer selection, and import/error states visibly work.
3. Test every phrase boundary and the whole-dance boundary; stable dancer identities and current neighbor updates agree.
4. Confirm joined hands connect to the intended hands through turns; rendered facing agrees with engine facing.
5. Test unsupported text, empty input, malformed JSON, timing mismatch, closing/reopening import, and rapid repeated clicks.
6. Confirm no horizontal page overflow at 1440, 1024, 768, and 390 px; inspect legibility in screenshots.
7. Confirm keyboard focus, Escape behavior, form shortcut isolation, reduced-motion preference, and a useful WebGL error state.

## Primary context references

- The Caller's Box database and search fields: https://www.ibiblio.org/contradance/thecallersbox/index.php
- The Caller's Box notation and figures glossary: https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm
- Library of Dance figure demonstrations: https://www.libraryofdance.org/dances/contra/alr/

Design recommendations above are proposed product decisions. They are not claims that every choreography or pose has been validated by these sources.
