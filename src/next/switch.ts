/**
 * Engine switch: dances stored in the figure library compile with it by
 * default. Dances not stored yet, and every dance with `?engine=old`, use the
 * old engine.
 */
import type { CompiledDance, Dance } from "../types.ts";
import { compileNext, findNextDance } from "./dance.ts";

export function nextEngineRequested(search: string): boolean {
  return new URLSearchParams(search).get("engine") !== "old";
}

export function compileWithEngine(
  dance: Dance,
  couples: number | undefined,
  compileOld: (dance: Dance, couples?: number) => CompiledDance,
  search = typeof location === "undefined" ? "" : location.search,
): CompiledDance {
  if (!nextEngineRequested(search)) return compileOld(dance, couples);
  const stored = findNextDance(dance.sourceUrl);
  if (!stored) {
    console.info(
      `"${dance.title}" is not in the figure library yet; using the old engine.`,
    );
    return compileOld(dance, couples);
  }
  return compileNext(stored, couples, dance);
}

/** True when a compiled dance came from the figure library. */
export const isNextCompiled = (c: CompiledDance) =>
  (c as { engine?: string }).engine === "next";
