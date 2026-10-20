import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedNeutralFullHey,NEUTRAL_FULL_HEY_CAPABILITIES as registeredCaps} from '../test-data/neutral-full-hey/source-fixture.ts';
import {compileChoreography} from './choreography.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import type {Dance,Figure} from './types.ts';
const caps={...registeredCaps,stateCarryingHalfHeys:true};
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function synthetic():Dance{
 const {dance:base}=reviewedNeutralFullHey(975),figures=structuredClone(base.figures),index=figures.findIndex(f=>f.kind==='hey'),full=figures[index];
 const half:Figure={...full,id:'first-half',label:'Synthetic half hey',amount:.5,beats:8,exit:'opposite-slots-facing-across'};
 figures.splice(index,1,half,{id:'between-lines',label:'Long lines between independent half heys',kind:'long-lines',who:'all',beats:8},{...half,id:'second-half'});
 const dance:Dance={id:'synthetic-double-half',title:'Two half heys with independent successors',author:'Test',formation:'duple-improper',description:'Synthetic composition; not a transcription of source 975',verified:false,sourceUrl:'https://example.invalid/synthetic-double-half',figures,progressionEvents:structuredClone(base.progressionEvents)};
 dance.progressionEvents![0].source={sourceId:dance.id,url:dance.sourceUrl!,basis:'reviewed-interpretation',clause:'Synthetic terminal progression after left star.'};return dance;
}
for(const couples of[3,4])test(`synthetic half heys compose through long lines and chain over complete ${couples}-couple finite period`,()=>{
 const dance=synthetic(),program=compileChoreography(dance,couples,caps) as CompiledStateSequence;
 assert.equal(program.totalBeats,72);assert.equal(program.periodRepeats,2*couples);const partners=program.topology(0).partners;
 let checked=0;const nextKinds=new Set<string>();
 for(let repeat=0;repeat<program.periodRepeats;repeat++){
  const base=repeat*72,proofs=program.sequenceBoundaries(repeat);assert.equal(program.topology(base).epoch,repeat);assert.equal(program.topology(base+72-1e-8).epoch,repeat);assert.deepEqual(program.topology(base).partners,partners);
  for(const proof of proofs.filter(p=>p.adapterId==='neutral-half-hey')){
   checked++;assert.equal(proof.contactPolicy,'strict-carried');assertSequenceHandoff(proof.incoming,proof.entry);assert.equal(proof.exit.sourceBeat-proof.entry.sourceBeat,8);assert.equal(proof.entry.relationshipEpoch,repeat);assert.equal(proof.exit.relationshipEpoch,repeat);assert.deepEqual(proof.exit.partner,proof.entry.partner);assert.deepEqual(proof.exit.neighbor,proof.entry.neighbor);assert.deepEqual(proof.exit.actors,proof.entry.actors);assert.deepEqual(proof.exit.heldContacts,[]);
   const center=proof.entry.poses.reduce((c,p)=>({x:c.x+p.position.x/4,z:c.z+p.position.z/4}),{x:0,z:0});
   for(const p of proof.exit.poses){const start=proof.entry.poses.find(q=>q.id===p.id)!;assert.ok(gap(p.position,{x:2*center.x-start.position.x,z:2*center.z-start.position.z})<1e-7);assert.ok(turn(p.yaw,p.position.x<center.x?Math.PI/2:-Math.PI/2)<1e-7);}
   const next=proofs.find(p=>p.entry.sourceBeat===proof.exit.sourceBeat&&p.entry.actors[0].id===proof.entry.actors[0].id)!;assert.ok(next);assertSequenceHandoff(proof.exit,next.entry);nextKinds.add(dance.figures.find(f=>f.id===next.figureId)!.kind);
  }
  for(const local of[...program.starts,72]){const beat=base+local;if(!beat)continue;const a=program.sample(beat-1e-7),b=program.sample(beat);for(const p of b.poses){assert.ok(gap(p.position,a.poses[p.id].position)<2e-5,`root seam ${beat}/${p.id}`);assert.ok(turn(p.yaw,a.poses[p.id].yaw)<2e-5,`facing seam ${beat}/${p.id}`);}}
  for(let local=0;local<72;local++)for(const p of program.sample(base+local).poses)assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));
 }
 assert.ok(checked>0);assert.deepEqual([...nextKinds].sort(),['long-lines','robins-chain']);assert.deepEqual(program.sample(72*program.periodRepeats).poses,program.sample(0).poses);assert.deepEqual(program.sample(72*program.periodRepeats).contacts,program.sample(0).contacts);
});
test('synthetic choreography title and figure labels cannot dispatch a different path',()=>{
 const a=synthetic(),b=structuredClone(a);b.title='Unrelated title';b.author='Someone else';for(const f of b.figures)f.label='Unrelated '+f.id;
 const A=compileChoreography(a,3,caps) as CompiledStateSequence,B=compileChoreography(b,3,caps) as CompiledStateSequence;
 for(const beat of[0,32,36,40,44,48,52,56,64,72,108]){assert.deepEqual(A.sample(beat).poses,B.sample(beat).poses);assert.deepEqual(A.sample(beat).contacts,B.sample(beat).contacts);}
});

