import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CompiledDance, Dance } from '../../types.ts';
import { registerNextDance, type StoredDance } from '../dance.ts';
import { compileWithEngine, isNextCompiled, nextEngineRequested } from '../switch.ts';
import { loadIndex, loadStored } from './helpers.ts';

const old = {
  dance: {},
  warnings: [],
  sample: () => ({ warnings: [] }),
} as unknown as CompiledDance;
const compileOld = () => old;
const base = (sourceUrl: string, figures: Dance['figures'] = []): Dance => ({
  id: 'x',
  title: 'X',
  author: 'Y',
  formation: 'becket',
  description: '',
  figures,
  sourceUrl,
});
const oldProgram = [{ id: 'f', kind: 'swing', beats: 64, label: 'swing' }] as Dance['figures'];

registerNextDance(loadStored('2321'));

test('registered dances use the figure library by default; ?engine=old opts out', () => {
  assert.equal(nextEngineRequested(''), true);
  const url = 'https://contradb.com/dances/2321';
  const next = compileWithEngine(base(url, oldProgram), 4, compileOld, '');
  assert.ok(isNextCompiled(next));
  assert.equal(next.dance.id, 'x', 'keeps the app dance identity');
  assert.equal(nextEngineRequested('?engine=old'), false);
  assert.equal(compileWithEngine(base(url, oldProgram), 4, compileOld, '?engine=old'), old);
});

test('dances not fetched from the library use the old engine', () => {
  assert.equal(compileWithEngine(base('https://contradb.com/dances/1'), 4, compileOld, ''), old);
});

test('a partial dance falls back to its reviewed old program, unless ?engine=next', () => {
  const entry = loadIndex().find((e) => e.status === 'partial')!;
  const stored: StoredDance = loadStored(entry.id);
  registerNextDance(stored);
  const withOld = compileWithEngine(base(stored.source.url, oldProgram), 4, compileOld, '');
  assert.ok(!isNextCompiled(withOld));
  assert.match(withOld.warnings[0], /^New engine: /);
  assert.ok(
    isNextCompiled(
      compileWithEngine(base(stored.source.url, oldProgram), 4, compileOld, '?engine=next'),
    ),
  );
  // With no old program it plays on the new engine with held rows.
  const alone = compileWithEngine(base(stored.source.url), 4, compileOld, '');
  assert.ok(isNextCompiled(alone));
  assert.equal(alone.warnings[0], stored.problems[0]);
});
