#!/usr/bin/env node
// The fast check before shipping (about two minutes): typecheck, the figure
// library's tests, and the Pages build. When the engine changed, also rebuild
// the dance library and report every dance whose status moved.
//
// The slow full motion suite (src/*.test.ts) is not run here: the Pages
// workflow runs it on every push to main, alongside the deploy. Check its
// result after shipping and fix forward if it goes red.
//
//   npm run check            fast check, library only if the engine changed
//   npm run check -- --library   always rebuild the library
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (args) => execSync(`git -c safe.directory=* ${args}`, { encoding: 'utf8', maxBuffer: 1 << 28 });
const run = (label, cmd) => {
  const t = Date.now();
  process.stdout.write(`${label} ... `);
  const r = spawnSync(cmd, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 1 << 28 });
  const secs = ((Date.now() - t) / 1000).toFixed(0);
  if (r.status !== 0) {
    console.log(`FAILED (${secs}s)`);
    console.log((r.stdout + r.stderr).split('\n').filter((l) => /✖|error|Error|fail/.test(l)).slice(0, 40).join('\n'));
    process.exit(1);
  }
  const summary = (r.stdout.match(/ℹ pass \d+/) ?? [''])[0];
  console.log(`ok ${summary} (${secs}s)`);
};

run('typecheck', 'npx tsc --noEmit -p .');
run('figure library tests', 'npm run test:next');
run('pages build', 'npm run build:pages');

// The engine: anything the stored dances are compiled with.
const changed = [
  ...git('diff --name-only origin/main...HEAD').split('\n'),
  ...git('diff --name-only').split('\n'),
  ...git('diff --name-only --cached').split('\n'),
].filter(Boolean);
const engine = changed.some((f) => /^src\/next\/(core|figures)\/|^src\/next\/(dance|import|import-travel|status)\.ts$/.test(f));
if (engine || process.argv.includes('--library')) {
  run('dance library', 'node scripts/next-library.mjs');
  run('flow habits', 'node scripts/flow-habits.ts');
  const list = (j) => (Array.isArray(j) ? j : (j.dances ?? Object.values(j)));
  const before = new Map(list(JSON.parse(git('show origin/main:public/dances/index.json'))).map((d) => [d.id, d.status]));
  const rank = { ok: 2, check: 1, partial: 0 };
  const worse = [], better = [];
  for (const d of list(JSON.parse(readFileSync('public/dances/index.json', 'utf8')))) {
    const was = before.get(d.id);
    if (was === d.status) continue;
    (rank[d.status] < rank[was] ? worse : better).push(`${d.id} ${was}->${d.status} ${d.title}`);
  }
  console.log(`library: ${better.length} better, ${worse.length} worse`);
  for (const w of worse) console.log(`  worse: ${w}`);
} else {
  console.log('dance library: engine unchanged, skipped');
}
