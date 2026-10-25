/**
 * Dip and dive for six (or more): couples in one column up and down the
 * middle of the set pass each other, one couple arching and the other
 * ducking under; a couple at an end with no one to meet turns as a couple.
 *
 * Definition: partners stand side by side in the middle of their place,
 * facing up or down the set. Each change, every two couples facing each
 * other trade places: one couple makes an arch with inside hands (stepping
 * wide) and the other dives through under it; next time each does the
 * other. A couple at an end facing out turns as a couple to face back in.
 * After as many changes as the row says ("until everyone is home" is twice
 * the number of couples), couples stand in the column.
 * Source: Playford/ECD and contra manuals ("dip and dive"); ContraDB rows
 * "dip and dive, 6 changes - inside couple arch, turn as a couple on the
 * ends", "Dip and dive, 1's starting under arch formed by 2's", "dip and
 * dive six center couple arches" (triplets).
 * Readings: a couple facing down is one whose dancers face down the set;
 * where it is not clear (facing across), the couples named in `down` face
 * down and the rest up. The first couple to arch is named; when two couples
 * meet and neither has arched or dived yet, the couple facing up arches.
 */
import type { Vec2 } from '../../../types.ts';
import type { Figure, FigureContact } from '../../core/figure.ts';
import { onlyKeys, settle } from '../../core/figure.ts';
import { shoulder } from '../../core/contacts.ts';
import { add, mean, mix, progress, rotate, smooth, sub } from '../../core/math.ts';
import { body, withChanges } from '../../core/state.ts';
import { choreograph, type Path, placeOf, places } from './common.ts';

export interface DipAndDiveParams {
  /** Number of changes, or "home": until every couple is back in its place. */
  changes: number | 'home';
  /** The couple that arches first ("2s", or "middle"). */
  arch: string;
  /** Couples facing down at the start when their facing is not clear. */
  down?: string[];
}

/** Partners' distance from the middle line in the column, and in an arch. */
const COLUMN_HALF = 0.26;
const ARCH_HALF = 0.8;
const ARCH_HEIGHT = 1.6;

interface Step {
  /** Place index at the start and end of the change. */
  from: number;
  to: number;
  /** Facing before and after: +1 down, -1 up. */
  dir: number;
  then: number;
  /** What the couple does this change. */
  kind: 'arch' | 'dive' | 'turn' | 'stand';
}

export const dipAndDive: Figure<DipAndDiveParams> = (state, params, beats) => {
  onlyKeys('dip-and-dive', params, ['changes', 'arch', 'down']);
  const all = places(state);
  const n = all.length;
  // "Until everyone is home": twice round the column.
  const changes = params.changes === 'home' ? 2 * n : params.changes;
  if (!(Number.isInteger(changes) && changes >= 1)) throw new Error('dip-and-dive needs a number of changes.');
  if (n < 2) throw new Error('dip-and-dive needs two couples or more.');
  const z = all.map((c) => c.z);
  const down = new Set(params.down ?? []);
  // Each couple's facing from its dancers, or from `down`.
  const facing = all.map((c) => {
    const f = Math.cos(body(state, c.lark).yaw) + Math.cos(body(state, c.robin).yaw);
    if (Math.abs(f) > 1) return Math.sign(f);
    const named = [...down].some((l) => state.positions.get(l)?.includes(c.lark));
    return named ? 1 : -1;
  });
  const first =
    params.arch === 'middle' ? Math.floor((n - 1) / 2) : placeOf(state, all, params.arch, 'dip-and-dive');
  // Simulate the changes: where each couple is and what it does.
  const at = all.map((_, i) => i);
  const dir = [...facing];
  const role = new Map<number, 'arch' | 'dive'>([[first, 'arch']]);
  const steps: Step[][] = all.map(() => []);
  for (let k = 0; k < changes; k++) {
    const byPlace = new Map(at.map((p, c) => [p, c]));
    const done = new Set<number>();
    for (let p = 0; p + 1 < n; p++) {
      const a = byPlace.get(p)!;
      const b = byPlace.get(p + 1)!;
      if (dir[a] !== 1 || dir[b] !== -1) continue;
      let ra = role.get(a);
      let rb = role.get(b);
      if (!ra && !rb) rb = 'arch';
      if (!ra) ra = rb === 'arch' ? 'dive' : 'arch';
      if (!rb) rb = ra === 'arch' ? 'dive' : 'arch';
      if (ra === rb) rb = ra === 'arch' ? 'dive' : 'arch';
      steps[a].push({ from: p, to: p + 1, dir: 1, then: 1, kind: ra });
      steps[b].push({ from: p + 1, to: p, dir: -1, then: -1, kind: rb });
      role.set(a, ra === 'arch' ? 'dive' : 'arch');
      role.set(b, rb === 'arch' ? 'dive' : 'arch');
      done.add(a).add(b);
    }
    for (let c = 0; c < n; c++) {
      if (done.has(c)) continue;
      const p = at[c];
      const out = (p === 0 && dir[c] === -1) || (p === n - 1 && dir[c] === 1);
      steps[c].push({ from: p, to: p, dir: dir[c], then: out ? -dir[c] : dir[c], kind: out ? 'turn' : 'stand' });
    }
    for (let c = 0; c < n; c++) {
      const s = steps[c][k];
      at[c] = s.to;
      dir[c] = s.then;
    }
  }

  // Paths: into the column, then change by change.
  const paths = new Map<number, Path>();
  const slice = 1 / changes;
  const arches: { a: number; b: number; k: number }[] = [];
  all.forEach((c, ci) => {
    for (const id of [c.lark, c.robin]) {
      const isLark = id === c.lark;
      // Lark on the left of the robin, whichever way the couple faces.
      const sideAt = (d: number) => (isLark ? -1 : 1) * (d > 0 ? -1 : 1);
      const spot = (p: number, d: number, half: number): Vec2 => ({ x: sideAt(d) * half, z: z[p] });
      const yawOf = (d: number) => (d > 0 ? 0 : Math.PI);
      paths.set(id, {
        pos: (u) => {
          const k = Math.min(changes - 1, Math.floor(u / slice));
          const w = (u - k * slice) / slice;
          const s = steps[ci][k];
          if (s.kind === 'turn') {
            const mid = { x: 0, z: z[s.from] };
            return add(mid, rotate(sub(spot(s.from, s.dir, COLUMN_HALF), mid), Math.PI * progress(w)));
          }
          const wide = s.kind === 'arch' ? Math.sin(Math.PI * Math.min(1, w * 1.1)) : 0;
          const half = COLUMN_HALF + (ARCH_HALF - COLUMN_HALF) * Math.max(0, wide);
          const p = mix(spot(s.from, s.dir, half), spot(s.to, s.dir, half), progress(w));
          return { x: sideAt(s.dir) * half, z: p.z };
        },
        yaw: (u) => {
          const k = Math.min(changes - 1, Math.floor(u / slice));
          const w = (u - k * slice) / slice;
          const s = steps[ci][k];
          if (s.kind === 'turn') return yawOf(s.dir) - Math.PI * progress(w);
          return yawOf(s.dir);
        },
        unwrap: true,
      });
    }
    steps[ci].forEach((s, k) => {
      if (s.kind === 'arch') arches.push({ a: c.lark, b: c.robin, k });
    });
  });
  const bodies = choreograph(state, beats, paths, 0.5);
  const motion = (beat: number) => {
    const moved = bodies(beat);
    const u = beat / beats;
    const contacts: FigureContact[] = [];
    for (const { a, b, k } of arches) {
      const w = (u - k * slice) / slice;
      if (w <= 0 || w >= 1) continue;
      const pa = moved.find((m) => m.id === a)!;
      const pb = moved.find((m) => m.id === b)!;
      // Inside hands: the lark (on the robin's left) gives the right, the robin the left.
      const handA = 'right' as const;
      const handB = 'left' as const;
      const sa = shoulder(pa, handA);
      const sb = shoulder(pb, handB);
      contacts.push({
        a,
        handA,
        b,
        handB,
        kind: 'arch',
        // Hands up once the arch is wide enough to reach over.
        strength: smooth((Math.sin(Math.PI * Math.min(1, w * 1.1)) - 0.8) / 0.15),
        point: { x: (sa.x + sb.x) / 2, y: ARCH_HEIGHT, z: (sa.z + sb.z) / 2 },
      });
    }
    return { bodies: moved, contacts };
  };
  void mean;
  return { kind: 'hall-travel', motion, exit: withChanges(settle(state, motion, beats), { hands: [] }) };
};
