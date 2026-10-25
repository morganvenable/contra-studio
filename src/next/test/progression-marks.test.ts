/**
 * Where a dance progresses when the source marks no row: a Becket dance
 * whose rows name the new neighbors progresses where the dancers meet them
 * (import.ts namedProgression).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importDance } from '../import.ts';
import { checkDance } from '../status.ts';
import { loadSnapshot } from './helpers.ts';

const marked = (id: string) => {
  const snapshot = loadSnapshot(id);
  if (!snapshot) return undefined;
  const stored = importDance(id, snapshot, '');
  return { stored, rows: stored.figures.filter((c) => c.progression).map((c) => c.text) };
};

test('"pass through" before "next neighbors swing" is the progression (Becket)', (t) => {
  const got = marked('1039');
  if (!got) return t.skip('snapshot not available');
  assert.deepEqual(got.rows, ['pass through']);
  assert.equal(checkDance(got.stored).status, 'ok');
});

test('a row taking the dancers "to new neighbors" ends with the progression', (t) => {
  const got = marked('1350');
  if (!got) return t.skip('snapshot not available');
  assert.equal(got.rows.length, 1);
  assert.equal(checkDance(got.stored).status, 'ok');
});

test('improper dances keep their round-end progression', (t) => {
  const got = marked('1136');
  if (!got) return t.skip('snapshot not available');
  assert.deepEqual(got.rows, []);
});
