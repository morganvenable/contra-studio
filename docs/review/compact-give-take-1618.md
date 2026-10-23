# Compact four-count give-and-take: source 1618

22 October 2026. Paloma's Becket, Linda Leslie:
https://contradb.com/dances/1618. Exact acquired snapshot and saved explicit
interpretation are retained; original choreography provenance is unchanged.

The source counts remain 8 down/turn + 8 up/bend, 6 circle + 2 right-shoulder
neighbor pass, 8 neighbor do-si-do, 16 neighbor balance/swing, 4 lark give/take
partners, and 12 partner swing. The pass rebinds only at count 24. The take
runs from 48 to 52 and does not borrow swing counts.

Unlike source 840, this source has no starting-position preamble. Its distinct
`compact-give-take-hall-v1` choice requires
`initialLine: reviewed-partner-line`; removing that acknowledgment holds it.
The choice explicitly proposes a held partner line facing down and the final
swing's cyclic physical return. `hallLineDescription(choice)` explains the
correct source-specific convention in the UI; the literal-preamble description
must not be displayed for this choice.

The new `compact-give-take-step.ts` consumes the actual released four-person
boundary, reciprocal named receiver map, and taking role. It requires the
measured 0.64 m half-width/half-depth stations and an immediate same-person
swing. Its separate four-count phases are 1.5 approach, 1 take, and 1.5 turn:

- Approach maintains the existing side couple, reaches a 0.60 m received-pair
  gap, and changes hand ownership only after the prior hands release.
- The taking role brings that exact received person to the taker's original
  side before the connected pair turns into a 0.62 m prepared swing.
- Both taking roles have independent local tests. The retained whole source
  specifically takes partners with the larks.

The eight-count give/take implementation is unchanged. A separate
`compactGiveTakes` capability gates the new operation. The line-swing producer
now accepts twelve counts with its counted release still confined to the last
two; the old eight-count branch is preserved exactly.

Current checks: eight new tests and TypeScript pass, independently rerun by the
critic. Full three-/four-couple finite tests use an independent slot oracle,
verify the count-24 event, actual side-couple/partner identities, finite waiters,
all hand/position/yaw seams, initial and cyclic lines, and complete closure.
Whole-source minimum root gap is 0.60 m, maximum speed 1.095318 m/count,
maximum yaw 2.720373 rad/count and positive hand reach below 0.64 m.
The local four-count adapter has minimum gap 0.60 m and speed 1.050750 m/count.
It rejects eight-count timing, stale epochs, wrong geometry, unconsumed flags,
wrong swing receivers and detached incoming holds.

840's archive is unchanged. A baseline generated from reviewed commit
`ea4e95f` records its normalized archive SHA and complete raw-frame hashes at
1/16-count intervals across three- and four-couple finite periods. Both hashes
match the new implementation exactly, including contacts and styling cues.

No Ready generation or UI edit is included. Lead integration owns the dynamic
hall-line selector, browser/body checks, admission and release. GPU/body and
audio checks are not claimed. Other four-count give/take sources need actual
entry/exit and whole-source evidence before admission; they are not automatically
covered by this measured compact contract.
