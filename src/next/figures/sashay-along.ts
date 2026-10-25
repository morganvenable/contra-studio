/**
 * Every couple sashays along the set ("sashay down", "sashay up", "sashay
 * down and back" with no couple named, as in one-couple Zoom contras).
 *
 * Definition: partners standing across from each other step in toward the
 * middle, take both hands and slide sideways along the set together (down
 * is toward the bottom), then step back out to their side lines facing
 * across; "down and back" slides down and returns. Every couple does it at
 * once, a place apart, so the set moves together.
 * Source: Caller's Box glossary, "Sashay"; ContraDB "Zoom Contra #9"
 * ("sashay down", "sashay up"), "Zoom Contra #3" ("sashay down and back").
 * Reading: each sashay goes one place (1.8 m); partners close to 0.7 m apart.
 */
import type { Figure, FigureContact } from '../core/figure.ts';
import { oneOf, onlyKeys, settle } from '../core/figure.ts';
import { SET } from '../core/config.ts';
import { bodyMap, joined, withinReach } from '../core/contacts.ts';
import { progress, smooth, turn } from '../core/math.ts';
import { body, withChanges } from '../core/state.ts';

export interface SashayAlongParams {
  direction: 'down' | 'up' | 'down-and-back';
}

/** Each partner's distance from the middle line while sliding. */
const HALF = 0.35;
/** Share of the figure stepping in, and stepping back out. */
const EDGE = 0.2;

export const sashayAlong: Figure<SashayAlongParams> = (state, params, beats) => {
  onlyKeys('sashay along', params, ['direction']);
  const way = oneOf('sashay along', 'direction', params.direction, ['down', 'up', 'down-and-back'] as const);
  if (state.hands.length) throw new Error('A sashay starts with free hands.');
  // A couple still crossing over at an end stays out of it.
  const crossing = new Set(state.waiting.filter((w) => w.crossing).map((w) => w.couple));
  const ids = state.dancers.filter((d) => !crossing.has(d.couple)).map((d) => d.id);
  const movers = ids.map((id) => {
    const b = body(state, id);
    const side = Math.sign(b.position.x);
    if (side === 0 || Math.abs(Math.abs(b.position.x) - SET.halfWidth) > 0.05)
      throw new Error(`Dancer ${id} must stand on a side line to sashay.`);
    const partner = state.relations.get('partner')?.get(id);
    return { id, b, side, partner };
  });
  const along = (t: number) =>
    way === 'down'
      ? SET.slot * progress(t)
      : way === 'up'
        ? -SET.slot * progress(t)
        : SET.slot * (t < 0.5 ? progress(t * 2) : 1 - progress(t * 2 - 1));
  const motion = (beat: number) => {
    const t = beat / beats;
    const inward = Math.min(smooth(t / EDGE), smooth((1 - t) / EDGE));
    const bodies = movers.map((m) => ({
      id: m.id,
      position: {
        x: m.side * (SET.halfWidth - (SET.halfWidth - HALF) * inward),
        z: m.b.position.z + along(t),
      },
      yaw: m.b.yaw + turn(m.side > 0 ? -Math.PI / 2 : Math.PI / 2, m.b.yaw) * smooth(beat / 1),
    }));
    const map = bodyMap(bodies);
    const contacts: FigureContact[] = movers
      .filter((m) => m.partner !== undefined && m.id < m.partner && m.side > 0)
      .flatMap((m) =>
        (['left', 'right'] as const).map((hand) =>
          withinReach(
            joined({ a: m.id, handA: hand, b: m.partner!, handB: hand === 'left' ? 'right' : 'left' }, inward),
            map,
          ),
        ),
      );
    return { bodies, contacts };
  };
  return {
    kind: 'hall-travel',
    motion,
    exit: withChanges(settle(state, motion, beats), { hands: [] }),
  };
};
