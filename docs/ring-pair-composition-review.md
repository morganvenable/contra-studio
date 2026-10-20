# Ring and paired-composition expansion

This review extends existing motion primitives through bounded, source-counted
handoffs. It prioritizes complete dance coverage. It does not establish detailed
footwork, anatomically correct limb contact, or biomechanical teaching safety.

The `ringPairHandoffs` and `allemandePromenadeHandoffs` capabilities are locally
registered in the default runtime. All four actual sources pass the default
importer; explicit capability-off controls continue to block their new routes.

## Actual retained sources

- [Heartbreak Contra, #1447](https://contradb.com/dances/1447): two opening
  petronellas now release into the named neighbor balance and swing. Every
  petronella retains the complete right station and three-quarter right spin.
- [Heartbreak Contra (variation), #3328](https://contradb.com/dances/3328): the
  partner swing now returns to a compact inward ring for the subsequent
  balance/petronella. The original four cyclic actor corners are unchanged.
- [Jump Back Barley, #1547](https://contradb.com/dances/1547): the same swing-to-ring
  bridge composes with two terminal petronellas. The six-count circle and
  ten-count neighbor swing are retained exactly, along with the final
  three-plus-one terminal-petronella interpretation.
- [Another First Time, #1744](https://contradb.com/dances/1744): the neighbor
  right one-and-a-half allemande prepares the same named neighbor promenade,
  retaining complete signed turn winding, lark-left placement and exact eight
  counts for each figure.

All four remain 64-count dances. Original source fragments, source row durations,
progression glyphs and saved interpretation data are preserved. No title or
source-ID exception selects an implementation. The next typed figure determines
which bounded handoff can be compiled; unknown or conflicting qualifiers fail.

## Reusable boundaries

`ring-pair-handoff.ts` supplies two bridges:

1. A complete petronella releases ring contacts during its last half-count before
   a four-count named pair balance acquires. The station and root path remain
   unchanged. The subsequent balance owns its complete original four counts.
2. A swing opens into the same four cyclic compact corners during its final two
   source counts. Swing hands release before four-hand ring acquisition; a hand
   never has simultaneous targets on different people. The following balance
   retains its complete four counts.

`allemande-promenade-handoff.ts` prepares the same named pair during the final
source count of an explicit one-and-a-half allemande. The full signed winding
remains intact. Its final position is a 0.68-unit side-by-side stance facing
across, validated by the existing promenade contract. No new hands are acquired
until the following promenade. Unsupported entry, phase, hand, relationship and
other qualifiers are rejected.

These internal releases and gathers are schematic animation conventions within
existing source intervals. They do not claim a uniquely authored footpath.

## Evidence

- `ring-pair-handoff.test.ts`: exact source/archive preservation; separate
  retained end policies; all 2–12-couple full finite periods; physical cycle
  closure; identity and facing continuity at every figure/cycle boundary;
  sampled global center clearance at least 0.45; hand ownership; gate-off and
  conflicting-input rejection.
- `allemande-promenade-handoff.test.ts`: complete signed 3π winding with no
  reversal; named same-person lark-left entry; source/archive preservation;
  all 2–12-couple full finite periods; continuity and sampled global clearance;
  capability, modifier and immutable-input checks.
- A separate dense contact probe covers six cycles of each ring/pair source at
  20 samples per count with no hand assigned to different people simultaneously.
- The actual #1547 full-period root probe observed minimum center separation
  0.5115 across 2, 3, 6 and 12 couples. Boundary discrepancies were below 6e-8.

The ring-start compiler additionally checks every source section at 32 samples
per count against its existing global root-clearance and walking-speed budgets.
These are sampled checks, not continuous collision certificates. Mesh polishing
and existing inherited limb-contact artifacts were deliberately left outside
this coverage expansion.

## Remaining distinct case

[Heartbeat Contra, #159](https://contradb.com/dances/159) remains blocked. It opens
in a ring but ends with a paired partner balance and California twirl, requiring
an explicit finite ring-return composition and paired-balance-to-twirl boundary.
Neither a missing end policy nor that different handoff is silently inferred.
