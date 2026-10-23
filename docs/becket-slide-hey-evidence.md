# Slide progression with ordinary heys — 2026-10-23

Retained source 3470, Batter by Cary Ravitz, uses 2 slide + 6 circle + 8 neighbor swing + 8 long lines + 8 half hey + 8 chain + 8 half hey + 16 partner balance/swing. Its quoted design note and hook remain in the source record. The author's [dance collection](https://www.dance.ravitz.us/dances.pdf), printed page 12, independently describes the slide/circle version and the preferred circle/pass version. These are distinct retained versions; source 3471 remains unchanged.

The ordinary-hey lowering now accepts the existing counted slide and released-circle operations independently of the circle/pass progression. The slide variant explicitly requests bounded released-hey exit facing on the operation. This is an opt-in motion parameter, never selected by dance identity or a whole-sequence signature.

The new facing helper begins at the last actual passing gate, count 6.5 of the half hey, preserves incoming yaw and angular velocity, and reaches the same outgoing direction with zero angular velocity at count 8. A cubic Hermite curve follows the original signed turn. Its quadratic angular derivative is checked at endpoints and every interior extremum against the existing 3.2 radians/count limit. No roots, gates, source counts or recipients change. Defaults preserve previously published motion.

Focused evidence: 3/4/6 couples over complete finite periods, exact counts, progression, actual partners, two hands already held at balance entry, source/choice removal rejection, archive restore, renamed identity, unchanged root samples and pass gates, C1 facing join, invalid options and existing neutral/ordinary hey regressions. Whole source minimum clearance 0.5517879m, maximum sampled speed 1.1969279m/count, maximum yaw rate 3.1685375rad/count. TypeScript passes.

At the new partner balance entry, native wrist residual is 1.11e-16m and fixed limb error 2.22e-16m. The inherited backing-balance residual is 4.145mm, identical to published source2329; this is not a full anatomy certification. Browser verification and public release remain lead-owned gates.
