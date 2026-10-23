/**
 * Corpus test: every stored dance matches its source snapshot (by hash and by
 * re-parsing its rows), compiles at 3, 4 and 6 couples, passes the physical
 * check over couples + 2 rounds, progresses as an independent duple-minor
 * model says, and lets every couple meet every other.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contraDbRows, parseRow } from '../core/parse.ts';
import { improperModel, verifyDance } from '../core/verify.ts';
import { compileNext, NEXT_DANCES } from '../dance.ts';

for (const stored of NEXT_DANCES) {
  const id = stored.source.url.split('/').pop();
  test(`${id} ${stored.title}: source, compile, physical check, progression`, () => {
    const snapshot = JSON.parse(
      readFileSync(new URL('../../../' + stored.source.snapshot, import.meta.url), 'utf8'),
    );
    assert.equal(createHash('sha256').update(snapshot.html).digest('hex'), stored.source.sha256);
    const parsed = contraDbRows(snapshot.html).flatMap((row) =>
      parseRow(row).map((c) => ({ section: row.section, ...c })),
    );
    assert.deepEqual(parsed, stored.figures);
    const verdict = verifyDance(stored, compileNext);
    assert.ok(verdict.ok, verdict.problem);
  });
}

test('the improper model trades places in alternating pairs and waits at the ends', () => {
  const z = improperModel(3, 2).map((round) => round.map((v) => Math.round(v / 1.8)));
  assert.deepEqual(z, [
    [0, 1, -1],
    [-1, 1, 0],
  ]);
});
