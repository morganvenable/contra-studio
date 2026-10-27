/**
 * Figure gallery (figures.html): every figure in the next engine's registry, each from
 * a small starting arrangement (a formation's start and a short call list),
 * so a figure's motion, hands and endings can be checked one at a time.
 *
 * The cases live in proof-cases.json, written by scripts/proof-cases.mjs,
 * which searches the stored dances for the shortest lead-in from which each
 * figure (and each variant of it) starts. The page (src/proof-sheet.ts) and
 * the studio's ?figure= view both compile a case here.
 */
import type { FigureCall } from './core/figure.ts';
import { FORMATIONS } from './core/formation.ts';
import type { FoldedDance } from './core/fold.ts';
import { compileNext, type StoredDance } from './dance.ts';
import { FIGURES } from './figures/index.ts';

export interface ProofCall {
  readonly move: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly beats: number;
  readonly text?: string;
}

export interface ProofCase {
  /** Stable key: move plus its variant params. */
  readonly id: string;
  readonly family: string;
  readonly move: string;
  /** The figure's params, as a ContraDB row reads them. */
  readonly params: Readonly<Record<string, unknown>>;
  /** The params that make this a variant (style, grip, kind ...). */
  readonly variant: Readonly<Record<string, unknown>>;
  readonly beats: number;
  /** Ending variant, when the figure has several. */
  readonly ending?: string;
  readonly formation: string;
  readonly couples: number;
  /** Calls danced before the figure to reach a place it starts from. */
  readonly lead: readonly ProofCall[];
  /** Why the figure cannot start straight from the formation, if it cannot. */
  readonly isolation?: string;
  /** Why no arrangement tried lets it start; the card shows this. */
  readonly error?: string;
  /** A stored dance this call was read from. */
  readonly source?: string;
}

export const FAMILIES = [
  'Turns',
  'Heys and weaves',
  'Stars and circles',
  'Chains and passes',
  'Waves and lines',
  'Travel',
  'Square and set figures',
  'ECD',
] as const;

/** A stored dance holding just the lead-in and the figure. */
export function proofStored(c: Pick<ProofCase, 'formation' | 'lead' | 'move' | 'params' | 'beats' | 'id'>): StoredDance {
  const calls: FigureCall[] = [
    ...c.lead.map((l) => ({ move: l.move, params: l.params, beats: l.beats, text: l.text ?? l.move })),
    { move: c.move, params: c.params, beats: c.beats, text: c.move },
  ];
  const beats = calls.reduce((n, x) => n + x.beats, 0);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id: `proof:${c.id}`,
    title: proofTitle(c),
    author: 'Figure gallery',
    formation: c.formation,
    progression: 'none',
    music: { meter: '2/4', parts: [{ name: 'A', bars: beats / 2 }], times: 1 },
    source: { url: `proof:${c.id}`, formation: c.formation, sha256: '' },
    status: 'ok',
    problems: [],
    unparsed: [],
    choices: [],
    figures: calls,
  };
}

export function proofTitle(c: Pick<ProofCase, 'move' | 'params'>): string {
  const p = Object.entries(c.params)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(', ');
  return p ? `${c.move} (${p})` : c.move;
}

export interface CompiledProof {
  readonly dance: FoldedDance;
  /** Beat the figure starts and ends at. */
  readonly start: number;
  readonly end: number;
}

/** Compile a case strictly: a figure that cannot start throws. */
export function compileProof(
  c: Pick<ProofCase, 'formation' | 'lead' | 'move' | 'params' | 'beats' | 'id' | 'couples'>,
): CompiledProof {
  if (!FIGURES[c.move]) throw new Error(`No figure named "${c.move}".`);
  if (!FORMATIONS[c.formation]) throw new Error(`No formation named "${c.formation}".`);
  const dance = compileNext(proofStored(c), c.couples, undefined, { lenient: false });
  const start = dance.starts[c.lead.length];
  return { dance, start, end: start + c.beats };
}

/** Case for a ?figure=<move>&params=<json> link: the sheet's case, or a bare start. */
export function findProofCase(
  cases: readonly ProofCase[],
  move: string,
  params: Readonly<Record<string, unknown>> | undefined,
  id?: string | null,
): ProofCase | undefined {
  if (id) {
    const byId = cases.find((c) => c.id === id);
    if (byId) return byId;
  }
  const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
  const ofMove = cases.filter((c) => c.move === move && !c.error);
  if (!params) return ofMove[0];
  const exact = ofMove.find((c) => same(c.params, params));
  if (exact) return exact;
  const base = ofMove[0];
  if (base) return { ...base, id: `${move}:${canonical(params)}`, params };
  return undefined;
}

/** JSON with sorted keys, for comparing params. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
