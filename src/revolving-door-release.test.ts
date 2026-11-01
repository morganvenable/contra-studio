import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {revolvingDoorReleaseRest,revolvingDoorReleaseHand,revolvingDoorReleasePole} from './revolving-door-arm-route.ts';
import {auditSourceMesh} from '../test-data/revolving-door/production-mesh.probe.ts';
import {auditReleaseSpeed} from '../test-data/revolving-door/production-release-speed.probe.ts';
import {Avatar as OriginalFailureAvatar} from '../test-data/revolving-door/scene-frozen-baseline.ts';

test('two-stage waist withdrawal preserves exact held/released endpoints and fixed reachable arm targets',()=>{
 const shoulder=new Vector3(-.235,1.355,0),held=new Vector3(-.495,1.18,-.137),rest=new Vector3(-.245,.84,.12),waypoint=revolvingDoorReleaseRest(rest,0);
 assert.deepEqual(waypoint.toArray(),[-.34,1,-.4]);
 assert.ok(revolvingDoorReleaseRest(rest,1).distanceTo(rest)<1e-12);
 for(const strength of[0,1])assert.ok(revolvingDoorReleaseHand(held,strength).distanceTo(held)<1e-12);
 const a=revolvingDoorReleasePole(shoulder,waypoint,rest,0,{point:held,strength:0}),b=revolvingDoorReleasePole(shoulder,waypoint,rest,0);
 assert.ok(a.distanceTo(b)<1e-12,'The release and settle must use the identical rearward bend.');
 for(let i=0;i<=1000;i++){
  const q=i/1000,withdraw=revolvingDoorReleaseHand(waypoint.clone().lerp(held,1-q),1-q),settle=revolvingDoorReleaseRest(rest,q);
  assert.ok(withdraw.distanceTo(shoulder)<.645);assert.ok(settle.distanceTo(shoulder)<.645);
  for(const pole of[revolvingDoorReleasePole(shoulder,withdraw,rest,0,{point:held,strength:1-q}),revolvingDoorReleasePole(shoulder,settle,rest,q)])assert.ok(Math.abs(pole.length()-1)<1e-10);
 }
 for(const bad of[-.1,1.1,NaN,Infinity])assert.throws(()=>revolvingDoorReleaseRest(rest,bad),/outside/);
 assert.throws(()=>revolvingDoorReleasePole(shoulder,shoulder,rest,0),/Degenerate/);
});

test('actual Avatar release and settle clear the formerly penetrating lark arm without hiding other self-body or held-support depths',t=>{
 // The original renderer is a failure control on the same public source motion.
 // Full historical candidate/runtime parity is independently retained elsewhere.
 const beats=Array.from({length:371},(_,i)=>36.85+i/200),before=auditSourceMesh(beats,OriginalFailureAvatar),after=auditSourceMesh(beats);
 assert.ok(before.minLarkRightReleaseTorso.value<-.04,'The frozen comparison must reproduce the original failure.');
 assert.ok(after.minLarkRightReleaseTorso.value>=-.05,'Every sampled changed forearm/elbow/hand vertex must remain outside its own torso.');
 assert.ok(after.dropRelease.minLarkRightReleaseTorso.value>=-.05);assert.ok(after.freeHalf.minLarkRightReleaseTorso.value>=-.05);
 for(const key of['minLeg','minNoncontactArm','minUnassociatedTorso','minArmHead','minSelfArmHead'])assert.ok(after[key].value>=-.05,`${key}: ${JSON.stringify(after[key])}`);
 for(const[key,value]of Object.entries(after.selfTorsoByActorHand)as[string,any][])if(!((key==='0:right')||(key==='2:right')))assert.ok(value.value>=before.selfTorsoByActorHand[key].value-.05,`Own-body metric ${key} no worse than before`);
 // These remain measured residuals, never contact-pair collision exemptions.
 assert.ok(after.minSupportTorso.value<0);assert.ok(after.minDirectedSupportArm.value<0);
 assert.ok(after.minSupportTorso.value>=before.minSupportTorso.value-.05);
 assert.ok(after.minDirectedSupportArm.value>=before.minDirectedSupportArm.value-.05);
 t.diagnostic(JSON.stringify({before:before.minLarkRightReleaseTorso,after:after.minLarkRightReleaseTorso,selfTorsoByActorHand:after.selfTorsoByActorHand,supportTorso:after.minSupportTorso,supportArm:after.minDirectedSupportArm}));
});

test('fractional release joins and adaptive extrema have bounded elbow and whole-hand mesh speed',t=>{
 const result=auditReleaseSpeed();
 for(const[kind,peak]of Object.entries(result.peaks)as[string,any][])assert.ok(peak.speed<3,`${kind}: ${JSON.stringify(peak)}`);
 for(const group of Object.values(result.byRoleHand))for(const peak of Object.values(group))assert.ok(peak.speed<3);
 assert.ok(result.adaptive.some(row=>row.h===1e-7));
 t.diagnostic(JSON.stringify({peaks:result.peaks,byRoleHand:result.byRoleHand}));
});
