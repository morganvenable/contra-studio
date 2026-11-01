/**
 * One-shot dances: figures typed (or dictated) as plain text, read the same
 * way as a ContraDB page's rows (import.ts importRows) and danced at once.
 *
 * The text, one figure per line, loosely:
 *
 *   Title: My first dance
 *   Formation: Becket
 *   A1  8  neighbors balance & swing
 *   A2     circle left 3 places (8)
 *          pass through to next neighbors
 *   B1 16  partners balance & swing
 *
 * - A part name (A1, A2, B1, B2 ...) at the start of a line starts that part.
 * - A beat count: a number at the start of the line, or at its end in
 *   parentheses or with "beats". Lines without one take the figure's usual
 *   length (a balance and swing 16, an allemande 8, a pull by 2).
 * - Plain figure names read the usual way: "allemande" is neighbors
 *   allemande right once, "swing" a neighbor swing, "hey" a full hey with
 *   the robins starting. The preview says what each was read as.
 * - "Title:", "By:" and "Formation:" lines name the dance; the formation is
 *   improper unless one is named (the dialog's choice, else this line).
 */
import type { StoredDance } from './dance.ts';
import { importRows } from './import.ts';
import { parseRow, type SourceRow } from './core/parse.ts';
import { flowBetween, habit, habitKey, type FlowHabits, type FlowSegment } from './flow.ts';

export interface OneShotLine {
  /** The line as typed. */
  readonly typed: string;
  /** The figure text read from it, its part and beats. */
  readonly row?: SourceRow & { readonly guessed: boolean; readonly readAs?: string };
}

export interface OneShot {
  readonly stored: StoredDance;
  readonly lines: readonly OneShotLine[];
}

const PART = /^\s*\(?((?:A|B|C)\d?)\)?\s*[:.)\-–]?\s+/i;
const LEADING_BEATS = /^\s*\(?(\d{1,2})\)?\s*(?:beats?|counts?|b)?\s*[:.)\-–]?\s+/i;
const TRAILING_BEATS = /\s*(?:\((\d{1,2})\s*(?:beats?|counts?|b)?\)|[-–,]\s*(\d{1,2})\s*(?:beats?|counts?|b)?|\s(\d{1,2})\s*(?:beats?|counts?))\s*$/i;
const HEADER = /^\s*(title|name|by|author|choreographer|formation)\s*:\s*(.*)$/i;

/** Who a figure names, if it names anyone. */
const WHO = /\b(?:neighbou?rs?|partners?|shadows?|larks|robins|ladies|gents|gentlespoons|ladles|ones|twos|1s|2s|corners?|everyone|all|centers|ends)\b/i;

/**
 * Plain figure names read the usual way (a typed "allemande" is neighbors
 * allemande right once): each rewrite is tried in turn when the text as
 * typed does not read, and the preview says what it was read as.
 */
const REWRITES: readonly ((t: string) => string | undefined)[] = [
  (t) => {
    const m = t.match(/^(?:(\w+) start (?:a |the )?)?(full |half )?hey(?: for four)?$/i);
    return m ? `${m[1] ?? 'robins'} start a ${(m[2] ?? 'full ').trim()} hey - rights on ends, lefts in center` : undefined;
  },
  (t) => (/^(?:balance (?:&|and) )?box circulate$/i.test(t) ? 'balance & box circulate - robins cross while larks loop right' : undefined),
  (t) => (/^long lines$/i.test(t) ? 'long lines forward & back' : undefined),
  (t) => (/^mad robins?$/i.test(t) ? 'mad robins, robins in front' : undefined),
  (t) => (/^(?:ladies |robins )?chain$/i.test(t) ? 'robins chain' : undefined),
  (t) => {
    const m = t.match(/^(?:(\w+) )?give (?:&|and) take(?: (partners?|neighbou?rs?))?$/i);
    return m ? `${m[1] ?? 'larks'} give & take ${m[2] ?? 'partners'}` : undefined;
  },
  (t) => (/^promenade\b/i.test(t) && !WHO.test(t) ? `partners ${t}` : undefined),
  // Someone to dance it with: neighbors, unless the line names someone.
  (t) => (WHO.test(t) ? undefined : `neighbors ${t}`),
];
/** Fill in a hand and an amount: allemandes and gyres go once around, by the right. */
const COMPLETE: readonly ((t: string) => string)[] = [
  (t) => (/\ballemande\b/i.test(t) && !/\b(?:left|right)\b/i.test(t) ? t.replace(/\ballemande\b/i, 'allemande right') : t),
  (t) => (/\b(?:allemande|gyre)\b/i.test(t) && !/\b(?:once|twice|\d|½|¼|¾|half|quarter|three|one)\b/i.test(t) ? `${t} once` : t),
];
const reads = (text: string) => {
  try {
    parseRow({ text, beats: 8 });
    return true;
  } catch {
    return false;
  }
};
/** The text as typed if it reads, else the first usual reading that does. */
function readable(text: string): string | undefined {
  if (reads(text)) return undefined;
  const filled = COMPLETE.reduce((t, f) => f(t), text);
  const tries = [filled, ...REWRITES.map((r) => r(filled)), ...REWRITES.map((r) => r(text))].filter(
    (t): t is string => !!t && t !== text,
  );
  for (const t of tries) {
    if (reads(t)) return t;
    const more = REWRITES.map((r) => r(t)).find((u) => u && reads(u));
    if (more) return more;
  }
  return undefined;
}

/** How long a figure usually takes, for a line typed without beats. */
const USUAL: readonly [RegExp, number][] = [
  [/contra corners/i, 16],
  [/balance (?:&|and) swing/i, 16],
  [/half hey/i, 8],
  [/\bhey\b/i, 16],
  [/\b(?:down|up) the hall\b.*\b(?:and back|and return|turn)/i, 16],
  [/balance (?:&|and) (?:box circulate|rory|petronella|box the gnat|swat|california|twirl)|ocean wave (?:&|and) balance/i, 8],
  [/^(?:\w+ )?(?:pull|pass) by\b(?!.*\b(?:and|&)\b)|^pass through(?: to [\w ]+)?$/i, 2],
  [/box the gnat|swat the flea|california twirl|\btwirl\b|\brory\b|box circulate|\bpetronella\b|\bbalance\b/i, 4],
];
const usualBeats = (text: string) => USUAL.find(([re]) => re.test(text))?.[1] ?? 8;

/** Read typed text into rows and a stored dance. */
export function readOneShot(text: string, formationChoice?: string): OneShot {
  const headers: Record<string, string> = {};
  const lines: { typed: string; text?: string; part?: string; beats?: number }[] = [];
  let part: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const typed = raw.replace(/\s+$/, '');
    let line = typed.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
    if (!line) continue;
    const header = line.match(HEADER);
    if (header) {
      const key = header[1].toLowerCase();
      headers[key === 'name' ? 'title' : key === 'author' || key === 'choreographer' ? 'by' : key] = header[2].trim();
      lines.push({ typed });
      continue;
    }
    const named = line.match(PART);
    if (named) {
      part = named[1].toUpperCase();
      line = line.slice(named[0].length).trim();
    } else if (/^(?:A|B|C)\d?$/i.test(line)) {
      part = line.toUpperCase();
      lines.push({ typed });
      continue;
    }
    let beats: number | undefined;
    const lead = line.match(LEADING_BEATS);
    if (lead) {
      beats = Number(lead[1]);
      line = line.slice(lead[0].length).trim();
    } else {
      const trail = line.match(TRAILING_BEATS);
      if (trail) {
        beats = Number(trail[1] ?? trail[2] ?? trail[3]);
        line = line.slice(0, trail.index).trim();
      }
    }
    lines.push({ typed, text: line, part, beats });
  }

  // Beats not given: how long the figure usually takes.
  const figures = lines.filter((l) => l.text);
  const guessed = new Set<(typeof figures)[number]>();
  const readAs = new Map<(typeof figures)[number], string>();
  for (const l of figures) {
    const as = readable(l.text!);
    if (as) readAs.set(l, as);
    if (l.beats === undefined) {
      l.beats = usualBeats(as ?? l.text!);
      guessed.add(l);
    }
  }
  // Parts not named: A1, A2, B1, B2 by 16 beats.
  let beat = 0;
  for (const l of figures) {
    if (!l.part) l.part = ['A1', 'A2', 'B1', 'B2'][Math.min(3, Math.floor(beat / 16))];
    beat += l.beats!;
  }

  const rows: SourceRow[] = figures.map((l) => ({ section: l.part, beats: l.beats!, text: readAs.get(l) ?? l.text! }));
  const formation = (formationChoice || headers.formation || 'improper').trim();
  const hash = [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
  const id = `typed-${(hash >>> 0).toString(36)}`;
  const stored = importRows({
    id,
    title: headers.title || 'Your dance',
    author: headers.by || 'you',
    formation,
    rows,
    source: { url: `text:${id}`, formation, sha256: id, status: 'typed' },
  });
  return {
    stored,
    lines: lines.map((l) =>
      l.text
        ? {
            typed: l.typed,
            row: {
              section: l.part,
              beats: l.beats!,
              text: l.text,
              guessed: guessed.has(l as never),
              ...(readAs.has(l as never) ? { readAs: readAs.get(l as never) } : {}),
            },
          }
        : { typed: l.typed },
    ),
  };
}

/** Where a duple dance's 1s stand against their first 2s after each row, and what that means. */
export interface ProgressionTrace {
  /** Rows (1-based) after which the 1s have just passed below their 2s, or come back above them. */
  readonly passed: ReadonlySet<number>;
  readonly back: ReadonlySet<number>;
  /** Plain words: whether the time through moves the 1s on, and where it went wrong. */
  readonly summary: string;
}

/**
 * Follow the first 1s couple and the 2s it starts with through one time
 * through (duple formations only): a contra moves each couple one place a
 * time through, the 1s ending below the 2s they started with.
 */
export function traceProgression(stored: StoredDance, compile: (s: StoredDance) => { round(r: number): { segments: readonly { call: { row?: number; text?: string }; result: { exit: { bodies: ReadonlyMap<number, { position: { z: number } }>; relations: ReadonlyMap<string, ReadonlyMap<number, number>> } }; entry: { bodies: ReadonlyMap<number, { position: { z: number } }>; relations: ReadonlyMap<string, ReadonlyMap<number, number>> } }[] } }): ProgressionTrace | undefined {
  if (!stored.progression?.startsWith('duple-minor')) return undefined;
  let round;
  try {
    round = compile(stored).round(0);
  } catch {
    return undefined;
  }
  const first = round.segments[0]?.entry;
  if (!first) return undefined;
  // The 1s are couple 0 (dancers 0 and 1); their 2s, the couple of dancer 0's neighbor.
  const other = first.relations.get('neighbor')?.get(0);
  if (other === undefined) return undefined;
  const twos = [other - (other % 2), other - (other % 2) + 1];
  const below = (bodies: ReadonlyMap<number, { position: { z: number } }>) => {
    const z = (ids: number[]) => ids.reduce((n, id) => n + bodies.get(id)!.position.z, 0) / ids.length;
    return z([0, 1]) > z(twos) + 0.3 ? true : z([0, 1]) < z(twos) - 0.3 ? false : undefined;
  };
  const passed = new Set<number>(), back = new Set<number>();
  let was = below(first.bodies) ?? false;
  const start = was;
  let lastPass: { row: number; text: string } | undefined, lastBack: { row: number; text: string } | undefined;
  for (const s of round.segments) {
    const now = below(s.result.exit.bodies);
    if (now === undefined || now === was) continue;
    const row = s.call.row ?? 0, text = (s.call.text ?? '').split(' · ')[0];
    if (now !== start) {
      passed.add(row);
      lastPass = { row, text };
    } else {
      back.add(row);
      lastBack = { row, text };
    }
    was = now;
  }
  const quote = (r: { row: number; text: string }) => `line ${r.row}, “${r.text}”`;
  const summary =
    was !== start
      ? `Progression works: the 1s end below their 2s (from ${quote(lastPass!)}), so everyone moves on one place each time through.`
      : lastPass && lastBack
        ? `No progression: the 1s pass their 2s at ${quote(lastPass)}, but ${quote(lastBack)} takes them back past the same 2s. “Neighbors” means the couple you are dancing with until the dance moves on.`
        : 'No progression: the 1s never pass the 2s they start with. A contra usually moves on with a figure that carries the 1s down past their 2s (a swing or circle that ends with them below, a pass through to next neighbors).';
  return { passed, back, summary };
}

/** What a candidate next line does from where the typed dance leaves off. */
export interface NextMove {
  readonly phrase: string;
  /** flows: starts and moves cleanly; awkward: starts, but something is off; stuck: cannot start here. */
  readonly fit: 'flows' | 'awkward' | 'stuck';
  readonly why?: string;
  /** The line carries the 1s past their 2s (on), or back above them (back). */
  readonly progress?: 'on' | 'back';
  readonly beats: number;
  /** How often the library follows the figure before with this one. */
  readonly habit?: { readonly count: number; readonly of: number };
  /** A counter-turn into it that choreographers rarely write. */
  readonly turn?: string;
}

/** Fewer follows than this in the library is rare. */
export const RARE = 3;

/**
 * The flow into figure `index` of `stored`: how often the library follows
 * the figure before with it, and a counter-turn when that pairing is rare.
 */
export function joinFlow(
  stored: StoredDance,
  segments: readonly FlowSegment[] | undefined,
  index: number,
  habits: FlowHabits | undefined,
): Pick<NextMove, 'habit' | 'turn'> {
  const before = stored.figures[index - 1], after = stored.figures[index];
  if (!before || !after) return {};
  const h = habits ? habit(habits, habitKey(before), habitKey(after)) : undefined;
  let turn: string | undefined;
  if ((!h || h.count < RARE) && segments?.[index - 1] && segments[index]) {
    const note = flowBetween(segments[index - 1], segments[index], [0, 1, 2, 3])[0];
    turn = note ? `${note.who} ${note.text}` : undefined;
  }
  return { ...(h ? { habit: h } : {}), ...(turn ? { turn } : {}) };
}

/**
 * Try `phrase` as the next line after `text`: whether the dancers can start
 * it from where they stand, whether anything in it is physically off
 * (dancers too close, a hand out of reach, too fast for anyone), and
 * whether it moves the 1s on or back. `compile` is the strict compiler
 * (compileNext without leniency); `check` the physical check.
 */
export function tryNext(
  text: string,
  phrase: string,
  formation: string | undefined,
  compile: (s: StoredDance) => unknown,
  check: (dance: unknown) => { problems: readonly string[] },
  habits?: FlowHabits,
): NextMove {
  const before = readOneShot(text, formation).stored;
  const start = before.figures.reduce((n, f) => n + f.beats, 0);
  const read = readOneShot(`${text.replace(/\s+$/, '')}\n${nextLine(text, phrase, formation)}`, formation);
  const row = read.lines.filter((l) => l.row).length;
  const beats = read.lines.filter((l) => l.row).at(-1)?.row?.beats ?? 8;
  const miss = read.stored.unparsed.find((u) => u.row === row);
  if (miss) return { phrase, fit: 'stuck', why: miss.why, beats };
  let dance: unknown;
  try {
    dance = compile(read.stored);
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    // Only a failure of the new line counts against it.
    const at = why.match(/Figure (\d+) \(/);
    const index = at ? Number(at[1]) - 1 : -1;
    const ours = index >= before.figures.length;
    return { phrase, fit: ours ? 'stuck' : 'flows', ...(ours ? { why: why.replace(/^.*?Figure \d+ \(.*?\): /, '') } : {}), beats };
  }
  let progress: NextMove['progress'];
  try {
    const trace = traceProgression(read.stored, compile as never);
    progress = trace?.passed.has(row) ? 'on' : trace?.back.has(row) ? 'back' : undefined;
  } catch {
    progress = undefined;
  }
  let flow: Pick<NextMove, 'habit' | 'turn'> = {};
  try {
    const first = read.stored.figures.findIndex((f) => f.row === row);
    const segments = (dance as { round(r: number): { segments: readonly FlowSegment[] } }).round(0).segments;
    flow = joinFlow(read.stored, segments, first, habits);
  } catch {
    flow = {};
  }
  // Physical trouble inside the new line only.
  const issue = check(dance).problems.find((p) => {
    const beat = Number(p.match(/^beat ([\d.]+)/)?.[1] ?? -1);
    return beat >= start && beat <= start + beats;
  });
  const plain = issue
    ?.replace(/^beat [\d.]+: /, '')
    .replace(/dancers \d+ and \d+ are ([\d.]+) m apart/, 'two dancers come $1 m apart')
    .replace(/(\d+-\d+ )?(\w+)\/(\w+) hand reach ([\d.]+) m/, 'a hand has to reach $4 m')
    .replace(/dancer \d+ moves ([\d.]+) m\/beat/, 'a dancer has to cover $1 m in a beat')
    .replace(/dancer \d+ turns ([\d.]+) rad\/beat/, 'a dancer has to spin $1 radians a beat');
  return { phrase, fit: issue ? 'awkward' : 'flows', ...(plain ? { why: plain } : {}), ...(progress ? { progress } : {}), beats, ...flow };
}

const PARTS = ['A1', 'A2', 'B1', 'B2'];

/** `phrase` as the next line of `text`: it opens the next part (A2, B1, B2) when the last part is full. */
export function nextLine(text: string, phrase: string, formation?: string): string {
  const rows = readOneShot(text, formation).lines.flatMap((l) => (l.row ? [l.row] : []));
  const last = rows.at(-1)?.section;
  if (!rows.length) return `A1 ${phrase}`;
  const filled = rows.filter((r) => r.section === last).reduce((n, r) => n + r.beats, 0);
  const next = PARTS[PARTS.indexOf(last ?? '') + 1];
  return filled >= 16 && next ? `${next} ${phrase}` : phrase;
}
