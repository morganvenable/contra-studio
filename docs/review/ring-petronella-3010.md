# Opening ring and petronella compositions

Status: registered under `ringPetronellaStarts` after independent exact-source/archive/finite-period (4/4), expanded six-couple body-mesh and complete owner regression (6/6) clearance. The registered opening ring-to-swing route remains separate. A 7,683-frame comparison at two, three and six couples confirms that #780's body-driving poses and contacts are byte-identical to the immutable 0.14 baseline; only its end-cue wording is more precise.

## Exact retained source

Dugan Murphy's *Heartbreak Contra (A2 ring balance)*, ContraDB #3010, is retained in `test-data/contradb/3010.json`. Its nine rows contain two eight-count balance-and-petronella compounds, a four-count ring balance, twelve-count neighbor swing, eight-count lark left allemande 1½, eight-count partner swing, eight-count circle left three places, four-count ring balance and four-count pass-through with the source progression marker.

The two petronella interpretations remain explicit: four ring-balance counts plus four counts for one rightward station and a clockwise three-quarter body turn, without a clap. Both turns finish in the same reachable inward ring. The subsequent source ring balance prepares the immediate named neighbor swing within its original four counts; the swing is held and rotating from its first count.

The source-explicit final-pass event is retained separately from the source-omitted finite-end interpretation. That reviewed policy is saved in `Dance.endPolicy`: lark-left placement, wait for the first four counts, exchange at the same end over the next eight, and prepare the next ring during the final four-count pass. Its evidence has `reviewed-interpretation` basis. A source-explicit event cannot silently authorize the end policy.

## Physical topology and identities

The existing finite ring compiler supplies each actor's exact initial and next-ring or waiting destination. Active rings use a 1.10-unit square; waiting couples retain the standard row positions. The terminal pass reaches its explicit next positions before the neighbor epoch changes. Rebinding never translates a body.

With L1=0, R1=1, L2=2, R2=3, the independently derived northwest/northeast/southeast/southwest order is:

- 0: `[1,0,3,2]`
- 8: `[0,3,2,1]`
- 16 and 20: `[3,2,1,0]`
- 32: `[0,1,2,3]`
- 40 and 48: `[2,1,0,3]`
- 56 and 60: `[1,0,3,2]`
- After the terminal pass: `[2,3,0,1]`

## Verification and limits

`src/ring-petronella-start.test.ts` passes six checks: exact source/archive/policy, disabled capabilities and malformed declarations, every 2–12-couple finite period and named encounter, exact ring/swing reuse, complete actual-Avatar cadence and fixed limbs, and sampled opening-ring/petronella body clearance. The source owner separately supplies three actual-import/archive/adversarial tests in `src/contradb-ring-petronella.test.ts`.

At two and six couples, 1,600 samples through beats 16–32 reproduce reviewed #780 beats 0–16 under the explicit role-preserving relabeling 0↔2 and 1↔3 in each minor set. Root positions, wrapped headings, gait-driving fields, cyclic balance contacts and held swing contacts agree. This retains #780's documented supporting-arm/torso styling limit rather than presenting the reused frame as anatomically exact.

Complete 128-beat actual-Avatar sweeps at three and six couples have zero leg corrections in every figure, including waiting, and exact full-strength new ring/petronella/pass wrists. The six-couple opening 0–16 mesh sweep has positive other-person margins; the inherited free-hand/own-shirt skim is separately bounded at 8 mm. These are dense sampled procedural-body checks, not continuous swept-volume safety certification.

The siblings #1447 and #3328 remain blocked: the former requires a separately reviewed petronella-to-paired-balance handoff, and the latter needs a partner-swing-to-compact-ring transition. Their recognized source rows do not establish complete playback.

Independent opening-region mesh at 40 samples/count across six couples, with a 2.1 m root broadphase: legs +205.4 mm, unrelated arms +148.2 mm, other torso +130.3 mm, exact head/hair +187.8 mm. The inherited 6.2 mm own free-hand shirt skim remains disclosed. This is sampled procedural geometry, not a continuous collision certificate.
