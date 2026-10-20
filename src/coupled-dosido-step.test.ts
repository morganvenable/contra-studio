import test from 'node:test';
import assert from 'node:assert/strict';
import {coupledDosidoFigure,coupledDosidoProducer,ordinaryCoupledContext,measureCoupledDosido,collectCoupledDosidoEvidence} from '../test-data/coupled-dosido/evidence.ts';
import {compileCoupledDosidoStep,assertCoupledDosidoFigure} from './coupled-dosido-step.ts';
import {assertSequenceHandoff,captureSequenceBoundary} from './sequence-boundary.ts';
import {compilePrimitiveFigure,createDancers,initialPoses} from './engine.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {distance,turn} from './ring-twirl-contract.ts';
import type {Figure} from './types.ts';

for(const sourceId of [624,1702] as const)test(`actual ${sourceId} producer retains all roots, released hands, units, source clocks and literal gates`,()=>{
 const {plan,boundary}=coupledDosidoProducer(sourceId),packet=collectCoupledDosidoEvidence(sourceId);assert.deepEqual(plan.entryState,boundary);assert.equal(plan.exitState.sourceBeat,boundary.sourceBeat+8);assert.deepEqual(plan.exitState.actors,boundary.actors);assert.deepEqual(plan.exitState.partner,boundary.partner);assert.deepEqual(plan.exitState.neighbor,boundary.neighbor);assert.equal(plan.exitState.relationshipEpoch,boundary.relationshipEpoch);assert.deepEqual(plan.exitState.heldContacts,[]);assert.deepEqual(plan.phaseBeats,[1,7]);assert.equal(plan.orbit.sourceStart,boundary.sourceBeat);assert.equal(plan.orbit.sourceEnd,boundary.sourceBeat+8);assert.ok(Math.abs(plan.orbit.laneRadius-1.24)<1e-12);assert.ok(Math.abs(packet.metrics.minimumClearance-.68)<1e-12);
 assert.deepEqual(plan.gates.map(g=>g.kind),['robins-right-shoulder','backs-pass','larks-left-shoulder','full-return']);
 for(const p of boundary.poses){assert.deepEqual(plan.position(p.id,0),p.position);assert.deepEqual(plan.position(p.id,1),p.position);assert.equal(plan.facing(p.id,0,[]),p.yaw);assert.ok(distance(plan.position(p.id,.05),p.position)>0,'root translation begins during orientation');}
 for(const gate of plan.gates){const t=(gate.sourceBeat-boundary.sourceBeat)/8;for(const p of gate.poses){assert.ok(distance(plan.position(p.id,t),p.position)<1e-12);assert.ok(Math.abs(turn(plan.facing(p.id,t,[]),p.yaw))<1e-12);}}
 for(const [index,role,sign]of [[0,'robin',1],[2,'lark',-1]] as const){const gate=plan.gates[index];assert.ok(gate.sourceBeat>boundary.sourceBeat+1);assert.deepEqual(gate.namedActors.map(id=>boundary.actors.find(a=>a.id===id)!.role),[role,role]);for(const p of gate.poses.filter(p=>gate.namedActors.includes(p.id))){const q=gate.poses.find(q=>gate.namedActors.includes(q.id)&&q.id!==p.id)!,dx=q.position.x-p.position.x,dz=q.position.z-p.position.z;assert.ok(Math.abs(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))<1e-12);assert.ok(sign*(-dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw))>.679999999);}}
 for(const unit of plan.namedUnits){const yaw=unit.facing;for(const id of unit.ids)for(const t of [.125,.2,.5,.9,1])assert.ok(Math.abs(turn(plan.facing(id,t,[]),yaw))<1e-12);}
 if(sourceId===624)assert.ok(packet.metrics.maximumYawRate>1);else assert.equal(packet.metrics.maximumYawRate,0);
});

test('translated rotated reordered arbitrary IDs consume measured offsets and a new producer without identity or width normalization',()=>{
 const context=ordinaryCoupledContext(),ids=[17,4,31,9],dancers=createDancers(16),start=initialPoses(dancers),theta=.31,rotate=(x:number,z:number)=>({x:4.25+x*Math.cos(theta)-z*Math.sin(theta),z:-3.5+x*Math.sin(theta)+z*Math.cos(theta)});
 for(let i=0;i<4;i++){const id=ids[i],original=context.start[i];dancers[id]={...context.dancers[i],id,couple:20+Math.floor(i/2)};start[id]={...original,id,position:rotate(original.position.x*.78/.9,original.position.z*.82/.9),yaw:original.yaw-theta+.27};}
 context.ids=[ids[3],ids[0],ids[2],ids[1]];context.start=start;context.dancers=dancers;context.bindingEpoch=13;context.relations={epoch:13,partner:new Map([[17,4],[4,17],[31,9],[9,31]]),neighbor:new Map([[17,9],[9,17],[4,31],[31,4]])};
 const producerFigure:Figure={id:'different-producer',label:'Long lines forward and back',kind:'long-lines',who:'all',beats:8},producer=compilePrimitiveFigure(producerFigure,context.ids,context.start,context.dancers,[]);context.start=sampleFormationEndpoint(context,producer,1);
 const incoming=captureSequenceBoundary(context,45.5,producer.contacts(1,context.start)),renamed={...coupledDosidoFigure,id:'opaque-new-call',label:'Unseen local wording'},plan=compileCoupledDosidoStep(renamed,context,incoming);assertSequenceHandoff(plan.entryState,incoming);assert.equal(plan.exitState.sourceBeat,53.5);assert.equal(plan.exitState.relationshipEpoch,13);assert.ok(Math.abs(plan.orbit.halfWidth-.78)<1e-12);assert.ok(Math.abs(plan.orbit.halfDepth-.82)<1e-12);measureCoupledDosido(plan);
 for(const next of[undefined,{id:'unknown-successor',kind:'unknown',label:'Opaque future',beats:3} as Figure]){const other=compileCoupledDosidoStep(renamed,{...context,next},incoming);assert.deepEqual(other.gates,plan.gates);assert.deepEqual(other.exitState,plan.exitState);}
 for(const p of incoming.poses)assert.deepEqual(plan.exitState.poses.find(q=>q.id===p.id)!.position,p.position);
 // The return is consumed by a different ordinary successor without reshaping.
 const received={...context,start:sampleFormationEndpoint(context,plan,1)},ordinary:Figure={id:'ordinary-next',label:'Neighbors do si do',kind:'do-si-do',who:'neighbor',direction:'right',amount:1,beats:8},successor=compilePrimitiveFigure(ordinary,received.ids,received.start,received.dancers,[]);
 assertSequenceHandoff(plan.exitState,captureSequenceBoundary(received,53.5,successor.contacts(0,received.start)));
});

test('continuous all-root certificate includes interior minima, rather than treating couples as points',()=>{
 for(const halfWidth of[.65,.9,1.2])for(const halfDepth of[.65,.9,1.1]){
  const context=ordinaryCoupledContext();for(const p of context.start){p.position.x*=halfWidth/.9;p.position.z*=halfDepth/.9;}const boundary=captureSequenceBoundary(context,0,[]);
  const plan=compileCoupledDosidoStep(coupledDosidoFigure,context,boundary);measureCoupledDosido(plan);
  // This low-depth, wide-unit corner has a closer interior encounter than
  // its .68 shoulder gate; the continuous certificate must expose it.
  if(halfWidth===1.2&&halfDepth===.65)assert.ok(plan.minimumClearanceBound<.67);
  const [a,b]=plan.clearanceWitness.actors,target=plan.clearanceWitness.angle/ (2*Math.PI);let lo=0,hi=1;for(let n=0;n<55;n++){const t=(lo+hi)/2,r=.12,u=t<r?t/r:0,v=t>1-r?(1-t)/r:0,p=t<r?r*(u*u*u-.5*u*u*u*u)/(1-r):t>1-r?1-r*(v*v*v-.5*v*v*v*v)/(1-r):(t-r/2)/(1-r);if(p<target)lo=t;else hi=t;}
  assert.ok(Math.abs(distance(plan.position(a,(lo+hi)/2),plan.position(b,(lo+hi)/2))-plan.minimumClearanceBound)<1e-10);
 }
});

test('held, stale, incompatible unit binding, ambiguous figure and unsupported modifiers fail closed',()=>{
 const {context,boundary}=coupledDosidoProducer(1702);
 for(const changed of[{kind:'do-si-do'},{who:'partner'},{unitRelation:'neighbor'},{unitHold:'inside-hand'},{passingShoulder:'left'},{facing:'orbit'},{amount:.5},{amount:1.5},{beats:7},{beats:16},{progression:true},{entry:'facing-couples-across'},{exit:'partners-facing-across'},{hands:'both'},{direction:'right'},{phaseBeats:[1,7]},{confidence:'unsupported'}])assert.throws(()=>assertCoupledDosidoFigure({...coupledDosidoFigure,...changed} as Figure));
 assert.throws(()=>compileCoupledDosidoStep(coupledDosidoFigure,{...context,bindingEpoch:1},boundary),/epoch/);
 const held={...boundary,heldContacts:[{a:0,b:1,handA:'left' as const,handB:'right' as const,kind:'joined' as const,point:{x:0,y:1,z:-.9},strength:5e-8}]};assert.throws(()=>compileCoupledDosidoStep(coupledDosidoFigure,context,held),/held contact/);
 assert.throws(()=>compileCoupledDosidoStep(coupledDosidoFigure,context,{...boundary,sourceBeat:2**53}),/source-count/);
 const changed=ordinaryCoupledContext();[changed.start[1].position,changed.start[3].position]=[changed.start[3].position,changed.start[1].position];assert.throws(()=>compileCoupledDosidoStep(coupledDosidoFigure,changed,captureSequenceBoundary(changed,0,[])),/partner units/);
 const reversed=ordinaryCoupledContext();for(const pair of[[0,1],[2,3]])[reversed.start[pair[0]].position,reversed.start[pair[1]].position]=[reversed.start[pair[1]].position,reversed.start[pair[0]].position];assert.throws(()=>compileCoupledDosidoStep(coupledDosidoFigure,reversed,captureSequenceBoundary(reversed,0,[])),/actual lark left/);
 const moved=structuredClone(boundary);moved.poses[0].position.x+=.01;assert.throws(()=>compileCoupledDosidoStep(coupledDosidoFigure,context,moved),/discontinuous root/);
});

test('owned snapshots reject accessors and isolate inputs, output samples and the old individual path',()=>{
 const context=ordinaryCoupledContext(),boundary=captureSequenceBoundary(context,0,[]),individual:Figure={id:'individual',kind:'do-si-do',label:'ordinary',who:'neighbor',direction:'right',amount:1,beats:8},old=compilePrimitiveFigure(individual,context.ids,context.start,context.dancers,[1,-1]),sample=()=>Array.from({length:17},(_,n)=>context.ids.map(id=>({position:old.position(id,n/16),yaw:old.facing(id,n/16,context.start)}))),prior=sample();
 let reads=0;const accessor={...coupledDosidoFigure};Object.defineProperty(accessor,'unitHold',{enumerable:true,get(){reads++;return'released';}});assert.throws(()=>compileCoupledDosidoStep(accessor,context,boundary),/accessors/);assert.equal(reads,0);
 const mutable=structuredClone(boundary),figure={...coupledDosidoFigure},plan=compileCoupledDosidoStep(figure,context,mutable),before=plan.position(0,.42);assert.deepEqual(sample(),prior);mutable.poses[0].position.x=999;figure.amount=.5;context.start[0].position.z=999;context.relations.partner.clear();assert.deepEqual(plan.position(0,.42),before);const output=plan.position(0,.42);output.x=777;assert.deepEqual(plan.position(0,.42),before);assert.ok(Object.isFrozen(plan.namedUnits[0].offsets[0].offset));assert.ok(Object.isFrozen(plan.gates[0].poses));assert.ok(Object.isFrozen(plan.exitState.poses));assert.throws(()=>plan.position(999,.5),/outside/);assert.throws(()=>plan.facing(999,.5,[]),/outside/);assert.throws(()=>plan.position(0,NaN),/finite/);assert.throws(()=>plan.contacts(Infinity,[]),/finite/);
});
