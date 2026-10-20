import test from 'node:test';
import assert from 'node:assert/strict';
import {compileOrdinaryFullHeyFigure} from './ordinary-full-hey.ts';
import {createDancers} from './engine.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure,Pose} from './types.ts';
const figure=():Figure=>({id:'source-full-hey',label:'ladles start a full hey - rights in center, lefts on ends',kind:'hey',beats:16,amount:1,who:'neighbor',heyStartRole:'robin',centerShoulder:'right',endShoulder:'left',entry:'paired-sidelines',exit:'progressed-neighbors',progression:true});
const context=():FigureContext=>({ids:[0,1,2,3],dancers:createDancers(2),start:[[.9,.55],[-.9,.55],[-.9,-.55],[.9,-.55]].map(([x,z],id)=>({id,position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'hey'})),relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0});
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('full hey has the independent literal eight-layer and twelve-encounter oracle and returns the same corners',()=>{
 const c=context(),p=compileOrdinaryFullHeyFigure(figure(),c),h=p.heyPlan;
 const pairs=[[[1,3]],[[2,3],[1,0]],[[2,0]],[[3,0],[2,1]],[[3,1]],[[0,1],[3,2]],[[0,2]],[[1,2],[0,3]]];
 assert.deepEqual(h.events.map(e=>e.token.raw),['WR','PL','MR','NL','WR','PL','MR','NL']);
 assert.deepEqual(h.events.map(e=>e.pairs.map(pair=>pair.map(Number))),pairs);
 assert.deepEqual(h.endOrder,['2','1','3','0']);assert.equal(h.events.reduce((n,e)=>n+e.pairs.length,0),12);
 for(const[id,x,z,yaw]of[[0,.9,.9,0],[1,-.9,.9,0],[2,-.9,-.9,Math.PI],[3,.9,-.9,Math.PI]]){assert.deepEqual(p.position(id,1),{x,z});assert.equal(p.facing(id,1,[]),yaw);}
 // An independent geometric shoulder check evaluates each directed encounter.
 for(const [index,g]of h.gates.entries()){
  const at=h.sample(g.beat);assert.deepEqual(at.contacts,[]);assert.deepEqual(p.contacts(g.beat/16,[]),[]);
  for(const[a,b]of pairs[index]){const A=at.poses.find(p=>p.id===String(a))!,B=at.poses.find(p=>p.id===String(b))!,relative={x:B.position.x-A.position.x,z:B.position.z-A.position.z},right={x:-Math.cos(A.yaw),z:Math.sin(A.yaw)};assert.ok((relative.x*right.x+relative.z*right.z)*(index%2===0?1:-1)>.3,`${index}/${a}/${b} named shoulder`);}
 }
 assert.ok(h.minimumCertifiedClearance>=.5);assert.ok(h.maximumCertifiedSpeed<=1.3);assert.ok(h.maximumCertifiedYawRate<=4);
});

test('all four starting-role/shoulder variants retain their mirrored pass identities without invented station permutations',()=>{
 for(const role of['lark','robin'] as const)for(const shoulder of['left','right'] as const){const c=context(),f=figure();f.heyStartRole=role;f.centerShoulder=shoulder;f.endShoulder=shoulder==='right'?'left':'right';if((role==='robin')!==(shoulder==='right'))for(const p of c.start){p.position.z*=-1;}
  const p=compileOrdinaryFullHeyFigure(f,c);assert.equal(p.heyPlan.events[0].token.selector,role==='lark'?'larks':'robins');assert.equal(p.heyPlan.events[0].token.shoulder,shoulder);for(const id of c.ids){const start=c.start[id].position,end=p.position(id,1);assert.equal(Math.sign(start.x),Math.sign(end.x));assert.equal(Math.sign(start.z),Math.sign(end.z));}
 }
});

test('full hey rejects unsupported amount, timing, modifiers, stale relations, following figures and wrong role order',()=>{
 for(const patch of[{confidence:'unsupported'},{amount:.5},{beats:8},{who:'partner'},{exit:'opposite-paired-balance'},{entry:'side-couples'},{centerShoulder:'left'},{endShoulder:'right'},{heyStartRole:'lark'},{notation:'(16) Hey (WR;PL;MR;NL;WR;PL;MR;NL)'},{hands:'right'},{direction:'left'},{underRole:'robin'},{progression:'yes'}])assert.throws(()=>compileOrdinaryFullHeyFigure({...figure(),...patch} as Figure,context()),JSON.stringify(patch));
 assert.throws(()=>compileOrdinaryFullHeyFigure(figure(),{...context(),next:{id:'next',label:'next',kind:'balance',who:'neighbor',beats:4}}),/end the repeat/);
 assert.throws(()=>compileOrdinaryFullHeyFigure(figure(),{...context(),bindingEpoch:1}),/stale/);
 const c=context();[c.start[0].position,c.start[3].position]=[c.start[3].position,c.start[0].position];assert.throws(()=>compileOrdinaryFullHeyFigure(figure(),c));
});

test('full hey owns its inputs and output evidence and binds opaque actor IDs rather than numeric pairs',()=>{
 const f=figure(),base=context(),p=compileOrdinaryFullHeyFigure(f,base),expected=p.position(0,.4),yaw=p.facing(0,.4,[]);
 f.beats=1;base.ids[0]=99;base.start[0].position.x=999;(base.relations.partner as Map<number,number>).set(0,3);assert.deepEqual(p.position(0,.4),expected);assert.equal(p.facing(0,.4,[]),yaw);
 const result=p.position(0,.4);result.x=999;assert.deepEqual(p.position(0,.4),expected);assert.throws(()=>p.position(99,.5),/outside/);assert.throws(()=>{(p.heyPlan.events[0].pairs as string[][])[0][0]='999';});
 const original=context(),mapped=new Map([[0,17],[1,4],[2,12],[3,1]]),ids=original.ids.map(id=>mapped.get(id)!),start:Pose[]=[],dancers=structuredClone(original.dancers).slice(0,0);
 for(const id of original.ids){const next=mapped.get(id)!;start[next]={...structuredClone(original.start[id]),id:next};dancers[next]={...original.dancers[id],id:next};}
 const remap=(pairs:ReadonlyMap<number,number>)=>new Map([...pairs].map(([a,b])=>[mapped.get(a)!,mapped.get(b)!]));
 const changed={...original,ids,start,dancers,relations:{epoch:0,partner:remap(original.relations.partner),neighbor:remap(original.relations.neighbor)}},ordinary=compileOrdinaryFullHeyFigure(figure(),original),opaque=compileOrdinaryFullHeyFigure(figure(),changed);
 for(const t of[0,.125,.5,.75,1])for(const id of original.ids){assert.deepEqual(opaque.position(mapped.get(id)!,t),ordinary.position(id,t));assert.equal(opaque.facing(mapped.get(id)!,t,[]),ordinary.facing(id,t,[]));}
});

test('full hey entrance, all pass joins and terminal turn have continuous positions and facing',()=>{
 const p=compileOrdinaryFullHeyFigure(figure(),context());for(const beat of p.heyPlan.phaseBoundaries.filter(b=>b>0&&b<16))for(let id=0;id<4;id++){assert.ok(gap(p.position(id,(beat-1e-7)/16),p.position(id,(beat+1e-7)/16))<1e-5);assert.ok(angle(p.facing(id,(beat-1e-7)/16,[]),p.facing(id,(beat+1e-7)/16,[]))<1e-5);}
});
