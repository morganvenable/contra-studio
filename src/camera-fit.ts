import * as THREE from 'three';
import type { CompiledDance } from './types.ts';

/** Conservative performer envelope, including labels and hand reach. */
export function choreographyBounds(compiled: CompiledDance): THREE.Box3 {
  const bounds = new THREE.Box3();
  for (let beat = 0; beat <= compiled.totalBeats * 2; beat += .5) {
    for (const pose of compiled.sample(beat).poses) {
      if (!Number.isFinite(pose.position.x) || !Number.isFinite(pose.position.z)) throw new Error('Cannot frame invalid dancer positions.');
      bounds.expandByPoint(new THREE.Vector3(pose.position.x - .7, -.05, pose.position.z - .7));
      bounds.expandByPoint(new THREE.Vector3(pose.position.x + .7, 2.3, pose.position.z + .7));
    }
  }
  return bounds;
}

/** Fit along the current view ray, preserving its direction rather than resetting orbit. */
export function fitPerspectiveCamera(camera: THREE.PerspectiveCamera, bounds: THREE.Box3, target: THREE.Vector3, margin = 1.12): number {
  if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray(), ...target.toArray()].every(Number.isFinite)) throw new Error('Camera bounds must be finite and nonempty.');
  if (!(camera.aspect > 0) || !Number.isFinite(camera.aspect) || !(camera.fov > 0 && camera.fov < 179) || !(margin >= 1 && Number.isFinite(margin))) throw new Error('Invalid camera fit parameters.');
  const back = camera.position.clone().sub(target);
  if (back.lengthSq() < 1e-12) back.set(1, 1, 1);
  back.normalize();
  camera.position.copy(target).add(back);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV()) / 2);
  const tanX = tanY * camera.aspect;
  let distance = 3;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new THREE.Vector3(x, y, z).sub(target);
    const depth = point.dot(back);
    distance = Math.max(distance, depth + margin * Math.abs(point.dot(right)) / tanX, depth + margin * Math.abs(point.dot(up)) / tanY, depth + camera.near * 2);
  }
  camera.position.copy(target).addScaledVector(back, distance);
  camera.far = Math.max(camera.far, distance + bounds.getSize(new THREE.Vector3()).length() + 10);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return distance;
}
