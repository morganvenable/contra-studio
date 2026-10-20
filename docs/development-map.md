# Development map

Read this as a navigation index, not a second specification. The root `HANDOFF.md`
records release 0.42 and its holds. Older `next-*` documents may describe work
already delivered. Contracts and executable tests determine current behavior.

## How a dance becomes animation

Retained source -> explicit reviewed interpretation -> checked choreography
dispatch -> formation/event wrapper -> local figure adapter -> sampled motion
-> stance preparation -> articulated rendering.

The shared `SequenceBoundary` carries source beat, relationship epoch, stable
actors/roles/couples, partner/current-neighbor maps, actual roots/facing, and raw
held contacts. The registry sees the current figure, immediate successor and
incoming state. A figure name alone does not establish that it can compose here.
The event wrapper owns finite-set progression; a figure owns its motion; stance
and rendering own presentation. Logical formation samples and visible prepared
poses are distinct evidence.

| Question | Start here | Focused evidence |
| --- | --- | --- |
| Source meaning or missing choice | `src/contradb-import.ts`, `src/source-review.ts`; one retained fixture | matching `contradb-*.test.ts` |
| What is playable offline? | `docs/ready-library.md`, `src/source-library.ts` | `src/ready-library.test.ts` |
| State lost between figures? | `docs/state-carrying-sequences.md`, `src/sequence-boundary.ts`, `src/sequence-registry.ts` | `src/sequence-boundary.test.ts`, `src/state-sequence.test.ts` |
| Wrong people, progression, waiting ends? | `docs/progression-events.md`, `src/progression-topology.ts`, `src/event-section.ts` | relevant topology/event tests and full odd/even periods |
| Becket slice composition? | `docs/becket-state-sequencing.md`, `src/becket-state-sequence.ts` | `src/becket-state-sequence.test.ts`, `src/becket-slice-step.test.ts` |
| Arch exchange boundary? | `src/bare-arch-step.ts`, `test-data/bare-arch-sequence/README.md` | `src/bare-arch-sequence.test.ts`, `src/bare-arch-sequence-source.test.ts` |
| Star entry into partner gyre? | `src/star-gyre-step.ts`, local contract below | `src/star-gyre-step.test.ts` |
| Visible pose differs from path? | `src/stance.ts`, relevant preparation module, `src/scene.ts` | matching stance tests, then actual browser rendering |

## Small work loop

1. Identify the failing seam: source, admission, incoming boundary, trajectory,
   outgoing boundary, finite event, or presentation.
2. Search filenames (`rg --files src docs`) and then relevant symbols. Read the
   local contract and representative test before expanding to another subsystem.
   For source triage, run `node scripts/inspect-source.mjs 831 110 2299 --couples=3`.
   It emits bounded offline summaries and distinguishes retained, catalogue-only
   and absent sources. It does not fetch records or claim full-period validation.
3. Reproduce with one retained fixture or minimal boundary. Record actual versus
   expected actors, beats, epoch, roots/facing and contacts as relevant.
4. Change the shared capability. Prove another arrangement can reuse it and that
   unsupported inputs still reject. Avoid adding a dance-specific route.
5. Run affected tests; for motion composition include odd/even finite periods,
   repeat joins and end behavior. Run build and Ready regression when admission
   changes. Save concise results and remaining uncertainty here.

From the application directory, initial focused baseline:

```powershell
node --experimental-strip-types --test --test-reporter=dot src/sequence-boundary.test.ts src/state-sequence.test.ts src/becket-state-sequence.test.ts src/bare-arch-sequence.test.ts src/ready-library.test.ts
npm run test:server
npm run build
```

Do not print the generated archive or catalogue to count records. Import
`READY_LIBRARY` and inspect its length/IDs; parse catalogue JSON and inspect
`records.length`. The inventory is 130 unique Ready IDs, 159 checked-in fixtures and 2,263 additional locally
acquired snapshots covering all 2,422 discovery records (historical
`reportedRecords`: 2,426). See `docs/source-acquisition.md` for local paths.

## Next capability investigation

The star-to-partner-gyre seam now has a bounded shared adapter in
`src/star-gyre-step.ts`, selected by `src/sequence-registry.ts`. Its tests reproduce
the old 5.126809 facing-rate rejection from a real primitive star endpoint: this
is a fast body turn, not a wrapped-angle bookkeeping error. The star now releases
hands over beats 5.6â€“6.56 and turns toward its actual partner over the remaining
1.44 counts. Its entry facing blends over 1.44 counts as well. Star root samples
are unchanged; the following gyre/swing retains 4+12 counts and unchanged budgets.
The sampled star facing peak is 2.903374 radians/count, below 3.2.

Scope: released standard four-corner entry (translation allowed), eight-count
right three-quarter star, immediate four-count full right partner gyre. The
strict carried boundary preserves source beat, epoch, identities and contact
state. A runtime sampled facing guard rejects unsuitable incoming orientations.
This is a model preparation convention, not an authored timing subdivision or
an anatomical certificate. Tests cover full 72-count synthetic compositions at
three/four couples, all repeat joins and complete-period closure.

2299 itself is still not admitted. Its exact official record could not be fetched
in this session; no replacement snapshot was invented. ContraDB program 973
independently displays Everybody Dance and its star/meltdown/arch-and-dive wording:
https://contradb.com/programs/973 . That corroboration is not a retained 2299
interpretation. Next retrieve the exact record, preserve removable choices and
inspect its remaining ring/arch-and-dive boundaries. Do not treat this local
transition fix as proof of that whole source dance.

179's initial/repeat opening swing and 1599's cast-home/held-ring/swing boundaries
are subsequent separate slices. Their fixtures are also absent. Keep known holds
110, 2987, 3310 and 3361 blocked; see the root handoff for exact reasons. This
recommendation is an investigation scope, not admission of these sources.

## Local checkpoint â€” 19 October 2026

- Node 24.12.0, npm 11.6.2. Inventory independently confirmed: 129 unique Ready
  entries, each with a retained fixture; 154 snapshots; 2,422 catalogue records.
- The five-file focused command above passed (exit 0), including every Ready
  archive's canonical parity, compilation and sampled motion. Server tests: 7/7.
- `npm ci` failed writing the default cache (EPERM). Retrying with
  `--cache ../.npm-cache --no-audit --no-fund` encountered registry EACCES errors.
  Dependency installation is incomplete. Build failed because `tsc` is absent;
  no successful type-check or packaged build is claimed.
- Browser inventory exposed no apps or browsers. GPU rendering and audible audio
  are untested. The aggregate motion suite was not run.
- Follow-up implementation adds the shared star-to-partner-gyre preparation and
  tests described above. Reviewed interpretations, generated Ready archives and
  deployment are unchanged. The offline install attempt also fails ENOTCACHED;
  Vite is not available in the local cache and no global TypeScript/Vite exists.
- Follow-up checks: 19/19 tests across star-gyre-step, gyre, contradb-gyre,
  sequence-boundary, state-sequence and
  six-two-gyre. The broader eight-file run passed 24/25, including all 129 Ready
  archives. Its sole failure is `ordinary-half-hey-gyre.test.ts:96`, an expected
  rejection that does not occur. Repeating that test with the new registry entry
  removed produces the same failure; the registry entry was restored afterward.
  The later audit corrected that stale expectation: the existing wide-balance
  implementation already has its own 1.35 speed certificate and physical tests.
  All five older frame hashes remain unchanged; supported wide-balance frames now
  have their own regression hash. No limit or trajectory changed for this fix.
- Parallel integration: 31/31 tests passed across star-gyre, half-hey gyre and wide
  balance, hosting, source-fetch, the isolated arch/dive probe, source inspection
  CLI and archive-generation tests. The star successor now rejects unconsumed or
  contradictory declarations. The arch/dive primitive remains unregistered and
  under separate hand-reach review; see `docs/couple-arch-dive.md`.
- MIT license and third-party notices added. Lockfile license check reports 77
  dependencies: 69 MIT, 5 Apache-2.0, 2 BSD-3-Clause, 1 ISC; no rejected declarations.
  This does not relicense retained choreography data. The original-code license
  is separate from data provenance and installed third-party notice obligations.
- `npm run build:pages` and `.github/workflows/pages.yml` prepare static GitHub
  Pages hosting with subpath assets and saved-import guidance. The workflow runs
  full tests and build before manual deployment. No repository was published and
  no workflow has run remotely. Intended repository root is this app directory.
  The connected GitHub profile is `morganvenable`; proposed destination is
  `morganvenable/contra-studio`, subject to availability. Local Git was initialized
  for versioned work; this is not recovered upstream history.
- Local initial checkpoint: `aa79094`. Fresh Ready replay after integration passes
  all 129 entries. Worker packaging now treats absent owner configuration as
  optional; six packaging/source-inspection tests pass, including real Worker
  packaging and smoke checks using minimal test assets with retained source data.
  This does not substitute for a full Vite build with Three.js installed.
- GitHub connector account/repository reads work; the proposed repository returns
  404. GitHub CLI is already installed, but this session runs as
  `CodexSandboxOffline` and cannot read the user's CLI config. Shell networking is
  restricted and escalation is unavailable in this session. These are permission
  boundaries, not a missing GitHub installation. The connector exposes no new-repo
  creation tool. A normal-user `gh auth status` can separately check the CLI login.
- Retained 110 now has a measured isolated reproduction in
  `src/turn-swing-110-probe.test.ts`: uncontracted reconstructed endpoints collapse,
  actual contracted endpoints do not. The first root corridor candidate over-turns
  while holding hands; it is deliberately not registered. See its local probe doc.
  `inspect-source.mjs 110 --review` reports 8/9 rows resolved with explicitly
  suggested choices, retaining the separate unsupported rollaway blocker.
- Current checkpoint (2026-10-19, supersedes the access/build restrictions above):
  public repository https://github.com/morganvenable/contra-studio now exists;
  all 821 initial publication files matched local bytes. CLI/network access is
  restored. Locked installation, TypeScript and Pages production build pass.
  Seven server tests and eleven tooling tests pass. Local headless Chromium
  renders the default dance with no page errors; audible audio remains untested.
- CI now runs four native source-test shards alongside the build. Deployment
  requires all shards and build verification. The first monolithic run completed
  1,042 tests without reported failures before cancellation; individual articulated
  geometry tests took up to 370 seconds. This was accumulated CPU work, not an
  established hang. Pages deployment run 39364885255 is pending full regression.
- The isolated role-turn/swing prototype is retained but not registered; see
  `docs/role-turn-swing-prototype.md`. Its late hand acquisition still needs
  articulated review and whole-dance finite-end coverage. The next source slice
  investigates reversed rollaway roles in 110 without admitting that whole dance.
  The exact official source 2299 is now retained in `test-data/contradb/2299.json`;
  see `docs/source-2299.md`. Its seven rows total 64 counts. Arch/dive progression,
  source-note review and explicit timing/gyre choices still block whole-dance
  admission. Independent whole-dance validation remains necessary.
- Subsequent checkpoint: reversed-role rollaway interpretation preserves exact
  source roles and removable direction choices; source 110 now resolves 9/9 rows
  but remains unplayable. All 129 retained Ready programs still pass. Its isolated
  left-allemande prototype and actual Avatar diagnostic remain unregistered;
  partial-strength hand targets represent weighted approach, not a closed grip.
  Exact sources 179 and 1599 are retained as well; see their acquisition document.
- The full sharded CI run exposed two separate failures: a missing external
  coupled-do-si-do fixture (fixed using the unchanged bundled evidence packet),
  and a swing guard that omitted the existing active-ones partner-swing contract.
  Correcting that guard exposed a real 3181 timing defect: the legacy 16-count
  partner swing waits 2.24 counts before rotating. The bounded released-pair
  adapters below address that timing without source-ID exemptions.
- Public preview is now live at https://morganvenable.github.io/contra-studio/ .
  Workflow `publish-preview.yml` deployed the exact browser-checked local artifact
  from `pages-release` commit `14894f8b56795579acab2ac19838c4bbe71010fb`.
  Public HTTP 200, rendering, playback advancement and no page errors were
  verified; public JS SHA256 exactly matches local
  `253ba4b6c2fad4cfac48f45e5e47e11ab259d1a1855e0aefeee727173c488478`.
  This is a preview smoke check, not full motion certification. Unfinished
  released-swing changes are excluded. Publish working, previewed artifacts
  independently of ongoing regression research; never replace them with a
  failing development build merely to move deployment forward.
- The released-pair fix is now limited to sixteen-count partner swings from
  actual released standard sideline corners, followed by long lines or the
  section end. Roots rotate immediately and close by count 1.25; hand approach
  ramps over the following half count, with full frames at 1.75. Per-plan facing
  ownership prevents Becket's wrapper from blending the entry twice. Independent
  focused/event checks pass, as does the fresh 129-entry Ready replay. Public
  finite-period yaw and the sampled entry-body test retain the existing budgets.
  This change is not in the deployed preview artifact.
- The subsequent short-swing investigation covers 3051, 3115, 1098 and 115.
  A 1,000 Hz probe
  locates the ten-count speed peak at count .15 during expanded ingress (not
  terminal release); the eight-count yaw peak is during terminal release.
  `short-released-pair-swing-step.ts` uses separate monotone timing corrections
  inside those authored counts, retaining the sixteen-count implementation.
  Independent integration review found no blockers. Five focused tests and
  TypeScript pass: 180 actual compiled swing windows and seams across full finite
  periods at three/six couples retain counts, relationships, epochs, full frames
  at 1.75 and period closure. Maximum speed 1.406419, yaw rate 3.157430 and minimum
  all-actor clearance .62 remain inside existing budgets. These checks cover
  swing windows, not every other figure's motion. Raw Avatar contact tests are
  not GPU/audio certification. Fresh aggregate swing/Ready checks both pass:
  17,550 swing-pair checks (648 released entries) and all 129 retained Ready
  defaults, zero failures/skips. Separate candidate build/type-check and Chromium
  playback of all four changed dances pass with no page errors; screenshot
  inspection confirms the changed swing window renders. Full sharded CI for
  `2b01e42` completed at Actions run `39368045145`: build and three test shards
  pass; shard 1 fails on source 1464 expecting `established:swing` where the new
  route returns `released-pair-swing`. Review its behavior and contract before
  updating any expectation; this is not a green aggregate release. The verified
  public preview is unchanged.

## Current direction â€” figure semantics and corpus coverage

Morgan requested a researched figure foundation instead of continuing to choose
individual failing dances as the main work queue. Start with
[figure-foundation-plan.md](figure-foundation-plan.md). It defines the inventory,
source-backed catalogue, repeatable offline census, composition contract and
evidence requirements. The first research pass is complete:

- [Implementation inventory](figure-implementation-inventory.md) and
  [research catalogue](figure-research-catalogue.md) each account for all 41 named
  code kinds exactly once. The latter groups them into 32 pragmatic rows with
  19 source references; it explicitly leaves unvalidated variants and visual/
  caller review open.
- [Coverage audit](coverage-audit.md) is reproducible with
  `node --experimental-strip-types scripts/audit-coverage.mjs --write`.
  The initial fixture-only census measures 2,422 catalogue records, 157 snapshots, 129 saved Ready
  interpretations and 2,265 metadata-only records. Of 28 unsaved retained
  records, hypothetical suggestions yield two compile-admitted candidates,
  five motion/validation holds and 21 earlier-stage holds. Counts overlap
  across views; stages are not synonymous with root causes.
- Independent accounting review and four focused census tests pass. Both
  41-kind inventories and local document links were checked. This research
  does not alter production playback, saved choices or admission.

Current checkpoint ? 20 October 2026, 06:24 UTC: acquisition is complete.
All 2,422 catalogue IDs have valid local instructions (157 fixtures plus 2,265
new snapshots), totaling 20,158 rows, with no missing or rejected records.
See [source-acquisition.md](source-acquisition.md) for provenance, resume and
cached-review commands. All 2,265 new records have offline reviews; hypothetical
suggestions admit 11 candidates, not new Ready dances. Eighteen focused tooling
tests pass. Existing fixtures and public playback are unchanged.

Generalization checkpoint - 20 October 2026: [shared role-first heys](neutral-role-heys.md)
now supplies one encounter/motion implementation for neutral half/full heys.
Half exits reverse actual measured station ownership, released and facing across;
full exits return stations. No successor-specific motion or source dispatch.
Odd/even complete synthetic periods through long lines and chain pass; existing
full-hey source tests and all 129 Ready defaults pass. TypeScript and an isolated
production build pass; no new GPU/audio/body verification or Ready admissions.
Source 3260 now compiles and its actual 64-count odd/even periods pass. The later
width hold came from unnecessary legacy chain compaction before a neutral hey;
neutral exits now preserve ordinary chain stations without widening limits.
The exact source snapshot is now fixture158 (one existing local acquisition is
shadowed). The neutral Becket slice wrapper also passes complete odd/even periods
and direct public-motion/adapter checks. Seven of the original 140 half-hey
sources receive neutral suggestions; only3260 newly imports, with139 still held
by overlapping requirements. No Ready admission is implied. Next query the local
half-hey-after.json row blockers to choose the next shared capability.
The prior source1464 adapter-name assertion was corrected only after its existing
full-period behavior checks passed, and now also asserts strict-carried policy.

Wave/box circulation checkpoint - 20 October 2026: [shared wave circulation](wave-generalization.md)
now resolves measured station transfers and carries complete long-wave hands,
explicit boxes, clocks, relationships and waiting actors. Standalone 4-count and
balance-plus-circulation 8-count calls compose independently. The production 1591
wrapper uses the shared operation; its legacy source setup and progression guard
remain. Baseline 390 frames agree to floating-point precision, including seam hands.
The prior CI accounting failure was fixed by regenerating the fixture-only census
for 158 fixtures; all 29 script tests passed without weakening the assertion.
Earlier verification: 23 focused tests passed, including the then-current 129 Ready defaults,
2-12-couple complete periods and articulated wave/body regressions; TypeScript
and isolated Pages build pass. No new public deployment or GPU/audio check.
Source 187 Nomad's Land now imports through the public compiler and has a Ready
archive. Existing 129 archive hashes are unchanged. Initial-wave declaration,
full-wave balance and explicit circulate-to-paired-balance helpers are separate.
The author's original page specifies a wave balance before the swing, unlike
the retained ContraDB paired balance; its printed chain counts also differ.
Preserve both versions and their unresolved timing rather than silently combine
them. See the wave document for source links and contracts. Both the retained
paired-balance composition and the separately labeled synthetic wave-balance
composition pass complete 2â€“12-couple periods. Public imported-source tests
cover 3/4-couple periods and removable choices. The shared hey reaches the next
wave physically; complete wave hands and finite waiting/reentry are retained.
Compact chain receivers now have an explicit outward clearance preparation.
The circle releases its ring before preparing and acquiring the actual swing
frame. The CPU checkpoint below supersedes the earlier playback checks; choose
the next measured initial-wave or left-loop variant from the bounded inventory.

Current CPU playback checkpoint (20 October 2026): inventory is 130 Ready entries
and 159 checked-in fixtures. All three `initial-wave-body.test.ts` checks pass on
the production implementation. Synthetic wave-balance paths with 3/4 couples
cover two full repeats at eight samples/count plus key-phase checkpoints through
the finite period; cadence, fixed limb lengths and zero leg reach corrections
pass. The new wave/circulation/neighbor-swing/circle full-strength wrists agree
within 5e-16. A separate public imported-187 check covers counts 12-24 at 32
samples/count, including the retained paired-balance handoff, with exact wrists
and no leg corrections. This is CPU Avatar/IK evidence, not GPU rendering.

The circle now releases ring hands at counts 5-5.5, prepares its actual swing
endpoint over 5.5-7.5, then acquires the frame over 7.5-8. The wave-return hey's
encounter gates are [1.95, 3.575, 5.2, 6.9]; counts, encounters, endpoints and the
1.3 speed / 4 yaw bounds are unchanged. These timing changes remove the newly
measured leg corrections without changing the rig or relaxing assertions.
The subsequent legacy partner swing retains an approximately 0.0355 world-unit
upper-arm wrist offset. Its roots and contacts at the offending frame match the
standalone existing primitive exactly; it is an explicit inherited limitation,
not an exact-wrist claim for the whole dance. Software-WebGL browser playback and scrubbing passed, including the next round.
Hardware GPU, audio synchronization and caller review remain unrun.
Public release: commit 7a6c676, workflow 39452391647 passed every motion shard,
build/packaging and deployment. The public Pages site serves 130 Ready dances.
Current priority (Morgan, 20 October): execution timing and fluent handoffs.
See [execution timing](execution-timing.md) and the separate `timing-lab.html`
comparison. The study exposes preparation lead, transition duration, response
delay and recovery against an unchanged musical clock. It does not alter the
130 Ready dances. Morgan clarified planted foot contacts and the fourth-step inward push.
The lab now uses independent world-space feet, lifted steps and support cues;
its prior body-attached markers slid.
The swing now uses a separate schematic buzz-step foot model: shared-center
inside right feet, a right touchdown each count, one outside left push/recovery,
and identical pelvis/torso orientation. Six focused tests and an independent
contact-cadence/geometry audit pass; the main 3D engine remains unchanged. Next production work: inspect airborne
balance foot paths and weight transfer, then parameterize count-sized ramps
and carried velocity. Left-loop geometry remains queued. A measured CI balancing proposal
is in ignored research/contradb/release-shard-plan.json; no tests were removed.

Timing study release: source f068127, frozen artifact 1d4a5af, successful
workflow 39474177437. Six timing/foot-contact tests, TypeScript and the
multipage build passed. The prior study release passed 29 packaging/data-script
tests. Public browser verification confirms the fourth-step supporting foot
stays fixed while the body moves inward. The latest public buzz-study check
confirms on-count right touchdowns and identical pelvis/torso headings, with
no page errors. Independent dense sampling found maximum foot/body separation
0.24 and zero swing foot/body yaw mismatch. These are schematic-study checks. Browser checks covered
presets, parameter extremes, seeking, playback, count-click API operation,
320?1440px layouts, the built studio link and reopening Nomad's Land. Actual
audio listening and production whole-dance execution profiles remain unrun.


Keep context small: read the report for totals and query individual records in
`coverage-audit.json`; do not dump its approximately 1 MB of choices and evidence.
The census includes importer validation and existing internal samples, not a new
independent whole-period or body-motion certification.

Release check (2026-10-20): 66 focused motion/source/Ready tests and 29 script tests pass; TypeScript and isolated Pages build pass. Playwright Chromium with software WebGL opens Nomad's Land, scrubs counts 6/14/20/38/54/62, and plays across count 64 into the next round without page errors. Perspective screenshots were inspected. This supersedes the browser-unrun status above; hardware GPU, audio synchronization and caller review remain unrun. The first deployment run was canceled before publishing to fix rejection of unsupported terminal-hey modifiers; the final release must include that guard.

The exact CI artifact and public Pages build were browser-tested with software WebGL: Nomad's Land opens and plays into round two with three and four couples without page errors. Hardware GPU/audio checks remain unrun.
