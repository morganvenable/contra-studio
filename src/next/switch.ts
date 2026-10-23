/**
 * Engine switch: `?engine=next` compiles supported dances with the figure
 * library. Everything else, and every dance by default, uses the old engine.
 */
import type { CompiledDance, Dance } from '../types.ts';
import { compileNext, findNextDance } from './dance.ts';

export function nextEngineRequested(search: string): boolean {
  return new URLSearchParams(search).get('engine') === 'next';
}

export function compileWithEngine(
  dance: Dance,
  couples: number | undefined,
  compileOld: (dance: Dance, couples?: number) => CompiledDance,
  search = typeof location === 'undefined' ? '' : location.search,
): CompiledDance {
  if (!nextEngineRequested(search)) return compileOld(dance, couples);
  const stored = findNextDance(dance.sourceUrl);
  if (!stored) {
    console.info(`engine=next: "${dance.title}" is not in the figure library yet; using the old engine.`);
    return compileOld(dance, couples);
  }
  return compileNext(stored, couples, dance);
}

/** True when a compiled dance came from the figure library. */
export const isNextCompiled = (c: CompiledDance) => (c as { engine?: string }).engine === 'next';
