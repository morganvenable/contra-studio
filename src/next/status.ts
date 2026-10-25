/**
 * The corpus check's verdict for one stored dance, in plain words:
 *
 * - unsupported: its formation is not built yet.
 * - partial: some rows are unparsed, or a figure cannot start from where the
 *   previous one leaves the dancers. Those rows are held still.
 * - check: every figure runs, but the physical check (clearance, speed, turn
 *   rate, hand reach) or the progression model reports a problem.
 * - ok: compiles at 3, 4 and 6 couples and passes everything.
 *
 * Problems name the source row ("Row 5 'ricochet hey' isn't drawn yet") so
 * a reader can find it on the ContraDB page.
 */
import { compileNext, formationBuilt, type DanceStatus, type StoredDance } from './dance.ts';
import { verifyDance, type Verdict } from './core/verify.ts';

export interface DanceCheck {
  readonly status: Exclude<DanceStatus, 'unchecked'>;
  readonly problems: readonly string[];
  /** Set when the check settled the formation (plain "Becket": which way round). */
  readonly formation?: string;
  /** Set when the check settled how couples are read at the progression. */
  readonly progression?: StoredDance['progression'];
}

const RANK: Readonly<Record<DanceCheck['status'], number>> = {
  ok: 3,
  check: 2,
  partial: 1,
  unsupported: 0,
};

/**
 * ContraDB's plain "Becket" does not say which way the couples go round.
 * Clockwise is the usual reading; a dance whose own slides and figures take
 * the couples counterclockwise is checked (and stored) as Becket
 * counterclockwise when that is how it works out.
 */
export function checkDance(stored: StoredDance): DanceCheck {
  const usual = checkWay(stored);
  const alternative = COUPLES[stored.progression ?? ''];
  if (usual.status === 'ok' || !alternative) return usual;
  // A minor-set dance whose couples, at the progression, are read as they
  // stand (a robin on the lark's right) rather than as partners, when that
  // is how it works out.
  const couples = checkWay({ ...stored, progression: alternative });
  return RANK[couples.status] > RANK[usual.status]
    ? { ...couples, progression: alternative }
    : usual;
}

const COUPLES: Readonly<Record<string, StoredDance['progression']>> = {
  'minor-set': 'minor-set-couples',
  'minor-set-double': 'minor-set-couples-double',
};

function checkWay(stored: StoredDance): DanceCheck {
  const usual = checkAs(stored);
  const plain = stored.source.formation.toLowerCase().replace(/\s+/g, ' ').trim() === 'becket';
  if (usual.status === 'ok' || !plain || stored.formation !== 'becket') return usual;
  const other = checkAs({ ...stored, formation: 'becket-ccw' });
  return RANK[other.status] > RANK[usual.status] ? { ...other, formation: 'becket-ccw' } : usual;
}

const strict = (stored: StoredDance, couples: number) =>
  compileNext(stored, couples, undefined, { lenient: false });

const quote = (text: string | undefined) => `"${text ?? ''}"`;

/** "Row 5 "neighbors swing"" for a stored call index. */
function rowName(stored: StoredDance, index: number | undefined, fallback?: string) {
  const c = index === undefined ? undefined : stored.figures[index];
  if (!c) return fallback ? `The row ${quote(fallback)}` : 'One row';
  return `Row ${c.row ?? index! + 1} ${quote(c.text)}`;
}

/** Why a figure could not start, without the "Figure 3 (text):" prefix. */
const reason = (message: string) =>
  message
    .replace(/^.*?Figure \d+ \(.*?\): /, '')
    .replace(/^\d+ couples: /, '')
    .replace(/\.$/, '');

/** A physical-check line ("beat 12.35: dancers 3 and 4 are 0.40 m apart") in plain words. */
export function plainPhysical(problem: string): string {
  const close = problem.match(/dancers \d+ and \d+ are ([\d.]+) m apart/);
  if (close) return `two dancers come within ${close[1]} m of each other`;
  const fast = problem.match(/dancer \d+ moves ([\d.]+) m\/beat/);
  if (fast) return `a dancer has to move ${fast[1]} m in one beat, faster than a walk`;
  const spin = problem.match(/dancer \d+ turns ([\d.]+) rad\/beat/);
  if (spin)
    return `a dancer has to turn ${(Number(spin[1]) / (2 * Math.PI)).toFixed(2)} turns in one beat`;
  const reach = problem.match(/hand reach ([\d.]+) m/);
  if (reach) return `a held hand has to stretch ${reach[1]} m, farther than an arm reaches`;
  return problem.replace(/^beat [\d.]+: /, '');
}

// ContraDB names some formations with a gendered gloss in parentheses.
function formationName(raw: string | undefined): string {
  return (raw || 'unknown')
    .replace(/\s*\(.*\)\s*$/, '')
    .replace(/\bccw\b/i, 'counterclockwise')
    .replace(/\bcw\b/i, 'clockwise');
}

function plainVerdict(stored: StoredDance, v: Verdict): string {
  switch (v.kind) {
    case 'physical': {
      const line = (v.problem ?? '').replace(/^\d+ couples: /, '').replace(/ \(.*\)$/, '');
      return `${rowName(stored, v.index, v.figure)}: ${plainPhysical(line)}.`;
    }
    case 'progression':
      return `Couples don't end the round where the progression puts them.`;
    case 'meeting':
      return `Not every couple gets to dance with every other couple.`;
    case 'repeat':
      return `The next time through can't start from where the dancers end: ${reason(v.problem ?? '')}.`;
    default:
      return `${rowName(stored, v.index, v.figure)} can't start from where the dancers are: ${reason(v.problem ?? '')}.`;
  }
}

function checkAs(stored: StoredDance): DanceCheck {
  if (!formationBuilt(stored))
    return {
      status: 'unsupported',
      problems: [`The ${quote(formationName(stored.source.formation))} formation isn't built yet.`],
    };
  const problems: string[] = stored.unparsed.map(
    (u) => `Row ${u.row} ${quote(u.text)} isn't drawn yet.`,
  );
  // Fold leniently to list every figure that cannot start, in order.
  try {
    const lenient = compileNext(stored, 4, undefined, { lenient: true });
    const seen = new Set<string>();
    for (const r of [0, 1]) {
      for (const h of lenient.round(r).held) {
        const call = stored.figures[h.index];
        if (call?.move === 'hold') continue;
        const line = h.progression
          ? `The progression after ${rowName(stored, h.index).toLowerCase()} doesn't work out: ${reason(h.why.replace(/^The progression does not work out: /, ''))}.`
          : `${rowName(stored, h.index)} can't start from where the dancers are: ${reason(h.why)}.`;
        if (!seen.has(line)) problems.push(line);
        seen.add(line);
      }
    }
  } catch (error) {
    problems.push(`The dance can't be put together: ${reason(String(error))}.`);
  }
  if (problems.length) return { status: 'partial', problems };
  const verdict = verifyDance(stored, strict);
  if (verdict.ok) return { status: 'ok', problems: [] };
  return {
    status: verdict.kind === 'compile' ? 'partial' : 'check',
    problems: [plainVerdict(stored, verdict)],
  };
}
