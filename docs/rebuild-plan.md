# Rebuild plan: a small figure library

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

## Rory O'More, for reference

From balance in a wave, slide right (or left) one place, passing the neighbor
you were holding by that hand face to face. Most dancers spin once quickly in
the travel direction: clockwise sliding right. It's fixed in the current code
in `rory-slide.ts` (bow backward, not forward) and the default spin.
