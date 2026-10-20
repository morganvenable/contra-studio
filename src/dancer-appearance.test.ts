import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh} from 'three';
import {BODY_PROFILES, BODY_SHAPES, HAIR_TYPES, dancerAppearance} from './dancer-appearance.ts';
import {createDancers} from './engine.ts';
import {Avatar} from './scene.ts';
import {compileChoreography} from './choreography.ts';
import {DANCES} from './catalog.ts';
import type {StudioState} from './types.ts';

function dom() {
  globalThis.document = {createElement: () => ({getContext: () => new Proxy({}, {get: () => () => {}, set: () => true})})} as unknown as Document;
}

function cosmeticGeometry(avatar: Avatar) {
  const torso = avatar.body.getObjectByName('torso') as Mesh;
  const hips = avatar.body.getObjectByName('hips') as Mesh;
  return {
    appearance: avatar.appearance,
    torso: Array.from(torso.geometry.attributes.position.array),
    torsoScale: torso.scale.toArray(),
    hipsScale: hips.scale.toArray(),
    hair: avatar.head.children.filter(child => child.name.startsWith('hair-')).map(child => ({name: child.name, position: child.position.toArray(), scale: child.scale.toArray()})),
  };
}

function motionGeometry(avatar: Avatar) {
  avatar.root.updateMatrixWorld(true);
  return [avatar.root, avatar.body, avatar.head,
    ...avatar.arms.flatMap(arm => [arm.upper, arm.lower, arm.hand, arm.elbow]),
    ...avatar.legs.flatMap(leg => [leg.upper, leg.lower, leg.foot, leg.knee]),
  ].map(part => part.matrixWorld.toArray());
}

test('each role has mixed body and hair types in every supported set size, including two and six couples', () => {
  for (let couples = 2; couples <= 12; couples++) {
    const dancers = createDancers(couples);
    for (const role of ['lark', 'robin'] as const) {
      const appearances = dancers.filter(dancer => dancer.role === role).map(dancer => dancerAppearance(dancer.id));
      const shapes = new Set(appearances.map(appearance => appearance.bodyShape));
      const hairs = new Set(appearances.map(appearance => appearance.hairType));
      assert.ok(shapes.size >= 2, `${couples} couples / ${role} body shapes`);
      assert.ok(hairs.size >= 2, `${couples} couples / ${role} hair types`);
      if (couples >= 6) {
        assert.equal(shapes.size, BODY_SHAPES.length);
        assert.equal(hairs.size, HAIR_TYPES.length);
      }
    }
  }
});

test('appearance is stable identity data, and body/hair choices are independently mixed', () => {
  const appearances = createDancers(12).map(dancer => dancerAppearance(dancer.id));
  assert.deepEqual(appearances, createDancers(12).map(dancer => dancerAppearance(dancer.id)));
  assert.equal(new Set(appearances.map(appearance => appearance.seed)).size, 24);
  assert.ok(appearances.every(Object.isFrozen));
  for (const shape of BODY_SHAPES) {
    assert.equal(new Set(appearances.filter(appearance => appearance.bodyShape === shape).map(appearance => appearance.hairType)).size, HAIR_TYPES.length);
  }
  // This fixed fingerprint protects identity from accidental reshuffling.
  assert.deepEqual(appearances.slice(0, 4).map(({bodyShape, hairType}) => [bodyShape, hairType]), [
    ['tapered', 'short'], ['tapered', 'long'], ['rounded', 'bun'], ['straight', 'short'],
  ]);
});

test('actual Avatar body and hair ignore role, color, couple, direction and construction order', () => {
  dom();
  for (const dancer of createDancers(6).reverse()) {
    const original = new Avatar(dancer);
    const reassigned = new Avatar({...dancer, role: dancer.role === 'lark' ? 'robin' : 'lark', couple: 90, direction: -dancer.direction as 1 | -1, color: '#123456'});
    assert.deepEqual(cosmeticGeometry(original), cosmeticGeometry(reassigned));
    assert.equal(original.root.userData.appearance, original.appearance);
    const torso = original.body.getObjectByName('torso') as Mesh;
    assert.equal((torso.material as any).color.getHexString(), dancer.color.slice(1), 'role color stays readable');
    assert.equal(Boolean(original.head.getObjectByName('hair-bun')), original.appearance.hairType === 'bun');
    assert.equal(Boolean(original.head.getObjectByName('hair-long')), original.appearance.hairType === 'long');
    original.dispose();
    reassigned.dispose();
  }
});

test('body profiles remain within the original cosmetic envelope with fixed shoulder and height anchors', () => {
  const baseline = BODY_PROFILES.rounded;
  for (const profile of Object.values(BODY_PROFILES)) {
    profile.torso.forEach(([radius, height], index) => {
      assert.equal(height, baseline.torso[index][1]);
      assert.ok(radius <= baseline.torso[index][0]);
    });
    assert.deepEqual(profile.torso.filter(([, height]) => height >= .27), baseline.torso.filter(([, height]) => height >= .27), 'fixed waist, back and shoulder contact surfaces');
    assert.equal(profile.depth, baseline.depth);
    profile.hips.forEach((radius, axis) => assert.ok(radius <= baseline.hips[axis]));
  }
});

test('progression, seeks, reloads and resized sets preserve each actual Avatar appearance', () => {
  dom();
  const compiled = compileChoreography(DANCES[0], 6);
  const avatars = compiled.dancers.map(dancer => new Avatar(dancer));
  const before = avatars.map(cosmeticGeometry);
  const state = {dance: compiled.dance, showLabels: false, selectedDancer: -1} as StudioState;
  for (const beat of [0, 3.5, 8, 17.25, 63.999, 64, 96, 128, 0, 96, 3.5]) {
    const frame = compiled.sample(beat);
    avatars.forEach(avatar => avatar.update(frame.poses[avatar.dancer.id], frame, state, compiled.sample));
    assert.deepEqual(avatars.map(cosmeticGeometry), before);
  }
  for (const couples of [2, 6, 12]) {
    const reloaded = createDancers(couples).map(dancer => new Avatar(dancer));
    reloaded.slice(0, 12).forEach((avatar, id) => assert.deepEqual(cosmeticGeometry(avatar), before[id]));
    reloaded.forEach(avatar => avatar.dispose());
  }
  avatars.forEach(avatar => avatar.dispose());
});

test('all body/hair variants retain identical articulated motion and fixed limb lengths', () => {
  dom();
  const compiled = compileChoreography(DANCES[0], 6);
  const avatars = compiled.dancers.map(dancer => new Avatar(dancer));
  const state = {dance: compiled.dance, showLabels: false, selectedDancer: -1} as StudioState;
  // Feed the same motion to different identity-bound cosmetic variants.
  for (const beat of [0, 3.5, 8, 17.25, 31.5, 48.25, 63.75, 64, 96, 0]) {
    const frame = compiled.sample(beat);
    for (const avatar of avatars) {
      avatar.update(frame.poses[0], frame, state, compiled.sample);
      for (const leg of avatar.legs) {
        assert.ok(Math.abs(leg.upper.scale.y * 3 - .43) < 1e-8);
        assert.ok(Math.abs(leg.lower.scale.y * 3 - .43) < 1e-8);
      }
      for (const arm of avatar.arms) {
        assert.ok(Math.abs(arm.upper.scale.y * 3 - .325) < 1e-8);
        assert.ok(Math.abs(arm.lower.scale.y * 3 - .325) < 1e-8);
      }
    }
    const expected = motionGeometry(avatars[0]);
    avatars.forEach(avatar => assert.deepEqual(motionGeometry(avatar), expected));
  }
  avatars.forEach(avatar => avatar.dispose());
});
