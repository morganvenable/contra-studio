/** Pure numerical extraction of reviewed1309cde7, with Three injected by the caller.
 * No filesystem, environment, DOM, source compilation, cache, or source mutation.
 * positionBone is the explicitly mutating mesh-placement helper; all other returned
 * functions allocate their outputs and leave their inputs unchanged.
 * The full adapter and truthful contact ownership remain the port caller's job.
 */
export function createReciprocalMath(T) {
const Y = new T.Vector3(0,1,0), V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
function positionBone(m, a, b, r) { m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize()); m.scale.set(r, a.distanceTo(b) / 3, r); }
function joint(a, b, l, pole) { const v = b.clone().sub(a), d = Math.max(1e-8, v.length()); v.divideScalar(d); const n = pole.clone().addScaledVector(v, -pole.dot(v)); if (n.lengthSq() < 1e-10)
    n.set(0, 0, 1).addScaledVector(v, -v.z); n.normalize(); return a.clone().addScaledVector(v, d / 2).addScaledVector(n, Math.sqrt(Math.max(0, l * l - d * d / 4))); }
function torsoRadius(y) { const r = [[.91, .197], [.97, .195], [1.11, .17], [1.27, .225], [1.34, .245], [1.4, .18], [1.42, .11]]; let i = 1; while (i < r.length - 1 && r[i][0] < y)
    i++; return r[i - 1][1] + (r[i][1] - r[i - 1][1]) * (y - r[i - 1][0]) / (r[i][0] - r[i - 1][0]); }
function pairInfo(frame, dancers, a, b) { const prep = frame.poses[a].swingPreparation; const contacts = frame.contacts.filter(c => c.kind === 'swing-frame' && ((c.a === a && c.b === b) || (c.a === b && c.b === a))); let gate = 0; if (contacts.length) {
    const back = contacts.find(c => c.target === 'back');
    gate = Math.max(0, ...contacts.map(c => c.strength)) * (back?.bodyBlend ?? 1);
} if (prep?.contacts.some(c => c.a === a && c.b === b || c.a === b && c.b === a))
    gate = Math.max(gate, prep.strength); const pa = frame.poses[a], pb = frame.poses[b], center = V((pa.position.x + pb.position.x) / 2, 0, (pa.position.z + pb.position.z) / 2), theta = Math.atan2(pa.position.z - pb.position.z, pa.position.x - pb.position.x); return { a, b, gate, center, theta }; }

function handClearanceCorrection(vertices, actualHandQ, centerHand, inverse, recipientWorldQuaternion) {
                        let worst = 0; const directionSum = V();
                        for (let vi = 0; vi < vertices.count; vi++) {
                            const p = V().fromBufferAttribute(vertices, vi).multiply(V(.042, .068, .029)).applyQuaternion(actualHandQ).add(centerHand).applyMatrix4(inverse);
                            const clampY = y => Math.max(.91, Math.min(1.42, y)), r = torsoRadius(clampY(p.y));
                            const radial = (Math.hypot(p.x, p.z / .7) - r) * .7, bottom = .91 - p.y, top = p.y - 1.42;
                            const margin = Math.max(radial, bottom, top);
                            if (margin >= 0) continue;
                            worst = Math.min(worst, margin);
                            // Continuous whole-hand constraint: no worst-vertex normal
                            // switch, profile-ring slope switch or fixed clearance kick.
                            // The exact body field still controls penetration depth;
                            // only the correction direction is smoothly averaged.
                            const width = .015, slope = (torsoRadius(clampY(p.y + width)) - torsoRadius(clampY(p.y - width))) / (2 * width);
                            const radialNormal = V(p.x, -r * slope, p.z / .49).normalize();
                            const weights = [radial, bottom, top].map(value => Math.exp((value - margin) / width));
                            const direction = radialNormal.multiplyScalar(weights[0]).add(V(0, weights[2] - weights[1], 0)).normalize();
                            directionSum.addScaledVector(direction, margin * margin);
                        }
                        const denominator = Math.sqrt(directionSum.lengthSq() + 1e-16);
                        directionSum.divideScalar(denominator).applyQuaternion(recipientWorldQuaternion);

 return {direction: directionSum, amount: -worst * 1.5};
}
return {positionBone,joint,torsoRadius,pairInfo,handClearanceCorrection};
}
