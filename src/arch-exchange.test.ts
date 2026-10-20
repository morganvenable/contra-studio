import test from 'node:test';import assert from 'node:assert/strict';
import {compileArchExchange,type ArchActor,type ArchOptions} from './arch-exchange.ts';
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const options=():ArchOptions=>({entry:[{id:'over',position:{x:0,z:-.55},yaw:0},{id:'under',position:{x:0,z:.55},yaw:Math.PI}],exit:[{id:'over',position:{x:0,z:.9},yaw:Math.PI},{id:'under',position:{x:0,z:-.9},yaw:0}],overId:'over',underId:'under',hand:'right',beats:4});
test('explicit box-gnat foundation exchanges named actors with opposite half turns and an actual arch',()=>{
 const p=compileArchExchange(options());assert.ok(p.minimumObservedClearance>.51);assert.ok(p.maximumObservedSpeed<1.2);
 for(const endpoint of[0,4]){const expected=endpoint?options().exit:options().entry;for(const actor of expected){const actual=p.sample(endpoint).poses.find(a=>a.id===actor.id)!;assert.ok(gap(actual.position,actor.position)<1e-9);assert.ok(Math.abs(Math.atan2(Math.sin(actual.yaw-actor.yaw),Math.cos(actual.yaw-actor.yaw)))<1e-9);assert.ok(Math.hypot(actual.velocity.x,actual.velocity.z)<1e-7);}}
 const middle=p.sample(2);assert.equal(middle.contacts.length,1);assert.ok(middle.contacts[0].point.y>1.86);assert.equal(middle.contacts[0].underId,'under');assert.ok(middle.poses.find(p=>p.id==='under')!.kneeLowering>.059);
 for(let b=0;b<=4;b+=.005){const f=p.sample(b);for(const c of f.contacts){for(const id of[c.a,c.b]){const a=f.poses.find(a=>a.id===id)!,side=c.handA==='right'?-1:1,shoulder={x:a.position.x+side*.235*Math.cos(a.yaw),z:a.position.z-side*.235*Math.sin(a.yaw)};assert.ok(Math.hypot(shoulder.x-c.point.x,1.355-a.kneeLowering-c.point.y,shoulder.z-c.point.z)<=.640001);}}}
});
test('arch foundation owns input state and rigid frame transforms preserve identities and paths',()=>{
 const data=options(),p=compileArchExchange(data),before=p.sample(2);(data.entry[0].position.x)=100;(data.exit[1].yaw)=NaN;assert.deepEqual(p.sample(2),before);
 const a=.72,rotate=(p:{x:number;z:number})=>({x:3+p.x*Math.cos(a)-p.z*Math.sin(a),z:-2+p.x*Math.sin(a)+p.z*Math.cos(a)}),transform=(p:ArchActor)=>({...p,position:rotate(p.position),yaw:p.yaw-a}),base=options(),transformed=compileArchExchange({...base,entry:base.entry.map(transform),exit:base.exit.map(transform)});
 for(let b=0;b<=4;b+=.125){const original=p.sample(b),actual=transformed.sample(b);for(const pose of original.poses)assert.ok(gap(rotate(pose.position),actual.poses.find(a=>a.id===pose.id)!.position)<1e-8);}
});
test('ambiguous identity, impossible endpoints, timing and physical budgets reject explicitly',()=>{
 const o=options();assert.throws(()=>compileArchExchange({...o,underId:'over'}),/identities/);assert.throws(()=>compileArchExchange({...o,hand:'both' as any}),/explicit/);assert.throws(()=>compileArchExchange({...o,beats:1}),/budget/);assert.throws(()=>compileArchExchange({...o,entry:o.entry.map(p=>({...p,yaw:0}))}),/headings/);assert.throws(()=>compileArchExchange({...o,maximumSpeed:.1}),/speed/);assert.throws(()=>compileArchExchange({...o,minimumClearance:1}),/clearance/);
});
