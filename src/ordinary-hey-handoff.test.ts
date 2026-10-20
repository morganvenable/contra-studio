import test from 'node:test';
import assert from 'node:assert/strict';
import {compileOrdinaryFullHeyHandoff} from './ordinary-hey-handoff.ts';
import {assertFormationHandoff,assertSuccessorEntry,captureFormationState,sampleFormationEndpoint} from './formation-handoff.ts';
import {createDancers,compilePrimitiveFigure} from './engine.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure,Pose} from './types.ts';
const f=(swing=false):Figure=>({id:'ordinary-full',label:'robins full hey',kind:'hey',beats:16,amount:1,who:'partner',heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',entry:'paired-sidelines',exit:swing?'same-person-swing':'same-slots-partner-balance'});
const context=(swing=false):FigureContext=>({ids:[0,1,2,3],dancers:createDancers(2),start:[[-.9,-.55],[-.9,.55],[.9,.55],[.9,-.55]].map(([x,z],id)=>({id,position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'hey'})),relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:7,next:{id:'next',label:'partner successor',kind:swing?'swing':'balance',beats:swing?16:4,who:'partner'}});
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
test('literal full-hey encounters, opposite shoulders and same-station permutation are independently checked',()=>{
 for(const swing of[false,true]){
  const c=context(swing),p=compileOrdinaryFullHeyHandoff(f(swing),c,16),h=p.heyPlan;
  const oracle=[[[1,3]],[[0,3],[1,2]],[[0,2]],[[3,2],[0,1]],[[3,1]],[[2,1],[3,0]],[[2,0]],[[1,0],[2,3]]];
  assert.deepEqual(h.events.map(e=>e.token.raw),['WR','NL','MR','PL','WR','NL','MR','PL']);
  assert.deepEqual(h.events.map(e=>e.pairs.map(p=>p.map(Number))),oracle);
  assert.deepEqual(h.endOrder,['0','1','3','2']);assert.equal(h.events.reduce((n,e)=>n+e.pairs.length,0),12);
  for(const[i,g]of h.gates.entries()){const at=h.sample(g.beat);assert.equal(p.contacts(g.beat/16,[]).length,0);for(const[a,b]of oracle[i]){const A=at.poses.find(p=>p.id===String(a))!,B=at.poses.find(p=>p.id===String(b))!;const projection=(B.position.x-A.position.x)*-Math.cos(A.yaw)+(B.position.z-A.position.z)*Math.sin(A.yaw);assert.ok(projection*(i%2===0?1:-1)>.3);}}
  assert.equal(p.entryState.sourceBeat,16);assert.equal(p.exitState.sourceBeat,32);assert.equal(p.exitState.relationshipEpoch,7);assert.deepEqual(p.exitState.partner,p.entryState.partner);assert.deepEqual(p.exitState.neighbor,p.entryState.neighbor);
  assert.ok(h.minimumCertifiedClearance>=.5);assert.ok(h.maximumCertifiedSpeed<=1.3);assert.ok(h.maximumCertifiedYawRate<=4);
  const terminal=sampleFormationEndpoint(c,p,1),successor=compilePrimitiveFigure(c.next!,c.ids,terminal,c.dancers,[1,-1],swing?{swingEntry:'prepared-circle'}:{});
  assertSuccessorEntry(p.exitState,{...c,start:terminal},successor);
  for(const id of c.ids){assert.equal(Math.sign(p.position(id,1).x),Math.sign(c.start[id].position.x));assert.equal(Math.sign(p.position(id,1).z),Math.sign(c.start[id].position.z));}
  for(const beat of h.phaseBoundaries.filter(b=>b>0&&b<16))for(const id of c.ids){assert.ok(gap(p.position(id,(beat-1e-7)/16),p.position(id,(beat+1e-7)/16))<1e-5);assert.ok(turn(p.facing(id,(beat-1e-7)/16,[]),p.facing(id,(beat+1e-7)/16,[]))<1e-5);}
 }
});
test('all role/shoulder mirrors preserve the same stations and source counts',()=>{
 for(const role of['lark','robin']as const)for(const shoulder of['left','right']as const){const c=context(),figure={...f(),heyStartRole:role,centerShoulder:shoulder,endShoulder:shoulder==='right'?'left':'right'}as Figure;if((role==='robin')!==(shoulder==='right'))for(const p of c.start)p.position.z*=-1;const plan=compileOrdinaryFullHeyHandoff(figure,c);assert.equal(plan.heyPlan.events[0].token.selector,role==='lark'?'larks':'robins');assert.equal(plan.heyPlan.events[0].token.shoulder,shoulder);for(const id of c.ids){assert.equal(Math.sign(plan.position(id,1).z),Math.sign(c.start[id].position.z));}assert.equal(plan.exitState.sourceBeat,16);}
});
test('the typed boundary rejects successor identity, epoch, geometry, clock, facing, root and contact repairs',()=>{
 const c=context(true),p=compileOrdinaryFullHeyHandoff(f(true),c),s=p.exitState;
 for(const edit of[(s:any)=>s.sourceBeat++,(s:any)=>s.relationshipEpoch++,(s:any)=>s.actors[0].couple++,(s:any)=>s.partner[0][1]=3,(s:any)=>s.neighbor[0][1]=1,(s:any)=>s.orderedSlots.reverse(),(s:any)=>s.orderedSlots[0].position.x+=.1,(s:any)=>s.orderedSlots[0].facing+=.1,(s:any)=>s.geometry.halfWidth=1,(s:any)=>s.heldContacts.pop(),(s:any)=>s.heldContacts[0].underId=1,(s:any)=>s.heldContacts[0].bodyBlend=.5,(s:any)=>s.heldContacts[0].bodyPoint={x:0,y:0,z:0}]){const altered=structuredClone(s);edit(altered);assert.throws(()=>assertFormationHandoff(s,altered));}
 const terminal=sampleFormationEndpoint(c,p,1);assert.throws(()=>assertSuccessorEntry(s,{...c,start:terminal},{position:(id)=>({...terminal[id].position,x:terminal[id].position.x+.01}),facing:id=>terminal[id].yaw,contacts:()=>[...s.heldContacts]}),/profile|reset/);
 assert.throws(()=>captureFormationState(c,{sourceBeat:0,orderedIds:c.ids,geometry:{...p.entryState.geometry,pairGap:.8}}),/actual paired roots/);
});
test('guards retain terminal, axis, count, shoulder, relation and unconsumed-modifier exclusions',()=>{
 for(const change of[{beats:8},{amount:.5},{progression:true},{who:'neighbor'},{exit:'progressed-neighbors'},{heyAxis:'across'},{heyAxis:'left-diagonal'},{centerShoulder:'left'},{endShoulder:'right'},{heyStartRole:'lark'},{notation:'(16) Hey (WR;NL;MR;PL;WR;NL;MR;PL)'},{hands:'right'},{direction:'left'},{underRole:'robin'},{confidence:'unsupported'}])assert.throws(()=>compileOrdinaryFullHeyHandoff({...f(),...change}as Figure,context()));
 for(const next of[undefined,{...context().next!,who:'neighbor'},{...context().next!,beats:8},{...context().next!,kind:'gyre'}])assert.throws(()=>compileOrdinaryFullHeyHandoff(f(),{...context(),next}as FigureContext));
 assert.throws(()=>compileOrdinaryFullHeyHandoff(f(),{...context(),bindingEpoch:8}),/stale/);
});
test('opaque stable IDs, input ownership and renamed figure IDs cannot change motion',()=>{
 const original=context(true),map=new Map([[0,17],[1,4],[2,12],[3,1]]),start:Pose[]=[],dancers:FigureContext['dancers']=[];
 for(const id of original.ids){const to=map.get(id)!;start[to]={...structuredClone(original.start[id]),id:to};dancers[to]={...original.dancers[id],id:to};}
 const relation=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[map.get(a)!,map.get(b)!]));
 const changed={...original,ids:original.ids.map(id=>map.get(id)!),start,dancers,relations:{epoch:7,partner:relation(original.relations.partner),neighbor:relation(original.relations.neighbor)}};
 const a=compileOrdinaryFullHeyHandoff(f(true),original),b=compileOrdinaryFullHeyHandoff({...f(true),id:'another-record',label:'Different title'},changed);
 for(const t of[0,.1,.25,.5,.9,1])for(const id of original.ids){assert.deepEqual(a.position(id,t),b.position(map.get(id)!,t));assert.equal(a.facing(id,t,[]),b.facing(map.get(id)!,t,[]));}
 const expected=a.position(0,.3);original.start[0].position.x=55;original.ids[0]=99;(original.relations.partner as Map<number,number>).set(0,3);assert.deepEqual(a.position(0,.3),expected);assert.throws(()=>{(a.exitState.orderedSlots as any)[0].position.x=99;});
 const result=a.position(0,.3);result.x=999;assert.deepEqual(a.position(0,.3),expected);
});

test('source ownership cannot erase symbol, hidden or accessor modifiers',()=>{
 for(const key of['hiddenExtra',Symbol('unknown')]){const figure=f();Object.defineProperty(figure,key,{value:true});assert.throws(()=>compileOrdinaryFullHeyHandoff(figure,context()),/hidden|Symbol/);}
 const getter=f();Object.defineProperty(getter,'beats',{enumerable:true,get:()=>16});assert.throws(()=>compileOrdinaryFullHeyHandoff(getter,context()),/accessor/);
 const c=context();Object.defineProperty(c.next!,'hiddenExtra',{value:true});assert.throws(()=>compileOrdinaryFullHeyHandoff(f(),c),/hidden/);
});

test('formation evidence rejects nonfinite, hidden, malformed and zero-strength unconsumed data',()=>{
 const c=context(true),p=compileOrdinaryFullHeyHandoff(f(true),c),state=p.exitState;
 for(const edit of[(s:any)=>s.orderedSlots[0].position.x=NaN,(s:any)=>s.orderedSlots[0].facing=NaN,(s:any)=>s.heldContacts[0].strength=-1,(s:any)=>s.heldContacts[0].strength=NaN,(s:any)=>s.heldContacts[0].point.x=Infinity,(s:any)=>s.heldContacts[0].bodyPoint={x:NaN,y:0,z:0},(s:any)=>s.partner[0]=[0,99],(s:any)=>s.actors[0].couple=NaN,(s:any)=>s.actors['00']=s.actors[0],(s:any)=>Object.defineProperty(s.geometry.origin,'ignored',{value:1}),(s:any)=>Object.defineProperty(s.heldContacts[0].point,'x',{enumerable:true,get:()=>0})]){const other=structuredClone(state);edit(other);assert.throws(()=>assertFormationHandoff(state,other));}
 for(const strength of[-1,NaN,Infinity]){const contact={...state.heldContacts[0],strength};assert.throws(()=>captureFormationState(c,{sourceBeat:0,orderedIds:c.ids,geometry:p.entryState.geometry,heldContacts:[contact]}));}
 const contact={...state.heldContacts[0],strength:0}as any;contact.bodyPoint={x:0,y:0,z:0,extra:true};assert.throws(()=>captureFormationState(c,{sourceBeat:0,orderedIds:c.ids,geometry:p.entryState.geometry,heldContacts:[contact]}));
});

test('raw source metadata and successor counts are bounded before cloning or arithmetic',()=>{
 for(const patch of[{id:''},{id:null},{label:3},{label:''},{notes:{}},{confidence:'yes'},{beats:NaN},{beats:Infinity}])assert.throws(()=>compileOrdinaryFullHeyHandoff({...f(),...patch}as any,context()),/metadata|source counts/);
 for(const beats of[NaN,Infinity,-1,65]){const c=context(true);c.next!.beats=beats;assert.throws(()=>compileOrdinaryFullHeyHandoff(f(true),c),/source counts/);}
});
