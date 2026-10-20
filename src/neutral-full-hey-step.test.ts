import test from 'node:test';
import assert from 'node:assert/strict';
import {compileNeutralFullHeyStep} from './neutral-full-hey-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff,sampleSequenceBoundary,ownSequenceBoundary} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {createDancers,compilePrimitiveFigure} from './engine.ts';
import type {Figure,Pose} from './types.ts';
import type {FigureContext} from './extended-figures.ts';

const figure=(neighbor=false):Figure=>({id:'neutral-hey',label:'Literal full hey',kind:'hey',beats:16,amount:1,who:neighbor?'neighbor':'partner',heyStartRole:neighbor?'lark':'robin',centerShoulder:neighbor?'left':'right',endShoulder:neighbor?'right':'left',entry:'paired-sidelines',exit:'same-slots-facing-across'});
const context=(neighbor=false,width=.9,depth=.55):FigureContext=>({ids:[0,1,2,3],dancers:createDancers(2),start:(neighbor?[[1,1],[-1,1],[-1,-1],[1,-1]]:[[-1,-1],[-1,1],[1,1],[1,-1]]).map(([x,z],id)=>({id,position:{x:x*width,z:z*depth},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'hey'})),relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:7});
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('cohort stances prove literal eight-layer named pass order and exact own-station return in sixteen counts',()=>{
 const oracles=[
  {tokens:['WR','NL','MR','PL','WR','NL','MR','PL'],order:['0','1','3','2'],pairs:[[[1,3]],[[0,3],[1,2]],[[0,2]],[[3,2],[0,1]],[[3,1]],[[2,1],[3,0]],[[2,0]],[[1,0],[2,3]]]},
  {tokens:['ML','PR','WL','NR','ML','PR','WL','NR'],order:['1','2','0','3'],pairs:[[[2,0]],[[1,0],[2,3]],[[1,3]],[[0,3],[1,2]],[[0,2]],[[3,2],[0,1]],[[3,1]],[[2,1],[3,0]]]}
 ];
 for(const neighbor of[false,true]){
  const c=context(neighbor),incoming=captureSequenceBoundary(c,16,[]),plan=compileNeutralFullHeyStep(figure(neighbor),c,incoming),h=plan.heyPlan,want=oracles[Number(neighbor)];
  assert.equal(h.beats,16);assert.deepEqual(h.events.map(e=>e.token.raw),want.tokens);assert.deepEqual(h.events.map(e=>e.pairs.map(p=>p.map(Number))),want.pairs);assert.deepEqual(h.endOrder,want.order);
  assert.equal(h.events.reduce((n,e)=>n+e.pairs.length,0),12);assert.ok(h.events.every(e=>e.token.completion==='complete'));assert.deepEqual(h.gates.map(g=>g.beat),[2,3.75,5.5,7.25,9,10.75,12.5,14.25]);
  assert.deepEqual(plan.entryState,incoming);assert.deepEqual(plan.exitState,{...incoming,sourceBeat:32});
  for(const id of c.ids)assert.deepEqual(plan.position(id,1),c.start[id].position);
  for(const[i,g]of h.gates.entries()){
   const at=h.sample(g.beat);assert.deepEqual(plan.contacts(g.beat/16,[]),[]);
   for(const[a,b]of want.pairs[i]){const A=at.poses.find(p=>p.id===String(a))!,B=at.poses.find(p=>p.id===String(b))!,projection=(B.position.x-A.position.x)*-Math.cos(A.yaw)+(B.position.z-A.position.z)*Math.sin(A.yaw);assert.ok(projection*(g.shoulder==='right'?1:-1)>.5);}
  }
  assert.ok(h.minimumCertifiedClearance>=.5);assert.ok(h.maximumCertifiedSpeed<=1.3);assert.ok(h.maximumCertifiedYawRate<=4);
  for(const beat of h.phaseBoundaries.filter(b=>b>0&&b<16))for(const id of c.ids){assert.ok(gap(plan.position(id,(beat-1e-7)/16),plan.position(id,(beat+1e-7)/16))<1e-5);assert.ok(turn(plan.facing(id,(beat-1e-7)/16,[]),plan.facing(id,(beat+1e-7)/16,[]))<1e-5);}
 }
});

test('a changed producer and different compatible successor use the actual translated measured boundary',()=>{
 const c=context(false,.82,.6),lines:Figure={id:'unseen-lines',label:'Synthetic long lines',kind:'long-lines',beats:8,who:'all'};
 for(const p of c.start){p.position.x+=2;p.position.z-=4;}
 const producer=compilePrimitiveFigure(lines,c.ids,c.start,c.dancers,[1,-1]),start=sampleFormationEndpoint(c,producer,1),producerExit=sampleSequenceBoundary(c,producer,21.5,1),incomingContext={...c,start,next:lines};
 const plan=compileNeutralFullHeyStep({...figure(),id:'unrelated-source',label:'Changed producer and consumer'},incomingContext,producerExit);
 assertSequenceHandoff(producerExit,plan.entryState);assert.deepEqual(plan.exitState,{...producerExit,sourceBeat:37.5});
 const after={...incomingContext,start:sampleFormationEndpoint(incomingContext,plan,1)},successor=compilePrimitiveFigure(lines,after.ids,after.start,after.dancers,[1,-1]);
 assertSequenceHandoff(plan.exitState,sampleSequenceBoundary(after,successor,37.5,0));
 // Neither a successor kind nor even the presence of one is consumed here.
 for(const next of[undefined,{...lines,kind:'unknown' as const}]){
  const other=compileNeutralFullHeyStep(figure(),{...incomingContext,next},producerExit);
  for(const id of c.ids)for(const t of[0,.27,.75,1]){assert.deepEqual(plan.position(id,t),other.position(id,t));assert.equal(plan.facing(id,t,[]),other.facing(id,t,[]));}
 }
});

test('entry facing is consumed continuously, while the neutral output explicitly declares across-facing',()=>{
 const c=context();for(const p of c.start)p.yaw+=.12;
 const incoming=captureSequenceBoundary(c,0,[]),plan=compileNeutralFullHeyStep(figure(),c,incoming);
 assertSequenceHandoff(incoming,plan.entryState);
 for(const p of plan.exitState.poses){assert.deepEqual(p.position,c.start[p.id].position);assert.equal(p.yaw,p.position.x<0?Math.PI/2:-Math.PI/2);}
 assert.deepEqual(plan.exitState.heldContacts,[]);
});

test('neutral declarations reject hidden modifiers, different exit contracts, progression, malformed metadata and unconsumed variants',()=>{
 const c=context(),incoming=captureSequenceBoundary(c,0,[]);
 for(const patch of[{beats:8},{amount:.5},{progression:true},{who:'all'},{exit:'same-person-swing'},{exit:'same-slots-partner-balance'},{exit:'progressed-neighbors'},{entry:'ring'},{centerShoulder:'left'},{endShoulder:'right'},{heyStartRole:'lark'},{heyAxis:'across'},{notation:'(16) Hey (WR;NL;MR;PL;WR;NL;MR;PL)'},{heyStartPair:'partner'},{hands:'right'},{direction:'left'},{underRole:'robin'},{confidence:'unsupported'},{id:''},{label:3},{notes:{}},{beats:NaN},{progression:'yes'}])assert.throws(()=>compileNeutralFullHeyStep({...figure(),...patch}as Figure,c,incoming));
 for(const key of['hiddenExtra',Symbol('hidden')]){const f=figure();Object.defineProperty(f,key,{value:1});assert.throws(()=>compileNeutralFullHeyStep(f,c,incoming),/hidden|symbol/);}
 let reads=0;const f=figure();Object.defineProperty(f,'beats',{enumerable:true,get:()=>{reads++;return 16;}});assert.throws(()=>compileNeutralFullHeyStep(f,c,incoming),/accessor/);assert.equal(reads,0);
});

test('the measured seam rejects stale, held, mismatched and invalid roots without repairing them',()=>{
 const c=context(),incoming=captureSequenceBoundary(c,0,[]);
 assert.throws(()=>compileNeutralFullHeyStep(figure(),{...c,bindingEpoch:8},incoming),/stale/);
 assert.throws(()=>compileNeutralFullHeyStep(figure(),c,ownSequenceBoundary({...incoming,relationshipEpoch:8})),/relationshipEpoch/);
 const held=ownSequenceBoundary({...incoming,heldContacts:[{a:0,b:1,handA:'left',handB:'right',kind:'joined',point:{x:-.9,y:1.18,z:0},strength:5e-8}]});assert.throws(()=>compileNeutralFullHeyStep(figure(),c,held),/released incoming/);
 const shifted=context();shifted.start[0].position.x+=.1;assert.throws(()=>compileNeutralFullHeyStep(figure(),shifted,incoming),/root or facing/);assert.throws(()=>compileNeutralFullHeyStep(figure(),shifted,captureSequenceBoundary(shifted,0,[])),/sidelines/);
 assert.throws(()=>compileNeutralFullHeyStep({...figure(),who:'neighbor'},c,incoming),/named pairs/);
 const tooWide=context(false,4);assert.throws(()=>compileNeutralFullHeyStep(figure(),tooWide,captureSequenceBoundary(tooWide,0,[])),/speed|undeclared|clearance/i);
 const plan=compileNeutralFullHeyStep(figure(),c,incoming);for(const t of[NaN,Infinity]){assert.throws(()=>plan.position(0,t),/finite/);assert.throws(()=>plan.contacts(t,[]),/finite/);}assert.throws(()=>plan.position(99,.3),/outside/);
});

test('owned inputs, opaque actor IDs and mutated returned samples cannot change the compiled path',()=>{
 const c=context(),f=figure(),incoming=captureSequenceBoundary(c,10,[]),plan=compileNeutralFullHeyStep(f,c,incoming),expected=plan.position(0,.3),map=new Map([[0,17],[1,4],[2,12],[3,1]]),start:Pose[]=[],dancers:FigureContext['dancers']=[];
 for(const id of c.ids){const to=map.get(id)!;start[to]={...structuredClone(c.start[id]),id:to};dancers[to]={...c.dancers[id],id:to};}
 const remap=(pairs:ReadonlyMap<number,number>)=>new Map([...pairs].map(([a,b])=>[map.get(a)!,map.get(b)!]));
 const changed={...c,ids:c.ids.map(id=>map.get(id)!),start,dancers,relations:{epoch:7,partner:remap(c.relations.partner),neighbor:remap(c.relations.neighbor)}},mapped=compileNeutralFullHeyStep({...f,id:'opaque-id'},changed,captureSequenceBoundary(changed,10,[]));
 for(const id of c.ids)for(const t of[0,.17,.5,.91,1]){assert.deepEqual(plan.position(id,t),mapped.position(map.get(id)!,t));assert.equal(plan.facing(id,t,[]),mapped.facing(map.get(id)!,t,[]));}
 f.beats=1;c.ids[0]=99;c.start[0].position.x=100;(c.relations.partner as Map<number,number>).set(0,3);assert.deepEqual(plan.position(0,.3),expected);
 const sample=plan.position(0,.3);sample.x=999;assert.deepEqual(plan.position(0,.3),expected);assert.throws(()=>{(plan.exitState.poses as any)[0].position.x=100;});assert.throws(()=>{(plan.heyPlan.events[0].pairs as any)[0][0]='wrong';});
});
