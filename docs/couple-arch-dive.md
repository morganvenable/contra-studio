# Couple arch/dive motion probe

`src/couple-arch-dive.ts` is an isolated, unregistered primitive. Official
[program 488](https://contradb.com/programs/488) links Everybody Dance directly
to source 2299 and specifies four counts of twos arch / ones dive after a
four-count ring balance, with progression. The exact record has since been
[retained and inspected](source-2299.md), confirming that wording and timing.
This probe remains separate from the retained source snapshot and is not admitted.

The caller supplies a real compact inward-facing ring, all four actual hand
edges and current adjacent directed couple ranks. Rank directions identify
ones/twos; persistent couple numbers and appearance do not. The primitive keeps
the input source clock, actor IDs, relationships and epoch, advances four counts,
and returns physically reached opposite-row endpoints. Only a formation owner
may rebind at those endpoints. Current scope is a room-aligned ring translated
anywhere, with midpoint hand targets at height 1.25; rotation and arbitrary ring
sizes reject.

Model conventions: neighbor hands release in .8 counts; partners retain hands
while the twos widen and raise their joined hands and ones narrow and duck;
partner hands release in the final .8 counts. Widths, heights, release timing and
forward exit facing are implementation choices, not authored instructions.
The source does not resolve these details. No new figure kinds, importer choices,
registry routes or Ready entries are added. This contract does not cover cast-home
return, closed-frame opening swings, or finite-end waiting/reentry.

Fresh verification: four synthetic geometry/state tests pass. A 120 Hz sampled
root certificate measures minimum clearance 0.502369, maximum speed 0.620269 and
maximum yaw rate 0.785366 per count. A separate sampled basic shoulder-to-hand
reach check measures a maximum 0.623880 against a 0.64 limit, using actual named
hands and carried facing with the renderer?s ?0.235 shoulder offset and 1.355
shoulder height. Incoming ring hands that exceed this budget reject. Translation, arbitrary identity values,
immutable captured inputs, exact entry holds, reached exits, unchanged epoch and
rejected malformed boundaries are covered. This is not a continuous mathematical
clearance proof, an anatomical arm certificate, GPU review or whole-dance test.
The independent review also checks the exact shared-row crossing, continuous
entry contact targets and final contact release, immutable samples, and malformed
rank containers. At the crossing the diving roots are inside the arching roots;
that horizontal ordering does not prove clearance from arms or heads. The probe uses reduced arch widening and a 0.30 hand lift to fit this basic reach
budget; this is not proof that a rendered adult can duck under those hands.
Body lean, actual duck deformation, arm/head collision and the two-person
underpass presentation still need verification before integration. The synthetic
ring fixture now names inward-reaching hands correctly; its previous reversed
hand labels exceeded the reach limit at the entry itself.

Next integrate only after explicit removable source interpretation and contact
presentation support exist. Arch/dive involves two underpassing actors; existing
single-`underId` box-the-gnat presentation cannot simply be relabeled.
