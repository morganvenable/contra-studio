import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,retained,after,sequence,sample} from '../test-data/measured-six-two/probe.ts';
import {compileMeasuredSixCountCircleStep,compileMeasuredTwoCountPassStep} from './measured-six-two-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {distance,turn} from './ring-twirl-contract.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Dancer,Figure,Pose,Vec2} from './types.ts';

test('measured compact suffix matches all four retained legacy paths without changing source dispatch',()=>{
 for(const source of[892,443,2530,3507]){
  const r=retained(source),f=fixture(),context={...f.context,start:structuredClone(r.sample(56).poses),next:r.dance.figures.at(-1)},boundary=captureSequenceBoundary(context,56,[]),circle=compileMeasuredSixCountCircleStep(r.dance.figures.at(-2)!,context,boundary),pc=after(context,circle.exitState),pass=compileMeasuredTwoCountPassStep(context.next!,pc,circle.exitState);
  for(let n=0;n<=320;n++){const beat=56+n/40,isCircle=beat<62,actual=sample(isCircle?context:pc,isCircle?circle:pass,isCircle?(beat-56)/6:(beat-62)/2),expected=r.sample(beat===64?64-1e-10:beat).poses;for(const id of context.ids){assert.ok(distance(actual[id].position,expected[id].position)<1e-8,`${source}/${beat}/${id} root`);assert.ok(Math.abs(turn(actual[id].yaw,expected[id].yaw))<1e-8,`${source}/${beat}/${id} facing`);}}
  assert.ok(Math.abs(circle.geometry.halfWidth-.72)<1e-8);assert.ok(Math.abs(circle.geometry.forwardPreparation-.24)<1e-8);assertSequenceHandoff(circle.exitState,pass.entryState);assert.equal(pass.exitState.relationshipEpoch,3);
 }
});

test('wide measured boundary keeps literal circle winding, physical preparation, right-neighbor gates and exact six-plus-two clock',t=>{
 for(const h of[.72,.765,.81,.855,.9]){
  const s=sequence(h,13.25),{circle,pass,context}=s;assert.equal(circle.entryState.sourceBeat,13.25);assert.equal(circle.exitState.sourceBeat,19.25);assert.equal(pass.exitState.sourceBeat,21.25);assert.equal(circle.exitState.relationshipEpoch,3);assert.equal(pass.exitState.relationshipEpoch,3);assert.deepEqual(pass.exitState.neighbor,s.boundary.neighbor);assert.deepEqual(pass.exitState.partner,s.boundary.partner);
  assertSequenceHandoff(s.boundary,circle.entryState);assertSequenceHandoff(circle.exitState,pass.entryState);
  for(const id of context.ids){const initial=context.start[id].position,station=circle.position(id,5.25/6),prepared=circle.position(id,1);assert.ok(distance(station,{x:initial.z,z:-initial.x})<1e-7);assert.ok(distance(prepared,{x:station.x+Math.sign(station.x)*.04-Math.sign(station.z)*.30,z:station.z-Math.sign(station.z)*(2*h-1.20)})<1e-7);let angle=Math.atan2(initial.z,initial.x),winding=0;for(let n=1;n<=1050;n++){const p=circle.position(id,n/200/6),next=Math.atan2(p.z,p.x);winding+=turn(next,angle);angle=next;}assert.ok(Math.abs(winding-1.5*Math.PI)<1e-8);const end=pass.position(id,1);assert.ok(Math.abs(Math.abs(end.x)-h)<1e-8);assert.ok(Math.abs(Math.abs(end.z)-h)<1e-8);}
  assert.deepEqual(circle.contacts(0,context.start),[]);assert.equal(circle.contacts(.5,sample(context,circle,.5)).length,4);assert.deepEqual(circle.contacts(1,sample(context,circle,1)),[]);assert.deepEqual(pass.contacts(.5,sample(s.passContext,pass,.5)),[]);
  for(const gate of pass.gates)for(const[id,other]of[gate.pair,[...gate.pair].reverse()]){const a=pass.position(id,gate.beat/2),b=pass.position(other,gate.beat/2),yaw=pass.facing(id,gate.beat/2,s.passContext.start);assert.ok(Math.abs(a.z-b.z)<1e-8);assert.ok((b.x-a.x)*-Math.cos(yaw)+(b.z-a.z)*Math.sin(yaw)>.65);}
  assert.ok(pass.maximumObservedSpeed<=.85);assert.ok(pass.minimumObservedClearance>=.65);assert.ok(circle.maximumObservedSpeed<=1.8);assert.ok(circle.minimumObservedClearance>=.65);
  t.diagnostic(JSON.stringify({halfWidth:h,prep:circle.geometry.forwardPreparation,circleSpeed:circle.maximumObservedSpeed,circleGap:circle.minimumObservedClearance,passSpeed:pass.maximumObservedSpeed,passGap:pass.minimumObservedClearance,gateBeats:pass.gates.map(g=>g.beat)}));
 }
});

test('measured steps are rigid-frame/opaque-ID invariant and retain owned boundary state',()=>{
 const a=sequence(.9),angle=.71,origin={x:4,z:-3},map=new Map([[0,41],[1,7],[2,95],[3,12]]),rotate=(p:Vec2)=>({x:p.x*Math.cos(angle)-p.z*Math.sin(angle),z:p.x*Math.sin(angle)+p.z*Math.cos(angle)}),world=(p:Vec2)=>{const q=rotate(p);return{x:q.x+origin.x,z:q.z+origin.z};},start:Pose[]=[],dancers:Dancer[]=[];
 for(const id of a.context.ids){const next=map.get(id)!;start[next]={...a.context.start[id],id:next,position:world(a.context.start[id].position),yaw:a.context.start[id].yaw-angle};dancers[next]={...a.context.dancers[id],id:next};}
 const relations=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([id,other])=>[map.get(id)!,map.get(other)!])),context:FigureContext={...a.context,ids:[95,41,12,7],start,dancers,relations:{epoch:3,partner:relations(a.context.relations.partner),neighbor:relations(a.context.relations.neighbor)},next:{...a.next,id:'independent-pass-label',label:'A different label'}};
 const boundary=captureSequenceBoundary(context,56,[]),circle=compileMeasuredSixCountCircleStep({...a.figure,id:'independent-circle-label',label:'Arbitrary title-free row'},context,boundary),pc=after(context,circle.exitState),pass=compileMeasuredTwoCountPassStep(context.next!,pc,circle.exitState);
 for(let n=0;n<=160;n++){const t=n/160;for(const id of a.context.ids)for(const[before,after]of[[a.circle,circle],[a.pass,pass]]){assert.ok(distance(after.position(map.get(id)!,t),world(before.position(id,t)))<1e-7);assert.ok(Math.abs(turn(after.facing(map.get(id)!,t,start),before.facing(id,t,a.context.start)-angle))<1e-7);}}
 const expected=pass.position(41,.4);context.start[41].position.x=99;context.dancers[41].role='robin';(context.relations.neighbor as Map<number,number>).clear();assert.deepEqual(pass.position(41,.4),expected);assert.throws(()=>{(pass.exitState.poses[0].position as Vec2).x=99;});
});

test('measured adapters reject unconsumed variants, stale/moved context, retained holds and out-of-envelope geometry',()=>{
 for(const change of[{beats:8},{direction:'right'},{amount:1},{phaseBeats:[5.25,.75]},{turnToward:'partner'},{progression:true},{who:'neighbor'}]){const f=fixture();assert.throws(()=>compileMeasuredSixCountCircleStep({...f.figure,...change} as Figure,f.context,f.boundary));}
 for(const h of[.675,.71,.91]){const f=fixture(h);assert.throws(()=>compileMeasuredSixCountCircleStep(f.figure,f.context,f.boundary),/envelope/);}
 const f=fixture();assert.throws(()=>compileMeasuredSixCountCircleStep(f.figure,{...f.context,next:undefined},f.boundary),/immediate/);assert.throws(()=>compileMeasuredSixCountCircleStep(f.figure,{...f.context,bindingEpoch:4},f.boundary),/stale/);
 const moved=structuredClone(f.context.start);moved[0].position.x+=.1;assert.throws(()=>compileMeasuredSixCountCircleStep(f.figure,{...f.context,start:moved},f.boundary),/discontinuous/);
 const held={...f.boundary,heldContacts:[{a:0,b:1,handA:'left' as const,handB:'right' as const,point:{x:.72,y:1.14,z:0},strength:1,kind:'joined' as const}]};assert.throws(()=>compileMeasuredSixCountCircleStep(f.figure,f.context,held),/released/);
 const s=sequence(.9);for(const change of[{beats:4},{who:'partner'},{passingShoulder:'left'},{entry:'ring'}])assert.throws(()=>compileMeasuredTwoCountPassStep({...s.next,...change} as Figure,s.passContext,s.circle.exitState));
 assert.throws(()=>compileMeasuredTwoCountPassStep(s.next,{...s.passContext,next:s.figure},s.circle.exitState),/finite event/);
 const bad=structuredClone(s.passContext.start);bad[0].position.z+=.02;const context={...s.passContext,start:bad};assert.throws(()=>compileMeasuredTwoCountPassStep(s.next,context,captureSequenceBoundary(context,62,[])),/preparation/);
 for(const plan of[s.circle,s.pass]){assert.throws(()=>plan.position(999,.5));assert.throws(()=>plan.position(0,NaN));assert.deepEqual(plan.position(0,-1),plan.position(0,0));assert.deepEqual(plan.position(0,2),plan.position(0,1));}
});
