import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import {distance,turn} from './ring-twirl-contract.ts';

const caps=REGISTERED_MOTION_CAPABILITIES;
const source=(id:number)=>{const r=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps);assert.ok(r.result.dance,r.result.errors.join('; '));return r.result.dance;};

for(const id of [340,682])for(const couples of [3,4])test(`actual source ${id} carries measured RLT and six-plus-two through a complete ${couples}-couple period`,()=>{
 const dance=source(id),p=compileChoreography(dance,couples,caps) as CompiledStateSequence;
 assert.equal(p.totalBeats,64);assert.equal(p.periodRepeats,2*couples);assert.equal(p.repeatable,true);
 assert.equal(dance.sixTwoPassPolicy,undefined);assert.equal(dance.endPolicy,undefined);
 assert.equal(dance.progressionEvents!.length,1);assert.equal(dance.progressionEvents![0].afterFigureId,dance.figures.at(-1)!.id);
 const partners=p.topology(0).partners;let minimumRoot=Infinity,maximumSeam=0;
 for(let repeat=0;repeat<p.periodRepeats;repeat++){
  const topology=p.topology(repeat*64);assert.equal(topology.epoch,repeat);assert.deepEqual(topology.partners,partners);assert.equal(p.topology(repeat*64+64-1e-8).epoch,repeat);
  const proofs=p.sequenceBoundaries(repeat),steps=proofs.filter(x=>['carried-right-left-through','measured-circle-six','measured-pass-two'].includes(x.adapterId));
  assert.equal(steps.length,topology.neighbors.length/2*3);
  for(const proof of steps){
   assert.equal(proof.contactPolicy,'strict-carried');assertSequenceHandoff(proof.incoming,proof.entry);
   assert.equal(proof.entry.relationshipEpoch,repeat);assert.equal(proof.exit.relationshipEpoch,repeat);
   assert.deepEqual(proof.exit.partner,proof.entry.partner);assert.deepEqual(proof.exit.neighbor,proof.entry.neighbor);
   const figure=dance.figures.find(f=>f.id===proof.figureId)!;assert.equal(proof.exit.sourceBeat-proof.entry.sourceBeat,figure.beats);
   assert.deepEqual(proof.exit.heldContacts,[]);
   if(proof.adapterId==='carried-right-left-through'){
    const origin={x:proof.entry.poses.reduce((n,q)=>n+q.position.x,0)/4,z:proof.entry.poses.reduce((n,q)=>n+q.position.z,0)/4};
    assert.equal(proof.entry.heldContacts.length,id===340?4:0);
    for(const q of proof.entry.poses){assert.ok(Math.abs(Math.abs(q.position.x-origin.x)-(id===340?.675:.9))<1e-7);assert.ok(Math.abs(Math.abs(q.position.z-origin.z)-(id===340?.675:.55))<1e-7);}
    for(const q of proof.exit.poses){const before=proof.entry.poses.find(a=>a.id===q.id)!;assert.ok(Math.abs(q.position.x-origin.x+Math.sign(before.position.x-origin.x)*.9)<1e-7);assert.ok(Math.abs(q.position.z-origin.z+Math.sign(before.position.z-origin.z)*.9)<1e-7);}
   }
  }
  for(const local of [...p.starts,64]){
   const beat=repeat*64+local;if(!beat)continue;const before=p.sample(beat-1e-7),after=p.sample(beat);
   for(const q of after.poses){const gap=distance(q.position,before.poses[q.id].position);maximumSeam=Math.max(maximumSeam,gap);assert.ok(gap<2e-5,`${id} actor${q.id} root at${beat}`);assert.ok(Math.abs(turn(q.yaw,before.poses[q.id].yaw))<2e-5,`${id} actor${q.id} facing at${beat}`);}
  }
  for(let local=0;local<64;local+=.125){const f=p.sample(repeat*64+local),hands=new Set<string>();for(let a=0;a<f.poses.length;a++){const q=f.poses[a];assert.ok([q.position.x,q.position.z,q.yaw].every(Number.isFinite));for(let b=a+1;b<f.poses.length;b++)minimumRoot=Math.min(minimumRoot,distance(q.position,f.poses[b].position));}for(const c of f.contacts){assert.ok([c.point.x,c.point.y,c.point.z,c.strength].every(Number.isFinite));if(c.strength>.01)for(const hand of [`${c.a}:${c.handA}`,...(c.target===undefined||c.target==='hands'?[`${c.b}:${c.handB}`]:[])]){assert.ok(!hands.has(hand),`${id} duplicate hand at${repeat*64+local}`);hands.add(hand);}}}
 }
 assert.ok(minimumRoot>.45,`${id} minimum root ${minimumRoot}`);
 assert.deepEqual(p.sample(0).poses,p.sample(p.periodRepeats*64).poses);assert.deepEqual(p.sample(0).contacts,p.sample(p.periodRepeats*64).contacts);
 console.log(JSON.stringify({id,couples,minimumRoot,maximumSeam}));
});

test('new measured routes require their source event and explicit capabilities',()=>{
 for(const id of [340,682]){const dance=source(id);for(const gate of ['stateCarryingSequences','stateCarryingRightLeftThroughs','stateCarryingSixTwoPasses','sixTwoPasses','rightLeftThrough','progressionEvents'])assert.throws(()=>compileChoreography(dance,3,{...caps,[gate]:false}));for(const events of [undefined,[],[{...dance.progressionEvents![0],afterFigureId:dance.figures[0].id}]])assert.throws(()=>compileChoreography({...dance,progressionEvents:events},3,caps));}
});
