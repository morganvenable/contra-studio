# Opening-ring to partner-twirl composition

Status: staged behind `ringTwirlSequences`, not yet in the default Ready library.
The reviewed whole-dance path preserves actual source intervals and identities;
footwork and release routes are schematic. This is not a limb-mesh or teaching
safety certificate.

## Retained source and boundaries

[Heartbeat Contra, #159](https://contradb.com/dances/159), Don Flaherty, improper.
Fixture `test-data/contradb/159.json` has immutable snapshot identity
`contradb:159:cee6ac6f09418126`. No title or source-ID exception selects the route.
The bounded structural family is:

1. Balance and petronella, 8
2. Balance and petronella, 8
3. Balance the ring, 4
4. Neighbors swing, 12
5. Robins gyre one and a half, 8
6. Partners swing, 8
7. Circle left three places, 8
8. Partners balance, 4
9. Partners California twirl, 4, then the source progression mark

The two 8-count opening rows each retain their four-count balance and four-count
petronella. The closing balance names persistent partners and is not substituted
with a four-hand ring balance. The single neighbor event occurs only after the
completed 64-count source phrase.

## Explicit source-omitted choices

The ordinary row-level petronella, gyre shoulder, and California-twirl choices
remain separate. In particular the source omits the gyre shoulder, so its right
shoulder is reviewed rather than presented as an authored fact.

The additional `ringTwirlPolicy` independently retains:

- `gyrePhaseBeats: [7, 1]`: the complete right robin one-and-a-half orbit (3π radians) is
  complete in seven counts, with one count to prepare the named partner swing.
- `balance: partner-facing-two-hand`, `balancePhaseBeats: [3, 1]`: a complete
  inward/outward partner balance pulse occupies three counts, then one count
  releases that hold and prepares the side-by-side lark-right/robin-left hold.
- `twirlPhaseBeats: [3, 1]`, `return: next-inward-ring`: the complete partner half
  twirl occupies three counts, with one count to prepare the actual next ring
  or same-end wait. The twirl itself exchanges the named sides and reverses
  facing before this spacing transition.

The final-count active row opening is 0.35 m outward with half-width 0.55 m. This
is neither another station move nor an early neighbor change. Outgoing waiters
instead widen to half-width 0.90 m without changing their end row. The separate
finite-end policy says wait four counts, exchange at the same end over eight,
then prepare re-entry during the final four source counts. These conventions
are reviewed interpretation evidence, distinct from the authored progression
mark. All evidence URLs and full snapshot identities must match the retained
source, not merely each other.

## Independent station oracle

Using `[NW, NE, SE, SW]` around an active minor set:

- Opening: `[1, 0, 3, 2]`
- Both petronellas complete, count 16: `[3, 2, 1, 0]`
- Named neighbor swing complete, count 32: `[0, 1, 2, 3]`
- Full robin gyre complete, count 39: `[0, 3, 2, 1]`
- Named partner swing complete, count 48: `[0, 3, 2, 1]`
- Circle three quarters complete, count 56: `[3, 2, 1, 0]`
- Partner half-twirl complete, count 63: `[2, 3, 0, 1]`

The finite compiler computes exact next per-identity ring/end destinations before
compiling the final twirl. A topology rebind checks those physical endpoints; it
does not move any root. Period reuse also validates the actual root/facing state.

## Evidence and boundaries

`ring-twirl-source.test.ts` checks original source counts/relations, those named
corners, independently unwrapped full 3π gyre winding, signed opposite π twirl
turns, terminal partner hand identities, event timing, explicit policy and
capability rejection, immutable input ownership, and every 2–12-couple full
finite period. Full-period checks cover all couple encounters, figure and cycle
joins, stationary same-end waiting, no competing positive hand targets, and
sampled root separation of at least 0.45 m (observed minimum 0.512597 m
for every tested size). The section compiler additionally
checks all figures at 32 samples per count against its existing root-clearance
and 1.8 m/count walking-speed budgets. These are sampled checks.

The source archive roundtrip, Ready bundle generation, and actual offline main
Open→Play checks remain required before promotion. Existing pass-based ring
sources use their unchanged compiler and are not selected by this policy.

Local staged verification: 29/29 tests passed across the new source tests and
existing ring/pair, opening-ring and neighbor-promenade regressions; TypeScript
typecheck passed. The new source alone passes five tests. Runtime geometry is
frozen pending the source archive/Ready promotion checks above.
