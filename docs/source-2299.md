# Exact source 2299 acquisition

The official [Everybody Dance record](https://contradb.com/dances/2299), credited
to Jim Hemphill, was retrieved by a credential-free direct GET with redirects
disabled. The response was HTTP 200, `text/html; charset=utf-8`, 7,426 bytes.
The response's server Date was `2026-10-20T03:38:04.000Z`; this is the retained
`retrievedAt` timestamp, not a claimed author revision date.

`test-data/contradb/2299.json` stores the normal canonical snapshot produced by
`makeContraDbSnapshot`. The full response was parsed, its CSRF metadata redacted,
and the canonical article retained without navigation, session headers or cookies.
Both the original response and saved snapshot parse to
`contradb:2299:8c8893e6613aa234`, with seven rows totaling 64 counts.
This is the exact dance record, replacing the earlier lack of a retained fixture;
the program summaries were only corroboration.

The source specifies improper formation and confirms the final four-count
twos-arch/ones-dive progression after a four-count ring balance. Its other timing
is 16 counts of neighbor balance/swing, eight of long lines, eight of a right star
through three places, 16 of partner meltdown swing, and eight of left circle
through three places. The source note requires the neighbor swing to finish in
the progressed position, even when the call omits role terms.

Fresh `node scripts/inspect-source.mjs 2299 --couples=3` verification reports:

- Source structurally valid, six of seven rows recognized, four resolved.
- Neighbor balance/swing timing needs an explicit choice.
- Meltdown requires reviewed gyre/swing timing and passing shoulder.
- Arch/dive remains an unknown figure; source notes also block automatic playback.
- No executable dance was produced, so compilation was not run.

This acquisition adds evidence only. It does not admit the dance to Ready or
register the isolated arch/dive probe. That probe still needs a reviewed source
interpretation, anatomical underpass validation and whole-dance finite progression.
Choreography redistribution permission remains unestablished by the public page;
the application MIT license does not relicense this source data.
