/**
 * Rows that only make sense with their neighbors (import.ts calls this after
 * parsing every row):
 *
 * - "Top couple sashay down" and a later "same two, sashay (back) up": down
 *   and back as one call when the rows are together, otherwise down, and
 *   later the same couple back up to the top.
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
      // Parts of one row each that only read together ("larks see saw once"
      // WHILE "robins orbit clockwise ½ around"): the row "A while the B".
      if (k !== i + 2 || e !== k + 1) continue;
      const said = (j: number, role: string | undefined) => {
        const t = rows[j].text.replace(/⁋/g, '').trim();
        return role && !new RegExp(`^${role}\\b`, 'i').test(plain(rows[j])) ? `${role} ${t}` : t;
      };
      try {
        const text = `${said(i + 1, roles[0])} while the ${said(e, roles[1])}`;
        const calls = parseRow({ ...rows[e], text });
        parsed[i] = [];
        parsed[i + 1] = [];
        parsed[k] = [];
        parsed[e] = calls.map((c) => ({ ...c, section: rows[e].section, row: e + 1 }));
        i = e;
      } catch {
        // Left as they were.
      }
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

/**
 * "Top couple sashay down" then "(same two / top couple) sashay (back) up":
 * one couple goes down and comes back, one call over both rows.
 */
function downAndBack(rows: readonly SourceRow[], parsed: Parsed) {
  const one = (i: number) => {
    const p = parsed[i];
    return Array.isArray(p) && p.length === 1 && p[0].move === 'center-travel' ? p[0] : undefined;
  };
  const legs = (c: StoredCall) => ((c.params as { legs?: string[] }).legs ?? []).join();
  for (let i = 0; i < rows.length; i++) {
    const down = one(i);
    if (!down || legs(down) !== 'down') continue;
    const j = rows.findIndex((_r, k) => k > i && !!one(k) && ['top', 'up'].includes(legs(one(k)!)));
    if (j < 0) continue;
    const up = one(j)!;
    if (up.params.who !== 'top' && up.params.who !== down.params.who) continue;
    if (j === i + 1) {
      parsed[i] = [
        {
          ...down,
          beats: down.beats + up.beats,
          params: { ...down.params, legs: ['down', 'top'] },
          text: `${down.text}, ${up.text}`,
          ...(down.progression || up.progression ? { progression: true } : {}),
        },
      ];
      parsed[j] = [];
    } else {
      // Figures in between: down as far as a walk goes, and later the same
      // couple (the top couple at the start of the time through: the 1s)
      // back up to the top.
      const same = down.params.who === 'top' ? '1s' : down.params.who;
      parsed[j] = [{ ...up, params: { ...up.params, who: same, legs: ['top'] } }];
    }
    i = j;
  }
}

/**
 * A dance written for a duple minor set whose figures send the top couple to
 * the bottom of the set ("top couple sashay to bottom of set - others move
 * up", Galopede) is danced in one longways set: its progression is the
 * whole set's.
 */
export function wholeSetShape<S extends { formation: string; progression: string }>(
  rows: readonly SourceRow[],
  shape: S | undefined,
): S | { formation: string; progression: 'places' } | undefined {
  if (!shape) return shape;
  // A Becket set whose top minor set dances to the bottom (Riverside Jig).
  if (/^minor-set/.test(shape.progression) && /^becket/.test(shape.formation))
    return rows.some((r) => /^top (?:2|two) couples\b.*\bto the bottom\b/.test(plain(r)))
      ? { formation: shape.formation, progression: 'becket-rows' as never }
      : shape;
  if (!/^duple-minor/.test(shape.progression)) return shape;
  const wholeSet = rows.some((r) =>
    /^top couple\b.*\b(?:sashay|promenade|lead|cast)\b.*\b(?:down|bottom|end of (?:the )?set)\b/.test(
      plain(r),
    ),
  );
  return wholeSet ? { formation: 'longways-set', progression: 'places' } : shape;
}

/**
 * A down the hall of 12 beats or more that turns, with no up the hall after
 * it ("down the hall and turn as a couple (come back to face across)", 16
 * beats): half the beats down and turning, half back up bending into a ring
 * on the side lines.
 */
function downAndUp(parsed: Parsed) {
  const calls = parsed.flatMap((p, i) => (Array.isArray(p) ? p.map((c, k) => ({ c, i, k })) : []));
  calls.forEach(({ c, i, k }, n) => {
    if (c.move !== 'hall' || c.params.direction !== 'down' || !c.params.turn || c.beats < 12) return;
    const next = calls[n + 1]?.c;
    if (next?.move === 'hall') return;
    const row = parsed[i] as StoredCall[];
    row.splice(
      k,
      1,
      { ...c, beats: c.beats / 2, progression: undefined },
      {
        ...c,
        beats: c.beats / 2,
        params: { direction: 'up', end: 'ring' },
      },
    );
    for (const x of row) if (x.progression === undefined) delete (x as { progression?: boolean }).progression;
  });
}

/**
 * Grand square rows ("Heads walk forward, sides back up"), one leg each:
 * numbered through the run of such rows, the heads go in first (and the
 * sides away from their partners first) for four legs, then the other way
 * round for the next four.
 */
function grandSquare(rows: readonly SourceRow[], parsed: Parsed) {
  const LEG = /^(heads|sides) (walk forward|back up),? (heads|sides) (walk forward|back up)$/;
  const IN_FIRST = ['in', 'away', 'out', 'toward'];
  const AWAY_FIRST = ['away', 'in', 'toward', 'out'];
  let k = 0;
  rows.forEach((row, i) => {
    const m = plain(row).match(LEG);
    if (!m || m[1] === m[3] || !(row.beats > 0)) {
      k = 0;
      return;
    }
    const half = Math.floor(k / 4) % 2;
    const step = k % 4;
    const facing = (said: string) => (said === 'walk forward' ? 'forward' : 'back');
    const said = { [m[1]]: m[2], [m[3]]: m[4] } as Record<'heads' | 'sides', string>;
    parsed[i] = [
      {
        move: 'grand-square',
        beats: row.beats,
        params: {
          heads: { move: (half ? AWAY_FIRST : IN_FIRST)[step], facing: facing(said.heads) },
          sides: { move: (half ? IN_FIRST : AWAY_FIRST)[step], facing: facing(said.sides) },
        },
        text: row.text.replace(/⁋/g, '').trim(),
        section: row.section,
        row: i + 1,
        ...(row.text.includes('⁋') ? { progression: true } : {}),
      },
    ];
    k++;
  });
}

export function joinTravelRows(rows: readonly SourceRow[], parsed: Parsed) {
  grandSquare(rows, parsed);
  downAndUp(parsed);
  downAndBack(rows, parsed);
  simultaneous(rows, parsed);
  meanwhileRows(rows, parsed);
  hookDirection(rows, parsed);
  singleFileAfterTurn(rows, parsed);
}
