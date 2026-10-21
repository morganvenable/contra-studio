import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
const raw=readFileSync(new URL('../test-data/contradb/166.json',import.meta.url),'utf8');
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('bare mirrored passage retains source evidence and requires removable shoulder choice',()=>{
 const p=prepareContraDbReview(raw),r=p.result,d=r.dance!;assert.ok(d,r.errors.join('; '));
 assert.deepEqual(d.figures.map(f=>f.beats),[8,8,8,8,4,12,8,6,2]);
 assert.equal(r.record!.rows.at(-1)!.text,'pass through ⁋');assert.equal(d.figures.at(-1)!.passingShoulder,'left');
 assert.ok(r.rows.at(-1)!.interpretations.some(s=>s.includes('source omits shoulder')));
 assert.deepEqual(readContraDbImport(d.sourceText!).dance,d);
 const row=r.record!.rows.at(-1)!.id;delete p.interpretation.rows![row].passThrough;
 assert.equal(readContraDbImport(raw,{interpretation:p.interpretation}).dance,undefined);
 p.interpretation.rows![row].passThrough={relation:'neighbor',passingShoulder:'right'};
 assert.equal(readContraDbImport(raw,{interpretation:p.interpretation}).dance,undefined);
});
for(const couples of[3,4])test(`bare mirrored passage preserves ${couples}-couple period, people and contacts`,()=>{
 const d=prepareContraDbReview(raw).result.dance!;assert.ok(d);const c=compileChoreography(d,couples) as CompiledStateSequence;
 let proofs=0,minClearance=Infinity,maxSpeed=0,neighborFrames=0,partnerFrames=0;const encounters=new Set<string>();
 for(let repeat=0;repeat<c.periodRepeats;repeat++){
  const base=repeat*64,top=c.topology(base),neighbor=new Map(top.neighbors.flatMap(([a,b])=>[[a,b],[b,a]])),partner=new Map(top.partners.flatMap(([a,b])=>[[a,b],[b,a]]));
  assert.equal(top.epoch,repeat);assert.deepEqual(c.topology(base+64-1e-7),top);assert.equal(c.topology(base+64).epoch,repeat+1);
  for(const[a,b]of top.neighbors)encounters.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));
  for(const p of c.sequenceBoundaries(repeat).filter(p=>p.adapterId.startsWith('mirrored-'))){proofs++;assert.equal(p.contactPolicy,'strict-carried');assertSequenceHandoff(p.incoming,p.entry);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);assert.equal(p.exit.relationshipEpoch,repeat);}
  for(const local of[...c.starts,64]){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const q of b.poses){assert.ok(gap(q,a.poses[q.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(q.yaw-a.poses[q.id].yaw),Math.cos(q.yaw-a.poses[q.id].yaw)))<1e-5);}}
  let prior=c.sample(base);
  for(let k=1;k<=4096;k++){
   const local=k/64,f=c.sample(base+local);for(const p of f.poses)maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*64);
   for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minClearance=Math.min(minClearance,gap(f.poses[a],f.poses[b]));
   for(const h of f.contacts)if(h.kind==='swing-frame'&&h.strength>.999){if(local>8&&local<16){assert.equal(neighbor.get(h.a),h.b);neighborFrames++;}if(local>36&&local<48){assert.equal(partner.get(h.a),h.b);partnerFrames++;}}
   prior=f;
  }
 }
 assert.ok(proofs>0&&neighborFrames>0&&partnerFrames>0);assert.equal(encounters.size,couples*(couples-1)/2);assert.ok(minClearance>=.38);assert.ok(maxSpeed<2.4);
 for(const p of c.sample(0).poses){const q=c.sample(c.periodRepeats*64).poses[p.id];assert.ok(gap(p,q)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw)))<1e-8);}assert.deepEqual(c.sample(0).contacts,c.sample(c.periodRepeats*64).contacts);
 console.log(JSON.stringify({source:166,couples,minClearance,maxSpeed,neighborFrames,partnerFrames}));
});
test('omitted-shoulder continuation is independent of source title and identity',()=>{
 const s=JSON.parse(raw);s.sourceUrl='https://contradb.com/dances/999990';s.html=s.html.replaceAll('/dances/166','/dances/999990').replaceAll('Kiss the Bride','Lantern Passage');const p=prepareContraDbReview(JSON.stringify(s));assert.ok(p.result.dance,p.result.errors.join('; '));assert.equal(p.result.dance.title,'Lantern Passage');assert.match(p.result.record!.snapshotId,/contradb:999990:/);
});
