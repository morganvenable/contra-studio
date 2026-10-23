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
  assert.deepEqual(one('ladles allemande right 1½').params, {
    who: 'robins',
    hand: 'right',
    amount: 1.5,
  });
  assert.deepEqual(
    one('partners allemande right ¾ to short waves with gentlespoons in the middle', 4).params,
    { who: 'partner', hand: 'right', amount: 0.75, wave: { middle: 'lark' } },
  );
  assert.equal(one('slice left and straight back ⁋').progression, true);
  assert.deepEqual(one('partners meltdown swing', 12).params, { who: 'partner', meltdown: true });
  assert.deepEqual(one('neighbors long swing', 16).params, { who: 'neighbor' });
});

test("balance & Rory O'More splits into a balance and a slide", () => {
  const calls = parseRow({ beats: 8, text: "balance &  Rory O'More right" });
  assert.deepEqual(
    calls.map((c) => [c.move, c.beats]),
    [
      ['balance', 4],
      ['rory', 4],
    ],
  );
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

test('patterns for the improper figures', () => {
  assert.deepEqual(
    parseRow({ beats: 16, text: 'neighbors balance & swing' }).map((c) => [c.move, c.beats]),
    [
      ['balance', 4],
      ['swing', 12],
    ],
  );
  assert.deepEqual(one('ladles chain (to neighbor) ⁋').params, { who: 'robins', to: 'neighbor' });
  assert.deepEqual(one('star right - wrist grip - 4 places').params, {
    hand: 'right',
    places: 4,
    grip: 'wrist',
  });
  assert.deepEqual(one('long lines forward & back').params, { back: true });
  assert.deepEqual(one('ladles do si do 1½').params, {
    who: 'robins',
    amount: 1.5,
    shoulder: 'right',
  });
  assert.deepEqual(one('pass through to new neighbors ⁋', 2).params, { shoulder: 'right' });
  assert.deepEqual(one('pass through left shoulders', 2).params, { shoulder: 'left' });
  assert.deepEqual(one('next neighbors swing').params, { who: 'neighbor' });
  assert.deepEqual(one('down the hall and turn alone').params, {
    direction: 'down',
    turn: 'alone',
  });
  assert.deepEqual(one('partners California twirl to face new neighbors', 4).params, {
    style: 'california',
    who: 'partner',
  });
  assert.deepEqual(one('ladles start a full hey - rights in center, lefts on ends', 16).params, {
    start: 'robins',
    amount: 1,
    center: 'right',
  });
  assert.equal(one('balance', 4).params.formation, 'current');
});

test('square through, give & take, mad robin and gyre rows', () => {
  const calls = parseRow({
    beats: 16,
    text: 'square through four - partners balance & pull by right, then neighbors pull by left, then repeat',
  });
  assert.deepEqual(
    calls.map((c) => [c.move, c.beats, c.params.who]),
    [
      ['balance', 4, 'partner'],
      ['pass-by', 2, 'partner'],
      ['pass-by', 2, 'neighbor'],
      ['balance', 4, 'partner'],
      ['pass-by', 2, 'partner'],
      ['pass-by', 2, 'neighbor'],
    ],
  );
  assert.deepEqual(one('gentlespoons give & take partners').params, {
    who: 'larks',
    whom: 'partner',
  });
  assert.deepEqual(one('mad robin, ladles in front (CW)').params, {
    front: 'robins',
    direction: 'clockwise',
  });
  assert.deepEqual(one('ladles gyre 1½').params, { who: 'robins', amount: 1.5 });
  assert.deepEqual(one('ladles gyre once in the center').params, { who: 'robins', amount: 1 });
});
