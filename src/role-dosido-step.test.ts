import test from 'node:test';
import assert from 'node:assert/strict';
import {collectRoleDosidoEvidence,contextFromBoundary,measureRoleDosido,roleDosidoSource,roleDosidoCapabilities} from '../test-data/role-dosido/evidence.ts';
import {compileChoreography} from './choreography.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {compileRoleDosidoStep,assertRoleDosidoFigure} from './role-dosido-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import type {Figure} from './types.ts';
import {distance,turn,heading} from './ring-twirl-contract.ts';

for(const id of[522,3115] as const)for(const couples of[3,4] as const)test(`literal ${id}: ${couples} couples retain the source-counted role exchange, real producers, old epoch and finite return`,()=>{collectRoleDosidoEvidence(id,couples);});

function actualEntry(){const {dance}=roleDosidoSource(522),compiled=compileChoreography(dance,3,roleDosidoCapabilities) as CompiledStateSequence,boundary=compiled.sequenceBoundaries(0).find(p=>p.adapterId==='role-dosido-exchange')!.entry,figure=dance.figures.find(f=>f.kind==='do-si-do'&&f.amount===1.5)!;return{figure,boundary,context:contextFromBoundary(boundary,compiled.dancers)};}

test('an unseen long-lines producer, changed measured rectangle/epoch/clock and arbitrary successor preserve actual stations',()=>{
 const {figure,context}=actualEntry();context.ids.reverse();context.bindingEpoch=9;context.relations.epoch=9;
 const center={x:context.ids.reduce((n,id)=>n+context.start[id].position.x,0)/4,z:context.ids.reduce((n,id)=>n+context.start[id].position.z,0)/4};
 for(const id of context.ids){const p=context.start[id];p.position={x:3.25+(p.position.x-center.x)*.78/.9,z:-4.5+(p.position.z-center.z)*.82/.9};p.yaw+=.3;}
 const lines:Figure={id:'new-prefix',label:'New measured producer',kind:'long-lines',who:'all',beats:8},producer=compilePrimitiveFigure(lines,context.ids,context.start,context.dancers,[1,-1]),produced=sampleFormationEndpoint(context,producer,1),nextContext={...context,start:produced},incoming=captureSequenceBoundary(nextContext,45.5,producer.contacts(1,produced)),renamed={...figure,id:'unseen-role-passage',label:'Opaque title-independent role exchange'};
 const plan=compileRoleDosidoStep(renamed,nextContext,incoming);assert.deepEqual(plan.entryState,incoming);assert.equal(plan.exitState.sourceBeat,53.5);assert.equal(plan.exitState.relationshipEpoch,9);assert.deepEqual(plan.phaseBeats,[1,6,1]);
 for(const next of[undefined,lines,{id:'unrelated-metadata',label:'An uncompiled future choice',kind:'unknown',beats:7} as Figure]){const other=compileRoleDosidoStep(renamed,{...nextContext,next},incoming);assert.deepEqual(other.entryState,plan.entryState);assert.deepEqual(other.exitState,plan.exitState);assert.deepEqual(other.gates,plan.gates);}
 const named=new Set(plan.namedPair);for(const p of plan.entryState.poses){const q=plan.exitState.poses.find(q=>q.id===p.id)!,original=plan.entryState.poses.find(q=>q.id===(named.has(p.id)?plan.namedPair.find(id=>id!==p.id):p.id))!;assert.deepEqual(q.position,original.position);assert.ok(Math.abs(Math.abs(q.position.x-3.25)-.78)<1e-7);assert.ok(Math.abs(Math.abs(q.position.z+4.5)-.82)<1e-7);}
 const metrics=measureRoleDosido(plan,8);assert.ok(metrics.maximumSpeed<1.5);
 for(const id of context.ids)for(const t of[0,.03,.1,.125,.875,.9,.97,1]){if(t<=.125)assert.deepEqual(plan.position(id,t),incoming.poses.find(p=>p.id===id)!.position);if(t>=.875)assert.deepEqual(plan.position(id,t),plan.exitState.poses.find(p=>p.id===id)!.position);assert.deepEqual(plan.contacts(t,[]),[]);}
 // A different compatible successor consumes the exact released endpoint.
 const received={...nextContext,start:sampleFormationEndpoint(nextContext,plan,1)},continuation=compilePrimitiveFigure(lines,received.ids,received.start,received.dancers,[1,-1]);
 assertSequenceHandoff(plan.exitState,captureSequenceBoundary(received,53.5,continuation.contacts(0,received.start)));
});

test('all three shoulder gates, back-to-back midpoint and full return are independent of the final partnerward facing',()=>{
 const {figure,context,boundary}=actualEntry(),plan=compileRoleDosidoStep(figure,context,boundary);
 assert.deepEqual(plan.gates.map(g=>g.kind),['right-shoulder','back-to-back','left-shoulder','full-return','right-shoulder','half-exchange']);assert.equal(plan.gates.at(-1)!.sourceBeat,31);
 for(const gate of plan.gates){const t=(gate.sourceBeat-boundary.sourceBeat)/figure.beats;for(const p of gate.poses){assert.ok(distance(plan.position(p.id,t),p.position)<1e-8);assert.ok(Math.abs(turn(plan.facing(p.id,t,[]),p.yaw))<1e-8);const q=gate.poses.find(q=>q.id!==p.id)!;if(gate.kind==='back-to-back')assert.ok(Math.cos(turn(heading(p.position,q.position),p.yaw))<-.999999);}}
 for(const id of plan.namedPair){const orbitYaw=plan.facing(id,1/8,[]);for(let n=0;n<=12;n++)assert.equal(plan.facing(id,(1+6*n/12)/8,[]),orbitYaw);assert.ok(Math.abs(turn(plan.facing(id,1,[]),orbitYaw))>1);}
});

test('role do-si-do snapshots input and rejects stale, held, ambiguous or unconsumed boundaries',()=>{
 const {figure,context,boundary}=actualEntry();
 for(const alter of[{amount:1},{amount:.5},{beats:6},{beats:9},{direction:'left'},{who:'partner'},{progression:true},{entry:'paired-sidelines'},{exit:'partner-swing'},{hands:'right'},{confidence:'unsupported'}])assert.throws(()=>assertRoleDosidoFigure({...figure,...alter} as Figure));
 assert.throws(()=>compileRoleDosidoStep(figure,{...context,bindingEpoch:2},boundary),/epoch/);
 const held={...boundary,heldContacts:[{a:context.ids[0],b:context.ids[1],handA:'right' as const,handB:'left' as const,kind:'joined' as const,point:{x:0,y:1,z:0},strength:5e-8}]};assert.throws(()=>compileRoleDosidoStep(figure,context,held),/held contact/);
 assert.throws(()=>compileRoleDosidoStep(figure,context,{...boundary,sourceBeat:2**53}),/source-count interval/);
 const wrong=structuredClone(boundary);wrong.poses[0].position.x+=.01;assert.throws(()=>compileRoleDosidoStep(figure,context,wrong),/discontinuous root/);
 let reads=0;const hostile={...figure};Object.defineProperty(hostile,'amount',{enumerable:true,get(){reads++;return 1.5;}});assert.throws(()=>compileRoleDosidoStep(hostile,context,boundary),/accessors/);assert.equal(reads,0);
 const raw=structuredClone(boundary),input={...figure},owned=compileRoleDosidoStep(input,context,raw),before=owned.position(owned.namedPair[0],.42);raw.poses[0].position.x=999;input.amount=.5;context.start[context.ids[0]].position.z=999;context.relations.partner.clear();assert.deepEqual(owned.position(owned.namedPair[0],.42),before);const escaped=owned.position(owned.namedPair[0],.42);escaped.x=500;assert.deepEqual(owned.position(owned.namedPair[0],.42),before);assert.ok(Object.isFrozen(owned.exitState.poses[0].position));assert.ok(Object.isFrozen(owned.gates));assert.throws(()=>owned.position(999,.5),/outside/);assert.throws(()=>owned.position(owned.namedPair[0],NaN),/finite/);
});
