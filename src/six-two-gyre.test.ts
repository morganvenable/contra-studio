import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {compileSixTwoImproper,type SixTwoSourceDance} from './six-two-source-sequence.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {Dance,Pose} from './types.ts';
const raw=readFileSync(new URL('../test-data/contradb/2530.json',import.meta.url),'utf8');
const review=()=>prepareContraDbReview(raw);
const fixture=()=>{const p=review();assert.ok(p.result.dance,JSON.stringify(p.result.errors));return p.result.dance;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);

test('2530 retains the exact meltdown clause with separate gyre/swing, compact passage and end choices',()=>{
 const p=review(),d=fixture();assert.equal(d.title,'Greetings');assert.deepEqual(p.result.record!.rows.map(r=>r.beats),[16,8,8,16,8,6,2]);
 assert.deepEqual(d.figures.map(f=>[f.kind,f.beats,f.who]),[['gyre',4,'neighbor'],['swing',12,'neighbor'],['long-lines',8,'all'],['allemande',8,'robins'],['balance',4,'partner'],['swing',12,'partner'],['long-lines',8,'all'],['circle',6,'all'],['pass-through',2,'neighbor']]);
 assert.deepEqual(p.interpretation.rows!['contradb:2530:row:0'].gyreSwing,{meaning:'gyre-then-swing',phaseBeats:[4,12],passingShoulder:'right',amount:1});
 assert.equal(d.progressionEvents!.length,1);assert.equal(d.progressionEvents![0].afterFigureId,d.figures.at(-1)!.id);assert.equal(d.progressionEvents![0].source.basis,'source-explicit');
 assert.equal(d.progressionEvents![0].source.sourceId,p.result.record!.snapshotId);assert.equal(d.endPolicy!.source.sourceId,p.result.record!.snapshotId);assert.equal(d.sixTwoPassPolicy!.source.sourceId,p.result.record!.snapshotId);
 const replay=readContraDbImport(d.sourceText);assert.deepEqual(replay.dance!.figures,d.figures);assert.deepEqual(replay.record,p.result.record);assert.deepEqual(replay.interpretation,p.interpretation);assert.equal(JSON.parse(d.sourceText).snapshot.html,JSON.parse(raw).html);
 for(const remove of[(c:any)=>delete c.sixTwoPass,(c:any)=>delete c.eventPolicy,(c:any)=>delete c.rows['contradb:2530:row:0'].gyreSwing,(c:any)=>delete c.rows['contradb:2530:row:3'].balanceBeats,(c:any)=>delete c.rows['contradb:2530:row:6'].passThrough]){const choice=structuredClone(p.interpretation);remove(choice);assert.equal(readContraDbImport(raw,{interpretation:choice}).dance,undefined);}
 for(const cap of['sixTwoPasses','gyres','progressionEvents']as const)assert.throws(()=>compileChoreography(d,2,{...REGISTERED_MOTION_CAPABILITIES,[cap]:false}));
});

test('2530 literal named corners and right full gyre end before the source-counted neighbor swing',()=>{
 const c=compileChoreography(fixture(),2),sample=c.formationSample??c.sample;
 for(const[beat,wanted]of[[0,[1,0,3,2]],[4,[1,0,3,2]],[16,[2,3,0,1]],[24,[2,3,0,1]],[32,[2,1,0,3]],[48,[2,1,0,3]],[56,[2,1,0,3]],[61.25,[1,0,3,2]],[62,[1,0,3,2]],[64,[2,3,0,1]]]as const)assert.deepEqual(corners(sample(beat).poses),wanted,`corners at${beat}`);
 for(const[a,b]of[[0,3],[1,2]]){let angle=Math.atan2(sample(0).poses[a].position.z-sample(0).poses[b].position.z,sample(0).poses[a].position.x-sample(0).poses[b].position.x),winding=0;for(let k=1;k<=400;k++){const f=sample(k/100),A=f.poses[a].position,B=f.poses[b].position,next=Math.atan2(A.z-B.z,A.x-B.x);winding+=turn(next,angle);angle=next;}assert.ok(Math.abs(winding-2*Math.PI)<1e-8);assert.ok(Math.abs(gap(sample(4).poses[a],sample(4).poses[b])-.62)<1e-8);}
 assert.equal(c.sample(3.999).figureIndex,0);assert.equal(c.sample(4).figureIndex,1);assert.equal(c.sample(16).figureIndex,2);
});

test('2530 complete2–12-couple periods preserve every encounter, finite wait, root join and center clearance',()=>{
 const d=fixture();for(let n=2;n<=12;n++){const c=compileChoreography(d,n) as ReturnType<typeof compileSixTwoImproper>,formation=c.formationSample??c.sample,seen=new Set<string>();assert.equal(c.period,2*n);
  for(let r=0;r<c.period;r++){const base=r*64,t=c.topology(base);for(const[a,b]of t.neighbors)seen.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));
   for(const local of[...c.starts,61.25,64]){const beat=base+local;if(!beat)continue;const left=c.sample(beat-1e-7),at=c.sample(beat);for(const p of at.poses){assert.ok(gap(p,left.poses[p.id])<2e-5,`root${n}/${beat}/${p.id}`);assert.ok(Math.abs(turn(p.yaw,left.poses[p.id].yaw))<2e-5,`yaw${n}/${beat}/${p.id}`);}}
   for(let k=0;k<=128;k++){const f=c.sample(base+k/2);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)assert.ok(gap(f.poses[a],f.poses[b])>=.45-1e-7,`centers${n}/${base+k/2}/${a}/${b}`);}
   for(const id of t.waitingIds){const p=formation(base+16).poses[id];assert.ok(Math.abs(Math.abs(p.position.z)-(n-1)*1.44/2)<1e-7,'waiters remain at their physical end');}
  }
  assert.equal(seen.size,n*(n-1)/2);for(const b of[0,1,4,16,32,48,62,63.9]){const a=c.sample(b),next=c.sample(c.period*64+b);for(const p of a.poses){assert.ok(gap(p,next.poses[p.id])<1e-8);assert.ok(Math.abs(turn(p.yaw,next.poses[p.id].yaw))<1e-8);}}
 }
});

test('2530 rejects unused gyre/swing and event modifiers rather than silently changing the admitted profile',()=>{
 const original=fixture();for(const change of[(d:Dance)=>d.figures[0].passingShoulder='left',(d:Dance)=>d.figures[0].amount=.5,(d:Dance)=>d.figures[0].who='partner',(d:Dance)=>{d.figures[0].beats=8;d.figures[1].beats=8;},(d:Dance)=>d.figures[0].hands='right',(d:Dance)=>d.figures[1].exit='face-down-line',(d:Dance)=>delete d.progressionEvents,(d:Dance)=>d.progressionEvents![0].count=2,(d:Dance)=>d.progressionEvents![0].afterFigureId=d.figures[0].id,(d:Dance)=>d.sixTwoPassPolicy!.source.sourceId='forged']){const d=structuredClone(original);change(d);assert.throws(()=>compileChoreography(d,2));assert.throws(()=>compileSixTwoImproper(d as SixTwoSourceDance,2));}
 const p=review(),bad=JSON.parse(raw);bad.html=bad.html.replace('pass through ⁋','pass through');assert.equal(readContraDbImport(JSON.stringify(bad),{interpretation:p.interpretation}).dance,undefined);
});
