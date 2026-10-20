import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnedProgramCache} from './owned-program-cache.ts';

test('exact plain-data keys preserve values, order, aliases and optional declarations', () => {
  let calls = 0;
  const compile = createOwnedProgramCache((input: unknown) => ({input, serial: ++calls}), {maxEntries: 20});
  const cases: unknown[] = [{a: 0}, {a: -0}, {a: undefined}, {}, {a: null}, {a: '0'}, {a: 0, b: 1}, {b: 1, a: 0}];
  const shared = {id: 1}; cases.push({a: shared, b: shared}, {a: {id: 1}, b: {id: 1}});
  for (const item of cases) {
    const first = compile(item), next = compile(structuredClone(item));
    assert.equal(first.serial, next.serial); assert.notEqual(first, next);
    assert.deepEqual(first.input, item);
  }
  assert.equal(calls, cases.length);
  const source = {a: {id: 1}}; const before = compile(source); source.a.id = 2;
  assert.equal((before.input as typeof source).a.id, 1);
  assert.notEqual(compile(source).serial, before.serial);
});

test('malformed data cannot hit a valid entry or invoke an accessor', () => {
  let calls = 0, reads = 0;
  const compile = createOwnedProgramCache((input: unknown) => ({input, serial: ++calls}));
  compile({id: 1});
  const hidden = {id: 1}; Object.defineProperty(hidden, 'extra', {value: 2});
  const accessor = {}; Object.defineProperty(accessor, 'id', {enumerable: true, get() {reads++; return 1;}});
  const symbol = {id: 1, [Symbol('extra')]: true};
  const cycle: Record<string, unknown> = {id: 1}; cycle.self = cycle;
  const array = [1]; Object.defineProperty(array, 'extra', {enumerable: true, value: 1});
  for (const invalid of [hidden, accessor, symbol, cycle, array, [,,], Object.create(null), Object.assign(Object.create({id: 1}), {x: 2}), new Date(), new Map(), {id: NaN}, {id: Infinity}, {id: () => 1}]) assert.throws(() => compile(invalid));
  assert.equal(calls, 1); assert.equal(reads, 0);
});

test('LRU entry and key-byte bounds, failed admission and oversized bypass stay bounded', () => {
  let calls = 0;
  const compile = createOwnedProgramCache((input: {id: string}) => {calls++; if(input.id === 'bad') throw Error('bad'); return {input, serial: calls};}, {maxEntries: 2});
  const a = compile({id: 'a'}); compile({id: 'b'}); assert.equal(compile({id: 'a'}).serial, a.serial);
  compile({id: 'c'}); assert.notEqual(compile({id: 'b'}).serial, 2);
  for (let i = 0; i < 2; i++) assert.throws(() => compile({id: 'bad'}));
  assert.equal(calls, 6);
  let smallCalls = 0;
  const small = createOwnedProgramCache((input: string) => ({input, serial: ++smallCalls}), {maxEntries: 5, maxKeyBytes: 12});
  small('a'); small('b'); assert.equal(small('b').serial, 2); assert.equal(small('a').serial, 3);
  const big = 'long input'; assert.notEqual(small(big).serial, small(big).serial);
  assert.equal(small('a').serial, 3); // Oversized programs do not evict small hits.
  assert.throws(() => createOwnedProgramCache(() => ({}), {maxEntries: 0}));
  assert.throws(() => createOwnedProgramCache(() => ({}), {maxKeyBytes: Infinity}));
});

test('all metadata, nested helpers and sampler results are isolated across recipients', () => {
  const privateFrame = {poses: [{x: 1}], contacts: [{point: {x: 2}}]};
  const privateMap = new Map([[1, {id: 2}]]);
  const compile = createOwnedProgramCache((_input: number) => ({
    source: {title: 'Original'}, sample: () => privateFrame,
    topology: () => ({neighbors: privateMap}),
    rounds: [{binding: privateMap, sample: () => privateFrame}],
  }));
  const a = compile(1), b = compile(1);
  assert.notEqual(a, b); assert.notEqual(a.source, b.source);
  assert.throws(() => {a.source.title = 'Edited';});
  a.sample().poses[0].x = 88; a.sample().contacts.length = 0;
  a.topology().neighbors.get(1)!.id = 77;
  a.rounds[0].binding.set(3, {id: 99}); a.rounds[0].sample().poses[0].x = 66;
  assert.equal(b.sample().poses[0].x, 1); assert.equal(b.sample().contacts.length, 1);
  assert.equal(b.topology().neighbors.get(1)!.id, 2); assert.equal(b.rounds[0].binding.has(3), false);
  assert.equal(compile(1).rounds[0].sample().poses[0].x, 1);
  assert.deepEqual(privateMap, new Map([[1, {id: 2}]]));
});

test('an own __proto__ data field stays data when metadata is copied', () => {
  const compile = createOwnedProgramCache((input: object) => ({input}));
  const input = JSON.parse('{"__proto__":{"polluted":true},"value":1}');
  const result = compile(input).input;
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.hasOwn(result, '__proto__'), true);
  assert.equal(({} as {polluted?: boolean}).polluted, undefined);
});

test('readonly relation-map iteration and forEach own every exposed value and callback map', () => {
  const table = new Map([[1, {id: 2}]]);
  const view: ReadonlyMap<number, {id: number}> = Object.freeze({
    get size() {return table.size;}, get: (k: number) => table.get(k), has: (k: number) => table.has(k),
    entries: () => table.entries(), keys: () => table.keys(), values: () => table.values(),
    [Symbol.iterator]: () => table[Symbol.iterator](),
    forEach: (fn: (v: {id: number}, k: number, m: ReadonlyMap<number, {id: number}>) => void, thisArg?: unknown) => table.forEach((v, k) => fn.call(thisArg, v, k, view)),
  });
  const compile = createOwnedProgramCache((_input: number) => ({rounds: [{relations: view}], bindingAt: () => ({relations: view})}));
  for (const map of [compile(1).rounds[0].relations, compile(1).bindingAt().relations]) {
    assert.equal(map.size, 1); assert.equal(map.has(1), true);
    assert.deepEqual([...map], [[1, {id: 2}]]); assert.deepEqual([...map.keys()], [1]);
    assert.deepEqual([...map.values()], [{id: 2}]); assert.deepEqual([...map.entries()], [[1, {id: 2}]]);
    assert.notEqual(map.get(1), table.get(1));
    map.forEach((v, k, m) => {assert.equal(k, 1); assert.equal(m, map); assert.notEqual(m, view); assert.notEqual(v, table.get(1));});
    assert.throws(() => {map.get(1)!.id = 88;});
  }
  assert.equal(table.get(1)!.id, 2);
});


test('late proxy traps cannot make capture execute a getter on an earlier input', () => {
  let reads = 0, calls = 0;
  const dance = {title: 'Captured'};
  const capabilities = new Proxy({enabled: true}, {getPrototypeOf(target) {
    Object.defineProperty(dance, 'title', {enumerable: true, configurable: true, get() {reads++; return 'Changed';}});
    return Object.getPrototypeOf(target);
  }});
  const compile = createOwnedProgramCache((input: unknown) => ({input, serial: ++calls}));
  const result = compile({dance, capabilities});
  assert.equal(reads, 0); assert.equal(calls, 1);
  assert.deepEqual(result.input, {dance: {title: 'Captured'}, capabilities: {enabled: true}});
  const same = compile({dance: {title: 'Captured'}, capabilities: {enabled: true}});
  assert.equal(same.serial, result.serial); assert.equal(reads, 0);
});

test('unsupported callable payloads cannot escape inside results or collection metadata', () => {
  const fn = Object.assign(() => 1, {mutable: {value: 1}});
  const compile = createOwnedProgramCache((_input: number) => ({returned: () => fn, map: new Map([[1, fn]]), set: new Set([fn])}));
  const program = compile(1);
  assert.throws(() => program.returned(), /unowned callable/);
  assert.throws(() => program.map, /unowned callable/);
  assert.throws(() => program.map, /unowned callable/);
  assert.throws(() => program.set, /unowned callable/);
  assert.equal(fn.mutable.value, 1);
});

test('function-result copies preserve frozen warnings and diagnostics while ordinary poses stay mutable', () => {
  const shared = Object.freeze({value: 2});
  const privateFrame = {poses: [{position: {x: 1}}], warnings: Object.freeze(['Reviewed']), diagnostics: Object.freeze(new Map([[1, shared]])), diagnosticSet: Object.freeze(new Set([shared])), repeated: shared};
  const compile = createOwnedProgramCache((_input: number) => ({sample: () => privateFrame}));
  const a = compile(1).sample(), b = compile(1).sample();
  assert.ok(Object.isFrozen(a.warnings)); assert.ok(Object.isFrozen(a.diagnostics.get(1)));
  assert.ok(Object.isFrozen(a.diagnostics)); assert.ok(Object.isFrozen(a.diagnosticSet));
  assert.equal(a.diagnostics.get(1), a.repeated); assert.equal([...a.diagnosticSet][0], a.repeated);
  assert.notEqual(a.repeated, b.repeated); assert.notEqual(a.repeated, shared);
  assert.throws(() => (a.warnings as string[]).push('Forged'));
  assert.throws(() => {a.diagnostics.get(1)!.value = 99;});
  assert.ok(!Object.isFrozen(a.poses)); assert.ok(!Object.isFrozen(a.poses[0].position));
  a.poses[0].position.x = 99; assert.equal(b.poses[0].position.x, 1);
  assert.equal(privateFrame.poses[0].position.x, 1);
});
