/**
 * Row joins for hands, lines and partner figures (run by import.ts before
 * its own lead-in joins):
 *
 * - A zero-beat row followed by a "meanwhile ..." row ("larks allemande left
 *   1½", then "MEANWHILE robins allemande right 1½"): both dance at once, as
 *   one call (figures/ecd/together.ts) taking the second row's beats.
 * - A zero-beat row in parentheses ("(neighbors pull by left)") restates
 *   the row before it: it adds no call.
 * - A zero-beat pass through or pull by ("circle left 3 places", then "pass
 *   through"): it takes the last 2 beats of the figure before it (or the
 *   first 2 of the one after), when that figure has 6 beats or more.
 * - A zero-beat row that only takes, catches, joins or drops hands: no call.
 * - "New/next neighbor" rows before the marked progression: the neighbor,
 *   else the next neighbor as the dancers stand (orNext, core/relations.ts).
 * - "X take Y" with no swing with them after it: a give and take
 *   (figures/give-and-take.ts).
 */
import { parseRow, type SourceRow } from './core/parse.ts';
import type { StoredCall } from './dance.ts';

type Parsed = (StoredCall[] | Error)[];

const HANDS_ONLY =
  /^(?:(?:next |new )?[\w']+ (?:catch|take|join|drop)\b.*\bhands?\b.*|(?:next |new )?\w+ catch (?:left|right)|join hands\b.*|open up to face new neighbors, hands four)\s*⁋?$/;

export function joinHandRows(rows: readonly SourceRow[], parsed: Parsed) {
  const only = (i: number) => {
    const calls = parsed[i];
    return Array.isArray(calls) && calls.length === 1 ? calls[0] : undefined;
  };
  rows.forEach((row, i) => {
    const next = rows[i + 1];
    const lead = only(i);
    // A zero-beat row that only takes, catches, joins or drops hands ("larks
    // catch left hands", "open up to face new neighbors, hands four"): the
    // figures around it take the hands they need.
    if (row.beats === 0 && parsed[i] instanceof Error && HANDS_ONLY.test(row.text.toLowerCase())) {
      parsed[i] = [];
      return;
    }
    if (row.beats !== 0 || !lead) return;
    // Zero-beat row, then "meanwhile ...".
    if (next && next.beats > 0 && /^\s*meanwhile\b/i.test(next.text)) {
      try {
        const second = parseRow({
          ...next,
          text: next.text.replace(/^\s*meanwhile\b[\s,:]*/i, ''),
        });
        if (second.length !== 1) return;
        parsed[i] = [
          {
            move: 'together',
            beats: next.beats,
            params: {
              parts: [lead, second[0]].map((c) => ({ move: c.move, params: c.params })),
            },
            text: `${lead.text} while ${second[0].text}`,
            section: row.section,
            row: i + 1,
            ...(lead.progression || second[0].progression ? { progression: true } : {}),
          },
        ];
        parsed[i + 1] = [];
      } catch {
        // Left as it was.
      }
      return;
    }
    // "(neighbors pull by left)": a note on the row before.
    if (/^\s*\(.*\)\s*⁋?\s*$/.test(row.text) && i > 0) {
      parsed[i] = [];
      return;
    }
    // A zero-beat pass through or pull by borrows 2 beats from a neighbor.
    if (lead.move === 'pass-through' || lead.move === 'pass-by') {
      const before = i > 0 ? parsed[i - 1] : undefined;
      const last = Array.isArray(before) ? before.at(-1) : undefined;
      if (Array.isArray(before) && last && last.beats >= 6) {
        before[before.length - 1] = { ...last, beats: last.beats - 2 };
        parsed[i] = [{ ...lead, beats: 2 }];
        return;
      }
      const after = parsed[i + 1];
      const first = Array.isArray(after) ? after[0] : undefined;
      if (Array.isArray(after) && first && first.beats >= 6) {
        after[0] = { ...first, beats: first.beats - 2 };
        parsed[i] = [{ ...lead, beats: 2 }];
      }
    }
  });
  // "X take Y" not leading into a swing with Y: a give and take.
  parsed.forEach((_calls, i) => {
    const lead = only(i);
    if (!lead || lead.move !== 'take' || !(lead.beats >= 4)) return;
    const after = parsed[i + 1];
    const first = Array.isArray(after) ? after[0] : undefined;
    if (first?.move === 'swing' && first.params.who === lead.params.whom) return;
    const { who, whom } = lead.params as { who?: string; whom?: string };
    if ((who !== 'larks' && who !== 'robins') || (whom !== 'partner' && whom !== 'neighbor'))
      return;
    parsed[i] = [{ ...lead, move: 'give-and-take', params: { who, whom } }];
  });
  // "New neighbor ..." / "next neighbors ..." before the row the source
  // marks as the progression: the neighbor relation is not rebound yet, so
  // the row dances with the stored neighbor if it can, else with the next
  // neighbor as the dancers stand (core/relations.ts).
  const marked = (i: number) => {
    const calls = parsed[i];
    return Array.isArray(calls) && calls.some((c) => c.progression);
  };
  rows.forEach((row, i) => {
    const calls = parsed[i];
    if (!Array.isArray(calls) || !/(?:new|next) neighbors?/i.test(row.text)) return;
    if (marked(i) || !rows.some((_r, j) => j > i && marked(j))) return;
    if (rows.some((_r, j) => j < i && marked(j))) return;
    parsed[i] = calls.map((c) =>
      c.params.who === 'neighbor' ? { ...c, params: { ...c.params, orNext: true } } : c,
    );
  });
}
