import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {readContraDbSource} from './contradb-source.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileChoreography} from './choreography.ts';
import {compileRingStartImproper} from './ring-source-sequence.ts';
import {compilePetronellaToPairFigure,prepareSwingRingExit} from './ring-pair-handoff.ts';
import {createDancers,initialPoses} from './engine.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import type {Pose} from './types.ts';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const caps=REGISTERED_MOTION_CAPABILITIES;
const review=(id:number)=>{const r=prepareContraDbReview(raw(id),[],caps);assert.ok(r.result.dance,r.result.errors.join('; '));assert.equal(r.result.coverage.executable,true);return r;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));

test('actual1447/3328 keep exact original rows, counts, authored identities and separately retained finite-end choices',()=>{
 for(const[id,title,rows,figures]of[[1447,'Heartbreak Contra',8,11],[3328,'Heartbreak Contra (variation)',9,12]]as const){
  const r=review(id),d=r.result.dance!;assert.equal(d.title,title);assert.equal(d.sourceRows.length,rows);assert.equal(d.figures.length,figures);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(d.sourceRecord.original,readContraDbSource(raw(id)).record!.original);
  assert.equal(d.progressionEvents?.length,1);assert.equal(d.progressionEvents![0].afterFigureId,d.figures.at(-1)!.id);assert.equal(d.progressionEvents![0].source.basis,'source-explicit');assert.equal(d.endPolicy!.source.basis,'reviewed-interpretation');assert.deepEqual(r.interpretation.eventPolicy,{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,reentryPreparationBeats:4,sameEndTurnOffsetBeats:4});
  assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,ringPairHandoffs:false}}).dance,undefined);
  const replay=readContraDbImport(d.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,d.figures);assert.deepEqual(replay.dance?.progressionEvents,d.progressionEvents);assert.deepEqual(replay.dance?.endPolicy,d.endPolicy);assert.deepEqual(replay.interpretation,r.interpretation);assert.equal(replay.record?.original,d.sourceRecord.original);
  const missing=structuredClone(r.interpretation);delete missing.eventPolicy;assert.equal(readContraDbImport(raw(id),{interpretation:missing}).dance,undefined);
  const changed=JSON.parse(raw(id));changed.html=changed.html.replace('balance &amp; petronella','balance &amp; petronella then clap');if(changed.html!==JSON.parse(raw(id)).html)assert.equal(prepareContraDbReview(JSON.stringify(changed)).result.dance,undefined);
 }
 assert.deepEqual(review(1447).result.dance!.figures.map(f=>[f.kind,f.beats]),[['ring-balance',4],['petronella',4],['ring-balance',4],['petronella',4],['balance',4],['swing',12],['allemande',8],['swing',8],['circle',8],['ring-balance',4],['pass-through',4]]);
 assert.deepEqual(review(3328).result.dance!.figures.map(f=>[f.kind,f.beats]),[['ring-balance',4],['petronella',4],['ring-balance',4],['petronella',4],['ring-balance',4],['swing',12],['allemande',8],['swing',8],['ring-balance',4],['petronella',4],['ring-balance',4],['pass-through',4]]);
});

test('actual1447/3328 physically close every2–12-couple full finite period without resets or gross root overlaps',()=>{
 for(const id of[1447,3328]){const d=review(id).result.dance!;for(let couples=2;couples<=12;couples++){
  const c=compileChoreography(d,couples,caps)as ReturnType<typeof compileRingStartImproper>;assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);const pairs=new Set<string>();let minimum=Infinity;
  for(let repeat=0;repeat<2*couples;repeat++){
   const binding=c.topology(repeat*64+1);assert.equal(binding.epoch,repeat);for(const[a,b]of binding.neighbors)pairs.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));
   for(const local of[...c.starts,64]){const beat=repeat*64+local;if(beat===0)continue;const before=c.sample(beat-1e-7),at=c.sample(beat);for(const p of at.poses){assert.equal(p.id,before.poses[p.id].id);assert.ok(gap(p,before.poses[p.id])<2e-5,`${id}/${couples}/${beat}/${p.id} root`);assert.ok(angle(p,before.poses[p.id])<2e-5,`${id}/${couples}/${beat}/${p.id} yaw`);}}
   for(let k=0;k<256;k++){const frame=c.sample(repeat*64+k/4);const hands=new Map<string,number>();for(const h of frame.contacts.filter(c=>c.strength>.001))for(const[a,hand,b]of[[h.a,h.handA,h.b],[h.b,h.handB,h.a]]as const){const key=`${a}:${hand}`;assert.ok(!hands.has(key)||hands.get(key)===b,`${id}/${couples}: a hand has two targets`);hands.set(key,b);}for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimum=Math.min(minimum,gap(frame.poses[a],frame.poses[b]));}
   for(const waiting of binding.waitingIds)assert.ok(gap(c.sample(repeat*64+13).poses[waiting],c.sample(repeat*64+59).poses[waiting])<1e-9,'same-end waiting is stationary');
  }
  assert.ok(minimum>=.45-1e-7,`${id}/${couples}: ${minimum}`);assert.equal(pairs.size,couples*(couples-1)/2);
  for(const beat of[0,15.75,16,19.5,47.5,48,55.75,63.75]){const a=c.sample(beat),b=c.sample(2*couples*64+beat);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}}
 }}
});

test('petronella→pair releases ring without changing stations; swing→ring opens without changing its cyclic identities',()=>{
 const a=compileChoreography(review(1447).result.dance!,2,caps),b=compileChoreography(review(3328).result.dance!,2,caps),logical=(c:typeof a,t:number)=>(c.formationSample??c.sample)(t),corners=(p:Pose[])=>p.toSorted((a,b)=>Math.atan2(a.position.z,a.position.x)-Math.atan2(b.position.z,b.position.x)).map(p=>p.id);
 assert.deepEqual(corners(logical(a,16).poses),corners(logical(b,16).poses));assert.equal(logical(a,16).contacts.length,0);assert.ok(a.sample(17).contacts.every(c=>a.dancers[c.a].couple!==a.dancers[c.b].couple));
 const f=logical(b,48);for(const p of f.poses){assert.ok(Math.abs(Math.abs(p.position.x)-.55)<1e-7);assert.ok(Math.abs(Math.abs(p.position.z)-.55)<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-Math.atan2(-p.position.x,-p.position.z)),Math.cos(p.yaw-Math.atan2(-p.position.x,-p.position.z))))<1e-7);}assert.equal(f.contacts.length,4);assert.ok(f.contacts.every(c=>c.strength===1));
});

test('bounded bridges reject wrong next figures and do not silently consume unrelated instructions',()=>{
 const dancers=createDancers(2),start=initialPoses(dancers),binding=bindDirectedCoupleSlots(dancers,0,dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}))),context={ids:[0,1,2,3],start,dancers,relations:binding.relations,bindingEpoch:0};
 const dummy={position:(id:number)=>start[id].position,facing:(id:number)=>start[id].yaw,contacts:()=>[]};
 assert.throws(()=>prepareSwingRingExit({id:'bad',kind:'swing',label:'Bad',beats:8,who:'neighbor'},context,dummy),/following/);
 assert.throws(()=>compilePetronellaToPairFigure({id:'bad',kind:'petronella',label:'Bad',beats:4},context),/complete ring petronella/);
});

test('actual1547 reuses swing→ring before two terminal petronellas with exact6/10-count circle/swing and single progression',()=>{
 const r=review(1547),d=r.result.dance!;assert.equal(d.title,'Jump Back Barley');assert.equal(d.sourceRows.length,7);assert.equal(d.sourceRecord.original,readContraDbSource(raw(1547)).record!.original);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.deepEqual(d.figures.slice(5,7).map(f=>[f.kind,f.beats]),[['circle',6],['swing',10]]);assert.deepEqual(d.figures.at(-1)?.phaseBeats,[3,1]);assert.equal(d.figures.at(-1)?.exit,'progressed-neighbors');assert.equal(d.figures.filter(f=>f.progression).length,1);assert.equal(d.figures.at(-1)?.progression,true);
 const saved=readContraDbImport(d.sourceText,{capabilities:caps});assert.deepEqual(saved.dance?.figures,d.figures);assert.equal(saved.record?.original,d.sourceRecord.original);assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,ringPairHandoffs:false}}).dance,undefined);
 for(let couples=2;couples<=12;couples++){
  const c=compileChoreography(d,couples,caps);assert.equal(c.repeatable,true);let minimum=Infinity;
  for(let round=0;round<2*couples;round++){
   for(const local of[...c.starts,64]){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<2e-5,`${couples}/${beat}/${p.id}`);assert.ok(angle(p,a.poses[p.id])<2e-5);}}
   for(let k=0;k<256;k++){const f=c.sample(round*64+k/4);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minimum=Math.min(minimum,gap(f.poses[a],f.poses[b]));}
  }
  assert.ok(minimum>=.45,`${couples}: ${minimum}`);for(const beat of[0,3.5,7.75,37.5,47.75,48,63.75]){const a=c.sample(beat),b=c.sample(2*couples*64+beat);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}}
 }
});
