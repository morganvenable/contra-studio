import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileStateCarryingCore,initialPoses,createDancers,compilePrimitiveFigure} from './engine.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compilePairedRadialSwingStep,needsPairedRadialSwingEntry} from './paired-radial-swing-step.ts';
import {assertSequenceHandoff,ownSequenceBoundary} from './sequence-boundary.ts';
import {assertFormationHandoff} from './formation-handoff.ts';
import type {SequenceBoundary} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Dance,Dancer,Figure} from './types.ts';

const caps={...REGISTERED_MOTION_CAPABILITIES,stateCarryingRadialSwings:false};
const result=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/3087.json',import.meta.url),'utf8'),[],caps).result;
const dance:Dance={id:'retained-3087-radial-test',title:result.record.title,formation:'duple-improper',figures:result.rows.flatMap(r=>r.figures)};
const figure=dance.figures[3];
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const close=(a:number,b:number,label='')=>assert.ok(Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`);
function contextFor(boundary:SequenceBoundary,dancers:Dancer[]):FigureContext {
 const start=initialPoses(dancers);for(const p of boundary.poses)Object.assign(start[p.id],structuredClone(p));
 return{ids:boundary.actors.map(a=>a.id),start,dancers:structuredClone(dancers),relations:{epoch:boundary.relationshipEpoch,partner:new Map(boundary.partner),neighbor:new Map(boundary.neighbor)},bindingEpoch:boundary.relationshipEpoch};
}
function actual(couples=4){const core=compileStateCarryingCore(dance,couples,caps),proofs=core.sequenceState(0).proofs.filter(p=>p.incoming.sourceBeat===20);return{core,proofs};}
function baseline(){const {core,proofs}=actual();const incoming=structuredClone(proofs[0].incoming);return{incoming,context:contextFor(incoming,core.dancers)};}

test('3087 actual even/odd first-cycle partner frames retain named source clocks and reach usable sidelines',()=>{
 assert.equal(result.coverage.semanticallyResolved,true);
 assert.deepEqual(dance.figures.slice(0,2).map(f=>[f.kind,f.direction,f.amount,f.beats]),[['allemande','right',1.25,8],['allemande','left',1.5,8]]);
 for(const couples of[4,5]){const {core,proofs}=actual(couples);assert.equal(proofs.length,2);
  for(const proof of proofs){const incoming=proof.incoming,context=contextFor(incoming,core.dancers),plan=compilePairedRadialSwingStep(figure,context,incoming);
   assert.equal(needsPairedRadialSwingEntry(figure,incoming),true);assertSequenceHandoff(incoming,plan.entryState);
   assert.equal(plan.exitState.sourceBeat,32);assert.equal(plan.exitState.relationshipEpoch,incoming.relationshipEpoch);assert.deepEqual(plan.exitState.partner,incoming.partner);assert.deepEqual(plan.exitState.neighbor,incoming.neighbor);assert.deepEqual(plan.exitState.actors,incoming.actors);
   assert.equal(plan.entryGeometry.halfWidth,.9);assert.equal(plan.entryGeometry.pairGap,.62);assert.equal(plan.exitFormation.geometry.pairGap,1.8);assert.equal(plan.exitState.heldContacts.length,0);assertFormationHandoff(plan.exitFormation,plan.exitFormation);
   for(const p of plan.exitState.poses){close(Math.abs(p.position.x-plan.entryGeometry.origin.x),.9);close(Math.abs(p.position.z-plan.entryGeometry.origin.z),.9);close(wrap(p.yaw-(p.position.x>plan.entryGeometry.origin.x?-Math.PI/2:Math.PI/2)),0);}
  }
 }
});

test('a changed-width translated relabeled actual incoming frame drives the same local kernel without canonical reset',()=>{
 const {incoming,context}=baseline(),base=compilePairedRadialSwingStep(figure,context,incoming),copy=structuredClone(incoming),map=new Map([[0,6],[1,3],[2,1],[3,4]]),couple=new Map([[0,7],[1,2]]),dx=2.4,dz=-3.2,extra=.15;
 const shiftFor=(id:number)=>dx+Math.sign(incoming.poses.find(p=>p.id===id)!.position.x)*extra;
 copy.sourceBeat=137;copy.relationshipEpoch=5;
 copy.actors=copy.actors.map(a=>({...a,id:map.get(a.id)!,couple:couple.get(a.couple)!})).reverse();
 copy.poses=copy.poses.map(p=>({...p,id:map.get(p.id)!,position:{x:p.position.x+shiftFor(p.id),z:p.position.z+dz}})).reverse();
 for(const relation of['partner','neighbor']as const)copy[relation]=copy[relation].map(([a,b])=>[map.get(a)!,map.get(b)!]as const).reverse();
 copy.heldContacts=copy.heldContacts.map(c=>({...c,a:map.get(c.a)!,b:map.get(c.b)!,point:{...c.point,x:c.point.x+shiftFor(c.a),z:c.point.z+dz}})).reverse();
 const dancers=createDancers(4);for(const a of copy.actors)dancers[a.id]={...dancers[a.id],...a};
 const changed=compilePairedRadialSwingStep({...figure,id:'different-source-independent-id'},contextFor(copy,dancers),copy);
 close(changed.entryGeometry.halfWidth,1.05);close(changed.entryGeometry.origin.x,dx);close(changed.entryGeometry.origin.z,base.entryGeometry.origin.z+dz);assert.equal(changed.exitState.sourceBeat,149);assert.equal(changed.exitState.relationshipEpoch,5);
 for(let i=0;i<=24;i++)for(const [oldId,newId]of map){const a=base.position(oldId,i/24),b=changed.position(newId,i/24);close(b.x,a.x+shiftFor(oldId));close(b.z,a.z+dz);close(wrap(changed.facing(newId,i/24,[])-base.facing(oldId,i/24,[])),0);}
 assert.deepEqual(changed.exitState.partner,ownSequenceBoundary(copy).partner);assert.deepEqual(changed.exitState.actors,ownSequenceBoundary(copy).actors);
});

test('raw held contacts, actual facing, geometry and epochs cannot be repaired or discarded',()=>{
 for(const mutate of[
  (b:any)=>b.heldContacts.pop(),
  (b:any)=>b.heldContacts[0].strength=.9,
  (b:any)=>b.heldContacts[0].point.x+=.01,
  (b:any)=>b.heldContacts[0].handA='right',
  (b:any)=>b.poses[0].yaw+=.1,
  (b:any)=>b.poses[0].position.x+=.1,
  (b:any)=>b.sourceBeat=NaN,
  (b:any)=>b.partner[0][1]=3,
  (b:any)=>b.extraField='not-consumed',
 ]){const {incoming,context}=baseline();const b=structuredClone(incoming);mutate(b);assert.throws(()=>compilePairedRadialSwingStep(figure,contextFor(b,context.dancers),b));}
 const {incoming,context}=baseline();context.bindingEpoch++;assert.throws(()=>compilePairedRadialSwingStep(figure,context,incoming),/epoch/);
 const bad={...figure,exit:'face-down-line'}as Figure;assert.throws(()=>compilePairedRadialSwingStep(bad,baseline().context,incoming),/ordinary|entry|exit/);
});

test('the radial profile is explicit, default primitive admission remains unchanged, and inputs are owned',()=>{
 const {incoming,context}=baseline();assert.throws(()=>compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,[1,-1],{swingEntry:'two-hand-balance',canonicalSwingLayout:true,geometry:{halfWidth:.9,rowGap:1.8}}),/sideline/);
 const source=structuredClone(figure),plan=compilePairedRadialSwingStep(source,context,incoming),before=plan.position(context.ids[0],.37),yaw=plan.facing(context.ids[0],.37,[]),id=context.ids[0];
 source.beats=4;context.start[id].position.x=99;context.ids.reverse();context.dancers[id].couple=99;(incoming.poses[0].position as any).x=88;
 assert.deepEqual(plan.position(id,.37),before);assert.equal(plan.facing(id,.37,[]),yaw);assert.throws(()=>plan.position(999,.5),/outside/);assert.throws(()=>plan.position(id,NaN),/finite/);const p=plan.position(id,.37);p.x=100;assert.deepEqual(plan.position(id,.37),before);
});
