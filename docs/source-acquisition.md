# Acquiring the catalogue's dance instructions

The public catalogue is a discovery list, not the choreography itself. This
workflow downloads missing public dance pages into a local research dataset,
preserving source evidence separately from reviewed playback interpretations.

## Run and resume

From the application directory:

```powershell
node --experimental-strip-types scripts/acquire-sources.mjs
node --experimental-strip-types scripts/acquire-sources.mjs --run --interval-ms 1000
```

The first command reports the queue without fetching. The second fetches serially,
at least one second between request starts. It skips the existing fixture
snapshots and checks saved local records before resuming. Use `--limit N` for a
bounded batch. `--retry-failures` explicitly includes failed records in a later
run; inspect their reasons first. A login/access refusal is not permission to
switch identities or bypass access controls.

Local output, excluded from Git and public builds:

- `research/contradb/snapshots/<id>.json`: canonical source snapshot.
- `research/contradb/manifest.json`: per-record outcome and fetch provenance.
- `research/contradb/inventory.json`: optional validated instruction inventory.

The reviewed fixtures in `test-data/contradb/` remain authoritative for their
existing IDs. Acquisition does not overwrite them or refresh their saved choices.
The catalogue itself remains the existing dated catalogue; this is not discovery
of every record subsequently added to ContraDB.

## Inventory without compiling thousands of dances

```powershell
node --experimental-strip-types scripts/audit-coverage.mjs --inventory --snapshot-dir=research/contradb/snapshots --output=research/contradb/inventory.json
```

This merges fixtures and downloaded records, with fixtures taking precedence. It
checks source identity, structural parsing and source rows without claiming motion
support. Rejected and shadowed records are reported. The full importer census is
a different, more expensive operation: removing `--inventory` runs its existing
validation path. Explicit local datasets cannot overwrite the checked-in fixture
census using `--write`.

## What is preserved and verified

Requests use public HTTPS pages, no credentials or cookies, and no redirects.
Response sizes and elapsed times are bounded. Rate-limit responses trigger
bounded backoff, and access refusal or repeated network errors stop the batch.
Retries do not manufacture a successful result.

The source reader retains choreography fields, notes, attribution and publication
information. It drops surrounding navigation and session material. Acquisition
compares original and sanitized source fingerprints, checks the saved snapshot's
round trip, and rejects identity conflicts or diagnostics indicating omitted
source sections. Raw page bodies, cookies and authentication tokens are not saved.
The manifest records retrieval time, response-byte hash, canonical fingerprint,
saved-file hash for new checkpoints, row count and diagnostic codes. Parsed server
dates are separate from author revision dates.

Some source pages are retained with diagnostics: for example, unresolved count
notation can still be valuable research evidence. A saved source is therefore not
necessarily a structurally valid instruction record, and neither means a playable
dance. Report all three stages separately.

Only independently authored acquisition code is added to the MIT project.
Downloaded source descriptions retain their attribution and original rights;
acquisition does not relicense them or automatically publish the research dataset.

## Incremental offline interpretation review

```powershell
node --experimental-strip-types scripts/audit-acquired-sources.mjs --once
```

This reviews downloaded records without fetching again. Per-source caches and
`summary.json` live under `research/contradb/review-cache/`. Cache keys include the
source bytes and engine source signature. Raw defaults and hypothetical
conventional suggestions are reported separately; suggested choices are not
approvals. An importer admission is not independent whole-dance certification.
The default excludes existing fixtures; `--include-fixtures` explicitly adds them.

For acquisition in progress, use `--watch` and optionally
`--stop-file=research/contradb/STOP_REVIEW`. Creating that file ends the watch.
Remove it before another watch using the same stop-file option. The watcher stops
if engine source changes; restart it to load the new implementation. Keep the
engine unchanged during a pass. Node version is not part of the cache signature,
so use a fresh output directory when comparing Node runtimes.

## This acquisition run

Completed 20 October 2026 at 06:24 UTC against 2,422 catalogue IDs:

- 2,265 new snapshots saved; 157 existing fixtures preserved.
- 2,422 structurally valid instruction records, containing 20,158 source rows.
- Zero missing IDs, extra IDs, overlapping files, rejected files or outstanding failures.
  One connection interruption stopped the batch; resumption recovered it.
- All new snapshots passed source-ID and canonical-fingerprint verification.
  2,260 also matched acquisition-time saved-file SHA-256. Five pilot records
  (1192, 1200, 1246, 1301, 1452) predate that field and were verified by identity
  and canonical fingerprint instead. Response hashes remain recorded.
- Dry resume reports zero pending. Local reports: inventory.json and verification.json.
- Offline review covered all 2,265 new sources with zero exceptions. Raw defaults
  held all 2,265 at interpretation stage; hypothetical conventional suggestions
  admitted 11 and held 2,254. Implementation gates occur at this stage too;
  these counts do not mean all remaining source wording is ambiguous.

Repeated exact unresolved clauses identify overlapping groups: unspecified chain
receiver (452 sources), wave formation/balance/circulation (157), role-led half hey
with explicit shoulders (140), hall turn/return (129), directional Rory O'More (99),
next-neighbor swing (88), standalone long-lines forward (73), explicit give-and-take
(69), role/shoulder passes (68), and contra corners (28). These are conservative
clause matches among new acquisitions, not exhaustive frequencies or projected
admissions. For example, 138 of 140 half-hey sources have other unresolved rows.
Exact definitions, examples and co-occurrence are retained locally in families.json.

Next specify shared encounter, topology and smaller counted-action semantics
against contrasting whole dances with co-occurring requirements.

Validation: 18 focused acquisition/inventory/cache tests pass. This work changes
research tooling only; no new GPU/audio/browser or whole-period motion checks
were run, no Ready interpretations were added, and the public preview is unchanged.

Subsequent regression work copied acquired source 3260 byte-for-byte into the
fixture set. There are now 158 fixture IDs and 2,264 additional acquired IDs;
local acquisition still contains its original 2,265 files, with one intentionally
shadowed by the authoritative fixture. The completed acquisition totals above
record the original run.
