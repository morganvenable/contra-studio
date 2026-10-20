import test from 'node:test';
import assert from 'node:assert/strict';
import type {Figure} from './types.ts';
import type {FigureContext} from './extended-figures.ts';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import {compileMadRobin,type MadRobinFigure} from './mad-robin.ts';
import {compileMadRobinStep} from './mad-robin-step.ts';
import {compileSquareThroughStep} from './square-through-step.ts';
import {captureFormationState,sampleFormationEndpoint} from './formation-handoff.ts';
import {assertSequenceHandoff,captureSequenceBoundary,sampleSequenceBoundary} from './sequence-boundary.ts';
import {distance,turn} from './ring-twirl-contract.ts';

test('the reusable mad-robin step preserves the primitive, gaze and hand-free return for square or synthetic long-lines successors',()=>{
 const dancers=createDancers(2),start=initialPoses(dancers);
 for(const p of start){p.yaw=-Math.sign(p.position.x)*Math.PI/2;p.position={x:p.position.x+2,z:-p.position.z-4};}
 const context:FigureContext={ids:[3,1,0,2],start,dancers,bindingEpoch:7,relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])}};
 const figure:MadRobinFigure={id:'opaque-orbit',kind:'mad-robin',label:'Explicit full mad robin',beats:8,who:'all',orbitRelation:'neighbor',facingRelation:'partner',frontRole:'robin',orbitDirection:'counterclockwise',amount:1,entry:'paired-sidelines-facing-across',exit:'same-slots-facing-across'};
 const incoming=captureSequenceBoundary(context,37.5,[]),primitive=compileMadRobin(figure,captureFormationState({...context,ids:[0,1,2,3]},{sourceBeat:37.5,orderedIds:[1,2,0,3],geometry:{kind:'paired-sidelines',sidePair:'neighbor',origin:{x:2,z:-4},halfWidth:.9,pairGap:1.8},heldContacts:[]}));
 const square:Figure={id:'square',kind:'square-through',label:'Balanced two-hand square',beats:8,who:'all',amount:2,hands:'right-left',phaseBeats:[4,2,2],entry:'partners-facing-across',exit:'partners-facing-across'},lines:Figure={id:'unseen-continuation',kind:'long-lines',label:'Long lines after the orbit',beats:8,who:'all'};
 for(const next of[square,lines,undefined]){
  const c={...context,next},plan=compileMadRobinStep(figure,c,incoming);
  assert.deepEqual(plan.entryState,incoming);assert.deepEqual(plan.exitState,{...incoming,sourceBeat:45.5});assert.deepEqual(plan.passages,primitive.passages);
  for(let k=0;k<=16;k++){
   const t=k/16,poses=sampleFormationEndpoint(c,plan,t);assert.deepEqual(plan.contacts(t,poses),[]);
   for(const id of c.ids){assert.ok(distance(plan.position(id,t),primitive.position(id,t))<1e-12);assert.equal(plan.facing(id,t,poses),primitive.facing(id,t,poses));const p=poses[id].position,q=poses[c.relations.partner.get(id)!].position;assert.ok(Math.abs(turn(poses[id].yaw,Math.atan2(q.x-p.x,q.z-p.z)))<1e-12);}
  }
  const successorContext={...c,start:sampleFormationEndpoint(c,plan,1),next:undefined};
  if(next===square)assertSequenceHandoff(plan.exitState,compileSquareThroughStep(square,successorContext,plan.exitState).entryState);
  if(next===lines){const successor=compilePrimitiveFigure(lines,c.ids,successorContext.start,dancers,[1,-1]);assertSequenceHandoff(plan.exitState,sampleSequenceBoundary(successorContext,successor,45.5,0));}
 }
 // Even a small raw incoming hold must reach the hand-free primitive's guard.
 const held={...incoming,heldContacts:[{a:0,b:3,handA:'left' as const,handB:'right' as const,kind:'joined' as const,point:{x:2.9,y:1.18,z:-4},strength:5e-8}]};
 assert.throws(()=>compileMadRobinStep(figure,context,held),/held contact/);
});
