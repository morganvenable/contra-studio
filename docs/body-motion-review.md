# Contra Studio: embodied-motion review

Review started 2026-10-18. This is an independent review of the source and forthcoming rendered characters, not a biomechanics validation. The implementation is evolving. Findings below identify the inspected behavior and the tests still needed; they do not assert that proposed fixes have shipped.

## Initial findings, in priority order

### P0: use a body-contact model for swing, not a second joined-hand pair

Inspected `src/types.ts` and `src/engine.ts` at 16:36 UTC. `HandContact` only describes a shared point between two named hands. The swing emits left-right and right-left joined-hand pairs at two midpoint offsets. That does not represent the intended ballroom frame: one outside hand pair joins, while the inside arms contact the partner's upper back/arm. A visible rig cannot repair this merely by aiming both wrists at a shared point.

Recommended change: add explicit hand-to-body targets (dancer ID plus body landmark), or build the swing frame in the articulated-pose layer from an explicit frame style. Keep the lark's left / robin's right joined pair, place lark right hand on robin's back and robin left hand at the lark's upper arm/back, and bend elbows naturally. Surface actual rendered targets to diagnostics. Alternate holds are legitimate, but must be labeled intentionally instead of accidentally imitated.

Acceptance: each connected wrist reaches the correct anatomical target; the two inside hands do not converge at an invented midpoint. The frame remains coherent through entry, orbit, and release.

### P0: courtesy turns need a real half-turn and correct hands

The chain currently rotates the receiving pair through `sin(q*pi)*.85`: out by about 49 degrees, then back. This is an oscillation with zero net turn. Current courtesy contact is lark-left / robin-right at the pair midpoint. The standard courtesy hold joins left hands in front and right hands near the robin's right waist; the pair makes a half-turn, with the lark backing and robin moving forward. [CDSS figure descriptions](https://www.cdss.org/elibrary/dart/appendix_b.htm)

Recommended change: construct a side-by-side receiving pair facing out, then give both roots a common monotone 180-degree turn around their couple center, common body facing, and the specified two holds. Plan arrival slots so the half-turn ends in the existing required final slots; do not append a half-turn to the current destination after the fact. Keep recipient identity fixed during the turn. A nearest-body query each frame can switch recipients.

Acceptance: inspect quarter, half, three-quarter and final courtesy phase from overhead and side; signed unwrapped facing changes by roughly pi, the two people remain side by side, and their two wrist pairs remain consistent.

### P1: swing body facing currently opposes travel

For the current positive planar orbit, the tangent at root `(r,0)` points toward +z. The current `angle(root, center)-.23` makes the body's forward vector project approximately -0.228 onto that tangent. Consequently a generic forward walking cycle will read as backing/side-stepping around the partner. A caller's own workshop describes both partners walking forward through the swing and avoiding excessive bounce. [Harris Lapiroff's introductory workshop](https://chromamine.com/2024/04/my-contra-dance-workshop/)

Recommended change: for an illustrative walking swing, face partly into the partner and partly along the positive travel tangent, for example `angle(root, center)+pi/3`, and target feet using actual root velocity. The specific angle is an art/rig choice, not an anatomical prescription. A buzz-step is a separate deliberate gait, with the right foot nearer the shared pivot and the outside foot propelling; do not label generic alternating leg sway as a validated buzz-step. [CALLERLAB swing teaching](https://teaching.callerlab.org/mainstream/swing-definition/)

Acceptance: both characters' forward components agree with their travel through the sustained orbit, right-side/inside feet read correctly, and the exit opens to lark-left/robin-right without a sudden torso spin.

### P1: validate reach against shoulders and limb lengths, not root distance

The current contact filter accepts targets within 1.18 scene units of each ground root. This is not a shoulder-to-hand reach test. Allemandes keep the initial orbit radius (commonly 0.9 units); circle and balance use midpoints independent of shoulder placement. Whether these are reachable depends on the final rig. A clamp at the renderer alone will produce separated hands even when an overlay claims they are joined.

Recommended change: define one rig scale and actual upper/lower arm lengths, transform shoulder landmarks by pose, and test shoulder-to-target distance against the chain length. Preserve elbow bend margin. Bring roots closer during contact entry where needed, or mark the contact inactive until the target is reachable. Never stretch a limb or render a false connector to disguise an impossible target.

Acceptance: strong contacts (`strength >= .8`) have actual wrist error under a scale-relative visual tolerance, fixed bone lengths, and elbows bending toward a stable pole rather than flipping. Test handedness and reach independently.

## Gait and silhouette acceptance plan

These are implementation recommendations, not externally sourced biomechanics claims.

- Human silhouette: pelvis, torso, neck/head, two upper/lower arms and legs, elbows, knees, and distinct feet. Front is readable from all cameras without relying on labels alone.
- Stance: make a support foot stay approximately fixed in world space while the root advances; swing the other foot to its next plant. A sine applied to feet in root space will slide both feet across the floor.
- Travel: compute planar velocity and separate it from body facing. Side steps, backing during courtesy turns, and maintained-facing dosido are valid; not every character should rotate to the path tangent.
- Turn: feet must step around the changing root yaw, not remain planted while ankles twist through whole revolutions. Maintain a stable knee bend direction; no hyperextended knees.
- Balance: use a deliberate four-count weight shift with restrained root travel and optional tap/lift styling, then return cleanly into swing. Balance variants exist; label the chosen styling as illustrative.
- Beat: one walking step per beat is a reasonable visual convention. Base gait on musical beat and distance traveled so slow playback and scrubbing remain deterministic.
- Floor: shoe soles do not penetrate the floor. Avoid permanent hovering or synchronized high bouncing. Minimal soft body rise is enough for a schematic teaching view.
- Pause/seek: deterministically sample both feet and arms from beat; history-dependent IK state must not cause a different pose after scrubbing.
- Camera: inspect overhead for paths and handedness; three-quarter for torso, elbows and knees; side/close-up for foot contact and back/waist holds. A full-set overview alone cannot validate articulation.

## Implemented rig corrections, 16:44 UTC

The core engineer explicitly assigned this reviewer ownership of `app/src/scene.ts`. The following changes are now saved and the local production build passes:

- Capsule segments now reach their intended joints; visible knee meshes remove the former approximately 0.147-unit knee gap.
- Replaced the reversed local sine foot cycle with deterministic world-space foot plants sampled from the choreography. Each foot stays at its chosen stance point when reachable. Foot heading transitions are continuous through the swing phase and account for turning beyond 180 degrees over a full stride.
- Fixed-length two-bone legs clamp overlong steps rather than stretch. Foot motion follows root displacement independently of facing, allowing backward and sideways travel.
- Body-contact targets assign only the contacting person's hand. Hand-to-hand contacts still assign both hands.
- Hand targets now use the inverse torso transform, including the small torso lean and bounce.
- Fixed an important pre-existing arm-clamp mutation error: copying the shoulder into `target` before computing its direction collapsed unreachable wrists directly onto their shoulders. The clamp now preserves direction.
- Reused contact-dot geometry/materials and a dot pool instead of allocating GPU objects each frame. Dance changes dispose avatar-private geometry, materials, and label textures; shared sphere/capsule geometry stays alive.

## Numeric evidence and remaining limitations

Independent diagnostic: `qa/body/measure-body.cjs`, with results in `qa/body/measurements.json`. It transpiles the actual scene source into a test module and instantiates the actual Avatar class with a minimal canvas mock; it does not replace the rig with a separate mathematical model. It samples each demo's first 64-beat repeat every 0.125 beats, updates real Three.js world matrices, and measures wrist locations, limb lengths, and stance motion.

- 512 samples per dance, 12 avatars: maximum arm-length deviation from 0.325 per segment was 2.8e-16; leg-length deviation from 0.43 was 3.4e-16. No limb stretching found.
- Contacts with strength at least 0.95: maximum wrist-to-target error was 0.0294 units in Baby Rose and 0.0360 in Simplicity Star. These maxima occur during blend-in. Full-strength reachable contacts meet to floating-point precision in the sampled stars.
- **Still open with the core engineer:** the current reach fade removes every circle contact, and balance never reaches full contact strength. Asked for a roughly 22% circle gather and separate lateral left/right target points in two-hand balances, rather than sending all four hands to one point.
- **Still open with the core engineer:** courtesy hand selection remained left/right instead of left/left plus right/right in the inspected file. A real compact half-turn is now present, but approach routing needs another pass.
- **Still open with the core engineer:** the chain's fast last approach reaches 2.921 units per beat (about 5.45 units/sec at 112 BPM) at Baby Rose beat 51.36. On this 1.8-unit-tall rig, it forces foot-plant reach clamps and visible sliding. Maximum measured stance drift is 0.0281 units over 0.015 beat. A compact fixed-length rig cannot conceal an overly fast root path without sliding; the root path needs a slower, more even approach.
- General QA independently found a 0.228-unit root gap during that approach. With approximately 0.49-unit shoulder width, this is an overlap risk. The core engineer has the exact time and participants.
- No screenshot-based anatomical pass is claimed yet. The sandbox cannot launch a local Chromium/server across the attempted processes, and the private deployed site presents a sign-in screen. No sign-in or access-control change was attempted.

## Verification status

- Source review: completed initial pass.
- Primary teaching references: checked searchable official CDSS figure descriptions, CALLERLAB swing teaching and a caller's own workshop; direct fetch of the first two was blocked (403), so search excerpts were used.
- Rig measurements: completed first-repeat numeric pass on both demos; rerun after root/contact fixes.
- Screenshot/body-pose review: pending usable browser preview.
- Core code changes by this reviewer: `app/src/scene.ts`, under explicit file ownership assigned by the core engineer. Independent diagnostic files live under `qa/body/`.

## Final correction pass, 16:54 UTC

The later actual-mesh projections exposed an important distinction: low error among contacts that survive the reach filter does not prove that the intended hold exists. The first swing projection showed the lark's right arm hanging down, because the back contact had vanished. The first courtesy projection showed the couple losing their side-by-side facing through the turn.

The core engineer applied both exact fixes:

- Swing torso offset is now +pi/3 from inward facing, bringing the dancers' right shoulders closer to the pivot and making the back contact reachable. The facing track is unwrapped through exit, avoiding a shortest-angle branch flip.
- A planar radial rotation by +theta requires yaw to change by -theta in the scene's convention. Courtesy facing is now `exitYaw - theta`, with consistent entry facing. Both same-side hands remain represented throughout the central turn.

The reviewer also widened the shirt hem from 0.17 to 0.197 and increased torso depth scale to 0.70. The prior hem cut through the 0.19-radius pelvis, creating a visibly jagged waist seam. The corrected mesh covers the pelvis.

### Final numeric pass

`qa/body/measure-body.cjs` now samples four repeats per dance (2,048 samples per dance at 0.125 beats) and checks missing required hands independently of active-contact accuracy.

- Zero missing required hand samples in central swing and courtesy phases for both dances, with a stricter strength >= 0.9 condition.
- Maximum strong-contact wrist error: 0.03164 units for either dance, during blend-out; no arm or leg stretch beyond floating-point tolerance.
- Stable poses after arbitrary backward/forward scrubbing: passed for both dances.
- Circle and balance contacts now reach naturally; the previous all-missing circle failure is resolved. Courtesy has the correct left-left and right-right pairs.
- Chain approach was slowed and widened by the engine changes. The former 0.228 root gap and 2.92-units/beat peak are superseded by the core/general QA's approximately 0.514 minimum gap and the finer 1.2465-units/beat measurement.
- Small, quicker chain steps are blended in/out over half a beat, improving foot planting for that crossing. Some foot sliding remains in fast circle/star turns because of the fixed-length leg reach clamp. Maximum grounded-foot drift measured is 0.0182 units in Baby Rose and 0.0198 in Simplicity Star over 0.015 beat. This is a disclosed schematic-gait limitation, not a fully accurate footwork model.
- Tempo-scaled root diagnostics are in `qa/body/root-tempo.json`. Peak speed is about 2.33 scene units/sec at 112 BPM and 2.49 at 120 BPM. Scene scale is approximately 1.8 units per avatar height, not independently calibrated metres. The piecewise crossing has brisk acceleration near waypoints. No clinical or biomechanical validity is claimed.

### Geometry previews

The images in `qa/body/` are generated from the actual posed Three.js meshes with a CPU depth-buffer renderer. They are explicitly labeled as geometry diagnostics, not browser screenshots; lighting is simplified. They verify body silhouette, connected joints, body-relative handholds, and the waist seam. They do not validate browser performance, UI layout, or live playback.

- `swing-rig.png`, `swing-side-rig.png`
- `courtesy-rig.png`, `courtesy-side-rig.png`
- `circle-rig.png`, `balance-rig.png`, `star-rig.png`

Reproduce using `measure-body.cjs` to regenerate the Avatar test module, `render-body.cjs` to export projected mesh triangles, then `rasterize-body.py` to write depth-tested images.

### Remaining scope limits

Reasonably articulated, physically bounded teaching figures are now present. This remains a schematic choreography interpretation with illustrative steps, grip targets, and exact swing revolutions. It is not motion-captured dancing, a lesson in grip pressure, or a guarantee of biomechanically correct footwork. The remaining browser QA limitation is tracked separately by the parent and general QA.

## Next-phase body gate: Butter, hey, gait and framing

The runtime Butter adapter is cleared for schematic animation after the following articulated checks. This does not certify real-world biomechanics or browser playback.

- No-contact hey arms are compact, with elbows lowered and hands near the front waist. Domain replaced tight same-point end loops with separate-lane semicircles and constrained integrated entrance/exit body yaw. Root clearance is 0.66 in the passing section.
- A dense actual-rig check found a real shin collision despite clear roots and arms: airborne feet cut straight chords across a curved hey lane. Airborne feet now follow the cached curved path. At 0.005-beat resolution, integrated Butter's minimum capsule margins are +0.07980 (arms), +0.14549 (legs), and +0.12850 (conservative 0.145-radius shoe spheres).
- Deterministic, cached, distance-aware gait schedules distribute an even number of extra steps per phrase, capped at 1.5 steps/beat. Stance plants are centered by arc length rather than elapsed time. This removes excess reach during eased side steps. The opening shift retains exactly two musical steps across its two source beats.
- Reach-derived pelvis lowering is anticipated/released with a cached Gaussian envelope. Ordinary phrases use approximately 0.06 maximum required lowering plus a 0.005 sampling guard; the lateral opening shift may use 0.09. Legs remain fixed length. This is an illustrative supported step, not arbitrary knee oscillation.
- Dense Butter grounded-foot drift is below 0.000001 scene unit over 0.015 beat. In the two original demonstrations a fine 0.01-beat scan finds a residual 0.000315-unit maximum around a chain transition. A few airborne frames still invoke the reach clamp; that limitation is exposed, not hidden by frantic cadence.
- At 112 BPM, the 1.5-step/beat ceiling is 168 steps/minute. The ordinary swing is still a schematic walking swing at this milestone; a proper buzz-step is a separately requested next refinement.
- Three dances, four repeats each: zero missing required central swing/courtesy hand samples; strong-contact wrist blend error at most 0.03186; arm/leg length errors below 4e-16; deterministic arbitrary scrubbing. Boundary differences converge by a factor of ten as epsilon shrinks, rather than showing fixed foot jumps.
- CPU-only 12-avatar cold preparation measured about 13–45 ms, and steady updating about 0.23 ms/frame in this environment. Schedules are keyed by figure start, not callback identity, limited to six per avatar, and reset when avatars are recreated on load/edit. These are not browser/mobile GPU benchmarks.
- Live camera fitting now delegates to the shared camera-fit helper. Conservative choreography bounds include two repeats, all avatars and labels. All 108 dance/set-size/aspect/preset test cases fit, including 24 avatars at portrait aspect 0.55. Resize preserves orbit direction and backs up when needed; maximum distance/far plane and floor extent scale together.

Artifacts: `qa/body/next-measurements.json`, `measurements.json`, `dense-gait.json`, `gait-checks.json`, and `camera-fit-results.json`. Refreshed stills: `becket-shift-rig.png`, `butter-hey-entry-rig.png`, `butter-hey-gate-rig.png`, and `butter-hey-exit-rig.png`. The actual-mesh, offline circle preview is `circle-motion.mp4` / `circle-motion.gif` (600×450, 12 fps at 112 BPM). All previews are explicitly labeled geometry diagnostics, not browser screenshots.

### Requested next refinement: expressive partner balance

The user explicitly wants clear visible connection and weight sharing. The implementation should retain individual support, a modest synchronized forward/back torso response, flexed rather than locked elbows, and grounded stepping. It must not depict hanging from the partner or wrist torque. The current source card specifies four beats of partner balance without a particular styling variant, so the chosen forward/back style is illustrative. Future one-hand or wave balances must retain their own contact/rhythm contracts.

Primary teaching references: [Colin Hume's technique notes](https://colinhume.com/dtcontra.htm) describe connected forward/back preparation and responsive bent arms; [John Sweeney's connection guidance](https://www.contrafusion.co.uk/Connection.html) emphasizes keeping one's own balance. These support restrained elastic connection rather than a literal partner-supported lean. The separate later style catalogue and buzz-step research are coordinated with the choreography reviewer.
