/**
 * One physical check over a whole compiled dance: clearance, speed, turn rate
 * and hand reach on every sampled frame, with limits from config.ts. Ported
 * from the TransitionBudget idea in src/hey-transition.ts and the canonical
 * reach in src/engine.ts; figures carry no budget code of their own.
 */
import type { Frame } from '../../types.ts';
import { LIMITS } from './config.ts';
import { contactReach } from './contacts.ts';
import { distance, turn } from './math.ts';

export interface PhysicalReport {
  readonly minimumClearance: number;
  readonly maximumSpeed: number;
  readonly maximumYawRate: number;
  readonly maximumReach: number;
  readonly problems: readonly string[];
}

export interface CheckOptions {
  readonly rounds?: number;
  readonly samplesPerBeat?: number;
  readonly limits?: Partial<typeof LIMITS>;
}

/** Sample `rawSample` (pre-fade frames) across whole rounds. */
export function physicalCheck(
  dance: { totalBeats: number; rawSample(beat: number): Frame },
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
  let previous: Frame | undefined;
  for (let i = 0; i * step <= end - 1e-9; i++) {
    const beat = i * step;
    const frame = dance.rawSample(beat);
    const poses = frame.poses;
    for (let a = 0; a < poses.length; a++) {
      for (let b = a + 1; b < poses.length; b++) {
        const d = distance(poses[a].position, poses[b].position);
        minimumClearance = Math.min(minimumClearance, d);
        if (d < limits.minimumClearance) note(beat, `dancers ${a} and ${b} are ${d.toFixed(2)} m apart`);
      }
    }
    if (previous && frame.figureIndex === previous.figureIndex) {
      for (const p of poses) {
        const q = previous.poses[p.id];
        const speed = distance(p.position, q.position) / step;
        const yawRate = Math.abs(turn(p.yaw, q.yaw)) / step;
        maximumSpeed = Math.max(maximumSpeed, speed);
        maximumYawRate = Math.max(maximumYawRate, yawRate);
        if (speed > limits.maximumSpeed) note(beat, `dancer ${p.id} moves ${speed.toFixed(2)} m/beat`);
        if (yawRate > limits.maximumYawRate) note(beat, `dancer ${p.id} turns ${yawRate.toFixed(2)} rad/beat`);
      }
    }
    const bodies = new Map(poses.map((p) => [p.id, p]));
    for (const c of frame.contacts) {
      if (c.strength < 0.5) continue;
      const r = contactReach(c, bodies);
      maximumReach = Math.max(maximumReach, r);
      if (r > limits.armReach + limits.reachFade) {
        note(beat, `${c.a}-${c.b} ${c.handA}/${c.handB} hand reach ${r.toFixed(2)} m`);
      }
    }
    previous = frame;
  }
  return { minimumClearance, maximumSpeed, maximumYawRate, maximumReach, problems };
}
