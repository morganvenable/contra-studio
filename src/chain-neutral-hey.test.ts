import test from 'node:test';
import assert from 'node:assert/strict';
import {compileChainFigure,type ChainContext} from './chain.ts';
import {createDancers} from './engine.ts';
import type {Figure} from './types.ts';
const partner=new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor=new Map([[0,3],[3,0],[1,2],[2,1]]);
const chain:Figure={id:'chain',kind:'robins-chain',label:'Chain',beats:8,who:'partner'};
function context():ChainContext{
 return {ids:[0,1,2,3],dancers:createDancers(2),bindingEpoch:7,relations:{epoch:7,partner,neighbor},
  start:[[.9,.9],[-.9,.9],[-.9,-.9],[.9,-.9]].map(([x,z],id)=>({id,position:{x,z},yaw:x>0?-Math.PI/2:Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}))};
}
function hey(exit:Figure['exit'],amount:number):Figure{return{id:'hey',label:'Hey',kind:'hey',beats:amount*16,who:'partner',amount,heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',entry:'paired-sidelines',exit};}
test('neutral half/full hey successors preserve the unprepared chain path and actual stations',()=>{
 const c=context(),ordinary=compileChainFigure(chain,c);
 for(const next of [hey('opposite-slots-facing-across',.5),hey('same-slots-facing-across',1)]){
  const plan=compileChainFigure(chain,{...c,next});
  for(let sample=0;sample<=64;sample++)for(const id of c.ids){
   const t=sample/64;
   assert.deepEqual(plan.position(id,t),ordinary.position(id,t));
   assert.equal(plan.facing(id,t),ordinary.facing(id,t));
  }
  for(const id of c.ids){const mate=partner.get(id)!;
   assert.ok(Math.abs(Math.hypot(plan.position(id,1).x-plan.position(mate,1).x,plan.position(id,1).z-plan.position(mate,1).z)-1.8)<1e-10);
  }
 }
});
test('legacy prepared hey exits retain their compact chain spacing',()=>{
 const c=context();
 for(const next of [hey('opposite-paired-balance',.5),hey('same-slots-partner-balance',1)]){
  const plan=compileChainFigure(chain,{...c,next});
  for(const id of c.ids){const mate=partner.get(id)!;
   assert.ok(Math.abs(Math.hypot(plan.position(id,1).x-plan.position(mate,1).x,plan.position(id,1).z-plan.position(mate,1).z)-1.1)<1e-10);
  }
 }
});
