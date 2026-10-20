import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import type {Dance} from './types.ts';
import {distance,turn} from './ring-twirl-contract.ts';

const caps=REGISTERED_MOTION_CAPABILITIES;
const source=(id:1098|115)=>{const r=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps);assert.ok(r.result.dance,r.result.errors.join('; '));return r.result.dance;};

for(const id of[1098,115]as const)for(const couples of[3,4])test(`actual source ${id} carries the new local steps through a complete ${couples}-couple period`,()=>{
 const dance=source(id),p=compileChoreography(dance,couples,caps)as CompiledStateSequence;
 assert.equal(p.totalBeats,64);assert.equal(p.periodRepeats,2*couples);assert.equal(p.repeatable,true);
 const partners=p.topology(0).partners;
 for(let repeat=0;repeat<p.periodRepeats;repeat++){
  const proofs=p.sequenceBoundaries(repeat),topology=p.topology(repeat*64);
  assert.equal(topology.epoch,repeat);assert.deepEqual(topology.partners,partners);assert.equal(p.topology(repeat*64+64-1e-8).epoch,repeat);
  const steps=proofs.filter(x=>['bare-arch-exchange','role-pull-by-swing'].includes(x.adapterId));assert.ok(steps.length>0);assert.equal(steps.length%((id===1098?1:2)*2),0);
  for(const proof of steps){
   assert.equal(proof.contactPolicy,'strict-carried');assertSequenceHandoff(proof.incoming,proof.entry);assert.equal(proof.incoming.relationshipEpoch,repeat);assert.equal(proof.exit.relationshipEpoch,repeat);assert.deepEqual(proof.exit.partner,proof.incoming.partner);assert.deepEqual(proof.exit.neighbor,proof.incoming.neighbor);assert.deepEqual(proof.incoming.heldContacts,[]);assert.deepEqual(proof.exit.heldContacts,[]);
   const f=dance.figures.find(f=>f.id===proof.figureId)!;assert.equal(proof.exit.sourceBeat-proof.entry.sourceBeat,f.beats);
   const from=new Map(proof.entry.poses.map(q=>[q.id,q])),to=new Map(proof.exit.poses.map(q=>[q.id,q]));
   if(f.kind==='box-the-gnat')for(const[a,b]of proof.entry[f.who as 'partner'|'neighbor'])assert.ok(distance(to.get(a)!.position,from.get(b)!.position)<1e-7);
   else{const role=f.who==='larks'?'lark':'robin',active=proof.entry.actors.filter(a=>a.role===role).map(a=>a.id);for(const a of proof.entry.actors){const receiver=active.includes(a.id)?active.find(id=>id!==a.id)!:a.id;assert.ok(distance(to.get(a.id)!.position,from.get(receiver)!.position)<1e-7);}}
  }
  for(const local of[...p.starts,64]){
   const beat=repeat*64+local;if(!beat)continue;const before=p.sample(beat-1e-7),after=p.sample(beat);
   for(const q of after.poses){assert.equal(q.id,before.poses[q.id].id);assert.ok(distance(q.position,before.poses[q.id].position)<2e-5,`${id} actor ${q.id} root at ${beat}`);assert.ok(Math.abs(turn(q.yaw,before.poses[q.id].yaw))<2e-5,`${id} actor ${q.id} facing at ${beat}`);}
  }
  for(let local=0;local<64;local+=.25){const f=p.sample(repeat*64+local);for(const q of f.poses)assert.ok([q.position.x,q.position.z,q.yaw].every(Number.isFinite));for(const c of f.contacts)assert.ok([c.point.x,c.point.y,c.point.z,c.strength].every(Number.isFinite));}
 }
 assert.deepEqual(p.sample(0).poses,p.sample(p.periodRepeats*64).poses);assert.deepEqual(p.sample(0).contacts,p.sample(p.periodRepeats*64).contacts);
});

test('an unseen rearrangement starts with ordinary long lines and uses the same bare-arch actual-state seam',()=>{
 const original=source(115),dance:Dance={id:'synthetic-bare-arch-rearrangement',title:'Long lines before the carried exchanges',author:'Test',description:'An independent source-counted rearrangement',formation:'duple-improper',verified:false,sourceUrl:'https://example.invalid/bare-arch-rearrangement',figures:[{id:'leading-lines',label:'Long lines first',kind:'long-lines',who:'all',beats:8},...structuredClone(original.figures)],progressionEvents:structuredClone(original.progressionEvents)};
 dance.progressionEvents![0].source={sourceId:'synthetic-bare-arch-rearrangement',url:dance.sourceUrl!,basis:'reviewed-interpretation',clause:'One terminal progression after the final full left star.'};
 const p=compileChoreography(dance,3,caps)as CompiledStateSequence;assert.equal(p.totalBeats,72);assert.equal(p.repeatable,true);assert.equal(p.periodRepeats,6);
 const first=p.sequenceBoundaries(0).find(x=>x.adapterId==='bare-arch-exchange')!;assert.equal(first.entry.sourceBeat,8);assertSequenceHandoff(first.incoming,first.entry);assert.equal(p.topology(72-1e-8).epoch,0);assert.equal(p.topology(72).epoch,1);assert.deepEqual(p.sample(0).poses,p.sample(432).poses);assert.deepEqual(p.sample(0).contacts,p.sample(432).contacts);
});
