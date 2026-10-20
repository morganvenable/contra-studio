import test from'node:test';
import assert from'node:assert/strict';
import{sampleStudy,FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE}from'./execution-timing-study.ts';
const distance=(beat:number)=>Math.hypot(...Object.values(sampleStudy(beat,FLUENT_TIMING_PROFILE).poses[0].position) as [number,number]);
test('balance takes two counts forward and two counts back; swing starts immediately',()=>{
 assert.equal(distance(0),.9);assert.equal(distance(2),.65);assert.equal(distance(4),.9);
 for(let tick=1;tick<=128;tick++)assert.ok(distance(tick/64)<distance((tick-1)/64));
 for(let tick=129;tick<=256;tick++)assert.ok(distance(tick/64)>distance((tick-1)/64));
 assert.ok(Math.abs(sampleStudy(4.001,FLUENT_TIMING_PROFILE).poses[0].position.z)>0);
 assert.deepEqual(sampleStudy(0,FLUENT_TIMING_PROFILE).phaseAnchors,{balanceStart:0,balanceTurn:2,swingStart:4,preparationStart:12,cycleEnd:16});
});
test('shared execution clock is monotonic, deterministic and explicitly late',()=>{
 const extremes=[0,1].flatMap(anticipationCounts=>[.25,2].flatMap(transitionCounts=>[0,1].flatMap(responseDelayCounts=>[2,8].map(recoveryCounts=>({anticipationCounts,transitionCounts,responseDelayCounts,recoveryCounts})))));
 for(const profile of[FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE,...extremes]){
  let prior=-Infinity;
  for(let tick=-1024;tick<=2048;tick++){
   const beat=tick/64,f=sampleStudy(beat,profile);assert.ok(f.executionBeat>=prior);assert.ok(f.executionBeat<=beat+1e-10);assert.ok(f.lag>=0);prior=f.executionBeat;
   assert.deepEqual(f,sampleStudy(beat,profile));
   assert.ok(Math.abs(f.poses[0].position.x+f.poses[1].position.x)<1e-12);
  }
 }
 assert.equal(sampleStudy(.25,DEFAULT_TIMING_PROFILE).executionBeat,0);
 assert.equal(sampleStudy(.25,DEFAULT_TIMING_PROFILE).lag,.25);
 assert.equal(sampleStudy(8,DEFAULT_TIMING_PROFILE).lag,0);
});
test('repeats and phase joins retain positions and orientation; anticipation is ready early',()=>{
 for(const profile of[FLUENT_TIMING_PROFILE,DEFAULT_TIMING_PROFILE]){
  for(const boundary of[0,4,12,16,32]){
   const a=sampleStudy(boundary-1e-7,profile),b=sampleStudy(boundary+1e-7,profile);
   for(let id=0;id<2;id++){
    assert.ok(Math.hypot(a.poses[id].position.x-b.poses[id].position.x,a.poses[id].position.z-b.poses[id].position.z)<1e-5);
    const delta=a.poses[id].yaw-b.poses[id].yaw;assert.ok(Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))<1e-5);
   }
  }
  assert.deepEqual(sampleStudy(3,profile).poses,sampleStudy(19,profile).poses);
 }
 assert.equal(sampleStudy(15.25,FLUENT_TIMING_PROFILE).readiness,1);
 assert.ok(sampleStudy(15.25,{...FLUENT_TIMING_PROFILE,anticipationCounts:0}).readiness<1);
});
test('rejects invalid beats and profile values',()=>{
 for(const beat of[NaN,Infinity,-Infinity])assert.throws(()=>sampleStudy(beat,FLUENT_TIMING_PROFILE));
 for(const change of[{anticipationCounts:-.1},{anticipationCounts:1.1},{transitionCounts:0},{transitionCounts:2.1},{responseDelayCounts:NaN},{recoveryCounts:1},{recoveryCounts:9},{unknown:1}])assert.throws(()=>sampleStudy(0,{...FLUENT_TIMING_PROFILE,...change}));
});
