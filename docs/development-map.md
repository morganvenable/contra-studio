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
`records.length`. The retained inventory is 129 unique Ready IDs, 154 source
snapshots, 2,422 discovery records (historical `reportedRecords`: 2,426).

## Next capability investigation

The star-to-partner-gyre seam now has a bounded shared adapter in
`src/star-gyre-step.ts`, selected by `src/sequence-registry.ts`. Its tests reproduce
the old 5.126809 facing-rate rejection from a real primitive star endpoint: this
is a fast body turn, not a wrapped-angle bookkeeping error. The star now releases
hands over beats 5.6–6.56 and turns toward its actual partner over the remaining
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

## Local checkpoint — 19 October 2026

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
