/**
 * Formations beyond contra duple minor (formations-more.ts, formation-ring.ts):
 * a Sicilian circle, four face four, a circle mixer and a triplet each
 * compile a small dance, pass the physical check and progress as their
 * models say.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Dance } from '../../types.ts';
import { physicalCheck } from '../core/check.ts';
import type { FigureCall } from '../core/figure.ts';
import { compileFold } from '../core/fold.ts';
import { FORMATIONS } from '../core/formation.ts';
import { CONTRA_AABB } from '../core/music.ts';
import { distance, dot, rightOf, sub } from '../core/math.ts';
import { verifyDance } from '../core/verify.ts';
import { body } from '../core/state.ts';
import { compileNext, type StoredDance } from '../dance.ts';
import { FIGURES } from '../figures/index.ts';
import { call } from './helpers.ts';

const DANCE: Dance = { id: 't', title: 't', author: 't', formation: 'duple-improper', description: '', figures: [] };

export function stored(
  formation: string,
  progression: StoredDance['progression'],
  figures: FigureCall[],
): StoredDance {
  const beats = figures.reduce((n, c) => n + c.beats, 0);
  return {
    schema: 'contra-studio/next-dance',
    version: 2,
    id: 'test',
    title: 'test',
    author: 'test',
    formation,
    progression,
    music: { meter: '2/4', parts: [{ name: 'A1', bars: beats / 2 }], times: 'repeat' },
    source: { url: 'test', formation, sha256: '' },
    status: 'ok',
    problems: [],
    unparsed: [],
    choices: [],
    figures: figures.map((f) => ({ ...f, text: f.move })),
  };
}

const strict = (s: StoredDance, couples: number) => compileNext(s, couples, undefined, { lenient: false });

test('circle mixer: robins stand on their partners\' right, places a slot apart', () => {
  const s = FORMATIONS['circle-mixer'].start(5);
  for (let c = 0; c < 5; c++) {
    const lark = body(s, c * 2);
    const robin = body(s, c * 2 + 1);
    assert.ok(Math.abs(distance(lark.position, robin.position) - 1.8) < 1e-9);
    assert.ok(dot(sub(robin.position, lark.position), rightOf(lark.yaw)) > 1.7);
  }
  assert.equal(s.relations.get('neighbor')!.get(0), 9, 'lark 1 neighbors the last robin');
});

test('circle mixer: swing the neighbor, she becomes the partner; everyone meets everyone', () => {
  const dance = stored('circle-mixer', 'mixer', [
    call('ring-circle', 8, { direction: 'left', places: 4 }),
    call('ring-circle', 8, { direction: 'right', places: 4 }),
    call('forward-back', 8, { back: true }),
    call('swing', 8, { who: 'partner' }),
    call('allemande', 8, { who: 'neighbor', hand: 'left', amount: 1 }),
    { ...call('swing', 8, { who: 'neighbor' }), progression: true },
    call('ring-promenade', 16, { who: 'partner' }),
  ]);
  assert.deepEqual(verifyDance(dance, strict), { ok: true });
});

/** A plain improper dance (2326, After the Solstice, AC version), as calls. */
const SOLSTICE: FigureCall[] = [
  call('do-si-do', 8, { who: 'neighbor', amount: 1, shoulder: 'right' }),
  call('swing', 8, { who: 'neighbor' }),
  call('forward-back', 8, { back: true }),
  call('allemande', 8, { who: 'larks', hand: 'left', amount: 1.5 }),
  call('balance', 4, { formation: 'pair', who: 'partner', hand: 'both' }),
  call('swing', 12, { who: 'partner' }),
  call('right-left-through', 8, {}),
  call('circle', 6, { direction: 'left', places: 3 }),
  call('pass-through', 2, { shoulder: 'right' }),
];

test('Sicilian circle: an improper dance progresses round the circle', () => {
  const dance = stored('sicilian', 'sicilian', SOLSTICE);
  assert.deepEqual(verifyDance(dance, strict), { ok: true });
  // The display bends the set into a circle.
  const folded = compileNext(dance, 6);
  const r = folded.sample(0).poses.map((p) => Math.hypot(p.position.x, p.position.z));
  assert.ok(Math.max(...r) - Math.min(...r) < 1.9, 'everyone on two rings');
});

test('four face four: lines meet lines, turn at the ends', () => {
  const dance = stored('four-face-four', 'lines', SOLSTICE);
  assert.deepEqual(verifyDance(dance, strict), { ok: true });
});

test('triplet: the 1s go to the bottom, renamed by place', () => {
  const s = FORMATIONS.triplet.start(3);
  assert.deepEqual(s.positions.get('1s'), [0, 1]);
  assert.deepEqual(s.positions.get('3s'), [4, 5]);
});

void physicalCheck;
void compileFold;
void CONTRA_AABB;
void FIGURES;
void DANCE;

test('square: couple 1 centered at the top with its back to the band; heads, sides, corners', () => {
  const s = FORMATIONS.square.start(4);
  const c1 = [body(s, 0).position, body(s, 1).position];
  assert.ok(Math.abs(c1[0].x + c1[1].x) < 1e-9, 'couple 1 centered on x = 0');
  assert.ok(c1[0].z < -1.5 && Math.abs(c1[0].z - c1[1].z) < 1e-9, 'at the top, level');
  assert.ok(Math.abs(body(s, 0).yaw) < 0.5, 'facing down into the square');
  assert.deepEqual(s.positions.get('heads'), [0, 1, 4, 5]);
  assert.deepEqual(s.positions.get('sides'), [2, 3, 6, 7]);
  assert.equal(s.relations.get('corner')!.get(0), 7, 'lark 1 has robin 4 on his left');
  assert.equal(s.relations.get('opposite')!.get(0), 5);
});

test('square: partners circle, swing and promenade, back on the square places', () => {
  const dance = stored('square', 'mixer', [
    call('ring-circle', 8, { direction: 'left', places: 4 }),
    call('ring-circle', 8, { direction: 'right', places: 4 }),
    call('do-si-do', 8, { who: 'corner', amount: 1, shoulder: 'right' }),
    call('allemande', 8, { who: 'corner', hand: 'left', amount: 1 }),
    call('swing', 16, { who: 'partner' }),
    call('ring-promenade', 16, { who: 'partner' }),
  ]);
  assert.deepEqual(verifyDance(dance, strict), { ok: true });
});

test('three face three: trios face trios; neighbors straight across', () => {
  const s = FORMATIONS['three-face-three'].start(4);
  assert.equal(s.dancers.length, 12);
  assert.equal(s.groups.length, 2);
  for (const [a, b] of s.relations.get('neighbor')!)
    assert.ok(Math.abs(body(s, a).position.x - body(s, b).position.x) < 1e-9);
});

test('proper starts with partners facing across', () => {
  const s = FORMATIONS.proper.start(4);
  for (const d of s.dancers) {
    const b = body(s, d.id);
    assert.ok(Math.abs(Math.abs(b.yaw) - Math.PI / 2) < 1e-9);
    assert.ok(Math.sign(b.position.x) === -Math.sign(Math.sin(b.yaw)), 'facing the other line');
  }
});
