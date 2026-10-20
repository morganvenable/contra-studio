import test from'node:test';
import assert from'node:assert/strict';
import {compileSquareThrough,type SquareThroughOptions}from'./square-through.ts';
import {compileSquareThroughFigure,assertSquareThroughComposition,squareThroughPreparationBeats,type SquareThroughFigure}from'./square-through-adapter.ts';
import {assertFormationHandoff}from'./formation-handoff.ts';
import {distance,turn,type TurnConstraint}from'./ring-twirl-contract.ts';
import type{Dancer,Figure,Pose,Vec2}from'./types.ts';
const reciprocal=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
function fixture():SquareThroughOptions{
 const positions=[[-.9,-.9],[.9,-.9],[.9,.9],[-.9,.9]],actors:Dancer[]=positions.map((_,id)=>({id,name:`Actor ${id}`,role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'}));
 const entry=new Map(positions.map(([x,z],id)=>[id,{position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,velocity:{x:0,z:0},yawRate:0}]));
 const exit=new Map(positions.map(([x,z],id)=>[id,{position:{x:-x,z:-z},yaw:z<0?0:Math.PI,velocity:{x:0,z:0},yawRate:0}]));
 return{actors,entry,exit,relations:{epoch:11,partner:reciprocal([[0,1],[2,3]]),neighbor:reciprocal([[0,3],[1,2]])},bindingEpoch:11,frame:{origin:{x:0,z:0},axis:{x:0,z:1}},beats:8,phaseBeats:[4,2,2],passages:[{relation:'partner',hand:'right'},{relation:'neighbor',hand:'left'}]};
}
function context(){const o=fixture();return{ids:o.actors.map(a=>a.id),dancers:o.actors as Dancer[],start:o.actors.map(a=>({id:a.id,position:{...o.entry.get(a.id)!.position},yaw:o.entry.get(a.id)!.yaw,stride:0,lean:0,bounce:0,turn:0,activity:'long-lines'}as Pose)),relations:o.relations,bindingEpoch:o.bindingEpoch};}
const figure:SquareThroughFigure={id:'square',kind:'square-through',label:'Square through two',beats:8,amount:2,who:'all',hands:'right-left',entry:'partners-facing-across',exit:'progressed-neighbors',phaseBeats:[4,2,2],progression:true};

test('square-through owns a right-hand partner balance and two exact named passages within4+2+2',t=>{
 const o=fixture(),p=compileSquareThrough(o);assert.equal(p.epoch,11);assert.deepEqual(p.phaseBeats,[4,2,2]);assert.deepEqual(p.passages,o.passages);
 for(const beat of[1,2,3,4]){const f=p.sample(beat);for(const a of f.poses){assert.equal(a.balance?.otherId,o.relations.partner.get(a.id));assert.equal(a.balance?.progress,beat/4);}for(const c of f.contacts){assert.equal(o.relations.partner.get(c.a),c.b);assert.equal(c.handA,'right');assert.equal(c.handB,'right');}}
 const inside=p.sample(2),out=p.sample(4);assert.ok(distance(inside.poses[0].position,inside.poses[1].position)<distance(out.poses[0].position,out.poses[1].position),'Two inward counts, then an outward balance');
 for(const beat of[3.999999,4,4.000001]){const contacts=p.sample(beat).contacts;assert.equal(contacts.length,2);assert.ok(contacts.every(c=>c.strength>.99999),'Named right hand stays held through balance-to-pull handoff');}
 assert.deepEqual(p.gates.map(g=>[g.beat,g.relationship,g.hand]),[[5,'partner','right'],[5,'partner','right'],[7,'neighbor','left'],[7,'neighbor','left']]);
 for(const{beat,a,b,hand,relationship}of p.gates){
  assert.equal(o.relations[relationship as'partner'|'neighbor'].get(a),b);const f=p.sample(beat),A=f.poses.find(q=>q.id===a)!,B=f.poses.find(q=>q.id===b)!,axis=beat===5?'x':'z',d={x:B.position.x-A.position.x,z:B.position.z-A.position.z};
  assert.ok(Math.abs(d.x*Math.sin(A.yaw)+d.z*Math.cos(A.yaw))<1e-8);assert.ok((hand==='right'?1:-1)*(-d.x*Math.cos(A.yaw)+d.z*Math.sin(A.yaw))>.69999);
  const before=p.sample(beat-.001).poses,after=p.sample(beat+.001).poses;assert.ok((before[a].position[axis]-before[b].position[axis])*(after[a].position[axis]-after[b].position[axis])<0,'Actual ordered passage across the named gate');
  const contact=f.contacts.find(c=>c.a===a&&c.b===b)!;assert.equal(contact.handA,hand);assert.equal(contact.handB,hand);assert.ok(contact.strength>.99);
 }
 for(const id of[0,1,2,3]){assert.ok(distance(p.position(id,0),o.entry.get(id)!.position)<1e-8);assert.ok(distance(p.position(id,1),o.exit.get(id)!.position)<1e-8);assert.ok(Math.abs(turn(p.facing(id,1),o.exit.get(id)!.yaw))<1e-8);const mid=p.sample(6).poses[id],partner=o.entry.get(o.relations.partner.get(id)!)!.position;assert.ok(Math.abs(mid.position.x-partner.x*.55/.9)<1e-8&&Math.abs(mid.position.z-partner.z)<1e-8,'Only partner exchange completed after first passage');}
 for(const beat of[0,4,6,8]){const f=p.sample(beat);for(const q of f.poses){assert.ok(Math.hypot(q.velocity.x,q.velocity.z)<1e-6);assert.ok(Math.abs(q.yawRate)<1e-5);}}
 for(const beat of[4,6]){const a=p.sample(beat-1e-6),b=p.sample(beat+1e-6);for(const q of a.poses){assert.ok(distance(q.position,b.poses[q.id].position)<1e-6);assert.ok(Math.abs(turn(q.yaw,b.poses[q.id].yaw))<1e-6);}}
 assert.deepEqual(p.sample(0).contacts,[]);assert.deepEqual(p.sample(8).contacts,[]);assert.equal(p.sample(5).poses[0].balance,undefined);assert.ok(p.minimumObservedClearance>=.64);assert.ok(p.maximumObservedSpeed<=1.65);assert.ok(p.maximumObservedHeldReach<=.64);assert.ok(p.maximumObservedYawRate<=6);
 t.diagnostic(JSON.stringify({minimum:p.minimumObservedClearance,speed:p.maximumObservedSpeed,yaw:p.maximumObservedYawRate,heldReach:p.maximumObservedHeldReach}));
});

test('square-through owns inputs, preserves epoch, and fails closed on unproved hands/counts/turns/endpoints',()=>{
 const o=fixture(),p=compileSquareThrough(o),before=p.sample(6.7);o.entry.get(0)!.position.x=99;o.exit.get(0)!.yaw=99;(o.actors as Dancer[])[0].role='robin';(o.relations.neighbor as Map<number,number>).clear();(o.phaseBeats as number[])[0]=3;(o.passages[0]as any).relation='neighbor';o.frame.origin.x=99;assert.deepEqual(p.sample(6.7),before);assert.equal(typeof(p.exit as any).set,'undefined');assert.throws(()=>{p.firstPassEnd.get(0)!.position.x=1;});
 for(const change of[{beats:16},{phaseBeats:[4,4]},{phaseBeats:[2,3,3]},{passages:[{relation:'neighbor',hand:'right'},{relation:'partner',hand:'left'}]},{passages:[{relation:'partner',hand:'left'},{relation:'neighbor',hand:'right'}]},{passages:[...fixture().passages,...fixture().passages]},{passages:[{relation:'partner',hand:'right',extraTurn:1},{relation:'neighbor',hand:'left'}]},{bindingEpoch:12},{amount:4},{spin:1},{minimumClearance:.8},{maximumSpeed:1},{maximumYawRate:2}])assert.throws(()=>compileSquareThrough({...fixture(),...change}as SquareThroughOptions));
 const moved=fixture();moved.entry.get(0)!.velocity.x=.1;assert.throws(()=>compileSquareThrough(moved),/stationary/);
 const endpoint=fixture();endpoint.exit.get(0)!.position.x-=.1;assert.throws(()=>compileSquareThrough(endpoint),/opposite/);
 const facing=fixture();facing.entry.get(0)!.yaw=0;assert.throws(()=>compileSquareThrough(facing),/facing/);
 const flipped=fixture();for(const p of flipped.entry.values()){p.position.x*=-1;p.yaw+=Math.PI;}assert.throws(()=>compileSquareThrough(flipped),/role order/);
 const hidden=fixture();Object.defineProperty(hidden,'extraTurn',{value:1});assert.throws(()=>compileSquareThrough(hidden),/hidden/);
 const sparse=fixture();delete(sparse.phaseBeats as any)[1];assert.throws(()=>compileSquareThrough(sparse),/omit|holes/);
 assert.throws(()=>p.sample(NaN),/finite/);assert.throws(()=>p.position(999,.5),/outside/);assert.throws(()=>p.contacts(.5,[{id:0,position:{x:0,z:0},yaw:0}]as Pose[]),/all bound/);
});

test('square-through paths commute with rigid room transforms and opaque dancer IDs',()=>{
 const o=fixture(),a=compileSquareThrough(o),theta=.74,offset={x:8,z:-7},ids=new Map([[0,31],[1,8],[2,73],[3,4]]),rot=(p:Vec2)=>({x:p.x*Math.cos(theta)-p.z*Math.sin(theta),z:p.x*Math.sin(theta)+p.z*Math.cos(theta)}),world=(p:Vec2)=>{const q=rot(p);return{x:q.x+offset.x,z:q.z+offset.z};};
 const map=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[ids.get(a)!,ids.get(b)!])),constraints=(m:ReadonlyMap<number,TurnConstraint>)=>new Map([...m].map(([id,p])=>[ids.get(id)!,{...p,position:world(p.position),yaw:p.yaw-theta}]));
 const b=compileSquareThrough({...o,actors:o.actors.map(d=>({...d,id:ids.get(d.id)!})),entry:constraints(o.entry),exit:constraints(o.exit),relations:{epoch:11,partner:map(o.relations.partner),neighbor:map(o.relations.neighbor)},frame:{origin:offset,axis:rot({x:0,z:1})}});
 for(let tick=0;tick<=128;tick++)for(const p of a.sample(tick/16).poses){const q=b.sample(tick/16).poses.find(q=>q.id===ids.get(p.id))!;assert.ok(distance(q.position,world(p.position))<1e-8);assert.ok(Math.abs(turn(q.yaw,p.yaw-theta))<1e-8);}
});

test('typed square-through boundaries preserve source clock, exact named roots, epoch and held hands',()=>{
 const c=context(),p=compileSquareThroughFigure(figure,c,56);assert.deepEqual(p.formations.map(s=>s.sourceBeat),[56,60,62,64]);assert.deepEqual(p.formations.map(s=>s.relationshipEpoch),[11,11,11,11]);assert.deepEqual(p.formations.map(s=>s.geometry.halfWidth),[.9,.55,.55,.9]);assert.deepEqual(p.formations.map(s=>s.heldContacts.length),[0,2,0,0]);
 assert.deepEqual(p.formations.map(s=>s.orderedSlots.map(slot=>slot.id)),[[0,3,1,2],[0,3,1,2],[1,2,0,3],[2,1,3,0]],'Physical stations record their actual occupants after each passage');
 for(const s of p.formations){assert.deepEqual(s.partner,[[0,1],[1,0],[2,3],[3,2]]);assert.deepEqual(s.neighbor,[[0,3],[1,2],[2,1],[3,0]]);assert.doesNotThrow(()=>assertFormationHandoff(s,s));const bad=structuredClone(s);bad.relationshipEpoch++;assert.throws(()=>assertFormationHandoff(s,bad),/epoch/);}
 for(const change of[{id:''},{id:9},{label:' '},{label:null},{notes:{}},{confidence:'approved'},{beats:NaN},{beats:Infinity},{amount:4},{beats:16},{hands:'left-right'},{who:'partner'},{phaseBeats:[4,4]},{direction:'right'},{passingShoulder:'right'},{spin:1},{entry:'ring'},{exit:undefined}])assert.throws(()=>compileSquareThroughFigure({...figure,...change}as SquareThroughFigure,context()));
 assert.throws(()=>compileSquareThroughFigure(figure,{...context(),bindingEpoch:12}),/stale/);assert.throws(()=>compileSquareThroughFigure(figure,{...context(),next:{id:'tail',kind:'long-lines',label:'tail',beats:8,who:'all'}}),/terminal/);
 const opening:Figure={id:'balance',label:'Neighbor right balance',kind:'balance',who:'neighbor',hands:'right',beats:4},arch:Figure={id:'arch',label:'Neighbor box',kind:'box-the-gnat',who:'neighbor',hands:'right',underRole:'robin',beats:4},prefix:Figure={id:'prefix',label:'Opaque prefix',kind:'swing',who:'neighbor',beats:40},lines:Figure={id:'lines',label:'Long lines',kind:'long-lines',who:'all',beats:8};assert.doesNotThrow(()=>assertSquareThroughComposition([opening,arch,prefix,lines,figure]));
 for(const change of[{progression:false},{progression:undefined},{amount:4},{phaseBeats:[4,4]}])assert.throws(()=>assertSquareThroughComposition([opening,arch,prefix,lines,{...figure,...change}as SquareThroughFigure]));
 assert.throws(()=>assertSquareThroughComposition([opening,arch,{...prefix,progression:true},lines,figure]));assert.throws(()=>assertSquareThroughComposition([opening,arch,prefix,figure,lines]));assert.throws(()=>assertSquareThroughComposition([opening,arch,prefix,{...lines,beats:6},figure]));assert.throws(()=>assertSquareThroughComposition([{...opening,who:'partner'},arch,prefix,lines,figure]));
 assert.equal(squareThroughPreparationBeats(figure),.75);assert.equal(squareThroughPreparationBeats(opening),undefined);assert.throws(()=>squareThroughPreparationBeats({...figure,amount:4}));
});

test('square-through captures every plain input before reads and rejects unconsumed native-map declarations',()=>{
 const locations:[string,(o:any)=>any][]=[['actor',o=>o.actors[0]],['relations',o=>o.relations],['entry',o=>o.entry.get(0)],['exit',o=>o.exit.get(0)],['position',o=>o.entry.get(0).position],['velocity',o=>o.entry.get(0).velocity]];
 for(const [label,get]of locations)for(const shape of ['enumerable','hidden','symbol','accessor']){const o=fixture();let reads=0;const target=get(o);if(shape==='enumerable')target.extraTurn=1;else if(shape==='hidden')Object.defineProperty(target,'extraTurn',{value:1});else if(shape==='symbol')target[Symbol('extraTurn')]=1;else Object.defineProperty(target,'extraTurn',{enumerable:true,get(){reads++;return 1;}});assert.throws(()=>compileSquareThrough(o),label+'/'+shape);assert.equal(reads,0);}
 for(const [get,key]of [[(o:any)=>o.actors[0],'role'],[(o:any)=>o.relations,'epoch'],[(o:any)=>o.entry.get(0),'yaw'],[(o:any)=>o.entry.get(0).position,'x'],[(o:any)=>o.entry.get(0).velocity,'x'],[(o:any)=>o.exit.get(0).velocity,'x']]as const){const o=fixture(),target=get(o),value=target[key];let reads=0;Object.defineProperty(target,key,{enumerable:true,get(){reads++;return reads<3?value:.25;}});assert.throws(()=>compileSquareThrough(o));assert.equal(reads,0,'Rejected getters never execute');}
 for(const name of ['partner','neighbor']as const){const extra=fixture();(extra.relations[name]as Map<number,number>).set(900,901);assert.throws(()=>compileSquareThrough(extra),/exactly/);for(const key of ['get','extraTurn',Symbol('extraTurn')]){const o=fixture();Object.defineProperty(o.relations[name],key,{value:1});assert.throws(()=>compileSquareThrough(o),/map/);}}
 for(const name of ['entry','exit']as const){const o=fixture();Object.defineProperty(o[name],'get',{get(){throw new Error('must never execute');}});assert.throws(()=>compileSquareThrough(o),/map/);}
 for(const beat of [1e20,Number.MAX_VALUE,Number.MAX_SAFE_INTEGER])assert.throws(()=>compileSquareThroughFigure(figure,context(),beat),/source clock/);
 assert.deepEqual(compileSquareThroughFigure(figure,context(),56.5).formations.map(s=>s.sourceBeat),[56.5,60.5,62.5,64.5]);
});
