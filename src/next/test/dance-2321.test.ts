import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { physicalCheck } from '../core/check.ts';
import { contraDbRows, parseRow } from '../core/parse.ts';
import { compileNext, NEXT_DANCES } from '../dance.ts';
import { near, facing } from './helpers.ts';

const stored = NEXT_DANCES.find((d) => d.source.url.endsWith('/2321'))!;
const snapshot = JSON.parse(
  readFileSync(new URL('../../../' + stored.source.snapshot, import.meta.url), 'utf8'),
);

test('stored 2321 matches its source snapshot by hash and by parsed rows', () => {
  assert.equal(createHash('sha256').update(snapshot.html).digest('hex'), stored.source.sha256);
  const parsed = contraDbRows(snapshot.html).flatMap((row) =>
    parseRow(row).map((c) => ({ section: row.section, ...c })),
  );
  assert.deepEqual(parsed, stored.figures);
  assert.ok(!JSON.stringify(stored).includes('gentlespoons'), 'stored names are larks/robins');
});

/**
 * Independent Becket model: every round each couple moves one place to its
 * left; a couple with no one across waits out and crosses to the other side.
 * Written with the top of the set at +z, then turned a half turn about the
 * vertical (x and z negated) to the set's frame, where the top is -z.
 */
function expectedSpots(couples: number, rounds: number) {
  const rows = Math.floor(couples / 2);
  const spots = Array.from({ length: couples }, (_, c) => {
    if (c === couples - 1 && couples % 2) return { side: -1, z: (rows - (rows - 1) / 2) * 3.6 };
    return { side: c % 2 ? -1 : 1, z: (Math.floor(c / 2) - (rows - 1) / 2) * 3.6 };
  });
  for (let r = 0; r < rounds; r++) {
    for (const s of spots) s.z += s.side * 1.8;
    for (const s of spots) {
      const across = spots.some((o) => o !== s && o.side === -s.side && Math.abs(o.z - s.z) < 1e-6);
      if (!across) s.side = -s.side;
    }
  }
  return spots;
}

for (const couples of [3, 4, 6]) {
  test(`2321 compiles at ${couples} couples, passes the physical check and progresses`, () => {
    const dance = compileNext(stored, couples);
    assert.equal(dance.totalBeats, 64);
    assert.equal(dance.repeatable, true);
    const rounds = couples + 2;
    const report = physicalCheck(dance, { rounds });
    assert.deepEqual(report.problems, [], JSON.stringify(report));
    for (let r = 1; r <= rounds; r++) {
      const frame = dance.sample(r * dance.totalBeats);
      expectedSpots(couples, r).forEach((spot, c) => {
        const lark = frame.poses[c * 2];
        const robin = frame.poses[c * 2 + 1];
        near(
          lark.position,
          { x: -spot.side * 0.9, z: -(spot.z + spot.side * 0.9) },
          `round ${r} lark ${c + 1}`,
        );
        near(
          robin.position,
          { x: -spot.side * 0.9, z: -(spot.z - spot.side * 0.9) },
          `round ${r} robin ${c + 1}`,
        );
        facing(lark.yaw, (spot.side * Math.PI) / 2, `round ${r} lark ${c + 1}`);
      });
    }
  });
}

test('every couple meets every other couple over enough rounds (6 couples)', () => {
  const dance = compileNext(stored, 6);
  const met = new Set<string>();
  for (let r = 0; r < 12; r++) {
    for (const g of dance.round(r).segments[1].entry.groups) {
      met.add([Math.floor(g[0] / 2), Math.floor(g[2] / 2)].sort().join('-'));
    }
  }
  assert.equal(met.size, 15, [...met].join(' '));
});

test('frames keep the render contract: one pose per dancer, in id order', () => {
  const dance = compileNext(stored, 4);
  for (const beat of [0, 10, 21, 33, 40, 52, 63.9, 64, 100]) {
    const frame = dance.sample(beat);
    assert.deepEqual(
      frame.poses.map((p) => p.id),
      [0, 1, 2, 3, 4, 5, 6, 7],
    );
    assert.ok(frame.contacts.every((c) => Number.isFinite(c.point.x) && c.strength > 0));
  }
  assert.equal(dance.dance.figures.length, stored.figures.length);
  assert.equal(dance.music.meter.signature, '2/4');
});
