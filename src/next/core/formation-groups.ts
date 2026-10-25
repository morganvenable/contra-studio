/**
 * Sets not made of couples, as data (ContraDB formations "5 dancers",
 * "line of 5 people", "circle of threes", "three-person mixer",
 * "9-person mixer", "Tempest"). Each builds its own dancers, its starting
 * state, its progression (a rebind, never moving a body) and the corpus
 * check's model (models.ts). Figures never ask which formation they are in.
 *
 * - Ring of five: five dancers in a ring facing in, places 1.53 m apart
 *   (hands joined round a small ring). Dancer 1 is "first" (the active);
 *   after each time through, the dancer on the first's left becomes first.
 * - Line of five: five dancers in a line across the hall, all facing up,
 *   numbered 1 (stage left: the +x end, on the dancers' right) to 5. After
 *   each time through they are renumbered by place (1 has gone to the far
 *   end, everyone else is one number less).
 * - Circle of threes (and the three-person mixer): lines of three (a
 *   center between two ends) all round a big ring, all facing round it
 *   counterclockwise (the line of dance); the inside end is on each center's
 *   left. Trios are found again by where everyone stands.
 * - 9-person mixer: four couples as a Becket set of two couples a side, and
 *   one lonesome dancer (a fifth lark) at the top facing down. After each
 *   time through, partners are found where they stand and the lark with no
 *   robin beside them is the lonesome one.
 * - Tempest: see TEMPEST below.
 *
 * Dancer.couple is each dancer's own unit (a trio index, a couple, or the
 * dancer's own number where there are no couples).
 */
import type { Dancer, Vec2 } from '../../types.ts';
import { SET } from './config.ts';
import { createDancers } from './dancers.ts';
import type { Formation } from './formation.ts';
import { dot, heading, leftOf, mean, polar, rotate, sub, TAU } from './math.ts';
import { coupleZ, improperModel } from './models.ts';
import { body, type Body, type DanceState, withChanges } from './state.ts';

/** A progression made here (its kind is added to progression.ts's union by the lead). */
export interface GroupsProgression {
  readonly kind: string;
  rebind(state: DanceState): DanceState;
}

const LARK = '#438b86';
const ROBIN = '#cb815a';

function dancer(id: number, name: string, role: 'lark' | 'robin', couple: number): Dancer {
  return { id, name, role, couple, direction: 1, color: role === 'lark' ? LARK : ROBIN };
}

function fixed(name: string, n: number, what: string) {
  return (count: number) => {
    if (count !== n) throw new Error(`${name} needs ${n} ${what}.`);
  };
}

/** n places round `center` at `radius`, the first nearest the band, the next on its right. */
export function placesRound(n: number, radius: number, center: Vec2 = { x: 0, z: 0 }): Body[] {
  const place = (j: number, dir: number): Body => {
    const a = -Math.PI / 2 + (dir * j * TAU) / n;
    const position = { x: center.x + radius * Math.cos(a), z: center.z + radius * Math.sin(a) };
    return { position, yaw: heading(position, center) };
  };
  const first = place(0, 1);
  const right = { x: -Math.cos(first.yaw), z: Math.sin(first.yaw) };
  const dir = dot(sub(place(1, 1).position, first.position), right) > 0 ? 1 : -1;
  return Array.from({ length: n }, (_, j) => place(j, dir));
}

const freeze = (s: DanceState) => Object.freeze(s);

// ---------------------------------------------------------------- ring of five

/** Radius of the ring of five: places 1.53 m apart. */
export const FIVE_RADIUS = 1.3;

export const FIVE_RING: Formation = {
  name: 'Ring of five',
  shape: 'circle',
  grouping: 'whole-set',
  // `couples` counts dancers here.
  couples: { min: 5, max: 5 },
  check: {
    counts: [5],
    meeting: 'none',
    rounds: () => 6,
    // Two balance & petronellas a time: everyone ends two places to the right.
    model: (n, rounds) => {
      const start = FIVE_RING.start(n);
      return {
        kind: 'dancer',
        rounds: Array.from({ length: rounds }, (_, r) =>
          start.dancers.map((d) =>
            rotate(start.bodies.get(d.id)!.position, (-2 * (r + 1) * TAU) / n),
          ),
        ),
      };
    },
  },
  start(n) {
    fixed('A ring of five', 5, 'dancers')(n);
    const dancers = Array.from({ length: 5 }, (_, i) =>
      dancer(i, `Dancer ${i + 1}`, i % 2 ? 'robin' : 'lark', i),
    );
    const places = placesRound(5, FIVE_RADIUS);
    return freeze({
      dancers,
      bodies: new Map(places.map((p, i) => [i, p])),
      hands: [],
      relations: new Map(),
      groups: [dancers.map((d) => d.id)],
      positions: new Map([
        ['first', [0]],
        ['others', [1, 2, 3, 4]],
      ]),
      epoch: 0,
      waiting: [],
    });
  },
};

/** The dancer standing next to `id` on their left, facing the middle of the ring. */
function onLeftInRing(state: DanceState, id: number): number {
  const ids = state.dancers.map((d) => d.id);
  const center = mean(ids.map((i) => body(state, i).position));
  const me = body(state, id).position;
  const left = leftOf(heading(me, center));
  let best = -1;
  let bestAngle = Infinity;
  for (const o of ids) {
    if (o === id) continue;
    const p = body(state, o).position;
    if (dot(sub(p, me), left) <= 0) continue;
    const a = Math.abs(polar(sub(p, center)) - polar(sub(me, center)));
    const angle = Math.min(a, TAU - a);
    if (angle < bestAngle) {
      best = o;
      bestAngle = angle;
    }
  }
  if (best < 0) throw new Error(`Nobody stands on dancer ${id}'s left.`);
  return best;
}

export const LEAD_LEFT_PROGRESSION: GroupsProgression = {
  kind: 'lead-left' as const,
  rebind(state) {
    const first = state.positions.get('first')?.[0];
    if (first === undefined) throw new Error('Nobody is first.');
    const next = onLeftInRing(state, first);
    const positions = new Map(state.positions)
      .set('first', [next])
      .set(
        'others',
        state.dancers.map((d) => d.id).filter((id) => id !== next),
      );
    return withChanges(state, { positions, epoch: state.epoch + 1 });
  },
};

// ---------------------------------------------------------------- line of five

/** Spacing along the line of five (hands joined). */
export const LINE_SPACING = 1.2;

/** Number labels "no.1" ... by place along the line, the +x end (stage left) first. */
function lineLabels(state: DanceState) {
  const ids = state.dancers.map((d) => d.id);
  const order = [...ids].sort((a, b) => body(state, b).position.x - body(state, a).position.x);
  const positions = new Map(state.positions);
  const relations = new Map(state.relations);
  order.forEach((id, k) => positions.set(`no.${k + 1}`, [id]));
  // Every two numbers name a pair to dance together ("no.1 & no.3 allemande").
  for (let i = 0; i < order.length; i++)
    for (let j = i + 1; j < order.length; j++)
      relations.set(
        `no.${i + 1} & no.${j + 1}`,
        new Map([
          [order[i], order[j]],
          [order[j], order[i]],
        ]),
      );
  return { positions, relations };
}

export const LINE_OF_FIVE: Formation = {
  name: 'Line of five',
  shape: 'small-set',
  grouping: 'whole-set',
  // `couples` counts dancers here.
  couples: { min: 5, max: 5 },
  check: {
    counts: [5],
    meeting: 'none',
    rounds: () => 6,
    // No.1 goes to the far end; everyone else moves one place toward the +x end.
    model: (n, rounds) => {
      const x = (slot: number) => ((n - 1) / 2 - slot) * LINE_SPACING;
      return {
        kind: 'dancer',
        rounds: Array.from({ length: rounds }, (_, r) =>
          Array.from({ length: n }, (_, i) => ({ x: x((((i - r - 1) % n) + n) % n), z: 0 })),
        ),
      };
    },
  },
  start(n) {
    fixed('A line of five', 5, 'dancers')(n);
    const dancers = Array.from({ length: 5 }, (_, i) =>
      dancer(i, `Dancer ${i + 1}`, i % 2 ? 'robin' : 'lark', i),
    );
    const bodies = new Map<number, Body>();
    // Facing up (-z): number 1 at stage left, the +x end.
    for (let i = 0; i < 5; i++)
      bodies.set(i, { position: { x: (2 - i) * LINE_SPACING, z: 0 }, yaw: Math.PI });
    const base: DanceState = {
      dancers,
      bodies,
      hands: [],
      relations: new Map(),
      groups: [dancers.map((d) => d.id)],
      positions: new Map(),
      epoch: 0,
      waiting: [],
    };
    return freeze({ ...base, ...lineLabels(base) });
  },
};

export const LINE_RENUMBER_PROGRESSION: GroupsProgression = {
  kind: 'line-renumber' as const,
  rebind: (state) => withChanges(state, { ...lineLabels(state), epoch: state.epoch + 1 }),
};

// ---------------------------------------------------------------- rings of trios

/** Spacing of trios round the ring (at the centers' radius), and within a trio. */
export const TRIO_GAP = 3.2;
export const TRIO_SPACING = 1.1;

/** Radius of the centers' ring for `trios` lines of three. */
export const trioRadius = (trios: number) => (trios * TRIO_GAP) / TAU;

/** Every place of the ring of trios (inside end, center, outside end of each). */
function trioPlaces(trios: number): Body[] {
  const R = trioRadius(trios);
  const out: Body[] = [];
  for (let k = 0; k < trios; k++) {
    const a = -Math.PI / 2 + (k * TAU) / trios;
    const u = { x: Math.cos(a), z: Math.sin(a) };
    // Counterclockwise seen from above (the line of dance): decreasing angle.
    const yaw = heading({ x: 0, z: 0 }, { x: Math.sin(a), z: -Math.cos(a) });
    for (const r of [R - TRIO_SPACING, R, R + TRIO_SPACING])
      out.push({ position: { x: u.x * r, z: u.z * r }, yaw });
  }
  return out;
}

/**
 * Trios regrouped by where they stand: each dancer belongs to the line of
 * three nearest them round the ring; "centers" are the middle of each line,
 * "ends" the others.
 */
function trioGroups(state: DanceState) {
  const ids = state.dancers.map((d) => d.id);
  const trios = ids.length / 3;
  const center = mean(ids.map((id) => body(state, id).position));
  const sector = (id: number) => {
    const a = polar(sub(body(state, id).position, center)) + Math.PI / 2;
    return ((Math.round((a * trios) / TAU) % trios) + trios) % trios;
  };
  const radius = (id: number) => {
    const p = sub(body(state, id).position, center);
    return Math.hypot(p.x, p.z);
  };
  const groups: number[][] = Array.from({ length: trios }, () => []);
  for (const id of ids) groups[sector(id)].push(id);
  for (const [k, g] of groups.entries())
    if (g.length !== 3) throw new Error(`Line of three ${k + 1} has ${g.length} dancers.`);
  for (const g of groups) g.sort((a, b) => radius(a) - radius(b));
  const positions = new Map(state.positions)
    .set('centers', groups.map((g) => g[1]))
    .set('ends', groups.flatMap((g) => [g[0], g[2]]))
    .set('insides', groups.map((g) => g[0]))
    .set('outsides', groups.map((g) => g[2]));
  return { groups, positions };
}

function trioRing(name: string): Formation {
  return {
    name,
    shape: 'circle',
    grouping: 'whole-set',
    // `couples` counts lines of three here.
    couples: { min: 4, max: 8 },
    check: {
      counts: [4, 6],
      meeting: 'none',
      rounds: (trios) => trios + 1,
      // A mixer: whoever stands where, everyone ends on a place of the starting ring.
      model: (trios, rounds) => {
        const places = trioPlaces(trios).map((p) => p.position);
        return { kind: 'slots', rounds, larks: places, robins: places };
      },
    },
    moves: { 'ring-promenade': 'trio-promenade' },
    start(trios) {
      if (!Number.isInteger(trios) || trios < 4 || trios > 8)
        throw new Error(`${name} needs 4 to 8 lines of three.`);
      const dancers = Array.from({ length: trios * 3 }, (_, id) => {
        const k = Math.floor(id / 3);
        const at = id % 3;
        const label = at === 1 ? 'Center' : at === 0 ? 'Inside' : 'Outside';
        return dancer(id, `${label} ${k + 1}`, at === 1 ? 'lark' : 'robin', k);
      });
      const places = trioPlaces(trios);
      const base: DanceState = {
        dancers,
        bodies: new Map(places.map((p, i) => [i, p])),
        hands: [],
        relations: new Map(),
        groups: [],
        positions: new Map(),
        epoch: 0,
        waiting: [],
      };
      return freeze({ ...base, ...trioGroups(base) });
    },
  };
}

export const CIRCLE_OF_THREES = trioRing('Circle of threes');
export const THREE_PERSON_MIXER = trioRing('Three-person mixer');

export const TRIO_RING_PROGRESSION: GroupsProgression = {
  kind: 'trio-ring' as const,
  rebind: (state) => withChanges(state, { ...trioGroups(state), epoch: state.epoch + 1 }),
};

// ---------------------------------------------------------------- 9-person mixer

/**
 * Partners found where they stand: each robin's partner is the lark beside
 * her on her own side line; the lark with no robin beside them is the
 * lonesome one.
 */
function lonesomeLabels(state: DanceState) {
  const larks = state.dancers.filter((d) => d.role === 'lark').map((d) => d.id);
  const robins = state.dancers.filter((d) => d.role === 'robin').map((d) => d.id);
  const partner = new Map<number, number>();
  const midX = mean(state.dancers.map((d) => body(state, d.id).position)).x;
  for (const r of robins) {
    const p = body(state, r).position;
    // Facing the middle of the set, a robin's partner is beside her on her left.
    const left = leftOf(heading(p, { x: midX, z: p.z }));
    const want = { x: p.x + left.x * SET.slot, z: p.z + left.z * SET.slot };
    const beside = larks.filter((l) => {
      const q = body(state, l).position;
      return Math.hypot(q.x - want.x, q.z - want.z) < 0.3;
    });
    if (beside.length !== 1) throw new Error(`Robin ${r} has no lark beside her on her line.`);
    partner.set(r, beside[0]).set(beside[0], r);
  }
  const alone = larks.filter((l) => !partner.has(l));
  if (alone.length !== 1) throw new Error('There must be exactly one lonesome dancer.');
  const positions = new Map(state.positions)
    .set('lonesome', alone)
    .set(
      'lines',
      state.dancers.map((d) => d.id).filter((id) => id !== alone[0]),
    );
  const relations = new Map(state.relations).set('partner', partner);
  return { positions, relations };
}

export const NINE_PERSON_MIXER: Formation = {
  name: '9-person mixer',
  shape: 'longways',
  grouping: 'whole-set',
  // Four couples (and the lonesome dancer).
  couples: { min: 4, max: 4 },
  check: {
    counts: [4],
    meeting: 'none',
    rounds: () => 6,
    // A mixer: everyone ends on a place of their role in the starting set.
    model: (couples, rounds) => {
      const start = NINE_PERSON_MIXER.start(couples);
      const of = (role: string) =>
        start.dancers.filter((d) => d.role === role).map((d) => start.bodies.get(d.id)!.position);
      return { kind: 'slots', rounds, larks: of('lark'), robins: of('robin') };
    },
  },
  start(couples) {
    fixed('The 9-person mixer', 4, 'couples')(couples);
    const dancers = [...createDancers(4), dancer(8, 'Lark 5', 'lark', 4)];
    const bodies = new Map<number, Body>();
    const h = SET.halfWidth;
    const s = SET.slot;
    // Two couples a side facing across (Becket), lark on each couple's left.
    const place = (c: number, west: boolean, z: number) => {
      const yaw = west ? Math.PI / 2 : -Math.PI / 2;
      const x = west ? -h : h;
      // Facing +x the left is -z; facing -x the left is +z.
      const lz = west ? -s / 2 : s / 2;
      bodies.set(c * 2, { position: { x, z: z + lz }, yaw });
      bodies.set(c * 2 + 1, { position: { x, z: z - lz }, yaw });
    };
    place(0, true, -s);
    place(1, false, -s);
    place(2, true, s);
    place(3, false, s);
    // The lonesome dancer at the top, facing down the set.
    bodies.set(8, { position: { x: 0, z: -2 * s }, yaw: 0 });
    const base: DanceState = {
      dancers,
      bodies,
      hands: [],
      relations: new Map(),
      groups: [dancers.map((d) => d.id)],
      positions: new Map(),
      epoch: 0,
      waiting: [],
      layout: { homes: new Map([...bodies].map(([id, b]) => [id, b.position])) },
    };
    return freeze({ ...base, ...lonesomeLabels(base) });
  },
};

export const LONESOME_PROGRESSION: GroupsProgression = {
  kind: 'lonesome' as const,
  rebind: (state) => withChanges(state, { ...lonesomeLabels(state), epoch: state.epoch + 1 }),
};

// ---------------------------------------------------------------- Tempest

/**
 * Tempest geometry. Units (two couples each) stand one level (SET.slot)
 * apart down the set, alternating: a line of four 1s across the set facing
 * down, then the two 2s couples below it, one couple on each side line
 * facing in. Each side's square of four (a 1s couple and the 2s couple on
 * that side) is a Becket minor set: couples 1.8 m apart across, partners
 * 1.8 m apart along the side.
 */
export const TEMPEST = {
  /** Side lines of the 2s. */
  side: 2.4,
  /** Where a 1s couple stands facing out in a side square. */
  inner: 0.6,
  /** The line of four: inner and outer dancers' distance from the middle. */
  lineIn: 0.5,
  lineOut: 1.5,
  level: SET.slot,
} as const;

export interface SideRing {
  /** -1 west, +1 east. */
  readonly side: -1 | 1;
  /** Level (z) of the ring's middle. */
  readonly z: number;
  /** The couple nearer the middle of the set, and the couple on the side line. */
  readonly inner: readonly number[];
  readonly outer: readonly number[];
}

/**
 * The side squares of a Tempest set as dancers stand: on each side, a
 * couple on the side line (|x| > 1.8) and two dancers nearer the middle
 * level with it (within 1.2 m of its middle along the set).
 */
export function tempestRings(state: DanceState): SideRing[] {
  const ids = state.dancers.map((d) => d.id);
  const rings: SideRing[] = [];
  for (const side of [-1, 1] as const) {
    const here = ids.filter((id) => Math.sign(body(state, id).position.x) === side);
    const outer = here
      .filter((id) => Math.abs(body(state, id).position.x) > 1.8)
      .sort((a, b) => body(state, a).position.z - body(state, b).position.z);
    const inner = here.filter((id) => Math.abs(body(state, id).position.x) <= 1.8);
    for (let i = 0; i + 1 < outer.length; i += 2) {
      const pair = [outer[i], outer[i + 1]];
      const z = (body(state, pair[0]).position.z + body(state, pair[1]).position.z) / 2;
      const near = inner.filter((id) => Math.abs(body(state, id).position.z - z) < 1.2);
      if (near.length === 2) rings.push({ side, z, inner: near, outer: pair });
    }
  }
  return rings;
}

/** Labels and groups: inner dancers (and lines) are 1s, side-line dancers 2s. */
function tempestLabels(state: DanceState) {
  const ids = state.dancers.map((d) => d.id);
  const ones = ids.filter((id) => Math.abs(body(state, id).position.x) <= 1.8);
  const twos = ids.filter((id) => Math.abs(body(state, id).position.x) > 1.8);
  const rings = tempestRings(state);
  const groups: number[][] = [];
  for (const r of rings.filter((k) => k.side < 0)) {
    const e = rings.find((k) => k.side > 0 && Math.abs(k.z - r.z) < 0.3);
    groups.push([...r.inner, ...r.outer, ...(e ? [...e.inner, ...e.outer] : [])]);
  }
  for (const r of rings.filter((k) => k.side > 0))
    if (!groups.some((g) => g.includes(r.outer[0]))) groups.push([...r.inner, ...r.outer]);
  const positions = new Map(state.positions).set('1s', ones).set('2s', twos);
  return { positions, groups };
}

export const TEMPEST_SET: Formation = {
  name: 'Tempest',
  shape: 'longways',
  grouping: 'duple-minor',
  // Two couples to a unit; whole Tempest sets of four couples.
  // Two Tempest sets at least, so the units keep meeting new ones.
  couples: { min: 8, max: 16 },
  fit: (couples) => Math.max(8, couples - (couples % 4)),
  // Ordinary figures in the side squares (figures/groups/side-ring.ts).
  moves: {
    circle: 'side-circle',
    'arch-dive': 'side-arch-dive',
    'do-si-do': 'side-do-si-do',
    balance: 'side-balance',
    swing: 'side-swing',
  },
  check: {
    counts: [8, 12],
    meeting: 'all-lines',
    // Units (lines of four and pairs of side couples) trade places as couples
    // do in a duple minor; a unit waiting at an end changes kind.
    model: (couples, rounds) => {
      const units = improperModel(couples / 2, rounds);
      return coupleZ(units.map((z) => Array.from({ length: couples }, (_, c) => z[c >> 1])));
    },
  },
  start(couples) {
    if (!Number.isInteger(couples) || couples < 8 || couples > 16 || couples % 4)
      throw new Error('A Tempest set needs 8, 12 or 16 couples.');
    const dancers = createDancers(couples);
    const units = couples / 2;
    const bodies = new Map<number, Body>();
    const { side, lineIn, lineOut, level } = TEMPEST;
    for (let k = 0; k < units; k++) {
      const z = (k - (units - 1) / 2) * level;
      const [w, e] = [2 * k, 2 * k + 1];
      if (k % 2 === 0) {
        // Line of four facing down; facing +z the left is +x.
        bodies.set(w * 2, { position: { x: -lineIn, z }, yaw: 0 });
        bodies.set(w * 2 + 1, { position: { x: -lineOut, z }, yaw: 0 });
        bodies.set(e * 2, { position: { x: lineOut, z }, yaw: 0 });
        bodies.set(e * 2 + 1, { position: { x: lineIn, z }, yaw: 0 });
      } else {
        // Side couples facing in, robin on the lark's left (see the reading).
        bodies.set(w * 2, { position: { x: -side, z: z + level / 2 }, yaw: Math.PI / 2 });
        bodies.set(w * 2 + 1, { position: { x: -side, z: z - level / 2 }, yaw: Math.PI / 2 });
        bodies.set(e * 2, { position: { x: side, z: z - level / 2 }, yaw: -Math.PI / 2 });
        bodies.set(e * 2 + 1, { position: { x: side, z: z + level / 2 }, yaw: -Math.PI / 2 });
      }
    }
    const base: DanceState = {
      dancers,
      bodies,
      hands: [],
      relations: new Map([['partner', new Map(dancers.map((d) => [d.id, d.id ^ 1]))]]),
      groups: [],
      positions: new Map(),
      epoch: 0,
      waiting: [],
    };
    // At the start the 1s line stands above its 2s: the minor sets are the units in pairs.
    const groups: number[][] = [];
    for (let k = 0; k + 1 < units; k += 2)
      groups.push(Array.from({ length: 8 }, (_, i) => 4 * k + i));
    return freeze({ ...base, positions: tempestLabels(base).positions, groups });
  },
};

export const TEMPEST_PROGRESSION: GroupsProgression = {
  kind: 'tempest' as const,
  rebind: (state) => withChanges(state, { ...tempestLabels(state), epoch: state.epoch + 1 }),
};

export const GROUPS_FORMATIONS: Readonly<Record<string, Formation>> = {
  tempest: TEMPEST_SET,
  'nine-person-mixer': NINE_PERSON_MIXER,
  'circle-of-threes': CIRCLE_OF_THREES,
  'three-person-mixer': THREE_PERSON_MIXER,
  'five-ring': FIVE_RING,
  'line-of-five': LINE_OF_FIVE,
};

export const GROUPS_PROGRESSIONS: Readonly<Record<string, GroupsProgression>> = {
  'lead-left': LEAD_LEFT_PROGRESSION,
  'line-renumber': LINE_RENUMBER_PROGRESSION,
  'trio-ring': TRIO_RING_PROGRESSION,
  lonesome: LONESOME_PROGRESSION,
  tempest: TEMPEST_PROGRESSION,
};

/** ContraDB formation text -> formation key and progression kind (import.ts FORMATION_TEXT). */
export const GROUPS_FORMATION_TEXT: Readonly<
  Record<string, { formation: string; progression: string }>
> = {
  '5 dancers': { formation: 'five-ring', progression: 'lead-left' },
  'five dancers': { formation: 'five-ring', progression: 'lead-left' },
  'circle of 5': { formation: 'five-ring', progression: 'lead-left' },
  'line of 5 people': { formation: 'line-of-five', progression: 'line-renumber' },
  'line of 5': { formation: 'line-of-five', progression: 'line-renumber' },
  'line of five': { formation: 'line-of-five', progression: 'line-renumber' },
  'circle of threes': { formation: 'circle-of-threes', progression: 'trio-ring' },
  'circle of 3s': { formation: 'circle-of-threes', progression: 'trio-ring' },
  'three-person mixer': { formation: 'three-person-mixer', progression: 'trio-ring' },
  'three person mixer': { formation: 'three-person-mixer', progression: 'trio-ring' },
  'trio mixer': { formation: 'three-person-mixer', progression: 'trio-ring' },
  '9-person mixer': { formation: 'nine-person-mixer', progression: 'lonesome' },
  '9 person mixer': { formation: 'nine-person-mixer', progression: 'lonesome' },
  'nine-person mixer': { formation: 'nine-person-mixer', progression: 'lonesome' },
  'nine person mixer': { formation: 'nine-person-mixer', progression: 'lonesome' },
  tempest: { formation: 'tempest', progression: 'tempest' },
};

