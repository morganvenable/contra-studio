import test from 'node:test';
import assert from 'node:assert/strict';
import {createDancers,initialPoses,assertCompositionCapabilities} from './engine.ts';
import {compileDosidoRingStep} from './dosido-ring-step.ts';
import {compileRingBalanceFigure} from './ring-california-adapter.ts';
import {compileSequenceStep} from './sequence-registry.ts';
import {captureSequenceBoundary,sampleSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {Figure} from './types.ts';
const f:Figure={id:'independent-full-return',label:'Complete neighbor return then ring',kind:'do-si-do',who:'neighbor',direction:'right',amount:1,beats:8,exit:'ring',phaseBeats:[6,2]},next:Figure={id:'actual-ring-balance',label:'Ring balance',kind:'ring-balance',who:'all',hands:'both',beats:4};
function incoming(dx=0,dz=0){const dancers=createDancers(2),start=initialPoses(dancers).map(p=>({...p,position:{x:p.position.x+dx,z:p.position.z+dz}})),partner=new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor=new Map([[0,3],[3,0],[1,2],[2,1]]),context={ids:[0,1,2,3],start,dancers,relations:{epoch:11,partner,neighbor},bindingEpoch:11,next},boundary=captureSequenceBoundary(context,56,[]);return{context,boundary};}
for(const [dx,dz]of[[0,0],[4,-7]])test(`full return precedes physically reached held ring in translated frame ${dx}/${dz}`,()=>{
 const {context,boundary}=incoming(dx,dz),plan=compileDosidoRingStep(f,context,boundary);assertSequenceHandoff(boundary,plan.entryState);
 assert.equal(plan.exitState.sourceBeat,64);assert.equal(plan.exitState.relationshipEpoch,11);assert.deepEqual(plan.exitState.partner,boundary.partner);assert.deepEqual(plan.exitState.neighbor,boundary.neighbor);
 assert.deepEqual(plan.gates.map(g=>g.kind),['right-shoulder','back-to-back','left-shoulder','full-return']);
 for(const gate of plan.gates){if(gate.kind==='full-return'){assert.ok(Math.abs(gate.sourceBeat-62)<1e-8);for(const p of gate.poses){const a=context.start[p.id];assert.ok(Math.hypot(p.position.x-a.position.x,p.position.z-a.position.z)<1e-8);}}else if(gate.kind!=='back-to-back')for(const p of gate.poses){const other=gate.poses.find(q=>q.id===context.relations.neighbor.get(p.id))!,x=other.position.x-p.position.x,z=other.position.z-p.position.z,forward=x*Math.sin(p.yaw)+z*Math.cos(p.yaw),right=-x*Math.cos(p.yaw)+z*Math.sin(p.yaw);assert.ok(Math.abs(forward)<1e-7);assert.ok((gate.kind==='right-shoulder'?1:-1)*right>.679999);}}
 let contactCount=0,maxReach=0;for(let k=0;k<=2048;k++){
  const t=k/2048,poses=context.start.map(p=>({...p,position:plan.position(p.id,t),yaw:plan.facing(p.id,t,[])})),contacts=plan.contacts(t,poses);
  if(t<=.75)assert.deepEqual(contacts,[],'hands remain released through the complete return');
  for(const h of contacts){contactCount++;assert.ok(h.strength>0&&h.strength<=1);for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const p=poses[id],side=hand==='left'?1:-1,reach=Math.hypot(h.point.x-p.position.x-side*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+side*.235*Math.sin(p.yaw));maxReach=Math.max(maxReach,reach);assert.ok(reach<=.68+1e-7);if(h.strength>.999999)assert.ok(reach<.6201);}}
 }
 assert.ok(contactCount>0);assert.equal(plan.exitState.heldContacts.length,4);assert.ok(plan.exitState.heldContacts.every(h=>h.strength===1));
 const arrival=context.start.map(p=>({...p,position:plan.position(p.id,1),yaw:plan.facing(p.id,1,[])})),ring=compileRingBalanceFigure(next,{...context,start:arrival,next:undefined});assertSequenceHandoff(plan.exitState,sampleSequenceBoundary({...context,start:arrival},ring,64,0));
 for(const p of arrival){assert.ok(Math.abs(Math.abs(p.position.x-dx)-.55)<1e-8);assert.ok(Math.abs(Math.abs(p.position.z-dz)-.55)<1e-8);}
 assert.ok(plan.maximumObservedSpeed<1.8);assert.ok(plan.minimumObservedClearance>=.45);console.log(JSON.stringify({dx,dz,maximumObservedSpeed:plan.maximumObservedSpeed,minimumObservedClearance:plan.minimumObservedClearance,maxReach,scope:'explicit6+2 complete return and held-ring acquisition'}));
 const routed=compileSequenceStep(f,context,boundary,()=>{throw Error('legacy fallback forbidden');},REGISTERED_MOTION_CAPABILITIES);assert.equal(routed.adapterId,'dosido-to-held-ring');assert.ok(routed.boundaryPlan);assertCompositionCapabilities([f,next],REGISTERED_MOTION_CAPABILITIES);
 const saved=plan.position(0,.9);context.start[0].position.x+=50;context.relations.neighbor.clear();assert.deepEqual(plan.position(0,.9),saved);
});
test('ring preparation consumes only its explicit8-count full-return6+2 contract and actual boundary',()=>{
 const {context,boundary}=incoming();
 for(const change of [{phaseBeats:[5,3]},{phaseBeats:undefined},{amount:1.5},{who:'partner'},{direction:'left'},{progression:true},{beats:10},{hands:'right'},{exit:undefined}] as Partial<Figure>[]){assert.throws(()=>compileDosidoRingStep({...f,...change},context,boundary));}
 assert.throws(()=>assertFigureArgumentsConsumed({...f,exit:undefined}));assert.throws(()=>assertFigureArgumentsConsumed({...f,exit:'progressed-neighbors',amount:1.5,progression:true}));
 assert.throws(()=>compileDosidoRingStep(f,{...context,next:undefined},boundary));assert.throws(()=>compileDosidoRingStep(f,{...context,bindingEpoch:12},boundary));
 assert.throws(()=>compileDosidoRingStep(f,context,{...boundary,heldContacts:[{a:0,b:3,handA:'left',handB:'right',point:{x:.9,y:1.14,z:0},strength:1,kind:'joined'}]}),/released incoming hands/);
 const changed=structuredClone(boundary);changed.poses[0].position.x+=.1;assert.throws(()=>compileDosidoRingStep(f,context,changed));
 assert.throws(()=>compileSequenceStep(f,context,boundary,()=>{throw Error('legacy');},{...REGISTERED_MOTION_CAPABILITIES,ringBalances:false}));assert.throws(()=>assertCompositionCapabilities([f,next],{...REGISTERED_MOTION_CAPABILITIES,stateCarryingSequences:false}));
});
