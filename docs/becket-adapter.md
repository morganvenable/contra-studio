# Clockwise Becket and explicit hey adapter

## Scope

The second formation adapter composes figures from their parameters and incoming
poses. It does not dispatch by a dance title or Caller’s Box ID. Its source-backed
full-dance regression is **Butter**, by Gene Hubert, [Caller’s Box #10320](https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10320).

The supported entry contract is conventional clockwise Becket, single progression,
an explicit opening left shift, and a complete 64-beat sequence. Partner couples
begin together on the sidelines, with the lark on the left when facing inward.
Counterclockwise, arky, additional progression events, and unresolved calling notes
need their own adapters and are rejected.

## Source timing and interpretation

Butter contains the following source sequence:

- A1: shift left 2, circle left three quarters 6, neighbor swing 8
- A2: long lines 8, robins chain to partner 8
- B1: hey 16, with exactly `WR;NL;MR;PL;WR;NL;MR`
- B2: partner balance 4, partner swing 12

The seven pass events are preserved. The animation allocates 2 beats to an explicit
entrance, 12 to those passes, and 2 to an explicit exit. This allocation, compact
passing posture, and detailed root paths are modeling choices, not additional
instructions attributed to the choreographer. The hey returns to the actual
incoming side-couple slots, facing the persistent partner for the balance.

## Topology and finite ends

`becket.ts` owns partner-couple layout and finite-end state. The shift moves east-side
couples down the line and west-side couples up. New neighbor bindings take effect
at the shift’s ending beat. A waiting couple crosses at the same end during its
out round; nobody wraps from one end of the line to the other. On the next shift,
that couple re-enters the opposite stream. An odd-sized set explicitly starts with
one extra west-side end couple ready to enter.

`chain.ts` consumes a reciprocal partner/neighbor map and its topology epoch.
Receivers are fixed by that map, not inferred from proximity during motion. Stale
epochs, contradictory relationships, wrong arrival sides, and unsupported courtesy
role order reject before sampling.

`becket-compiler.ts` composes actual incoming poses through every figure. A complete
round must finish at the real next formation, including facing, or compilation
fails. There is no synthetic reset or added progression segment.

## APIs and deterministic playback

- `compileChoreography(dance, couples)` dispatches by the explicit formation.
- `compileBecketDance(dance, couples)` returns the standard `CompiledDance` sampler
  plus `topology(beat)`, exposing neighbor identities, epoch, waiting couples, and
  shift/dance phase.
- `compileBecketSection(state, spec)` also exposes named hey pass gates and the
  next finite-end state for inspection and independent tests.
- Sampling is pure with respect to beat order. Playback, backwards seeks, and
  repeated scrubbing use the same poses. The cache is bounded by the complete
  `2 × couple-count` finite circulation, so very large finite seeks do not allocate
  unbounded history.

The runtime prevalidates a full finite circulation. It supports 2–12 couples and
keeps original dancer IDs throughout. The reviewed figure spacing is 1.8 scene
units; arbitrary rescaling is not silently applied to articulated contact geometry.

## Rejection and review gates

Every figure must have finite positive timing and the required hand, amount,
participants, and entry/exit semantics. A normalized per-figure speed check prevents
a very short instruction from escaping a global beat sampling interval. The shift
has its own reviewed peak-speed limit; other composed root paths are limited to
1.8 scene units per beat. These limits catch invalid inputs but are not a guarantee
of biomechanical comfort.

Partial heys, future-neighbor tokens, unsupported shoulder changes, and arbitrary
hey exits remain blocked. The low-level hey solver can represent additional test
fixtures without claiming that those fixtures are enabled as complete dances.

The structured interpretation editor remains restricted to its reviewed improper
vocabulary. Becket source JSON and its original metadata are retained for lossless
source review and export.

## Tests and remaining limitations

Run `npm test` for the packaged source, parser, topology, trajectory, receiver,
continuity, timing, and source-equivalence regressions. Independent tests also
exercise every set size from 2 through 12, both ends, full circulation, cache wrap,
huge seeks, exact source shoulders, and simultaneous hand occupancy.

Articulated-body review separately checks actual mesh geometry, contact reach,
fixed limb lengths, and foot motion. Numeric and CPU-projected mesh review are
distinct from an interactive WebGL browser test. The movement remains procedural,
with schematic gait and styling; it is not a motion-capture or teaching-safety
certification.
