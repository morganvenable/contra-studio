import test from 'node:test';
import assert from 'node:assert/strict';
import {compileGyre,type GyreOptions} from './gyre.ts';
import {compileGyreFigure,type GyreFigure} from './gyre-adapter.ts';
import {createDancers,initialPoses} from './engine.ts';
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function options():GyreOptions {
 const actors=createDancers(2),poses=initialPoses(actors),relations={epoch:3,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[2,1],[1,2]])};
 const entry=new Map(poses.map(p=>[p.id,{position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0}])),exit=new Map([...entry].map(([id,p])=>[id,structuredClone(p)]));
 return{actors,entry,exit,relations,bindingEpoch:3,pairs:[{a:0,b:3,relationship:'neighbor'},{a:1,b:2,relationship:'neighbor'}],passingShoulder:'right',amount:1,beats:8};
}
test('gyre preserves named actors, exact turn/facing, duration and hand-free contact semantics',()=>{
 for(const shoulder of['left','right']as const){const o=options();o.passingShoulder=shoulder;const p=compileGyre(o);assert.equal(p.beats,8);assert.equal(p.epoch,3);assert.ok(Math.abs(p.minimumObservedClearance-.8)<1e-8);assert.ok(p.maximumObservedSpeed<1.1);assert.ok(p.maximumObservedYawRate<1.1);for(let beat=0;beat<=8;beat+=.125){const f=p.sample(beat);assert.equal(f.beat,beat);assert.deepEqual(f.contacts,[]);assert.deepEqual(f.poses.map(p=>p.id),[0,1,2,3]);if(beat>=1.25&&beat<=6.75)for(const pair of p.pairs){const a=f.poses[pair.a],b=f.poses[pair.b];assert.ok(angle(a.yaw,Math.atan2(b.position.x-a.position.x,b.position.z-a.position.z))<1e-8);}}for(const id of[0,1,2,3]){assert.ok(distance(p.position(id,0),o.entry.get(id)!.position)<1e-8);assert.ok(distance(p.position(id,1),o.exit.get(id)!.position)<1e-8);assert.ok(angle(p.facing(id,1),o.exit.get(id)!.yaw)<1e-8);}assert.ok((p.position(0,.25).x-o.entry.get(0)!.position.x)*(shoulder==='right'?1:-1)>0,'named shoulder sets the orbit direction');}
});
test('gyre snapshots all supplied endpoints, identities, relationships and pair names',()=>{
 const o=options(),p=compileGyre(o),before=p.sample(2.5);(o.entry as Map<number,any>).get(0).position.x=100;(o.exit as Map<number,any>).get(0).yaw=100;(o.pairs as any)[0].a=2;(o.actors as any)[0].couple=20;(o.relations.partner as Map<number,number>).set(0,3);assert.deepEqual(p.sample(2.5),before);assert.throws(()=>{(p.pairs[0]as any).a=20;});assert.equal((p.entry as any).set,undefined);assert.throws(()=>p.sample(NaN),/finite/);assert.throws(()=>p.position(8,.5),/outside/);
});
test('gyre rejects missing/contradictory actor, shoulder, turn, endpoint and timing contracts',()=>{
 const bad:Array<(o:GyreOptions)=>void>=[o=>o.bindingEpoch++,o=>(o as any).passingShoulder=undefined,o=>o.amount=NaN,o=>o.beats=3,o=>o.beats=4.5,o=>(o.pairs as any)[0].relationship='partner',o=>(o.pairs as any)[1].a=0,o=>(o.entry as Map<number,any>).get(0).velocity.x=.2,o=>(o.exit as Map<number,any>).get(0).position.z+=.1,o=>o.minimumClearance=2,o=>o.maximumSpeed=.05,o=>o.maximumYawRate=.05,o=>(o.relations.neighbor as Map<number,number>).set(0,1),o=>(o.actors as any)[1].id=0,o=>o.amount=.5];for(const change of bad){const o=options();change(o);assert.throws(()=>compileGyre(o));}
});
test('standalone gyre adapter honors half-turn and stationary nonparticipant role actors',()=>{
 const o=options(),start=initialPoses([...o.actors]),ids=[0,1,2,3],f:GyreFigure={id:'g',kind:'gyre',beats:8,label:'Neighbor left shoulder half',who:'neighbor',passingShoulder:'left',amount:.5},p=compileGyreFigure(f,{ids,start,dancers:[...o.actors],relations:o.relations,bindingEpoch:3});for(const pair of o.pairs){assert.ok(distance(p.position(pair.a,1),start[pair.b].position)<1e-8);assert.ok(distance(p.position(pair.b,1),start[pair.a].position)<1e-8);}assert.deepEqual(p.contacts(.5,start),[]);
 // Same-role pair across a straight line, with the two nonparticipants well out
 // of the orbit. No role reassignment or proximity-based pair substitution.
 start[0].position={x:-.9,z:0};start[2].position={x:.9,z:0};start[0].yaw=Math.PI/2;start[2].yaw=-Math.PI/2;start[1].position={x:-.9,z:1.8};start[3].position={x:.9,z:1.8};const role=compileGyreFigure({...f,who:'larks',amount:1},{ids,start,dancers:[...o.actors],relations:o.relations,bindingEpoch:3});for(const id of[1,3])for(const t of[0,.3,.6,1]){assert.deepEqual(role.position(id,t),start[id].position);assert.equal(role.facing(id,t,start),start[id].yaw);}
});
test('direct gyre adapter snapshots its wrapper inputs and rejects unconsumed modifiers',()=>{
 const o=options(),ids=[0,1,2,3],start=initialPoses([...o.actors]),dancers=[...o.actors],f:GyreFigure={id:'g',kind:'gyre',beats:4,label:'Neighbor gyre',who:'neighbor',passingShoulder:'right',amount:1},next={id:'s',kind:'swing' as const,who:'neighbor' as const,beats:12,label:'Neighbor swing'},context={ids,start,dancers,relations:o.relations,bindingEpoch:3,next};
 const p=compileGyreFigure(f,context),before=p.swingPreparation!(0,.95);assert.ok(Object.isFrozen(p));ids.splice(0);start[0].position.x=200;dancers[0].couple=30;f.beats=12;f.who='partner';next.beats=8;(o.relations.neighbor as Map<number,number>).clear();assert.deepEqual(p.swingPreparation!(0,.95),before);assert.ok(p.position(0,.95).x<2);
 const fresh=options(),ctx={ids:[0,1,2,3],start:initialPoses([...fresh.actors]),dancers:[...fresh.actors],relations:fresh.relations,bindingEpoch:3};for(const extra of[{direction:'right'},{hands:'both'},{phaseBeats:[4,12]},{entry:'paired-sidelines'}])assert.throws(()=>compileGyreFigure({...f,...extra}as any,ctx),/does not consume/);
});
