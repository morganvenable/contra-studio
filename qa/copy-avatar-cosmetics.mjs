// Test-only appearance normalization. Never replace an articulated object,
// update method, contact anchor or motion calculation on the reference rig.
import assert from 'node:assert/strict';

export function copyAvatarCosmetics(target, source) {
  const torso = target.body.children.find(part => part.geometry?.type === 'LatheGeometry');
  const sourceTorso = source.body.children.find(part => part.geometry?.type === 'LatheGeometry');
  const head = target.body.children.find(part => part.isGroup && part.position.y === 1.62);
  const sourceHead = source.body.children.find(part => part.isGroup && part.position.y === 1.62);
  assert(torso && sourceTorso && head && sourceHead);
  assert.equal(target.body.children[1].geometry.type, 'SphereGeometry');
  assert.equal(source.body.children[1].geometry.type, 'SphereGeometry');
  assert(head.children.length >= 8 && head.children.length <= 9);
  assert(sourceHead.children.length >= 8 && sourceHead.children.length <= 9);
  torso.geometry.dispose();
  torso.geometry = sourceTorso.geometry.clone();
  torso.scale.copy(sourceTorso.scale);
  target.body.children[1].scale.copy(source.body.children[1].scale);
  // Head, face, ears and eyes are fixed. Only the cap/back/optional hair moves.
  for (const hair of head.children.slice(6)) head.remove(hair);
  for (const hair of sourceHead.children.slice(6)) {
    const copy = hair.clone();
    copy.geometry = hair.geometry.clone();
    copy.material = hair.material.clone();
    head.add(copy);
  }
  assert.deepEqual(Array.from(torso.geometry.attributes.position.array), Array.from(sourceTorso.geometry.attributes.position.array));
}
