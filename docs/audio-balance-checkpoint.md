# Audio, band and connected-balance checkpoint

## Implemented

- A shared Web Audio clock drives playback and dancer sampling. The original synthesized 64-beat AABB practice reel has melody, bass and chord parts. Tempo/speed changes affect pitch.
- Local recording import uses an explicit BPM and first-downbeat offset. It is session-local; files are not uploaded or persisted with choreography. Limits: 32 MiB encoded file, six minutes, and 64 MiB decoded PCM. Metadata and channel-layout preflight precede serialized decoding. Failed or superseded replacement keeps the existing recording.
- Four-count balances prepare a 1.18-unit pair spacing during the preceding figure, start with reachable joined hands, move inward for two counts to 0.92, and outward for two counts to 1.18. The formation identity/slot trajectory remains separately inspectable through `formationSample`.
- An original procedural robot fiddle/accordion/bass trio is driven by the same beat. Its stage remains beyond the music end of the dancer envelope.

## Verification scope

Automated tests cover clock arithmetic, pause/seek/loop/rate transitions, local-file bounds and load races, actual UI/controller bindings in a simulated DOM, balance spacing and contacts, full-line continuity, identity preservation, and deterministic band placement/animation. These checks do not establish audible browser timing. Browser audio/WebGL end-to-end verification remains unavailable in the current test environment. Body review uses numerical articulated geometry and CPU-rendered projections of the actual meshes.

## Remaining work

- The requested reciprocal shoulder-blade swing frame is **not enabled**. Its latest candidate still intersected a partner's torso. The checkpoint retains the previously reviewed swing frame: one back support, one upper-arm support, and leading joined hands. The connected balance-to-swing handoff remains active.
- The motion is schematic and does not assert measured shared forces or biomechanical validity.
- Local recordings use a constant manual beat grid. Automatic downbeat detection, tempo-drift maps, and pitch-preserving time stretching are not implemented.
- ContraDB source ingestion is being integrated separately. A record recognized by its text is not automatically an executable choreography, and the three catalog dances do not imply encyclopedic coverage.
