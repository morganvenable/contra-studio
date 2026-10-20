/** Representative odd/even public periods for the shared mad return and the
 * ordered circle exit. Established prefix body/limb paths are not re-swept. */
import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{prepareContraDbReview}from'./source-review.ts';import{compileChoreography}from'./choreography.ts';import{REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';import type{CompiledStateSequence}from'./state-sequence.ts';
const caps=REGISTERED_MOTION_CAPABILITIES,wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x)),gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
for(const id of[1102,182])test(`${id} uses measured mad boundaries through representative odd/even complete periods`,t=>{
 const review=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps);assert.ok(review.result.dance,review.result.errors.join('; '));const d=review.result.dance,results=[];
 for(const count of[3,4]){const c=compileChoreography(d,count,caps)as CompiledStateSequence,first=c.sample(0),madStart=c.starts[d.figures.findIndex(f=>f.kind==='mad-robin')];let min=Infinity,jump=0,yaw=0;
  assert.equal(c.totalBeats,64);assert.ok(c.repeatable);assert.equal(c.periodRepeats,2*count);
  for(let r=0;r<2*count;r++){
   const start=r*64,topology=c.topology(start),proofs=c.sequenceBoundaries(r),madProofs=proofs.filter(p=>p.adapterId==='mad-robin-full-return');assert.ok(madProofs.length);
   for(const proof of madProofs){assert.equal(proof.contactPolicy,'strict-carried');assert.deepEqual(proof.entry,proof.incoming);assert.deepEqual(proof.exit,{...proof.entry,sourceBeat:proof.entry.sourceBeat+8});}
   assert.equal(c.topology(start+63.999).epoch,r);assert.equal(c.topology(start+64).epoch,r+1);
   const samples=new Set([...Array.from({length:33},(_,i)=>madStart+i/4),...(id===182?Array.from({length:33},(_,i)=>56+i/4):[])]);
   for(const local of samples){const f=c.sample(start+local),hands=new Set<string>();for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)min=Math.min(min,gap(f.poses[a].position,f.poses[b].position));
    if(local>=madStart&&local<=madStart+8)for(const proof of madProofs)for(const[a,b]of proof.entry.partner){const p=f.poses[a],q=f.poses[b];assert.ok(Math.abs(wrap(p.yaw-Math.atan2(q.position.x-p.position.x,q.position.z-p.position.z)))<1e-6,'Actual partner gaze throughout full orbit');}
    for(const h of f.contacts)for(const key of[`${h.a}:${h.handA}`,...(!h.target||h.target==='hands'?[`${h.b}:${h.handB}`]:[])]){assert.ok(!hands.has(key));hands.add(key);}
   }
   for(const local of[...c.starts,63,64]){if(!start&&!local)continue;const a=c.sample(start+local-1e-7),b=c.sample(start+local);for(const p of a.poses){jump=Math.max(jump,gap(p.position,b.poses[p.id].position));yaw=Math.max(yaw,Math.abs(wrap(p.yaw-b.poses[p.id].yaw)));}}
   for(const waiting of topology.waitingIds){const a=c.sample(start+13).poses[waiting],b=c.sample(start+63).poses[waiting];assert.equal(a.activity,'waiting');assert.equal(b.activity,'waiting');assert.ok(gap(a.position,b.position)<1e-8);}
   if(id===182)for(const proof of proofs.filter(p=>p.adapterId==='ordered-circle-exit')){const ids=proof.entry.actors.map(a=>a.id),center={x:proof.entry.poses.reduce((n,p)=>n+p.position.x,0)/4,z:proof.entry.poses.reduce((n,p)=>n+p.position.z,0)/4},actor=ids[0];let angle=0,prev=Math.atan2(c.sample(start+56).poses[actor].position.z-center.z,c.sample(start+56).poses[actor].position.x-center.x);for(let k=1;k<=56;k++){const p=c.sample(start+56+k/8).poses[actor].position,a=Math.atan2(p.z-center.z,p.x-center.x);angle+=wrap(a-prev);prev=a;}assert.ok(Math.abs(angle+2*Math.PI)<1e-6,'Complete full right circle by63');
    for(const local of[63,63.25,63.5,63.75,63.999999]){const f=c.sample(start+local),complete=c.sample(start+63);for(const actor of ids)assert.ok(gap(f.poses[actor].position,complete.poses[actor].position)<1e-10,'Facing-only final count');assert.equal(f.contacts.filter(h=>ids.includes(h.a)||ids.includes(h.b)).length,0);}
   }
  }
  const end=c.sample(128*count-1e-7);for(const p of first.poses){assert.ok(gap(p.position,end.poses[p.id].position)<1e-5);assert.ok(Math.abs(wrap(p.yaw-end.poses[p.id].yaw))<1e-5);}assert.ok(min>.45);assert.ok(jump<1e-5&&yaw<1e-5);results.push({count,min,jump,yaw});
 }
 t.diagnostic(JSON.stringify(results));
});
