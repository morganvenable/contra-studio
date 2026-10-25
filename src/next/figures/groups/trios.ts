/**
 * Lines of three round a big ring (circle of threes, three-person mixer):
 * who is where in each line, shared by the trio figures. Not a figure.
 */
import type { Vec2 } from '../../../types.ts';
import { heading, length, scale, sub } from '../../core/math.ts';
import { body, type DanceState } from '../../core/state.ts';
import { setCenter } from './common.ts';

export interface Trio {
  /** Inside end (on the center's left facing the line of dance), center, outside end. */
  readonly inside: number;
  readonly center: number;
  readonly outside: number;
  /** Where the center stands. */
  readonly spot: Vec2;
  /** Unit vector out from the middle of the ring. */
  readonly out: Vec2;
  /** Yaw facing counterclockwise round the ring (the line of dance). */
  readonly ahead: number;
}

/** The lines of three of the set and the middle of the ring. */
export function triosOf(state: DanceState, move: string): { ring: Vec2; trios: Trio[] } {
  const ring = setCenter(state);
  const radius = (id: number) => length(sub(body(state, id).position, ring));
  const trios = state.groups.map((g) => {
    if (g.length !== 3) throw new Error(`${move} is danced in lines of three.`);
    const [inside, center, outside] = [...g].sort((a, b) => radius(a) - radius(b));
    const spot = body(state, center).position;
    const rel = sub(spot, ring);
    const out = scale(rel, 1 / length(rel));
    // Counterclockwise seen from above: the outward vector turned a quarter.
    const ahead = heading({ x: 0, z: 0 }, { x: out.z, z: -out.x });
    return { inside, center, outside, spot, out, ahead };
  });
  return { ring, trios };
}
