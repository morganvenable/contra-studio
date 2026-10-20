import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {compilePrimitiveFigure,createDancers,initialPoses,figureContinuity} from './engine.ts';
import {compileOrdinaryHalfHeyFigure} from './ordinary-half-hey.ts';
import {compileGyreFigure,type GyreFigure} from './gyre-adapter.ts';
import {captureFormationState,sampleFormationEndpoint,assertSuccessorEntry} from './formation-handoff.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import type {Figure,Pose,Dancer,Vec2} from './types.ts';

const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const producer:Figure={id:'opening',label:'Neighbors allemande right 1½',kind:'allemande',who:'neighbor',beats:8,direction:'right',amount:1.5};
const figure:Figure={id:'hey',label:'Larks start half hey, lefts center, rights ends',kind:'hey',who:'neighbor',amount:.5,beats:8,heyStartRole:'lark',centerShoulder:'left',endShoulder:'right',entry:'paired-sidelines',exit:'opposite-paired-gyre'};
const next:GyreFigure={id:'gyre',label:'Neighbor gyre',kind:'gyre',who:'neighbor',beats:4,passingShoulder:'right',amount:1};
function fixture():FigureContext {
 const dancers=createDancers(2),ids=[0,1,2,3],initial=initialPoses(dancers),opening=compilePrimitiveFigure(producer,ids,initial,dancers,[1,-1],figureContinuity([producer,figure],0));
 const context:FigureContext={ids,start:initial,dancers,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0,next:structuredClone(next)};
 context.start=sampleFormationEndpoint(context,opening,1);assert.deepEqual(opening.contacts(1,context.start),[]);
 return context;
}
const frame=(context:FigureContext,plan:MotionPlan,t:number)=>{const poses=sampleFormationEndpoint(context,plan,t);return{poses,contacts:plan.contacts(t,poses)};};

test('literal3241 allemande → role-first half hey retains six named encounters and releases into the same neighbor gyre',()=>{
 const source=JSON.parse(readFileSync(new URL('../test-data/contradb/3241.json',import.meta.url),'utf8'));
 assert.equal(source.sourceUrl,'https://contradb.com/dances/3241');
 for(const row of['neighbors allemande right 1½','gentlespoons start a half hey - lefts in center, rights on ends','neighbors meltdown swing'])assert.ok(source.html.includes(row));
 const context=fixture(),plan=compileOrdinaryHalfHeyFigure(figure,context);
 assert.equal(figure.beats,8);assert.equal(context.next!.beats,4);
 const gates=[{beat:2,pairs:[[2,0]],shoulder:-1,relation:'larks'},{beat:3.75,pairs:[[1,0],[2,3]],shoulder:1,relation:'partner'},{beat:5.5,pairs:[[1,3]],shoulder:-1,relation:'robins'},{beat:7.25,pairs:[[0,3],[1,2]],shoulder:1,relation:'neighbor'}];
 assert.equal(gates.reduce((n,g)=>n+g.pairs.length,0),6);
 for(const gate of gates)for(const[a,b]of gate.pairs){
  if(gate.relation==='partner'||gate.relation==='neighbor')assert.equal(context.relations[gate.relation].get(a),b);else assert.equal(context.dancers[a].role,gate.relation==='larks'?'lark':'robin');
  const t=gate.beat/8,A=plan.position(a,t),B=plan.position(b,t),lo=plan.position(a,t-1e-6),hi=plan.position(a,t+1e-6),v={x:hi.x-lo.x,z:hi.z-lo.z};
  assert.ok(Math.abs(A.x-B.x)<1e-7,`actual named pass ${a}/${b} on count ${gate.beat}`);
  assert.ok((v.x*(B.z-A.z)-v.z*(B.x-A.x))/Math.hypot(v.x,v.z)*gate.shoulder>.5,`declared shoulder ${a}/${b}`);
 }
 const terminal=sampleFormationEndpoint(context,plan,1);
 for(const id of context.ids){
  assert.deepEqual(plan.position(id,0),context.start[id].position);assert.equal(plan.facing(id,0,[]),context.start[id].yaw);
  const paired=context.relations.neighbor.get(id)!,end=terminal[id].position,other=terminal[paired].position;
  assert.ok(Math.abs(end.x+context.start[id].position.x)<1e-8);assert.ok(Math.abs(end.z+context.start[id].position.z)<1e-8);
  assert.ok(Math.abs(gap(end,other)-1.1)<1e-8);assert.ok(turn(terminal[id].yaw,Math.atan2(other.x-end.x,other.z-end.z))<1e-8);
  assert.ok(gap(plan.position(id,1-1e-7),end)<1e-6);assert.ok(turn(plan.facing(id,1-1e-7,[]),terminal[id].yaw)<1e-6);
 }
 for(const beat of[0,1,2,3.75,5.5,7.25,7.9,8])assert.deepEqual(frame(context,plan,beat/8).contacts,[]);
 const state=captureFormationState({...context,start:terminal},{sourceBeat:16,orderedIds:[3,0,2,1],geometry:{kind:'paired-sidelines',sidePair:'neighbor',origin:{x:0,z:0},halfWidth:.9,pairGap:1.1}});
 const gyreContext={...context,start:terminal,next:{id:'swing',label:'Neighbors swing',kind:'swing',who:'neighbor',beats:12} as Figure},gyre=compileGyreFigure(next,gyreContext);
 assertSuccessorEntry(state,gyreContext,gyre);assert.equal(state.relationshipEpoch,0);assert.deepEqual(state.neighbor,context.ids.map(id=>[id,context.relations.neighbor.get(id)!]));
 for(const id of context.ids){assert.ok(gap(gyre.position(id,0),terminal[id].position)<1e-12);assert.ok(turn(gyre.facing(id,0,terminal),terminal[id].yaw)<1e-12);}
 assert.deepEqual(gyre.contacts(0,terminal),[]);
});

test('the gyre exit is reusable after translation and opaque actor rekeying at a later relationship epoch',()=>{
 const base=fixture(),reference=compileOrdinaryHalfHeyFigure(figure,base),mapping=new Map([[0,17],[1,4],[2,12],[3,1]]),delta={x:3.25,z:-7.5},ids=base.ids.map(id=>mapping.get(id)!),start:Pose[]=[],dancers:Dancer[]=[];
 for(const id of base.ids){const key=mapping.get(id)!;start[key]={...structuredClone(base.start[id]),id:key,position:{x:base.start[id].position.x+delta.x,z:base.start[id].position.z+delta.z}};dancers[key]={...base.dancers[id],id:key};}
 const remap=(relation:ReadonlyMap<number,number>)=>new Map([...relation].map(([a,b])=>[mapping.get(a)!,mapping.get(b)!]));
 const context:FigureContext={ids,start,dancers,relations:{epoch:7,partner:remap(base.relations.partner),neighbor:remap(base.relations.neighbor)},bindingEpoch:7,next:{...next,id:'different-successor',label:'Same bound people circle once without hands'}};
 const plan=compileOrdinaryHalfHeyFigure({...figure,id:'different-hey',label:'Unrelated reusable composition'},context);
 for(const t of[0,.25,3.75/8,5.5/8,7.25/8,1])for(const id of base.ids){const actual=plan.position(mapping.get(id)!,t),expected=reference.position(id,t);assert.ok(gap(actual,{x:expected.x+delta.x,z:expected.z+delta.z})<1e-8);assert.ok(turn(plan.facing(mapping.get(id)!,t,[]),reference.facing(id,t,[]))<1e-8);assert.deepEqual(plan.contacts(t,start),[]);}
 assert.throws(()=>compileOrdinaryHalfHeyFigure(figure,{...context,bindingEpoch:8}),/stale/);
});

test('the new exit requires a literal same-relation gyre4/right/full1 and consumes every source declaration',()=>{
 const context=fixture();
 for(const patch of[{beats:4},{amount:1},{heyStartRole:'robin'},{centerShoulder:'right'},{endShoulder:'left'},{who:'partner'},{progression:true},{confidence:'unsupported'},{heyAxis:'diagonal'},{heyStartPair:'partner'},{notation:'(8) Hey 1/2 (ML;PR;WL;NR)'},{hands:'right'}])assert.throws(()=>compileOrdinaryHalfHeyFigure({...figure,...patch} as Figure,context),JSON.stringify(patch));
 assert.throws(()=>compileOrdinaryHalfHeyFigure(figure,{...context,next:undefined}),/same-pair/);
 for(const patch of[{kind:'swing'},{who:'partner'},{beats:8},{beats:NaN},{passingShoulder:'left'},{amount:.5},{amount:2},{progression:true},{confidence:'unsupported'},{hands:'right'},{entry:'paired-sidelines'},{notes:{}},{id:''}])assert.throws(()=>compileOrdinaryHalfHeyFigure(figure,{...context,next:{...next,...patch} as Figure}),JSON.stringify(patch));
 let reads=0;
 for(const decorate of[(f:object)=>Object.defineProperty(f,'hidden',{value:true}),(f:object)=>Object.defineProperty(f,Symbol('extra'),{value:true,enumerable:true}),(f:object)=>Object.defineProperty(f,'notes',{enumerable:true,get:()=>{reads++;return '';}})]){const raw={...next};decorate(raw);assert.throws(()=>compileOrdinaryHalfHeyFigure(figure,{...context,next:raw}),/accessors, symbols or hidden/);}
 assert.equal(reads,0);assert.throws(()=>compileOrdinaryHalfHeyFigure(figure,{...context,next:Object.assign(Object.create({extra:true}),next)}),/ordinary object and array prototypes/);
 assert.throws(()=>compileOrdinaryHalfHeyFigure(figure,{...context,relations:{...context.relations,neighbor:new Map([[0,1],[1,0],[2,3],[3,2]])}}),/bound relationships/);
});

test('the new hand-free plan owns figure, successor, actors, positions and relation bindings',()=>{
 const context=fixture(),f=structuredClone(figure),plan=compileOrdinaryHalfHeyFigure(f,context),expected=frame(context,plan,.6);
 f.beats=1;context.next!.amount=2;context.ids[0]=99;context.start[0].position.x=999;context.dancers[0].role='robin';(context.relations.neighbor as Map<number,number>).set(0,1);
 const clean=fixture();assert.deepEqual(frame(clean,plan,.6),expected);const p=plan.position(0,.6);p.x=999;assert.deepEqual(frame(clean,plan,.6),expected);assert.throws(()=>plan.position(99,.6),/outside/);
});

test('all previous compact exits and supported wide exits preserve frozen frame bytes',()=>{
 // Original hashes were frozen before adding the gyre branch; the separately
 // admitted wide-balance case is frozen now. Each includes every root, yaw and
 // hand contact at 65 samples using the unchanged actual allemande producer.
 const hashes:Record<string,string>={
  '1.1/opposite-paired-balance':'9645969b177092395deff6b15dc81eb2d46d67eadb98b3db6142eded6674d0e4',
  '1.1/opposite-paired-swing':'9690779ab1370ab82571c3950e0acbca246572bb1d16dda4bea89b93dbe88c2a',
  '1.1/progressed-neighbors':'7bcb73ffd0546c73514d3587ebf206dbd849d919819c2027d5e5fc41a8aaa66f',
  // Wide balance was admitted separately; its speed, clearance and named gates
  // are certified in ordinary-half-hey-wide-balance.test.ts.
  '1.8/opposite-paired-balance':'b789e4f21de997878ca580e02ff70322ec7fb5bf742f939140b28f28a7ff897b',
  '1.8/opposite-paired-swing':'08c08c61070442e7c710e6e054d4ca85c4fc21ea74e88a6c44855eda3f4efcb5',
  '1.8/progressed-neighbors':'f4e5d92791d5ebe29f5c378bef024d474680271d78772baba1cb64c15166e6fb'
 };
 for(const width of[1.1,1.8])for(const exit of['opposite-paired-balance','opposite-paired-swing','progressed-neighbors'] as const){
  const context=fixture();for(const pose of context.start)pose.position.z*=width/1.1;
  context.next=exit==='progressed-neighbors'?undefined:{id:'next',label:'Next',kind:exit==='opposite-paired-balance'?'balance':'swing',who:'neighbor',beats:exit==='opposite-paired-balance'?4:12};
  const old={...figure,exit,...(exit==='progressed-neighbors'?{progression:true}:{})};
  const plan=compileOrdinaryHalfHeyFigure(old,context),frames=Array.from({length:65},(_,i)=>frame(context,plan,i/64));
  assert.equal(createHash('sha256').update(JSON.stringify(frames)).digest('hex'),hashes[`${width}/${exit}`],`${width}/${exit}`);
 }
});
