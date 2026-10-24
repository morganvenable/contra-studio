/**
 * Corpus test, sampled: the full corpus check over every stored dance runs
 * as a script (scripts/next-library.mjs, about 20 s on many threads) and
 * writes public/dances plus docs/next-library-status.json. Here a fixed
 * sample of each status is re-imported from its snapshot (by hash and by
 * re-parsing its rows) and re-checked, so the stored status cannot drift
 * from the engine; every stored file is read once for shape.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { improperModel } from '../core/verify.ts';
import { importDance } from '../import.ts';
import { checkDance } from '../status.ts';
import { compileNext } from '../dance.ts';
import { loadIndex, loadSnapshot, loadStored, sha256 } from './helpers.ts';

const index = loadIndex();
const SAMPLE: Readonly<Record<string, number>> = { ok: 24, check: 6, partial: 10, unsupported: 4 };

/** Every n-th dance of a status, so the sample spreads across the library. */
function sampleOf(status: string, size: number) {
  const all = index.filter((e) => e.status === status);
  const step = Math.max(1, Math.floor(all.length / size));
  return all.filter((_, i) => i % step === 0).slice(0, size);
}

for (const [status, size] of Object.entries(SAMPLE)) {
  for (const entry of sampleOf(status, size)) {
    test(`${entry.id} ${entry.title}: stored ${status}, re-imported and re-checked`, () => {
      const stored = loadStored(entry.id);
      const snapshot = loadSnapshot(entry.id);
      if (snapshot) {
        assert.equal(sha256(snapshot.html), stored.source.sha256);
        const again = importDance(entry.id, snapshot, stored.source.sha256);
        assert.deepEqual(again.figures, stored.figures);
      }
      const check = checkDance(stored);
      assert.equal(check.status, stored.status, check.problems[0]);
      assert.deepEqual(check.problems, stored.problems);
      if (status !== 'ok') assert.ok(entry.note, 'a dance that is not ok says why');
      // Every stored dance opens in the app: lenient compile, a frame per beat.
      const dance = compileNext(stored, 4);
      for (let b = 0; b < dance.totalBeats * 2; b += 1) dance.sample(b);
    });
  }
}

test('every stored dance is in the index, small, and has no embedded HTML', () => {
  const files = readdirSync(new URL('../../../public/dances/', import.meta.url)).filter((f) =>
    /^\d+\.json$/.test(f),
  );
  assert.equal(files.length, index.length);
  const ids = new Set(index.map((e) => e.id));
  for (const f of files) assert.ok(ids.has(f.slice(0, -5)), `${f} is indexed`);
  for (const e of index.filter((_, i) => i % 50 === 0)) {
    const stored = loadStored(e.id);
    assert.equal(stored.status, e.status);
    assert.ok(!JSON.stringify(stored).includes('<td'), 'no embedded HTML');
    assert.ok(!/gentlespoons|ladles/.test(JSON.stringify(stored.figures)), 'larks/robins only');
  }
});

test('the improper model trades places in alternating pairs and waits at the ends', () => {
  // Places in slots from the middle; the top of the set is -z.
  const z = improperModel(3, 2).map((round) => round.map((v) => Math.round(v / 1.8) + 0));
  assert.deepEqual(z, [
    [0, -1, 1],
    [1, -1, 0],
  ]);
});
