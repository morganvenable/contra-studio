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
 *   parentheses or with "beats". Lines without one share what is left of
 *   their 16-beat part; with no parts named at all, 8 beats each.
 * - "Title:", "By:" and "Formation:" lines name the dance; the formation is
 *   improper unless one is named (the dialog's choice, else this line).
 */
import type { StoredDance } from './dance.ts';
import { importRows } from './import.ts';
import type { SourceRow } from './core/parse.ts';

export interface OneShotLine {
  /** The line as typed. */
  readonly typed: string;
  /** The figure text read from it, its part and beats. */
  readonly row?: SourceRow & { readonly guessed: boolean };
}

export interface OneShot {
  readonly stored: StoredDance;
  readonly lines: readonly OneShotLine[];
}

const PART = /^\s*\(?((?:A|B|C)\d?)\)?\s*[:.)\-–]?\s+/i;
const LEADING_BEATS = /^\s*\(?(\d{1,2})\)?\s*(?:beats?|counts?|b)?\s*[:.)\-–]?\s+/i;
const TRAILING_BEATS = /\s*(?:\((\d{1,2})\s*(?:beats?|counts?|b)?\)|[-–,]\s*(\d{1,2})\s*(?:beats?|counts?|b)?|\s(\d{1,2})\s*(?:beats?|counts?))\s*$/i;
const HEADER = /^\s*(title|name|by|author|choreographer|formation)\s*:\s*(.*)$/i;

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

  // Beats not given: what is left of the line's 16-beat part, shared out.
  const figures = lines.filter((l) => l.text);
  const parts = new Map<string, typeof figures>();
  for (const l of figures) {
    const key = l.part ?? '';
    if (!parts.has(key)) parts.set(key, []);
    parts.get(key)!.push(l);
  }
  const guessed = new Set<(typeof figures)[number]>();
  for (const [key, group] of parts) {
    const missing = group.filter((l) => l.beats === undefined);
    if (!missing.length) continue;
    const known = group.reduce((n, l) => n + (l.beats ?? 0), 0);
    const share = key && known < 16 ? (16 - known) / missing.length : 8;
    for (const l of missing) {
      l.beats = Math.max(2, Math.round(share / 2) * 2);
      guessed.add(l);
    }
  }
  // Parts not named: A1, A2, B1, B2 by 16 beats.
  let beat = 0;
  for (const l of figures) {
    if (!l.part) l.part = ['A1', 'A2', 'B1', 'B2'][Math.min(3, Math.floor(beat / 16))];
    beat += l.beats!;
  }

  const rows: SourceRow[] = figures.map((l) => ({ section: l.part, beats: l.beats!, text: l.text! }));
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
        ? { typed: l.typed, row: { section: l.part, beats: l.beats!, text: l.text, guessed: guessed.has(l as never) } }
        : { typed: l.typed },
    ),
  };
}
