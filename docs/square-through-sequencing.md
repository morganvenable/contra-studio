# State-carrying square-through steps

The shared sequencer owns identity, source clock, raw held contacts, and the
relationship epoch at each measured boundary. The new square adapters do not
recognize a title, source ID, opening clause, or full dance signature.

## Bounded motion contract

- Each step is one explicitly reviewed eight-count balanced two-hand unit:
  partner right-hand balance4, partner right pull-by2, current-neighbor left
  pull-by2. The 4+2+2 allocation is an interpretation, not literal source timing.
- Incoming actual roots have persistent partners across their rows, current
  neighbors on their sidelines, conventional role order and partner-facing yaw.
  Standard half-width is0.9. A declared outgoing partner-right-hand offer from
  the preceding chain supplies compact half-width0.55 and two actual held right
  contacts; those contacts are consumed without an instantaneous hand change.
- Each named passage retains the same epoch. Exact right/left gates are at
  counts5/7. Every actor reaches its diagonally opposite corner.
- A continuing step declares `partners-facing-across`. Its turn toward the
  partner begins after count7.25, after the old-neighbor left gate. It can feed
  any successor that the shared sequencer proves accepts the actual endpoint;
  there is no successor-kind whitelist.
- A terminal step declares `progressed-neighbors`, keeps the existing onward
  facing, and leaves progression to the source-marked finite boundary. No
  relation is rebound inside the passage. The stance layer owns separately
  checked late preparation for the next opening.
- Unknown four-hand/extra-turn/hand-order variants remain unsupported. Source146
  supplies two units only because its retained sixteen-count clause explicitly
  says to repeat the named sequence, with the split shown as a removable review
  choice. Only its second child owns the source progression event.

`compileSquareThroughStep` consumes `SequenceBoundary` and returns measured
`entryState`/`exitState`. `compileChainSquareHandoff` reuses the existing chain,
checks its independently selected receiving relation, and optionally gathers a
right hand after count7.2, once courtesy contact has released. A square primitive
has two default-preserving options, `entryHalfWidth` and `exitFacing`. Omitting
them retains the original3496 terminal trajectory.

## Proof scope

- `square-through.test.ts`: original primitive, ownership and boundary proof.
- `square-through-step.test.ts`: standard/handed chain input, square repetition,
  partner balance, an intervening endpoint-preserving long-lines figure,
  incompatible roots/epoch/hands and unknown amount rejection.
- `square-through-sequence.test.ts`: actual896,146,2364 source intervals and
  ordered gates, representative three/four-couple periods, changed-boundary
  continuity and end effects; cheap production topology checks for2–12couples;
  original3496 numerical parity samples.

The measured local chain-plus-square envelope has minimum root separation
0.511492, maximum speed1.400839 and yaw rate4.677361. The square itself retains
minimum separation0.661281, maximum speed1.400892 and full-held reach0.623177;
partner-facing exit raises its yaw maximum only to3.926991. These are root and
contact-model checks, not anatomical or teaching-safety claims.
