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

test('flow: a figure turns one way through its middle, and a rare counter-turn is noted', async () => {
  const { mainSpin, flowBetween, habit, habitKey } = await import('../flow.ts');
  const { stored } = readOneShot('neighbors allemande right once\nneighbors allemande left once\npartners swing');
  const segments = (compileNext(stored, 4) as unknown as { round(r: number): { segments: Parameters<typeof flowBetween>[0][] } }).round(0).segments;
  assert.ok(mainSpin(segments[0], 0) < -0.35, 'allemande right turns clockwise');
  assert.ok(mainSpin(segments[1], 0) > 0.35, 'allemande left turns counter-clockwise');
  assert.ok(mainSpin(segments[2], 0) < -0.35, 'a swing turns clockwise');
  assert.equal(flowBetween(segments[0], segments[1], [0, 1, 2, 3])[0]?.kind, 'counter-turn');
  assert.equal(habitKey(stored.figures[0]), 'allemande:right');
  const habits = { dances: 1, after: { 'allemande:right': { 'allemande:left': 4, swing: 1 } } };
  assert.deepEqual(habit(habits, 'allemande:right', 'allemande:left'), { count: 4, of: 5 });
});

test('a California twirl reads with partners, and offers the neighbor figure that matches it', () => {
  const plain = readOneShot('balance and California twirl');
  assert.equal(plain.lines[0].row?.readAs, 'partners balance and California twirl');
  assert.equal(plain.stored.unparsed.length, 0);
  // Who it is with is a choice: the other pairs, and the facing figures for neighbors.
  const offered = plain.lines[0].options?.map((o) => o.text) ?? [];
  for (const o of ['neighbors balance and California twirl', 'neighbors balance & box the gnat', 'neighbors balance & swat the flea'])
    assert.ok(offered.includes(o), o);
  // Any pair standing side by side may twirl: neighbors read as typed, and a line read as typed is taken at its word.
  const neighbors = readOneShot('neighbors balance and California twirl');
  assert.equal(neighbors.stored.unparsed.length, 0);
  assert.equal(neighbors.lines[0].options, undefined);
  assert.equal(readOneShot('partners balance & California twirl').lines[0].options, undefined);
});

test('a twirl to face new neighbors, a circle with them, and a twirl back', () => {
  const { stored, lines } = readOneShot(
    ['neighbor balance & swing', 'cirlce left three places', 'neighbor balance and California twirl', 'circle left with new neighbors all the way around', 'balance and california twirl'].join('\n'),
  );
  assert.equal(stored.unparsed.length, 0);
  assert.equal(lines[1].row?.readAs, 'circle left three places', 'a slip of the keyboard put right');
  assert.equal(lines[3].row?.readAs, 'circle left 4 places with new neighbors');
  assert.equal(lines[4].row?.readAs, 'neighbors balance and california twirl', 'twirling back with the same pair');
  const segments = (compileNext(stored, 6, undefined, { lenient: false }) as unknown as { round(r: number): { segments: { call: { move: string; params: Record<string, unknown> }; result: { exit: { bodies: ReadonlyMap<number, { position: { z: number }; yaw: number }> } } }[] } }).round(0).segments;
  const facing = (s: (typeof segments)[number], id: number) => Math.round(Math.cos(s.result.exit.bodies.get(id)!.yaw));
  // Out of the first twirl the 1s' robin and her neighbor face down the set to new neighbors; twirling back, up again.
  const twirls = segments.filter((s) => s.call.move === 'twirl');
  assert.equal(facing(twirls[0], 1), 1);
  assert.equal(facing(twirls[1], 1), -1);
  assert.equal(segments.find((s) => s.call.move === 'circle' && s.call.params.rings === 'facing') !== undefined, true);
});

test('where everyone stands coming out of each line, in words', async () => {
  const { describeState } = await import('../state-note.ts');
  const { stored } = readOneShot(['neighbors balance & swing', 'circle left 3 places', 'pass through to next neighbors'].join('\n'));
  const segments = (compileNext(stored, 4) as unknown as { round(r: number): { segments: { entry: never; result: { exit: never } }[] } }).round(0).segments;
  // Improper: the 1s face down to their neighbors, partners side by side.
  const start = describeState(segments[0].entry)!;
  assert.equal(start.views[0], '1s lark faces down to neighbor · partner on the right');
  // Out of the neighbor swing: long lines, facing partner across, neighbor beside.
  const swung = describeState(segments[1].result.exit)!;
  assert.equal(swung.shape, 'long lines');
  assert.match(swung.views[0], /^1s lark faces across to partner · .*neighbor on the right/);
  assert.equal(describeState(segments[2].result.exit)!.shape, 'a ring');
  assert.match(describeState(segments[3].result.exit)!.views[0], /faces down to next neighbor/);
});

test('a twirl is suggested with whoever the lark faces or stands beside as the line starts', async () => {
  const { around } = await import('../state-note.ts');
  const { twirlFit } = await import('../one-shot.ts');
  const { stored } = readOneShot(['neighbors balance & swing', 'partners swing'].join('\n'));
  const segments = (compileNext(stored, 4) as unknown as { round(r: number): { segments: { result: { exit: never } }[] } }).round(0).segments;
  // Out of the neighbor swing the lark faces their partner across the set: a box the gnat with partners fits.
  const afterNeighbors = around(segments[1].result.exit, 0);
  assert.deepEqual(
    twirlFit('partners balance and California twirl', afterNeighbors)?.map((o) => o.text),
    ['partners balance & box the gnat', 'partners balance & swat the flea', 'neighbors balance & California twirl'].filter((t) => readOneShot(t).stored.unparsed.length === 0),
  );
  assert.deepEqual(twirlFit('partners balance & box the gnat', afterNeighbors), []);
  // Out of the partner swing the partner is beside the lark: the California twirl fits.
  assert.deepEqual(twirlFit('partners balance & California twirl', around(segments[2].result.exit, 0)), []);
  assert.equal(twirlFit('circle left 3 places', afterNeighbors), undefined);
});
