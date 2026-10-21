import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledBecketStateSequence} from './becket-state-sequence.ts';
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
test('2247 actual chain and ring adapters do not waive remaining compact-swing clearance hold',()=>{
 const p=prepareContraDbReview(raw(2247));p.interpretation.rows??={};p.interpretation.rows['contradb:2247:row:1']={chainReceiver:'neighbor'};
 const r=readContraDbImport(raw(2247),{interpretation:p.interpretation});assert.equal(r.dance,undefined);assert.ok(r.errors.some(e=>e.includes('global torso-clearance')));assert.ok(!r.errors.some(e=>e.includes('No registered primitive')));
 p.interpretation.rows['contradb:2247:row:1'].chainReceiver='partner';assert.ok(readContraDbImport(raw(2247),{interpretation:p.interpretation}).errors.some(e=>e.includes('receiving partner')));
});
