import {compileChoreography} from './choreography.ts';
import {readContraDbImport} from './contradb-import.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {partnerFirstSource as partnerFirstPilot,PARTNER_FIRST_CAPABILITIES as caps} from '../test-data/ordinary-hey-composition/partner-first-public-source.ts';
const compilePartnerFirstPilotDance=(dance:Parameters<typeof compileChoreography>[0],couples:number)=>compileChoreography(dance,couples,caps);
import {compilePartnerFirstHalfHeyHandoff,type PartnerFirstHalfHeyFigure} from './partner-first-half-hey.ts';
import {assertFormationHandoff,assertSuccessorEntry,captureFormationState,sampleFormationEndpoint} from './formation-handoff.ts';
import {compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileGyreFigure,type GyreFigure} from './gyre-adapter.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure,Pose,Dancer} from './types.ts';
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function fixture(id=769){
 const{dance}=partnerFirstPilot(id),compiled=compilePartnerFirstPilotDance(dance,2),index=dance.figures.findIndex(f=>'heyStartPair'in f),figure=dance.figures[index] as PartnerFirstHalfHeyFigure;
 const context:FigureContext={ids:[0,1,2,3],start:structuredClone(compiled.sample(compiled.starts[index]).poses),dancers:structuredClone(compiled.dancers),relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0,next:dance.figures[index+1] as Figure};
 return{dance,compiled,index,figure,context,sourceBeat:compiled.starts[index]};
}
for(const id of[769,871,894,3454])test(`${id}: literal partner-right first pass, adjacency-derived centers and exact opposite stations`,()=>{
 const{figure,context,sourceBeat}=fixture(id),plan=compilePartnerFirstHalfHeyHandoff(figure,context,sourceBeat),{graph,heyPlan,entryState,exitState}=plan;
 assert.equal(figure.heyStartRole,undefined);assert.deepEqual(graph.events.map(e=>e.token.raw),id===769?['PR','WL','NR','ML']:['PR','ML','NR','WL']);
 assert.deepEqual(graph.events.map(e=>e.phase),['sides','center','sides','center']);assert.equal(graph.events.flatMap(e=>e.pairs).length,6);
 const oracle=id===769?[[[1,0],[2,3]],[[1,3]],[[0,3],[1,2]],[[0,2]]]:id===871?[[[2,3],[1,0]],[[2,0]],[[3,0],[2,1]],[[3,1]]]:[[[0,1],[3,2]],[[0,2]],[[1,2],[0,3]],[[1,3]]];assert.deepEqual(graph.events.map(e=>e.pairs.map(pair=>pair.map(Number))),oracle);
 assert.deepEqual(graph.endOrder,[...graph.events[0].incomingOrder].reverse());assert.equal(heyPlan.beats,8);assert.equal(exitState.sourceBeat-entryState.sourceBeat,8);assert.equal(exitState.relationshipEpoch,entryState.relationshipEpoch);assert.deepEqual(exitState.partner,entryState.partner);assert.deepEqual(exitState.neighbor,entryState.neighbor);assert.deepEqual(exitState.actors,entryState.actors);
 for(const gate of heyPlan.gates){const frame=heyPlan.sample(gate.beat);for(const[a,b]of gate.pairs){for(const[self,other]of[[a,b],[b,a]]){const A=frame.poses.find(p=>p.id===self)!,B=frame.poses.find(p=>p.id===other)!,side=(-A.velocity.z*(B.position.x-A.position.x)+A.velocity.x*(B.position.z-A.position.z))/Math.hypot(A.velocity.x,A.velocity.z);assert.ok(side*(gate.shoulder==='right'?1:-1)>=.5);assert.ok(Math.abs(A.position.x-B.position.x)<1e-7);}}}
 for(const actor of context.ids){const entry=entryState.orderedSlots.find(p=>p.id===actor)!,exit=exitState.orderedSlots.find(p=>p.id===actor)!;assert.ok(Math.abs(entry.position.x+exit.position.x)<1e-7);assert.ok(gap(plan.position(actor,0),context.start[actor].position)<1e-7);assert.ok(angle(plan.facing(actor,0,[]),context.start[actor].yaw)<1e-7);assert.equal(context.relations.partner.get(actor),entryState.partner.find(p=>p[0]===actor)![1]);}
 assert.ok(heyPlan.minimumCertifiedClearance>=.5);assert.ok(heyPlan.maximumCertifiedSpeed<=1.3);assert.ok(heyPlan.maximumCertifiedYawRate<=4);assert.deepEqual(entryState.heldContacts,[]);assert.deepEqual(exitState.heldContacts,[]);assert.deepEqual(plan.contacts(1,[]),[]);
});
for(const id of[769,871,894,3454])test(`${id}: actual balance/gyre successor consumes the unmodified boundary and source clock`,()=>{
 const{dance,index,figure,context,sourceBeat}=fixture(id),plan=compilePartnerFirstHalfHeyHandoff(figure,context,sourceBeat),terminal=sampleFormationEndpoint(context,plan,1),next=context.next!,successorContext={...context,start:terminal,next:dance.figures[index+2] as Figure};
 const successor=next.kind==='gyre'?compileGyreFigure(next as GyreFigure,successorContext):compilePrimitiveFigure(next,context.ids,terminal,context.dancers,[1,-1],figureContinuity(dance.figures as Figure[],index+1));
 assertSuccessorEntry(plan.exitState,successorContext,successor);
 const near=sampleFormationEndpoint(successorContext,successor,1e-7);for(const actor of context.ids){assert.ok(gap(near[actor].position,terminal[actor].position)<1e-5);assert.ok(angle(near[actor].yaw,terminal[actor].yaw)<1e-5);}
 for(const patch of[{sourceBeat:sourceBeat+9},{relationshipEpoch:1},{partner:[[0,3],[3,0],[1,2],[2,1]]}])assert.throws(()=>assertFormationHandoff(plan.exitState,{...plan.exitState,...patch} as typeof plan.exitState));
 const moved=structuredClone(terminal);moved[0].position.x+=.02;assert.throws(()=>captureFormationState({...context,start:moved},{sourceBeat:sourceBeat+8,orderedIds:plan.exitState.orderedSlots.map(s=>s.id),geometry:plan.exitState.geometry}));
});
test('new declaration cannot erase modifiers, change shoulders, shorten counts or invent a first role',()=>{
 const{figure,context}=fixture();for(const patch of[{beats:6},{amount:1},{who:'neighbor'},{heyStartPair:'neighbor'},{heyStartRole:'lark'},{centerShoulder:'right'},{endShoulder:'left'},{heyAxis:'left-diagonal'},{notation:'(8) Hey 1/2 (PR;WL;NR;ML)'},{hands:'right'},{progression:true},{progression:'false'},{exit:'progressed-neighbors'},{confidence:'unsupported'},{dolphin:true},{circular:true}])assert.throws(()=>compilePartnerFirstHalfHeyHandoff({...figure,...patch} as PartnerFirstHalfHeyFigure,context));
 for(const decorate of[(f:object)=>Object.defineProperty(f,'hidden',{value:true}),(f:object)=>Object.defineProperty(f,'notes',{get:()=>''}),(f:object)=>Object.defineProperty(f,Symbol('modifier'),{value:true})]){const f={...figure};decorate(f);assert.throws(()=>compilePartnerFirstHalfHeyHandoff(f,context));}
 for(const next of[undefined,{...context.next!,who:'neighbor'},{...context.next!,beats:8}])assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,{...context,next}));
 assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,{...context,bindingEpoch:1}));
 assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,{...context,relations:{...context.relations,partner:new Map([[0,3],[3,0],[1,2],[2,1]])}}));
 assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,context,24,[{a:0,b:1,handA:'right',handB:'right',point:{x:0,y:1,z:0},strength:1,kind:'joined'}]));
});
test('opaque stable IDs, titles and input ownership',()=>{
 const{figure,context}=fixture(),reference=compilePartnerFirstHalfHeyHandoff(figure,context,24),mapping=new Map([[0,17],[1,4],[2,12],[3,1]]),ids=context.ids.map(id=>mapping.get(id)!),start:Pose[]=[],dancers:Dancer[]=[];
 for(const id of context.ids){const n=mapping.get(id)!;start[n]={...structuredClone(context.start[id]),id:n};dancers[n]={...context.dancers[id],id:n};}
 const remap=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[mapping.get(a)!,mapping.get(b)!]));
 const opaque=compilePartnerFirstHalfHeyHandoff({...figure,id:'unrelated',label:'unrelated'}, {...context,ids,start,dancers,relations:{epoch:0,partner:remap(context.relations.partner),neighbor:remap(context.relations.neighbor)}},24);
 for(const t of[0,.1,.25,.5,.75,1])for(const id of context.ids){assert.deepEqual(opaque.position(mapping.get(id)!,t),reference.position(id,t));assert.equal(opaque.facing(mapping.get(id)!,t,[]),reference.facing(id,t,[]));}
 const expected=reference.position(0,.3);figure.label='edited';context.start[0].position.x=100;context.ids[0]=100;context.dancers[1].role='lark';(context.relations.partner as Map<number,number>).set(0,3);context.next!.who='neighbor';assert.deepEqual(reference.position(0,.3),expected);assert.ok(Object.isFrozen(reference.exitState));assert.ok(Object.isFrozen(reference.graph.events[0].pairs));

});

test('the actual source and public compiler require the explicit partner-first and ordinary-half gates',()=>{
 for(const id of[769,871,894,3454]){const{dance,source,choices}=partnerFirstPilot(id);
  for(const disabled of[{...caps,partnerFirstHalfHeys:false},{...caps,ordinaryHalfHeys:false}]){assert.equal(readContraDbImport(source,{interpretation:choices,capabilities:disabled}).dance,undefined);assert.throws(()=>compileChoreography(dance,2,disabled));}
  assert.equal(compileChoreography(dance,2,{...caps,partialHeys:false}).repeatable,true,'pair-first dispatch does not depend on the exact-notation capability');
 }
});

test('raw successor declarations retain plain-data, descriptor, metadata and source-count guards',()=>{
 for(const id of[769,894]){
  const{figure,context}=fixture(id),next=context.next!;
  for(const patch of[{id:''},{id:'  '},{id:4},{label:''},{label:null},{label:[]},{notes:4},{confidence:'other'},{confidence:0},{beats:0},{beats:-4},{beats:NaN},{beats:Infinity},{beats:-Infinity},{beats:65},{beats:'4'}])assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,{...context,next:{...next,...patch} as Figure}),/metadata and source counts/);
  for(const raw of[Object.assign(Object.create({variant:'other'}),next),Object.assign(new Date(),next)])assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,{...context,next:raw}),/plain data record/);
  let reads=0;
  for(const decorate of[(f:object)=>Object.defineProperty(f,'hidden',{value:true}),(f:object)=>Object.defineProperty(f,Symbol('modifier'),{value:true,enumerable:true}),(f:object)=>Object.defineProperty(f,'notes',{get:()=>{reads++;return '';},enumerable:true})]){const raw={...next};decorate(raw);assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,{...context,next:raw}),/Symbol, hidden or accessor/);}
  assert.equal(reads,0,'reject accessors without evaluating them');
  const baseline=compilePartnerFirstHalfHeyHandoff(figure,context,24),plain=compilePartnerFirstHalfHeyHandoff(figure,{...context,next:Object.assign(Object.create(null),next)},24);
  for(const t of[0,.25,.5,.75,1])for(const actor of context.ids){assert.deepEqual(plain.position(actor,t),baseline.position(actor,t));assert.equal(plain.facing(actor,t,[]),baseline.facing(actor,t,[]));}
  for(const patch of[{id:''},{label:4},{notes:{}},{confidence:'other'}])assert.throws(()=>compilePartnerFirstHalfHeyHandoff({...figure,...patch} as PartnerFirstHalfHeyFigure,context),/metadata and source counts/);
 }
});
test('invalid empty-hold strengths reject before contact filtering; zero strength retains unchanged motion',()=>{
 const{figure,context}=fixture(),contact={a:0,b:1,handA:'right' as const,handB:'right' as const,point:{x:0,y:1,z:0},strength:0,kind:'joined' as const};
 for(const strength of[-1,NaN,Infinity,-Infinity,1.1])assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,context,24,[{...contact,strength}]),/finite held targets/);
 const empty=compilePartnerFirstHalfHeyHandoff(figure,context,24),zero=compilePartnerFirstHalfHeyHandoff(figure,context,24,[contact]);assert.deepEqual(zero.entryState,empty.entryState);assert.deepEqual(zero.exitState,empty.exitState);
 for(const t of[0,.25,.5,.75,1])for(const actor of context.ids){assert.deepEqual(zero.position(actor,t),empty.position(actor,t));assert.equal(zero.facing(actor,t,[]),empty.facing(actor,t,[]));}
});

test('the unchanged public balance wrapper preserves roots and prepares held hands only in the final half-count',()=>{
 for(const source of[769,871])for(const count of[2,6]){
  const{dance}=partnerFirstPilot(source),compiled=compileChoreography(dance,count,caps),index=dance.figures.findIndex(f=>f.heyStartPair==='partner'),entry=compiled.starts[index],exit=entry+8,logical=compiled.formationSample!;
  assert.ok(logical);assert.equal(compiled.totalBeats,64);assert.equal(compiled.sample(entry-1e-7).contacts.length,0);assert.equal(compiled.sample(entry).contacts.length,0);
  for(const local of[0,1.25,35/12,55/12,6.25,7.49,7.5,7.75,7.9,7.999999,8]){const actual=compiled.sample(entry+local),raw=logical(entry+local);for(const pose of actual.poses){assert.ok(gap(pose.position,raw.poses[pose.id].position)<1e-8);assert.ok(angle(pose.yaw,raw.poses[pose.id].yaw)<1e-8);}if(local<=7.5)assert.equal(actual.contacts.length,0);}
  assert.ok(compiled.sample(exit-.1).contacts.length>0);
  const a=compiled.sample(exit-1e-7),b=compiled.sample(exit);assert.equal(a.contacts.length,b.contacts.length);assert.ok(b.contacts.every(h=>h.strength===1&&compiled.dancers[h.a].couple===compiled.dancers[h.b].couple));
  for(const h of b.contacts){const before=a.contacts.find(c=>c.a===h.a&&c.b===h.b&&c.handA===h.handA&&c.handB===h.handB&&c.kind===h.kind&&c.target===h.target)!;assert.ok(before);assert.ok(Math.hypot(before.point.x-h.point.x,before.point.y-h.point.y,before.point.z-h.point.z)<1e-6);assert.ok(Math.abs(before.strength-h.strength)<1e-6);}
 }
});
test('the public gyre exit keeps the same partner roots and existing swing preparation without a balance hold',()=>{
 for(const source of[894,3454]){
  const{dance}=partnerFirstPilot(source),compiled=compileChoreography(dance,2,caps),index=dance.figures.findIndex(f=>f.heyStartPair==='partner'),entry=compiled.starts[index],exit=entry+8;
  for(const beat of[entry-1e-7,entry,exit-.1,exit-1e-7,exit,exit+1e-7])assert.equal(compiled.sample(beat).contacts.length,0);
  const before=compiled.sample(exit+4-1e-7),swing=compiled.sample(exit+4);assert.equal(swing.contacts.length,6);assert.ok(swing.contacts.every(h=>h.strength===1&&compiled.dancers[h.a].couple===compiled.dancers[h.b].couple));
  for(const p of swing.poses){const last=before.poses[p.id];assert.ok(gap(last.position,p.position)<1e-6);assert.ok(angle(last.yaw,p.yaw)<1e-6);assert.ok((last.swingPreparation?.strength??0)>1-1e-6);const prepared=last.swingPreparation!.contacts;for(const h of swing.contacts){const c=prepared.find(c=>c.a===h.a&&c.b===h.b&&c.handA===h.handA&&c.handB===h.handB&&c.target===h.target)!;assert.ok(c);assert.ok(Math.hypot(c.point.x-h.point.x,c.point.y-h.point.y,c.point.z-h.point.z)<1e-5);}}
 }
});

test('raw incoming contact fields reject before any accessor can be evaluated',()=>{
 const{figure,context}=fixture(),contact={a:0,b:1,handA:'right' as const,handB:'right' as const,point:{x:0,y:1,z:0},strength:0,kind:'joined' as const};let reads=0;
 for(const decorate of[(c:object)=>Object.defineProperty(c,'strength',{enumerable:true,get:()=>{reads++;return 0;}}),(c:object)=>Object.defineProperty(c,'hidden',{value:true}),(c:object)=>Object.defineProperty(c,Symbol('unknown'),{value:true})]){const raw={...contact};decorate(raw);assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,context,24,[raw]),/unconsumed|hidden|accessor/);}
 assert.equal(reads,0);const crossGroup={...contact,b:100};assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,context,24,[crossGroup]),/bound actors/);
 const array=[contact];Object.defineProperty(array,'0',{enumerable:true,get:()=>{reads++;return contact;}});assert.throws(()=>compilePartnerFirstHalfHeyHandoff(figure,context,24,array),/array declaration/);assert.equal(reads,0);
});
