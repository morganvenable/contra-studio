/**
 * The last-resort travel readings (core/parse-travel.ts) and the rows read
 * with their neighbors (import-travel.ts).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRow } from '../core/parse.ts';
import { importDance } from '../import.ts';

const row = (text: string, beats = 8) =>
  parseRow({ text, beats }).map(({ move, beats: b, params }) => [move, b, params]);

test('travel rows read as the plain figure they name', () => {
  assert.deepEqual(row('slide left along set (slightly)', 2), [['slide', 2, { direction: 'left' }]]);
  assert.deepEqual(row('slide left along set pass two couples', 4), [
    ['slide', 4, { direction: 'left', places: 2 }],
  ]);
  assert.deepEqual(row('partners promenade on the left'), [
    ['oval', 8, { direction: 'left', half: true, facing: 'travel' }],
  ]);
  assert.deepEqual(row('neighbors promenade 3/4 to face partner up & down'), [
    ['promenade-around', 8, { who: 'neighbor', amount: 0.75 }],
  ]);
  assert.deepEqual(row('partners promenade - wide loop to face new neighbors'), [
    ['promenade', 6, { who: 'partner' }],
    ['slide', 2, { direction: 'progression' }],
  ]);
  assert.deepEqual(row('down the hall and slide doors'), [
    ['hall', 8, { direction: 'down', turn: 'doors' }],
  ]);
  assert.deepEqual(row('up the hall and hand cast off to face across'), [
    ['hall', 8, { direction: 'up', end: 'ring' }],
  ]);
  assert.deepEqual(row('single file promenade along set to next neighbors', 4), [
    ['slide', 4, { direction: 'progression', facing: 'travel' }],
  ]);
  assert.deepEqual(row('circle left 3 places - hands free zombie walk'), [
    ['circle', 8, { direction: 'left', places: 3 }],
  ]);
  assert.deepEqual(row('balance the circle, slide/spin right one place'), [
    ['balance', 4, { formation: 'ring' }],
    ['petronella', 4, {}],
  ]);
});

test('labels and comments are no figure: nothing at zero beats, standing still with beats', () => {
  assert.deepEqual(row('A1:', 0), []);
  assert.deepEqual(row('Weave the line:', 0), []);
  assert.deepEqual(row("(it's a slip jig)", 4), [['stand-still', 4, {}]]);
  assert.deepEqual(row('reach across and behind to form clover', 0), []);
});

/** A ContraDB page with these rows (section, beats, text). */
function page(formation: string, rows: [string, number, string][]) {
  const trs = rows.map(([s, b, t]) => `<tr><td>${s}</td><td>${b}</td><td>${t}</td></tr>`).join('');
  return {
    sourceUrl: 'https://contradb.com/dances/0',
    html: `<h1 class="dance-show-title">Test</h1><p class="dance-show-choreographer">by: Test</p><p class="dance-show-formation">formation: ${formation}</p><table>${trs}</table>`,
  };
}

test('a SIMULTANEOUS block is one call; a zero-beat meanwhile row joins the row before', () => {
  const d = importDance(
    '0',
    page('improper', [
      ['A1', 0, 'SIMULTANEOUS:'],
      ['', 0, 'ones swing'],
      ['', 0, 'WHILE:'],
      ['', 16, 'twos balance &amp; swing'],
      ['A2', 4, 'ladles allemande left ½'],
      ['', 0, 'meanwhile gentlespoons slide left to meet partner'],
      ['', 12, 'partners swing'],
      ['B1', 32, 'stand still'],
    ]),
    'x',
  );
  assert.deepEqual(d.unparsed, []);
  assert.equal(d.figures[0].move, 'simultaneous');
  assert.equal(d.figures[0].beats, 16);
  assert.equal(d.figures[1].move, 'meanwhile');
  assert.deepEqual(d.figures[1].params, {
    first: { move: 'allemande', params: { who: 'robins', hand: 'left', amount: 0.5 } },
    second: { move: 'slide', params: { direction: 'left', who: 'larks' } },
  });
});

test('a single-file walk after turning right goes to the left as the dancers face in', () => {
  const d = importDance(
    '0',
    page('Becket ccw', [
      ['A1', 4, 'pass through across the set'],
      ['', 2, 'turn alone to the right'],
      ['', 2, 'single file promenade along set to next neighbors ⁋'],
      ['A2', 56, 'stand still'],
    ]),
    'x',
  );
  const walk = d.figures.find((c) => c.move === 'slide');
  assert.deepEqual(walk?.params, { direction: 'left', facing: 'travel' });
});
