import test from 'node:test';
import assert from 'node:assert/strict';
import {compileChoreography} from './choreography.ts';
import {readContraDbImport} from './contradb-import.ts';
import {READY_LIBRARY} from './ready-library.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {DiagonalHeyCompiled} from './diagonal-half-hey-becket.ts';

function source(id: string) {
  const result = readContraDbImport(READY_LIBRARY.find(item => item.id === id)!.archive);
  assert.ok(result.dance, result.errors.join('; ')); return structuredClone(result.dance);
}

test('public program hits isolate metadata and every presented sampler across recipients', () => {
  for (const id of ['3004', '2226', '1461']) {
    const dance = source(id), a = compileChoreography(dance, 3), b = compileChoreography(structuredClone(dance), 3);
    assert.notEqual(a, b); assert.notEqual(a.dance, b.dance); assert.deepEqual(a.dance, b.dance);
    const expected = b.sample(61.125);
    dance.title = 'Caller edit'; dance.figures[0].label = 'Caller edit';
    a.sample(61.125).poses[0].position.x = 999;
    const frame = a.sample(61.125); frame.contacts.splice(0);
    if (a.formationSample) a.formationSample(61.125).poses[0].position.x = 999;
    assert.deepEqual(b.sample(61.125), expected);
    assert.throws(() => {a.dance.figures[0].beats = 999;});
    assert.throws(() => {a.dancers[0].role = 'robin';});
  }
});

test('diagonal nested section, path and readonly relation-map helpers never expose cache storage', () => {
  const dance = source('1461'), a = compileChoreography(dance, 2) as DiagonalHeyCompiled, b = compileChoreography(dance, 2) as DiagonalHeyCompiled;
  for (const key of ['prefix', 'diag', 'across', 'partner'] as const) {
    const expected = b.rounds[0][key].sample(1.25);
    const frame = a.rounds[0][key].sample(1.25); frame.poses[0].position.x = 999; frame.contacts.splice(0);
    assert.deepEqual(b.rounds[0][key].sample(1.25), expected);
  }
  const pathA = a.rounds[0].plans[0].trajectory, pathB = b.rounds[0].plans[0].trajectory;
  const expected = pathB.sample(2); pathA.sample(2).poses[0].position.x = 999; assert.deepEqual(pathB.sample(2), expected);
  const bound = a.bindingAt(40), other = b.bindingAt(40);
  assert.notEqual(bound, other); assert.notEqual(bound.relations.neighbor, other.relations.neighbor);
  assert.deepEqual([...bound.relations.neighbor], [...other.relations.neighbor]);
  bound.relations.neighbor.forEach((_value, _key, map) => assert.equal(map, bound.relations.neighbor));
  assert.equal((bound.relations.neighbor as unknown as {set?: unknown}).set, undefined);
});

test('capability, couple, evidence and declaration changes cannot inherit a prior success', () => {
  const dance = source('1461'); compileChoreography(dance, 2);
  for (const gate of ['diagonalHalfHeys', 'progressionEvents', 'ordinaryHalfHeys', 'rightLeftThrough'] as const) assert.throws(() => compileChoreography(dance, 2, {...REGISTERED_MOTION_CAPABILITIES, [gate]: false}));
  assert.throws(() => compileChoreography(dance, 1));
  const bad = structuredClone(dance); bad.progressionEvents![0].source.sourceId = 'forged'; assert.throws(() => compileChoreography(bad, 2));
  const hidden = structuredClone(dance); Object.defineProperty(hidden.figures[4], 'extra', {value: 1}); assert.throws(() => compileChoreography(hidden, 2));
  const sym = structuredClone(dance); Object.defineProperty(sym.sourceRecord!, Symbol('extra'), {value: 1}); assert.throws(() => compileChoreography(sym, 2));
  let reads = 0; const accessor = structuredClone(dance); Object.defineProperty(accessor, 'title', {enumerable: true, get() {reads++; return dance.title;}}); assert.throws(() => compileChoreography(accessor, 2)); assert.equal(reads, 0);
  assert.deepEqual(compileChoreography(new Proxy(dance, {}), 2).dance, dance); // Only the captured plain declaration is compiled.
  const changed = structuredClone(dance); changed.title += ' exact metadata';
  const program = compileChoreography(changed, 2); assert.equal(program.dance.title, changed.title);
  const optional = structuredClone(dance); optional.circulation = undefined;
  assert.equal(Object.hasOwn(compileChoreography(optional, 2).dance, 'circulation'), true);
  assert.equal(Object.hasOwn(compileChoreography(dance, 2).dance, 'circulation'), false);
});
