/**
 * The Dance library's style, formation and figure filters over the real
 * index (public/dances/index.json): every dance keeps its formation key and
 * moves whatever its status, and the filters only narrow.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORMATIONS } from '../core/formation.ts';
import type { LibraryEntry } from '../dance.ts';
import {
  FIGURE_GROUPS,
  emptyFilter,
  facetCounts,
  figuresOf,
  matchesFilter,
  styleOf,
} from '../library-filters.ts';

const index: LibraryEntry[] = JSON.parse(
  readFileSync(new URL('../../../public/dances/index.json', import.meta.url), 'utf8'),
).dances;

test('every index entry carries a known formation key and its moves', () => {
  for (const e of index) {
    assert.ok(e.layout && FORMATIONS[e.layout], `${e.id} layout ${e.layout}`);
    assert.ok(Array.isArray(e.moves), e.id);
  }
});

test('every formation key has a style; English is the whole sets', () => {
  for (const key of Object.keys(FORMATIONS))
    if (key !== 'four-face-four' && key !== 'three-face-three' && key !== 'tempest' && key !== 'line-of-five')
      assert.notEqual(styleOf(key), 'other', key);
  assert.equal(styleOf('improper'), 'contra');
  assert.equal(styleOf('becket-ccw'), 'contra');
  assert.equal(styleOf('triplet'), 'english');
  assert.equal(styleOf('longways-set'), 'english');
  assert.equal(styleOf('square'), 'square');
  assert.equal(styleOf('circle-mixer'), 'circle');
});

test('figure groups never share a move', () => {
  const seen = new Set<string>();
  for (const g of FIGURE_GROUPS)
    for (const m of g.moves) {
      assert.ok(!seen.has(m), m);
      seen.add(m);
    }
});

test('filters keep unfinished dances and require every chosen figure', () => {
  assert.equal(index.filter((e) => matchesFilter(e, emptyFilter())).length, index.length);
  const f = emptyFilter();
  f.layout = 'becket';
  f.figures.add('hey');
  const both = index.filter((e) => matchesFilter(e, f));
  assert.ok(both.length > 0);
  assert.ok(both.every((e) => e.layout === 'becket' && figuresOf(e).has('hey')));
  // Partial and check dances are found too, so their gaps can be reported.
  assert.ok(new Set(both.map((e) => e.status)).size > 1);
  f.figures.add('petronella');
  assert.ok(index.filter((e) => matchesFilter(e, f)).length < both.length);
});

test('each count is what the list would show if that choice were added', () => {
  const f = emptyFilter();
  f.style = 'contra';
  const counts = facetCounts(index, f);
  // Strip the willow is only in a triplet, so under Contra it counts 0.
  assert.equal(counts.figures.get('strip-the-willow') ?? 0, 0);
  for (const [id, n] of counts.figures) {
    const g = emptyFilter();
    g.style = 'contra';
    g.figures.add(id);
    assert.equal(index.filter((e) => matchesFilter(e, g)).length, n, id);
  }
  // A style count ignores the chosen style but keeps the other filters.
  f.figures.add('cast');
  const withCast = facetCounts(index, f);
  const g = emptyFilter();
  g.style = 'english';
  g.figures.add('cast');
  assert.equal(withCast.style.get('english'), index.filter((e) => matchesFilter(e, g)).length);
});
