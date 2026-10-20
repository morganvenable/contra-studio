import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
const source=(id:number)=>{const p=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'));assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
test('reviewed omitted-facing sources reach the unchanged rank-bound active swing through distinct literal prefixes',()=>{
 for(const couples of[3,4]){
  const control=compileChoreography(source(1036),couples)as CompiledStateSequence;
  for(const id of[236]){
   const d=source(id),c=compileChoreography(d,couples)as CompiledStateSequence;assert.equal(c.totalBeats,64);assert.equal(c.periodRepeats,control.periodRepeats);const receivers=d.figures.filter(f=>f.kind==='robins-chain'||f.kind==='ladies-chain').map(f=>f.who);assert.deepEqual(receivers,['partner','neighbor']);
   let entries=0,rootJoin=0,yawJoin=0;
   for(let repeat=0;repeat<c.periodRepeats;repeat++){
    const base=repeat*64,proofs=c.sequenceBoundaries(repeat).filter(p=>p.adapterId==='active-ones-swing'),prior=control.sequenceBoundaries(repeat).filter(p=>p.adapterId==='active-ones-swing');assert.equal(proofs.length,prior.length);assert.deepEqual(c.topology(base+56),control.topology(base+56));assert.equal(c.topology(base+64-1e-7).epoch,repeat);assert.equal(c.topology(base+64).epoch,repeat+1);
    for(let i=0;i<proofs.length;i++){const p=proofs[i],q=prior[i];assert.deepEqual(p.currentRank,q.currentRank);assert.deepEqual(p.incoming.actors,q.incoming.actors);assert.deepEqual(p.incoming.partner,q.incoming.partner);assert.deepEqual(p.incoming.neighbor,q.incoming.neighbor);assert.deepEqual(p.incoming.heldContacts,[]);for(const a of p.incoming.poses){const b=q.incoming.poses.find(b=>b.id===a.id)!;assert.ok(gap(a.position,b.position)<1e-7);assert.ok(Math.abs(angle(a.yaw,b.yaw))<1e-7);}entries++;}
    for(const local of[56,57,57.25,58,59.875,61.5,62.25,62.5,63,63.999999]){const now=c.sample(base+local),old=control.sample(base+local);for(const p of now.poses){const q=old.poses[p.id];assert.ok(gap(p.position,q.position)<1e-7);assert.ok(Math.abs(angle(p.yaw,q.yaw))<1e-7);assert.equal(p.activity,q.activity);}assert.deepEqual(now.contacts.map(({point,bodyPoint,strength,...c})=>c),old.contacts.map(({point,bodyPoint,strength,...c})=>c));for(let i=0;i<now.contacts.length;i++){assert.ok(Math.abs(now.contacts[i].strength-old.contacts[i].strength)<1e-7);assert.ok(Math.hypot(now.contacts[i].point.x-old.contacts[i].point.x,now.contacts[i].point.y-old.contacts[i].point.y,now.contacts[i].point.z-old.contacts[i].point.z)<1e-7);}}
    for(const local of[...c.starts,64]){if(!base&&!local)continue;const before=c.sample(base+local-1e-7),after=c.sample(base+local);for(const p of after.poses){rootJoin=Math.max(rootJoin,gap(p.position,before.poses[p.id].position));yawJoin=Math.max(yawJoin,Math.abs(angle(p.yaw,before.poses[p.id].yaw)));}}
   }
   assert.ok(entries>0);assert.ok(rootJoin<1e-5);assert.ok(yawJoin<1e-5);console.log(JSON.stringify({id,couples,receivers,entries,rootJoin,yawJoin}));
  }
 }
});
