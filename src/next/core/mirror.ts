/**
 * Mirror images of figures: a left-hand chain is a right-hand chain seen in a
 * mirror, a petronella to the left is one to the right in a mirror. The
 * mirror runs along the set (z -> -z): left and right hands swap, clockwise
 * and counterclockwise swap, and every dancer keeps their side of the set.
 *
 * mirrored(figure) runs `figure` on the mirror image of the state and
 * mirrors its motion and exit back, so one tested figure gives both hands.
 */
import type { Hand } from '../../types.ts';
import type { Figure, FigureContact, FigureFrame } from './figure.ts';
import type { Body, DanceState, Hold } from './state.ts';

const flipHand = (h: Hand): Hand => (h === 'left' ? 'right' : 'left');
/** forward(yaw) = (sin, cos); the mirror image faces (sin, -cos). */
export const mirrorYaw = (yaw: number) => Math.PI - yaw;
const mirrorBody = (b: Body): Body => ({
  position: { x: b.position.x, z: -b.position.z },
  yaw: mirrorYaw(b.yaw),
});
const mirrorHold = (h: Hold): Hold => ({ ...h, handA: flipHand(h.handA), handB: flipHand(h.handB) });

export function mirrorState(state: DanceState): DanceState {
  const bodies = new Map([...state.bodies].map(([id, b]) => [id, mirrorBody(b)]));
  return Object.freeze({ ...state, bodies, hands: state.hands.map(mirrorHold) });
}

function mirrorContact(c: FigureContact): FigureContact {
  const flipped = { ...c, handA: flipHand(c.handA), handB: flipHand(c.handB) };
  if (c.point) flipped.point = { ...c.point, z: -c.point.z };
  if (c.bodyPoint) flipped.bodyPoint = { ...c.bodyPoint, z: -c.bodyPoint.z };
  return flipped;
}

function mirrorFrame(frame: FigureFrame): FigureFrame {
  return {
    bodies: frame.bodies.map((b) => ({
      ...b,
      position: { x: b.position.x, z: -b.position.z },
      yaw: mirrorYaw(b.yaw),
      ...(b.lean === undefined ? {} : { lean: b.lean }),
    })),
    contacts: frame.contacts.map(mirrorContact),
  };
}

/** The mirror image of a figure: same parameters, opposite hands and turns. */
export function mirrored<P>(figure: Figure<P>): Figure<P> {
  return (state, params, beats) => {
    const result = figure(mirrorState(state), params, beats);
    return {
      ...result,
      motion: (beat: number) => mirrorFrame(result.motion(beat)),
      exit: mirrorState(result.exit),
    };
  };
}
