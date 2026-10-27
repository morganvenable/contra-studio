/**
 * The figure gallery's cases (src/next/proof-cases.json): every case without
 * a recorded reason still compiles, so engine changes that stop a gallery
 * figure from starting fail here. Rebuild them with scripts/proof-cases.mjs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileProof, findProofCase, type ProofCase } from '../proof.ts';

const cases: ProofCase[] = JSON.parse(
  readFileSync(new URL('../proof-cases.json', import.meta.url), 'utf8'),
);

test('every gallery case that started when built still starts', () => {
  const broken: string[] = [];
  for (const c of cases) {
    if (c.error) continue;
    try {
      const proof = compileProof(c);
      assert.ok(proof.end > proof.start, c.id);
    } catch (error) {
      broken.push(`${c.id}: ${error instanceof Error ? error.message : error}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('a studio link finds its own case', () => {
  for (const c of cases.filter((x) => !x.error).slice(0, 40))
    assert.equal(findProofCase(cases, c.move, c.params, c.id)?.id, c.id);
  assert.equal(findProofCase(cases, 'no-such-figure', undefined), undefined);
});
