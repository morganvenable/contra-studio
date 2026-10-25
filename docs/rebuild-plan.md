# Rebuild plan: a small figure library

## Status (milestones 1 to 3, 23 October 2026)

Delivered in `src/next/` beside the old engine (old modules untouched):

- Core: `DanceState`, `math.ts`, the fold into the existing `CompiledDance`
  contract, one physical check (`check.ts`, limits in `config.ts`), a row
  parser with one alias table (`roles.ts`: larks/robins stored and shown).
- Figures, one file each: slice, pass through, allemande, balance, Rory
  O'More, swing, circle.
- Debra's Dance (2321) as `dances/2321.json`: source URL + snapshot hash +
  FigureCalls + choices. Compiles at 3, 4 and 6 couples, passes the physical
  check, and progresses correctly over many rounds.
- `?engine=next` uses the new engine for supported dances; default unchanged.
- Formation, Progression and MusicStructure are data (below), with a proof
  test for a three-couple waltz and a whole-set casting dance.
- Tests: `npm run test:next`; browser flow: `node e2e/next-engine.mjs`;
  side by side: `node --experimental-strip-types scripts/compare-engines.mjs`.

Milestone 2 (23 October 2026):

- Improper duple minor formation and a `duple-minor` progression (1s
  travel down, 2s up; facing does not matter; waiting couples change
  number and cross at the start of the next round when the progression
  ends the round).
- New figures: chain, right and left through (shared courtesy turn in
  `core/courtesy.ts`), star, do-si-do, long lines, petronella, promenade,
  twirl (box the gnat, swat the flea, California twirl), down/up the hall,
  pass by / pull by, roll away; balance gains ring, pair and "current";
  hey is built but experimental (its entry fails the check, see below).
- 95 of 196 Ready dances stored (since replaced by the whole-library
  import of milestone 4); the corpus check covers source hash and parse,
  3/4/6 couples, physical check over couples + 2 rounds, an independent
  progression model, and every couple meeting every other.

Milestone 4 (24 October 2026): every ContraDB dance on the new engine.

- `scripts/next-library.mjs` imports all 2,422 catalogue dances (research
  snapshots, then `test-data/contradb` for the 157 they lack) into
  `public/dances/<id>.json` plus `index.json`, runs the corpus check on a
  worker pool (about 20 s) and writes `docs/next-library-status.json`.
- Status per dance: ok, check, partial (unparsed rows and figures that
  cannot start are held still and labeled), unsupported (formation not
  built). Plain-language problems come from `src/next/status.ts`.
- The app fetches a dance by id when it opens; the Dance library lists
  every dance with a status badge, search and a status filter, and
  `?ready=<id>` opens any id. Partial or unsupported Ready dances show the
  reviewed old-engine version with the new engine's status line first.
- New: Becket ccw, proper, indecent and duple neutral formations; ocean
  waves, star promenade, butterfly whirl, poussette, turn alone, figures on
  a diagonal, left-shoulder gyres, lead-in rows ("larks take partners").
- Sampled corpus test in `npm run test:next`; browser flow
  `node e2e/next-library.mjs`.

Milestone 3 (23 October 2026):

- The top of the set is now -z, next to the robot band (as in the old
  engine): every formation turned a half turn about the vertical, so
  handedness is unchanged. Down the hall, the duple-minor progression,
  whole-set place names, the corpus models and the tests follow.
- A star with no grip named is a basket star (wrist grip); hands across
  stays available (`DEFAULT_STAR_GRIP` in `figures/star.ts`).
- Meltdown swing: 4 beats of right-shoulder round (facing, clockwise, no
  hands; a third of the phrase under 12 beats), melting into the swing at
  one turning rate. A long swing stays an ordinary swing.
- Hey rebuilt: the src/hey.ts serpentine track across the set, Hermite
  entry and exit matched to the track (solveExplicitHeyExit), each dancer
  joining before their own first pass and leaving at the middle of their
  last, ending in the corner they head for. Heys started on the ends
  (partners/neighbors) are built; ricochets and diagonal heys are not.
- New figures: square through (balance + pull bys), give and take, mad
  robin, gyre, long-wave balance and box circulate, slide along the set;
  a swing can end facing down or up ("ones swing, face down").
- 160 of 196 Ready dances stored and passing the corpus check.
  `e2e/next-engine.mjs` adds a meltdown (188) and a hey (1658) flow;
  `e2e/next-shots.mjs` saves review screenshots.
- Still failing, not loosened: progression timing (257, 840, 1618 Becket
  with down the hall; 3195, 66, 928, 1273 improper rounds that end with
  couples level across the set), 2-beat passes across the set right after
  a full hey or a box the gnat (724, 1144, 1098), 1072 (allemande speed),
  115 (box the gnat turn rate), 2329 (swing clearance). Unparsed: ricochet
  and diagonal heys, Becket ccw, cross trails, revolving door, couples
  do-si-do, poussette, butterfly whirl, star promenade, ocean waves.
- Next: Becket ccw and the progression cases above, ricochet heys,
  couples do-si-do, ocean waves, and wiring `music` into audio.

Status: proposed 23 October 2026. Replaces the per-dance admission approach;
it does not change anything already shipped.

## Why

The app grew one dance at a time toward "1,000 Ready entries". Each new dance
added modules for its exact context instead of reusing figures:

- 330 source modules (3.3 MB), 396 test files (2.4 MB), 2.9 MB of docs.
- 43 `FigureKind`s, many of them contexts rather than figures
  (`pass-to-wave-balance`, `form-short-wave`, `becket-shift`, ...).
- Swing is special-cased in 63 files, hey in 29, balance in 38, chain in 32.
- The same math is copied over and over: the speed ramp 28 times, smoothstep
  45 times, angle wrap 88 times, hand-reach checks 31 times.
- About 1,750 `throw` guards, including validators that require exact
  constants (Rory long waves must have `stationSpacing === 1.28`).
- About 30 whole-dance detectors and 25 whole-dance compilers dispatch on row
  sequences, so a new dance usually needs a new path.
- Code is written as minified one-liners, so every read costs many tokens and
  no one can review it.

The result is expensive for agents to work in and wrong in ways no test
catches. Rory O'More passed back to back for every dance, because the slide's
own test asserted the wrong direction.

## Target shape

```
ContraDB row --parse--> FigureCall { move, params, beats }
DanceState  --figure--> { motion(beat) -> Frame, exit: DanceState }
dance       = fold(figures, initialState)
```

- **DanceState** is the only thing carried between figures: poses (position,
  yaw), held hands, partner/neighbor maps with an epoch, waiting dancers, and
  end-of-set direction. Nothing else.
- **A figure is one function**, `(state, params) -> { motion, exit }`. It
  checks its own preconditions against the state (who is facing whom, which
  hands are free) and throws one clear error when they fail. It never looks at
  the next figure, the dance title or the source ID.
- **Parameters, not modules.** Swing length, who swings, direction, hand,
  amount (1/2, 3/4, ...), and styling (Rory spin, petronella clap) are values.
  One `swing.ts`, one `allemande.ts`, one `hey.ts`.
- **Formations are just states.** Becket, improper, short wave and long waves
  are initial states or reached states, not separate pipelines.
- **One timing helper** maps a figure's beats to local progress with the C2
  ramp. Figures that need a balance-then-travel split take `phaseBeats`.
- **One physical check** after compiling a whole dance: clearance, speed, yaw
  rate and hand reach over every frame, with limits in one config. Figures don't
  each carry their own budget code.
- **Readable code.** Prettier-formatted TypeScript, one figure per file, header
  comment with the caller's definition and its source.

## Figure list (first pass)

Ordered by how often they appear in the 1,704 retained ContraDB rows:

swing, balance, circle, allemande, star, chain, long lines, do-si-do, hey,
pass through, right left through, petronella, promenade, box the gnat /
California twirl / swat the flea, down the hall, wave forms and balances,
circulate, pull by, square through, roll away, give and take, slice, mad robin,
gyre, Rory O'More, arch, poussette, revolving door, butterfly whirl, cross
trails.

About 30 files. Each replaces the many context modules that special-case it
today (for example, 23 files named for swing and 25 named for hey).

## Formations and structures

The core does not assume contra duple minor. Structures are data:

```ts
interface Formation {
  name: string;
  shape: 'longways' | 'small-set' | 'square' | 'circle' | 'sicilian';
  grouping: 'duple-minor' | 'triple-minor' | 'whole-set';
  couples: { min: number; max: number };
  start(couples: number): DanceState; // positions, facings, groups, labels
}

interface Progression {
  kind: 'minor-set' | 'whole-set' | 'none';
  rebind(state: DanceState): DanceState; // relationships and labels, never bodies
}

interface MusicStructure {
  meter: { signature: string; beatsPerBar: number }; // 2/4, 4/4, 6/8, 3/4, 9/8
  parts: { name: string; bars: number }[]; // AABB, AAB, ABC, A8 + B12 ...
  times: number | 'repeat'; // once through, N times, or keep going
}
```

- `DanceState` carries named `relations` (partner, neighbor, corner ...),
  `groups` (minor sets or the whole set) and position labels ("1s",
  "1st couple"). Figures address dancers by relationship, role group or
  position, never by gender.
- The fold rebinds through the dance's Progression at the figure the source
  marks as the progression, or at the end of the round when none is marked.
- Built: Becket (minor-set), proper longways as one whole set, three-couple
  set. Deferred: improper and proper duple minor, triple minor, four-couple
  sets, squares, circles, Sicilian circles, triplets; ECD figures.
- Audio still assumes a 64-beat AABB reel in cut time at 112 bpm with click
  accents every 16 and 4 beats (`src/music.ts`, `src/audio.ts`). A compiled
  next-engine dance exposes `music` for that work; audio is unchanged.

## What we keep

The math is good; the organization is the problem.

- `ring-twirl-contract.ts`: `ease`, `smooth`, `progress`, `turn`, `distance`,
  `sampleTime`. This becomes `core/math.ts`, and every figure uses it.
- Pure kernels that already have the target shape: `gyre`, `promenade`,
  `petronella`, `california-twirl`, `ring-balance`, `rory-slide`,
  `revolving-door`, `right-left-through`, `square-through`, `give-and-take`,
  `rollaway`, `cross-trails`, `named-pull-by`, `mad-robin`, `arch-exchange`,
  `chain`. They get adapted to `(state, params)` and reformatted.
- Hey: `hey.ts` (pass events, trajectory, exit solve), `partial-hey.ts`,
  `hey-retiming.ts`. Drop the `diagonal-hey-path.ts` fork.
- `hey-transition.ts` `solveRootTransition` becomes the general physical check.
- `engine.ts` primitives (balance cue, swing, circle, allemande, star) and the
  canonical hand-reach check.
- `progression-topology.ts` `rebindAtEndpoint` for progression and epochs.
- Rendering and audio stay unchanged: `scene.ts`, `fallback.ts`, `audio.ts`,
  `transport.ts`. They consume `CompiledDance`, `Frame`, `Pose` and
  `HandContact`, which stay stable. Two leaks to close: `scene.ts` importing
  `figureContinuity` from the engine, and `ui.ts` importing about 25
  source/policy modules.

## What goes

- Whole-dance detectors, `*Policy` types and whole-dance compilers.
- Context modules (`becket-*`, `carried-*`, `source-*` figure variants,
  `*-step`, `*-adapter`, `*-producer`, `*-handoff`).
- Capability flags.
- Exact-constant validators and `JSON.stringify` tuple checks.
- Look-ahead hacks (`exitPreparationWindow`, `next`-figure peeking). If a
  figure needs to prepare for the next one, that's a transition the fold
  inserts, with its own small set of rules.
- Per-dance tests named by ID. Keep a corpus test instead: every Ready dance
  compiles and passes the physical check.

## Data

- Store a dance as its source reference (URL + content hash) plus the list of
  `FigureCall`s and any choices. No embedded HTML. `ready-library.ts` (629 KB)
  becomes a folder of small JSON files.
- Check whether ContraDB exposes structured figures (move + parameters). If it
  does, import from that instead of the 79 regexes in `normalizeContraDbRow`.
  Fetch politely: cached, one request per dance, rate-limited.
- Choices with a usual answer get that default, which a reviewer can change:
  Rory spins in the travel direction, a balance is 4 beats, a swing fills its
  phrase.

## Workspace

- One clone outside OneDrive, with at most two or three short-lived worktrees.
  Today there are 19 full worktrees in OneDrive.
- Docs: this file, a README, and a figure catalog generated from the figure
  header comments. Retire `development-map.md`, `HANDOFF.md` and the dated
  reviews into an archive folder.

## Order of work

1. **Core:** `DanceState`, `core/math.ts`, the fold, the physical check, and
   a `FigureCall` parser for the plain-text rows. Keep the render contract.
2. **The figures 2321 needs:** slice, pass through, allemande (with amount),
   short-wave form, balance, Rory, swing, circle. Compose Debra's Dance (2321)
   end to end and compare it side by side with the current build.
3. **Top ten figures by frequency** (swing through hey). Recompose the 196
   Ready dances in batches; each dance that fails names the missing figure or
   parameter, not a new module.
4. **The long tail** of figures, then delete the old paths.

Each step ends with the corpus test and a browser check of a few dances.

## Flourishes (future)

- **Purpose:** let dancers explore where an individual flourish (an extra
  twirl, a spin out of a swing, balance styling) fits in a dance and where it
  doesn't.
- **Shape:** an optional overlay per figure and per dancer, on top of the
  figure's plain base path, never changing where the figure starts or ends.
  It reads free hands, time and space windows from the frames. Off in the
  basic animation; only styling that is part of a figure's definition (the
  Rory twirl) is on by default.
- **"Fits here" report:** clearance, turn rate and free hands during the
  window. The physical check already reports styled motion (`styled` in its
  report: turn rate and clearance) instead of failing it; ordinary figures
  keep the normal limits.

## Rory O'More, for reference

From balance in a wave, slide right (or left) one place, passing the neighbor
you were holding by that hand face to face. Most dancers spin once quickly in
the travel direction: clockwise sliding right. It's fixed in the current code
in `rory-slide.ts` (bow backward, not forward) and the default spin.
