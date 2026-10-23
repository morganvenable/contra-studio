import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRow } from '../core/parse.ts';
import { canonicalText } from '../core/roles.ts';

const one = (text: string, beats = 8) => {
  const calls = parseRow({ beats, text });
  assert.equal(calls.length, 1);
  return calls[0];
};

test('row patterns map to moves and parameters', () => {
  assert.deepEqual(one('neighbors swing', 16).params, { who: 'neighbor' });
  assert.deepEqual(one('circle left 3 places').params, { direction: 'left', places: 3 });
  assert.deepEqual(one('circle right').params, { direction: 'right', amount: 1 });
  assert.deepEqual(one('circle left ¾').params, { direction: 'left', amount: 0.75 });
  assert.deepEqual(one('ladles allemande right 1½').params, { who: 'robins', hand: 'right', amount: 1.5 });
  assert.deepEqual(one('partners allemande right ¾ to short waves with gentlespoons in the middle', 4).params, {
    who: 'partner', hand: 'right', amount: 0.75, wave: { middle: 'lark' },
  });
  assert.equal(one('slice left and straight back ⁋').progression, true);
});

test('balance & Rory O\'More splits into a balance and a slide', () => {
  const calls = parseRow({ beats: 8, text: "balance &  Rory O'More right" });
  assert.deepEqual(calls.map((c) => [c.move, c.beats]), [['balance', 4], ['rory', 4]]);
  assert.deepEqual(calls[1].params, { direction: 'right', spin: 'full' });
  assert.equal(calls[0].params.first, 'right');
});

test('gendered and alias names are input only; labels say larks and robins', () => {
  assert.equal(one('gents allemande left', 4).params.who, 'larks');
  assert.equal(one('ravenclaws allemande left', 4).params.who, 'robins');
  assert.equal(one('gentlespoons allemande left ½', 2).text, 'larks allemande left ½');
  assert.equal(canonicalText('ladies chain'), 'robins chain');
});

test('unknown rows say so', () => {
  assert.throws(() => parseRow({ beats: 8, text: 'hey for four' }), /No figure pattern/);
});
