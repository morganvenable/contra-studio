/**
 * ContraDB snapshot -> stored next-engine dance. Every dance imports, working
 * or not: rows no pattern parses become labeled holds so the timeline keeps
 * its shape, and a formation that is not built yet is recorded as such. The
 * status (ok, check, partial, unsupported) is filled in later by the corpus
 * check (status.ts); the importer only reads the source.
 *
 * Pure: no file or network access, so the app, tests and scripts share it.
 */
import type { Progression } from './core/progression.ts';
import { canonicalText } from './core/roles.ts';
import { contraDbRows, decodeEntities, parseRow } from './core/parse.ts';
import type { StoredCall, StoredDance, UnparsedRow } from './dance.ts';
import { FORMATIONS } from './core/formation.ts';

export interface ContraDbSnapshot {
  readonly sourceUrl: string;
  readonly retrievedAt?: string;
  readonly html: string;
}

export interface ContraDbMeta {
  readonly title: string;
  readonly author: string;
  /** Formation as ContraDB writes it ("improper", "Becket ccw" ...). */
  readonly formation: string;
}

const text = (html: string, re: RegExp) =>
  decodeEntities((html.match(re)?.[1] ?? '').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();

export function contraDbMeta(html: string): ContraDbMeta {
  return {
    title: text(html, /dance-show-title">([\s\S]*?)<\/h1>/),
    author: text(html, /dance-show-choreographer">by: ([\s\S]*?)<\/p>/),
    formation: text(html, /dance-show-formation">formation: ([\s\S]*?)<\/p>/),
  };
}

interface Shape {
  readonly formation: string;
  readonly progression: Progression['kind'];
}

/**
 * ContraDB formation text (lowercase, single spaces) -> a built formation.
 * Anything not listed is "unsupported" until its formation is built.
 */
export const FORMATION_TEXT: Readonly<Record<string, Shape>> = {
  improper: { formation: 'improper', progression: 'duple-minor' },
  'duple improper': { formation: 'improper', progression: 'duple-minor' },
  becket: { formation: 'becket', progression: 'minor-set' },
  'becket cw': { formation: 'becket', progression: 'minor-set' },
  'becket clockwise': { formation: 'becket', progression: 'minor-set' },
  proper: { formation: 'proper', progression: 'duple-minor-proper' },
  'duple proper': { formation: 'proper', progression: 'duple-minor-proper' },
  indecent: { formation: 'indecent', progression: 'duple-minor' },
  'duple indecent': { formation: 'indecent', progression: 'duple-minor' },
  'duple neutral': { formation: 'duple-neutral', progression: 'duple-minor' },
  'becket ccw': { formation: 'becket-ccw', progression: 'minor-set' },
  'becket counterclockwise': { formation: 'becket-ccw', progression: 'minor-set' },
  'becket counter-clockwise': { formation: 'becket-ccw', progression: 'minor-set' },
  // Spellings and qualifiers of the formations above (docs/figure-readings.md).
  'improper or proper': { formation: 'improper', progression: 'duple-minor' },
  'improper/proper': { formation: 'improper', progression: 'duple-minor' },
  'duple minor improper': { formation: 'improper', progression: 'duple-minor' },
  'duple improper longways': { formation: 'improper', progression: 'duple-minor' },
  'duple improper contra': { formation: 'improper', progression: 'duple-minor' },
  'duple minor - improper - single progression': {
    formation: 'improper',
    progression: 'duple-minor',
  },
  'improper - waltz tempo': { formation: 'improper', progression: 'duple-minor' },
  imroper: { formation: 'improper', progression: 'duple-minor' },
  'improper⁹': { formation: 'improper', progression: 'duple-minor' },
  'duple minor': { formation: 'improper', progression: 'duple-minor' },
  'all improper': { formation: 'improper', progression: 'duple-minor' },
  'progressed improper': { formation: 'improper', progression: 'duple-minor' },
  'improper progressed': { formation: 'improper', progression: 'duple-minor' },
  'duple improper; begins progressed': { formation: 'improper', progression: 'duple-minor' },
  "improper, but with 1's below 2's": { formation: 'improper', progression: 'duple-minor' },
  beckett: { formation: 'becket', progression: 'minor-set' },
  becketa: { formation: 'becket', progression: 'minor-set' },
  'becket (no matter)': { formation: 'becket', progression: 'minor-set' },
  'becket l': { formation: 'becket', progression: 'minor-set' },
  'duple becket': { formation: 'becket', progression: 'minor-set' },
  'duple minor becket': { formation: 'becket', progression: 'minor-set' },
  'becket ccwkoi': { formation: 'becket-ccw', progression: 'minor-set' },
  'beckett ccw': { formation: 'becket-ccw', progression: 'minor-set' },
  'duple becket (reverse progression)': { formation: 'becket-ccw', progression: 'minor-set' },
  'becket, indecent': { formation: 'becket-indecent', progression: 'minor-set' },
  'becket indecent': { formation: 'becket-indecent', progression: 'minor-set' },
  'indecent becket': { formation: 'becket-indecent', progression: 'minor-set' },
  'becket cw (gents on right, ladies on left)': {
    formation: 'becket-indecent',
    progression: 'minor-set',
  },
  'indecent becket ccw': { formation: 'becket-ccw-indecent', progression: 'minor-set' },
  'becket ccw indecent1': { formation: 'becket-ccw-indecent', progression: 'minor-set' },
  // Double progressions: the figures move couples two places a round.
  'improper, double progression': { formation: 'improper', progression: 'duple-minor-double' },
  'improper - double progression': { formation: 'improper', progression: 'duple-minor-double' },
  'duple neutral, double progression': {
    formation: 'duple-neutral',
    progression: 'duple-minor-double',
  },
  'becket double progression': { formation: 'becket', progression: 'minor-set-double' },
  'beckett double progression': { formation: 'becket', progression: 'minor-set-double' },
  'becket, double progression': { formation: 'becket', progression: 'minor-set-double' },
  'becket - double progression': { formation: 'becket', progression: 'minor-set-double' },
  'becket cw, double progression': { formation: 'becket', progression: 'minor-set-double' },
  'becket cw, dbl prog': { formation: 'becket', progression: 'minor-set-double' },
  'becket, double ccw progression': { formation: 'becket-ccw', progression: 'minor-set-double' },
  'duple becket (reverse double progression)': {
    formation: 'becket-ccw',
    progression: 'minor-set-double',
  },
  // Whole sets: a triplet and longways sets for a few couples.
  triplet: { formation: 'triplet', progression: 'places' },
  'proper triplet': { formation: 'triplet', progression: 'places' },
  'triplet, 1s and 2s improper': { formation: 'triplet', progression: 'places' },
  longways: { formation: 'longways-set', progression: 'places' },
  'longways sets, up to 6 couples': { formation: 'longways-set', progression: 'places' },
  'longways set, 4-6 couples': { formation: 'longways-set', progression: 'places' },
  'longways sets, 4-6 couples': { formation: 'longways-set', progression: 'places' },
  'longways set, no h4': { formation: 'longways-set', progression: 'places' },
  'four couple longways set': { formation: 'longways-set', progression: 'places' },
  // Sets with no ends and lines of four.
  'sicilian circle': { formation: 'sicilian', progression: 'sicilian' },
  'four face four': { formation: 'four-face-four', progression: 'lines' },
  'four facing four': { formation: 'four-face-four', progression: 'lines' },
  // One big ring.
  'circle mixer': { formation: 'circle-mixer', progression: 'mixer' },
  mixer: { formation: 'circle-mixer', progression: 'mixer' },
  circle: { formation: 'circle', progression: 'mixer' },
  // Scatter mixers are drawn as one ring (docs/figure-readings.md).
  'scatter mixer': { formation: 'circle-mixer', progression: 'mixer' },
  'scatter mixer (single)': { formation: 'circle-mixer', progression: 'mixer' },
  'duple scatter mixer': { formation: 'circle-mixer', progression: 'mixer' },
  'three-couple scatter mixer': { formation: 'circle-mixer', progression: 'mixer' },
  // Squares: four couples; partners are found where they stand.
  'square dance': { formation: 'square', progression: 'mixer' },
  'square break': { formation: 'square', progression: 'mixer' },
  'square dance break': { formation: 'square', progression: 'mixer' },
  'four couple square': { formation: 'square', progression: 'mixer' },
  square: { formation: 'square', progression: 'mixer' },
  // Zoom contras for one couple are drawn in an improper set.
  'one couple': { formation: 'improper', progression: 'duple-minor' },
  singlet: { formation: 'improper', progression: 'duple-minor' },
  'solo/couple': { formation: 'improper', progression: 'duple-minor' },
  // Triple minor and its relatives, drawn as one minor set of three couples.
  'triple minor': { formation: 'triple-minor', progression: 'places' },
  'triple proper': { formation: 'triple-minor', progression: 'places' },
  'triple minor dutribecket': { formation: 'triple-minor', progression: 'places' },
  'triad (triple minor dutribecket)': { formation: 'triple-minor', progression: 'places' },
  'triple minor, triad formation': { formation: 'triple-minor', progression: 'places' },
  triad: { formation: 'triple-minor', progression: 'places' },
  // One-off qualifiers of built formations (docs/figure-readings.md).
  'indecent becket cw gents change place with partner': {
    formation: 'becket-indecent',
    progression: 'minor-set',
  },
  'becket men in center left hands, right hand to partner in ocean of four': {
    formation: 'becket',
    progression: 'minor-set',
  },
  'quadruple minor becket': { formation: 'becket', progression: 'minor-set' },
  'becket quadruplet': { formation: 'becket', progression: 'minor-set' },
  'sawtooth cw': { formation: 'becket', progression: 'minor-set' },
  'cross contra': { formation: 'improper', progression: 'duple-minor' },
  'cross contra - improper then ladle one and gentlespoon two trade places': {
    formation: 'improper',
    progression: 'duple-minor',
  },
  'cross contra - improper then ladle one and ladle two trade places': {
    formation: 'improper',
    progression: 'duple-minor',
  },
  'long waves, larks facing out': { formation: 'improper', progression: 'duple-minor' },
  'proper, ladles traded': { formation: 'proper', progression: 'duple-minor-proper' },
  'improper, reverse progression': { formation: 'improper', progression: 'duple-minor' },
  'improper reverse progression': { formation: 'improper', progression: 'duple-minor' },
  'duple indecent (reverse progression)': { formation: 'indecent', progression: 'duple-minor' },
  'contra mixer': { formation: 'improper', progression: 'duple-minor' },
  'duple mixer': { formation: 'improper', progression: 'duple-minor' },
  'proper mixer': { formation: 'proper', progression: 'duple-minor-proper' },
  'becket mixer': { formation: 'becket', progression: 'minor-set' },
  'quadruple minor': { formation: 'square', progression: 'mixer' },
  'grid square': { formation: 'square', progression: 'mixer' },
  'square with ninepin': { formation: 'square', progression: 'mixer' },
  'five couple horseshoe': { formation: 'circle', progression: 'mixer' },
  // Lines of three facing lines of three round a circle.
  'three face three': { formation: 'three-face-three', progression: 'trios' },
  'three-face-three': { formation: 'three-face-three', progression: 'trios' },
  '3 face 3': { formation: 'three-face-three', progression: 'trios' },
  'three facing three': { formation: 'three-face-three', progression: 'trios' },
  'three-facing-three': { formation: 'three-face-three', progression: 'trios' },
};

export function shapeOf(formation: string): Shape | undefined {
  return FORMATION_TEXT[formation.toLowerCase().replace(/\s+/g, ' ').trim()];
}

/**
 * The progression kind: the formation's, made double when the source marks
 * two progressions in one time through (the figures carry each couple two
 * places).
 */
function progressionOf(shape: Shape | undefined, figures: readonly StoredCall[]) {
  if (!shape) return null;
  const marks = figures.filter((c) => c.progression).length;
  const double: Partial<Record<Progression['kind'], Progression['kind']>> = {
    'duple-minor': 'duple-minor-double',
    'minor-set': 'minor-set-double',
    'duple-minor-proper': 'duple-minor-proper-double',
  };
  return marks === 2 ? (double[shape.progression] ?? shape.progression) : shape.progression;
}

/** Usual answers the parser filled in, listed so a reviewer can change them. */
const CHOICES: readonly (readonly [(c: StoredCall) => boolean, string])[] = [
  [
    (c) => c.move === 'rory' && c.params.spin === 'full',
    "Rory O'More spins one full turn in the travel direction (the usual styling).",
  ],
  [
    (c) => c.move === 'balance' && c.params.formation === 'wave' && !!c.params.first,
    'The balance before each Rory steps toward the slide direction first.',
  ],
  [
    (c) => c.move === 'pass-through' && c.params.shoulder === 'right',
    'Pass through goes by right shoulders.',
  ],
  [
    (c) => c.move === 'pass-through' && !c.params.axis,
    'A pass through from a ring goes along the set, to the dancer on your own side.',
  ],
  [(c) => c.move === 'slice', 'Slice: half the counts on the diagonal, half straight back.'],
  [
    (c) => c.move === 'balance' && c.params.formation === 'pair' && c.params.hand === 'both',
    'A balance with a partner or neighbor holds both hands.',
  ],
  [
    (c) => c.move === 'star' && !c.params.grip,
    'A star with no grip named is a basket star (wrist grip).',
  ],
  [
    (c) => c.move === 'swing' && /long swing/i.test(c.text ?? ''),
    'A long swing is drawn as an ordinary swing.',
  ],
  [
    (c) => c.move === 'swing' && !!c.params.meltdown && c.beats >= 12,
    'A meltdown swing starts with 4 beats of right-shoulder round, then swings.',
  ],
  [
    (c) => c.move === 'swing' && !!c.params.meltdown && c.beats < 12,
    'A meltdown swing shorter than 12 beats spends a third of it in the right-shoulder round.',
  ],
  [
    (c) => c.move === 'pass-by' && /^square through/i.test(c.text ?? ''),
    'Square through: each balance takes 4 beats and each pull by 2.',
  ],
  [
    (c) => c.move === 'give-and-take',
    'Give & take: half the beats to cross, half to back home holding both hands.',
  ],
  [
    (c) => c.move === 'gyre' && !c.params.shoulder,
    'A gyre goes by the right shoulder, facing each other, with no hands.',
  ],
  [
    (c) => c.move === 'box-circulate',
    'Long waves form during the balance before each box circulate: crossers face in, loopers face out; hands join only where they reach.',
  ],
  [
    (c) => c.move === 'slice' && /long lines slice/i.test(c.text ?? ''),
    'Long lines slice left & back is drawn as a slice: couples step diagonally left, then straight back.',
  ],
  [
    (c) => c.move === 'hey' && /take (?:right|left) hands/i.test(c.text ?? ''),
    'Taking hands at the end of a hey is left to the long waves that follow.',
  ],
  [
    (c) => c.move === 'swing' && c.params.end === 'down',
    'The 1s end their swing side by side in the middle of the set facing down, the way they progress.',
  ],
  [
    (c) => c.move === 'swing' && /end facing down/i.test(c.text ?? ''),
    'A swing that ends facing down the hall is drawn ending facing across; the down the hall that follows turns the lines.',
  ],
];

/**
 * Rows that only lead into the next row join it, so the pair is one call
 * spanning both rows' beats (labeled with both rows' text):
 * - "larks take partners" right before "partners swing": the larks take
 *   their partners into the swing, so the swing starts that many beats early.
 * - A zero-beat "form an ocean wave - ..." right before "balance the wave":
 *   the wave forms as the balance starts.
 * A lead-in with nothing to join is a row the engine cannot draw.
 */
function joinLeadIns(parsed: (StoredCall[] | Error)[]) {
  const only = (i: number) => {
    const calls = parsed[i];
    return Array.isArray(calls) && calls.length === 1 ? calls[0] : undefined;
  };
  for (let i = 0; i < parsed.length; i++) {
    const lead = only(i);
    if (!lead || (lead.move !== 'take' && !(lead.move === 'ocean-wave' && lead.beats === 0)))
      continue;
    const after = parsed[i + 1];
    const next = Array.isArray(after) ? after : undefined;
    const first = next?.[0];
    const text = `${lead.text}, ${first?.text}`;
    if (lead.move === 'take' && first?.move === 'swing' && first.params.who === lead.params.whom) {
      next![0] = { ...first!, beats: first.beats + lead.beats, text, row: lead.row };
      parsed[i] = [];
    } else if (
      lead.move === 'ocean-wave' &&
      first?.move === 'balance' &&
      first.params.formation === 'wave'
    ) {
      const params = { ...lead.params, balance: true };
      next![0] = { ...lead, params, beats: first.beats, text, row: lead.row };
      parsed[i] = [];
    } else {
      parsed[i] = new Error(
        lead.move === 'take'
          ? 'Taking hands leads into a swing with them; none follows.'
          : 'A zero-beat ocean wave leads into a balance of the wave; none follows.',
      );
    }
  }
}

/**
 * Import one snapshot. `sha256` is the hex hash of `snapshot.html` (the
 * caller hashes; this module stays free of Node APIs).
 */
export function importDance(id: string, snapshot: ContraDbSnapshot, sha256: string): StoredDance {
  const html = snapshot.html;
  const meta = contraDbMeta(html);
  const shape = shapeOf(meta.formation);
  const rows = contraDbRows(html);
  const figures: StoredCall[] = [];
  const unparsed: UnparsedRow[] = [];
  const parts: { name: string; bars: number }[] = [];
  const beatsOf = (beats: number) => (Number.isFinite(beats) && beats > 0 ? beats : 0);
  // Parse every row first, so a lead-in row can join the row after it.
  const parsed: (StoredCall[] | Error)[] = rows.map((row, i) => {
    const beats = beatsOf(row.beats);
    try {
      if (!beats && row.beats !== 0) throw new Error('The row has no beat count.');
      return parseRow({ ...row, beats }).map((c) => ({ ...c, section: row.section, row: i + 1 }));
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
  });
  joinLeadIns(parsed);
  rows.forEach((row, i) => {
    const number = i + 1;
    const beats = beatsOf(row.beats);
    const name = row.section ?? 'A1';
    if (parts.at(-1)?.name !== name) parts.push({ name, bars: 0 });
    parts.at(-1)!.bars += beats / 2;
    const label = canonicalText(row.text.replace(/⁋/g, '').replace(/\s+/g, ' ').trim());
    try {
      const calls = parsed[i];
      if (calls instanceof Error) throw calls;
      if (calls.some((c) => !(c.beats > 0)))
        throw new Error(`${beats} beats is too short for this row's parts.`);
      figures.push(...calls);
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error);
      unparsed.push({ row: number, text: label, why });
      if (beats > 0)
        figures.push({
          move: 'hold',
          beats,
          params: { reason: 'unparsed' },
          text: label,
          section: row.section,
          row: number,
          ...(row.text.includes('⁋') ? { progression: true } : {}),
        });
    }
  });
  // "Same four": whoever the row before named.
  figures.forEach((c, i) => {
    const among = (c.params as { among?: string[] }).among;
    if (!among?.includes('@same')) return;
    const before = i > 0 ? (figures[i - 1].params as { among?: string[] }).among : undefined;
    const rest = among.filter((a) => a !== '@same');
    const named = [...rest, ...(before ?? [])];
    const { among: _drop, ...params } = c.params as Record<string, unknown>;
    figures[i] = { ...c, params: named.length ? { ...params, among: named } : params };
  });
  // Calls that mean another move in this formation ("long lines" facing along the hall).
  const moves = shape ? FORMATIONS[shape.formation]?.moves : undefined;
  if (moves)
    figures.forEach((c, i) => {
      if (moves[c.move]) figures[i] = { ...c, move: moves[c.move] };
    });
  const choices = CHOICES.filter(([test]) => figures.some(test)).map(([, t]) => t);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id,
    title: meta.title,
    author: meta.author,
    formation: shape?.formation ?? null,
    progression: progressionOf(shape, figures),
    music: { meter: '2/4', parts, times: 'repeat' },
    source: {
      url: snapshot.sourceUrl,
      formation: meta.formation,
      ...(snapshot.retrievedAt ? { retrievedAt: snapshot.retrievedAt } : {}),
      sha256,
      ...(html.includes('sketchbook') ? { status: 'sketchbook' } : {}),
    },
    status: 'unchecked',
    problems: [],
    unparsed,
    choices,
    figures,
  };
}
