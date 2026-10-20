import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedNeutralFullHey,NEUTRAL_FULL_HEY_CAPABILITIES as caps} from '../test-data/neutral-full-hey/source-fixture.ts';
import {compileChoreography} from './choreography.ts';
import {compileNeutralFullHeyStep} from './neutral-full-hey-step.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import {compileChainFigure} from './chain.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import type {Dance} from './types.ts';

const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

for(const id of[975,1983,3214]as const)test(`source ${id} keeps literal counts, source shoulders, notes choice and independent pass identities`,()=>{
 const {review,dance}=reviewedNeutralFullHey(id),rows=review.result.record!.rows,hey=dance.figures.find(f=>f.kind==='hey')!,heyRow=rows.find(r=>r.id===hey.id)!;
 assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(heyRow.beats,16);assert.equal(heyRow.progression,false);assert.equal(hey.exit,'same-slots-facing-across');assert.equal(hey.progression,undefined);
 assert.equal(heyRow.text,id===3214?'gentlespoons start a full hey - lefts in center, rights on ends':'ladles start a full hey - rights in center, lefts on ends');
 assert.equal(review.interpretation.notesReview,id===3214?'retain-table-optional-alternative':'provenance-only');
 const program=compileChoreography(dance,3,caps)as CompiledStateSequence,proof=program.sequenceBoundaries(0).find(p=>p.adapterId==='neutral-full-hey')!;
 assert.ok(proof,'explicit neutral adapter selected');const ids=proof.entry.actors.map(a=>a.id),context={ids,start:program.sample(proof.entry.sourceBeat).poses,dancers:program.dancers,relations:{epoch:0,partner:new Map(proof.entry.partner),neighbor:new Map(proof.entry.neighbor)},bindingEpoch:0};
 const plan=compileNeutralFullHeyStep(hey,context,proof.incoming),h=plan.heyPlan;
 assert.deepEqual(h.events.map(e=>e.token.raw),id===3214?['ML','PR','WL','NR','ML','PR','WL','NR']:['WR','NL','MR','PL','WR','NL','MR','PL']);
 const pairs=id===3214?[[[2,0]],[[1,0],[2,3]],[[1,3]],[[0,3],[1,2]],[[0,2]],[[3,2],[0,1]],[[3,1]],[[2,1],[3,0]]]:[[[3,1]],[[2,1],[3,0]],[[2,0]],[[1,0],[2,3]],[[1,3]],[[0,3],[1,2]],[[0,2]],[[3,2],[0,1]]];
 assert.deepEqual(h.events.map(e=>e.pairs.map(pair=>pair.map(Number))),pairs);assert.equal(h.events.reduce((n,e)=>n+e.pairs.length,0),12);
 assert.equal(proof.entry.sourceBeat,id===3214?16:32);assert.equal(proof.exit.sourceBeat,id===3214?32:48);assert.ok(h.minimumCertifiedClearance>=.5);assert.ok(h.maximumCertifiedSpeed<=1.35);assert.ok(h.maximumCertifiedYawRate<=4);
 if(id!==3214){
  const chain=dance.figures[dance.figures.indexOf(hey)+1];assert.equal(chain.kind,'robins-chain');assert.equal(chain.who,'neighbor');
  const start=structuredClone(context.start);for(const p of proof.exit.poses){start[p.id].position={...p.position};start[p.id].yaw=p.yaw;}
  const successor=compileChainFigure(chain,{...context,start});assert.deepEqual([...successor.receivers].sort((a,b)=>a[0]-b[0]),[[1,2],[3,0]]);
 }else{const next=dance.figures[dance.figures.indexOf(hey)+1];assert.deepEqual([next.kind,next.who,next.direction,next.amount,next.beats],['allemande','larks','left',1.5,8]);}
});

for(const id of[975,1983,3214]as const)for(const couples of[3,4])test(`source ${id}: the shared seam carries a complete ${couples}-couple period`,()=>{
 const {dance}=reviewedNeutralFullHey(id),program=compileChoreography(dance,couples,caps)as CompiledStateSequence;
 assert.equal(program.totalBeats,64);assert.equal(program.repeatable,true);assert.equal(program.periodRepeats,2*couples);const partners=program.topology(0).partners;
 for(let repeat=0;repeat<program.periodRepeats;repeat++){
  assert.equal(program.topology(repeat*64).epoch,repeat);assert.equal(program.topology(repeat*64+64-1e-8).epoch,repeat);assert.deepEqual(program.topology(repeat*64).partners,partners);
  const proofs=program.sequenceBoundaries(repeat),heys=proofs.filter(p=>p.adapterId==='neutral-full-hey');assert.ok(heys.length>0);
  for(const proof of heys){
   assert.equal(proof.contactPolicy,'strict-carried');assertSequenceHandoff(proof.incoming,proof.entry);assert.equal(proof.exit.sourceBeat-proof.entry.sourceBeat,16);assert.equal(proof.entry.relationshipEpoch,repeat);assert.equal(proof.exit.relationshipEpoch,repeat);assert.deepEqual(proof.exit.actors,proof.entry.actors);assert.deepEqual(proof.exit.partner,proof.entry.partner);assert.deepEqual(proof.exit.neighbor,proof.entry.neighbor);assert.deepEqual(proof.exit.heldContacts,[]);
   const center=proof.entry.poses.reduce((n,p)=>n+p.position.x,0)/4;
   for(const p of proof.exit.poses){assert.deepEqual(p.position,proof.entry.poses.find(q=>q.id===p.id)!.position);assert.ok(turn(p.yaw,p.position.x<center?Math.PI/2:-Math.PI/2)<1e-7);}
   const successor=proofs.find(p=>p.entry.sourceBeat===proof.exit.sourceBeat&&p.entry.actors[0].id===proof.entry.actors[0].id)!;assert.ok(successor);assertSequenceHandoff(proof.exit,successor.entry);
  }
  for(const local of[...program.starts,64]){
   const beat=repeat*64+local;if(!beat)continue;const before=program.sample(beat-1e-7),after=program.sample(beat);
   for(const p of after.poses){assert.ok(distance(p.position,before.poses[p.id].position)<2e-5,`${id}/${couples}/${beat}/${p.id} root`);assert.ok(turn(p.yaw,before.poses[p.id].yaw)<2e-5,`${id}/${couples}/${beat}/${p.id} facing`);}
  }
  // Lightweight count samples, deliberately not an all-size/body sweep.
  for(let local=0;local<64;local++)for(const p of program.sample(repeat*64+local).poses)assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));
 }
 const final=program.sample(program.periodRepeats*64);assert.deepEqual(final.poses,program.sample(0).poses);assert.deepEqual(final.contacts,program.sample(0).contacts);
});

test('a source-independent sequence inserts a changed producer and compatible successor around the same neutral boundary',()=>{
 const {dance:original}=reviewedNeutralFullHey(975),figures=structuredClone(original.figures),index=figures.findIndex(f=>f.kind==='hey');
 figures.splice(index+1,0,{id:'lines-after',label:'Long lines after full hey',kind:'long-lines',who:'all',beats:8});
 figures.splice(index,0,{id:'lines-before',label:'Long lines before full hey',kind:'long-lines',who:'all',beats:8});
 const dance:Dance={id:'synthetic-neutral-hey',title:'Independent neutral-hey composition',author:'Test',formation:'duple-improper',description:'Different producer and successor with the same measured station return',verified:false,sourceUrl:'https://example.invalid/neutral-hey',figures,progressionEvents:structuredClone(original.progressionEvents)};
 dance.progressionEvents![0].source={sourceId:'synthetic-neutral-hey',url:dance.sourceUrl!,basis:'reviewed-interpretation',clause:'One terminal progression after the full left star.'};
 const program=compileChoreography(dance,3,caps)as CompiledStateSequence;assert.equal(program.totalBeats,80);assert.equal(program.repeatable,true);
 const proofs=program.sequenceBoundaries(0),hey=proofs.find(p=>p.adapterId==='neutral-full-hey')!,producer=proofs.find(p=>p.figureId==='lines-before')!,successor=proofs.find(p=>p.figureId==='lines-after')!;
 assertSequenceHandoff(producer.exit,hey.entry);assertSequenceHandoff(hey.exit,successor.entry);assert.equal(hey.entry.sourceBeat,40);assert.equal(hey.exit.sourceBeat,56);assert.equal(program.topology(80-1e-8).epoch,0);assert.equal(program.topology(80).epoch,1);assert.deepEqual(program.sample(0).poses,program.sample(480).poses);
});
