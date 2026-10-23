import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {lowerBecketWaveSource} from './source-becket-wave.ts';
import {createFiniteBecketState,finiteBecketPoses} from './progression-topology.ts';
import {createDancers} from './engine.ts';
import {captureBecketSliceBoundary} from './becket-slice-step.ts';
import {compileBecketSlideStep} from './becket-slide-step.ts';
import {compileBecketWaveSequence} from './becket-wave-sequence.ts';
const distance=(a:any,b:any)=>Math.hypot(a.x-b.x,a.z-b.z);
for(const couples of[3,4,6])test(`terminal slide preserves unfinished finite turns across phrases for ${couples} couples`,()=>{
 // Synthetic cyclic rotation is a boundary proof, not a retained-source admission.
 const r=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/3470.json',import.meta.url),'utf8'));
 const original=lowerBecketWaveSource(r.result.dance!.sourceRecord!,r.interpretation.becketWave!).program;
 const program={...original,operations:[...original.operations.slice(1),original.operations[0]]};
 const p=compileBecketWaveSequence(program,couples);
 assert.equal(p.periodRepeats,couples*2);
 assert.equal(p.periodStart,couples%2);
 let reference=createFiniteBecketState(couples,{circulation:'cw',roleArrangement:'lark-left',halfWidth:.64,rowGap:1.28});
 const slide=program.operations.at(-1)!;assert.equal(slide.mode,'slide');if(slide.mode!=='slide')throw Error('proof requires slide');
 for(let round=0;round<couples*2+1;round++){
  const independent=compileBecketSlideStep(slide.figure,captureBecketSliceBoundary(createDancers(couples),finiteBecketPoses(reference),reference.binding,62,[]),reference,slide.options);
  reference=independent.nextState;
  for(const local of[0,1,2,4,6,8,12])for(const q of independent.sampleWaiting(64+local)){const actual=p.sample((round+1)*64+local).poses[q.id];assert.ok(distance(q.position,actual.position)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(q.yaw-actual.yaw),Math.cos(q.yaw-actual.yaw)))<1e-8);}
  const at=(round+1)*64,entry=p.sample(at),waiting=p.topology(at).waitingIds;
  for(const epsilon of[1e-6,.001]){
   const before=p.sample(at-epsilon),after=p.sample(at+epsilon);
   for(const a of before.poses){assert.ok(distance(a.position,after.poses[a.id].position)<epsilon*3.7);assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw-after.poses[a.id].yaw),Math.cos(a.yaw-after.poses[a.id].yaw)))<epsilon*6.5);}
  }
  for(const id of waiting){
   assert.ok(distance(entry.poses[id].position,p.sample(at+4).poses[id].position)>.1,'end exchange continues physically after phrase boundary');
   assert.ok(distance(p.sample(at+8).poses[id].position,p.sample(at+12).poses[id].position)<1e-9,'settled waiting bodies stay at reached station');
  }
  for(let tick=0;tick<=512;tick++){
   const f=p.sample(at+tick/64);
   for(const h of f.contacts)assert.ok(!waiting.includes(h.a)&&!waiting.includes(h.b),'no borrowing waiting hands');
   for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)assert.ok(distance(f.poses[a].position,f.poses[b].position)>=.45-1e-6);
  }
 }
 const start=p.periodStart*64,end=(p.periodStart+p.periodRepeats)*64;
 for(const beat of[0,2,4,8,20,62,63.9]){const a=p.sample(start+beat),b=p.sample(end+beat);for(const q of a.poses)assert.ok(distance(q.position,b.poses[q.id].position)<1e-8);for(const q of a.poses){const z=b.poses[q.id];assert.ok(Math.abs(Math.atan2(Math.sin(q.yaw-z.yaw),Math.cos(q.yaw-z.yaw)))<1e-8);assert.equal(q.activity,z.activity);}assert.deepEqual(a.contacts,b.contacts);for(const field of['neighbor','partner','waitingIds']as const)assert.deepEqual(p.topology(start+beat)[field],p.topology(end+beat)[field]);}
});
