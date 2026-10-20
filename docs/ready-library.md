# Included reviewed dance library

The Ready to play section contains reviewed source interpretations bundled with the app. Opening a card reads its included archive, validates it with the current runtime, and loads the studio without a network request. Press Play to start the clock. Source & notes retains the original choreography, credits, snapshot fingerprint and explicitly reviewed choices; these choices remain inspectable and removable through source review.

The separate, collapsed ContraDB catalogue is a discovery index. Its entries are not all playable. Downloaded records still go through normal interpretation and whole-dance validation.

As of 20 October 2026, 130 interpretations are included. The latest is Bill
Olson's *Nomad's Land* (187), retaining the ContraDB paired balance/swing and
eight-count chain. Its initial wave hands, compact spacing, receiver clearance,
terminal wave return and finite-end preparation are explicit removable choices.
The author's separately published wave-balance wording and different printed
chain count are not silently substituted. The previous 129 archives are unchanged.

## Generation and checks

Run `node scripts/generate-ready-library.mjs` after changing the reviewed source set. It reads only retained public fixtures and current reviewed interpretation rules. The existing Butter source uses its previously reviewed clockwise, partner-chain and four-count-balance choices explicitly. Every output must replay to the identical dance and compile with the registered capabilities. The generator strips unrelated page chrome through the canonical source archive writer, without changing the source fingerprint or inventing a retrieval date.

`src/ready-library.test.ts` checks that every reviewed ID has exactly one included archive, compares canonical retained source contents and identities, compiles the default program, and samples moving frames with network access disabled. UI tests separately open every card and exercise the Play control.

## Upstream outage fallback

The read-only numeric-record gateway makes one bounded upstream attempt. For a temporary failure, reviewed records may use a bundled canonical public snapshot. The response identifies it as retained, preserving its recorded retrieval time or explicitly reporting that no capture date was recorded. The UI says it may differ from the current page. Authoritative access denial or missing/deleted responses are not replaced with saved content. No saved snapshot is represented as a fresh download.

Detailed footwork and holds remain schematic. This library provides reviewed whole-dance motion, not a claim of anatomically exact figure animation.
