/** One actual-source odd/even proof for the shared radial swing entry.
 * The unchanged two-turn paths retain their separate prior behavior. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import type {Pose} from './types.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const source=()=>{const p=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/3087.json',import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};
const stations=(ps:Pose[])=>{const group=ps.filter(p=>p.id<4),x=group.reduce((n,p)=>n+p.position.x,0)/4,z=group.reduce((n,p)=>n+p.position.z,0)/4;const at=(p:Pose)=>p.position.z<z?(p.position.x<x?0:1):(p.position.x>x?2:3);return group.sort((a,b)=>at(a)-at(b)).map(p=>p.id);};

test('3087 carries the real transverse partner frame into the existing swing and closes odd/even finite sets',()=>{
 const dance=source();assert.deepEqual(dance.figures.map(f=>f.beats),[8,8,4,12,8,8,8,8]);assert.equal(dance.progressionEvents?.length,1);
 for(const couples of[3,4]){
  const c=compileChoreography(dance,couples,caps) as CompiledStateSequence;assert.equal(c.totalBeats,64);assert.equal(c.periodRepeats,2*couples);
  if(couples===3)for(const[beat,expected]of[[32,[2,1,0,3]],[40,[1,0,3,2]],[48,[2,3,0,1]],[64,[2,3,0,1]]]as const)assert.deepEqual(stations(c.formationSample!(beat).poses),expected,`literal source station ${beat}`);
  let minimumRoot=Infinity,maximumRootJoin=0,maximumYawJoin=0,strictFrames=0;const encounters=new Set<string>();
  for(let repeat=0;repeat<c.periodRepeats;repeat++){
   const base=64*repeat,top=c.topology(base);for(const[a,b]of top.neighbors)encounters.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));
   assert.deepEqual(c.topology(base+64-1e-7),top);assert.equal(c.topology(base+64).epoch,repeat+1);
   for(const p of c.sequenceBoundaries(repeat).filter(p=>p.adapterId==='paired-radial-swing')){
    strictFrames++;assert.equal(p.entry.sourceBeat,20);assert.equal(p.exit.sourceBeat,32);assert.equal(p.contactPolicy,'strict-carried');assertSequenceHandoff(p.incoming,p.entry);assert.equal(p.entry.heldContacts.length,6);assert.equal(p.exit.heldContacts.length,0);assert.equal(p.exit.relationshipEpoch,repeat);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);
    const pairs=new Map(p.entry.partner),poses=new Map(p.entry.poses.map(q=>[q.id,q]));for(const a of p.entry.actors.filter(a=>a.role==='lark')){const A=poses.get(a.id)!,B=poses.get(pairs.get(a.id)!)!;assert.ok(Math.abs(A.position.z-B.position.z)<1e-7);assert.ok(Math.abs(Math.hypot(A.position.x-B.position.x,A.position.z-B.position.z)-.62)<1e-7);}
   }
   for(const local of c.starts.concat(64)){const before=c.sample(base+local-1e-7),at=c.sample(base+local);for(const p of at.poses){maximumRootJoin=Math.max(maximumRootJoin,gap(p,before.poses[p.id]));maximumYawJoin=Math.max(maximumYawJoin,Math.abs(turn(p.yaw,before.poses[p.id].yaw)));}}
   for(let local=0;local<=64;local+=.5){const f=c.sample(base+local);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minimumRoot=Math.min(minimumRoot,gap(f.poses[a],f.poses[b]));}
  }
  assert.ok(strictFrames>0);assert.equal(encounters.size,couples*(couples-1)/2);assert.ok(minimumRoot>=.38,`clearance ${minimumRoot}`);assert.ok(maximumRootJoin<1e-5,`root join ${maximumRootJoin}`);assert.ok(maximumYawJoin<1e-5,`yaw join ${maximumYawJoin}`);
  for(const p of c.sample(0).poses){const q=c.sample(c.periodRepeats*64).poses[p.id];assert.ok(gap(p,q)<1e-9);assert.ok(Math.abs(turn(p.yaw,q.yaw))<1e-9);}
  console.log(JSON.stringify({source:3087,couples,periodRepeats:c.periodRepeats,strictFrames,minimumRoot,maximumRootJoin,maximumYawJoin}));
 }
});
