/** Geometry-preserving browser port of frozen reciprocal study 1309cde7.
 * Owned visible avatars must already have their standard source articulation and
 * body contact anchors applied. This adapter owns only its private references.
 * No source/root/identity/timing mutation; scope/contact ownership is enforced by
 * SwingPresentationController. Keep the fixed twelve-pass hand route unchanged.
 */
import * as T from 'three';
import {createReciprocalMath} from './swing-study-kernel.mjs';
import {RECIPROCAL_FRAME_SETTINGS as settings, RECIPROCAL_FRAME_CONFIGURATION as config} from './swing-study-inputs.ts';
const Y = new T.Vector3(0, 1, 0), V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }, wrap = x => Math.atan2(Math.sin(x), Math.cos(x));
const {positionBone:bone,joint,torsoRadius,pairInfo,handClearanceCorrection}=createReciprocalMath(T);
export class ReciprocalPoseAdapter {
    constructor(compiled, avatars, dependencies, { footwork = 'buzz' } = {}) {
        this.c = compiled; this.dance = compiled.dance; this.avatars = avatars;
        this.reference = compiled.dancers.map(d => dependencies.createAvatar(d));
        this.applyBodyContactAnchors = dependencies.applyBodyContactAnchors;
        this.footwork = footwork; this.basePlants = new Map(); this.frames = new Map(); this.armAnchors = [];
    }
    sample(beat) { const b = Math.max(0, beat); if (!this.frames.has(b)) {
        this.frames.set(b, this.c.sample(b));
        if (this.frames.size > 1024)
            this.frames.delete(this.frames.keys().next().value);
    } return this.frames.get(b); }
    info(beat, a, b) { return pairInfo(this.sample(beat), this.c.dancers, a, b); }
    basePlant(id, side, phase) { const key = `${id}:${side}:${phase}`; if (this.basePlants.has(key))
        return this.basePlants.get(key); const at = Math.max(0, phase + .25), f = this.sample(at), a = this.reference[id]; a.update(f.poses[id], f, { dance: this.dance, showLabels: false, selectedDancer: -1 }, b => this.sample(b)); a.root.updateMatrixWorld(true); const leg = a.legs.find(l => l.side === side); const result = { point: leg.foot.getWorldPosition(V()), q: leg.foot.getWorldQuaternion(new T.Quaternion()) }; this.basePlants.set(key, result); if (this.basePlants.size > 512)
        this.basePlants.delete(this.basePlants.keys().next().value); return result; }
    desiredPlant(id, side, phase, a, b) { const base = this.basePlant(id, side, phase), at = phase + .5, info = this.info(at, a, b); if (info.gate === 0)
        return { ...base, gate: 0 }; const sign = id === a ? 1 : -1, theta = info.theta + (sign === 1 ? 0 : Math.PI), r = side < 0 ? settings.innerFootRadius : settings.outerFootRadius, angle = theta + (side < 0 ? .20 : -.13), point = info.center.clone().add(V(r * Math.cos(angle), .055, r * Math.sin(angle))), yaw = -theta + (side < 0 ? -.12 : -.35), q = new T.Quaternion().setFromAxisAngle(Y, yaw); return { point: base.point.clone().lerp(point, info.gate), q: base.q.clone().slerp(q, info.gate), gate: info.gate }; }
    armAnchor(beat, a, b) {
        let interval = this.armAnchors.find(x => x.a === a && x.b === b && beat >= x.start && beat <= x.end);
        if (!interval) {
            let left = Math.floor(beat), right = Math.ceil(beat);
            for (let n = 0; n < 80 && left > 0 && this.info(left, a, b).gate > 0; n++) left = Math.max(0, left - 1);
            for (let n = 0; n < 80 && this.info(right, a, b).gate > 0; n++) right += 1;
            let lo = left, hi = left + 1;
            for (let n = 0; n < 32; n++) { const mid = (lo + hi) / 2; if (this.info(mid, a, b).gate > 0) hi = mid; else lo = mid; }
            const start = lo;
            lo = right - 1; hi = right;
            for (let n = 0; n < 32; n++) { const mid = (lo + hi) / 2; if (this.info(mid, a, b).gate > 0) lo = mid; else hi = mid; }
            const end = hi, poses = [];
            for (const at of [start, end]) {
                const frame = this.sample(at), state = { dance: this.dance, showLabels: false, selectedDancer: -1 };
                for (const avatar of this.reference) { avatar.update(frame.poses[avatar.dancer.id], frame, state, x => this.sample(x)); avatar.root.updateMatrixWorld(true); }
                this.applyBodyContactAnchors(this.reference, frame);
                poses.push([a, b].map(id => { const avatar = this.reference[id]; avatar.root.updateMatrixWorld(true); return avatar.arms.map(arm => ({ wrist: arm.hand.position.clone(), elbow: arm.elbow.position.clone(), handQ: arm.hand.quaternion.clone() })); }));
            }
            poses[0].direction = 'entry'; poses[1].direction = 'exit';
            poses[0].activity = this.sample(start + 1e-5).poses[a].activity; poses[1].activity = this.sample(end - 1e-5).poses[a].activity;
            for (const p of poses) { p.start = start; p.end = end; }
            interval = { a, b, start, end, poses };
            this.armAnchors.push(interval);
            if (this.armAnchors.length > 128) this.armAnchors.shift();
        }
        return interval.poses[beat < (interval.start + interval.end) / 2 ? 0 : 1];
    }
    apply(frame) {
        const beat = frame.beat, snapshots = new Map();
        for (const avatar of this.avatars) {
            avatar.root.updateMatrixWorld(true);
            snapshots.set(avatar.dancer.id, { hip: avatar.root.localToWorld(V(avatar.root.userData.hipPosition.x, avatar.root.userData.hipPosition.y, avatar.root.userData.hipPosition.z)), bodyP: avatar.body.position.clone(), bodyQ: avatar.body.quaternion.clone(), arms: avatar.arms.map(arm => ({ shoulder: avatar.body.localToWorld(V(arm.side * .235, 1.355, 0)), wrist: arm.hand.getWorldPosition(V()), elbow: arm.elbow.getWorldPosition(V()), handQ: arm.hand.getWorldQuaternion(new T.Quaternion()) })), feet: avatar.legs.map(leg => ({ point: leg.foot.getWorldPosition(V()), knee: leg.knee.getWorldPosition(V()), q: leg.foot.getWorldQuaternion(new T.Quaternion()) })) });
        }
        const pairKeys = new Map();
        for (const offset of [-1.5, 0, 1.5]) {
            const f = this.sample(beat + offset), cs = [...f.contacts, ...f.poses.flatMap(p => p.swingPreparation?.contacts ?? [])];
            for (const c of cs) {
                if (c.kind !== 'swing-frame')
                    continue;
                let a = c.a, b = c.b;
                if (this.c.dancers[a].role !== 'lark')
                    [a, b] = [b, a];
                pairKeys.set(`${a}:${b}`, { a, b });
            }
        }
        const pairs = [...pairKeys.values()].map(({ a, b }) => this.info(beat, a, b)).sort((x, y) => y.gate - x.gate), used = new Set();
        const diagnostics = { beat, pairs: [], reachClamps: 0, maxReachExcess: 0, reachRecords: [], lowerRecords: [], budgetFailures: [], maxArmBoneError: 0, maxLegBoneError: 0, maxWristHandAlignmentError: 0, palmTargets: [], posedContacts: [], footwork: this.footwork };
        for (const pair of pairs) {
            const { a, b, gate, center, theta } = pair;
            if (used.has(a) || used.has(b))
                continue;
            used.add(a);
            used.add(b);
            const actors = [this.avatars[a], this.avatars[b]], rotation = -theta;
            diagnostics.pairs.push({ ...pair, center: center.toArray() });
            for (let index = 0; index < 2; index++) {
                const avatar = actors[index], id = avatar.dancer.id, baseline = snapshots.get(id), sign = index === 0 ? 1 : -1, radial = V(Math.cos(theta) * sign, 0, Math.sin(theta) * sign), hip = center.clone().addScaledVector(radial, settings.hipGap / 2);
                hip.y = settings.hipY + .004 * Math.sin(beat * Math.PI * 2);
                const yaw = -theta + (index === 0 ? -Math.PI / 2 : Math.PI / 2) + settings.chestYaw[index] * Math.PI / 180, qYaw = new T.Quaternion().setFromAxisAngle(Y, yaw), leanAxis = Y.clone().cross(radial).normalize(), qLean = new T.Quaternion().setFromAxisAngle(leanAxis, settings.lean), qWorld = qLean.multiply(qYaw), qLocal = avatar.root.quaternion.clone().invert().multiply(qWorld), bodyWorld = hip.clone().sub(V(0, .9, 0).applyQuaternion(qWorld)), bodyLocal = avatar.root.worldToLocal(bodyWorld);
                avatar.body.position.copy(baseline.bodyP).lerp(bodyLocal, gate);
                avatar.body.quaternion.copy(baseline.bodyQ).slerp(qLocal, gate);
                avatar.root.updateMatrixWorld(true);
                const head = avatar.head;
                head.rotation.y = -(settings.chestYaw[index] - 5) * Math.PI / 180 * gate;
                avatar.root.updateMatrixWorld(true);
                const actualHip = avatar.body.localToWorld(V(0, .9, 0));
                avatar.root.userData.candidateHip = actualHip.toArray();
                const legPlans = []; let anyLegActive = false;
                for (let j = 0; j < 2; j++) {
                    const leg = avatar.legs[j], offset = leg.side > 0 ? 1 : 0, phase = Math.floor((beat - offset) / 2) * 2 + offset, u = beat - phase, from = this.desiredPlant(id, leg.side, phase, a, b), to = this.desiredPlant(id, leg.side, phase + 2, a, b);
                    const ownLegActive = gate > 0 || from.gate > 0 || to.gate > 0;
                    anyLegActive ||= ownLegActive;
                    let footWorld, q;
                    if (this.footwork === 'walk' || !ownLegActive) {
                        footWorld = snapshots.get(id).feet[j].point.clone();
                        q = snapshots.get(id).feet[j].q.clone();
                    }
                    else {
                        const t = ease(u - 1);
                        footWorld = from.point.clone().lerp(to.point, t);
                        if (u >= 1) {
                            const middle = this.info(phase + 1.5, a, b), C = middle.center, fromAngle = Math.atan2(from.point.z - C.z, from.point.x - C.x), toAngle = Math.atan2(to.point.z - C.z, to.point.x - C.x), radius = (1 - t) * Math.hypot(from.point.x - C.x, from.point.z - C.z) + t * Math.hypot(to.point.x - C.x, to.point.z - C.z), middleAngle = middle.theta + (id === a ? 0 : Math.PI) + (leg.side < 0 ? .20 : -.13), delta = wrap(middleAngle - fromAngle) + wrap(toAngle - middleAngle), arc = C.clone().add(V(Math.cos(fromAngle + delta * t) * radius, .055, Math.sin(fromAngle + delta * t) * radius));
                            footWorld.lerp(arc, Math.max(from.gate, to.gate));
                            footWorld.y += Math.sin(Math.PI * Math.max(0, u - 1)) * (leg.side < 0 ? settings.lift[0] : settings.lift[1]);
                        }
                        q = from.q.clone().slerp(to.q, t);
                        if (from.gate > 0 || to.gate > 0) {
                            const F = V(0, 0, 1).applyQuaternion(from.q), G = V(0, 0, 1).applyQuaternion(to.q), fromYaw = Math.atan2(F.x, F.z), toYaw = Math.atan2(G.x, G.z), midYaw = -this.info(phase + 1.5, a, b).theta - (id === a ? 0 : Math.PI) + (leg.side < 0 ? -.12 : -.35), turn = wrap(midYaw - fromYaw) + wrap(toYaw - midYaw);
                            q.setFromAxisAngle(Y, fromYaw + turn * t);
                        }
                    }
                    if (u >= 1 && from.gate < 1e-8 && to.gate > 0) {
                        const acquire = ease(Math.max(gate, (u - 1 - .45) / .55));
                        footWorld = snapshots.get(id).feet[j].point.clone().lerp(footWorld, acquire);
                        q = snapshots.get(id).feet[j].q.clone().slerp(q, acquire);
                    }
                    if (this.footwork === 'buzz' && u >= 1 && from.gate === 0 && to.gate === 0) {
                        // Plant endpoints already include their source-to-frame blend.
                        // Blend only a wholly source-anchored flight, never attenuate a
                        // partially acquired plant again at the stance/flight boundary.
                        const footMix = gate;
                        footWorld = snapshots.get(id).feet[j].point.clone().lerp(footWorld, footMix);
                        q = snapshots.get(id).feet[j].q.clone().slerp(q, footMix);
                    }
                    const foot = avatar.root.worldToLocal(footWorld), hipLocal = avatar.root.worldToLocal(baseline.hip.clone().lerp(actualHip, gate)), hipOffset = V(leg.side * .105, 0, 0);
                    hipLocal.add(hipOffset);
                    const ankle = foot.clone().add(V(0, .045, -.015));
                    const legGate = Math.max(gate, (1 - ease(u - 1)) * from.gate + ease(u - 1) * to.gate);
                    const desiredKnee = V(sign * .45, 0, sign).applyAxisAngle(Y, -theta).applyQuaternion(avatar.root.quaternion.clone().invert());
                    const kneePole = V(0, 0, 1).lerp(desiredKnee.normalize(), legGate).normalize();
                    legPlans.push({ leg, foot, hipLocal, ankle, kneePole, q });
                }
                if (!anyLegActive) legPlans.length = 0;
                // Lower a compliant pelvis rather than stretching legs or dragging a planted foot.
                let needed = 0;
                for (const p of legPlans) {
                    const horizontal = Math.hypot(p.ankle.x - p.hipLocal.x, p.ankle.z - p.hipLocal.z);
                    needed = Math.max(needed, p.hipLocal.y - p.ankle.y - Math.sqrt(Math.max(0, .855 * .855 - horizontal * horizontal)));
                }
                const lower = Math.max(0, needed);
                avatar.body.position.y -= lower;
                actualHip.y -= lower;
                avatar.root.userData.candidateHip = actualHip.toArray();
                diagnostics.maxPelvisExtraLowering = Math.max(diagnostics.maxPelvisExtraLowering ?? 0, lower);
                if (lower > 0)
                    diagnostics.lowerRecords.push({ id, beat, gate, lower });
                if (lower > settings.maxExtraPelvisLowering)
                    diagnostics.budgetFailures.push({ id, beat, kind: 'extra-pelvis-lowering', value: lower, limit: settings.maxExtraPelvisLowering });
                for (const { leg, foot, hipLocal, ankle, kneePole, q } of legPlans) {
                    hipLocal.y -= lower;
                    const reach = hipLocal.distanceTo(ankle);
                    if (reach > .859) {
                        diagnostics.reachClamps++;
                        diagnostics.maxReachExcess = Math.max(diagnostics.maxReachExcess, reach - .859);
                        diagnostics.reachRecords.push({ part: 'leg', id, side: leg.side, beat, excess: reach - .859, gate });
                    }
                    const knee = joint(hipLocal, ankle, .43, kneePole);
                    bone(leg.upper, hipLocal, knee, .083);
                    bone(leg.lower, knee, ankle, .064);
                    leg.knee.position.copy(knee);
                    leg.foot.position.copy(foot);
                    leg.foot.quaternion.copy(avatar.root.quaternion.clone().invert().multiply(q));
                    diagnostics.maxLegBoneError = Math.max(diagnostics.maxLegBoneError, Math.abs(hipLocal.distanceTo(knee) - .43), Math.abs(knee.distanceTo(ankle) - .43));
                }
                avatar.root.updateMatrixWorld(true);
            }
            if (gate === 0) continue;
            const anchoredArms = this.armAnchor(beat, a, b), armGate = Math.min(ease((beat - anchoredArms.start) / .9), ease((anchoredArms.end - beat) / .9));
            Object.assign(diagnostics.pairs.find(p => p.a === a && p.b === b), {armGate, start: anchoredArms.start, end: anchoredArms.end});
            const leadingShoulders = actors.map((avatar, index) => avatar.body.localToWorld(V(index === 0 ? .235 : -.235, 1.355, 0))), out = V(Math.sin(theta), 0, -Math.cos(theta)).negate(), joined = leadingShoulders[0].clone().add(leadingShoulders[1]).multiplyScalar(.5).addScaledVector(V(...config.hands[1]).setY(0).normalize().applyAxisAngle(Y, rotation), .16);
            joined.y = (leadingShoulders[0].y + leadingShoulders[1].y) / 2 - .045;
            // Keep leading joined point based on actual shoulder opening, not the old root midpoint.
            const outer = V(1, 0, 0).transformDirection(actors[0].body.matrixWorld).add(V(-1, 0, 0).transformDirection(actors[1].body.matrixWorld)).normalize();
            joined.copy(leadingShoulders[0]).add(leadingShoulders[1]).multiplyScalar(.5).addScaledVector(outer, .16);
            joined.y = (leadingShoulders[0].y + leadingShoulders[1].y) / 2 - .045;
            for (let index = 0; index < 2; index++) {
                const avatar = actors[index], id = avatar.dancer.id, other = actors[1 - index], gate = armGate;
                for (let j = 0; j < 2; j++) {
                    const arm = avatar.arms[j], support = index === j, index4 = index * 2 + j, anchorArm = anchoredArms[index][j], S = avatar.body.localToWorld(V(arm.side * .235, 1.355, 0));
                    const baseline = { shoulder: S.clone(), wrist: avatar.body.localToWorld(anchorArm.wrist.clone()), elbow: avatar.body.localToWorld(anchorArm.elbow.clone()), handQ: avatar.body.getWorldQuaternion(new T.Quaternion()).multiply(anchorArm.handQ) };
                    let target = joined.clone(), palm = target.clone(), qWorld, contactSurface;
                    if (support) {
                        const x = index === 0 ? settings.bladeX : -settings.bladeX, y = settings.bladeY, r = torsoRadius(y), z = -.7 * Math.sqrt(r * r - x * x), bp = V(x, y, z), normal = V(x, -r * (.245 - .225) / (.07), z / .49).normalize().transformDirection(other.body.matrixWorld), side = V(Math.sign(x), 0, 0).transformDirection(other.body.matrixWorld);
                        contactSurface = other.body.localToWorld(bp);
                        palm = contactSurface.clone().addScaledVector(normal, .029);
                        const tangent = side.clone().addScaledVector(normal, -side.dot(normal)).normalize();
                        target = palm.clone().addScaledVector(tangent, settings.wristOffset);
                        const handY = tangent.clone().negate(), handZ = normal, handX = handY.clone().cross(handZ).normalize(), orthY = handZ.clone().cross(handX).normalize();
                        qWorld = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(handX, orthY, handZ));
                        if (gate > 0 && gate < 1)
                            target.addScaledVector(side, .065 * Math.sin(Math.PI * gate));
                    }
                    let W = baseline.wrist.clone().lerp(target, gate);
                    if (support && gate > 0 && gate < 1) {
                        const outward = V(arm.side, 0, 0).transformDirection(avatar.body.matrixWorld), forward = V(0, 0, 1).transformDirection(avatar.body.matrixWorld), waypoint = S.clone().addScaledVector(outward, index === 0 ? .16 : .35).addScaledVector(forward, .06);
                        waypoint.y += index === 0 ? -.12 : .08;
                        W = gate < .45 ? baseline.wrist.clone().lerp(waypoint, ease(gate / .45)) : waypoint.lerp(target, ease((gate - .45) / .55));
                    }
                    const lowHeyRoute = support && index === 0 && anchoredArms.activity === 'hey' && gate > 0 && gate < .65 ? Math.sin(Math.PI * gate / .65) ** 2 : 0;
                    W.y -= .14 * lowHeyRoute;
                    if (support && index === 1 && gate > 0 && gate < 1)
                        W.y += .06 * Math.sin(Math.PI * gate);
                    const desiredPole = V(...config.poles[index4]).applyAxisAngle(Y, rotation);
                    if (!support) desiredPole.y = -.45;
                    desiredPole.y -= .8 * lowHeyRoute;
                    const poleGate = support ? ease(gate / .50) : gate, armAxis = W.clone().sub(S).normalize(), oldAxis = baseline.wrist.clone().sub(baseline.shoulder).normalize();
                    const middleLocal = V(arm.side * (index === 0 ? .16 : .35), index === 0 ? -.12 : .08 + .06 * Math.sin(Math.PI * .45), .06);
                    if (support && index === 0 && anchoredArms.activity === 'hey') middleLocal.y -= .14 * Math.sin(Math.PI * .45 / .65) ** 2;
                    const middleAxis = middleLocal.transformDirection(avatar.body.matrixWorld);
                    const transport = (normal, from, viaMiddle) => {
                        const n = normal.clone();
                        if (viaMiddle) return n.applyQuaternion(new T.Quaternion().setFromUnitVectors(from, middleAxis)).applyQuaternion(new T.Quaternion().setFromUnitVectors(middleAxis, armAxis));
                        return n.applyQuaternion(new T.Quaternion().setFromUnitVectors(from, armAxis));
                    };
                    const baseBend = baseline.elbow.clone().sub(baseline.shoulder), oldNormal = baseBend.addScaledVector(oldAxis, -baseBend.dot(oldAxis)).normalize();
                    const oldPole = transport(oldNormal, oldAxis, support && gate > .45);
                    const targetAxis = target.clone().sub(S).normalize(), targetNormal = desiredPole.clone().addScaledVector(targetAxis, -desiredPole.dot(targetAxis)).normalize();
                    const nextPole = transport(targetNormal, targetAxis, support && gate < .45);
                    let poleAngle = Math.atan2(armAxis.dot(oldPole.clone().cross(nextPole)), oldPole.dot(nextPole));
                    if (support && index === 1 && anchoredArms.direction === 'entry' && anchoredArms.activity !== 'hey' && anchoredArms.activity !== 'balance' && poleAngle > 0) poleAngle -= Math.PI * 2;
                    const pole = oldPole.clone().applyAxisAngle(armAxis, poleAngle * poleGate);
                    (diagnostics.armRoutes ??= []).push({id, side:arm.side, support, gate, poleAngle, poleGate, reach:S.distanceTo(W)});
                    let E, handQ, actualHandQ, centerHand;
                    const solveHand = () => {
                        E = joint(S, W, .325, pole);
                        handQ = qWorld ?? new T.Quaternion().setFromUnitVectors(Y, W.clone().sub(E).normalize());
                        actualHandQ = baseline.handQ.clone().slerp(handQ, support ? ease(gate / .45) : gate);
                        centerHand = support ? W.clone().addScaledVector(V(0, 1, 0).applyQuaternion(actualHandQ), settings.wristOffset * gate) : W.clone();
                    };
                    solveHand();
                    // Route the complete oriented hand, not just its wrist joint, around the recipient.
                    // The settled contact is unchanged. Every correction re-solves fixed-length limbs.
                    const beforeRoute = W.clone();
                    if (gate > 0 && gate < 1) for (let attempt = 0; attempt < 12; attempt++) {
                        const inverse = other.body.matrixWorld.clone().invert(), vertices = arm.hand.geometry.attributes.position;
                        const correction = handClearanceCorrection(vertices, actualHandQ, centerHand, inverse, other.body.getWorldQuaternion(new T.Quaternion()));
                        W.addScaledVector(correction.direction, correction.amount);
                        solveHand();
                    }
                    diagnostics.maxHandRouteOffset = Math.max(diagnostics.maxHandRouteOffset ?? 0, beforeRoute.distanceTo(W));
                    const distance = S.distanceTo(W);
                    if (distance > .649) {
                        diagnostics.reachClamps++;
                        diagnostics.maxReachExcess = Math.max(diagnostics.maxReachExcess, distance - .649);
                        diagnostics.reachRecords.push({ part: 'arm', id, side: arm.side, beat, excess: distance - .649, gate });
                        W.sub(S).setLength(.649).add(S);
                        solveHand();
                    }
                    const SL = avatar.body.worldToLocal(S.clone()), EL = avatar.body.worldToLocal(E.clone()), WL = avatar.body.worldToLocal(W.clone());
                    bone(arm.upper, SL, EL, .055);
                    bone(arm.lower, EL, WL, .044);
                    arm.elbow.position.copy(EL);
                    arm.hand.position.copy(avatar.body.worldToLocal(centerHand.clone()));
                    arm.hand.quaternion.copy(avatar.body.getWorldQuaternion(new T.Quaternion()).invert().multiply(actualHandQ));
                    arm.hand.scale.y = .068;
                    diagnostics.maxArmBoneError = Math.max(diagnostics.maxArmBoneError, Math.abs(S.distanceTo(E) - .325), Math.abs(E.distanceTo(W) - .325));
                    if (support && gate > .9999) {
                        const handBase = centerHand.clone().addScaledVector(V(0, -1, 0).applyQuaternion(handQ), settings.wristOffset);
                        diagnostics.maxWristHandAlignmentError = Math.max(diagnostics.maxWristHandAlignmentError, W.distanceTo(handBase));
                    }
                    if (gate > .9999)
                        diagnostics.posedContacts.push({ a: id, b: other.dancer.id, hand: arm.side < 0 ? 'right' : 'left', kind: support ? 'blade-palm' : 'leading-hand', surface: support ? contactSurface.toArray() : joined.toArray(), palmCenter: centerHand.toArray(), wrist: W.toArray(), strength: 1 });
                    if (support && gate > .9999)
                        diagnostics.palmTargets.push({ id, other: other.dancer.id, hand: arm.side < 0 ? 'right' : 'left', surface: contactSurface.toArray(), normal: V(0, 0, 1).applyQuaternion(qWorld).toArray(), center: centerHand.toArray(), target: palm.toArray(), error: centerHand.distanceTo(palm) });
                }
                avatar.root.updateMatrixWorld(true);
            }
        }
        return { avatars: this.avatars, frame, diagnostics };
    }
    dispose() {
        this.frames.clear();
        this.basePlants.clear();
        this.armAnchors.length = 0;
        for (const avatar of this.reference) avatar.dispose();
    }
}
