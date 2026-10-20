import type { Dance, Figure, Relation } from './types';
import { validateDance, type ValidationReport } from './validator.ts';
import { parseHeyNotation } from './hey.ts';

/** Lossless source layer. Never confuse a parsed card with validated choreography. */
export interface SourceRecord {
  format: 'callers-box-json' | 'dance-card-text';
  original: string;
  fields: Record<string, unknown>;
  title: string;
  author: string;
  formation: string;
  progression: string;
  permission?: string;
  status?: string;
  sourceUrl?: string;
  phraseStructure: string;
}
export interface ParsedClause {
  phrase: string;
  source: string;
  line: number;
  beats?: number;
  figure?: Figure;
  status: 'supported' | 'unsupported' | 'ambiguous';
  diagnostic?: string;
}
export interface ImportResult {
  dance?: Dance;
  errors: string[];
  warnings: string[];
  record?: SourceRecord;
  clauses?: ParsedClause[];
  validation?: ValidationReport;
}
export type ImportedDance = Dance & { sourceText: string; sourceRecord: SourceRecord; sourceClauses: ParsedClause[] };
export interface ImportCapabilities { enableBecket?: boolean }
const BASE = 'https://www.ibiblio.org/contradance/thecallersbox/dance.php';

/** Only the actual public source and a single positive decimal record ID are accepted. */
export function callersBoxExportUrl(input: string): string | undefined {
  try {
    const url = new URL(input.trim());
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return;
    if (!['www.ibiblio.org', 'ibiblio.org'].includes(url.hostname.toLowerCase())) return;
    if (url.pathname !== '/contradance/thecallersbox/dance.php') return;
    const ids = url.searchParams.getAll('id');
    if (ids.length !== 1 || !/^[1-9]\d{0,9}$/.test(ids[0])) return;
    return `${BASE}?id=${ids[0]}&format=JSON`;
  } catch { return; }
}

/** Static deployment intentionally has no untrusted proxy. Official endpoint currently lacks CORS. */
export async function fetchRecord(input: string): Promise<ImportResult> {
  const url = callersBoxExportUrl(input);
  return { errors: [url
    ? 'This source does not currently allow cross-origin browser downloads. Open its official JSON download, then upload or paste that JSON here.'
    : 'Use an exact Caller’s Box record URL with a positive numeric id.'], warnings: [] };
}

const normalize = (s: string) => s.replace(/(\d)([½¼¾])/g, '$1 & $2').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/¾/g, '3/4').replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/\s+/g, ' ').trim();
function quantity(s?: string, fallback = 1): number | undefined {
  if (!s) return fallback;
  const clean = s.trim();
  if (/^\d+(?:\.\d+)?$/.test(clean)) return Number(clean);
  const mixed = clean.match(/^(?:(\d+)\s*(?:&|and)\s*)?(\d+)\/(\d+)$/);
  if (mixed && Number(mixed[3])) return Number(mixed[1] || 0) + Number(mixed[2]) / Number(mixed[3]);
  return undefined;
}
function relation(s: string): Relation | undefined {
  if (/^(?:partner|partners|p)$/i.test(s)) return 'partner';
  if (/^(?:neighbor|neighbors|neighbour|neighbours|n)$/i.test(s)) return 'neighbor';
  if (/^(?:men|gents|larks)$/i.test(s)) return 'larks';
  if (/^(?:women|ladies|robins|ravens)$/i.test(s)) return 'robins';
  return undefined;
}

/** Whole-clause matching is deliberate: extra words cannot silently disappear. */
function parseFigure(source: string, phrase: string, line: number, becket = false): ParsedClause {
  const result: ParsedClause = { phrase, source, line, status: 'unsupported' };
  const timed = normalize(source).match(/^\((\d+(?:\.\d+)?)\)\s+(.+)$/);
  if (!timed) return { ...result, status: 'ambiguous', diagnostic: 'Explicit beat count required, for example (8) Partner do-si-do.' };
  const beats = Number(timed[1]);
  result.beats = beats;
  if (!(beats > 0 && beats <= 64)) return { ...result, diagnostic: 'Beat count must be greater than zero and no more than 64.' };
  const body = timed[2].replace(/\.$/, '');
  const base = { id: `import-${line}`, beats, label: body, confidence: 'approximate' as const };
  let figure: Figure | undefined;
  let m: RegExpMatchArray | null;
  if (becket && /^Shift left$/i.test(body)) {
    figure = { ...base, kind: 'becket-shift', direction: 'left' };
  } else if (becket && /^Hey\b/.test(body)) {
    try {
      const notation = `(${beats}) ${body}`, hey = parseHeyNotation(notation);
      if (beats !== 16) return { ...result, diagnostic: 'This complete-hey entry/exit adapter currently requires its source to allocate 16 beats.' };
      if (hey.fraction !== 1 || hey.tokens.some(t => t.completion !== 'complete')) return { ...result, diagnostic: 'Partial hey exits need a source-specific shoulder-to-shoulder continuation adapter.' };
      if (hey.tokens.some(t => t.selector === 'neighbor' && t.neighborOrdinal !== 1)) return { ...result, diagnostic: 'Future and previous hey neighbors need an explicit relationship-epoch resolver.' };
      figure = { ...base, kind: 'hey', who: 'all', notation, entry: 'side-couples', exit: 'same-slots-partner-balance', notes: 'Exact source pass order retained. Entry, exit, and pass timing are an explicit animation interpretation.' };
    } catch (e) { return { ...result, diagnostic: e instanceof Error ? e.message : 'Unsupported complete hey notation.' }; }
  } else if ((m = body.match(/^(Partner|Partners|Neighbor|Neighbors|Neighbour|Neighbours|Men|Gents|Larks|Women|Ladies|Robins|Ravens) (balance|swing)$/i))) {
    figure = { ...base, kind: m[2].toLowerCase() as 'balance' | 'swing', who: relation(m[1]) };
  } else if (/^Balance (?:the )?ring$/i.test(body)) {
    figure = { ...base, kind: 'balance', who: 'all' };
  } else if ((m = body.match(/^Circle (left|right)(?: (\d+(?:\.\d+)?|\d+\/\d+|\d+\s*(?:&|and)\s*\d+\/\d+))?$/i))) {
    figure = { ...base, kind: 'circle', who: 'all', direction: m[1].toLowerCase() as 'left' | 'right', amount: quantity(m[2]) };
  } else if ((m = body.match(/^Star (left|right)(?: (\d+(?:\.\d+)?|\d+\/\d+|\d+\s*(?:&|and)\s*\d+\/\d+))?$/i))) {
    figure = { ...base, kind: 'star', who: 'all', direction: m[1].toLowerCase() as 'left' | 'right', amount: quantity(m[2]) };
  } else if ((m = body.match(/^(Partner|Partners|Neighbor|Neighbors|Men|Gents|Larks|Women|Ladies|Robins|Ravens) allemande (left|right)(?: (\d+(?:\.\d+)?|\d+\/\d+|\d+\s*(?:&|and)\s*\d+\/\d+))?$/i))) {
    figure = { ...base, kind: 'allemande', who: relation(m[1]), direction: m[2].toLowerCase() as 'left' | 'right', amount: quantity(m[3]) };
  } else if ((m = body.match(/^(Partner|Partners|Neighbor|Neighbors|Men|Gents|Larks|Women|Ladies|Robins|Ravens) (?:do-si-do|dosido|do si do)(?: (\d+(?:\.\d+)?|\d+\/\d+|\d+\s*(?:&|and)\s*\d+\/\d+))?$/i))) {
    figure = { ...base, kind: 'do-si-do', who: relation(m[1]), direction: 'right', amount: quantity(m[2]) };
  } else if ((m = body.match(/^(?:Ladies|Robins|Ravens) chain to (neighbor|partner)$/i))) {
    figure = { ...base, kind: 'robins-chain', who: m[1].toLowerCase() as Relation, notes: 'Robins pull by right; courtesy turn with the named receiving dancer.' };
  } else if (/^(?:In )?long lines,? (?:go )?forward and back$/i.test(body)) {
    figure = { ...base, kind: 'long-lines', who: 'all' };
  } else if ((m = body.match(/^Right and left through with (partner|neighbor)$/i))) {
    figure = { ...base, kind: 'right-left-through', who: m[1].toLowerCase() as Relation };
  } else if (/^Pass through along \(NR\)$/i.test(body)) {
    figure = { ...base, kind: 'pass-through', who: 'neighbor', direction: 'right', progression: true };
  } else if (/^Petronella turn$/i.test(body)) {
    figure = { ...base, kind: 'petronella', who: 'all', direction: 'right', amount: 0.25 };
  }
  if (figure) {
    const deferred = ['right-left-through', 'pass-through', 'petronella'].includes(figure.kind) || (figure.kind === 'balance' && figure.who === 'all') || (figure.kind === 'swing' && figure.who !== 'partner' && figure.who !== 'neighbor') || (figure.kind === 'do-si-do' && figure.amount !== 1);
    if (deferred) return { ...result, diagnostic: 'Recognized terminology, but this participant/amount/contact variant has no validated motion adapter yet.' };
    if (['circle', 'star', 'allemande', 'do-si-do'].includes(figure.kind) && figure.amount === undefined) return { ...result, diagnostic: 'Invalid or ambiguous turn fraction.' };
    if (figure.amount !== undefined && (!(figure.amount > 0) || figure.amount > 2)) {
      return { ...result, diagnostic: 'This turn amount is outside the current motion model.' };
    }
    return { ...result, status: 'supported', figure };
  }
  let diagnostic = 'This entire clause has no verified motion adapter yet; its original wording is retained.';
  if (/\bN(?:[0-9]|-)|\bshadow\b|\bsame-role\b/i.test(body)) diagnostic = 'Future/previous neighbors, shadows, and special-role relations need an explicit topology adapter.';
  else if (/\bhey\b/i.test(body)) diagnostic = 'Hey pass order and partial passes require a dedicated path adapter; this card cannot yet be played faithfully.';
  else if (/;|\|\||\/\/|\[|\]|\?/.test(body)) diagnostic = 'Compound, simultaneous, conditional, or qualified clauses need structured review; no subclause was discarded.';
  else if (/chain$/i.test(body)) diagnostic = 'Specify the receiving dancer: “Robins chain to neighbor” or “Robins chain to partner”.';
  return { ...result, diagnostic };
}

function stringField(fields: Record<string, unknown>, key: string): string {
  const value = fields[key]; return typeof value === 'string' ? value : '';
}

export function parseDance(text: string, capabilities: ImportCapabilities = { enableBecket: true }): ImportResult {
  const errors: string[] = [], warnings: string[] = [];
  const input = text.trim();
  if (!input) return { errors: ['Paste a Caller’s Box JSON export or a timed dance card.'], warnings };
  if (callersBoxExportUrl(input)) return { errors: ['This is a source link. Download its JSON export, then upload or paste it here.'], warnings };
  if (input.length > 500_000) return { errors: ['The import is too large. Import one dance record under 500 KB.'], warnings };
  let record: SourceRecord;
  let rawClauses: { phrase: string; source: string; line: number }[] = [];
  if (input.startsWith('{') || input.startsWith('[')) {
    let value: unknown;
    try { value = JSON.parse(input); } catch { return { errors: ['This is not valid JSON.'], warnings }; }
    if (!value || Array.isArray(value) || typeof value !== 'object') return { errors: ['Import one Caller’s Box JSON object, not an array.'], warnings };
    const fields = value as Record<string, unknown>;
    if (!Array.isArray(fields.phrases)) return { errors: ['Expected the official Caller’s Box phrases array.'], warnings };
    const id = stringField(fields, 'ID');
    record = {
      format: 'callers-box-json', original: text, fields,
      title: stringField(fields, 'Name'),
      author: Array.isArray(fields.Authors) ? fields.Authors.filter((v): v is string => typeof v === 'string').join(', ') : '',
      formation: stringField(fields, 'FormationBase'), progression: stringField(fields, 'Progression'),
      permission: stringField(fields, 'Permission'), status: stringField(fields, 'Status'),
      phraseStructure: stringField(fields, 'PhraseStructure') || '4*8*2',
      sourceUrl: /^[1-9]\d{0,9}$/.test(id) ? `${BASE}?id=${id}` : undefined,
    };
    if (record.permission !== 'full') errors.push(`Source permission is “${record.permission || 'unspecified'}”. Restricted, omitted, or unresolved choreography permission cannot be animated from this record.`);
    for (const key of ['Permission','Status','FormationDetail','Direction','Mixer?','Virtual?']) if (fields[key] !== undefined && typeof fields[key] !== 'string') errors.push(`${key} must be a source string; an unexpected semantic field type cannot be ignored.`);
    if (fields.CallingNotes !== undefined && (!Array.isArray(fields.CallingNotes) || fields.CallingNotes.some(n => typeof n !== 'string'))) errors.push('CallingNotes must be an array of source strings; unresolved instructions cannot be ignored.');
    if (Array.isArray(fields.CallingNotes) && fields.CallingNotes.some(n => typeof n === 'string' && n.trim())) warnings.push('The source has calling notes that may affect interpretation; they are preserved, but not compiled into motion.');
    if (record.status) warnings.push(`Source status: ${record.status}. Review the original record before use.`);
    let line = 0;
    for (const entry of fields.phrases) {
      if (!entry || typeof entry !== 'object' || !Array.isArray(entry.figures) || typeof entry.name !== 'string') {
        errors.push('Each phrase must have a name and an array of figure strings.'); continue;
      }
      for (const clause of entry.figures) {
        if (typeof clause !== 'string') { errors.push('Figure entries must be strings.'); continue; }
        rawClauses.push({ phrase: entry.name, source: clause, line: ++line });
      }
    }
    if (!rawClauses.length) errors.push('No public figure text was provided. The source may allow searching without displaying its figures.');
    if (stringField(fields, 'FormationDetail')) errors.push('FormationDetail has additional starting requirements. They need a formation adapter before playback.');
    if (stringField(fields, 'Mixer?') || stringField(fields, 'Virtual?')) errors.push('Mixer and virtual-dance identity rules are not supported by this engine.');
  } else {
    const fields: Record<string, unknown> = {};
    let phrase = '', title = '', author = '', formation = '', progression = '', sourceUrl: string | undefined;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;
      let match: RegExpMatchArray | null;
      if ((match = line.match(/^by\s+(.+)$/i))) { author = match[1]; continue; }
      if ((match = line.match(/^(Title|Name|Author|Formation|FormationBase|Progression|Direction|Circulation|Source|PhraseStructure):\s*(.*)$/i))) {
        const key = match[1].toLowerCase(), val = match[2].trim(); fields[key] = val;
        if (key === 'title' || key === 'name') title = val;
        else if (key === 'author') author = val;
        else if (key === 'formation' || key === 'formationbase') formation = val;
        else if (key === 'progression') progression = val;
        else if (key === 'source') {
          const checked = callersBoxExportUrl(val);
          if (checked) sourceUrl = checked.replace('&format=JSON', '');
          else warnings.push('Source URL was retained in the card but is not a verified Caller’s Box record link.');
        }
        continue;
      }
      if ((match = line.match(/^(A1|A2|B1|B2|C1|C2|\d+[ABC][12]):?\s*(.*)$/i))) {
        phrase = match[1].toUpperCase(); line = match[2]; if (!line) continue;
      }
      if (!title && !phrase && !line.startsWith('(')) { title = line; continue; }
      // A copied HTML row can contain several explicitly timed clauses. Parenthetical notes
      // which do not start with a beat number are not split or thrown away.
      const segments = line.split(/\s+(?=\(\d+(?:\.\d+)?\)\s)/);
      for (const segment of segments) rawClauses.push({ phrase, source: segment, line: i + 1 });
    }
    record = { format: 'dance-card-text', original: text, fields, title, author, formation, progression,
      phraseStructure: typeof fields.phrasestructure === 'string' ? fields.phrasestructure : '4*8*2', sourceUrl };
    if (!progression) errors.push('Specify Progression: Single. The engine cannot infer progression from figure names alone.');
  }
  const isBecket = /^(?:duple(?: minor)?\s*[-,]?\s*)?becket$/i.test(record.formation.trim());
  const becket = isBecket && capabilities.enableBecket === true;
  const clauses = rawClauses.map(c => parseFigure(c.source, c.phrase, c.line, becket));
  if (!record.title) errors.push('A dance title is required.');
  if (isBecket && !becket) errors.push('Becket recognition is staged for review; its complete-dance adapter is not enabled in this importer yet.');
  else if (!becket && !/^(?:duple(?: minor)?\s*[-,]?\s*)?improper$/i.test(record.formation.trim())) {
    errors.push(`Formation “${record.formation || 'unspecified'}” has no current adapter. This engine supports explicit duple improper formation only.`);
  }
  if (becket) {
    const direction = record.format === 'callers-box-json' ? stringField(record.fields, 'Direction') : stringField(record.fields, 'direction') || stringField(record.fields, 'circulation');
    if (!/^CW$/i.test(direction)) errors.push('Becket circulation must be explicitly CW. Missing, CCW, and other circulation variants are not coerced.');
    if (Array.isArray(record.fields.CallingNotes) && record.fields.CallingNotes.some(n => typeof n === 'string' && n.trim())) errors.push('This Becket record has unresolved calling-note instructions. They are retained and need structured review before playback.');
    if (clauses[0]?.figure?.kind !== 'becket-shift' || clauses.slice(1).some(c => c.figure?.kind === 'becket-shift')) errors.push('This Becket adapter requires exactly one opening left shift; other progression events need a topology adapter.');
    for (const [i,c] of clauses.entries()) if (c.figure?.kind === 'hey' && !(clauses[i+1]?.figure?.kind === 'balance' && clauses[i+1].figure?.who === 'partner')) errors.push('The complete-hey exit currently requires the following figure to be an explicit partner balance. Other exits are retained but not guessed.');
  }
  if (!isBecket && record.format === 'callers-box-json' && stringField(record.fields, 'Direction')) errors.push('This improper adapter does not interpret an additional source Direction qualifier. It is retained for review.');
  if (!record.progression && record.format === 'callers-box-json') errors.push('The source does not specify progression. It must be resolved before this single-progression engine can play it.');
  if (record.progression && !/^Single$/i.test(record.progression.trim())) errors.push(`Progression “${record.progression}” needs a dedicated model; only single-progression cards are supported here.`);
  if (record.format === 'callers-box-json' && record.fields.PhraseStructure !== undefined && typeof record.fields.PhraseStructure !== 'string') errors.push('PhraseStructure must be a source string; its timing cannot be inferred from an unexpected data type.');
  if (record.phraseStructure.replace(/\s/g, '') !== '4*8*2') errors.push(`Phrase structure “${record.phraseStructure}” is preserved but cannot yet be compiled into this 64-beat engine.`);
  if (/broken/i.test(record.status || '')) errors.push('The source marks this dance broken. Resolve its choreography before playback.');
  for (const clause of clauses) if (clause.status !== 'supported') errors.push(`${clause.phrase || 'Unphrased'}, line ${clause.line}: ${clause.diagnostic} [${clause.source}]`);
  const phraseOrder = clauses.map(c => c.phrase.toUpperCase()).filter((p, i, arr) => i === 0 || p !== arr[i - 1]);
  if (phraseOrder.join(',') !== 'A1,A2,B1,B2') errors.push('Phrases must appear once in A1, A2, B1, B2 order. No phrase was silently reordered.');
  for (const phrase of ['A1', 'A2', 'B1', 'B2']) {
    const selected = clauses.filter(c => c.phrase.toUpperCase() === phrase);
    const beats = selected.reduce((n, c) => n + (c.beats || 0), 0);
    if (beats !== 16) errors.push(`${phrase} has ${beats} counted beats; expected 16. No timing was silently stretched.`);
  }
  if (clauses.some(c => !['A1', 'A2', 'B1', 'B2'].includes(c.phrase.toUpperCase()))) errors.push('Every figure needs an explicit A1, A2, B1, or B2 phrase.');
  if (!clauses.length) errors.push('No timed figures were found.');
  warnings.push('Recognition is not choreography validation. Review participants, turn amounts, final positions, and end effects. Motion is an illustrative model, not a captured performance.');
  warnings.push('Source wording and authorship are preserved. Display permission on the source is not a blanket republication license.');
  const result: ImportResult = { errors, warnings, record, clauses };
  if (!errors.length) {
    const dance: ImportedDance = {
      id: `import-${String(record.fields.ID || record.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`,
      title: record.title, author: record.author || 'Unspecified author', formation: becket ? 'becket' : 'duple-improper', ...(becket ? { circulation: 'cw' as const } : {}), sourceUrl: record.sourceUrl,
      description: 'Imported dance card. Supported figure vocabulary; choreography requires review.',
      figures: clauses.map(c => c.figure!), notes: warnings.slice(), verified: false,
      sourceText: text, sourceRecord: record, sourceClauses: clauses,
    };
    const validation = validateDance(dance);
    result.validation = validation;
    for (const diagnostic of validation.diagnostics) {
      const message = `Motion check: ${diagnostic.message}`;
      if (diagnostic.severity === 'error') errors.push(message);
      else warnings.push(message);
    }
    if (validation.playable) {
      const sourceNotes = Array.isArray(record.fields.CallingNotes) ? record.fields.CallingNotes.filter((n): n is string => typeof n === 'string' && Boolean(n.trim())).map(n => `Original calling note (not compiled): ${n}`) : [];
      dance.notes = [...warnings, ...sourceNotes]; result.dance = dance;
    }
  }
  return result;
}
export const parseDanceText = parseDance;
