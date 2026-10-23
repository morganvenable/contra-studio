// Coverage of the 196 Ready dances on the next engine. For each dance:
// supported (stored and passing), parses but fails the corpus check (and
// why), or the first row no pattern parses. Then the missing figures, ranked
// by how many dances each would unlock on its own.
// node --experimental-strip-types scripts/next-coverage.mjs [--json]
import { READY_LIBRARY } from '../src/ready-library.ts';
import { contraDbRows, normalizeRow, parseRow } from '../src/next/core/parse.ts';
import { compileNext } from '../src/next/dance.ts';
import { verifyDance } from '../src/next/core/verify.ts';
import { buildStored, snapshotOf } from './next-dances.mjs';

/** Rough figure name for an unparsed row, for the ranking. */
const FAMILIES = [
  ['hey', /\bhey\b/],
  ['down/up the hall', /\bthe hall\b/],
  ['box circulate / long waves', /box circulate|long waves|ocean wave/],
  ['square through', /square through/],
  ['petronella', /petronella/],
  ['promenade', /promenade/],
  ['california twirl', /california twirl/],
  ['box the gnat / swat the flea', /box the gnat|swat the flea/],
  ['mad robin', /mad robin/],
  ['roll away', /roll away/],
  ['gyre', /gyre/],
  ['give & take', /give (?:&|and) take/],
  ['slide along set', /slide (?:left|right) along/],
  ['pull by / pass by', /pull by|pass by/],
  ['slice', /slice/],
  ["rory o'more", /rory/],
  ['star', /\bstar\b/],
  ['do-si-do variant', /do si do/],
  ['chain variant', /chain/],
  ['swing variant', /swing/],
  ['allemande variant', /allemande/],
  ['balance variant', /balance/],
];
const family = (text) => FAMILIES.find(([, re]) => re.test(text))?.[0] ?? `other: ${text}`;

const results = [];
for (const entry of READY_LIBRARY) {
  const { snapshot } = snapshotOf(entry.id);
  const unparsed = [];
  for (const row of contraDbRows(snapshot.html)) {
    try {
      parseRow(row);
    } catch {
      unparsed.push(normalizeRow(row.text).text);
    }
  }
  if (unparsed.length) {
    results.push({
      id: entry.id,
      title: entry.title,
      status: 'unparsed',
      first: unparsed[0],
      unparsed,
    });
    continue;
  }
  let stored;
  try {
    stored = buildStored(entry.id);
  } catch (error) {
    results.push({
      id: entry.id,
      title: entry.title,
      status: 'unparsed',
      first: error.message,
      unparsed: [error.message],
    });
    continue;
  }
  const verdict = verifyDance(stored, compileNext);
  results.push({
    id: entry.id,
    title: entry.title,
    status: verdict.ok ? 'supported' : 'fails',
    ...(verdict.ok ? {} : { first: verdict.problem, failing: verdict.figure }),
  });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const count = (s) => results.filter((r) => r.status === s).length;
  console.log(
    `${results.length} Ready dances: ${count('supported')} supported, ${count('fails')} parse but fail the check, ${count('unparsed')} have unparsed rows.\n`,
  );
  for (const r of results) {
    console.log(
      `${r.status.padEnd(9)} ${r.id.padStart(5)}  ${r.title}${r.first ? `  -- ${r.first}` : ''}`,
    );
  }
  const alone = new Map();
  const any = new Map();
  for (const r of results.filter((x) => x.status === 'unparsed')) {
    const fams = new Set(r.unparsed.map(family));
    for (const f of fams) any.set(f, (any.get(f) ?? 0) + 1);
    if (fams.size === 1) {
      const [f] = fams;
      alone.set(f, (alone.get(f) ?? 0) + 1);
    }
  }
  const failing = new Map();
  for (const r of results.filter((x) => x.status === 'fails')) {
    const f = r.failing ? family(normalizeRow(r.failing).text) : 'progression or model';
    failing.set(f, (failing.get(f) ?? 0) + 1);
  }
  console.log('\nParsed but failing the corpus check, by the figure where it fails:');
  for (const [f, n] of [...failing].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(4)}  ${f}`);
  }
  console.log('\nMissing figures: dances unlocked on its own / dances that use it');
  for (const [f, n] of [...any].sort(
    (a, b) => (alone.get(b[0]) ?? 0) - (alone.get(a[0]) ?? 0) || b[1] - a[1],
  )) {
    console.log(`${String(alone.get(f) ?? 0).padStart(4)} / ${String(n).padStart(3)}  ${f}`);
  }
}
