# Included reviewed dance library

The Ready to play section contains reviewed source interpretations bundled with the app. Opening a card reads its included archive, validates it with the current runtime, and loads the studio without a network request. Press Play to start the clock. Source & notes retains the original choreography, credits, snapshot fingerprint and explicitly reviewed choices; these choices remain inspectable and removable through source review.

The separate, collapsed ContraDB catalogue is a discovery index. Its entries are not all playable. Downloaded records still go through normal interpretation and whole-dance validation.

As of 22 October 2026, 184 reviewed interpretations are included locally;169 remain publicly deployed until replacement release gates finish. The next two are Bobbing for Isaacs (2305) and Opus4.6.3 (3199), with distinct reviewed ricochet-to-wave and ricochet-to-swing contracts. Their exact built cards, three-/four-couple archive playback, removable controls, saved-library replay and swing audit pass. The latest three are November Night (67), Climate Change's Reel (152), and Opus 4.6.10 (3261). The preceding ten additions are Dancing Spell (1011), Tuesday Night Special (1021), Tall Paul's Shop (1556), Bev's Becket A (1658), Too Hot to Trot var. (1974), Jim to the Rescue (2492), Snap (3265), Barack Me, Obamadeus (480), Jubilation (var) (549), and Mad Robin in Love (83).

The 179-entry full CI run39870340952 blocked deployment on one stale parser expectation: explicit Mad Robin front role is now retained. That expectation is corrected and all three family tests pass. The other three motion shards and packaging checks passed.

For182, independent critics approved all three new sources; integrated source suites passed20 tests. All three imports passed three-/four-couple scrubbing and round-two playback, and six exact packaged Ready cards passed. All179 prior archives remain byte-identical. Final saved-library audit and replacement full CI are tracked in the development map.

Independent review of179 passed44 focused tests, including replay of all 179 saved archives and the ten source families. All previous 169 archive strings are unchanged. The exact packaged cards open, scrub and reach round two in Chromium software WebGL. The full-hey wave convention was removed and restored in the packaged UI, correctly blocking and re-enabling playback. Final saved-swing audit, census and full CI gates are recorded in the development map before publication. Hardware GPU/audio and comprehensive anatomy remain outside this evidence.

The prior 169 release passed full CI39632914170 and fresh public card checks. Its twelve additions retained explicit interior progression, role passage, bare-ring formation, wave convention, receiver and provenance choices as applicable.

The preceding eight additions (166/2247/2243/2322/133/2876/265/363) shipped in the fully tested 157-entry release, source f062259 and workflow 39628599757. Fresh public checks of Power Surge, Kiss the Bride and Trip to Kentucky load, scrub and play without page errors using software WebGL.

The preceding additions were Unbelievable! (2266) and Unbelievable! variation (3142), with explicitly reviewed historical comparisons and a physical compact chain exit into the same-neighbor promenade.

The preceding additions were Daddy's Little Girl (823), retaining the literal Duple Improper formation, and Futon Frolic (3478), retaining its explicitly reviewed family-provenance note and partner chain.

The preceding batch added
Opus 4.6.9 (3260), Cascades (188), South Union Reel (2062), South Union Reel var
(2063), Culver City Contra (2213), Another Last Dance (2409), Spend Some Money
Together (2605), Forgotten Treasure (2701), A-1 Reel var. (2966), Baughman Jig
(3402), Sweet as Honey (3510), and Harmony Supper Line (933). These are source
entries, including separately attributed variants, not a claim of unique compositions.

The eleven acquired candidates preserve their literal 64 counts and explicit
reviewed choices. Focused tests cover complete three-/four-couple periods,
finite poses, figure seams, contact strength bounds and exact period closure.
Opus 4.6.9 additionally has measured neutral-half-hey encounter and relationship
checks. These are choreography checks, not comprehensive anatomical certification.
The previous 130 archives retain their original bytes and provenance.

Nomad's Land (187) retains the ContraDB paired balance/swing and eight-count
chain. The author's separately published wave-balance wording and different
printed chain count remain separate, unresolved variants.

## Generation and checks

Run `node scripts/generate-ready-library.mjs` after changing the reviewed source set. It reads only retained public fixtures and current reviewed interpretation rules. The existing Butter source uses its previously reviewed clockwise, partner-chain and four-count-balance choices explicitly. Every output must replay to the identical dance and compile with the registered capabilities. The generator strips unrelated page chrome through the canonical source archive writer, without changing the source fingerprint or inventing a retrieval date.

`src/ready-library.test.ts` checks that every reviewed ID has exactly one included archive, compares canonical retained source contents and identities, compiles the default program, and samples moving frames with network access disabled. UI tests separately open every card and exercise the Play control.

## Upstream outage fallback

The read-only numeric-record gateway makes one bounded upstream attempt. For a temporary failure, reviewed records may use a bundled canonical public snapshot. The response identifies it as retained, preserving its recorded retrieval time or explicitly reporting that no capture date was recorded. The UI says it may differ from the current page. Authoritative access denial or missing/deleted responses are not replaced with saved content. No saved snapshot is represented as a fresh download.

Detailed footwork and holds remain schematic. This library provides reviewed whole-dance motion, not a claim of anatomically exact figure animation.

Explicit source reviews can be retained as standard interpretation archives under
`test-data/reviewed-interpretations/<id>.json`. During generation these take
precedence over previous Ready entries and automatic suggestions. The complete
canonical snapshot, source binding and archive version must match; stale explicit
reviews fail rather than silently falling back to new suggestions. Current import
admission is still required. This preserves a reviewer's source-specific choice
without adding source-specific motion or broadening automatic prose rules.

Source 3478's retained note says ?Yet another member of the Small Potatoes /
Fingerling Potatoes / Push the Button family?. Its explicit review treats that
sentence as family provenance, without substituting another dance's instructions.
The partner chain receiver is independently checked against actual arrival
positions. Clearing the note classification blocks admission; choosing neighbor
as receiver rejects. The original note and both removable choices remain in the
archive. No generic prose-classification rule was changed.


For each admission batch, verify the exact packaged build with
`node scripts/smoke-ready-batch.mjs --base=http://127.0.0.1:4195/ --ids=823,3478 --output=research/contradb/smoke-batch`
(adjust URL, IDs and output directory). The script waits for each actual dance
heading, scrubs selected counts, and requires the round label to reach round two.
It saves screenshots and a compact JSON report. This is software-WebGL playback
evidence, not a replacement for source/relationship tests or visual criticism.
