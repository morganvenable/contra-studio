import test from 'node:test';import assert from 'node:assert/strict';
import {compileEventSection} from './event-section.ts';import {bindActorGroups} from './progression-topology.ts';import {createDancers} from './engine.ts';
import type {Pose,Figure} from './types.ts';
const dancers=createDancers(3),initial:Pose[]=dancers.map(d=>({id:d.id,position:{x:d.id%2?1:-1,z:d.couple*2},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
const binding=bindActorGroups(dancers,{epoch:4,groups:[{id:'explicit-six',actors:[0,1,2,3,4,5]}],neighborPairs:[[0,3],[1,4],[2,5]],waitingIds:[]});
const figure=(id:string,beats:number):Figure=>({id,beats,kind:'long-lines',label:'Synthetic six-person composition test',who:'all'});
const evidence={sourceId:'synthetic-test',url:'https://example.invalid/synthetic-test',clause:'Synthetic clock and grouping test, not a source dance',basis:'reviewed-interpretation' as const};
const still=(context:any)=>({position:(id:number)=>({...context.start[id].position}),facing:(id:number)=>context.start[id].yaw,contacts:()=>[]});
test('section clock supports six-person groups and a late explicit relation epoch in a96-beat source budget',()=>{
 const change={id:'late-epoch',beat:72,expectedEpoch:4,groups:binding.groups,neighborPairs:[[0,5],[1,2],[3,4]] as [number,number][],waitingIds:[],evidence};
 const section=compileEventSection({dancers,initial,binding,totalBeats:96,steps:[{figure:figure('first',40),compile:still},{figure:figure('second',32),compile:still},{figure:figure('third',24),before:{change,expected:initial},compile:still}]});
 assert.equal(section.bindingAt(71.99).epoch,4);assert.equal(section.bindingAt(72).epoch,5);assert.equal(section.bindingAt(72).relations.neighbor.get(0),5);assert.equal(section.sample(95).poses.length,6);assert.deepEqual(section.sample(95).poses.map(p=>p.position),initial.map(p=>p.position));assert.deepEqual(section.sample(10),section.sample(10));assert.throws(()=>section.sample(97),/source section/);
});
test('section rejects silent entry resets, inactive actors in contacts and source-clock overrun',()=>{
 assert.throws(()=>compileEventSection({dancers,initial,binding,totalBeats:8,steps:[{figure:figure('wrong',8),compile(context){return{...still(context),position:(id:number)=>({...context.start[id].position,x:context.start[id].position.x+.1})};}}]}),/discontinuous entry/);
 const outBinding=bindActorGroups(dancers,{epoch:0,groups:[{id:'four',actors:[0,1,2,3]}],neighborPairs:[[0,3],[1,2]],waitingIds:[4,5]});
 assert.throws(()=>compileEventSection({dancers,initial,binding:outBinding,totalBeats:8,steps:[{figure:figure('wrong',8),compile(context){return{...still(context),contacts:()=>[{a:0,b:4,handA:'left' as const,handB:'right' as const,kind:'joined' as const,point:{x:0,y:1,z:0},strength:1}]};}}]}),/unbound waiting actor/);
 assert.throws(()=>compileEventSection({dancers,initial,binding,totalBeats:8,steps:[{figure:figure('wrong',7),compile:still}]}),/exactly fill/);
});
test('event sections preserve declared plan balance and hand-frame preparation cues without leaking them into later figures',()=>{
 const cue={progress:.4,otherId:3,forwardWeight:.2,counterWeight:.3,midpointPulse:0};
 const preparation={contacts:[{a:0,b:3,handA:'left' as const,handB:'right' as const,kind:'swing-frame' as const,point:{x:0,y:1.2,z:0},strength:1}],strength:.5};
 const section=compileEventSection({dancers,initial,binding,totalBeats:8,steps:[{figure:figure('cued',4),compile(context){return{...still(context),balance:()=>cue,swingPreparation:()=>preparation};}},{figure:figure('uncued',4),compile:still}]});
 assert.deepEqual(section.sample(2).poses[0].balance,cue);assert.deepEqual(section.sample(2).poses[0].swingPreparation,preparation);
 assert.equal(section.sample(6).poses[0].balance,undefined);assert.equal(section.sample(6).poses[0].swingPreparation,undefined);
});
