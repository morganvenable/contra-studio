import{compileHeyExitFacing}from'./hey-exit-facing.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {compileNeutralRoleHeyStep} from './neutral-role-hey-step.ts';
import {compileNeutralFullHeyStep} from './neutral-full-hey-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff,sampleSequenceBoundary} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {createDancers,compilePrimitiveFigure} from './engine.ts';
import {compileChainFigure} from './chain.ts';
import type {Figure} from './types.ts';
import type {FigureContext} from './extended-figures.ts';

const figure=(amount:.5|1=.5,neighbor=false):Figure=>({id:'neutral-role-hey',label:'Explicit role-first hey',kind:'hey',beats:amount*16,amount,who:neighbor?'neighbor':'partner',heyStartRole:neighbor?'lark':'robin',centerShoulder:neighbor?'left':'right',endShoulder:neighbor?'right':'left',entry:'paired-sidelines',exit:(amount===.5?'opposite-slots-facing-across':'same-slots-facing-across') as Figure['exit']});
const context=(neighbor=false,width=.9,depth=.55):FigureContext=>({ids:[0,1,2,3],dancers:createDancers(2),start:(neighbor?[[1,1],[-1,1],[-1,-1],[1,-1]]:[[-1,-1],[-1,1],[1,1],[1,-1]]).map(([x,z],id)=>({id,position:{x:x*width,z:z*depth},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'hey'})),relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:7});
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);

test('bounded exit facing preserves roots, actual final pass and defaults',()=>{
 const c=context(true,.64,.64),f=figure(.5,true),b=captureSequenceBoundary(c,24,[]),old=compileNeutralRoleHeyStep(f,c,b),next=compileNeutralRoleHeyStep(f,c,b,{boundedExitFacing:true}),proof=compileHeyExitFacing(old.heyPlan);
 assert.equal(proof.start,6.5);assert.ok(proof.maximumExitYawRate<=3.2);assert.deepEqual(old.heyPlan.gates,next.heyPlan.gates);assert.deepEqual({...old.exitState,poses:[]},{...next.exitState,poses:[]});for(const p of old.exitState.poses){const q=next.exitState.poses.find(q=>q.id===p.id)!;assert.deepEqual(p.position,q.position);assert.ok(turn(p.yaw,q.yaw)<1e-12);}
 for(let tick=0;tick<=1024;tick++){const t=tick/1024;for(const id of c.ids){assert.deepEqual(old.position(id,t),next.position(id,t));if(t*8<=6.5)assert.equal(old.facing(id,t,c.start),next.facing(id,t,c.start));}}
 for(const id of c.ids){const h=1e-6,a=next.facing(id,(6.5-h)/8,c.start),b=next.facing(id,6.5/8,c.start),d=next.facing(id,(6.5+h)/8,c.start);assert.ok(turn(a,b)<4*h);assert.ok(Math.abs((d-b)/h-(b-a)/h)<1e-4);assert.ok(turn(next.facing(id,1,c.start),old.facing(id,1,c.start))<1e-10);}
 for(const bad of[{}, {boundedExitFacing:false}, {boundedExitFacing:true,extra:1},null])assert.throws(()=>compileNeutralRoleHeyStep(f,c,b,bad as any),/facing option/);
 assert.throws(()=>compileHeyExitFacing(old.heyPlan,4),/reviewed turning bound/);
});
