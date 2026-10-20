# Contra Studio

An experimental 3D contra-dance rehearsal workbench built for Morgan Venable.

Original code is [MIT licensed](LICENSE). Third-party libraries and dance source
data retain their own terms; see [third-party notices](THIRD_PARTY_NOTICES.md).

## Run locally

Requires Node.js 22 or newer.

```
npm ci
npm run dev
npm test
npm run test:server
npm run build
```

`npm run build` type-checks the app, builds the Vite client, and creates the deployable Worker ESM artifact at `dist/server/index.js`, with client assets embedded. `npm run build:static` and `npm run preview` build and preview the client alone; that preview has no public-source fetch endpoint. WebGL enables articulated 3D rendering; an overhead fallback remains available when it is unavailable.

## Current workbench

- Deterministic beat-indexed choreography, persistent dancer and partner identities, finite-line progression, compact same-end exchanges, waiting and re-entry cues, and selected mid-cycle neighbor changes.
- Two through twelve couples, articulated stylized dancers, figure-specific facing and hand connections, multiple cameras, paths, labels, and dancer selection.
- A phrase/figure timeline, scrubbing, tempo and rehearsal speed, loops, and an original synthesized AABB practice reel. Animation and audio share a transport; local recordings use an explicitly reviewed manual tempo and beat offset. A beat-synchronized robot band sits beyond the music end.
- Caller’s Box JSON/timed-card import and public ContraDB record loading by ID or official URL. The Worker fetches only bounded public ContraDB record pages. Saved source snapshots and portable interpretation files also work without that endpoint.
- Source-attributed review, visible unresolved clauses, labeled conventional suggestions, exact saved choices, original source retention, local library persistence, and a searchable ContraDB metadata index. A search result is not a claim that its dance can already be rendered.
- Validated structured editing with undo/redo and source preservation for the represented basic schema. Event-driven, Becket, and specialized figure contracts remain protected from lossy structured editing.

Reviewed source workflows include The Baby Rose, Simplicity Star, Butter, Dancing in My Bones, Back of the Envelope, The Nice Combination, Simplicity Swing, Pandora’s Box, Box the Gnat Contra, Forgotten Treasure, Frederick Reel, Hay in the Barn, Patience, Easy Peasy, Undercurrent, I Drove to Portland for Tacos, Lark in The Afternoon, Parmesan, Hocus Pocus, Al’s Safeway Produce, Kitchen Stomp, The Full Deal (two source variants), Almost Never Too Late, Monday, Bob the Surfer, the ricochet example New Dance Dance tme (#1067), Emma’s Emergency, Camp Sertoma Farewell, Right Thought, Fire in the Creek variation, Push the Button, Ashokan Hello (var.), The Big Easy, Another Safe Production, Pittsboro Pattycake, Honey variation, Hyla’s Flirt, Top of the Stairs, Jubilation, Don’t Have to Walk but You Can Dance, If You Can Walk You Can Dance, A Summer Night in Seattle, Hey Fever (and two source variants), Mr. Isaac’s Magic, Yoyo’s Ma, right dance wrong time, Reel Time, Airpants pass-through, Grease, Heartbreak Contra, Another Flirty Attempt, Sugarbritches 2.0 (allemande variation), Ben’s Brilliance, a separately credited Push the Button source, The Big Easy variation, Mended Sixpence variation, and Pure Ingredients. Each still depends on its supported formation, relationships, source-counted timing, and explicitly retained interpretation. Registration is based on executable figure contracts and full-sequence validation, not dance titles.

## Important boundaries

This is a development prototype. Source interpretation, sequence validity, and anatomical movement quality are separate questions. Unknown figures, contradictory qualifiers, missing relationship choices, and unsupported end policies block playback. Some known figures cannot yet compose with every incoming or outgoing formation. The current finite-set adapters do not establish universal proper, Becket, triple, mixer, diagonal, or multiple-progression support.

The body model is procedural rather than motion capture. Some reused turns, balances, and progression exits still show bounded foot-reach correction, hand-target mismatch, or small self-intersections. The terminal half hey in the reviewed Hay in the Barn sequence and the two-count wave allemandes in Undercurrent have disclosed gait limits. California-twirl clearance is sampled and has a tight positive head margin, not a continuous safety certificate. Source and topology tests do not establish biomechanical validity or physical teaching safety. Exact styling and shared weight need review by experienced dancers.

The original synthetic reel is practice accompaniment. Local recording alignment is manual; automatic downbeat/tempo-drift detection is not claimed. Mathematical audio scheduling tests do not establish every browser/device’s audible latency. Browser GPU rendering and offline actual-mesh diagnostics are reported separately.

Source permission, authorship, status and provenance are retained. Public readability does not imply redistribution permission. Caller’s Box export is accepted as a downloaded/pasted source; the ContraDB same-origin endpoint is narrowly limited to public record GETs, not a general proxy.

## Project structure

- `src/choreography.ts`, `src/engine.ts`: checked formation dispatch, choreography sampling and progression
- `src/scene.ts`: articulated Three.js rendering
- `src/parser.ts`, `src/contradb-source.ts`, `src/contradb-import.ts`: source adapters and retained diagnostics
- `src/source-review.ts`, `src/source-library.ts`: reviewed choices and attributed examples
- `src/validator.ts`, `src/figure-semantics.ts`: sequence and consumed-argument validation
- `src/*-adapter.ts`: explicit identity-bound figure contracts
- `src/ui.ts`, `src/style.css`: rehearsal, library, import and guide interface
- `worker/public-source.mjs`, `scripts/build-worker.mjs`: bounded public source loading and deployment packaging
- `docs/`: research, domain contracts, interaction design, review evidence and limitations

Third-party libraries retain their own licences. No competitor implementation was copied into this project. Tests and fixtures are packaged inside this app so the source archive can be built independently.

## GitHub Pages

Use this application directory as the repository root. `npm run build:pages`
produces a static `dist/` with relative asset URLs, suitable for
`https://<owner>.github.io/contra-studio/`. This mode supports the included Ready
library and saved source imports. Live ContraDB downloads require the separate
Worker gateway; the Pages interface explains the saved-file alternative.

The included Actions workflow installs locked dependencies, checks declared
dependency licenses, runs tests, type-checks and builds the Pages artifact. Pushes
and pull requests verify; to publish, select GitHub Actions as the repository's
Pages source and run **Verify and publish Pages** on `main` with `deploy` enabled.
The deployment job runs only after verification succeeds. The workflow includes
the project and Three.js notices in the distribution.

The public preview is https://morganvenable.github.io/contra-studio/ .
To publish an already built and browser-checked version while separate motion
research continues, commit that exact `dist/` artifact (plus distribution license
notices) to `pages-release`, then run **Publish previewed build** with its exact
commit SHA. This workflow publishes the retained artifact without rebuilding
unfinished work. It records the artifact revision in `deployed-commit.txt`.
Keep failed or unreviewed changes out of the published artifact; broader
regression work continues independently. Verify the public app and asset hashes
after deployment.

For local use: `npm ci --cache ../.npm-cache`, then `npm run dev`. To preview the
public build: `npm run build:pages`, then `npm run preview -- --host 127.0.0.1`.
The normal `npm run build` remains the Worker package build and replaces static
output, so rebuild Pages before previewing or uploading static files. Worker
packaging also works without `.openai/hosting.json`; an existing owner manifest is
preserved when supplied, but a public clone does not invent a hosting identity.

Hosting references: [Vite's GitHub Pages guide](https://vite.dev/guide/static-deploy.html#github-pages)
and [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
