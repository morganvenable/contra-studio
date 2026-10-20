import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {compilePrimitiveFigure,figureContinuity} from './engine.ts';
import type {CompiledBecketStateSequence} from './becket-state-sequence.ts';
const source=(id:number)=>{const p=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'));assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

test('short-return Becket sources reuse the carried event and distinct existing suffixes through odd/even ends',()=>{
 for(const id of[2518,2522])for(const couples of[3,4]){
  const dance=source(id),c=compileChoreography(dance,couples) as CompiledBecketStateSequence;assert.equal(c.totalBeats,64);assert.equal(c.eventBeat,16);assert.deepEqual(readContraDbImport(dance.sourceText).dance,dance);
  let min=Infinity,rootJoin=0,yawJoin=0,roleReturns=0;
  for(let r=0;r<c.periodStart+c.period;r++){
   const base=64*r;assert.equal(c.topology(base+16-1e-7).epoch,r);assert.equal(c.topology(base+16).epoch,r+1);assert.equal(c.topology(base+64).epoch,r+1);
   for(const b of[...c.starts,64]){if(!base&&!b)continue;const a=c.sample(base+b-1e-7),z=c.sample(base+b);for(const p of z.poses){rootJoin=Math.max(rootJoin,gap(p.position,a.poses[p.id].position));yawJoin=Math.max(yawJoin,Math.abs(turn(p.yaw,a.poses[p.id].yaw)));}}
   for(let b=0;b<64;b+=.25){const f=c.sample(base+b);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)min=Math.min(min,gap(f.poses[a].position,f.poses[b].position));}
   if(id===2518)for(const [start,role]of[[32,'robin'],[40,'lark']]as const){
    const proofs=c.sequenceBoundaries(r).filter(p=>p.incoming.sourceBeat===start);assert.ok(proofs.length>0||c.topology(base+start).waitingIds.length===c.dancers.length);
    for(const proof of proofs){const ids=proof.incoming.actors.filter(a=>a.role===role).map(a=>a.id),inactive=proof.incoming.actors.filter(a=>a.role!==role).map(a=>a.id);assert.equal(ids.length,2);const entry=c.sample(base+start),end=c.sample(base+start+8),A=entry.poses[ids[0]].position,B=entry.poses[ids[1]].position,center={x:(A.x+B.x)/2,z:(A.z+B.z)/2};let angle=Math.atan2(A.z-center.z,A.x-center.x),winding=0;
     for(let n=1;n<=64;n++){const f=c.sample(base+start+n/8),p=f.poses[ids[0]].position,next=Math.atan2(p.z-center.z,p.x-center.x);winding+=turn(next,angle);angle=next;for(const id of inactive)assert.ok(gap(f.poses[id].position,entry.poses[id].position)<1e-8);}
     assert.ok(Math.abs(winding-2*Math.PI)<1e-7);for(const id of ids)assert.ok(gap(entry.poses[id].position,end.poses[id].position)<1e-8);for(const t of[2,6]){const f=c.sample(base+start+t),a=f.poses[ids[0]],b=f.poses[ids[1]],right={x:-Math.cos(a.yaw),z:Math.sin(a.yaw)},side=(b.position.x-a.position.x)*right.x+(b.position.z-a.position.z)*right.z;assert.ok(t===2?side>.65:side<-.65);}roleReturns++;
    }
   }
  }
  assert.ok(min>.45,`root clearance ${min}`);assert.ok(rootJoin<1e-5);assert.ok(yawJoin<1e-5);if(id===2518)assert.ok(roleReturns>0);
  const a=c.sample(c.periodStart*64),b=c.sample((c.periodStart+c.period)*64);for(const p of a.poses){assert.ok(gap(p.position,b.poses[p.id].position)<1e-7);assert.ok(Math.abs(turn(p.yaw,b.poses[p.id].yaw))<1e-7);}console.log(JSON.stringify({id,couples,period:c.period,min,rootJoin,yawJoin,roleReturns}));
 }
});

test('full role do-si-do admission keeps exact declared roles, amount and shoulder while rejecting incompatible declarations',()=>{
 const dance=source(2518),c=compileChoreography(dance,3) as CompiledBecketStateSequence,proof=c.sequenceBoundaries(0).find(p=>p.incoming.sourceBeat===32)!;assert.ok(proof);const index=dance.figures.findIndex(f=>f.kind==='do-si-do'),f=dance.figures[index],ids=proof.incoming.actors.map(a=>a.id),start=c.sample(32).poses,directions=c.dancers.filter(d=>d.role==='lark').map(d=>d.direction);
 const compile=(figure=structuredClone(f),actors=structuredClone(c.dancers))=>compilePrimitiveFigure(figure,ids,start,actors,directions,figureContinuity(dance.figures,index));assert.doesNotThrow(()=>compile());
 for(const patch of[{who:'all'},{amount:1.5},{amount:.5},{direction:'left'},{hands:'right'},{beats:0},{beats:NaN}])assert.throws(()=>compile({...f,...patch} as typeof f));
 const bad=structuredClone(c.dancers);bad[ids[0]].role=bad[ids[1]].role=bad[ids[2]].role='lark';assert.throws(()=>compile(f,bad),/exactly two named/);
 const plan=compile();for(const id of ids.filter(id=>c.dancers[id].role==='lark'))for(const t of[0,.25,.5,.75,1]){assert.deepEqual(plan.position(id,t),start[id].position);assert.equal(plan.facing(id,t),start[id].yaw);}
});
