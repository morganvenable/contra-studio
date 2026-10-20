import test from 'node:test';
import assert from 'node:assert/strict';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import {compileArchFigure,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileBareArchStep} from './bare-arch-step.ts';
import {compileRolePullBySwingStep} from './role-pull-by-swing-step.ts';
import {compileNamedPullByFigure} from './named-pull-by-adapter.ts';
import {captureSequenceBoundary,assertSequenceHandoff,ownSequenceBoundary,type SequenceBoundary} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {distance,turn} from './ring-twirl-contract.ts';
import type {Figure} from './types.ts';

const arch=(who:'partner'|'neighbor'='neighbor'):Figure=>({id:'box',label:'Bare named box the gnat',kind:'box-the-gnat',who,beats:4,hands:'right',underRole:'robin',entry:'paired-sidelines',exit:'paired-sidelines'});
const pull=(beats:2|4=4,who:'larks'|'robins'='larks'):Figure=>({id:'pull',label:'Named left pull-by',kind:'pull-by',who,hands:'left',beats});
const swing=(who:'partner'|'neighbor'='partner',beats=8):Figure=>({id:'swing',label:'Named swing',kind:'swing',who,beats});
const fixture=():FigureContext=>{const dancers=createDancers(2);return{ids:[0,1,2,3],dancers,start:initialPoses(dancers),bindingEpoch:7,relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},next:pull()};};
const after=(context:FigureContext,plan:MotionPlan,next?:Figure):FigureContext=>({...context,start:sampleFormationEndpoint(context,plan,1),next});
const corners=(state:SequenceBoundary)=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>state.poses.find(p=>Math.sign(p.position.x)===x&&Math.sign(p.position.z)===z)!.id);

for(const beats of[2,4]as const)test(`bare N box4 → larks left${beats} → P swing consumes actual boundaries`,t=>{
 const context=fixture();context.next=pull(beats);const incoming=captureSequenceBoundary(context,12.5,[]),box=compileBareArchStep(arch(),context,incoming);
 assertSequenceHandoff(incoming,box.entryState);assert.equal(box.exitState.sourceBeat,16.5);assert.deepEqual(corners(incoming),[1,0,3,2]);assert.deepEqual(corners(box.exitState),[2,3,0,1]);assert.equal(box.exitState.relationshipEpoch,7);assert.deepEqual(box.exitState.partner,incoming.partner);assert.deepEqual(box.exitState.neighbor,incoming.neighbor);assert.deepEqual(box.exitState.heldContacts,[]);
 for(const id of context.ids){const at0=box.position(id,0),at1=box.position(id,.25);assert.deepEqual(at0,context.start[id].position);assert.equal(Math.abs(at1.x),.9);assert.ok(Math.abs(Math.abs(at1.z)-.55)<1e-8);assert.ok(distance(box.position(id,.25-1e-8),box.position(id,.25+1e-8))<1e-7);assert.ok(Math.abs(turn(box.facing(id,.25-1e-8,[]),box.facing(id,.25+1e-8,[])))<1e-7);}
 assert.deepEqual(box.contacts(0,[]),[]);assert.equal(box.contacts(.25,[]).length,2);assert.deepEqual(box.contacts(1,[]),[]);
 for(let n=0;n<=160;n++){const at=n/160;for(const c of box.contacts(at,[]))for(const id of[c.a,c.b]){const p=box.position(id,at),yaw=box.facing(id,at,[]),knee=box.arch!(id,at)!.kneeLowering;assert.ok(Math.hypot(c.point.x-p.x+.235*Math.cos(yaw),c.point.z-p.z-.235*Math.sin(yaw),c.point.y-1.355+knee)<=.640001);}}
 const nextContext=after(context,box,swing('partner',beats===2?10:8)),pass=compileRolePullBySwingStep(pull(beats),nextContext,box.exitState);
 assertSequenceHandoff(box.exitState,pass.entryState);assert.equal(pass.beats,beats);assert.equal(pass.gates[0].beat,beats/2);assert.ok(pass.minimumObservedClearance>=.7-1e-8);assert.ok(pass.maximumObservedSpeed<=(beats===2?1.70:1.65));assert.ok(pass.maximumObservedYawRate<=6);assert.deepEqual(corners(pass.exitState),[0,3,2,1]);assert.equal(pass.exitState.sourceBeat,16.5+beats);assert.deepEqual(pass.exitState.heldContacts,[]);
 const gatePoses=sampleFormationEndpoint(nextContext,pass,.5),gate=pass.contacts(.5,gatePoses);assert.equal(gate.length,1);assert.equal(gate[0].handA,'left');assert.equal(gate[0].handB,'left');assert.deepEqual([gate[0].a,gate[0].b],[0,2]);assert.ok(gate[0].strength>.99);
 const swingContext=after(nextContext,pass),receiver=compilePrimitiveFigure(nextContext.next!,swingContext.ids,swingContext.start,swingContext.dancers,[1,-1]);
 for(const id of context.ids){assert.ok(distance(receiver.position(id,0),pass.position(id,1))<1e-8);assert.ok(Math.abs(turn(receiver.facing(id,0,swingContext.start),pass.facing(id,1,[])))<1e-8);}
 assert.ok(box.minimumObservedClearance>=.5);assert.ok(box.maximumObservedSpeed<1.5);assert.ok(box.maximumObservedYawRate<6);
 t.diagnostic(JSON.stringify({archClearance:box.minimumObservedClearance,archSpeed:box.maximumObservedSpeed,archYaw:box.maximumObservedYawRate,pullCounts:beats,pullClearance:pass.minimumObservedClearance,pullSpeed:pass.maximumObservedSpeed,pullYaw:pass.maximumObservedYawRate}));
});

test('the same local contract consumes the later P box → robins left → N swing after rearranged ordinary rows',()=>{
 const first=fixture(),box=compileBareArchStep(arch(),first,captureSequenceBoundary(first,0,[])),pulled=after(first,box,swing()),pass=compileRolePullBySwingStep(pull(),pulled,box.exitState);
 let context=after(pulled,pass);let beat=8;
 for(const f of[swing(),{id:'circle',label:'Circle once',kind:'circle',who:'all',direction:'left',amount:1,beats:8},{id:'dosido',label:'Partner dosido',kind:'do-si-do',who:'partner',direction:'right',amount:1,beats:8}]as Figure[]){const p=compilePrimitiveFigure(f,context.ids,context.start,context.dancers,[1,-1]);context=after(context,p);beat+=f.beats;}
 context.next=pull(4,'robins');const incoming=captureSequenceBoundary(context,beat,[]),partnerBox=compileBareArchStep(arch('partner'),context,incoming);assert.equal(beat,32);assert.deepEqual(corners(partnerBox.exitState),[1,2,3,0]);
 const receiver=after(context,partnerBox,swing('neighbor')),robins=compileRolePullBySwingStep(pull(4,'robins'),receiver,partnerBox.exitState);assert.deepEqual(corners(robins.exitState),[3,2,1,0]);assert.equal(robins.exitState.sourceBeat,40);
 // The row's source clock and metadata do not identify its geometry.
 const shifted=ownSequenceBoundary({...incoming,sourceBeat:104});const repeated=compileBareArchStep({...arch('partner'),id:'different-id',label:'Unseen arrangement'},context,shifted);for(const id of context.ids)assert.deepEqual(repeated.position(id,.63),partnerBox.position(id,.63));assert.equal(repeated.exitState.sourceBeat,108);
});

test('incompatible actual state, wrong receiver and live raw holds are rejected without repairing the boundary',()=>{
 const context=fixture(),entry=captureSequenceBoundary(context,0,[]);
 const displaced=structuredClone(context);displaced.start[0].position.x+=.1;assert.throws(()=>compileBareArchStep(arch(),displaced,captureSequenceBoundary(displaced,0,[])),/actual standard/);
 assert.throws(()=>compileBareArchStep(arch('partner'),context,entry),/same actual sideline/);
 const held=ownSequenceBoundary({...entry,heldContacts:[{a:0,b:3,handA:'right',handB:'right',kind:'joined',point:{x:.9,y:1.18,z:0},strength:.005}]});assert.throws(()=>compileBareArchStep(arch(),context,held),/released incoming/);
 assert.throws(()=>compileBareArchStep(arch(),{...context,bindingEpoch:8},entry),/stale/);
 const box=compileBareArchStep(arch(),context,entry),wrong=after(context,box,swing('neighbor'));assert.throws(()=>compileRolePullBySwingStep(pull(),wrong,box.exitState),/declared next swing receivers/);
 assert.throws(()=>compileBareArchStep({...arch(),beats:8},context,entry),/four source counts/);assert.throws(()=>compileBareArchStep(arch(),{...context,next:{...pull(),hands:'right'}},entry),/left hands/);
});

test('captured plans own the new data and preserve established four-count pull geometry',()=>{
 const context=fixture(),f=arch(),incoming=captureSequenceBoundary(context,0,[]),box=compileBareArchStep(f,context,incoming),sample=box.position(0,.72);
 const contact=box.contacts(.24,[])[0],ownedPoint={...contact.point};contact.point.x=99;assert.deepEqual(box.contacts(.24,[])[0].point,ownedPoint);
 const next=after(context,box,swing()),figure=pull(),newPlan=compileRolePullBySwingStep(figure,next,box.exitState),oldPlan=compileNamedPullByFigure(figure,next);
 for(let n=0;n<=80;n++){const t=n/80,poses=sampleFormationEndpoint(next,newPlan,t);for(const id of context.ids){assert.deepEqual(newPlan.position(id,t),oldPlan.position(id,t));assert.ok(Math.abs(turn(newPlan.facing(id,t,poses),oldPlan.facing(id,t,poses)))<1e-8);}assert.deepEqual(newPlan.contacts(t,poses),oldPlan.contacts(t,poses));}
 // The old bare entry remains guarded; this new declaration is necessary.
 const{entry:_entry,exit:_exit,...legacy}=arch();assert.throws(()=>compileArchFigure(legacy,context),/preceding reachable/);
 context.start[0].position.x=99;context.dancers[0].role='robin';context.relations.neighbor.clear();context.next!.beats=9;f.who='partner';assert.deepEqual(box.position(0,.72),sample);
 const before=newPlan.position(0,.61);next.start[0].position.x=99;figure.hands='right';assert.deepEqual(newPlan.position(0,.61),before);
});
