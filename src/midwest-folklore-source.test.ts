import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbImport,type ContraDbInterpretation} from './contradb-import.ts';
import {makeContraDbSnapshot} from './contradb-source.ts';
import {compileChoreography,type CompiledBecketDance} from './choreography.ts';
const raw=readFileSync(new URL('../test-data/contradb/363.json',import.meta.url),'utf8'),interpretation:ContraDbInterpretation={notesReview:'provenance-only',sourceHook:'descriptive',rows:{'contradb:363:row:3':{balanceBeats:4},'contradb:363:row:6':{balanceBeats:4}},circulation:'cw'};
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('363 explicit clockwise review preserves literal Becket, provenance and source counts',()=>{
 const r=readContraDbImport(raw,{interpretation});assert.ok(r.dance,r.errors.join('; '));assert.equal(r.record!.formation,'Becket');assert.equal(r.record!.rows.filter(q=>q.progression).length,1);assert.deepEqual(r.record!.rows.map(q=>q.beats),[2,6,8,16,8,8,16]);assert.equal(r.dance.circulation,'cw');assert.deepEqual(JSON.parse(r.dance.sourceText!).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r.record!))));assert.deepEqual(readContraDbImport(r.dance.sourceText!).dance,r.dance);
 const absent=structuredClone(interpretation);delete absent.circulation;assert.equal(readContraDbImport(raw,{interpretation:absent}).dance,undefined);assert.equal(readContraDbImport(raw,{interpretation:{...interpretation,circulation:'ccw'}}).dance,undefined);
 const archive=readFileSync(new URL('../test-data/reviewed-interpretations/363.json',import.meta.url),'utf8');assert.deepEqual(JSON.parse(archive),JSON.parse(r.dance.sourceText!));assert.deepEqual(readContraDbImport(archive).dance,r.dance);
});
for(const couples of[3,4])test(`363 full ${couples}-couple circulation retains actual named contacts and finite joins`,()=>{
 const r=readContraDbImport(raw,{interpretation});assert.ok(r.dance);const c=compileChoreography(r.dance,couples) as CompiledBecketDance,period=2*couples*64;let minGap=Infinity,maxSpeed=0,neighbor=0,partner=0,waiting=0;
 for(let repeat=0;repeat<2*couples;repeat++){
  const base=repeat*64,topology=c.topology(base+2),neighbors=new Map(topology.neighbors.flatMap(([a,b])=>[[a,b],[b,a]]));assert.equal(c.topology(base+2-1e-7).epoch,repeat);assert.equal(topology.epoch,repeat+1);waiting+=topology.waitingCouples.length;
  let prior=c.sample(base);
  for(let k=1;k<=2048;k++){const local=k/32,f=c.sample(base+local),figure=c.dance.figures[f.figureIndex];for(const p of f.poses){assert.ok(Number.isFinite(p.position.x+p.position.z+p.yaw));maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*32);}for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minGap=Math.min(minGap,gap(f.poses[a],f.poses[b]));
   if(local>2&&local<64)for(const h of f.contacts){assert.ok(h.strength>0&&h.strength<=1);assert.ok(!topology.waitingCouples.includes(c.dancers[h.a].couple)&&!topology.waitingCouples.includes(c.dancers[h.b].couple));if(['balance','swing'].includes(figure.kind)){if(figure.who==='partner'){assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple);if(h.strength>.999)partner++;}else{assert.equal(neighbors.get(h.a),h.b);if(h.strength>.999)neighbor++;}}}
   prior=f;
  }
  for(const local of c.starts.concat(64)){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-a.poses[p.id].yaw),Math.cos(p.yaw-a.poses[p.id].yaw)))<1e-5);}}
 }
 assert.ok(waiting>0&&neighbor>0&&partner>0);assert.deepEqual(c.sample(period).poses,c.sample(0).poses);assert.deepEqual(c.sample(period).contacts,c.sample(0).contacts);console.log(JSON.stringify({id:363,couples,minGap,maxSpeed,neighbor,partner,scope:'whole finite period roots and named contacts'}));
});
