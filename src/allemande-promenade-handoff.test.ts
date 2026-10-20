import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {readContraDbSource} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import {prepareAllemandePromenadeExit} from './allemande-promenade-handoff.ts';
import type {Figure,Pose} from './types.ts';
const raw=()=>readFileSync(new URL('../test-data/contradb/1744.json',import.meta.url),'utf8');
const caps=REGISTERED_MOTION_CAPABILITIES;
const review=()=>{const r=prepareContraDbReview(raw(),[],caps);assert.ok(r.result.dance,r.result.errors.join('; '));return r;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),delta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

test('actual1744 keeps original neighbor turn, promenade, counts and one terminal source progression',()=>{
 const r=review(),d=r.result.dance!;assert.equal(d.title,'Another First Time');assert.equal(d.sourceRows.length,8);assert.equal(d.sourceRecord.original,readContraDbSource(raw()).record!.original);assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['allemande',8],['promenade',8],['circle',8],['swing',8],['allemande',8],['swing',8],['long-lines',8],['star',8]]);assert.deepEqual([d.figures[0].who,d.figures[0].direction,d.figures[0].amount],['neighbor','right',1.5]);assert.equal(d.figures[1].who,'neighbor');assert.equal(d.figures[1].courtesyLeader,'lark');assert.equal(d.figures.filter(f=>f.progression).length,1);assert.equal(d.figures.at(-1)?.progression,true);
 const replay=readContraDbImport(d.sourceText,{capabilities:caps});assert.deepEqual(replay.dance?.figures,d.figures);assert.deepEqual(replay.interpretation,r.interpretation);assert.equal(replay.record?.original,d.sourceRecord.original);assert.equal(readContraDbImport(d.sourceText,{capabilities:{...caps,allemandePromenadeHandoffs:false}}).dance,undefined);
});

test('actual1744 retains complete signed1.5 neighbor winding and exact same-person lark-left promenade entry',()=>{
 const d=review().result.dance!,c=compileChoreography(d,2,caps),sample=c.formationSample??c.sample,initial=sample(0),winding=new Map(initial.poses.map(p=>[p.id,0])),last=new Map(initial.poses.map(p=>[p.id,Math.atan2(p.position.z,p.position.x-Math.sign(p.position.x)*.9)]));
 for(let k=1;k<=1600;k++){const f=sample(k/200);for(const p of f.poses){const theta=Math.atan2(p.position.z,p.position.x-Math.sign(initial.poses[p.id].position.x)*.9),step=delta(theta,last.get(p.id)!);assert.ok(step>=-1e-8,`turn reversed at${k}/${p.id}`);winding.set(p.id,winding.get(p.id)!+step);last.set(p.id,theta);}}
 const end=sample(8);for(const p of end.poses){assert.ok(Math.abs(winding.get(p.id)!-3*Math.PI)<1e-7);assert.ok(Math.abs(Math.abs(p.position.z)-.34)<1e-7);assert.ok(Math.abs(delta(p.yaw,p.position.x>0?-Math.PI/2:Math.PI/2))<1e-7);const neighbor=end.poses.find(q=>q.id!==p.id&&c.dancers[q.id].role!==c.dancers[p.id].role&&c.dancers[q.id].couple!==c.dancers[p.id].couple)!;assert.ok(Math.abs(p.position.x-neighbor.position.x)<1e-7);if(c.dancers[p.id].role==='lark')assert.equal(Math.sign(p.position.z),Math.sign(p.position.x));}
});

test('actual1744 closes every2–12-couple finite period with continuous boundaries and no gross root collision',()=>{
 const d=review().result.dance!;for(let couples=2;couples<=12;couples++){const c=compileChoreography(d,couples,caps);assert.equal(c.repeatable,true);let minimum=Infinity;
  for(let round=0;round<2*couples;round++){
   for(const local of[...c.starts,64]){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<2e-5);assert.ok(Math.abs(delta(p.yaw,a.poses[p.id].yaw))<2e-5);}}
   for(let k=0;k<256;k++){const f=c.sample(round*64+k/4);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minimum=Math.min(minimum,gap(f.poses[a],f.poses[b]));}
  }
  assert.ok(minimum>=.45,`${couples}: ${minimum}`);for(const beat of[0,7.75,8,15.75,23.75,63.75]){const a=c.sample(beat),b=c.sample(2*couples*64+beat);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(Math.abs(delta(p.yaw,b.poses[p.id].yaw))<1e-8);}}
 }
});

test('the handoff owns its inputs and rejects unconsumed entry, phase, handedness and following relation changes',()=>{
 const d=review().result.dance!,f=structuredClone(d.figures[0]),next=structuredClone(d.figures[1]),dancers=createDancers(2),start=initialPoses(dancers),binding=bindDirectedCoupleSlots(dancers,0,[{coupleId:0,rank:0,direction:1},{coupleId:1,rank:1,direction:-1}]),context={ids:[0,1,2,3],start,dancers,relations:binding.relations,bindingEpoch:0,next},primitive=compilePrimitiveFigure(f,context.ids,start,dancers,[1,-1]),plan=prepareAllemandePromenadeExit(f,context,primitive),saved=plan.position(0,.95);f.beats=100;next.who='partner';assert.deepEqual(plan.position(0,.95),saved);
 for(const extra of[{entry:'short-wave'},{phaseBeats:[7,1]},{hands:'right'},{inwardRole:'lark'},{outwardRole:'robin'},{amount:.5},{progression:true}]as Partial<Figure>[])assert.throws(()=>prepareAllemandePromenadeExit({...d.figures[0],...extra},{...context,next:d.figures[1]},primitive));assert.throws(()=>prepareAllemandePromenadeExit(d.figures[0],context,primitive),/same-person/);
});

test('both allowed handed routes retain complete signed turn winding and global root clearance',()=>{
 const d=review().result.dance!,dancers=createDancers(2),start=initialPoses(dancers),binding=bindDirectedCoupleSlots(dancers,0,[{coupleId:0,rank:0,direction:1},{coupleId:1,rank:1,direction:-1}]),context={ids:[0,1,2,3],start,dancers,relations:binding.relations,bindingEpoch:0,next:d.figures[1]};
 for(const direction of['left','right']as const)for(const beats of[6,8,12]){const f={...d.figures[0],direction,beats},base=compilePrimitiveFigure(f,context.ids,start,dancers,[1,-1]),plan=prepareAllemandePromenadeExit(f,context,base),winding=new Map(context.ids.map(id=>[id,0])),last=new Map(context.ids.map(id=>[id,Math.atan2(start[id].position.z,0)]));let minimum=Infinity;
  for(let k=1;k<=1600;k++){const t=k/1600,positions=context.ids.map(id=>plan.position(id,t));for(const id of context.ids){const theta=Math.atan2(positions[id].z,positions[id].x-start[id].position.x),step=delta(theta,last.get(id)!);assert.ok(step*(direction==='right'?1:-1)>=-1e-8);winding.set(id,winding.get(id)!+step);last.set(id,theta);}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimum=Math.min(minimum,Math.hypot(positions[a].x-positions[b].x,positions[a].z-positions[b].z));}
  assert.ok(minimum>=.45);for(const id of context.ids)assert.ok(Math.abs(winding.get(id)!-(direction==='right'?3:-3)*Math.PI)<1e-7);
 }
});
