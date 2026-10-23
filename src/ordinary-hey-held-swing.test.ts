import test from 'node:test';
import assert from 'node:assert/strict';
import {compileOrdinaryFullHeyHandoff} from './ordinary-hey-handoff.ts';
import {assertFormationHandoff,assertSuccessorEntry,captureFormationState,sampleFormationEndpoint} from './formation-handoff.ts';
import {createDancers,compilePrimitiveFigure} from './engine.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure,Pose} from './types.ts';
const f=(swing=false):Figure=>({id:'ordinary-full',label:'robins full hey',kind:'hey',beats:16,amount:1,who:'partner',heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',entry:'paired-sidelines',exit:swing?'same-person-swing':'same-slots-partner-balance'});
const context=(swing=false):FigureContext=>({ids:[0,1,2,3],dancers:createDancers(2),start:[[-.9,-.55],[-.9,.55],[.9,.55],[.9,-.55]].map(([x,z],id)=>({id,position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'hey'})),relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:7,next:{id:'next',label:'partner successor',kind:swing?'swing':'balance',beats:swing?16:4,who:'partner'}});
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
test('compact full Lark hey carries the exact partner frame into sixteen-count swing and owns options',()=>{
 const c=context(true);for(const p of c.start){p.position.x=Math.sign(p.position.x)*.64;p.position.z=Math.sign(p.position.z)*.64;}
 const figure={...f(true),heyStartRole:'lark' as const,centerShoulder:'left' as const,endShoulder:'right' as const},options:{halfWidth:.64;swingHands?:'acquire'}={halfWidth:.64,swingHands:'acquire'},plan=compileOrdinaryFullHeyHandoff(figure,c,32,options as any);
 assert.equal(plan.heyPlan.events.length,8);assert.equal(plan.heyPlan.events.reduce((n,e)=>n+e.pairs.length,0),12);assert.equal(plan.exitState.sourceBeat,48);
 const sample=(t:number)=>{const poses=c.start.map(p=>({...p,position:plan.position(p.id,t),yaw:plan.facing(p.id,t,c.start)}));return{poses,contacts:plan.contacts(t,poses)};},before=[.9,.99,1].map(sample);delete options.swingHands;assert.deepEqual([.9,.99,1].map(sample),before);
 assert.equal(sample(15.75/16).contacts.length,0);assert.equal(sample(1).contacts.length,6);assert.ok(sample(1).contacts.every(h=>h.strength===1));
 const terminal=sample(1).poses,successor=compilePrimitiveFigure(c.next!,c.ids,terminal,c.dancers,[],{swingEntry:'prepared-circle',canonicalSwingLayout:true,geometry:{halfWidth:.64,rowGap:1.28}});assertSuccessorEntry(plan.exitState,{...c,start:terminal},successor);
 for(const bad of[{},null,{halfWidth:.64,swingHands:'acquire',balanceHands:'acquire'},{halfWidth:.64,swingHands:'acquire',extra:1}])assert.throws(()=>compileOrdinaryFullHeyHandoff(figure,c,32,bad as any));
});
