// Import every ContraDB snapshot into the next engine's stored-dance format
// and run the full corpus check, writing:
//   public/dances/<id>.json   one stored dance (FigureCalls + source reference)
//   public/dances/index.json  id, title, author, formation, layout, moves,
//                             status, note
//   docs/next-library-status.json  counts, missing snapshots, blockers ranked
//
// node --experimental-strip-types scripts/next-library.mjs [--only=1,2,3] [--snapshots=<dir>]
//
// Snapshots are read in place: Astra's research folder first, then the
// repo's own test-data/contradb. Nothing is fetched. The check runs in a pool
// of worker threads; --only re-checks a few ids and updates the index.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { normalizeRow } from '../src/next/core/parse.ts';
import { importDance } from '../src/next/import.ts';
import { checkDance } from '../src/next/status.ts';

const ASTRA =
  'C:/Users/morga/OneDrive/Documents/GitHub/contra-studio/contra-studio/research/contradb/snapshots';
const OUT = 'public/dances';
const STATUS_FILE = 'docs/next-library-status.json';

/** Rough figure family for an unparsed row or failing figure, for the ranking. */
const FAMILIES = [
  ['ricochet hey', /ricochet/],
  ['diagonal hey', /\bhey\b.*diagonal|diagonal.*\bhey\b/],
  ['hey (other)', /\bhey\b/],
  ['butterfly whirl', /butterfly whirl/],
  ['star promenade', /star promenade/],
  [
    'ocean wave / long wave',
    /ocean wave|long wave|wave of (?:4|four)|balance (?:the )?wave|balance long wave/,
  ],
  ['poussette', /poussette/],
  ['revolving door', /revolving door/],
  ['cross trails', /cross trails/],
  ['contra corners', /contra corners/],
  ['zig zag', /zig .* zag/],
  ['arch & dive', /\barch\b|\bdive\b/],
  ['figure 8', /figure (?:8|eight)/],
  ['orbit allemande', /orbit/],
  ['gate', /\bgate\b/],
  ['take hands (wave/line set-up)', /take (?:partners|neighbors|hands)/],
  ['stand still / no figure', /^stand still|^while:?$|^_+/],
  ['turn alone / as a couple', /turn alone|turn as a couple/],
  ['diagonal chain / right left through', /diagonal/],
  ['down/up the hall', /\bthe hall\b|down the (?:center|outside)|up the (?:center|outside)/],
  [
    'into the middle / forward & back',
    /into the middle|forward (?:&|and) back|advance|walk forward|lines of four/,
  ],
  ['circle variant', /\bcircle\b/],
  ['petronella', /petronella/],
  ['box circulate', /box circulate/],
  ['square through', /square through/],
  ['promenade', /promenade/],
  ['california twirl', /california twirl/],
  ['box the gnat / swat the flea', /box the gnat|swat the flea/],
  ['mad robin', /mad robin/],
  ['roll away', /roll away/],
  ['gyre', /gyre/],
  ['give & take', /give (?:&|and) take/],
  ['slide along set', /slide (?:left|right)/],
  ['pull by / pass by', /pull by|pass by/],
  ['slice', /slice/],
  ["rory o'more", /rory/],
  ['star variant', /\bstar\b/],
  ['do-si-do variant', /do si do|see saw/],
  ['chain variant', /chain/],
  ['swing variant', /swing/],
  ['allemande variant', /allemande/],
  ['balance variant', /balance/],
];
const family = (text) => FAMILIES.find(([, re]) => re.test(text))?.[0] ?? `other: ${text}`;

/** One stored dance as compact JSON: one figure per line, small on disk. */
function storedJson(stored) {
  const { figures, ...rest } = stored;
  const head = JSON.stringify(rest, null, 1).replace(/\n\s*/g, ' ').slice(0, -1).trimEnd();
  return `${head},\n "figures": [\n${figures.map((f) => `  ${JSON.stringify(f)}`).join(',\n')}\n ]\n}\n`;
}

if (!isMainThread) {
  for (const job of workerData.jobs) {
    const stored = JSON.parse(job);
    let check;
    try {
      check = checkDance(stored);
    } catch (error) {
      check = {
        status: 'partial',
        problems: [`The dance can't be put together: ${error.message}`],
      };
    }
    parentPort.postMessage({ id: stored.id, ...check });
  }
  process.exit(0);
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const astra = args.snapshots ?? ASTRA;
const catalogue = JSON.parse(readFileSync('public/contradb-index.json', 'utf8'));
const only = typeof args.only === 'string' ? new Set(args.only.split(',')) : undefined;

const missing = [];
const fromRepo = [];
const imported = [];
for (const record of catalogue.records) {
  if (only && !only.has(record.id)) continue;
  let path = `${astra}/${record.id}.json`;
  if (!existsSync(path)) {
    missing.push(record.id);
    path = `test-data/contradb/${record.id}.json`;
    if (!existsSync(path)) continue;
    fromRepo.push(record.id);
  }
  const snapshot = JSON.parse(readFileSync(path, 'utf8'));
  const sha256 = createHash('sha256').update(snapshot.html).digest('hex');
  imported.push(importDance(record.id, snapshot, sha256));
}

// Check in parallel.
const started = Date.now();
const threads = Math.max(1, Math.min(cpus().length - 1, 24, imported.length));
const results = new Map();
await Promise.all(
  Array.from({ length: threads }, (_, t) => {
    const jobs = imported.filter((_, i) => i % threads === t).map((d) => JSON.stringify(d));
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: { jobs } });
      worker.on('message', (m) => results.set(m.id, m));
      worker.on('error', reject);
      worker.on('exit', resolve);
    });
  }),
);

mkdirSync(OUT, { recursive: true });
const checked = imported.map((d) => {
  const r = results.get(d.id) ?? {
    status: 'partial',
    problems: ['The corpus check did not finish.'],
  };
  return {
    ...d,
    ...(r.formation ? { formation: r.formation } : {}),
    ...(r.progression ? { progression: r.progression } : {}),
    status: r.status,
    problems: r.problems,
  };
});
for (const d of checked) writeFileSync(`${OUT}/${d.id}.json`, storedJson(d));

// The index: every stored dance, sorted by title.
const entryOf = (d) => ({
  id: d.id,
  title: d.title,
  author: d.author,
  formation: d.source.formation,
  ...(d.formation ? { layout: d.formation } : {}),
  moves: [...new Set(d.figures.map((f) => f.move))].sort(),
  status: d.status,
  ...(d.status !== 'ok' && d.problems.length ? { note: d.problems[0] } : {}),
});
let entries = checked.map(entryOf);
if (only && existsSync(`${OUT}/index.json`)) {
  const fresh = new Map(entries.map((e) => [e.id, e]));
  const old = JSON.parse(readFileSync(`${OUT}/index.json`, 'utf8')).dances;
  entries = old.map((e) => fresh.get(e.id) ?? e);
  for (const e of fresh.values()) if (!old.some((o) => o.id === e.id)) entries.push(e);
}
entries.sort((a, b) => a.title.localeCompare(b.title) || Number(a.id) - Number(b.id));
writeFileSync(
  `${OUT}/index.json`,
  `{"schema":"contra-studio/next-library","version":1,"dances":[\n${entries.map((e) => JSON.stringify(e)).join(',\n')}\n]}\n`,
);

const elapsed = ((Date.now() - started) / 1000).toFixed(0);
for (const d of checked.filter((x) => only)) {
  console.log(
    `${d.status.padEnd(11)} ${d.id.padStart(5)} ${d.title}${d.problems[0] ? ` -- ${d.problems[0]}` : ''}`,
  );
}
if (only) process.exit(0);

// Status file: counts, per formation, missing snapshots, blockers.
const count = (list) => {
  const c = { ok: 0, check: 0, partial: 0, unsupported: 0 };
  for (const d of list) c[d.status]++;
  return c;
};
const byFormation = {};
for (const d of checked) {
  const f = d.source.formation.toLowerCase().replace(/\s+/g, ' ').trim() || '(none)';
  (byFormation[f] ??= []).push(d);
}
const formations = Object.entries(byFormation)
  .map(([f, list]) => ({ formation: f, dances: list.length, ...count(list) }))
  .sort((a, b) => b.dances - a.dances);

// Blockers among built formations: missing figures (unparsed rows), ranked by
// dances each would unlock on its own; then figures that cannot start; then
// figures where the check fails.
const alone = new Map();
const uses = new Map();
const cannotStart = new Map();
const checkFails = new Map();
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
for (const d of checked) {
  if (d.status === 'partial') {
    const fams = new Set(d.unparsed.map((u) => family(normalizeRow(u.text).text)));
    for (const f of fams) bump(uses, f);
    if (fams.size === 1) bump(alone, [...fams][0]);
    if (!fams.size) {
      const m = d.problems[0]?.match(/^Row \d+ "(.*?)" can't start/);
      bump(cannotStart, m ? family(normalizeRow(m[1]).text) : 'progression or other');
    }
  }
  if (d.status === 'check') {
    const m = d.problems[0]?.match(/^Row \d+ "(.*?)"/);
    bump(
      checkFails,
      m ? family(normalizeRow(m[1]).text) : d.problems[0]?.replace(/ \(with.*$/, ''),
    );
  }
}
const ranked = (m, also) =>
  [...m]
    .map(([name, n]) => ({ name, unlocks: n, ...(also ? { uses: also.get(name) ?? n } : {}) }))
    .sort((a, b) => b.unlocks - a.unlocks || (b.uses ?? 0) - (a.uses ?? 0));
const blockersMissing = ranked(alone, uses);
for (const [name, n] of uses)
  if (!alone.has(name)) blockersMissing.push({ name, unlocks: 0, uses: n });
const unsupported = formations
  .filter((f) => f.unsupported)
  .map((f) => ({ formation: f.formation, dances: f.unsupported }));

const status = {
  schema: 'contra-studio/next-library-status',
  version: 1,
  catalogue: catalogue.records.length,
  stored: checked.length,
  counts: count(checked),
  formations,
  missingSnapshots: {
    note: 'Catalogue ids with no snapshot in the research folder; each was read from test-data/contradb instead.',
    ids: missing,
    readFromRepo: fromRepo.length,
    noSnapshotAnywhere: missing.filter((id) => !fromRepo.includes(id)),
  },
  blockers: {
    missingFigures: blockersMissing,
    figuresThatCannotStart: ranked(cannotStart),
    checkFailures: ranked(checkFails),
    unsupportedFormations: unsupported,
  },
};
writeFileSync(STATUS_FILE, JSON.stringify(status, null, 1) + '\n');

console.log(`${checked.length} dances stored and checked in ${elapsed}s on ${threads} threads.`);
console.log(JSON.stringify(status.counts));
console.log('\nBy formation (top 12):');
for (const f of formations.slice(0, 12))
  console.log(
    `  ${String(f.dances).padStart(5)} ${f.formation}: ok ${f.ok}, check ${f.check}, partial ${f.partial}, unsupported ${f.unsupported}`,
  );
console.log(`\nMissing snapshots: ${missing.length} (read from test-data: ${fromRepo.length})`);
console.log('\nMissing figures (dances unlocked alone / dances using it):');
for (const b of blockersMissing.slice(0, 30))
  console.log(`  ${String(b.unlocks).padStart(4)} / ${String(b.uses).padStart(4)}  ${b.name}`);
console.log('\nFigures that cannot start (all rows parsed):');
for (const b of status.blockers.figuresThatCannotStart.slice(0, 15))
  console.log(`  ${String(b.unlocks).padStart(4)}  ${b.name}`);
console.log('\nCheck failures, by figure:');
for (const b of status.blockers.checkFailures.slice(0, 15))
  console.log(`  ${String(b.unlocks).padStart(4)}  ${b.name}`);
