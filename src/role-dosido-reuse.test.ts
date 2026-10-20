/** Reuse evidence only: no new runtime. Prior do-si-do proof is retained;
 * this test checks the newly arranged swing/ring/petronella suffix. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import type {Frame,Pose} from './types.ts';
const distance=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function source(id:number){const p=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'));assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;}
function motion(f:Frame){return{poses:f.poses,contacts:f.contacts};}
function stations(poses:Pose[]){const group=poses.filter(p=>p.id<4),center={x:group.reduce((s,p)=>s+p.position.x,0)/4,z:group.reduce((s,p)=>s+p.position.z,0)/4};return group.sort((a,b)=>{const station=(p:Pose)=>p.position.z<center.z?(p.position.x<center.x?0:1):(p.position.x>center.x?2:3);return station(a)-station(b);}).map(p=>p.id);}

test('542 source footnote preserves the already-cleared 522 motion exactly',()=>{
 const a=compileChoreography(source(542),3) as CompiledStateSequence,b=compileChoreography(source(522),3) as CompiledStateSequence;
 assert.equal(a.totalBeats,64);assert.equal(a.periodRepeats,6);assert.deepEqual(a.starts,b.starts);
 for(let beat=0;beat<=384;beat++){assert.deepEqual(motion(a.sample(beat)),motion(b.sample(beat)));assert.deepEqual(motion(a.formationSample!(beat)),motion(b.formationSample!(beat)));assert.deepEqual(a.topology(beat),b.topology(beat));}
});

test('3051 composes the existing role exchange with swing to ring, petronella and terminal pass',()=>{
 const dance=source(3051);assert.deepEqual(dance.figures.map(f=>f.beats),[6,10,6,10,4,12,4,4,4,4]);
 for(const couples of[3,4]){
  const c=compileChoreography(dance,couples) as CompiledStateSequence,old=compileChoreography(source(3115),couples) as CompiledStateSequence,sample=c.formationSample!;
  assert.equal(c.totalBeats,64);assert.equal(c.periodRepeats,2*couples);
  // The existing swing-to-ring preparation starts at count46; every earlier
  // first-cycle motion frame is exactly the already-cleared 3115 prefix.
  for(let beat=0;beat<46;beat++)assert.deepEqual(motion(c.sample(beat)),motion(old.sample(beat)));
  if(couples===3)for(const[beat,expected]of[[48,[2,1,0,3]],[52,[2,1,0,3]],[56,[1,0,3,2]],[60,[1,0,3,2]],[64,[2,3,0,1]]]as const)assert.deepEqual(stations(sample(beat).poses),expected,`literal source stations ${beat}`);
  const pairs=new Set<string>();let minRoot=Infinity,maxRootJoin=0,maxYawJoin=0;
  for(let repeat=0;repeat<c.periodRepeats;repeat++){
   const base=repeat*64,topology=c.topology(base);assert.equal(topology.epoch,repeat);
   for(const[a,b]of topology.neighbors)pairs.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));
   assert.deepEqual(c.topology(base+63.999999),topology);assert.equal(c.topology(base+64).epoch,repeat+1);
   const proofs=c.sequenceBoundaries(repeat),petronellas=proofs.filter(p=>p.adapterId==='established:petronella');
   assert.equal(petronellas.length,(couples-topology.waitingIds.length/2)/2);
   for(const p of petronellas){
    assert.equal(p.entry.sourceBeat,52);assert.equal(p.exit.sourceBeat,56);assert.equal(p.entry.relationshipEpoch,repeat);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);
    const center={x:p.entry.poses.reduce((s,q)=>s+q.position.x,0)/4,z:p.entry.poses.reduce((s,q)=>s+q.position.z,0)/4};
    for(const a of p.entry.poses){const b=p.exit.poses.find(q=>q.id===a.id)!;assert.ok(Math.abs(b.position.x-(center.x+a.position.z-center.z))<1e-8);assert.ok(Math.abs(b.position.z-(center.z-a.position.x+center.x))<1e-8);}
   }
   for(const local of[46,48,52,56,60,64]){const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const q of b.poses){maxRootJoin=Math.max(maxRootJoin,distance(q,a.poses[q.id]));maxYawJoin=Math.max(maxYawJoin,Math.abs(angle(q.yaw,a.poses[q.id].yaw)));}}
   // Sampling is confined to the changed 18-count suffix, including physical
   // same-end waiters and re-entry. Earlier role paths were already proved.
   for(let local=46;local<=64;local+=.5){const f=c.sample(base+local);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minRoot=Math.min(minRoot,distance(f.poses[a],f.poses[b]));}
  }
  assert.equal(pairs.size,couples*(couples-1)/2);assert.ok(minRoot>.4,`suffix min roots ${minRoot}`);assert.ok(maxRootJoin<1e-5,`root join ${maxRootJoin}`);assert.ok(maxYawJoin<1e-5,`yaw join ${maxYawJoin}`);
  for(const q of c.sample(0).poses){const end=c.sample(c.periodRepeats*64).poses[q.id];assert.ok(distance(q,end)<1e-9);assert.ok(Math.abs(angle(q.yaw,end.yaw))<1e-9);}
  console.log(JSON.stringify({source:3051,couples,periodRepeats:c.periodRepeats,observedCouplePairs:pairs.size,minRoot,maxRootJoin,maxYawJoin}));
 }
});

test('1464 reuses the same role exchange after two chains and directly acquires the eight-count partner swing',()=>{
 const dance=source(1464);assert.deepEqual(dance.figures.map(f=>f.beats),[4,12,8,8,8,8,8,6,2]);
 for(const couples of[3,4]){
  const c=compileChoreography(dance,couples) as CompiledStateSequence,sample=c.formationSample!;
  assert.equal(c.totalBeats,64);assert.equal(c.periodRepeats,2*couples);
  if(couples===3)for(const[beat,expected]of[[32,[2,3,0,1]],[40,[2,1,0,3]],[48,[2,1,0,3]],[56,[2,1,0,3]],[64,[2,3,0,1]]]as const)assert.deepEqual(stations(sample(beat).poses),expected,`literal1464 stations ${beat}`);
  let minRoot=Infinity,maxRootJoin=0,maxYawJoin=0;const pairs=new Set<string>();
  for(let repeat=0;repeat<c.periodRepeats;repeat++){
   const base=repeat*64,topology=c.topology(base),proofs=c.sequenceBoundaries(repeat);
   for(const[a,b]of topology.neighbors)pairs.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));
   assert.deepEqual(c.topology(base+63.999999),topology);assert.equal(c.topology(base+64).epoch,repeat+1);
   for(const p of proofs.filter(p=>p.adapterId==='role-dosido-exchange')){
    assert.equal(p.entry.sourceBeat,32);assert.equal(p.exit.sourceBeat,40);assert.equal(p.contactPolicy,'strict-carried');assert.equal(p.exit.relationshipEpoch,repeat);assert.deepEqual(p.exit.heldContacts,[]);
    const swing=proofs.find(q=>q.entry.sourceBeat===40&&q.entry.actors[0].id===p.entry.actors[0].id)!;assert.ok(swing);assert.equal(swing.adapterId,'established:swing');assert.deepEqual(swing.incoming,p.exit);assert.deepEqual(swing.entry.poses,p.exit.poses);
    // Ordinary eight-count swing gathering is retained. By two counts the
    // persistent partners have the complete held middle, not an empty swing.
    const ids=new Set(p.entry.actors.map(a=>a.id));for(const local of[42,44,46]){const f=c.sample(base+local);for(const[a,b]of topology.partners.filter(([a,b])=>ids.has(a)&&ids.has(b))){const frame=f.contacts.filter(h=>(h.a===a&&h.b===b||h.a===b&&h.b===a)&&h.kind==='swing-frame');assert.equal(frame.length,3);assert.ok(frame.every(h=>h.strength>.999));}}
   }
   for(const local of[32,33,39,40,48,56,61.25,62,64]){const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const q of b.poses){maxRootJoin=Math.max(maxRootJoin,distance(q,a.poses[q.id]));maxYawJoin=Math.max(maxYawJoin,Math.abs(angle(q.yaw,a.poses[q.id].yaw)));}}
   for(let local=40;local<=64;local+=.5){const f=c.sample(base+local);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minRoot=Math.min(minRoot,distance(f.poses[a],f.poses[b]));}
  }
  assert.equal(pairs.size,couples*(couples-1)/2);assert.ok(minRoot>.4);assert.ok(maxRootJoin<1e-5);assert.ok(maxYawJoin<1e-5);
  for(const q of c.sample(0).poses){const end=c.sample(c.periodRepeats*64).poses[q.id];assert.ok(distance(q,end)<1e-9);assert.ok(Math.abs(angle(q.yaw,end.yaw))<1e-9);}
  console.log(JSON.stringify({source:1464,couples,periodRepeats:c.periodRepeats,observedCouplePairs:pairs.size,minRoot,maxRootJoin,maxYawJoin}));
 }
});
