// Build the figure gallery's cases (src/next/proof-cases.json): every
// figure in the next engine's registry, and each variant of it (the params
// that change its motion), with the smallest arrangement it starts from.
//
// node --experimental-strip-types scripts/proof-cases.mjs
//
// For each variant, the stored dances that use it are tried in order: the
// figure straight from its formation's start (two couples, then four), then
// after one, two or three of the calls that come before it in that dance.
// The first that compiles strictly wins. A figure that starts from none of
// them keeps the reason it cannot start from the formation alone.
import { readFileSync, writeFileSync } from 'node:fs';
import { compileProof, canonical } from '../src/next/proof.ts';
import { FIGURES } from '../src/next/figures/index.ts';
import { ECD_FIGURES } from '../src/next/figures/ecd/index.ts';
import { FORMATIONS } from '../src/next/core/formation.ts';

const OUT = 'src/next/proof-cases.json';
const DANCES = 'public/dances';

/** Params that change how a figure moves (not who dances it or how far). */
const VARIANT_KEYS = [
  'style',
  'grip',
  'formation',
  'meltdown',
  'end',
  'hand',
  'hands',
  'singleFile',
  'back',
  'turn',
  'ricochet',
  'balance',
  'spin',
  'direction',
  'action',
  'half',
  'route',
  'backing',
  'face',
  'then',
  'shoulder',
  'longWaves',
  'wave',
  'center',
  'kind',
];
/** Extra variant params for one move. */
const MOVE_KEYS = {
  hey: ['amount'],
  'line-pairs': ['pairs'],
  'square-middle': ['move'],
  corners: ['move'],
  'square-corners': ['move'],
  meet: ['figure'],
  beside: ['move'],
  'center-travel': ['style'],
};
/** Params that never make a variant of their own, even if listed above. */
const SKIP = { orbit: ['direction'], promenade: [], 'ring-promenade': ['direction'] };

const FAMILY_OF = {
  Turns: [
    'swing', 'allemande', 'gyre', 'do-si-do', 'two-hand-turn', 'courtesy-turn', 'twirl',
    'turn-alone', 'turn-back', 'roll-away', 'roll', 'give-and-take', 'star-thru',
    'butterfly-whirl', 'orbit', 'balance', 'mad-robin', 'mad-ricochet', 'couples-do-si-do',
    'still', 'stand-still', 'hold',
  ],
  'Heys and weaves': [
    'hey', 'circular-hey', 'dolphin-hey', 'figure-eight', 'zig-zag', 'chevron', 'gate',
    'split', 'grand-right-left', 'tandem-hey', 'thread-needle',
  ],
  'Stars and circles': [
    'star', 'star-promenade', 'circle', 'ring-circle', 'star-wheel', 'star-whirl',
    'role-star', 'lines-circle', 'loop-circle', 'side-circle', 'cloverleaf', 'diamond',
  ],
  'Chains and passes': [
    'chain', 'right-left-through', 'pass-through', 'pass-by', 'slice', 'revolving-door',
    'cross-trail', 'grand-chain',
  ],
  'Waves and lines': [
    'ocean-wave', 'center-wave', 'long-lines', 'forward-back', 'box-circulate', 'rory',
    'slide', 'walk-forward', 'line-pairs',
  ],
  Travel: [
    'hall', 'promenade', 'couple-travel', 'poussette', 'petronella', 'arch-dive',
    'sashay-along', 'top-to-bottom', 'promenade-around', 'oval', 'ring-promenade',
    'ring-slide', 'ring-shift', 'sashay', 'lonesome-travel', 'centers-travel',
  ],
};
function familyOf(move) {
  for (const [family, moves] of Object.entries(FAMILY_OF)) if (moves.includes(move)) return family;
  if (move in ECD_FIGURES) return 'ECD';
  return 'Square and set figures';
}

const variantOf = (move, params) => {
  const keys = [...VARIANT_KEYS, ...(MOVE_KEYS[move] ?? [])].filter(
    (k) => !(SKIP[move] ?? []).includes(k),
  );
  return Object.fromEntries(keys.filter((k) => k in params).map((k) => [k, params[k]]));
};

const index = JSON.parse(readFileSync(`${DANCES}/index.json`, 'utf8')).dances;
const rank = { ok: 0, check: 1, partial: 2, unsupported: 3 };
index.sort((a, b) => (rank[a.status] ?? 4) - (rank[b.status] ?? 4) || Number(a.id) - Number(b.id));

/** variant id -> { move, variant, examples: [{ dance, index }] } */
const variants = new Map();
for (const entry of index) {
  const stored = JSON.parse(readFileSync(`${DANCES}/${entry.id}.json`, 'utf8'));
  if (!stored.formation || !FORMATIONS[stored.formation]) continue;
  stored.figures.forEach((call, i) => {
    if (!FIGURES[call.move] || call.move === 'hold') return;
    const variant = variantOf(call.move, call.params);
    const id = `${call.move}${Object.keys(variant).length ? ' ' + canonical(variant) : ''}`;
    const v = variants.get(id) ?? { id, move: call.move, variant, examples: [], count: 0 };
    v.count++;
    if (v.examples.length < 40) v.examples.push({ stored, index: i });
    variants.set(id, v);
  });
}
// Figures no stored dance uses: plain params from common formations.
const PLAIN = ['improper', 'becket', 'square', 'triplet', 'longways-set', 'circle'];
for (const move of Object.keys(FIGURES)) {
  if (move === 'hold' || [...variants.values()].some((v) => v.move === move)) continue;
  variants.set(move, { id: move, move, variant: {}, examples: [], count: 0, plain: true });
}

const clean = (c) => ({ move: c.move, params: c.params, beats: c.beats, ...(c.text ? { text: c.text } : {}) });
const why = (e) => (e instanceof Error ? e.message : String(e)).replace(/^Figure \d+ \([^)]*\): /, '');

function attempt(base, lead, couples) {
  const c = { ...base, lead, couples };
  try {
    compileProof(c);
    return { ok: c };
  } catch (error) {
    return { error: why(error) };
  }
}

const cases = [];
const started = Date.now();
for (const v of [...variants.values()].sort((a, b) => a.move.localeCompare(b.move) || b.count - a.count)) {
  let found;
  let isolation;
  let firstError;
  const tries = v.plain
    ? PLAIN.map((formation) => ({ formation, call: { move: v.move, params: {}, beats: 8 }, figures: [], index: 0 }))
    : v.examples.slice(0, 12).map(({ stored, index: i }) => ({
        formation: stored.formation,
        call: stored.figures[i],
        figures: stored.figures,
        index: i,
        source: stored.id,
      }));
  for (const depth of [0, 1, 2, 3]) {
    for (const t of tries) {
      if (depth > t.index) continue;
      const lead = t.figures.slice(t.index - depth, t.index).map(clean);
      if (lead.some((c) => c.move === 'hold')) continue;
      const base = {
        id: v.id,
        formation: t.formation,
        move: v.move,
        params: t.call.params,
        beats: t.call.beats,
      };
      const f = FORMATIONS[t.formation];
      for (const couples of [...new Set([Math.max(2, f.couples.min), Math.min(4, f.couples.max), f.display ?? 0])].filter((n) => n >= f.couples.min && n <= f.couples.max)) {
        const r = attempt(base, lead, couples);
        if (r.ok) {
          found = { ...r.ok, source: t.source };
          break;
        }
        if (depth === 0) isolation ??= r.error;
        firstError ??= r.error;
      }
      if (found) break;
    }
    if (found) break;
  }
  const first = tries[0];
  const entry = {
    id: v.id,
    family: familyOf(v.move),
    move: v.move,
    params: found?.params ?? first?.call.params ?? {},
    variant: v.variant,
    beats: found?.beats ?? first?.call.beats ?? 8,
    formation: found?.formation ?? first?.formation ?? 'improper',
    couples: found?.couples ?? 2,
    lead: found?.lead ?? [],
    ...(found?.source ? { source: found.source } : first?.source ? { source: first.source } : {}),
    ...(found && found.lead.length ? { isolation } : {}),
    ...(!found ? { isolation: isolation ?? firstError, error: firstError ?? 'No arrangement tried.' } : {}),
    uses: v.count,
  };
  cases.push(entry);
  process.stdout.write(`${found ? (found.lead.length ? `+${found.lead.length}` : 'ok') : 'FAIL'} ${v.id}\n`);
}
writeFileSync(OUT, JSON.stringify(cases, null, 0).replace(/\},\{"id"/g, '},\n{"id"') + '\n');
const failed = cases.filter((c) => c.error);
console.log(
  `${cases.length} cases, ${new Set(cases.map((c) => c.move)).size} figures; ` +
    `${cases.filter((c) => !c.error && !c.lead.length).length} start alone, ` +
    `${cases.filter((c) => !c.error && c.lead.length).length} after a lead-in, ${failed.length} cannot start ` +
    `(${Math.round((Date.now() - started) / 1000)} s)`,
);
