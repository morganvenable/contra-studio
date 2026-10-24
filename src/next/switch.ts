/**
 * Engine switch. A dance the app has fetched from the library
 * (registerNextDance) compiles with the figure library by default:
 *
 * - ok and check dances always use the new engine.
 * - partial and unsupported dances use the new engine (rows it cannot draw
 *   are held still and labeled) unless the dance also has a reviewed
 *   old-engine program (a Ready dance), which is then shown instead, with
 *   the new engine's status line first. `?engine=next` shows the new
 *   engine's version anyway.
 * - `?engine=old` uses the old engine for every dance that has an
 *   old-engine program.
 */
import type { CompiledDance, Dance } from '../types.ts';
import { compileNext, findNextDance } from './dance.ts';

export function nextEngineRequested(search: string): boolean {
  return new URLSearchParams(search).get('engine') !== 'old';
}

const forcedNext = (search: string) => new URLSearchParams(search).get('engine') === 'next';

/** The dance has an old-engine program of its own (a Ready or built-in dance). */
const hasOldProgram = (dance: Dance) => dance.figures.length > 0;

export function compileWithEngine(
  dance: Dance,
  couples: number | undefined,
  compileOld: (dance: Dance, couples?: number) => CompiledDance,
  search = typeof location === 'undefined' ? '' : location.search,
): CompiledDance {
  const stored = findNextDance(dance.sourceUrl);
  if (!stored) return compileOld(dance, couples);
  if (!nextEngineRequested(search) && hasOldProgram(dance)) return compileOld(dance, couples);
  const usable = stored.status === 'ok' || stored.status === 'check';
  if (!usable && hasOldProgram(dance) && !forcedNext(search)) {
    const old = compileOld(dance, couples);
    const line = `New engine: ${stored.problems[0] ?? 'not drawn yet'} Showing the reviewed version.`;
    const warnings = [line, ...old.warnings];
    return { ...old, warnings, sample: (beat) => ({ ...old.sample(beat), warnings }) };
  }
  return compileNext(stored, couples, dance);
}

/** True when a compiled dance came from the figure library. */
export const isNextCompiled = (c: CompiledDance) => (c as { engine?: string }).engine === 'next';
