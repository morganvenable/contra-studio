import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importContraDb} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import type {MotionCapabilities,Pose} from './types.ts';
const input=readFileSync(new URL('../test-data/contradb/1502.json',import.meta.url),'utf8');
const capabilities:MotionCapabilities={archExchanges:true,partialHeys:true};
const interpretation={rows:{'contradb:1502:row:0':{balanceBeats:4 as const},'contradb:1502:row:2':{balanceBeats:4 as const},'contradb:1502:row:5':{chainReceiver:'neighbor' as const}}};
function source(){const result=importContraDb(input,{capabilities,interpretation});assert.deepEqual(result.errors,[]);assert.ok(result.dance);return result.dance;}
const distance=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const yaw=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));

test('actual source1502 is registered with explicit choices and preserves all source clauses',()=>{
 assert.equal(importContraDb(input,{interpretation,capabilities:{archExchanges:false,partialHeys:false}}).coverage.executable,false);
 const dance=source();assert.equal(dance.title,'Dancing in My Bones');assert.equal(dance.sourceRecord.sourceId,'1502');
 assert.deepEqual(dance.figures.map(f=>[f.kind,f.beats]),[['balance',4],['box-the-gnat',4],['hey',8],['balance',4],['swing',12],['allemande',8],['swing',8],['robins-chain',8],['star',8]]);
 assert.match(dance.figures[2].notation!,/ML;PR;WL;NR/);assert.equal(dance.figures[7].who,'neighbor');
 assert.ok(importContraDb(input,{interpretation}).dance);assert.ok(compileChoreography(dance).repeatable);
 assert.throws(()=>compileChoreography(dance,6,{archExchanges:false,partialHeys:false}),/hand variant|Unsupported/);
 const restored=importContraDb(dance.sourceText,{capabilities});assert.deepEqual(restored.errors,[]);assert.deepEqual(restored.dance?.figures,dance.figures);assert.equal(restored.dance?.sourceText,dance.sourceText);
});

test('literal box, half-hey, allemande and chain preserve the independent source corner permutation',()=>{
 const c=compileChoreography(source(),2,capabilities);
 const corners=(beat:number)=>{const poses=c.sample(beat).poses;return [...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);};
 assert.deepEqual(corners(0),[1,0,3,2]);
 assert.deepEqual(corners(8),[2,3,0,1]);
 assert.deepEqual(corners(16),[0,1,2,3]);
 assert.deepEqual(corners(32),[0,1,2,3]);
 assert.deepEqual(corners(40),[2,1,0,3]);
 assert.deepEqual(corners(48),[2,1,0,3]);
 assert.deepEqual(corners(56),[2,3,0,1]);
 assert.deepEqual(corners(64-1e-6),[2,3,0,1]);
 for(const t of[4,6,7])for(const contact of c.sample(t).contacts){assert.equal(contact.kind,'arch');assert.equal(contact.handA,'right');assert.equal(contact.handB,'right');assert.equal(c.dancers[contact.underId!].role,'robin');}
});

test('new complete composition repeats through finite ends for every supported set size',()=>{
 const dance=source();for(let couples=2;couples<=12;couples++){
  const c=compileChoreography(dance,couples,capabilities);assert.ok(c.repeatable);
  for(let repeat=0;repeat<2*couples;repeat++)for(const b of[...c.starts,64]){
   const t=repeat*64+b;if(t===0)continue;const before=c.sample(t-1e-6),after=c.sample(t);
   for(const p of after.poses){assert.ok(distance(p,before.poses[p.id])<2e-5,`root ${couples}/${t}/${p.id}`);assert.ok(yaw(p,before.poses[p.id])<2e-5,`yaw ${couples}/${t}/${p.id}`);}
  }
  const a=c.sample(1.3),b=c.sample(2*couples*64+1.3);for(const p of a.poses){assert.ok(distance(p,b.poses[p.id])<1e-8);assert.ok(yaw(p,b.poses[p.id])<1e-8);}
 }
});

test('prepared first swing counts and full source hand occupancy are deterministic',()=>{
 const c=compileChoreography(source(),6,capabilities);
 for(const t of[10,11.75,13.5,15.25])assert.equal(c.sample(t).contacts.length,0,`The named hey pass at ${t} must remain unjoined.`);
 for(const t of[20,40]){
  const frame=c.sample(t);assert.equal(frame.contacts.length,18);assert.ok(frame.contacts.every(x=>x.kind==='swing-frame'&&x.strength>.999));
 }
 for(let beat=0;beat<128;beat+=.125){const f=c.sample(beat),occupied=new Set<string>();assert.equal(f.poses.length,12);
  for(const p of f.poses)assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));
  for(const hand of f.contacts){for(const[id,side]of[[hand.a,hand.handA],...(!hand.target||hand.target==='hands'?[[hand.b,hand.handB]]:[])]){const key=`${id}:${side}`;assert.ok(!occupied.has(key),`${beat}/${key}`);occupied.add(key);}}
  for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)assert.ok(distance(f.poses[i],f.poses[j])>=.50-1e-8,`${beat}/${i}/${j}`);
 }
 assert.deepEqual(c.sample(6.2),c.sample(6.2));
});

test('newly typed semantics cannot leak through unrelated or disabled adapters',()=>{
 const dance=source();
 for(const edit of[(d:typeof dance)=>d.figures[1].underRole='lark',(d:typeof dance)=>d.figures[1].hands='left',(d:typeof dance)=>d.figures[2].notation='(8) Hey 1/2 (ML;PR;WL)',(d:typeof dance)=>d.figures[3].hands='right',(d:typeof dance)=>d.figures[8].underRole='robin']){const bad=structuredClone(dance);edit(bad);assert.throws(()=>compileChoreography(bad,6,capabilities));}
});
