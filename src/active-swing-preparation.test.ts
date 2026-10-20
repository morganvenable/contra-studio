import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {compileStateSequence,type CompiledStateSequence} from './state-sequence.ts';
import {REGISTERED_MOTION_CAPABILITIES as caps} from './capabilities.ts';
import type {Dance} from './types.ts';
const source=()=>{const p=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/2490.json',import.meta.url),'utf8'));assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const pair=(a:number,b:number)=>[a,b].sort((x,y)=>x-y).join(':');
function check(d:Dance,couples:number){
 const c=compileChoreography(d,couples)as CompiledStateSequence,T=c.totalBeats;assert.equal(c.repeatable,true);assert.ok(c.formationSample);assert.deepEqual(c.balancePreparations,[{figureId:d.figures.at(-1)!.id,targetFigureId:d.figures[0].id,sourceStart:T-1.5,sourceEnd:T,duration:1.5,targetBinding:'next-cycle-actual-neighbors',formationSample:'before-balance-preparation'}]);
 let minimumGap=Infinity,maximumSpeed=0,maximumOffset=0,firstNewHold=Infinity,join=0,waitingMovements=0;const activeCouples=new Set<number>();
 for(let r=0;r<c.periodRepeats;r++){
  const base=r*T,proofs=c.sequenceBoundaries(r).filter(p=>p.adapterId==='active-ones-swing'),next=c.topology(base+T),nextPairs=new Set(next.neighbors.map(([a,b])=>pair(a,b))),waitingNow=new Set(c.topology(base+T-2).waitingIds),waitingNext=new Set(next.waitingIds);
  for(const p of proofs){activeCouples.add(c.dancers[p.currentRank!.ones[0]].couple);assert.equal(p.exit.relationshipEpoch,r);assert.equal(p.exit.sourceBeat,T);}
  for(const t of[...Array.from({length:257},(_,i)=>T-8+i/32),T-1.51,T-1.5,T-1.49,T-1e-7]){
   const beat=base+t,f=c.sample(beat),raw=c.formationSample!(beat),a=c.sample(beat-1e-5),z=c.sample(beat+1e-5);
   for(const p of f.poses){const offset=distance(p.position,raw.poses[p.id].position);maximumOffset=Math.max(maximumOffset,offset);if(t<=T-1.5)assert.ok(offset<1e-10,'no root motion from preparation before frame release');if(t>T-1.5&&t<T){if(waitingNext.has(p.id))assert.ok(offset<1e-10,'no absent-next-neighbor target');if(waitingNow.has(p.id)&&offset>1e-5)waitingMovements++;}maximumSpeed=Math.max(maximumSpeed,distance(a.poses[p.id].position,z.poses[p.id].position)/2e-5);}
   for(let i=0;i<f.poses.length;i++)for(let j=i+1;j<f.poses.length;j++)minimumGap=Math.min(minimumGap,distance(f.poses[i].position,f.poses[j].position));
   if(t<T){assert.equal(c.topology(beat).epoch,r);for(const h of f.contacts){if(t>=T-1.5)assert.notEqual(h.kind,'swing-frame');if(h.kind==='joined'){assert.ok(t>T-1.5);assert.ok(nextPairs.has(pair(h.a,h.b)),'preparation uses actual next binding');assert.ok(!waitingNext.has(h.a)&&!waitingNext.has(h.b));firstNewHold=Math.min(firstNewHold,t-(T-64));}}}
  }
  const a=c.sample(base+T-1e-7),b=c.sample(base+T);assert.equal(c.topology(base+T).epoch,r+1);for(const p of b.poses){join=Math.max(join,distance(p.position,a.poses[p.id].position));assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-a.poses[p.id].yaw),Math.cos(p.yaw-a.poses[p.id].yaw)))<1e-6);}
 }
 assert.equal(activeCouples.size,couples,'later reentered couples receive the current ones rank');assert.ok(waitingMovements>0);assert.ok(minimumGap>.6199);assert.ok(maximumSpeed<.72);assert.ok(maximumOffset<=.310001);assert.ok(join<1e-6);assert.ok(firstNewHold>62.5);
 console.log(JSON.stringify({id:d.id,couples,total:T,minimumGap,maximumSpeed,maximumOffset,firstNewHold,join,waitingMovements,activeCouples:[...activeCouples]}));
}
test('reviewed active swing prepares the actual next balance only after release, through odd/even finite periods',()=>{const d=source();assert.equal(d.figures.at(-1)!.preparation,'next-neighbor-balance');for(const n of[3,4])check(d,n);});
test('the same preparation supports a longer public composition and re-ranked later repeats',()=>{
 const original=source(),figures=structuredClone(original.figures);figures.splice(figures.length-1,0,{id:'synthetic-extra-lines',kind:'long-lines',who:'all',beats:8,label:'Additional endpoint-preserving lines'});
 const d:Dance={id:'synthetic-active-preparation',title:'Synthetic shared preparation',author:'Test',formation:'duple-improper',description:'A distinct seventy-two-count composition.',figures,verified:true,progressionEvents:[{afterFigureId:figures.at(-1)!.id,count:1,waitingRoleArrangement:'lark-left',source:{sourceId:'synthetic:released-preparation',url:'https://example.test/synthetic-preparation',clause:'Explicit terminal event after the active swing',basis:'reviewed-interpretation'}}]};check(d,3);
});
test('fixed-root declarations and unrelated preparation contracts fail before public stance can alter them',()=>{
 const d=source(),fixed=structuredClone(d);delete fixed.figures.at(-1)!.preparation;assert.throws(()=>compileChoreography(fixed,3),/fixed-root active swing/);assert.throws(()=>compileStateSequence(fixed,3,caps),/fixed-root active swing/);
 for(const edit of[(x:Dance)=>x.figures[0].who='partner',(x:Dance)=>x.figures[0].beats=8,(x:Dance)=>x.figures[1].who='partner',(x:Dance)=>x.figures.at(-1)!.exit='face-down-line',(x:Dance)=>x.figures[2].preparation='next-neighbor-balance']){const bad=structuredClone(d);edit(bad);assert.throws(()=>compileChoreography(bad,3));}
});
