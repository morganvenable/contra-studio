import test from 'node:test';
import assert from 'node:assert/strict';
import {compilePromenade,type PromenadeOptions,type PromenadeConstraint} from './promenade.ts';
import {compilePromenadeFigure} from './promenade-adapter.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Dancer,Figure,Pose} from './types.ts';
const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:`Actor ${id}`,role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
const paired=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
function fixture():PromenadeOptions {
 const entry=new Map<number,PromenadeConstraint>(),exit=new Map<number,PromenadeConstraint>();
 // Persistent partners remain 0/1 and 2/3. The incoming physical neighbor
 // pairs are 0/3 and 2/1; changing text cannot alter these actual slots.
 for(const[l,r,d]of[[0,3,1],[2,1,-1]])for(const[id,s]of[[l,-d],[r,d]]){
  entry.set(id,{position:{x:-d*.9,z:s*.34},yaw:d*Math.PI/2,velocity:{x:0,z:0},yawRate:0});
  exit.set(id,{position:{x:d*.9,z:-s*.9},yaw:d*Math.PI/2+Math.PI,velocity:{x:0,z:0},yawRate:0});
 }
 return{actors:structuredClone(actors),entry,exit,relations:{epoch:7,partner:paired([[0,1],[2,3]]),neighbor:paired([[0,3],[1,2]])},bindingEpoch:7,pairs:[{leaderId:0,followerId:3,relationship:'neighbor'},{leaderId:2,followerId:1,relationship:'neighbor'}],passingShoulder:'left',turnDirection:'left',hold:'skaters',frame:{origin:{x:0,z:0},across:{x:1,z:0}},beats:8,crossingBeats:4};
}
function context(o=fixture()):FigureContext {const start:Pose[]=[];for(const[id,p]of o.entry)start[id]={id,position:{...p.position},yaw:p.yaw,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'};return{ids:o.actors.map(a=>a.id),dancers:[...o.actors],start,relations:o.relations,bindingEpoch:o.bindingEpoch};}
const figure=():Figure=>({id:'source-bound-neighbor-promenade',kind:'promenade',beats:8,label:'neighbors promenade',who:'neighbor',entry:'side-couples',amount:.5,direction:'left',hands:'both',courtesyLeader:'lark',promenadeRoute:'across-set',passingShoulder:'left',promenadeHold:'skaters',confidence:'approximate'});
test('explicit current neighbors promenade together without replacing persistent partners or rebinding at the endpoint',()=>{
 const o=fixture(),p=compilePromenade(o),c=context(o),adapted=compilePromenadeFigure(figure(),c);
 assert.equal(p.epoch,7);assert.deepEqual(p.pairs,o.pairs);
 for(let i=0;i<=1600;i++){const beat=i/200,f=p.sample(beat),hands=new Set<string>();for(const a of f.poses){assert.ok(distance(a.position,adapted.position(a.id,beat/8))<1e-9);for(const b of f.poses)if(a.id<b.id)assert.ok(distance(a.position,b.position)>=.66-1e-9);}
  for(const h of f.contacts){assert.equal(o.relations.neighbor.get(h.a),h.b);assert.notEqual(actors[h.a].couple,actors[h.b].couple);assert.equal(h.handA,h.handB);for(const owner of[`${h.a}/${h.handA}`,`${h.b}/${h.handB}`]){assert.ok(!hands.has(owner));hands.add(owner);}}
  if(beat>=.5&&beat<=7)assert.equal(f.contacts.length,4);
 }
 for(const id of c.ids){assert.deepEqual(p.entry.get(id),o.entry.get(id));assert.ok(distance(p.sample(8).poses.find(a=>a.id===id)!.position,o.exit.get(id)!.position)<1e-8);}
 const gate=p.sample(2);for(const id of[0,2]){const a=gate.poses.find(a=>a.id===id)!,b=gate.poses.find(a=>a.id!==id&&actors[a.id].role==='lark')!,left={x:Math.cos(a.yaw),z:-Math.sin(a.yaw)};assert.ok((b.position.x-a.position.x)*left.x+(b.position.z-a.position.z)*left.z>.659);}
 assert.deepEqual([...o.relations.partner],[[0,1],[1,0],[2,3],[3,2]]);assert.deepEqual([...o.relations.neighbor],[[0,3],[3,0],[1,2],[2,1]]);
});
test('named relation is consumed independently of title, actual slots and role; stale or mislabeled pairs fail closed',()=>{
 const f=figure(),c=context(),p=compilePromenadeFigure(f,c),q=compilePromenadeFigure({...f,label:'partners promenade'},c);
 for(const id of c.ids)assert.deepEqual(p.position(id,.5),q.position(id,.5));
 assert.throws(()=>compilePromenadeFigure({...f,who:'partner'},c),/left slot/,'partner names cannot repair physical neighbor slots');
 for(const who of['all','next-neighbor','shadow',undefined])assert.throws(()=>compilePromenadeFigure({...f,who}as Figure,c));
 for(const key of['entry','amount','direction','hands','courtesyLeader','promenadeRoute','passingShoulder','promenadeHold']as const){const incomplete={...f};delete incomplete[key];assert.throws(()=>compilePromenadeFigure(incomplete,c),key);}
 assert.throws(()=>compilePromenadeFigure(f,{...c,bindingEpoch:8}),/stale/);
 const wrong=fixture();wrong.pairs=wrong.pairs.map(p=>({...p,relationship:'partner'}));assert.throws(()=>compilePromenade(wrong),/binding/);
 const stale=fixture();stale.relations={...stale.relations,neighbor:stale.relations.partner};assert.throws(()=>compilePromenade(stale),/couple identity/);
 const mirrored=context();for(const p of mirrored.start)p.position.z*=-1;assert.throws(()=>compilePromenadeFigure(f,mirrored),/left slot/);
 const wide=context();for(const p of wide.start)p.position.z=Math.sign(p.position.z)*.9;assert.throws(()=>compilePromenadeFigure(f,wide),/speed/,'unprepared allemande/wide ingress cannot be relabeled into a compact swing exit');
});
test('neighbor binding and geometry are immutable snapshots under arbitrary actor IDs and rigid frames',()=>{
 const o=fixture(),p=compilePromenade(o),theta=.63,origin={x:2.3,z:-1.7},rename=new Map([[0,81],[1,17],[2,402],[3,6]]),id=(n:number)=>rename.get(n)!,rotate=(v:{x:number;z:number})=>({x:v.x*Math.cos(theta)-v.z*Math.sin(theta),z:v.x*Math.sin(theta)+v.z*Math.cos(theta)});
 const endpoints=(m:ReadonlyMap<number,PromenadeConstraint>)=>new Map([...m].map(([n,e])=>{const r=rotate(e.position);return[id(n),{...e,position:{x:r.x+origin.x,z:r.z+origin.z},yaw:e.yaw-theta,velocity:rotate(e.velocity)}];})),relations=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[id(a),id(b)]));
 const q=compilePromenade({...o,actors:o.actors.map(a=>({...a,id:id(a.id)})),entry:endpoints(o.entry),exit:endpoints(o.exit),pairs:o.pairs.map(pair=>({...pair,leaderId:id(pair.leaderId),followerId:id(pair.followerId)})),relations:{epoch:7,partner:relations(o.relations.partner),neighbor:relations(o.relations.neighbor)},frame:{origin,across:rotate({x:1,z:0})}});
 for(let beat=0;beat<=8;beat+=.125)for(const a of p.sample(beat).poses){const b=q.sample(beat).poses.find(b=>b.id===id(a.id))!,r=rotate(a.position);assert.ok(distance(b.position,{x:r.x+origin.x,z:r.z+origin.z})<1e-8);assert.ok(Math.abs(b.yaw-(a.yaw-theta))<1e-8);}
 const before=p.sample(5);(o.relations.neighbor as Map<number,number>).clear();o.entry.get(0)!.position.x=99;assert.deepEqual(p.sample(5),before);
});
