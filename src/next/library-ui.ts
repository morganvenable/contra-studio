/**
 * The Dance library's view of every stored ContraDB dance: the small index
 * (public/dances/index.json) is fetched when the library opens, and each
 * dance's JSON only when it is opened, so none of them are in the bundle.
 */
import type { FlowHabits } from "./flow.ts";
import type { Dance } from "../types.ts";
import { FORMATIONS } from "./core/formation.ts";
import {
  registerNextDance,
  type DanceStatus,
  type LibraryEntry,
  type StoredDance,
} from "./dance.ts";

type Env = { BASE_URL?: string };
const base = (
  (import.meta as ImportMeta & { env?: Env }).env?.BASE_URL ?? "./"
).replace(/\/?$/, "/");
const url = (path: string) => `${base}dances/${path}`;

export const STATUS_ORDER: readonly Exclude<DanceStatus, "unchecked">[] = [
  "ok",
  "check",
  "partial",
  "unsupported",
];

/** Badge text; the status names themselves, so feedback can quote them. */
export const STATUS_LABEL: Readonly<Record<DanceStatus, string>> = {
  ok: "ok",
  check: "check",
  partial: "partial",
  unsupported: "unsupported",
  unchecked: "unchecked",
};

let index: Promise<LibraryEntry[]> | undefined;
let habits: Promise<FlowHabits | undefined> | undefined;

/** How often choreographers follow one figure with another (scripts/flow-habits.ts); undefined if unavailable. */
export function loadFlowHabits(): Promise<FlowHabits | undefined> {
  habits ??= fetch(url("flow-habits.json"), { credentials: "omit" })
    .then((r) => (r.ok ? (r.json() as Promise<FlowHabits>) : undefined))
    .catch(() => undefined);
  return habits;
}

export function loadLibraryIndex(): Promise<LibraryEntry[]> {
  index ??= fetch(url("index.json"), { credentials: "omit" })
    .then((r) => {
      if (!r.ok)
        throw new Error(`The dance index is unavailable (${r.status}).`);
      return r.json();
    })
    .then((body: { dances: LibraryEntry[] }) => body.dances)
    .catch((error) => {
      index = undefined;
      throw error;
    });
  return index;
}

const dances = new Map<string, Promise<StoredDance>>();

/** Fetch one stored dance by ContraDB id and register it with the engine switch. */
export function fetchStoredDance(id: string): Promise<StoredDance> {
  if (!/^\d+$/.test(id))
    return Promise.reject(new Error(`"${id}" is not a ContraDB id.`));
  let found = dances.get(id);
  if (!found) {
    found = fetch(url(`${id}.json`), { credentials: "omit" })
      .then((r) => {
        if (!r.ok)
          throw new Error(`ContraDB dance #${id} is not in the library.`);
        return r.json() as Promise<StoredDance>;
      })
      .then((stored) => {
        registerNextDance(stored);
        return stored;
      });
    found.catch(() => dances.delete(id));
    dances.set(id, found);
  }
  return found;
}

/** The formation's own name, for formations other than duple minor and Becket. */
function formationName(stored: StoredDance): { formationName?: string } {
  const key = stored.formation;
  if (!key || key === "improper" || key.startsWith("becket")) return {};
  const name = FORMATIONS[key]?.name;
  return name ? { formationName: name } : {};
}

/** An app Dance for a stored dance with no old-engine program of its own. */
export function danceFromStored(stored: StoredDance): Dance {
  return {
    id: `contradb:${stored.id}`,
    title: stored.title,
    author: stored.author,
    formation: stored.formation?.startsWith("becket")
      ? "becket"
      : "duple-improper",
    circulation: stored.formation === "becket-ccw" ? "ccw" : "cw",
    ...formationName(stored),
    sourceUrl: stored.source.url,
    description: stored.problems[0] ?? "",
    figures: [],
    notes: [...stored.problems, ...stored.choices.map((c) => `Choice: ${c}`)],
  };
}

export function filterLibrary(
  entries: readonly LibraryEntry[],
  query: string,
  status: DanceStatus | "all",
): LibraryEntry[] {
  const q = query.trim().toLowerCase();
  const rank = (e: LibraryEntry) => {
    const i = (STATUS_ORDER as readonly DanceStatus[]).indexOf(e.status);
    return i < 0 ? STATUS_ORDER.length : i;
  };
  // Working dances first; the sort is stable, so each group keeps its order.
  return entries
    .filter(
      (e) =>
        (status === "all" || e.status === status) &&
        (!q ||
          `${e.title} ${e.author} ${e.id} ${e.formation}`
            .toLowerCase()
            .includes(q)),
    )
    .sort((a, b) => rank(a) - rank(b));
}

export function countByStatus(
  entries: readonly LibraryEntry[],
): Record<string, number> {
  const counts: Record<string, number> = { all: entries.length };
  for (const e of entries) counts[e.status] = (counts[e.status] ?? 0) + 1;
  return counts;
}
