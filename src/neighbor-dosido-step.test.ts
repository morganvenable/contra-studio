import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileNeighborDosidoStep,assertNeighborDosidoFigure,type NeighborDosidoPlan} from './neighbor-dosido-step.ts';
import {compileProgressingDoSiDoFigure} from './double-progression-figures.ts';
import {compileStateCarryingCore,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {captureSequenceBoundary,assertSequenceHandoff,ownSequenceBoundary,type SequenceBoundary} from './sequence-boundary.ts';
import {distance,heading,turn} from './ring-twirl-contract.ts';
import type {Figure,Pose,Dancer,Vec2,Dance} from './types.ts';
import type {FigureContext} from './extended-figures.ts';

const packet=JSON.parse(readFileSync(new URL('../test-data/neighbor-dosido/measured-ingress.json',import.meta.url),'utf8')) as {records:{sourceId:string;prefixFigures:Figure[];entry:SequenceBoundary}[]};
const figure:Figure={id:'named-passage',label:'Current neighbors do-si-do 1½',kind:'do-si-do',who:'neighbor',direction:'right',amount:1.5,beats:8,progression:true,exit:'progressed-neighbors'};
function contextFromBoundary(boundary:SequenceBoundary):FigureContext {
 const dancers:Dancer[]=[],start:Pose[]=[];
 for(const a of boundary.actors){dancers[a.id]={...a,name:`Actor ${a.id}`,direction:1,color:'#555'};const p=boundary.poses.find(p=>p.id===a.id)!;start[a.id]={id:a.id,position:{...p.position},yaw:p.yaw,stride:0,lean:0,bounce:0,turn:0,activity:'circle'};}
 return{ids:boundary.actors.map(a=>a.id),dancers,start,bindingEpoch:boundary.relationshipEpoch,relations:{epoch:boundary.relationshipEpoch,partner:new Map(boundary.partner),neighbor:new Map(boundary.neighbor)}};
}
function measure(plan:NeighborDosidoPlan){
 let minimumClearance=Infinity,maximumSpeed=0,maximumYawRate=0;const windings=new Map(plan.entryState.actors.map(a=>[a.id,{angle:0,total:0}])),byId=new Map(plan.entryState.poses.map(p=>[p.id,p])),neighbor=new Map(plan.entryState.neighbor);
 for(let n=0;n<=128;n++){
  const t=n/128,lo=Math.max(0,t-1e-5),hi=Math.min(1,t+1e-5),poses=plan.entryState.actors.map(a=>({id:a.id,position:plan.position(a.id,t)}));
  for(const p of poses){maximumSpeed=Math.max(maximumSpeed,distance(plan.position(p.id,lo),plan.position(p.id,hi))/((hi-lo)*8));maximumYawRate=Math.max(maximumYawRate,Math.abs(turn(plan.facing(p.id,hi,[]),plan.facing(p.id,lo,[])))/((hi-lo)*8));for(const q of poses)if(q.id>p.id)minimumClearance=Math.min(minimumClearance,distance(p.position,q.position));
   const a=byId.get(p.id)!.position,b=byId.get(neighbor.get(p.id)!)!.position,gap=distance(a,b),forward={x:(b.x-a.x)/gap,z:(b.z-a.z)/gap},left={x:forward.z,z:-forward.x},center={x:(a.x+b.x)/2,z:(a.z+b.z)/2},delta={x:p.position.x-center.x,z:p.position.z-center.z},angle=Math.atan2((delta.x*left.x+delta.z*left.z)/.45,-(delta.x*forward.x+delta.z*forward.z)/(gap/2)),w=windings.get(p.id)!;if(n)w.total+=turn(angle,w.angle);w.angle=angle;
  }
 }
 for(const w of windings.values())assert.ok(Math.abs(w.total-3*Math.PI)<1e-8);
 assert.ok(minimumClearance>=plan.minimumClearanceBound-1e-8);assert.ok(maximumSpeed<=plan.maximumSpeedBound+1e-5);assert.ok(maximumYawRate<=plan.maximumYawRateBound+1e-5);
 return{minimumClearance,maximumSpeed,maximumYawRate};
}

for(const record of packet.records)test(`measured ${record.sourceId} circle producer carries all named passages and exact exchanged stations`,()=>{
 // Reproduce the actual producer with its genuine immediate successor type.
 // The omitted terminal row is never compiled as a fake truncated endpoint.
 const prefix: Dance={id:'opaque-prefix',title:'Measured producer',author:'',formation:'duple-improper',description:'',figures:record.prefixFigures},compiled=compileStateCarryingCore(prefix,4,REGISTERED_MOTION_CAPABILITIES),state=compiled.sequenceState(0),producerProof=state.proofs.find(p=>p.figureId===prefix.figures.at(-1)!.id)!,context=contextFromBoundary(producerProof.incoming),circle=prefix.figures.at(-1)!,producer=compilePrimitiveFigure(circle,context.ids,context.start,context.dancers,state.directions,figureContinuity([...prefix.figures,figure],prefix.figures.length-1));
 const start=structuredClone(context.start);for(const id of context.ids)start[id].position=producer.position(id,1);for(const id of context.ids)start[id].yaw=producer.facing(id,1,start);
 const actualContext={...context,start},incoming=captureSequenceBoundary(actualContext,56,producer.contacts(1,start));assertSequenceHandoff(record.entry,incoming);
 const plan=compileNeighborDosidoStep(figure,actualContext,incoming);assertSequenceHandoff(incoming,plan.entryState);assert.equal(plan.exitState.sourceBeat,64);assert.equal(plan.exitState.relationshipEpoch,0);assert.deepEqual(plan.exitState.partner,incoming.partner);assert.deepEqual(plan.exitState.neighbor,incoming.neighbor);assert.deepEqual(plan.exitState.actors,incoming.actors);assert.deepEqual(plan.exitState.heldContacts,[]);assert.equal(plan.exitPreparationWindow,undefined);
 const neighbor=new Map(incoming.neighbor);for(const p of incoming.poses){assert.deepEqual(plan.position(p.id,0),p.position);assert.equal(plan.facing(p.id,0,[]),p.yaw);assert.deepEqual(plan.position(p.id,1),incoming.poses.find(q=>q.id===neighbor.get(p.id))!.position);for(const t of[.125,.25,.5,.75,1])assert.equal(plan.facing(p.id,t,[]),plan.facing(p.id,.125,[]));assert.ok(distance(plan.position(p.id,.1),p.position)>0);}
 assert.deepEqual(plan.gates.map(g=>g.kind),['right-shoulder','back-to-back','left-shoulder','full-return','right-shoulder','half-exchange']);assert.ok(Math.abs(plan.gates[0].sourceBeat-57.906666666764)<1e-9);assert.equal(plan.gates[2].sourceBeat,60);assert.ok(Math.abs(plan.gates[3].sourceBeat-61.046666666472)<1e-9);assert.ok(Math.abs(plan.gates[4].sourceBeat-62.093333333236)<1e-9);assert.equal(plan.gates[5].sourceBeat,64);
 for(const gate of plan.gates)for(const p of gate.poses){const t=(gate.sourceBeat-56)/8,q=gate.poses.find(q=>q.id===neighbor.get(p.id))!;assert.ok(distance(plan.position(p.id,t),p.position)<1e-8);assert.ok(Math.abs(turn(plan.facing(p.id,t,[]),p.yaw))<1e-8);assert.deepEqual(plan.contacts(t,[]),[]);if(gate.kind==='back-to-back')assert.ok(Math.cos(turn(heading(p.position,q.position),p.yaw))<-.999999);}
 for(const p of incoming.poses)assert.deepEqual(plan.gates[3].poses.find(q=>q.id===p.id)!.position,p.position);
 const metrics=measure(plan);assert.ok(metrics.minimumClearance>=.9-1e-8);assert.ok(metrics.maximumSpeed<1.05);assert.ok(metrics.maximumYawRate<1.48);
 // Geometry and timing match the untouched old ten-count kernel at equal
 // normalized progress. Only source duration and carried facing are new.
 const old=compileProgressingDoSiDoFigure({...figure,beats:10,exit:undefined},actualContext);for(let n=0;n<=32;n++)for(const p of incoming.poses)assert.ok(distance(plan.position(p.id,n/32),old.position(p.id,n/32))<1e-10);
});

test('arbitrary IDs, re-ranked roles, rotation, translation, clock and successor consume actual keyed geometry',()=>{
 const original=packet.records[0].entry,remap=new Map(original.actors.map((a,i)=>[a.id,[71,4,205,33][i]])),angle=.73,c=Math.cos(angle),s=Math.sin(angle),transform=(p:Readonly<Vec2>)=>({x:4.2+c*p.x+s*p.z,z:-7.1-s*p.x+c*p.z}),boundary:SequenceBoundary={...original,sourceBeat:100.25,relationshipEpoch:7,actors:original.actors.map(a=>({...a,id:remap.get(a.id)!,couple:a.couple===0?19:3})).reverse(),partner:original.partner.map(([a,b])=>[remap.get(a)!,remap.get(b)!] as const).reverse(),neighbor:original.neighbor.map(([a,b])=>[remap.get(a)!,remap.get(b)!] as const).reverse(),poses:original.poses.map(p=>({id:remap.get(p.id)!,position:transform(p.position),yaw:p.yaw+angle})).reverse()},context=contextFromBoundary(boundary),plan=compileNeighborDosidoStep({...figure,id:'new-figure',label:'Unseen named exchange'},context,boundary),baseline=compileNeighborDosidoStep(figure,contextFromBoundary(original),original);
 assert.deepEqual(plan.entryState,ownSequenceBoundary(boundary));assert.equal(plan.exitState.sourceBeat,108.25);assert.equal(plan.exitState.relationshipEpoch,7);assert.deepEqual(plan.exitState.partner,plan.entryState.partner);assert.deepEqual(plan.exitState.neighbor,plan.entryState.neighbor);
 for(let n=0;n<=32;n++)for(const a of original.actors){const id=remap.get(a.id)!;assert.ok(distance(plan.position(id,n/32),transform(baseline.position(a.id,n/32)))<1e-9);assert.ok(Math.abs(turn(plan.facing(id,n/32,[]),baseline.facing(a.id,n/32,[])+angle))<1e-9);}
 for(const next of[undefined,{id:'arbitrary',kind:'unknown',beats:3,label:'Uncompiled future'} as Figure]){const other=compileNeighborDosidoStep(figure,{...context,next},boundary);assert.deepEqual(other.exitState,plan.exitState);assert.deepEqual(other.gates,plan.gates);}
 measure(plan);
 // Reflection changes room handedness, so recompute a right-shoulder path;
 // do not mirror a stored trajectory or swap any actor's role or relation.
 const reflected={...boundary,poses:boundary.poses.map(p=>({...p,position:{x:-p.position.x,z:p.position.z},yaw:-p.yaw}))},reflection=compileNeighborDosidoStep(figure,contextFromBoundary(reflected),reflected);
 for(const gate of reflection.gates.filter(g=>g.kind==='right-shoulder'||g.kind==='left-shoulder'))for(const pair of reflection.namedPairs)for(const id of pair){const p=gate.poses.find(p=>p.id===id)!,q=gate.poses.find(p=>p.id===pair.find(j=>j!==id))!,right={x:-Math.cos(p.yaw),z:Math.sin(p.yaw)},side=(q.position.x-p.position.x)*right.x+(q.position.z-p.position.z)*right.z;assert.ok((gate.kind==='right-shoulder'?1:-1)*side>.899999);}
 measure(reflection);
});

test('declared balance window begins after the untouched last passage and owns no future binding or local motion',()=>{
 const boundary=packet.records[0].entry,context=contextFromBoundary(boundary),plain=compileNeighborDosidoStep(figure,context,boundary),prepared=compileNeighborDosidoStep({...figure,preparation:'next-neighbor-balance'},context,boundary),window=prepared.exitPreparationWindow!;
 assert.deepEqual(prepared.gates,plain.gates);assert.deepEqual(prepared.exitState,plain.exitState);assert.deepEqual(window,{kind:'next-neighbor-balance',sourceStart:plain.gates[4].sourceBeat,sourceEnd:64,after:'last-named-shoulder-pass',contactState:'released'});assert.ok(Math.abs(window.sourceEnd-window.sourceStart-1.906666666764)<1e-9);assert.deepEqual(prepared.lastShoulderPass,{sourceBeat:window.sourceStart,namedPairs:prepared.namedPairs,contactState:'released'});assert.deepEqual(prepared.release,{sourceBeat:64,namedPairs:prepared.namedPairs,contactState:'released',relationshipEpoch:0});
 for(let n=0;n<=32;n++)for(const p of boundary.poses){assert.deepEqual(prepared.position(p.id,n/32),plain.position(p.id,n/32));assert.equal(prepared.facing(p.id,n/32,[]),plain.facing(p.id,n/32,[]));assert.deepEqual(prepared.contacts(n/32,[]),[]);}
});

test('shared boundary capture rejects malformed ownership and snapshots the carried exchange',()=>{
 const boundary=packet.records[0].entry,context=contextFromBoundary(boundary);
 for(const change of[{amount:1},{amount:.5},{beats:10},{direction:'left'},{who:'partner'},{progression:false},{exit:undefined},{entry:'paired-sidelines'},{phaseBeats:[6,2]},{hands:'right'},{confidence:'unsupported'}])assert.throws(()=>assertNeighborDosidoFigure({...figure,...change} as Figure));
 assert.throws(()=>compileNeighborDosidoStep(figure,{...context,bindingEpoch:2},boundary),/epoch/);assert.throws(()=>compileNeighborDosidoStep(figure,context,{...boundary,sourceBeat:2**53}),/source-count interval/);
 const held={...boundary,heldContacts:[{a:0,b:3,handA:'right' as const,handB:'left' as const,kind:'joined' as const,point:{x:0,y:1,z:0},strength:5e-8}]};assert.throws(()=>compileNeighborDosidoStep(figure,context,held),/held contact/);
 const wrong=structuredClone(boundary);wrong.poses[0].position.x+=.01;assert.throws(()=>compileNeighborDosidoStep(figure,context,wrong),/discontinuous root/);
 let reads=0;const hostile={...boundary};Object.defineProperty(hostile,'poses',{enumerable:true,get(){reads++;return boundary.poses;}});assert.throws(()=>compileNeighborDosidoStep(figure,context,hostile),/accessors/);assert.equal(reads,0);
 const raw=structuredClone(boundary),input={...figure},owned=compileNeighborDosidoStep(input,context,raw),before=owned.position(0,.42);raw.poses[0].position.x=999;input.amount=.5;context.start[0].position.z=999;context.relations.neighbor.clear();assert.deepEqual(owned.position(0,.42),before);const escaped=owned.position(0,.42);escaped.x=500;assert.deepEqual(owned.position(0,.42),before);assert.ok(Object.isFrozen(owned.exitState.poses[0].position));assert.ok(Object.isFrozen(owned.gates));assert.throws(()=>owned.position(999,.5),/outside/);assert.throws(()=>owned.position(0,NaN),/finite/);assert.throws(()=>owned.contacts(Infinity,[]),/finite/);
});
