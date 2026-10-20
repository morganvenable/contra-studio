import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCoupleArchDive} from './couple-arch-dive.ts';
import {assertSequenceHandoff,type SequenceBoundary} from './sequence-boundary.ts';
function fixture():SequenceBoundary{
 const poses=[{id:7,position:{x:-.55,z:-.55}},{id:11,position:{x:.55,z:-.55}},{id:21,position:{x:.55,z:.55}},{id:28,position:{x:-.55,z:.55}}].map(p=>({...p,yaw:Math.atan2(-p.position.x,-p.position.z)}));
 return{sourceBeat:60,relationshipEpoch:9,actors:[{id:7,role:'lark',couple:8},{id:11,role:'robin',couple:8},{id:21,role:'lark',couple:3},{id:28,role:'robin',couple:3}],partner:[[7,11],[11,7],[21,28],[28,21]],neighbor:[[7,28],[28,7],[11,21],[21,11]],poses,heldContacts:[[7,11],[11,21],[21,28],[28,7]].map(([a,b])=>{const p=poses.find(p=>p.id===a)!,q=poses.find(p=>p.id===b)!;return{a,b,handA:'left',handB:'right',kind:'joined',strength:1,point:{x:(p.position.x+q.position.x)/2,y:1.25,z:(p.position.z+q.position.z)/2}};})};
}
const slots=[{couple:8,rank:2,direction:1 as const},{couple:3,rank:3,direction:-1 as const}];
test('four-count couple arch/dive carries ring, identities and epoch to reached released endpoints',t=>{
 const b=fixture(),p=compileCoupleArchDive({boundary:b,slots,beats:4});assertSequenceHandoff(b,p.sample(0));
 assert.equal(p.onesCouple,8);assert.equal(p.twosCouple,3);assert.equal(p.exitState.sourceBeat,64);assert.equal(p.exitState.relationshipEpoch,9);assert.deepEqual(p.exitState.partner,p.entryState.partner);assert.deepEqual(p.exitState.neighbor,p.entryState.neighbor);assert.deepEqual(p.exitState.heldContacts,[]);
 for(const q of p.exitState.poses){assert.ok(Math.abs(Math.abs(q.position.x)-.85)<1e-12);assert.ok(Math.abs(Math.abs(q.position.z)-.9)<1e-12);assert.equal(Math.sign(q.position.z),-Math.sign(b.poses.find(a=>a.id===q.id)!.position.z));}
 assert.equal(p.sample(.8).heldContacts.length,2);assert.ok(p.sample(2).heldContacts.find(c=>c.a===21)!.point.y>1.5);assert.ok(p.duck(7,2)>.2);assert.equal(p.duck(21,2),0);
 assert.ok(p.certificate.minimumClearance>=.5);assert.ok(p.certificate.maximumSpeed<=1.5);assert.ok(p.certificate.maximumYawRate<=3.2);t.diagnostic(JSON.stringify(p.certificate));
 assert.ok(p.certificate.maximumHandReach<=.64);
 const before=p.sample(2);b.poses[0].position.x=99;slots.reverse();assert.deepEqual(p.sample(2),before);slots.reverse();
});
test('translated actual state and unrelated actor/couple IDs reuse geometry',()=>{
 const a=compileCoupleArchDive({boundary:fixture(),slots,beats:4}),b=fixture();
 for(const p of b.poses){p.position.x+=5;p.position.z-=7;}for(const c of b.heldContacts){c.point.x+=5;c.point.z-=7;}
 const translated=compileCoupleArchDive({boundary:b,slots:[...slots].reverse(),beats:4});for(let i=0;i<=16;i++){const p=a.sample(i/4),q=translated.sample(i/4);for(let j=0;j<4;j++){assert.ok(Math.abs(q.poses[j].position.x-p.poses[j].position.x-5)<1e-12);assert.ok(Math.abs(q.poses[j].position.z-p.poses[j].position.z+7)<1e-12);}}
});
test('missing holds, wrong ranks, displaced roots and nonfinite sampling reject',()=>{
 const check=(change:(b:any)=>void)=>{const b=fixture();change(b);assert.throws(()=>compileCoupleArchDive({boundary:b,slots,beats:4}));};
 check(b=>b.heldContacts.pop());check(b=>b.poses[0].position.x+=.1);check(b=>b.poses[0].yaw+=.1);check(b=>b.heldContacts[0].strength=.5);
 check(b=>{for(const c of b.heldContacts){c.handA='right';c.handB='left';}});
 assert.throws(()=>compileCoupleArchDive({boundary:fixture(),slots:slots.map(s=>({...s,direction:-s.direction})) as any,beats:4}),/directed ranks/);
 const p=compileCoupleArchDive({boundary:fixture(),slots,beats:4});assert.throws(()=>p.sample(NaN),/finite/);assert.throws(()=>p.duck(999,2),/known actor/);
 for(const bad of [new Set(slots),null,[null,slots[1]]])assert.throws(()=>compileCoupleArchDive({boundary:fixture(),slots:bad as any,beats:4}),/directed couple ranks/);
});

test('crossing retains immutable state and contacts approach entry and release continuously',()=>{
 const p=compileCoupleArchDive({boundary:fixture(),slots,beats:4});
 const near=p.sample(1e-8);
 for(let i=0;i<4;i++){
  const a=p.entryState.heldContacts[i],b=near.heldContacts[i];
  assert.equal(a.a,b.a);assert.equal(a.b,b.b);
  assert.ok(Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y,a.point.z-b.point.z)<1e-7);
  assert.ok(Math.abs(a.strength-b.strength)<1e-7);
 }
 let lo=0,hi=4;
 for(let i=0;i<50;i++){const mid=(lo+hi)/2;if(p.sample(mid).poses.find(q=>q.id===7)!.position.z<0)lo=mid;else hi=mid;}
 const crossing=p.sample((lo+hi)/2),ones=crossing.poses.filter(q=>[7,11].includes(q.id)),twos=crossing.poses.filter(q=>[21,28].includes(q.id));
 assert.ok(crossing.poses.every(q=>Math.abs(q.position.z)<1e-12));
 assert.ok(Math.max(...ones.map(q=>Math.abs(q.position.x)))<Math.min(...twos.map(q=>Math.abs(q.position.x))));
 assert.equal(crossing.heldContacts.length,2);
 assert.ok(crossing.heldContacts.every(c=>new Map(crossing.partner).get(c.a)===c.b));
 assert.equal(crossing.relationshipEpoch,9);
 assert.equal(crossing.sourceBeat,60+(lo+hi)/2);
 assert.ok(Object.isFrozen(crossing.poses[0].position));
 assert.throws(()=>{(crossing.poses[0].position as any).x=100;},TypeError);
 assert.ok(p.sample(3.999).heldContacts.every(c=>c.strength<.00001));
 assertSequenceHandoff(p.exitState,p.sample(4));
});
