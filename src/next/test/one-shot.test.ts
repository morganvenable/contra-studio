import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readOneShot } from '../one-shot.ts';
import { compileNext } from '../dance.ts';

test('a typed dance: parts, beats (given or shared out), figures, and lines not understood', () => {
  const { stored, lines } = readOneShot(
    [
      'Title: Typed',
      'By: Someone',
      'A1 16 neighbors balance & swing',
      'A2 circle left 3 places (8)',
      '   pass through to next neighbors',
      'B1 - partners balance & swing - 16',
      'B2 8 long lines forward & back',
      '   robins chain',
      '   do a funky chicken',
    ].join('\n'),
  );
  assert.equal(stored.title, 'Typed');
  assert.equal(stored.author, 'Someone');
  assert.equal(stored.formation, 'improper');
  const rows = lines.filter((l) => l.row).map((l) => [l.row!.section, l.row!.beats, l.row!.guessed]);
  assert.deepEqual(rows, [
    ['A1', 16, false],
    ['A2', 8, false],
    ['A2', 2, true],
    ['B1', 16, false],
    ['B2', 8, false],
    ['B2', 8, true],
    ['B2', 8, true],
  ]);
  assert.deepEqual(stored.unparsed.map((u) => u.row), [7]);
  assert.ok(stored.figures.some((f) => f.move === 'chain'));
  // It dances: rows not understood stand still for their beats.
  const dance = compileNext(stored, 6);
  assert.equal(dance.totalBeats, 66);
});

test('a typed dance with no parts named: usual lengths, a formation named in the text', () => {
  const { stored } = readOneShot('Formation: Becket\ncircle left 3 places\npass through\nneighbors balance & swing');
  assert.equal(stored.formation, 'becket');
  assert.deepEqual(stored.figures.map((f) => f.beats), [8, 2, 4, 12]);
  // The dialog's choice wins over the text.
  assert.equal(readOneShot('Formation: Becket\ncircle left 3 places', 'improper').stored.formation, 'improper');
});

test('plain figure names are read the usual way, and the preview says how', () => {
  const { stored, lines } = readOneShot(
    ['allemande', 'swing', 'hey', 'long lines', 'chain', 'gyre', 'give and take', 'box circulate'].join('\n'),
  );
  assert.deepEqual(stored.unparsed, []);
  const as = Object.fromEntries(lines.map((l) => [l.row!.text, l.row!.readAs]));
  assert.equal(as.allemande, 'allemande right once');
  assert.equal(as.swing, 'neighbors swing');
  assert.equal(as['long lines'], 'long lines forward & back');
  assert.deepEqual(stored.figures.filter((f) => f.move === 'hey').map((f) => f.beats), [16]);
});
