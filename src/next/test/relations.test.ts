/** Shadows, previous neighbors and same-role pairs (core/relations.ts). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMPROPER } from '../core/formation.ts';
import { DUPLE_MINOR_PROGRESSION } from '../core/progression.ts';
import { regroupFor, sameRolePairs, shadowPairs } from '../core/relations.ts';
import { canonical } from '../core/roles.ts';
import { normalizeRow } from '../core/parse.ts';
import { body } from '../core/state.ts';

test('shadows are the nearest other-role dancers who are not partner or neighbor', () => {
  const s = IMPROPER.start(4);
  const pairs = shadowPairs(s);
  assert.ok(pairs.length > 0);
  for (const [a, b] of pairs) {
    assert.notEqual(s.dancers[a].role, s.dancers[b].role);
    assert.notEqual(s.relations.get('partner')!.get(a), b);
    assert.notEqual(s.relations.get('neighbor')!.get(a), b);
    const d = Math.hypot(
      body(s, a).position.x - body(s, b).position.x,
      body(s, a).position.z - body(s, b).position.z,
    );
    assert.ok(d < 2, 'a shadow stands next to you');
  }
  // The 2s of the top minor set and the 1s below them share their side lines.
  assert.deepEqual(pairs, [
    [2, 5],
    [3, 4],
  ]);
});

test('regrouping for shadows adds the relation and keeps everyone else out', () => {
  const s = regroupFor(IMPROPER.start(4), 'shadow');
  assert.deepEqual(s.groups, [
    [2, 5],
    [3, 4],
  ]);
  assert.equal(s.relations.get('shadow')!.get(5), 2);
});

test('same-role pairs are the two larks and the two robins of each minor set', () => {
  assert.deepEqual(sameRolePairs(IMPROPER.start(2)), [
    [0, 2],
    [1, 3],
  ]);
});

test('the progression keeps the old neighbors as previous neighbors', () => {
  const start = IMPROPER.start(4);
  // Move the 1s down and the 2s up one place, as a progression would.
  const bodies = new Map(start.bodies);
  for (const d of start.dancers) {
    const b = body(start, d.id);
    const dz = start.positions.get('1s')!.includes(d.id) ? 1.8 : -1.8;
    bodies.set(d.id, {
      ...b,
      position: { x: b.position.x, z: b.position.z + dz },
    });
  }
  const after = DUPLE_MINOR_PROGRESSION.rebind({ ...start, bodies });
  assert.equal(after.relations.get('previous-neighbor')!.get(0), 3);
});

test('row names: shadows, 2nd shadows, prev neighbors, same roles', () => {
  assert.equal(canonical('shadows'), 'shadow');
  assert.equal(normalizeRow('2nd shadows allemande left once').text, 'shadows allemande left once');
  assert.equal(
    normalizeRow('prev neighbors allemande left once').text,
    'prev_neighbors allemande left once',
  );
  assert.equal(canonical('prev_neighbors'), 'previous-neighbor');
  assert.equal(canonical('same_roles'), 'same-role');
});
