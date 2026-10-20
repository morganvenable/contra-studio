import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {compileStateSequence,type CompiledStateSequence} from './state-sequence.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {Dance} from './types.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
function source(id:string){const p=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;}
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z),turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),pair=(a:number,b:number)=>[a,b].sort((x,y)=>x-y).join(':');
function check(d:Dance,couples:number){
 const c=compileChoreography(d,couples,caps)as CompiledStateSequence,T=c.totalBeats,prepared=d.figures.at(-1)!.preparation!==undefined,raw=c.formationSample??c.sample,window=c.balancePreparations?.[0],lastGate=T-1.906666666764;
 assert.equal(c.repeatable,true);assert.equal(c.periodRepeats,2*couples);if(prepared){assert.ok(window);assert.ok(Math.abs(window.sourceStart-lastGate)<1e-8);assert.equal(window.sourceEnd,T);assert.equal(window.after,'last-named-shoulder-pass');assert.equal(window.contactState,'released');}else assert.equal(window,undefined);
 let entries=0,minGap=Infinity,maxSpeed=0,maxJoin=0,maxYawJoin=0,maxOffset=0,firstHold=Infinity,waiterPreparations=0;const activeActors=new Set<number>();
 for(let r=0;r<c.periodRepeats;r++){
  const base=r*T,proofs=c.sequenceBoundaries(r).filter(p=>p.adapterId==='neighbor-dosido-exchange'),next=c.topology(base+T),nextPairs=new Set(next.neighbors.map(([a,b])=>pair(a,b))),waitingNext=new Set(next.waitingIds),waitingNow=new Set(c.topology(base+T-8).waitingIds);assert.ok(proofs.length);
  for(const p of proofs){entries++;assert.equal(p.contactPolicy,'strict-carried');assert.deepEqual(p.incoming,p.entry);assert.equal(p.entry.sourceBeat,T-8);assert.equal(p.exit.sourceBeat,T);assert.equal(p.entry.relationshipEpoch,r);assert.equal(p.exit.relationshipEpoch,r);assert.deepEqual(p.entry.heldContacts,[]);assert.deepEqual(p.exit.heldContacts,[]);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);const neighbor=new Map(p.entry.neighbor);
   for(const a of p.entry.poses){activeActors.add(a.id);assert.ok(gap(p.exit.poses.find(b=>b.id===a.id)!.position,p.entry.poses.find(b=>b.id===neighbor.get(a.id))!.position)<1e-8);const full=raw(base+T-2.953333333528);assert.ok(gap(full.poses[a.id].position,a.position)<1e-7,'full own-station return before final half exchange');}
   for(const [local,side]of[[T-6.093333333236,1],[T-4,-1],[lastGate,1]]){const f=raw(base+local),publicFrame=c.sample(base+local);for(const[a,b]of p.entry.neighbor.filter(([a,b])=>a<b)){for(const[id,other]of[[a,b],[b,a]]){const A=f.poses[id],B=f.poses[other],right={x:-Math.cos(A.yaw),z:Math.sin(A.yaw)};assert.ok(side*((B.position.x-A.position.x)*right.x+(B.position.z-A.position.z)*right.z)>.89999,'named right/left/right shoulder order');assert.ok(gap(A.position,publicFrame.poses[id].position)<1e-9,'public preparation does not alter a named shoulder gate');}}}
  }
  const times=[...Array.from({length:257},(_,i)=>T-8+i/32),lastGate-1e-5,lastGate,lastGate+1e-5,T-1e-7];
  for(const t of times){const beat=base+t,f=c.sample(beat),nominal=raw(beat),lo=c.sample(beat-1e-5),hi=c.sample(beat+1e-5);
   for(const p of f.poses){const offset=gap(p.position,nominal.poses[p.id].position);maxOffset=Math.max(maxOffset,offset);if(t<=lastGate||!prepared)assert.ok(offset<1e-9,'no premature or undeclared exit preparation');if(t<T&&prepared){if(waitingNext.has(p.id))assert.ok(offset<1e-9,'no target for absent next neighbor');if(waitingNow.has(p.id)&&offset>1e-6)waiterPreparations++;}maxSpeed=Math.max(maxSpeed,gap(lo.poses[p.id].position,hi.poses[p.id].position)/2e-5);}
   for(let i=0;i<f.poses.length;i++)for(let j=i+1;j<f.poses.length;j++)minGap=Math.min(minGap,gap(f.poses[i].position,f.poses[j].position));
   if(t<T){assert.equal(c.topology(beat).epoch,r);for(const h of f.contacts){assert.ok(prepared&&t>lastGate,'all new holds follow last old-neighbor passage');assert.equal(h.kind,'joined');assert.ok(nextPairs.has(pair(h.a,h.b)));assert.ok(!waitingNext.has(h.a)&&!waitingNext.has(h.b));firstHold=Math.min(firstHold,t-(T-64));}}
  }
  for(const local of[...c.starts,T]){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of b.poses){maxJoin=Math.max(maxJoin,gap(p.position,a.poses[p.id].position));maxYawJoin=Math.max(maxYawJoin,Math.abs(turn(p.yaw,a.poses[p.id].yaw)));}}
  assert.equal(c.topology(base+T-1e-7).epoch,r);assert.equal(c.topology(base+T).epoch,r+1);
 }
 assert.equal(activeActors.size,couples*2);assert.ok(minGap>.5,JSON.stringify({minGap}));assert.ok(maxSpeed<1.2,JSON.stringify({maxSpeed}));assert.ok(maxJoin<1e-5,JSON.stringify({maxJoin}));assert.ok(maxYawJoin<1e-5,JSON.stringify({maxYawJoin}));assert.ok(maxOffset<=.310001);if(prepared){assert.ok(firstHold>62.093333333);assert.ok(waiterPreparations>0);}else assert.equal(firstHold,Infinity);
 const first=c.sample(0),last=c.sample(T*c.periodRepeats);for(const p of first.poses){assert.ok(gap(p.position,last.poses[p.id].position)<1e-7);assert.ok(Math.abs(turn(p.yaw,last.poses[p.id].yaw))<1e-7);}
 console.log(JSON.stringify({id:d.id,couples,total:T,entries,minGap,maxSpeed,maxJoin,maxYawJoin,maxOffset,firstHold:Number.isFinite(firstHold)?firstHold:null,waiterPreparations}));
}
test('actual terminal neighbor exchanges carry the last passage into distinct balance and gyre repeat entries',()=>{for(const id of['831','3081'])for(const n of[3,4])check(source(id),n);});
test('conditional sketchbook source uses its uniquely selected chain and same prepared terminal boundary',()=>{const d=source('575');assert.equal(d.figures.find(f=>f.kind==='robins-chain')!.who,'partner');check(d,3);});
test('a new seventy-two-count public composition preserves the adapter window across a changed producer and reranked repeats',()=>{const original=source('831'),figures=structuredClone(original.figures);figures.splice(figures.length-1,0,{id:'synthetic-lines',kind:'long-lines',who:'all',beats:8,label:'Endpoint-preserving lines'});const d:Dance={id:'synthetic-neighbor-exchange',title:'Carried neighbor exchange',formation:'duple-improper',figures,verified:true,progressionEvents:[{afterFigureId:figures.at(-1)!.id,count:1,waitingRoleArrangement:'lark-left',source:{sourceId:'synthetic:neighbor-exchange',url:'https://example.test/neighbor-exchange',clause:'Explicit terminal event',basis:'reviewed-interpretation'}}]};check(d,3);});
test('prepared declarations require their actual next balance and cannot silently use old kernels',()=>{const d=source('831'),unprepared=structuredClone(d);delete unprepared.figures.at(-1)!.preparation;assert.throws(()=>compileChoreography(unprepared,3,caps),/preparation/);assert.throws(()=>compileStateSequence(unprepared,3,caps),/preparation/);for(const change of[(x:Dance)=>{delete x.progressionEvents;},(x:Dance)=>x.figures[0].who='partner',(x:Dance)=>x.figures[1].who='partner',(x:Dance)=>x.figures.at(-1)!.beats=10,(x:Dance)=>x.figures.at(-1)!.direction='left']){const bad=structuredClone(d);change(bad);assert.throws(()=>compileChoreography(bad,3,caps));}});
