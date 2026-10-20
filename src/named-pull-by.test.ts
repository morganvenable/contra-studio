import test from 'node:test';
import assert from 'node:assert/strict';
import {compileNamedPullBy,type NamedPullByOptions} from './named-pull-by.ts';
import {compileNamedPullByFigure} from './named-pull-by-adapter.ts';
import {distance,heading,turn,type TurnConstraint} from './ring-twirl-contract.ts';
import type {Dancer,Figure,Pose,Vec2} from './types.ts';
const reciprocal=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
export function namedPullByFixture(hand:'left'|'right'='left',beats:2|4=4):NamedPullByOptions{
 const positions=beats===4?[{x:.9,z:.9},{x:-.9,z:.9},{x:-.9,z:-.9},{x:.9,z:-.9}]:[{x:-.9,z:-.9},{x:-.9,z:.9},{x:.9,z:.9},{x:.9,z:-.9}];
 const actors:Dancer[]=positions.map((_,id)=>({id,name:`Actor ${id}`,role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'}));
 const partner=reciprocal([[0,1],[2,3]]),neighbor=reciprocal([[0,3],[1,2]]),pairs=beats===4?[{a:0,b:2,relationship:'larks' as const}]:[{a:0,b:1,relationship:'partner' as const},{a:2,b:3,relationship:'partner' as const}];
 const entry=new Map(actors.map(d=>[d.id,{position:{...positions[d.id]},yaw:beats===4?(d.id<2?0:Math.PI):[Math.PI/2,3*Math.PI/4,-Math.PI/2,-Math.PI/4][d.id],velocity:{x:0,z:0},yawRate:0}]));
 const ends=new Map(positions.map((p,id)=>[id,{...p}]));for(const{a,b}of pairs){ends.set(a,{...positions[b]});ends.set(b,{...positions[a]});}
 const center={x:0,z:0},exit=new Map(actors.map(d=>{const position=ends.get(d.id)!,target=beats===4?ends.get(partner.get(d.id)!)!:d.role==='lark'?ends.get(d.id===0?2:0)!:center;return[d.id,{position,yaw:heading(position,target)+(beats===4?Math.PI/3:0),velocity:{x:0,z:0},yawRate:0}];}));
 return{actors,entry,exit,relations:{epoch:9,partner,neighbor},bindingEpoch:9,pairs,hand,beats};
}

test('named pull-bys exchange the exact named slots through independently witnessed same-hand gates',t=>{
 for(const hand of['left','right']as const)for(const beats of[2,4]as const){
  const o=namedPullByFixture(hand,beats),p=compileNamedPullBy(o);assert.equal(p.beats,beats);assert.equal(p.epoch,9);assert.equal(p.hand,hand);
  for(const{a,b}of o.pairs){const gate=p.sample(beats/2),A=gate.poses.find(p=>p.id===a)!,B=gate.poses.find(p=>p.id===b)!,startA=o.entry.get(a)!.position,startB=o.entry.get(b)!.position,forward={x:(startB.x-startA.x)/distance(startA,startB),z:(startB.z-startA.z)/distance(startA,startB)},delta={x:B.position.x-A.position.x,z:B.position.z-A.position.z};
   assert.ok(Math.abs(delta.x*forward.x+delta.z*forward.z)<1e-8);
   assert.ok((hand==='right'?1:-1)*(delta.x*-Math.cos(A.yaw)+delta.z*Math.sin(A.yaw))>.699999);
   const relative=(at:number)=>{const a=p.position(o.pairs[0].a,at/beats),b=p.position(o.pairs[0].b,at/beats);return(b.x-a.x)*forward.x+(b.z-a.z)*forward.z;};assert.ok(relative(beats/2-.001)*relative(beats/2+.001)<0);
   const c=gate.contacts.find(c=>c.a===a&&c.b===b)!;assert.equal(c.handA,hand);assert.equal(c.handB,hand);assert.equal(c.kind,'joined');assert.ok(c.strength>.99);
   assert.ok(distance(p.position(a,1),startB)<1e-8);assert.ok(distance(p.position(b,1),startA)<1e-8);
  }
  for(const[beat,map]of[[0,o.entry],[beats,o.exit]]as const){const f=p.sample(beat);assert.deepEqual(f.contacts,[]);for(const q of f.poses){const wanted=map.get(q.id)!;assert.ok(distance(q.position,wanted.position)<1e-8);assert.ok(Math.abs(turn(q.yaw,wanted.yaw))<1e-8);assert.ok(distance(q.velocity,{x:0,z:0})<1e-6);assert.ok(Math.abs(q.yawRate)<1e-6);}}
  if(beats===4)for(const id of[1,3])for(let n=0;n<=40;n++)assert.deepEqual(p.position(id,n/40),o.entry.get(id)!.position);
  assert.ok(p.minimumObservedClearance>=.64);assert.ok(p.maximumObservedSpeed<=1.65);assert.ok(p.maximumObservedYawRate<=6);assert.deepEqual(p.sample(-1),p.sample(0));assert.deepEqual(p.sample(beats+1),p.sample(beats));assert.throws(()=>p.sample(NaN),/finite/);assert.throws(()=>p.position(99,.5),/outside/);
  t.diagnostic(JSON.stringify({beats,hand,clearance:p.minimumObservedClearance,speed:p.maximumObservedSpeed,yaw:p.maximumObservedYawRate}));
 }
});

test('named pull-by owns actors, named receivers, endpoint constraints and current epoch; unknown variants fail closed',()=>{
 const o=namedPullByFixture(),p=compileNamedPullBy(o),sample=p.sample(1.73);o.entry.get(0)!.position.x=99;o.exit.get(0)!.position.z=99;(o.actors as Dancer[])[0].role='robin';(o.relations.neighbor as Map<number,number>).clear();(o.pairs[0]as any).b=1;o.hand='right';assert.deepEqual(p.sample(1.73),sample);assert.equal(typeof(p.entry as any).set,'undefined');assert.throws(()=>{p.exit.get(0)!.position.x=0;});assert.throws(()=>{p.pairs[0].b=3;});
 for(const change of[{beats:3},{hand:'both'},{bindingEpoch:8},{amount:.5},{progression:true},{pairs:[{a:0,b:1,relationship:'larks'}]},{pairs:[{a:0,b:2,relationship:'neighbor'}]},{pairs:[{a:0,b:2,relationship:'larks',direction:'left'}]}])assert.throws(()=>compileNamedPullBy({...namedPullByFixture(),...change}as NamedPullByOptions));
 const endpoint=namedPullByFixture();endpoint.exit.get(0)!.position.x=.9;assert.throws(()=>compileNamedPullBy(endpoint),/exchange/);
 const passive=namedPullByFixture();passive.exit.get(1)!.position.x+=.1;assert.throws(()=>compileNamedPullBy(passive),/outside/);
 const stale=namedPullByFixture();stale.relations.partner=reciprocal([[0,3],[1,2]]);assert.throws(()=>compileNamedPullBy(stale),/identity/);
 const moving=namedPullByFixture();moving.entry.get(0)!.velocity.x=.1;assert.throws(()=>compileNamedPullBy(moving),/stationary/);
 assert.throws(()=>compileNamedPullBy({...namedPullByFixture(),minimumClearance:.8}),/budgets/);
 assert.throws(()=>p.contacts(.5,[{id:0,position:{x:0,z:0},yaw:0}]as Pose[]),/every bound/);
});

test('pull-by gates and paths commute with rigid room transforms and opaque identity remapping',()=>{
 const o=namedPullByFixture(),a=compileNamedPullBy(o),theta=.81,offset={x:9,z:-3},ids=new Map([[0,42],[1,9],[2,87],[3,5]]),rot=(p:Vec2)=>({x:p.x*Math.cos(theta)-p.z*Math.sin(theta),z:p.x*Math.sin(theta)+p.z*Math.cos(theta)}),world=(p:Vec2)=>{const q=rot(p);return{x:q.x+offset.x,z:q.z+offset.z};};
 const remap=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[ids.get(a)!,ids.get(b)!])),constraints=(m:ReadonlyMap<number,TurnConstraint>)=>new Map([...m].map(([id,p])=>[ids.get(id)!,{...p,position:world(p.position),yaw:p.yaw-theta}]));
 const b=compileNamedPullBy({...o,actors:o.actors.map(d=>({...d,id:ids.get(d.id)!})),entry:constraints(o.entry),exit:constraints(o.exit),relations:{epoch:9,partner:remap(o.relations.partner),neighbor:remap(o.relations.neighbor)},pairs:o.pairs.map(p=>({...p,a:ids.get(p.a)!,b:ids.get(p.b)!}))});
 for(let n=0;n<=80;n++)for(const p of a.sample(n/20).poses){const q=b.sample(n/20).poses.find(q=>q.id===ids.get(p.id))!;assert.ok(distance(q.position,world(p.position))<1e-8);assert.ok(Math.abs(turn(q.yaw,p.yaw-theta))<1e-8);}
});

test('bounded source adapter preserves exact named hand and receiver, and blocks unproved terminal progression',()=>{
 for(const beats of[2,4]as const){const o=namedPullByFixture('left',beats),context={ids:[0,1,2,3],dancers:o.actors as Dancer[],relations:o.relations,bindingEpoch:9,start:o.actors.map(a=>({id:a.id,position:{...o.entry.get(a.id)!.position},yaw:o.entry.get(a.id)!.yaw,stride:0,lean:0,bounce:0,turn:0,activity:'waiting' as const})),next:(beats===4?{id:'swing',label:'Partner swing',kind:'swing',who:'partner',beats:12}:{id:'allemande',label:'Larks allemande',kind:'allemande',who:'larks',direction:'right',amount:1.5,beats:8})as Figure},f:Figure={id:'pull',label:'Named left pull-by',kind:'pull-by',who:beats===4?'larks':'partner',hands:'left',beats};
  const p=compileNamedPullByFigure(f,context),expected=p.position(0,.6);assert.deepEqual(p.contacts(.5,context.start).map(c=>c.handA),[]); // External poses are used as supplied; they cannot invent a contact gate.
  for(const change of[{who:'all'},{hands:'both'},{beats:6},{amount:.5},{direction:'left'},{passingShoulder:'left'},{progression:true},{entry:'ring'},{exit:'progressed-neighbors'}])assert.throws(()=>compileNamedPullByFigure({...f,...change}as Figure,context));
  assert.throws(()=>compileNamedPullByFigure(f,{...context,next:undefined}),/separately reviewed/);assert.throws(()=>compileNamedPullByFigure(f,{...context,bindingEpoch:10}),/stale/);
  context.ids[0]=99;context.start[0].position.x=99;context.dancers[0].role='robin';f.hands='right';assert.deepEqual(p.position(0,.6),expected);
 }
});
