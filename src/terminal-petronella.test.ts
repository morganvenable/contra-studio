import test from 'node:test';
import assert from 'node:assert/strict';
import {compileTerminalPetronella,type TerminalPetronellaOptions} from './terminal-petronella.ts';
import {distance,turn,type TurnConstraint} from './ring-twirl-contract.ts';
import type {Vec2,Dancer} from './types.ts';
const pair=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
function fixture():TerminalPetronellaOptions {
 const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:String(id),role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'})),cycle:[number,number,number,number]=[3,0,1,2],coords=[[.55,-.55],[.55,.55],[-.55,.55],[-.55,-.55]],entry=new Map(coords.map(([x,z],id)=>[id,{position:{x,z},yaw:Math.atan2(-x,-z),velocity:{x:0,z:0},yawRate:0}])),exit=new Map(cycle.map((id,i)=>{const p=entry.get(cycle[(i+3)%4])!.position;return[id,{position:{x:p.x*.9/.55,z:p.z*.9/.55},yaw:p.z>0?0:Math.PI,velocity:{x:0,z:0},yawRate:0}]}));
 return {actors,entry,exit,cyclicIds:cycle,relations:{epoch:0,partner:pair([[0,1],[2,3]]),neighbor:pair([[0,3],[1,2]])},bindingEpoch:0,beats:4,direction:'right',amount:.25,spinDirection:'right',spinAmount:.75,clap:'none',phaseBeats:[3,1],exitScale:.9/.55,forward:{x:0,z:1}};
}
test('terminal petronella completes one right station and full body spin before the separately declared facing/opening count',()=>{
 const o=fixture(),p=compileTerminalPetronella(o);
 for(const id of o.cyclicIds){const initial=p.sample(0).poses.find(a=>a.id===id)!,station=p.sample(3).poses.find(a=>a.id===id)!,end=p.sample(4).poses.find(a=>a.id===id)!,expected=o.entry.get(o.cyclicIds[(o.cyclicIds.indexOf(id)+3)%4])!;
  assert.ok(distance(station.position,expected.position)<1e-9);assert.ok(Math.abs(station.yaw-initial.yaw+3*Math.PI/2)<1e-9);assert.ok(distance(end.position,o.exit.get(id)!.position)<1e-9);assert.ok(Math.abs(turn(end.yaw,o.exit.get(id)!.yaw))<1e-9);
  for(let k=1;k<=300;k++)assert.ok(p.sample(k/100).poses[id].yaw<p.sample((k-1)/100).poses[id].yaw);
  for(let k=300;k<=400;k++){const at=p.sample(k/100).poses[id].position;assert.ok(Math.abs(at.x*station.position.z-at.z*station.position.x)<1e-9,'opening cannot add another station');}
 }
 assert.equal(p.sample(0).contacts.length,4);for(const t of[.225,.5,1,2,3,3.5,4])assert.equal(p.sample(t).contacts.length,0);assert.ok(p.minimumObservedClearance>=1.1-1e-9);assert.ok(p.maximumObservedSpeed<.61);assert.ok(p.maximumObservedYawRate<2.88);
 for(const beat of[0,3,4])for(const a of p.sample(beat).poses){assert.ok(Math.hypot(a.velocity.x,a.velocity.z)<1e-7);assert.ok(Math.abs(a.yawRate)<1e-7);}
});
test('terminal petronella snapshots declarations and rejects wrong stations, extra spins, arbitrary opening, stale bindings and omitted allocation',()=>{
 const o=fixture(),p=compileTerminalPetronella(o),expected=p.sample(3.5);o.entry.get(0)!.position.x=99;o.exit.get(0)!.yaw=99;(o.relations.partner as Map<number,number>).clear();(o.cyclicIds as number[]).reverse();o.forward.z=-1;(o.phaseBeats as number[])[0]=1;o.exitScale=99;assert.deepEqual(p.sample(3.5),expected);assert.throws(()=>{p.exit.get(0)!.position.x=10;});
 for(const patch of[{phaseBeats:undefined},{phaseBeats:[2,2]},{phaseBeats:[3,1,0]},{exitScale:2},{forward:{x:0,z:2}},{spinAmount:1.75},{amount:.5},{clap:'twice'},{bindingEpoch:1},{beats:8},{direction:'left'}])assert.throws(()=>compileTerminalPetronella({...fixture(),...patch} as any));
 const wrong=fixture();[wrong.exit.get(0)!.position,wrong.exit.get(1)!.position]=[wrong.exit.get(1)!.position,wrong.exit.get(0)!.position];assert.throws(()=>compileTerminalPetronella(wrong),/exact named right station/);
 const yaw=fixture();yaw.exit.get(0)!.yaw+=Math.PI;assert.throws(()=>compileTerminalPetronella(yaw),/facing onward/);assert.throws(()=>p.sample(NaN));assert.throws(()=>p.position(999,.5));
});
test('terminal petronella binds opaque IDs and rotates its hall-axis convention with the world frame',()=>{
 const o=fixture(),mapping=new Map([[0,14],[1,2],[2,99],[3,37]]),theta=.73,origin={x:2.8,z:-1.4},rotateVector=(p:Vec2)=>({x:p.x*Math.cos(theta)-p.z*Math.sin(theta),z:p.x*Math.sin(theta)+p.z*Math.cos(theta)}),rotate=(p:Vec2)=>{const q=rotateVector(p);return{x:origin.x+q.x,z:origin.z+q.z};},map=(m:ReadonlyMap<number,TurnConstraint>)=>new Map([...m].map(([id,p])=>[mapping.get(id)!,{...p,position:rotate(p.position),yaw:p.yaw-theta}])),rel=(m:ReadonlyMap<number,number>)=>new Map([...m].map(([a,b])=>[mapping.get(a)!,mapping.get(b)!]));
 const a=compileTerminalPetronella(o),b=compileTerminalPetronella({...o,actors:o.actors.map(d=>({...d,id:mapping.get(d.id)!})),entry:map(o.entry),exit:map(o.exit),cyclicIds:o.cyclicIds.map(id=>mapping.get(id)!) as [number,number,number,number],forward:rotateVector(o.forward),relations:{epoch:0,partner:rel(o.relations.partner),neighbor:rel(o.relations.neighbor)}});
 for(let i=0;i<=40;i++)for(const p of a.sample(i/10).poses){const q=b.sample(i/10).poses.find(x=>x.id===mapping.get(p.id))!;assert.ok(distance(q.position,rotate(p.position))<1e-9);assert.ok(Math.abs(q.yaw-(p.yaw-theta))<1e-9);}
});
