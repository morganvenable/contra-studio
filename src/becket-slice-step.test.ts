import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDancers,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileEventSection} from './event-section.ts';
import {readContraDbSource} from './contradb-source.ts';
import {createFiniteBecketState,finiteBecketPoses,type FiniteBecketState} from './progression-topology.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {compileNeutralFullHeyStep} from './neutral-full-hey-step.ts';
import {captureBecketSliceBoundary,compileBecketSliceStep,becketSliceGroupBoundary,type BecketSliceOptions} from './becket-slice-step.ts';
import type {Figure,Pose} from './types.ts';
const source=(id:string)=>readContraDbSource(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8')).record!;
const figure=(id='slice'):Figure=>({id,kind:'becket-slice',beats:8,label:'Slice left and straight back',who:'all',direction:'left',phaseBeats:[4,4],entry:'side-couples',exit:'progressed-neighbors',sliceReturn:'straight-back',progression:true});
const options=(id='3181'):BecketSliceOptions=>{const r=source(id),literal={sourceId:r.snapshotId,url:r.sourceUrl,clause:r.rows[1].text,basis:'source-explicit' as const},review={...literal,basis:'reviewed-interpretation' as const};return{progressionSource:literal,timingSource:{...review,clause:'Four counts diagonal forward, four counts straight back.'},endPolicy:{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,reentryPreparationBeats:0,source:{...review,clause:'Existing same-end eight-count side exchange, lark-left.'}}};};
const setup=(count:number,startBeat=8,offset={x:0,z:0})=>{const state=createFiniteBecketState(count,{circulation:'cw',roleArrangement:'lark-left'}),dancers=createDancers(count),poses=finiteBecketPoses(state).map(p=>({...p,position:{x:p.position.x+offset.x,z:p.position.z+offset.z}})),boundary=captureBecketSliceBoundary(dancers,poses,state.binding,startBeat,[]);return{state,dancers,poses,boundary};};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const close=(a:readonly Pose[],b:readonly Pose[])=>{assert.equal(a.length,b.length);for(const p of a){const q=b.find(q=>q.id===p.id)!;assert.ok(q);assert.ok(gap(p,q)<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw)))<1e-7);}};

test('retained explicit-wording sources keep the one actual marker, source clock and both right stars',()=>{
 for(const id of ['3181','2996']){const r=source(id);assert.equal(r.formation,'Becket');assert.equal(r.rows[1].text,'slice left and straight back ⁋');assert.deepEqual(r.rows.filter(r=>r.progression).map(r=>r.index),[1]);assert.equal(r.rows.slice(0,2).reduce((n,r)=>n+r.beats!,0),16);assert.equal(r.rows.reduce((n,r)=>n+r.beats!,0),64);}
 assert.deepEqual(source('3181').rows.slice(4,6).map(r=>r.text),['star right 4 places','star right 4 places']);
 assert.equal(source('2996').hook,'easy hey dance');
});

test('actual-state slice has diagonal first four and straight-back last four at its source endpoint',()=>{
 for(const count of [3,4]){const {state,dancers,poses,boundary}=setup(count),plan=compileBecketSliceStep(figure(),boundary,state,options());close(plan.sample(8).poses,poses);assert.equal(plan.rebindBeat,16);assert.equal(plan.exitState.sourceBeat,16);assert.equal(plan.exitState.relationshipEpoch,1);assert.deepEqual(plan.exitState.partner,boundary.partner);assert.equal(plan.waitingCouples.length,count%2?1:2);
  const middle=plan.sample(12).poses,end=plan.sample(16).poses;for(const p of poses){const side=state.couples[dancers[p.id].couple].side==='east'?1:-1;assert.ok(Math.abs(middle[p.id].position.x-(p.position.x-side*.52))<1e-9);assert.ok(Math.abs(middle[p.id].position.z-(p.position.z+side*1.8))<1e-9);assert.equal(end[p.id].position.x,p.position.x);for(const beat of [12,13,14,15,16])assert.equal(plan.sample(beat).poses[p.id].position.z,middle[p.id].position.z);}
  for(const group of plan.endBinding.groups){const b=becketSliceGroupBoundary(plan.exitState,group);assert.equal(b.relationshipEpoch,1);assert.equal(b.sourceBeat,16);assert.equal(b.actors.length,4);}
  assert.throws(()=>plan.sample(16.001));assert.throws(()=>plan.sample(7.999));
 }
});

test('same reusable slice accepts a differently placed translated boundary and carries actual entry facing',()=>{
 const {state,boundary}=setup(5,26.5,{x:2.75,z:-7.25});const input=structuredClone(boundary);input.poses[0].yaw+=.3;const plan=compileBecketSliceStep(figure('synthetic-middle'),input,state,options());assert.equal(plan.rebindBeat,34.5);assert.deepEqual(plan.sample(26.5).poses.map(({id,position,yaw})=>({id,position,yaw})),input.poses);assert.deepEqual(plan.origin,{x:2.75,z:-7.25});assert.equal(plan.sample(27.5).poses[0].yaw,-Math.PI/2);const end=plan.sample(34.5).poses;close(plan.sampleWaiting(34.5),end.filter(p=>plan.endBinding.waitingIds.includes(p.id)));
});

test('finite waiters move across the same physical end and are still afterward, with representative global clearance',()=>{
 for(const count of [3,4]){const {state,boundary}=setup(count),plan=compileBecketSliceStep(figure(),boundary,state,options()),end=plan.sample(16).poses,next=finiteBecketPoses(plan.nextState);close(plan.sampleWaiting(24),next.filter(p=>plan.endBinding.waitingIds.includes(p.id)));assert.deepEqual(plan.sampleWaiting(24),plan.sampleWaiting(31));
  for(const id of plan.endBinding.waitingIds){assert.ok(gap(plan.sampleWaiting(20).find(p=>p.id===id)!,end[id])>.1);assert.equal(Math.sign(plan.sampleWaiting(20).find(p=>p.id===id)!.position.z),Math.sign(end[id].position.z));}
  let min=Infinity,max=0,prev=plan.sample(8).poses;for(let beat=8.125;beat<=24;beat+=.125){const p=beat<=16?plan.sample(beat).poses:end.map(p=>plan.sampleWaiting(beat).find(q=>q.id===p.id)??p);for(let a=0;a<p.length;a++){max=Math.max(max,gap(p[a],prev[a])/.125);for(let b=a+1;b<p.length;b++)min=Math.min(min,gap(p[a],p[b]));}prev=p;}assert.ok(min>.45,`${count}: clearance ${min}`);assert.ok(max<1.8,`${count}: speed ${max}`);
 }
});

test('3181 circle/right-star consumers and 2996 actual partner full-hey compose through the existing seams',()=>{
 for(const id of ['3181','2996'])for(const count of [3,4]){const {state,dancers,poses}=setup(count),lines:Figure={id:'lines',kind:'long-lines',beats:8,label:'Long lines',who:'all'},prefix=compileEventSection({dancers,initial:poses,binding:state.binding,totalBeats:8,steps:[{figure:lines,compile:c=>compilePrimitiveFigure(lines,c.ids,c.start,c.dancers,Array(count).fill(1))}]});
  const boundary=captureBecketSliceBoundary(dancers,prefix.end,state.binding,8,prefix.sample(8).contacts),plan=compileBecketSliceStep(figure(),boundary,state,options(id));
  const figures:Figure[]=[{id:'cl',kind:'circle',beats:8,label:'Circle left once',who:'all',direction:'left',amount:1},{id:'cr',kind:'circle',beats:8,label:'Circle right once',who:'all',direction:'right',amount:1},...(id==='3181'?[{id:'sr1',kind:'star',beats:8,label:'Star right once',who:'all',direction:'right',amount:1},{id:'sr2',kind:'star',beats:8,label:'Star right again',who:'all',direction:'right',amount:1}] as Figure[]:[{id:'hey',kind:'hey',beats:16,label:'Full robin-right hey',who:'partner',amount:1,heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',entry:'paired-sidelines',exit:'same-slots-facing-across'}] as Figure[]),{id:'ps',kind:'swing',beats:16,label:'Partner long swing',who:'partner'}];
  let absolute=16;const steps=figures.map((f,i)=>{const start=absolute;absolute+=f.beats;return{figure:f,entryFacingBeats:1,compile(c:any){if(f.kind==='hey'){const b=captureSequenceBoundary(c,start,[]),h=compileNeutralFullHeyStep(f,c,b);assertSequenceHandoff(b,h.entryState);assert.equal(h.heyPlan.events.length,8);assert.equal(h.exitState.sourceBeat,48);return h;}return compilePrimitiveFigure(f,c.ids,c.start,c.dancers,Array(count).fill(1),figureContinuity(figures,i));},inactive:(beat:number)=>plan.sampleWaiting(beat+16)};});
  const after=compileEventSection({dancers,initial:plan.sample(16).poses,binding:plan.endBinding,steps,totalBeats:48});close(after.end,finiteBecketPoses(plan.nextState));assert.equal(absolute,64);
 }
});

test('slice rejects stale clocks, wrong relations, canonical pose repairs, holds and unreviewed modifiers',()=>{
 const {state,boundary}=setup(4),f=figure(),o=options();for(const mutate of [(f:any)=>f.phaseBeats=[3,5],(f:any)=>delete f.phaseBeats,(f:any)=>f.sliceReturn='retrace',(f:any)=>f.direction='right',(f:any)=>f.progression=false,(f:any)=>f.extraAction='circle']){const b=structuredClone(f);mutate(b);assert.throws(()=>compileBecketSliceStep(b,boundary,state,o));}
 for(const mutate of [(b:any)=>b.relationshipEpoch++,(b:any)=>b.poses[0].position.x+=.1,(b:any)=>b.partner[0][1]=3,(b:any)=>b.heldContacts=[{a:0,b:1,handA:'left',handB:'right',point:{x:.9,y:1.3,z:-1.8},strength:.01,kind:'joined'}]]){const b=structuredClone(boundary);mutate(b);assert.throws(()=>compileBecketSliceStep(f,b,state,o));}
 assert.throws(()=>compileBecketSliceStep(f,boundary,state,{...o,timingSource:{...o.timingSource,sourceId:'stale'}}));assert.throws(()=>compileBecketSliceStep(f,boundary,{...state,circulation:'ccw'},o));
 let reads=0;const accessor=structuredClone(boundary);Object.defineProperty(accessor.poses[0].position,'x',{enumerable:true,get(){reads++;return.9;}});assert.throws(()=>compileBecketSliceStep(f,accessor,state,o));assert.equal(reads,0);
});
