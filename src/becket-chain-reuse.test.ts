import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledBecketStateSequence} from './becket-state-sequence.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import {compileCompactPairBalanceStep} from './compact-pair-balance-step.ts';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const distance=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
for(const couples of[3,4])test(`independent Becket sequence reuses two actual receiver chains through ${couples}-couple finite periods`,()=>{
 const dance=structuredClone(prepareContraDbReview(raw(2996)).result.dance!);dance.id='independent-two-chain-sequence';dance.title='Two measured chains';
 dance.figures.splice(2,0,{id:'neighbor-chain',kind:'robins-chain',who:'neighbor',beats:8,label:'Chain to current neighbors'},{id:'partner-chain',kind:'robins-chain',who:'partner',beats:8,label:'Chain to persistent partners'});
 const c=compileChoreography(dance,couples) as CompiledBecketStateSequence;assert.equal(c.totalBeats,80);let contacts=0,minGap=Infinity,maxSpeed=0;
 for(let repeat=0;repeat<c.periodStart+c.period;repeat++){
  const base=repeat*80,topology=c.topology(base+16),neighbors=new Map(topology.neighbors.flatMap(([a,b])=>[[a,b],[b,a]]));
  assert.equal(topology.epoch,repeat+1);assert.equal(c.topology(base+16-1e-7).epoch,repeat);
  for(const proof of c.sequenceBoundaries(repeat).filter(p=>p.figureId.endsWith('-chain'))){assert.equal(proof.contactPolicy,'established-acquisition');assert.equal(proof.entry.relationshipEpoch,repeat+1);assert.deepEqual(proof.entry.partner,proof.exit.partner);assert.deepEqual(proof.entry.neighbor,proof.exit.neighbor);}
  let prior=c.sample(base);
  for(let k=1;k<=80*32;k++){const frame=c.sample(base+k/32);for(const p of frame.poses){maxSpeed=Math.max(maxSpeed,distance(p,prior.poses[p.id])*32);assert.ok(Number.isFinite(p.position.x+p.position.z+p.yaw));}for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minGap=Math.min(minGap,distance(frame.poses[a],frame.poses[b]));if(k/32>16&&k/32<32)for(const h of frame.contacts.filter(h=>h.kind==='courtesy')){contacts++;assert.ok(h.strength>0&&h.strength<=1);if(k/32<24)assert.equal(neighbors.get(h.a),h.b);else assert.equal(Math.floor(h.a/2),Math.floor(h.b/2));}prior=frame;}
  for(const local of c.starts.concat(80)){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of b.poses){assert.ok(distance(p,a.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-a.poses[p.id].yaw),Math.cos(p.yaw-a.poses[p.id].yaw)))<1e-5);}}
 }
 assert.ok(contacts>0);assert.ok(minGap>=.45-1e-7);const a=c.sample(c.periodStart*80),b=c.sample((c.periodStart+c.period)*80);for(const p of a.poses){assert.ok(distance(p,b.poses[p.id])<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-b.poses[p.id].yaw),Math.cos(p.yaw-b.poses[p.id].yaw)))<1e-7);}assert.deepEqual(a.contacts,b.contacts);
 console.log(JSON.stringify({couples,minGap,maxSpeed,contacts,period:c.period,scope:'synthetic Becket whole-period actual-bound chains; no new source admission'}));
 const wrong=structuredClone(dance);wrong.figures[2].who='partner';assert.throws(()=>compileChoreography(wrong,couples),/receiving partner/);
});
for(const couples of[3,4])test(`2247 source closes ${couples}-couple periods with physical compact pair acquisition`,()=>{
 const prepared=prepareContraDbReview(raw(2247));prepared.interpretation.rows??={};prepared.interpretation.rows['contradb:2247:row:1']={chainReceiver:'neighbor'};
 const r=readContraDbImport(raw(2247),{interpretation:prepared.interpretation});assert.ok(r.dance,r.errors.join('; '));const c=compileChoreography(r.dance,couples) as CompiledBecketStateSequence;
 assert.equal(c.totalBeats,64);assert.equal(c.eventBeat,8);assert.deepEqual(readContraDbImport(r.dance.sourceText!).dance,r.dance);let minGap=Infinity,maxSpeed=0,fullNeighbor=0,fullPartner=0,compactProofs=0;
 for(let repeat=0;repeat<c.periodStart+c.period;repeat++){
  const base=repeat*64,topology=c.topology(base+8),neighbors=new Map(topology.neighbors.flatMap(([a,b])=>[[a,b],[b,a]]));assert.equal(c.topology(base+8-1e-7).epoch,repeat);assert.equal(topology.epoch,repeat+1);
  for(const p of c.sequenceBoundaries(repeat).filter(p=>p.adapterId==='compact-pair-balance')){
   compactProofs++;assert.equal(p.contactPolicy,'strict-carried');assertSequenceHandoff(p.incoming,p.entry);assert.equal(p.entry.sourceBeat,32);assert.equal(p.exit.sourceBeat,36);assert.equal(p.entry.heldContacts.length,4);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);assert.equal(p.entry.relationshipEpoch,p.exit.relationshipEpoch);
   const center=p.entry.poses.reduce((n,q)=>n+q.position.x/4,0);for(const q of p.exit.poses)assert.ok(Math.abs(Math.abs(q.position.x-center)-.9)<1e-7);assert.ok(p.exit.heldContacts.length>0);for(const h of p.exit.heldContacts){assert.equal(neighbors.get(h.a),h.b);assert.ok(h.strength>.999);}
   const swing=c.sequenceBoundaries(repeat).find(s=>s.entry.sourceBeat===36&&s.entry.actors[0].id===p.entry.actors[0].id)!;assertSequenceHandoff(p.exit,swing.entry);
  }
  let prior=c.sample(base);
  for(let k=1;k<=4096;k++){
   const local=k/64,frame=c.sample(base+local);for(const p of frame.poses){assert.ok(Number.isFinite(p.position.x+p.position.z+p.yaw));maxSpeed=Math.max(maxSpeed,distance(p,prior.poses[p.id])*64);}for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minGap=Math.min(minGap,distance(frame.poses[a],frame.poses[b]));
   const hands=new Set<string>();for(const h of frame.contacts){assert.ok(h.strength>0&&h.strength<=1);for(const key of(h.target&&h.target!=='hands'?[`${h.a}:${h.handA}`]:[`${h.a}:${h.handA}`,`${h.b}:${h.handB}`])){assert.ok(!hands.has(key),'each hand has one contact at '+local+' / '+JSON.stringify(frame.contacts));hands.add(key);}if(local>32.5&&local<48){assert.equal(neighbors.get(h.a),h.b);if(h.strength>.999)fullNeighbor++;}if(local>56&&local<64){assert.equal(Math.floor(h.a/2),Math.floor(h.b/2));if(h.strength>.999)fullPartner++;}}
   prior=frame;
  }
  for(const local of c.starts.concat(64)){if(base+local===0)continue;const before=c.sample(base+local-1e-7),after=c.sample(base+local);for(const p of after.poses){assert.ok(distance(p,before.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-before.poses[p.id].yaw),Math.cos(p.yaw-before.poses[p.id].yaw)))<1e-5);}}
 }
 assert.ok(compactProofs>0&&fullNeighbor>0&&fullPartner>0);assert.ok(minGap>=.45-1e-7);assert.ok(maxSpeed<=1.8+1e-4);
 const first=c.sample(c.periodStart*64),last=c.sample((c.periodStart+c.period)*64);for(const p of first.poses){assert.ok(distance(p,last.poses[p.id])<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-last.poses[p.id].yaw),Math.cos(p.yaw-last.poses[p.id].yaw)))<1e-7);}assert.deepEqual(first.contacts,last.contacts);
 console.log(JSON.stringify({source:2247,couples,minGap,maxSpeed,fullNeighbor,fullPartner,compactProofs,period:c.period}));
 // The same measured boundary is reusable independently of source/title and
 // owns its data. Unsupported hands, stale epochs and incomplete rings reject.
 const proof=c.sequenceBoundaries(0).find(p=>p.adapterId==='compact-pair-balance')!,f={...r.dance.figures.find(f=>f.kind==='balance'&&f.who==='neighbor')!,id:'independent-balance',label:'Measured balance'},start=c.sample(32).poses;
 const context={ids:proof.entry.actors.map(a=>a.id),start,dancers:structuredClone(c.dancers),relations:{epoch:proof.entry.relationshipEpoch,partner:new Map(proof.entry.partner),neighbor:new Map(proof.entry.neighbor)},bindingEpoch:proof.entry.relationshipEpoch,next:r.dance.figures.find(f=>f.kind==='swing'&&f.who==='neighbor')};
 const plan=compileCompactPairBalanceStep(f,context,proof.entry),before=plan.position(context.ids[0],.5);context.start[context.ids[0]].position.x+=100;assert.deepEqual(plan.position(context.ids[0],.5),before);
 let maximumNewReach=0;for(let k=128;k<832;k++){const t=k/1024,poses=c.sample(32+t*4).poses;for(const h of plan.contacts(t,poses)){for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){const p=poses[id],side=hand==='left'?1:-1,reach=Math.hypot(h.point.x-p.position.x-side*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+side*.235*Math.sin(p.yaw));maximumNewReach=Math.max(maximumNewReach,reach);assert.ok(reach<=.68+1e-7);if(h.strength>.999999)assert.ok(reach<=.6201);}}}assert.ok(maximumNewReach>0);
 // Retained two-hand targets meet the ordinary closed-frame transfer without
 // a hidden world-space jump when its contact representation changes.
 const a=c.sample(35.25-1e-8),b=c.sample(35.25+1e-8);for(const h of a.contacts){const next=b.contacts.find(n=>n.a===h.a&&n.handA===h.handA||n.b===h.a&&n.handB===h.handA);assert.ok(next);assert.ok(Math.hypot(h.point.x-next.point.x,h.point.y-next.point.y,h.point.z-next.point.z)<1e-5);}
 context.start=c.sample(32).poses;assert.throws(()=>compileCompactPairBalanceStep({...f,hands:'right'},context,proof.entry));assert.throws(()=>compileCompactPairBalanceStep(f,{...context,bindingEpoch:999},proof.entry));assert.throws(()=>compileCompactPairBalanceStep(f,context,{...proof.entry,heldContacts:proof.entry.heldContacts.slice(1)}));
});
test('2247 actual chain receiver is explicit and its compact balance opens within original counts',()=>{
 const p=prepareContraDbReview(raw(2247));p.interpretation.rows??={};p.interpretation.rows['contradb:2247:row:1']={chainReceiver:'neighbor'};
 const r=readContraDbImport(raw(2247),{interpretation:p.interpretation});assert.ok(r.dance,r.errors.join('; '));assert.equal(r.dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.deepEqual(r.dance.figures.filter(f=>f.id.startsWith('contradb:2247:row:4')).map(f=>f.beats),[4,12]);
 p.interpretation.rows['contradb:2247:row:1'].chainReceiver='partner';assert.ok(readContraDbImport(raw(2247),{interpretation:p.interpretation}).errors.some(e=>e.includes('receiving partner')));
});


