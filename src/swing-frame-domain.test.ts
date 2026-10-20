import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleStudy,FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE} from './execution-timing-study.ts';
import {sampleSwingTorsoStudy} from './swing-torso-study.ts';
import {sampledSwingFrameOptions,isInSampledSwingFrameDomain,DEFAULT_SWING_FRAME_SETTINGS} from './swing-frame-domain.ts';
const profiles=[FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE,{anticipationCounts:0,transitionCounts:1.5,responseDelayCounts:.75,recoveryCounts:4}];
const d=(a:{x:number;z:number;y?:number},b:{x:number;z:number;y?:number})=>Math.hypot(a.x-b.x,a.z-b.z,(a.y??0)-(b.y??0));

test('normal control contract rejects unsupported anatomy without changing approved default',()=>{
 for(const inwardTurnDegrees of [-35,49.99,70.01,NaN,Infinity])assert.equal(isInSampledSwingFrameDomain({inwardTurnDegrees,inwardLean:.06}),false);
 for(const inwardLean of [0,.03999,.08001,NaN])assert.throws(()=>sampledSwingFrameOptions({phase:'swing',readiness:1},{inwardTurnDegrees:50,inwardLean}));
 assert.deepEqual(sampledSwingFrameOptions({phase:'swing',readiness:1}),{torsoTwistDegrees:-50,inwardLean:.06,contactStrength:1,ballroomWeight:1});
 assert.equal(isInSampledSwingFrameDomain(DEFAULT_SWING_FRAME_SETTINGS),true);
});

test('range corners and center keep actual solver contacts through entry and release across three presets',()=>{
 const settings=[{inwardTurnDegrees:50,inwardLean:.04},{inwardTurnDegrees:50,inwardLean:.08},{inwardTurnDegrees:70,inwardLean:.04},{inwardTurnDegrees:70,inwardLean:.08},{inwardTurnDegrees:60,inwardLean:.06}];
 for(const profile of profiles)for(const phase of ['swing','preparation'] as const)for(const weight of [0,.1,.25,.6,.8,.9,1]){
  // Seek a prescribed transfer weight rather than spending most tests on the
  // unchanging closed frame. This targets lift, wrap and collision thresholds.
  let lo=phase==='swing'?4:12,hi=phase==='swing'?7:16;
  for(let i=0;i<45;i++){const mid=(lo+hi)/2,s=sampleStudy(mid,profile);const w=s.phase==='swing'?s.readiness:s.phase==='preparation'?1-s.readiness:0;if(phase==='swing'?w<weight:w>weight)lo=mid;else hi=mid;}
  const sample=sampleStudy((lo+hi)/2,profile);
  for(const setting of settings){const result=sampleSwingTorsoStudy(sample.poses,sampledSwingFrameOptions(sample,setting));for(const arm of result.arms){
   const message=JSON.stringify({phase,weight,setting,actor:arm.actorId,kind:arm.kind});
   assert.ok(arm.reachable&&arm.routeClear,message);
   assert.ok(d(arm.hand,arm.target)<1e-12,message);
   assert.ok(Math.abs(d(arm.shoulder,arm.elbow)-.325)<1e-10,message);
   assert.ok(Math.abs(d(arm.elbow,arm.wrist)-.27)<1e-10,message);
   assert.ok(Math.abs(d(arm.wrist,arm.hand)-.115)<1e-10,message);
  }}
 }
});
