import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleStudy,FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE} from './execution-timing-study.ts';
import {sampleSwingTorsoStudy} from './swing-torso-study.ts';
const d=(a:{x:number;z:number;y?:number},b:{x:number;z:number;y?:number})=>Math.hypot(a.x-b.x,a.z-b.z,(a.y??0)-(b.y??0));
test('closed swing connects exact posterior shoulder targets with fixed arm lengths and attached pelvis',()=>{
 for(const profile of [FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE])for(let beat=7;beat<11;beat+=1/32)for(const twist of [-70,-50,-35,0,35]){
  const sample=sampleStudy(beat,profile),before=structuredClone(sample.poses);
  const result=sampleSwingTorsoStudy(sample.poses,{torsoTwistDegrees:twist,inwardLean:.04});
  assert.deepEqual(sample.poses,before);
  for(let i=0;i<2;i++){
   const torso=result.torsos[i],arm=result.arms[i],partner=result.torsos[1-i];
   assert.deepEqual(torso.pelvisCenter,sample.poses[i].position);
   assert.ok(d(torso.center,torso.pelvisCenter)<=.040000000001);
   assert.ok(Math.abs(torso.torsoYaw-torso.pelvisYaw-twist*Math.PI/180)<1e-12);
   assert.ok(arm.reachable);assert.equal(arm.contactStrength,1);assert.deepEqual(arm.hand,{...partner.leftBackShoulder,y:1.35});
   const posterior=(arm.target.x-partner.center.x)*Math.sin(partner.torsoYaw)+(arm.target.z-partner.center.z)*Math.cos(partner.torsoYaw);
   assert.ok(posterior<-.07);
   assert.ok(Math.abs(d(arm.shoulder,arm.elbow)-.325)<1e-12);assert.ok(Math.abs(d(arm.elbow,arm.hand)-.325)<1e-12);
  }
  assert.deepEqual(result,sampleSwingTorsoStudy(sample.poses,{torsoTwistDegrees:twist,inwardLean:.04}));
 }
});
test('unreachable acquisition reports the target and releases contact without stretching the arm',()=>{
 const result=sampleSwingTorsoStudy(sampleStudy(0,FLUENT_TIMING_PROFILE).poses,{torsoTwistDegrees:0});
 for(const arm of result.arms){assert.equal(arm.reachable,false);assert.equal(arm.contactStrength,0);assert.ok(d(arm.hand,arm.target)>.1);assert.ok(Math.abs(d(arm.shoulder,arm.elbow)-.325)<1e-12);assert.ok(Math.abs(d(arm.elbow,arm.hand)-.325)<1e-12);}
});
test('bounded dissociation and contact inputs reject invalid values',()=>{
 const poses=sampleStudy(8,FLUENT_TIMING_PROFILE).poses;
 for(const torsoTwistDegrees of [-71,36,NaN,Infinity])assert.throws(()=>sampleSwingTorsoStudy(poses,{torsoTwistDegrees}));
 for(const inwardLean of [-.1,.09,NaN])assert.throws(()=>sampleSwingTorsoStudy(poses,{torsoTwistDegrees:0,inwardLean}));
 for(const contactStrength of [-1,2,NaN])assert.throws(()=>sampleSwingTorsoStudy(poses,{torsoTwistDegrees:0,contactStrength}));
 assert.equal(sampleSwingTorsoStudy(poses,{torsoTwistDegrees:0,contactStrength:.2}).arms[0].contactStrength,.2);
});
test('inward torso over outward pelvis keeps exact posterior contact with a bounded raised elbow over the torso top',()=>{
 for(const inwardLean of [.04,.06])for(let beat=7;beat<11;beat+=1/32){
  const poses=sampleStudy(beat,FLUENT_TIMING_PROFILE).poses;
  const result=sampleSwingTorsoStudy(poses,{torsoTwistDegrees:-50,inwardLean});
  for(let i=0;i<2;i++){
   const arm=result.arms[i],torso=result.torsos[i];
   assert.equal(arm.reachable,true);assert.equal(arm.comfortable,true);assert.ok(arm.bendDegrees>50);
   assert.equal(arm.routeClear,true);assert.equal(arm.elbowRaised,true);assert.ok((arm.elbow.y??0)<=1.47);
   const radial={x:poses[i].position.x/.31,z:poses[i].position.z/.31};
   assert.ok(Math.sin(torso.pelvisYaw)*radial.x+Math.cos(torso.pelvisYaw)*radial.z>0);
   assert.ok(Math.sin(torso.torsoYaw)*radial.x+Math.cos(torso.torsoYaw)*radial.z<0);
   assert.deepEqual(arm.hand,{...result.torsos[1-i].leftBackShoulder,y:1.35});
  }
 }
});
