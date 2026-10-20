import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileNeutralRoleHeyStep} from './neutral-role-hey-step.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledBecketStateSequence} from './becket-state-sequence.ts';
import type {Dance,Figure} from './types.ts';
const caps={...REGISTERED_MOTION_CAPABILITIES,stateCarryingHalfHeys:true};
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

function synthetic():Dance {
 const raw=readFileSync(new URL('../test-data/contradb/2996.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw,[],caps),base=review.result.dance;
 assert.ok(base,review.result.errors.join('; '));
 const figures=structuredClone(base.figures),index=figures.findIndex(f=>f.kind==='hey'),full=figures[index];
 assert.equal(full.amount,1);assert.equal(full.beats,16);
 const half:Figure={...full,amount:.5,beats:8,exit:'opposite-slots-facing-across',id:'first-half',label:'Synthetic first half hey'};
 figures.splice(index,1,half,{...half,id:'second-half',label:'Synthetic second half hey'});
 const id='synthetic-becket-double-half',url='https://example.invalid/synthetic-becket-double-half';
 const progressionEvents=structuredClone(base.progressionEvents!),endPolicy=structuredClone(base.endPolicy!);
 progressionEvents[0].source={sourceId:id,url,basis:'source-explicit',clause:'This synthetic choreography explicitly declares one progression after its slice.'};
 endPolicy.source={sourceId:id,url,basis:'reviewed-interpretation',clause:'Synthetic finite-end convention inherited explicitly: same-end turn over eight counts after slice.'};
 return{id,title:'Synthetic Becket with two half heys',author:'Test',formation:'becket',circulation:'cw',verified:false,description:'Synthetic composition derived from a source 2996 template; not its choreography or source interpretation.',sourceUrl:url,figures,progressionEvents,endPolicy};
}

for(const couples of[3,4])test(`synthetic Becket double half hey carries slice bindings and finite ends over ${couples}-couple period`,()=>{
 const dance=synthetic(),program=compileChoreography(dance,couples,caps) as CompiledBecketStateSequence;
 assert.equal(program.totalBeats,64);assert.equal(program.eventBeat,16);assert.ok(program.period>0);assert.ok(program.repeatable);
 let checked=0,waitingChecked=0,minimum=Infinity;
 const waitingActors=new Set<number>(),activeActors=new Set<number>();
 for(let repeat=0;repeat<program.periodStart+program.period;repeat++){
  const base=repeat*64,proofs=program.sequenceBoundaries(repeat);
  assert.equal(program.topology(base+16-1e-7).epoch,repeat);
  assert.equal(program.topology(base+16).epoch,repeat+1);
  assert.equal(program.topology(base+64-1e-7).epoch,repeat+1);
  for(const proof of proofs.filter(p=>p.adapterId==='neutral-half-hey')){
   checked++;assert.equal(proof.contactPolicy,'strict-carried');assertSequenceHandoff(proof.incoming,proof.entry);
   assert.equal(proof.exit.sourceBeat-proof.entry.sourceBeat,8);assert.equal(proof.entry.relationshipEpoch,repeat+1);assert.equal(proof.exit.relationshipEpoch,repeat+1);
   assert.deepEqual(proof.entry.actors,proof.exit.actors);assert.deepEqual(proof.entry.partner,proof.exit.partner);assert.deepEqual(proof.entry.neighbor,proof.exit.neighbor);assert.deepEqual(proof.exit.heldContacts,[]);
   const ids=proof.entry.actors.map(a=>a.id);ids.forEach(id=>activeActors.add(id));
   const figure=dance.figures.find(f=>f.id===proof.figureId)!;
   const context={ids,start:program.sample(base+proof.entry.sourceBeat).poses,dancers:program.dancers,relations:{epoch:repeat+1,partner:new Map(proof.entry.partner),neighbor:new Map(proof.entry.neighbor)},bindingEpoch:repeat+1};
   const direct=compileNeutralRoleHeyStep(figure,context,proof.incoming);
   // Public wrapper must retain the adapter's owned facing throughout ingress,
   // not apply a second smoothing blend that boundary-only checks would miss.
   for(const count of[0,.125,.25,.5,.75,1,2,4,6,8]){
    const actual=program.sample(base+proof.entry.sourceBeat+count);
    for(const id of ids){assert.ok(gap(actual.poses[id].position,direct.position(id,count/8))<1e-7);assert.ok(turn(actual.poses[id].yaw,direct.facing(id,count/8,[]))<1e-7,`owned facing ${repeat}/${proof.figureId}/${count}/${id}`);}
   }
   if(proof.figureId==='first-half'){
    const second=proofs.find(p=>p.figureId==='second-half'&&p.entry.actors[0].id===ids[0])!;
    assert.ok(second);assertSequenceHandoff(proof.exit,second.entry);
    for(const pose of second.exit.poses)assert.deepEqual(pose.position,proof.entry.poses.find(p=>p.id===pose.id)!.position);
   }
  }
  for(const local of[...program.starts,64]){
   const beat=base+local;if(!beat)continue;
   const before=program.sample(beat-1e-7),after=program.sample(beat);
   for(const pose of after.poses){assert.ok(gap(pose.position,before.poses[pose.id].position)<2e-5);assert.ok(turn(pose.yaw,before.poses[pose.id].yaw)<2e-5);}
  }
  const waiting=program.topology(base+16).waitingIds;
  for(const id of waiting){
   waitingActors.add(id);waitingChecked++;
   const afterTurn=program.sample(base+24).poses[id],duringHey=program.sample(base+40).poses[id];
   assert.ok(gap(afterTurn.position,duringHey.position)<1e-7);
   assert.ok(turn(afterTurn.yaw,duringHey.yaw)<1e-7);
  }
  for(let local=0;local<64;local+=.5){
   const frame=program.sample(base+local);
   for(const p of frame.poses)assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));
   for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimum=Math.min(minimum,gap(frame.poses[a].position,frame.poses[b].position));
  }
 }
 assert.ok(checked>0);assert.ok(waitingChecked>0);assert.ok([...waitingActors].every(id=>activeActors.has(id)),'waiting dancers later participate again');
 assert.ok(minimum>=.45-1e-7,`whole-set sampled root clearance ${minimum}`);
 const first=program.sample(program.periodStart*64),last=program.sample((program.periodStart+program.period)*64);
 for(const p of first.poses){assert.ok(gap(p.position,last.poses[p.id].position)<1e-7);assert.ok(turn(p.yaw,last.poses[p.id].yaw)<1e-7);}
 assert.deepEqual(first.contacts,last.contacts);
});

test('synthetic Becket half hey still requires its explicit shared capability',()=>{
 assert.throws(()=>compileChoreography(synthetic(),3,{...caps,stateCarryingHalfHeys:false}),/half hey|half-hey/i);
});
