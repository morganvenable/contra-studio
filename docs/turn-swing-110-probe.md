# 110: measured turn-to-swing hold

The retained snapshot `contradb:110:9c3093c28056616f` starts with six counts of
robins allemande right three quarters, then ten counts of neighbor swing.
`scripts/inspect-source.mjs 110` keeps the source unresolved; its later role-
reversed rollaway and other reviewed choices are separate blockers.

`src/turn-swing-110-probe.test.ts` reproduces the fail-closed motion rejection.
The production guard remains unchanged. With ordinary initial corners, the
literal full-radius turn places robin 1 at (-.9,+.9), exactly on lark 2, and
robin 3 at (+.9,-.9), exactly on lark 0. The terminal normalization therefore has
a zero-length vector. This is not a floating-point threshold problem.

The producer already contracts an allemande into radius .55 when `circleExit`
is selected (`engine.ts`, allemande branch). Its actual terminal robin roots
would be (-.388909,+.388909) and (+.388909,-.388909), with neighbor distance
.722792. The preparation code instead recomputes literal uncontracted roots
before deriving its swing frame. Thus the collapsed frame is introduced by the
preparation's endpoint reconstruction, not by that held-radius endpoint.

Using actual endpoints alone is insufficient: their diagonal .62 swing frame
fails the existing consumer's vertical-sideline guard. The probe investigates
one-count physical preparation to vertical frames centered at x=+/- .9 and
z=+/- .644454. Resulting roots have z=+/- .334454 and +/- .954454. At 120 Hz the
root-only candidate has clearance .603858 and speed 1.166394 per count; it joins
the existing neighbor swing at exact roots. It does not move any actor at a
boundary or alter the six-count duration.

This is evidence of a feasible root corridor, not a certified figure fix.
Still required: preserve authored three-quarter hand-turn winding before release,
derive continuous facing and actual contact transitions, certify adjacent-group
clearance, and test repeat/finite ends. Blending toward a frame in the last count
may change the hand-turn's effective angular travel; the probe does not assert
that its path meets this semantic requirement. A shared bounded producer adapter
should consume actual state and explicitly stage the release before a named
consumer frame. Do not broadly replace all legacy endpoint reconstruction.

Fresh checks: three tests across this reproduction and
`turn-swing-degenerate.test.ts` passed. Existing valid control hashes are
unchanged. No production motion, source admission or Ready archive changed.
