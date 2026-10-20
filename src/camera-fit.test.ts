import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { fitPerspectiveCamera, choreographyBounds } from './camera-fit.ts';
import { compileDance } from './engine.ts';
import { compileBecketDance } from './choreography.ts';
import { DANCES, BUTTER_CANDIDATE } from './catalog.ts';

test('camera presets fit performer envelopes at portrait and landscape aspects without changing view direction', () => {
  for (const count of [2, 6, 12]) for (const compiled of [compileDance(DANCES[0], count), compileBecketDance(BUTTER_CANDIDATE, count)]) {
    const box = choreographyBounds(compiled);
    for (const aspect of [.4, .55, .75, 1.1, 1.8, 2.4]) for (const position of [[10.2, 12.4, 14.8], [0, 19, .01], [15, 4.8, 1]]) {
      const camera = new THREE.PerspectiveCamera(38, aspect, .1, 100);
      camera.position.fromArray(position);
      const target = new THREE.Vector3(0, .5, 0), originalDirection = camera.position.clone().sub(target).normalize();
      const distance = fitPerspectiveCamera(camera, box, target);
      assert.ok(Number.isFinite(distance));
      assert.ok(camera.position.clone().sub(target).normalize().distanceTo(originalDirection) < 1e-10);
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x,y,z).project(camera);
        assert.ok(Math.abs(p.x) <= 1 / 1.12 + 1e-9 && Math.abs(p.y) <= 1 / 1.12 + 1e-9, `clipped: ${count}/${aspect}/${position}: ${p.toArray()}`);
        assert.ok(p.z >= -1 && p.z <= 1);
      }
    }
  }
});

test('camera fitting rejects invalid boxes and aspect ratios', () => {
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 100), target = new THREE.Vector3();
  assert.throws(() => fitPerspectiveCamera(camera, new THREE.Box3(), target));
  camera.aspect = 0;
  assert.throws(() => fitPerspectiveCamera(camera, new THREE.Box3(new THREE.Vector3(-1,-1,-1), new THREE.Vector3(1,1,1)), target));
});
