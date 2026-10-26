/**
 * One physical check over a whole compiled dance: clearance, speed, turn rate
 * and hand reach on every sampled frame, with limits from config.ts. Ported
 * from the TransitionBudget idea in src/hey-transition.ts and the canonical
 * reach in src/engine.ts; figures carry no budget code of their own.
 */
import type { Frame } from '../../types.ts';
import { LIMITS, type Limits } from './config.ts';
import { contactReach } from './contacts.ts';
import type { Styling } from './figure.ts';
import { distance, turn } from './math.ts';

export interface PhysicalReport {
  readonly minimumClearance: number;
  readonly maximumSpeed: number;
  readonly maximumYawRate: number;
  readonly maximumReach: number;
  readonly problems: readonly string[];
  /**
   * Styled motion (the Rory twirl, flourishes) is reported, not failed, for
   * turn rate: how fast it turns and how close dancers come while it runs;
   * a styled fast move (Styling.fast) for speed too.
   */
  readonly styled: readonly StyledReport[];
}

export interface StyledReport {
  readonly name: string;
  readonly repeat: number;
  readonly figureIndex: number;
  readonly maximumYawRate: number;
  readonly minimumClearance: number;
  readonly maximumSpeed: number;
}

export interface CheckOptions {
  readonly rounds?: number;
  readonly samplesPerBeat?: number;
  readonly limits?: Partial<Limits>;
}

/** Sample `rawSample` (pre-fade frames) across whole rounds. */
export function physicalCheck(
  dance: {
    totalBeats: number;
    rawSample(beat: number): Frame;
    figureStyling?(repeat: number, figureIndex: number): Styling | undefined;
    /** Raw z repeats every `period` meters (a set with no ends). */
    period?: number;
  },
  options: CheckOptions = {},
): PhysicalReport {
  const limits = { ...LIMITS, ...options.limits };
  const rounds = options.rounds ?? 2;
  const step = 1 / (options.samplesPerBeat ?? 20);
  const end = dance.totalBeats * rounds;
  const problems: string[] = [];
  const note = (beat: number, text: string) => {
    if (problems.length < 20) problems.push(`beat ${beat.toFixed(2)}: ${text}`);
  };
  let minimumClearance = Infinity;
  let maximumSpeed = 0;
  let maximumYawRate = 0;
  let maximumReach = 0;
  const styled = new Map<string, StyledReport>();
  let previous: Frame | undefined;
  const period = dance.period;
  const apart = (a: Frame['poses'][number], b: Frame['poses'][number]) => {
    if (!period) return distance(a.position, b.position);
    let dz = a.position.z - b.position.z;
    dz -= Math.round(dz / period) * period;
    return Math.hypot(a.position.x - b.position.x, dz);
  };
  for (let i = 0; i * step <= end - 1e-9; i++) {
    const beat = i * step;
    const frame = dance.rawSample(beat);
    const poses = frame.poses;
    for (let a = 0; a < poses.length; a++) {
      for (let b = a + 1; b < poses.length; b++) {
        const d = apart(poses[a], poses[b]);
        minimumClearance = Math.min(minimumClearance, d);
        if (d < limits.minimumClearance)
          note(beat, `dancers ${a} and ${b} are ${d.toFixed(2)} m apart`);
      }
    }
    const styling = dance.figureStyling?.(frame.repeat, frame.figureIndex);
    let frameClearance = Infinity;
    for (let a = 0; a < poses.length; a++) {
      for (let b = a + 1; b < poses.length; b++) {
        frameClearance = Math.min(frameClearance, apart(poses[a], poses[b]));
      }
    }
    if (previous && frame.figureIndex === previous.figureIndex) {
      const key = `${frame.repeat}:${frame.figureIndex}`;
      for (const p of poses) {
        const q = previous.poses[p.id];
        const speed = distance(p.position, q.position) / step;
        const yawRate = Math.abs(turn(p.yaw, q.yaw)) / step;
        maximumSpeed = Math.max(maximumSpeed, speed);
        if (speed > limits.maximumSpeed && !styling?.fast)
          note(beat, `dancer ${p.id} moves ${speed.toFixed(2)} m/beat`);
        if (styling) {
          const was = styled.get(key);
          styled.set(key, {
            name: styling.name,
            repeat: frame.repeat,
            figureIndex: frame.figureIndex,
            maximumYawRate: Math.max(was?.maximumYawRate ?? 0, yawRate),
            minimumClearance: Math.min(was?.minimumClearance ?? Infinity, frameClearance),
            maximumSpeed: Math.max(was?.maximumSpeed ?? 0, speed),
          });
          continue;
        }
        maximumYawRate = Math.max(maximumYawRate, yawRate);
        if (yawRate > limits.maximumYawRate)
          note(beat, `dancer ${p.id} turns ${yawRate.toFixed(2)} rad/beat`);
      }
    }
    const bodies = new Map(poses.map((p) => [p.id, p]));
    for (const c of frame.contacts) {
      if (c.strength < 0.5) continue;
      let near = bodies;
      if (period) {
        // Across the seam of a set with no ends, take each body nearest the hands.
        near = new Map(bodies);
        for (const id of [c.a, c.b]) {
          const p = bodies.get(id)!;
          const k = Math.round((c.point.z - p.position.z) / period);
          if (k) near.set(id, { ...p, position: { x: p.position.x, z: p.position.z + k * period } });
        }
      }
      const r = contactReach(c, near);
      maximumReach = Math.max(maximumReach, r);
      if (r > limits.armReach + limits.reachFade) {
        note(beat, `${c.a}-${c.b} ${c.handA}/${c.handB} hand reach ${r.toFixed(2)} m`);
      }
    }
    previous = frame;
  }
  return {
    minimumClearance,
    maximumSpeed,
    maximumYawRate,
    maximumReach,
    problems,
    styled: [...styled.values()],
  };
}
