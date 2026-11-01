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
