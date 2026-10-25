/**
 * Rows that only make sense with their neighbors (import.ts calls this after
 * parsing every row):
 *
 * - A "SIMULTANEOUS:" block ("FOUR larks:", "INSIDE FOURSOME:" ...): the rows
 *   up to "WHILE:" are one part, the rows after it the other, the last row
 *   carrying the block's beats; drawn as one simultaneous call (each part's
 *   rows share the beats evenly).
 * - A zero-beat "meanwhile X" row: X happens during the row before it, on
 *   other dancers (a meanwhile call).
 * - A zero-beat "slide left/right along set" right after a J-hook: it says
 *   which way the hook goes.
 * - A single-file walk along the set after a row that says to turn right
 *   ("pass through across the set and turn right 90 degrees", "turn alone
 *   to the right"): the walk goes to the dancers' left as they face in, the
 *   way a right turn from facing out sends them.
 *
 * Pure, like import.ts.
 */
import { canonical } from './core/roles.ts';
import { normalizeRow, parseRow, type SourceRow } from './core/parse.ts';
import type { StoredCall } from './dance.ts';

type Parsed = (StoredCall[] | Error)[];

const plain = (row: SourceRow) => normalizeRow(row.text).text.replace(/[:.]+$/, '').trim();

const HEADER = /^(?:simultaneous(?:ly)?|(?:four|the) (\w+)|inside foursome|outside twosomes?)$/;
const WHILE = /^(?:while|meanwhile)(?: (\w+|outside twosomes?|inside foursome))?$/;

/** A role named in a block header ("FOUR larks:"), as an `among` label. */
function roleLabel(word: string | undefined): string | undefined {
  if (!word) return undefined;
  const w = canonical(word);
  return w === 'larks' || w === 'robins' ? w : undefined;
}

function simultaneous(rows: readonly SourceRow[], parsed: Parsed) {
  for (let i = 0; i < rows.length; i++) {
    const head = rows[i].beats === 0 ? plain(rows[i]).match(HEADER) : null;
    if (!head) continue;
    let k = i + 1;
    while (k < rows.length && rows[k].beats === 0 && !WHILE.test(plain(rows[k]))) k++;
    if (k >= rows.length || rows[k].beats !== 0) continue;
    let e = k + 1;
    while (e < rows.length && rows[e].beats === 0) e++;
    if (e >= rows.length || k === i + 1 || e === k) continue;
    const beats = rows[e].beats;
    const roles = [roleLabel(head[1]), roleLabel(plain(rows[k]).match(WHILE)?.[1])];
    const part = (from: number, to: number, role: string | undefined) => {
      const share = beats / (to - from);
      return rows.slice(from, to).flatMap((r) =>
        parseRow({ ...r, beats: share }).map((c) => ({
          move: c.move,
          beats: c.beats,
          params:
            role && !(c.params as { among?: unknown }).among ? { ...c.params, among: [role] } : c.params,
        })),
      );
    };
    try {
      const parts = [part(i + 1, k, roles[0]), part(k + 1, e + 1, roles[1])].map((calls) => ({
        calls,
      }));
      const texts = (from: number, to: number) =>
        rows
          .slice(from, to)
          .map((r) => r.text.replace(/⁋/g, '').trim())
          .join(', ');
      const mark = rows.slice(i, e + 1).some((r) => r.text.includes('⁋'));
      for (let j = i; j < e; j++) parsed[j] = [];
      parsed[e] = [
        {
          move: 'simultaneous',
          beats,
          params: { parts },
          text: `${texts(i + 1, k)} while ${texts(k + 1, e + 1)}`,
          section: rows[e].section,
          row: e + 1,
          ...(mark ? { progression: true } : {}),
        },
      ];
      i = e;
    } catch {
      // A part that does not read leaves the rows as they were.
    }
  }
}

function meanwhileRows(rows: readonly SourceRow[], parsed: Parsed) {
  rows.forEach((row, i) => {
    if (row.beats !== 0 || i === 0) return;
    const m = plain(row).match(/^(?:meanwhile|while),? (.+?)(?: for an?)?$/);
    const before = parsed[i - 1];
    if (!m || !Array.isArray(before) || !before.length) return;
    const last = before[before.length - 1];
    try {
      const second = parseRow({ ...row, text: m[1], beats: last.beats });
      if (second.length !== 1) return;
      before[before.length - 1] = {
        ...last,
        move: 'meanwhile',
        params: {
          first: { move: last.move, params: last.params },
          second: { move: second[0].move, params: second[0].params },
        },
        text: `${last.text} meanwhile ${second[0].text}`,
      };
      parsed[i] = [];
    } catch {
      // Left unparsed.
    }
  });
}

function hookDirection(rows: readonly SourceRow[], parsed: Parsed) {
  rows.forEach((row, i) => {
    if (row.beats !== 0 || i === 0) return;
    const m = plain(row).match(/^slide (left|right) along (?:the )?set$/);
    const before = parsed[i - 1];
    if (!m || !Array.isArray(before) || before.length < 2) return;
    const last = before[before.length - 1];
    if (last.move !== 'slide') return;
    before[before.length - 1] = { ...last, params: { ...last.params, direction: m[1] } };
    parsed[i] = [];
  });
}

function singleFileAfterTurn(rows: readonly SourceRow[], parsed: Parsed) {
  rows.forEach((row, i) => {
    const calls = parsed[i];
    if (!Array.isArray(calls)) return;
    calls.forEach((c, k) => {
      if (c.move !== 'slide' || c.params.facing !== 'travel' || c.params.direction !== 'progression')
        return;
      const raw = (r: SourceRow) => r.text.toLowerCase();
      const said = k > 0 || i === 0 ? raw(row) : `${raw(rows[i - 1])} ${raw(row)}`;
      if (/\bturn (?:alone )?(?:to (?:the|their) )?right\b|\bturn right\b/.test(said))
        calls[k] = { ...c, params: { ...c.params, direction: 'left' } };
    });
  });
}

export function joinTravelRows(rows: readonly SourceRow[], parsed: Parsed) {
  simultaneous(rows, parsed);
  meanwhileRows(rows, parsed);
  hookDirection(rows, parsed);
  singleFileAfterTurn(rows, parsed);
}
