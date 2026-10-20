import test from 'node:test';
import assert from 'node:assert/strict';
import {actualSourceEntry,contextFromBoundary,measureActiveOnesSwing,distance,wrap} from '../test-data/active-ones-swing/evidence.ts';
import {assertActiveOnesSwingFigure,compileActiveOnesSwingStep,type CurrentMinorSetRank} from './active-ones-swing-step.ts';
import {assertSequenceHandoff,ownSequenceBoundary} from './sequence-boundary.ts';
import {createDancers} from './engine.ts';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

for(const id of[1036,2141]as const)test(`${id}: real nonterminal56-count source prefix hands its current ones to one eight-count partner swing`,()=>{
 const {plan,incoming,context,producer}=actualSourceEntry(id);assertSequenceHandoff(producer.exit,plan.entryState);assertSequenceHandoff(incoming,plan.entryState);
 assert.equal(plan.entryState.sourceBeat,56);assert.equal(plan.exitState.sourceBeat,64);assert.equal(plan.exitState.relationshipEpoch,0);assert.deepEqual(plan.exitState.partner,incoming.partner);assert.deepEqual(plan.exitState.neighbor,incoming.neighbor);assert.deepEqual(plan.exitState.actors,incoming.actors);
 assert.deepEqual(plan.activePair,[0,1]);assert.deepEqual(plan.inactivePair,[2,3]);assert.deepEqual(plan.phaseBeats,[1.25,5.25,1.5]);assert.equal(plan.orbit.sourceStart,57.25);assert.equal(plan.orbit.sourceEnd,62.5);
 const byId=new Map(incoming.poses.map(p=>[p.id,p]));for(const id of plan.activePair)close(byId.get(id)!.position.z,.9);
 // Full-source long lines have across-facing yaws. Truncating at56 would
 // incorrectly trigger the old core's terminal-facing convention here.
 for(const p of incoming.poses)close(Math.abs(wrap(p.yaw)),Math.PI/2);
 for(const p of plan.exitState.poses){assert.deepEqual(p.position,byId.get(p.id)!.position);close(wrap(p.yaw-(plan.activePair.includes(p.id)?0:Math.PI)),0);}
 for(let n=0;n<=64;n++){const t=n/64;for(const id of plan.inactivePair){assert.deepEqual(plan.position(id,t),byId.get(id)!.position);if(t<=6.5/8)assert.equal(plan.facing(id,t,[]),byId.get(id)!.yaw);}}
 assert.equal(plan.inactiveConvention,'retain-actual-roots-turn-to-next-neighbors-in-final-1.5-counts');
 for(const beat of[0,.5,1,6.5,7.5,8])assert.deepEqual(plan.contacts(beat/8,[]),[]);
 for(const beat of[1.25,2,3.875,5.5,6.25]){const held=plan.contacts(beat/8,[]);assert.equal(held.length,3);assert.ok(held.every(c=>c.strength===1));assert.deepEqual(held.map(c=>c.target),['hands','back','upper-arm']);}
 close(distance(plan.position(0,1.25/8),plan.position(1,1.25/8)),.62);close(distance(plan.position(0,3.875/8),plan.position(1,3.875/8)),.62);
 for(const beat of[0,1,1.25,6.25,6.5,8])for(const actor of context.ids){const lo=Math.max(0,(beat-1e-6)/8),hi=Math.min(1,(beat+1e-6)/8);assert.ok(distance(plan.position(actor,lo),plan.position(actor,hi))<1e-5);assert.ok(Math.abs(wrap(plan.facing(actor,lo,[])-plan.facing(actor,hi,[])))<1e-5);}
 const metrics=measureActiveOnesSwing(plan);assert.ok(metrics.minimumClearance>=.62-1e-8);assert.ok(metrics.minimumActiveInactiveClearance>1.6);assert.ok(metrics.maximumSpeed<.71);assert.ok(metrics.maximumHandReach<.68);console.log(JSON.stringify({sourceId:id,...metrics}));
});

test('translated, rekeyed, re-ranked north-row ones follow the explicit epoch binding and forward direction',()=>{
 const {incoming,figure}=actualSourceEntry(2141),copy=structuredClone(incoming),mapping=new Map([[0,6],[1,3],[2,1],[3,4]]),couples=new Map([[0,7],[1,2]]),dx=3.2,dz=-4.1;
 copy.sourceBeat=137.25;copy.relationshipEpoch=9;copy.actors=copy.actors.map(a=>({...a,id:mapping.get(a.id)!,couple:couples.get(a.couple)!})).reverse();copy.poses=copy.poses.map(p=>({...p,id:mapping.get(p.id)!,position:{x:p.position.x+dx,z:p.position.z+dz},yaw:p.yaw+.23})).reverse();
 for(const relation of['partner','neighbor']as const)copy[relation]=copy[relation].map(([a,b])=>[mapping.get(a)!,mapping.get(b)!]as const).reverse();
 const rank:CurrentMinorSetRank={relationshipEpoch:9,ones:[4,1],twos:[3,6],forwardDirection:-1},dancers=createDancers(4);for(const a of copy.actors)dancers[a.id]={...dancers[a.id],...a,direction:1};
 const context=contextFromBoundary(copy,dancers,rank),plan=compileActiveOnesSwingStep({...figure,id:'unseen-rank-consumer',label:'Arbitrary current rank'},context,copy),owned=ownSequenceBoundary(copy);
 assertSequenceHandoff(owned,plan.entryState);assert.deepEqual(plan.activePair,[1,4]);assert.deepEqual(plan.inactivePair,[6,3]);assert.equal(plan.exitState.sourceBeat,145.25);assert.equal(plan.exitState.relationshipEpoch,9);close(plan.orbit.center.x,dx);close(plan.orbit.center.z,dz-.9);
 assert.deepEqual(plan.currentRank,rank);assert.ok(Object.isFrozen(plan.currentRank.ones));for(const id of plan.activePair)close(wrap(plan.facing(id,1,[])-Math.PI),0);
 for(const id of plan.inactivePair)for(const t of[0,.2,.5,.9,1])assert.deepEqual(plan.position(id,t),owned.poses.find(p=>p.id===id)!.position);
 for(const id of plan.inactivePair)close(wrap(plan.facing(id,1,[])),0);
 const rebound:CurrentMinorSetRank={relationshipEpoch:9,ones:[3,6],twos:[4,1],forwardDirection:1};assert.throws(()=>compileActiveOnesSwingStep(figure,context,copy,rebound),/conflicts/);
 const other=compileActiveOnesSwingStep(figure,{...context,minorSetRanks:undefined},copy,rebound);assert.deepEqual(other.activePair,[6,3]);assert.notDeepEqual(other.position(6,.5),plan.position(6,.5));assert.deepEqual(other.position(1,.5),owned.poses.find(p=>p.id===1)!.position);
 const down=compileActiveOnesSwingStep({...figure,exit:'face-down-line'},context,copy,rank);for(const id of down.activePair)close(wrap(down.facing(id,1,[])),0);
 measureActiveOnesSwing(plan);
});

test('current rank, raw contacts, source schema and actual geometry cannot be inferred or silently repaired',()=>{
 const {figure,incoming,context}=actualSourceEntry(2141),rank=context.minorSetRanks!;
 for(const change of[{kind:'balance'},{who:'partner'},{who:'larks'},{beats:12},{progression:false},{progression:undefined},{exit:undefined},{entry:'partners-facing-across'},{direction:'right'},{amount:1},{hands:'both'},{notation:'ones'},{confidence:'unsupported'}])assert.throws(()=>assertActiveOnesSwingFigure({...figure,...change} as any));
 for(const r of[undefined,{...rank,relationshipEpoch:1},{...rank,forwardDirection:0},{...rank,ones:[0,3],twos:[1,2]},{...rank,ones:[0,1],twos:[1,2]},{...rank,ones:[0,1,2]},{...rank,twos:[2,99]},{...rank,ignored:'no'}])assert.throws(()=>compileActiveOnesSwingStep(figure,{...context,minorSetRanks:undefined},incoming,r as any));
 assert.throws(()=>compileActiveOnesSwingStep(figure,{...context,bindingEpoch:1},incoming),/epoch/);
 const held={...incoming,heldContacts:[{a:0,b:1,handA:'left' as const,handB:'right' as const,point:{x:0,y:1.31,z:.9},strength:1e-6,kind:'joined' as const}]};assert.throws(()=>compileActiveOnesSwingStep(figure,context,held),/held contact/);
 const discontinuous=structuredClone(incoming);discontinuous.poses[0].yaw+=.1;assert.throws(()=>compileActiveOnesSwingStep(figure,context,discontinuous),/discontinuous/);
 for(const edit of[(b:any)=>b.poses[0].position.x+=.1,(b:any)=>b.poses[0].position.z+=.1,(b:any)=>b.poses.forEach((p:any)=>p.position.x*=2)]){const bad=structuredClone(incoming);edit(bad);assert.throws(()=>compileActiveOnesSwingStep(figure,contextFromBoundary(bad,context.dancers,rank),bad),/across-row/);}
 assert.throws(()=>compileActiveOnesSwingStep(figure,context,{...incoming,sourceBeat:2**53}),/source-count interval/);
});

test('owned figure/rank/boundary data and every returned sample are isolated from caller mutation',()=>{
 const {figure,incoming,context}=actualSourceEntry(2141),raw=structuredClone(incoming),rank=structuredClone(context.minorSetRanks!),f={...figure},plan=compileActiveOnesSwingStep(f,context,raw,rank),sample=()=>({p:plan.position(0,.37),yaw:plan.facing(0,.37,[]),contacts:plan.contacts(.37,[])}),before=sample();
 (f as any).beats=12;(rank.ones as number[]).reverse();(rank as any).forwardDirection=-1;raw.poses[0].position.x=99;context.start[0].yaw=99;context.dancers[0].role='robin';context.relations.partner.clear();assert.deepEqual(sample(),before);
 const returned=sample();returned.p.x=99;returned.contacts[0].point.x=99;assert.deepEqual(sample(),before);assert.ok(Object.isFrozen(plan));assert.ok(Object.isFrozen(plan.exitState.poses[0].position));assert.ok(Object.isFrozen(plan.currentRank));
 for(const method of[()=>plan.position(99,.5),()=>plan.facing(99,.5,[]),()=>plan.position(0,NaN),()=>plan.facing(0,Infinity,[]),()=>plan.contacts(NaN,[])])assert.throws(method,/outside|finite/);
 let reads=0;const hostile={...rank};Object.defineProperty(hostile,'ones',{enumerable:true,get(){reads++;return[0,1];}});assert.throws(()=>compileActiveOnesSwingStep(figure,actualSourceEntry(2141).context,incoming,hostile),/accessors/);assert.equal(reads,0);
 assert.deepEqual(plan.position(0,-1),plan.position(0,0));assert.deepEqual(plan.position(0,2),plan.position(0,1));
});
