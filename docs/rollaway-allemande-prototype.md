# Carried left-allemande ingress prototype

`src/rollaway-allemande-prototype.ts` is an unregistered local adapter for an
eight-count robin left allemande 1.5 followed by a four-count partner balance.
It accepts actual released standard corners with partners across and the robins
diagonally opposite. These are the measured post-rollaway roots in the source
110 investigation; no source identity or previous-figure signature is inspected.

Every root sample is identical to the existing eight-count primitive, including
the complete -1.5-turn winding and final partner positions. Incoming facing is
carried, acquired during the first count for the turning robins, and retained for
the stationary larks. The final count turns actual bodies toward their reached
partner balance positions. The next balance receives exact roots/facing and
released raw contacts. Source clock, identities, relationship maps and epoch
remain carried without rebinding.

The modeled left-hand target is the pair midpoint at height 1.25. Positive
strength requires both nominal shoulders to be within .64, using actual yaw,
.235 shoulder offsets and height 1.355. A separate half-count acquisition from
1.2 to 1.7 and release from 6.3 to 6.8 keeps the reach gate from creating a short,
fast grip ramp. These timing and target-height choices are model conventions,
not source-authored subdivisions. Root movement continues through all eight
counts. The interval is not claimed to be 1.5 turns continuously hand-held: the
model allocates approach and departure within the figure, and the full root
winding is preserved independently of this modeled contact window. The source
specifies 1.5 turns in eight counts; it does not establish that this partial
hand-hold interpretation is appropriate. That remains a review requirement.

Fresh 120 Hz audit: minimum root clearance .722792; maximum speed 1.100568;
maximum yaw rate 2.355976; maximum nominal shoulder target distance .629946.
Positive contact is sampled from 1.208333 to 6.791667, strength >=.999 from
1.691667 to 6.308333, and peak strength-rate is 2.998889 per count. A prior
reach-only gate had a 13.196/count ramp; the explicit half-count windows address
that measured issue without changing roots or counts.

Three tests pass: unchanged root samples/full winding/reachable raw hands and
next-balance entry; translated and permuted opaque actors with captured inputs;
and unsupported metadata, held/stale state, wrong geometry and invalid samples.
Type-check passes. No source admission, registry or legacy engine changed.

`rollaway-allemande-body.test.ts` separately exercises actual `Avatar` body
transforms, gait lean/bounce, contact anchoring and the existing balance-stance
wrapper. Its synthetic section uses the measured post-rollaway state and existing
engine pose styling; it is not a whole-dance registration. At 80 Hz the raw
prototype's maximum actual shoulder-to-target reach is .612221; full-strength
wrists meet their targets within 6e-16. At 10 Hz, sampled unassociated arm-mesh
clearance is .134147 and the other-dancer head ellipsoid-envelope clearance is
.321444. The head measure is a proxy envelope, not an exact head-mesh certificate.

The balance-stance wrapper adds a partner approach target at count 7.7625 with
strength .047495. Actor 3's actual shoulder-to-target distance is .662813, beyond
the arm target clamp of .645. Its actual shoulder-to-wrist distance is only
.364744: the arm is not stretched. The wrist remains .670640 from that target;
the two partner wrists remain 1.089847 apart. Full-strength wrist residuals remain
near numerical zero with stance enabled as well.

This is a semantic integration hold, not evidence of a renderer defect. In
`Avatar.updateArms`, contact strength interpolates the free-arm target toward the
declared contact target; a small positive strength is a weighted approach, not
proof of a closed grip. Even the raw prototype's earliest positive target has
separated actual wrists. The stricter prototype guarantee that every positive
raw target is reachable therefore does not transfer unchanged through existing
stance preparation, whose approach targets use a different envelope. Decide
whether an integrated contract distinguishes approaches from established grips
before making universal positive-contact reach claims. The body test records
this distinction explicitly rather than altering global stance behavior.

The articulated harness passes its one diagnostic regression, including fixed
limb lengths and exact full-strength wrist constraints. It does not certify hand
velocity, continuous mesh clearance, exact head geometry, all appearances,
GPU/audio, adjacent groups or complete finite periods.
