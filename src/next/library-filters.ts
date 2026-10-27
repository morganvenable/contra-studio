/**
 * The Dance library's filters: style, formation and figures. They read the
 * `layout` and `moves` each index entry carries (scripts/next-library.mjs),
 * and only narrow what the library lists.
 */
import { FORMATIONS } from "./core/formation.ts";
import type { LibraryEntry } from "./dance.ts";

export type DanceStyle = "contra" | "english" | "square" | "circle" | "other";

export const STYLE_LABEL: Readonly<Record<DanceStyle, string>> = {
  contra: "Contra",
  english: "English (whole sets)",
  square: "Square",
  circle: "Circle & mixer",
  other: "Other groups",
};

/**
 * Formation keys by style. English means the ECD-style whole sets of
 * formations-more.ts: triplets and longways sets of a fixed size.
 */
const STYLE_OF_LAYOUT: Readonly<Record<string, DanceStyle>> = {
  improper: "contra",
  proper: "contra",
  indecent: "contra",
  "duple-neutral": "contra",
  "triple-minor": "contra",
  becket: "contra",
  "becket-ccw": "contra",
  "becket-indecent": "contra",
  "becket-ccw-indecent": "contra",
  triplet: "english",
  "three-couple-set": "english",
  "longways-set": "english",
  "longways-four": "english",
  "whole-set-longways": "english",
  square: "square",
  circle: "circle",
  "circle-mixer": "circle",
  sicilian: "circle",
  "three-person-mixer": "circle",
  "nine-person-mixer": "circle",
  "circle-of-threes": "circle",
  "five-ring": "circle",
};

export const styleOf = (layout: string | undefined): DanceStyle =>
  (layout && STYLE_OF_LAYOUT[layout]) || "other";

export const formationLabel = (layout: string) =>
  FORMATIONS[layout]?.name ?? layout;

/** Figure choices, each covering the moves that dancers would call by that name. */
export const FIGURE_GROUPS: readonly {
  readonly id: string;
  readonly label: string;
  readonly moves: readonly string[];
}[] = [
  { id: "swing", label: "Swing", moves: ["swing", "lines-swing", "square-swing", "corner-swing", "place-swing", "basket-swing", "cascade-swing", "side-swing", "tempest-swing"] },
  { id: "balance", label: "Balance", moves: ["balance", "square-balance", "side-balance"] },
  { id: "circle", label: "Circle", moves: ["circle", "ring-circle", "whole-circle", "set-circle", "lines-circle", "side-circle", "loop-circle"] },
  { id: "star", label: "Star", moves: ["star", "role-star", "star-around", "star-wheel", "star-whirl"] },
  { id: "star-promenade", label: "Star promenade", moves: ["star-promenade"] },
  { id: "allemande", label: "Allemande", moves: ["allemande"] },
  { id: "do-si-do", label: "Do si do", moves: ["do-si-do", "couples-do-si-do", "square-do-si-do", "side-do-si-do"] },
  { id: "gyre", label: "Gyre", moves: ["gyre"] },
  { id: "chain", label: "Chain", moves: ["chain", "grand-chain"] },
  { id: "hey", label: "Hey", moves: ["hey", "dolphin-hey", "circular-hey", "hey-for-three", "tandem-hey"] },
  { id: "long-lines", label: "Long lines", moves: ["long-lines", "forward-back"] },
  { id: "right-left-through", label: "Right & left through", moves: ["right-left-through"] },
  { id: "pass-through", label: "Pass through", moves: ["pass-through"] },
  { id: "pass-by", label: "Pass by / pull by", moves: ["pass-by"] },
  { id: "petronella", label: "Petronella", moves: ["petronella"] },
  { id: "twirl", label: "California twirl / box the gnat", moves: ["twirl"] },
  { id: "promenade", label: "Promenade", moves: ["promenade", "ring-promenade", "promenade-around", "promenade-home", "trio-promenade"] },
  { id: "hall", label: "Up / down the hall", moves: ["hall"] },
  { id: "wave", label: "Waves", moves: ["ocean-wave", "center-wave"] },
  { id: "box-circulate", label: "Box circulate", moves: ["box-circulate"] },
  { id: "rory", label: "Rory O'More", moves: ["rory"] },
  { id: "mad-robin", label: "Mad robin", moves: ["mad-robin"] },
  { id: "ricochet", label: "Ricochet", moves: ["mad-ricochet"] },
  { id: "roll-away", label: "Roll away", moves: ["roll-away", "ring-roll-away", "roll"] },
  { id: "slide", label: "Slide", moves: ["slide", "ring-slide", "sashay-along", "sashay"] },
  { id: "slice", label: "Slice", moves: ["slice"] },
  { id: "give-and-take", label: "Give & take", moves: ["give-and-take"] },
  { id: "poussette", label: "Poussette", moves: ["poussette"] },
  { id: "butterfly-whirl", label: "Butterfly whirl", moves: ["butterfly-whirl"] },
  { id: "revolving-door", label: "Revolving door", moves: ["revolving-door"] },
  { id: "zig-zag", label: "Zig-zag", moves: ["zig-zag"] },
  { id: "oval", label: "Oval", moves: ["oval"] },
  { id: "orbit", label: "Orbit", moves: ["orbit"] },
  { id: "gate", label: "Gate", moves: ["gate"] },
  { id: "star-thru", label: "Star thru", moves: ["star-thru"] },
  { id: "figure-eight", label: "Figure eight", moves: ["figure-eight"] },
  { id: "arch", label: "Arch & dive", moves: ["arch-dive", "dip-and-dive", "side-arch-dive"] },
  { id: "contra-corners", label: "Contra corners", moves: ["contra-corners", "corners", "square-corners"] },
  { id: "cast", label: "Cast", moves: ["cast", "lines-cast"] },
  { id: "two-hand-turn", label: "Two-hand turn", moves: ["two-hand-turn"] },
  { id: "set-turn-single", label: "Set & turn single", moves: ["set-to-corner", "turn-single"] },
  { id: "strip-the-willow", label: "Strip the willow", moves: ["strip-the-willow"] },
  { id: "grand-right-left", label: "Grand right & left", moves: ["grand-right-left"] },
];

const GROUP_OF_MOVE = new Map(
  FIGURE_GROUPS.flatMap((g) => g.moves.map((m) => [m, g.id] as const)),
);

/** The figure-group ids a dance calls. */
export function figuresOf(entry: Pick<LibraryEntry, "moves">): Set<string> {
  const found = new Set<string>();
  for (const move of entry.moves ?? []) {
    const id = GROUP_OF_MOVE.get(move);
    if (id) found.add(id);
  }
  return found;
}

export interface LibraryFilter {
  style: DanceStyle | "";
  layout: string;
  figures: Set<string>;
}

export const emptyFilter = (): LibraryFilter => ({
  style: "",
  layout: "",
  figures: new Set(),
});

export const isFilterActive = (f: LibraryFilter) =>
  !!f.style || !!f.layout || f.figures.size > 0;

/** Figures match when the dance calls every selected one. */
export function matchesFilter(
  entry: Pick<LibraryEntry, "layout" | "moves">,
  f: LibraryFilter,
): boolean {
  if (f.style && styleOf(entry.layout) !== f.style) return false;
  if (f.layout && entry.layout !== f.layout) return false;
  if (!f.figures.size) return true;
  const figures = figuresOf(entry);
  for (const id of f.figures) if (!figures.has(id)) return false;
  return true;
}
