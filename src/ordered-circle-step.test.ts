import test from 'node:test';
import assert from 'node:assert/strict';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import {compileOrderedCircleStep} from './ordered-circle-step.ts';
import {captureSequenceBoundary} from './sequence-boundary.ts';
import type {Figure} from './types.ts';
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
test('ordered circle completes its full root winding before a partnerward stationary-root turn',()=>{
 const dancers=createDancers(2),start=initialPoses(dancers),ids=[0,1,2,3];
 for(const[id,x,z]of[[2,-.9,-.9],[3,.9,-.9],[0,.9,.9],[1,-.9,.9]]){start[id].position={x:x+3,z:z-2};start[id].yaw=x>0?-Math.PI/2:Math.PI/2;}
 const context={ids,dancers,start,relations:{epoch:3,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:3};
 const f:Figure={id:'opaque-turn',label:'Complete circle, then turn toward partner',kind:'circle',beats:8,who:'all',amount:1,direction:'right',phaseBeats:[7,1],turnToward:'partner',exit:'progressed-neighbors',progression:true},incoming=captureSequenceBoundary(context,56.5,[]),p=compileOrderedCircleStep(f,context,incoming);
 assert.deepEqual(p.entryState,incoming);assert.equal(p.exitState.sourceBeat,64.5);assert.equal(p.exitState.relationshipEpoch,3);assert.deepEqual(p.exitState.partner,incoming.partner);assert.deepEqual(p.exitState.neighbor,incoming.neighbor);
 let winding=0,min=Infinity,speed=0;const yawAt=(id:number,t:number)=>p.facing(id,t,start);let previous=Math.atan2(start[0].position.z+2,start[0].position.x-3);
 for(let k=1;k<=224;k++){const t=k/256,q=p.position(0,t),a=Math.atan2(q.z+2,q.x-3);winding+=wrap(a-previous);previous=a;for(const id of ids){const A=p.position(id,t),B=p.position(id,t-1/256);speed=Math.max(speed,Math.hypot(A.x-B.x,A.z-B.z)*32);for(const other of ids.filter(j=>j>id)){const B=p.position(other,t);min=Math.min(min,Math.hypot(A.x-B.x,A.z-B.z));}}}
 assert.ok(Math.abs(winding+2*Math.PI)<1e-10);assert.ok(min>.6);assert.ok(speed<1.8);
 for(const id of ids){const endpoint=p.position(id,7/8),partner=start[context.relations.partner.get(id)!].position,from=yawAt(id,7/8),toward=wrap(Math.atan2(partner.x-endpoint.x,partner.z-endpoint.z)-from),delta=wrap(yawAt(id,1)-from);assert.ok(toward*delta>0&&Math.abs(toward)<Math.abs(delta));assert.ok(Math.abs(Math.abs(delta)-3*Math.PI/4)<1e-10);
  for(const t of[7/8,.9,.9375,.99,1]){assert.deepEqual(p.position(id,t),endpoint);assert.deepEqual(p.contacts(t,start),[]);assert.ok(Math.abs(wrap(yawAt(id,t)-from))<=Math.abs(delta)+1e-10);}
 }
 assert.throws(()=>compileOrderedCircleStep({...f,phaseBeats:[6,2]},context,incoming),/seven counts/);
 assert.throws(()=>compilePrimitiveFigure(f,ids,start,dancers,[1,-1]),/ordered completion/);
});
