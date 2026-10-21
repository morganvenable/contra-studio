import test from 'node:test';
import assert from 'node:assert/strict';
import {createDancers,initialPoses} from './engine.ts';
import {compileCarriedLinesRollawayStep} from './carried-lines-rollaway-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure} from './types.ts';
const figure:Figure={id:'arbitrary',label:'Forward and return',kind:'long-lines-rollaway',beats:8,who:'all',rollRole:'robin',sashayRole:'lark',rollRelation:'neighbor',rollDirection:'left-to-right',rollPhase:'return',rollHalfSashay:true,phaseBeats:[4,4]};
function setup(){const dancers=createDancers(2),start=initialPoses(dancers),context:FigureContext={dancers,start,ids:[0,1,2,3],relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:7};return{context,boundary:captureSequenceBoundary(context,12,[])};}
test('carried forward/return works in translated rotated opaque actor frame without mutable aliases',()=>{
 const base=setup(),a=compileCarriedLinesRollawayStep(figure,base.context,base.boundary),map=new Map([[0,8],[1,3],[2,10],[3,5]]),theta=.37,rotate=(p:{x:number;z:number})=>({x:4+p.x*Math.cos(theta)+p.z*Math.sin(theta),z:-3-p.x*Math.sin(theta)+p.z*Math.cos(theta)}),dancers=createDancers(6),start=initialPoses(dancers);
 for(const p of base.boundary.poses){const id=map.get(p.id)!;dancers[id]={...base.context.dancers[p.id],id,couple:20+base.context.dancers[p.id].couple};start[id]={...base.context.start[p.id],id,position:rotate(p.position),yaw:p.yaw+theta};}
 const remap=(r:Map<number,number>)=>new Map([...r].map(([a,b])=>[map.get(a)!,map.get(b)!])),context:FigureContext={dancers,start,ids:[10,5,8,3],relations:{epoch:7,partner:remap(base.context.relations.partner as Map<number,number>),neighbor:remap(base.context.relations.neighbor as Map<number,number>)},bindingEpoch:7},boundary=captureSequenceBoundary(context,12,[]),p=compileCarriedLinesRollawayStep(figure,context,boundary);assertSequenceHandoff(boundary,p.entryState);
 for(let k=0;k<=160;k++)for(const[id,other]of map){const expected=rotate(a.position(id,k/160)),actual=p.position(other,k/160);assert.ok(Math.hypot(actual.x-expected.x,actual.z-expected.z)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(p.facing(other,k/160,[])-a.facing(id,k/160,[])-theta),Math.cos(p.facing(other,k/160,[])-a.facing(id,k/160,[])-theta)))<1e-8);}
 const before=p.position(8,.25);context.start[8].position.x+=30;context.start[8].yaw+=1;assert.deepEqual(p.position(8,.25),before);assert.equal(p.exitState.sourceBeat,20);assert.equal(p.exitState.relationshipEpoch,7);
});
test('carried forward/return rejects stale contacts, wrong named side, timing and topology',()=>{
 const{context,boundary}=setup();for(const patch of[{beats:7},{phaseBeats:[3,5]},{rollDirection:'right-to-left'},{rollHalfSashay:false},{amount:1},{rollRelation:'shadow'}])assert.throws(()=>compileCarriedLinesRollawayStep({...figure,...patch} as Figure,context,boundary));
 assert.throws(()=>compileCarriedLinesRollawayStep(figure,{...context,bindingEpoch:6},boundary));
 assert.throws(()=>compileCarriedLinesRollawayStep(figure,context,{...boundary,heldContacts:[{a:0,b:3,handA:'left',handB:'right',kind:'joined',point:{x:.9,y:1.2,z:0},strength:.5}]}),/released entry/);
 const backwards=structuredClone(context);backwards.start[0].yaw=Math.PI/2;const bad=captureSequenceBoundary(backwards,12,[]);assert.throws(()=>compileCarriedLinesRollawayStep(figure,backwards,bad),/quarter-turn/);
});

