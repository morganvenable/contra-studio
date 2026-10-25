/**
 * Figures turned a quarter of the way around: a roll away across the set is
 * a roll away along a side line, turned. quarterTurned(figure) runs `figure`
 * on the state turned a quarter turn about the floor's origin and turns its
 * motion and exit back. Figures that measure from their group's middle (not
 * from the set's center line) and only use spacings that are the same along
 * and across a minor set (0.9 m half width, 1.8 m slot) give the same
 * figure, turned.
 */
import type { Figure, FigureContact, FigureFrame } from './figure.ts';
import { rotate } from './math.ts';
import type { Body, DanceState } from './state.ts';

/** rotate() by +a turns a body's facing by -a (core/math.ts). */
const turnBody = (b: Body, a: number): Body => ({
  position: rotate(b.position, a),
  yaw: b.yaw - a,
});

function turnState(state: DanceState, a: number): DanceState {
  const bodies = new Map([...state.bodies].map(([id, b]) => [id, turnBody(b, a)]));
  return Object.freeze({ ...state, bodies });
}

function turnContact(c: FigureContact, a: number): FigureContact {
  const turned = { ...c };
  if (c.point) {
    const p = rotate({ x: c.point.x, z: c.point.z }, a);
    turned.point = { ...c.point, x: p.x, z: p.z };
  }
  if (c.bodyPoint) {
    const p = rotate({ x: c.bodyPoint.x, z: c.bodyPoint.z }, a);
    turned.bodyPoint = { ...c.bodyPoint, x: p.x, z: p.z };
  }
  return turned;
}

function turnFrame(frame: FigureFrame, a: number): FigureFrame {
  return {
    bodies: frame.bodies.map((b) => ({ ...b, ...turnBody(b, a) })),
    contacts: frame.contacts.map((c) => turnContact(c, a)),
  };
}

export function quarterTurned<P>(figure: Figure<P>): Figure<P> {
  const a = Math.PI / 2;
  return (state, params, beats) => {
    const result = figure(turnState(state, a), params, beats);
    return {
      ...result,
      motion: (beat: number) => turnFrame(result.motion(beat), -a),
      exit: turnState(result.exit, -a),
    };
  };
}
