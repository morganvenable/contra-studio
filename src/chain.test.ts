import test from 'node:test';import assert from 'node:assert/strict';import {compileChain,type ChainContext}from'./chain.ts';import {createDancers}from'./engine.ts';import type {Pose}from'./types.ts';
const close=(a:{x:number;z:number},b:{x:number;z:number})=>assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<1e-8);
const actors=createDancers(2),pair=new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor=new Map([[0,3],[3,0],[1,2],[2,1]]);
function context(partner:boolean):ChainContext{const points=partner?[[.9,.9],[-.9,.9],[-.9,-.9],[.9,-.9]]:[[.9,.9],[.9,-.9],[-.9,-.9],[-.9,.9]];return{ids:[0,1,2,3],dancers:actors,bindingEpoch:7,relations:{epoch:7,partner:pair,neighbor},start:points.map(([x,z],id)=>({id,position:{x,z},yaw:x>0?-Math.PI/2:Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}))};}
for(const receiver of ['partner','neighbor']as const)test(`${receiver} chain honors actual receiving identity and complete courtesy frame`,()=>{const ctx=context(receiver==='partner'),p=compileChain(ctx,{receiver,hand:'right',courtesy:'left-front-right-waist'});assert.equal(p.epoch,7);for(const r of [1,3])assert.equal(p.receivers.get(r),ctx.relations[receiver].get(r));for(const id of [0,2])close(p.position(id,1),ctx.start[id].position);close(p.position(1,1),ctx.start[3].position);close(p.position(3,1),ctx.start[1].position);let min=Infinity;for(let t=0;t<=1;t+=.002){const ps=ctx.start.map(pose=>({...pose,position:p.position(pose.id,t),yaw:p.facing(pose.id,t)}));for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)min=Math.min(min,Math.hypot(ps[i].position.x-ps[j].position.x,ps[i].position.z-ps[j].position.z));if(t>.58&&t<.78){const holds=p.contacts(t,ps);assert.equal(holds.length,4);for(const h of holds){assert.equal(ctx.relations[receiver].get(h.b),h.a);assert.equal(h.handA,h.handB);}}}assert.ok(min>.5,`Minimum torso clearance ${min}`);});
test('wrong relation and stale invalid binding cannot silently choose the closest person',()=>{assert.throws(()=>compileChain(context(false),{receiver:'partner',hand:'right',courtesy:'left-front-right-waist'}),/arrival-side/);const ctx=context(true);ctx.relations={...ctx.relations,partner:neighbor};assert.throws(()=>compileChain(ctx,{receiver:'partner',hand:'right',courtesy:'left-front-right-waist'}),/arrival-side|identity/);});

test('the caller must supply the current topology epoch explicitly',()=>{const ctx=context(true);ctx.bindingEpoch=8;assert.throws(()=>compileChain(ctx,{receiver:'partner',hand:'right',courtesy:'left-front-right-waist'}),/stale/);});
test('reciprocal relationships and conventional courtesy role order are required',()=>{
  const conflicting=context(false);
  conflicting.relations={...conflicting.relations,neighbor:new Map([[1,2],[3,0],[0,1],[2,3]])};
  assert.throws(()=>compileChain(conflicting,{receiver:'neighbor',hand:'right',courtesy:'left-front-right-waist'}),/reciprocal|relationship|identity/);
  const reflected=context(true);reflected.start=reflected.start.map(p=>({...p,position:{x:p.position.x,z:-p.position.z}}));
  assert.throws(()=>compileChain(reflected,{receiver:'partner',hand:'right',courtesy:'left-front-right-waist'}),/role|conventional|arky/);
});

test('compiled chain owns identities and never exposes mutable receiver state',()=>{
 const ctx=context(true);ctx.ids=[...ctx.ids];ctx.dancers=ctx.dancers.map(d=>({...d}));ctx.start=ctx.start.map(p=>({...p,position:{...p.position}}));ctx.relations={...ctx.relations,partner:new Map(ctx.relations.partner),neighbor:new Map(ctx.relations.neighbor)};
 const plan=compileChain(ctx,{receiver:'partner',hand:'right',courtesy:'left-front-right-waist'}),before=plan.position(1,.75),facing=plan.facing(1,.75);
 (ctx.ids as number[])[1]=999;(ctx.dancers[1] as any).role='lark';ctx.start[1].position.x=999;(ctx.relations.partner as Map<number,number>).set(1,2);
 assert.deepEqual(plan.position(1,.75),before);assert.equal(plan.facing(1,.75),facing);assert.equal(plan.receivers.get(1),0);
 assert.equal(typeof (plan.receivers as any).set,'undefined');assert.throws(()=>Object.defineProperty(plan.receivers,'get',{value:()=>999}));assert.deepEqual([...plan.receivers],[[1,0],[3,2]]);
});
