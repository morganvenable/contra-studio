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

test('the Write a dance guide only lists what reads, and its examples dance cleanly', async () => {
  const { WRITE_FIGURES, WRITE_EXAMPLES, WRITE_FORMAT } = await import('../one-shot-guide.ts');
  const { checkDance } = await import('../status.ts');
  for (const group of WRITE_FIGURES)
    for (const phrase of group.phrases) {
      const { stored } = readOneShot(phrase);
      assert.deepEqual(stored.unparsed, [], `"${phrase}" reads`);
      assert.ok(stored.figures.length > 0, `"${phrase}" is a figure`);
    }
  for (const [, example] of WRITE_FORMAT.filter(([, e]) => !/^(?:Title|Formation):/.test(e)))
    assert.deepEqual(readOneShot(example).stored.unparsed, [], `format example "${example}" reads`);
  for (const example of WRITE_EXAMPLES) {
    const { stored } = readOneShot(example.text);
    assert.equal(stored.figures.reduce((n, f) => n + f.beats, 0), 64, `${example.name}: 64 beats`);
    const check = checkDance(stored);
    assert.equal(check.status, 'ok', `${example.name}: ${check.problems[0] ?? ''}`);
  }
});

test('the progression trace says where the 1s pass their 2s, and where a line takes them back', async () => {
  const { traceProgression } = await import('../one-shot.ts');
  const { WRITE_EXAMPLES } = await import('../one-shot-guide.ts');
  const back = readOneShot(
    ['neighbors balance & swing', 'neighbors allemande left 1½', 'circle left 3 places', 'balance & petronella', 'larks roll away partners', 'neighbors pull by right'].join('\n'),
  ).stored;
  const t = traceProgression(back, (s) => compileNext(s, 4))!;
  assert.ok(t.passed.has(4) && t.back.has(6), 'passed at the petronella, back at the pull by');
  assert.match(t.summary, /^No progression: .*line 4.*line 6/);
  const ok = traceProgression(readOneShot(WRITE_EXAMPLES[0].text).stored, (s) => compileNext(s, 4))!;
  assert.match(ok.summary, /^Progression works/);
});

test('what could come next: a figure that starts here flows, one that cannot start says why', async () => {
  const { tryNext } = await import('../one-shot.ts');
  const { physicalCheck } = await import('../core/check.ts');
  const text = 'A1 16 neighbors balance & swing\nA2 8 neighbors allemande left 1½\nA2 8 circle left 3 places';
  const compile = (s: Parameters<typeof compileNext>[0]) => compileNext(s, 4, undefined, { lenient: false });
  const check = (d: unknown) => physicalCheck(d as never, { rounds: 1 });
  assert.equal(tryNext(text, 'partners swing', undefined, compile, check).fit, 'flows');
  const wave = tryNext(text, 'balance the wave', undefined, compile, check);
  assert.equal(wave.fit, 'stuck');
  assert.match(wave.why!, /straight line/);
  assert.equal(tryNext(text, 'balance & petronella', undefined, compile, check).progress, 'on');
});

test('a line added from the explorer opens the next part when the last one is full', async () => {
  const { nextLine } = await import('../one-shot.ts');
  assert.equal(nextLine('', 'partners swing'), 'A1 partners swing');
  assert.equal(nextLine('A1 16 neighbors balance & swing', 'robins chain'), 'A2 robins chain');
  assert.equal(nextLine('A1 16 neighbors balance & swing\nA2 8 robins chain', 'star left'), 'star left');
});
