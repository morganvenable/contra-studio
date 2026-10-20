import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {Dance} from './types.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const source=(id:number)=>{const p=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function check(d:Dance,couples:number){
 const c=compileChoreography(d,couples,caps) as CompiledStateSequence,T=c.totalBeats;assert.equal(c.repeatable,true);assert.equal(c.periodRepeats,2*couples);
 let entries=0,minGap=Infinity,minLocalGap=Infinity,maxSpeed=0,maxJoin=0,maxYawJoin=0;let closest:unknown;
 for(let r=0;r<c.periodRepeats;r++){
  const base=r*T,proofs=c.sequenceBoundaries(r).filter(p=>p.adapterId==='couples-do-si-do');assert.ok(proofs.length>0);
  for(const p of proofs){
   entries++;assert.equal(p.contactPolicy,'strict-carried');assert.deepEqual(p.incoming,p.entry);assert.equal(p.exit.sourceBeat-p.entry.sourceBeat,8);assert.equal(p.entry.relationshipEpoch,r);assert.equal(p.exit.relationshipEpoch,r);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);assert.deepEqual(p.entry.heldContacts,[]);assert.deepEqual(p.exit.heldContacts,[]);
   for(const a of p.entry.poses)assert.ok(gap(a.position,p.exit.poses.find(b=>b.id===a.id)!.position)<1e-12,'full own-station return');
   const pairs=p.entry.partner.filter(([a,b])=>a<b),start=base+p.entry.sourceBeat;
   for(let k=0;k<=64;k++){
    const t=k/8,f=c.sample(start+t),before=c.sample(start+t-1e-5),after=c.sample(start+t+1e-5);
    for(const[a,b]of pairs){const A=f.poses[a].position,B=f.poses[b].position,oldA=p.entry.poses.find(q=>q.id===a)!.position,oldB=p.entry.poses.find(q=>q.id===b)!.position;assert.ok(Math.hypot((B.x-A.x)-(oldB.x-oldA.x),(B.z-A.z)-(oldB.z-oldA.z))<1e-8,'persistent-partner unit offsets are rigid');}
    for(const a of p.entry.poses){const now=f.poses[a.id];if(t>=1&&t<8)assert.ok(Math.abs(turn(now.yaw,p.exit.poses.find(q=>q.id===a.id)!.yaw))<1e-8,'fixed room facing during unit travel');maxSpeed=Math.max(maxSpeed,gap(before.poses[a.id].position,after.poses[a.id].position)/2e-5);}
    if(t<8){assert.equal(c.topology(start+t).epoch,r);assert.equal(f.contacts.filter(h=>p.entry.actors.some(a=>a.id===h.a||a.id===h.b)).length,0,'released schematic units have no invented grip');}
    for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++){const g=gap(f.poses[a].position,f.poses[b].position);if(g<minGap){minGap=g;closest={r,local:p.entry.sourceBeat+t,a,b,pa:f.poses[a].position,pb:f.poses[b].position};}}
    for(let a=0;a<p.entry.actors.length;a++)for(let b=a+1;b<p.entry.actors.length;b++)minLocalGap=Math.min(minLocalGap,gap(f.poses[p.entry.actors[a].id].position,f.poses[p.entry.actors[b].id].position));
   }
  }
  for(const local of [...c.starts,T]){if(!base&&!local)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of b.poses){maxJoin=Math.max(maxJoin,gap(p.position,a.poses[p.id].position));maxYawJoin=Math.max(maxYawJoin,Math.abs(turn(p.yaw,a.poses[p.id].yaw)));}}
  assert.equal(c.topology(base+T-1e-7).epoch,r);assert.equal(c.topology(base+T).epoch,r+1);
 }
 const first=c.sample(0),last=c.sample(T*c.periodRepeats);for(const a of first.poses){assert.ok(gap(a.position,last.poses[a.id].position)<1e-7);assert.ok(Math.abs(turn(a.yaw,last.poses[a.id].yaw))<1e-7);}
 assert.ok(minLocalGap>.619999);assert.ok(minGap>.5,JSON.stringify({id:d.id,couples,minGap,closest}));assert.ok(maxSpeed<1.2);assert.ok(maxJoin<1e-5);assert.ok(maxYawJoin<1e-5);
 console.log(JSON.stringify({id:d.id,couples,total:T,entries,minGap,minLocalGap,maxSpeed,maxJoin,maxYawJoin}));
}
test('actual coupled sources preserve full unit returns and named identities through odd/even finite periods',()=>{for(const id of[624,1702])for(const n of[3,4])check(source(id),n);});
test('the coupled boundary accepts a distinct public producer arrangement without a source signature',()=>{
 const original=source(624),figures=structuredClone(original.figures),i=figures.findIndex(f=>f.kind==='couples-do-si-do');figures.splice(i,0,{id:'synthetic-lines',kind:'long-lines',who:'all',beats:8,label:'Endpoint-preserving long lines'});
 const d:Dance={id:'synthetic-coupled-sequence',title:'Carried coupled unit sequence',formation:'duple-improper',figures,verified:true,progressionEvents:[{afterFigureId:figures.at(-1)!.id,count:1,waitingRoleArrangement:'lark-left',source:{sourceId:'synthetic:coupled-sequence',url:'https://example.test/coupled-sequence',clause:'Explicit terminal event',basis:'reviewed-interpretation'}}]};check(d,3);
});
