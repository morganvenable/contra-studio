import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const source=(id:number)=>{const p=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};

test('active ones remain epoch-bound through actual odd/even finite periods, independent of reached row and original rank',()=>{
 for(const id of[1036,2141])for(const couples of[3,4]){
  const d=source(id),c=compileChoreography(d,couples,caps)as CompiledStateSequence;assert.equal(c.totalBeats,64);assert.equal(c.periodRepeats,2*couples);
  let rootJoin=0,yawJoin=0,minGap=Infinity,swings=0;const activeCouples=new Set<number>(),inactiveCouples=new Set<number>();
  for(let repeat=0;repeat<c.periodRepeats;repeat++){
   const base=repeat*64,top=c.topology(base),proofs=c.sequenceBoundaries(repeat).filter(p=>p.adapterId==='active-ones-swing');
   assert.equal(c.topology(base+64-1e-7).epoch,repeat);assert.equal(c.topology(base+64).epoch,repeat+1);
   for(const p of proofs){
    assert.equal(p.contactPolicy,'strict-carried');assert.equal(p.incoming.sourceBeat,56);assert.equal(p.exit.sourceBeat,64);assert.equal(p.currentRank?.relationshipEpoch,repeat);assert.equal(p.entry.relationshipEpoch,repeat);assert.equal(p.exit.relationshipEpoch,repeat);assert.deepEqual(p.incoming,p.entry);
    const rank=p.currentRank!,A=rank.ones,B=rank.twos;assert.equal(rank.forwardDirection,1);assert.equal(new Set([...A,...B]).size,4);assert.ok([...A,...B].every(a=>!top.waitingIds.includes(a)));
    // The explicit rank agrees with the epoch-start direction and ordering,
    // even though this prefix has already put ones on the southern row.
    const start=c.sample(base),entry=c.sample(base+56),onesZ=A.reduce((n,a)=>n+start.poses[a].position.z,0)/2,twosZ=B.reduce((n,a)=>n+start.poses[a].position.z,0)/2;
    assert.ok(onesZ<twosZ);assert.ok(A.reduce((n,a)=>n+entry.poses[a].position.z,0)/2>B.reduce((n,a)=>n+entry.poses[a].position.z,0)/2);
    activeCouples.add(c.dancers[A[0]].couple);inactiveCouples.add(c.dancers[B[0]].couple);assert.equal(c.dancers[A[0]].couple,c.dancers[A[1]].couple);assert.equal(c.dancers[B[0]].couple,c.dancers[B[1]].couple);
    const center={x:(entry.poses[A[0]].position.x+entry.poses[A[1]].position.x)/2,z:(entry.poses[A[0]].position.z+entry.poses[A[1]].position.z)/2};let last=Math.atan2(entry.poses[A[0]].position.z-center.z,entry.poses[A[0]].position.x-center.x),winding=0;
    for(let tick=0;tick<=256;tick++){
     const local=tick/32,beat=base+56+local,frame=c.sample(beat===base+64?beat-1e-8:beat);const pos=frame.poses[A[0]].position,next=Math.atan2(pos.z-center.z,pos.x-center.x);winding+=angle(next,last);last=next;
     for(const actor of B){assert.ok(gap(frame.poses[actor].position,entry.poses[actor].position)<1e-8);assert.equal(frame.poses[actor].activity,'waiting');assert.equal(frame.poses[actor].turn,0);assert.equal(frame.poses[actor].lean,0);if(local<=6.5)assert.ok(Math.abs(angle(frame.poses[actor].yaw,entry.poses[actor].yaw))<1e-8);}
     const contacts=frame.contacts.filter(x=>[...A,...B].includes(x.a)||[...A,...B].includes(x.b));assert.ok(contacts.every(x=>A.includes(x.a)&&A.includes(x.b)));if(local===3)assert.equal(contacts.length,3);
     for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minGap=Math.min(minGap,gap(frame.poses[a].position,frame.poses[b].position));
    }
    assert.ok(Math.abs(winding-2*Math.PI)<1e-7);for(const actor of A){assert.ok(gap(p.exit.poses.find(x=>x.id===actor)!.position,entry.poses[actor].position)<1e-8);assert.ok(Math.abs(angle(p.exit.poses.find(x=>x.id===actor)!.yaw,0))<1e-7);}
    for(const actor of B)assert.ok(Math.abs(angle(p.exit.poses.find(x=>x.id===actor)!.yaw,Math.PI))<1e-7);assert.deepEqual(p.exit.heldContacts,[]);swings++;
   }
   for(const local of[...c.starts,64]){if(!base&&!local)continue;const before=c.sample(base+local-1e-7),after=c.sample(base+local);for(const p of after.poses){rootJoin=Math.max(rootJoin,gap(p.position,before.poses[p.id].position));yawJoin=Math.max(yawJoin,Math.abs(angle(p.yaw,before.poses[p.id].yaw)));}}
   // At a finite end no fictitious new neighbor is assigned: the next epoch
   // exposes waiting IDs, whose existing eight-count turnaround precedes reentry.
   const next=c.topology(base+64);for(const actor of next.waitingIds)assert.ok(!next.neighbors.some(pair=>pair.includes(actor)));
  }
  assert.equal(activeCouples.size,couples);assert.equal(inactiveCouples.size,couples);assert.ok(swings>0);assert.ok(minGap>.60,`clearance ${minGap}`);assert.ok(rootJoin<1e-5);assert.ok(yawJoin<1e-5);
  const initial=c.sample(0),last=c.sample(c.periodRepeats*64);for(const p of initial.poses){assert.ok(gap(p.position,last.poses[p.id].position)<1e-8);assert.ok(Math.abs(angle(p.yaw,last.poses[p.id].yaw))<1e-8);}console.log(JSON.stringify({id,couples,swings,minGap,rootJoin,yawJoin,activeCouples:[...activeCouples],inactiveCouples:[...inactiveCouples]}));
 }
});
