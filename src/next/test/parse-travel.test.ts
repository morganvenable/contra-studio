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

test('a duple-minor dance that sends the top couple to the bottom is one longways set', () => {
  const d = importDance(
    '0',
    page('improper or proper', [
      ['A1', 8, 'long lines forward &amp; back'],
      ['', 8, 'partners swing'],
      ['B1', 16, 'partners balance &amp; swing'],
      ['B2', 16, 'top couple sashay to bottom of set - others move up ⁋'],
    ]),
    'x',
  );
  assert.equal(d.formation, 'longways-set');
  assert.equal(d.progression, 'places');
  assert.deepEqual(d.figures.at(-1)?.params, { who: 'top', style: 'sashay', legs: ['bottom'] });
});

test('top couple sashay down, later the same two sashay up: down, then the 1s back to the top', () => {
  const d = importDance(
    '0',
    page('proper', [
      ['A1', 8, 'long lines forward &amp; back'],
      ['', 8, 'top couple, sashay down'],
      ['A2', 8, 'long lines forward &amp; back'],
      ['', 8, 'same two, sashay up to top'],
      ['B1', 32, 'partners swing'],
    ]),
    'x',
  );
  const travel = d.figures.filter((c) => c.move === 'center-travel').map((c) => c.params);
  assert.deepEqual(travel, [
    { who: 'top', style: 'sashay', legs: ['down'] },
    { who: '1s', style: 'sashay', legs: ['top'] },
  ]);
});

test('bend the line, march along the set, ovals and long lines with notes', () => {
  assert.deepEqual(row('bend the line', 2), [['hall', 2, { direction: 'up', end: 'ring', stay: true }]]);
  assert.deepEqual(row('march right along the set', 2), [
    ['slide', 2, { direction: 'right', facing: 'travel' }],
  ]);
  assert.deepEqual(row('oval right, returning to original set'), [
    ['oval', 8, { direction: 'right', places: 4 }],
  ]);
  assert.deepEqual(row('long lines forward and on the way back....', 4), [
    ['long-lines', 4, { back: false }],
  ]);
  assert.deepEqual(row('ones up the center and cast a place +'), [
    ['couple-travel', 4, { who: '1s', route: 'center', direction: 'up' }],
    ['cast', 4, { who: '1s', places: 1 }],
  ]);
});

test('a 16-beat down the hall that turns, with no up the hall after it, comes back and bends', () => {
  const d = importDance(
    '0',
    page('improper', [
      ['A1', 16, 'down the hall and turn as a couple come back to face across'],
      ['A2', 48, 'stand still'],
    ]),
    'x',
  );
  assert.deepEqual(
    d.figures.slice(0, 2).map((c) => [c.beats, c.params]),
    [
      [8, { direction: 'down', turn: 'couple' }],
      [8, { direction: 'up', end: 'ring' }],
    ],
  );
});

test('scatter mixers: scattering to a new partner moves the larks on; group notes are no figure', () => {
  assert.deepEqual(row('individual scatter promenade', 4), [['ring-shift', 4, { who: 'larks', direction: 'left' }]]);
  assert.deepEqual(row('join in rings of any number of couples', 8), [['stand-still', 8, {}]]);
  assert.deepEqual(row('all form a ring of six', 0), []);
});

test('grand square rows number their legs: heads in first, then the other way round', () => {
  const legs = [
    'Heads walk forward, sides back up',
    'Sides walk forward, heads back up',
    'Sides back up, heads walk forward',
    'Heads back up, sides walk forward',
    'Sides back up, heads walk forward',
    'Heads back up, sides walk forward',
    'Sides walk forward, heads back up',
    'Heads walk forward, sides back up',
  ];
  const d = importDance(
    '0',
    page('square dance', legs.map((t, i) => [i ? '' : 'A1', 8, t] as [string, number, string])),
    'x',
  );
  assert.deepEqual(d.unparsed, []);
  assert.deepEqual(
    d.figures.map((c) => `${(c.params as any).heads.move}/${(c.params as any).sides.move}`),
    ['in/away', 'away/in', 'out/toward', 'toward/out', 'away/in', 'in/away', 'toward/out', 'out/toward'],
  );
  assert.equal(d.status, 'unchecked');
});

test('right hand high, left hand low; chainsaw and Gay Gordons promenades', () => {
  assert.deepEqual(row('down the hall and right hand high, left hand low lark 2, lark 1 turns alone'), [
    ['hall', 8, { direction: 'down', turn: 'high-low', pivot: { role: 'lark', of: '2s' } }],
  ]);
  assert.deepEqual(row('chainsaw promenade left'), [
    ['oval', 8, { direction: 'left', half: true, facing: 'travel' }],
  ]);
  assert.deepEqual(
    row('Gay Gordons promenade; take promenade hands', 16).map((c) => c[0]),
    ['ring-promenade', 'ring-promenade'],
  );
});
