import test from 'node:test';
import assert from 'node:assert/strict';
import {createDancers,compilePrimitiveFigure} from './engine.ts';
import {compileReleasedCircleStep} from './released-circle-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff,sampleSequenceBoundary} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure} from './types.ts';
function fixture(){
 const dancers=createDancers(2),start=[[-.64,.64],[.64,.64],[.64,-.64],[-.64,-.64]].map(([x,z],id)=>({id,position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'swing'}));
 const next:Figure={id:'next',label:'Partner swing',kind:'swing',beats:8,who:'partner'};
 const context:FigureContext={ids:[0,1,2,3],start,dancers,bindingEpoch:2,relations:{epoch:2,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},next};
 const figure:Figure={id:'circle',label:'Circle left',kind:'circle',beats:8,who:'all',direction:'left',amount:.75};
 return{context,figure,incoming:captureSequenceBoundary(context,32,[])};
}
test('released circle carries across-facing entry and reaches its prepared swing before frame acquisition',()=>{
 const {context,figure,incoming}=fixture(),p=compileReleasedCircleStep(figure,context,incoming);
 const kernel=compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,[1,-1],{circleExit:'partner'});
 assertSequenceHandoff(incoming,p.entryState);assert.equal(p.exitState.sourceBeat,40);
 assert.equal(p.exitState.relationshipEpoch,2);assert.deepEqual(p.exitState.partner,incoming.partner);
 for(let i=0;i<=44;i++)for(const id of context.ids)assert.deepEqual(p.position(id,i/64),kernel.position(id,i/64));
 for(const id of context.ids)assert.deepEqual(p.position(id,7.5/8),kernel.position(id,1));
 assert.deepEqual(p.contacts(6/8,context.start),[]);
 for(const id of context.ids)assert.equal(p.facing(id,1,context.start),kernel.facing(id,1,context.start));
 const next={...context,start:context.start.map(q=>({...q,position:{...p.exitState.poses.find(e=>e.id===q.id)!.position},yaw:p.exitState.poses.find(e=>e.id===q.id)!.yaw}))};
 const swing=compilePrimitiveFigure(context.next!,next.ids,next.start,next.dancers,[1,-1],{swingEntry:'prepared-circle'});
 assertSequenceHandoff(p.exitState,sampleSequenceBoundary(next,swing,40,0));
 const before=p.facing(0,.05,context.start);context.start[0].yaw+=1;context.ids.length=0;assert.equal(p.facing(0,.05,next.start),before);
});
test('narrow incoming pairs reject rather than contract into a collision',()=>{
 const {context,figure}=fixture();context.start.forEach(p=>p.position.z=Math.sign(p.position.z)*.31);
 assert.throws(()=>compileReleasedCircleStep(figure,context,captureSequenceBoundary(context,32,[])),/clearance/);
});
test('released circle refuses held contacts, hidden modifiers and unsupported source counts',()=>{
 const {context,figure,incoming}=fixture();
 assert.throws(()=>compileReleasedCircleStep({...figure,beats:4},context,incoming));
 assert.throws(()=>compileReleasedCircleStep({...figure,unconsumed:true} as Figure,context,incoming));
 assert.throws(()=>compileReleasedCircleStep(figure,context,{...incoming,heldContacts:[{a:0,b:3,handA:'right',handB:'left',kind:'joined',strength:1,point:{x:-.64,y:1.24,z:0}}]}));
 const p=compileReleasedCircleStep(figure,context,incoming);assert.throws(()=>p.position(99,0));assert.throws(()=>p.facing(0,NaN,context.start));
});
