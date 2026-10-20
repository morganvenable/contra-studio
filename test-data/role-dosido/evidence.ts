/** Focused evidence from retained source rows through the public shared route.
 * The only body samples are in the new do-si-do, for representative 3/4 sets. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {compileChoreography} from '../../src/choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
import {compileRoleDosidoStep,type RoleDosidoPlan} from '../../src/role-dosido-step.ts';
import {assertSequenceHandoff,type SequenceBoundary} from '../../src/sequence-boundary.ts';
import type {CompiledStateSequence} from '../../src/state-sequence.ts';
import type {Dancer,Pose} from '../../src/types.ts';
import type {FigureContext} from '../../src/extended-figures.ts';
import {distance,heading,turn} from '../../src/ring-twirl-contract.ts';
export const roleDosidoCapabilities=REGISTERED_MOTION_CAPABILITIES;
export function roleDosidoSource(id:522|3115){const review=prepareContraDbReview(readFileSync(new URL(`../contradb/${id}.json`,import.meta.url),'utf8'),[],roleDosidoCapabilities);assert.ok(review.result.dance,review.result.errors.join('; '));return{review,dance:review.result.dance};}
export function contextFromBoundary(boundary:SequenceBoundary,dancers:Dancer[]):FigureContext {
 const start:Pose[]=dancers.map(d=>({id:d.id,position:{x:0,z:0},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 for(const p of boundary.poses)start[p.id]={...start[p.id],position:{...p.position},yaw:p.yaw};
 return{ids:boundary.actors.map(a=>a.id),start,dancers,bindingEpoch:boundary.relationshipEpoch,relations:{epoch:boundary.relationshipEpoch,partner:new Map(boundary.partner),neighbor:new Map(boundary.neighbor)}};
}
export function measureRoleDosido(plan:RoleDosidoPlan,beats:number){
 let minimumClearance=Infinity,maximumSpeed=0,maximumYawRate=0,winding=0,prior=0;const a=plan.namedPair[0],initial=plan.entryState.poses.find(p=>p.id===a)!.position,origin=plan.orbit.center,radial={x:(initial.x-origin.x)/plan.orbit.halfSpan,z:(initial.z-origin.z)/plan.orbit.halfSpan},left={x:-radial.z,z:radial.x};
 // 96 root samples of this one short path, plus the named mathematical gates.
 for(let n=0;n<=96;n++){
  const t=n/96,lo=Math.max(0,t-1e-5),hi=Math.min(1,t+1e-5),poses=plan.entryState.poses.map(p=>({id:p.id,position:plan.position(p.id,t)}));
  for(const p of poses){const A=plan.position(p.id,lo),B=plan.position(p.id,hi);maximumSpeed=Math.max(maximumSpeed,distance(A,B)/((hi-lo)*beats));maximumYawRate=Math.max(maximumYawRate,Math.abs(turn(plan.facing(p.id,hi,[]),plan.facing(p.id,lo,[])))/((hi-lo)*beats));for(const q of poses)if(q.id>p.id)minimumClearance=Math.min(minimumClearance,distance(p.position,q.position));}
  const p=plan.position(a,t),d={x:p.x-origin.x,z:p.z-origin.z},angle=Math.atan2((d.x*left.x+d.z*left.z)/plan.orbit.laneRadius,(d.x*radial.x+d.z*radial.z)/plan.orbit.halfSpan);if(n)winding+=turn(angle,prior);prior=angle;
 }
 assert.ok(Math.abs(winding-3*Math.PI)<1e-8,`3π observed winding ${winding}`);assert.ok(minimumClearance>=.67);assert.ok(maximumSpeed<=plan.maximumSpeedBound+1e-5);assert.ok(maximumYawRate<=plan.maximumYawRateBound+1e-5);
 return{minimumClearance,maximumSpeed,maximumYawRate,winding};
}
export function collectRoleDosidoEvidence(id:522|3115,couples:3|4){
 const {review,dance}=roleDosidoSource(id),compiled=compileChoreography(dance,couples,roleDosidoCapabilities) as CompiledStateSequence,sample=compiled.formationSample??compiled.sample,figure=dance.figures.find(f=>f.kind==='do-si-do'&&f.amount===1.5)!;
 assert.equal(compiled.totalBeats,64);assert.equal(compiled.periodRepeats,2*couples);assert.equal(figure.beats,id===522?8:10);
 const observedPairs=new Set<string>(),roleProofs:unknown[]=[];let maximumBoundaryRootDelta=0,maximumBoundaryYawDelta=0,minimumNewFigureClearance=Infinity;
 for(let repeat=0;repeat<compiled.periodRepeats;repeat++){
  const topology=compiled.topology(repeat*64),proofs=compiled.sequenceBoundaries(repeat);assert.equal(topology.epoch,repeat);
  for(const [a,b]of topology.neighbors)observedPairs.add([compiled.dancers[a].couple,compiled.dancers[b].couple].sort((a,b)=>a-b).join(':'));
  assert.deepEqual(compiled.topology(repeat*64+32),topology);assert.equal(compiled.topology((repeat+1)*64).epoch,repeat+1);
  const steps=proofs.filter(p=>p.figureId===figure.id);assert.equal(steps.length,(couples-topology.waitingIds.length/2)/2);
  for(const proof of steps){
   assert.equal(proof.adapterId,'role-dosido-exchange');assert.equal(proof.contactPolicy,'strict-carried');assert.equal(proof.entry.relationshipEpoch,repeat);assert.equal(proof.exit.relationshipEpoch,repeat);assert.equal(proof.entry.sourceBeat,id===522?24:22);assert.equal(proof.exit.sourceBeat,32);
   assertSequenceHandoff(proof.incoming,proof.entry);assert.deepEqual(proof.exit.partner,proof.entry.partner);assert.deepEqual(proof.exit.neighbor,proof.entry.neighbor);assert.deepEqual(proof.entry.heldContacts,[]);assert.deepEqual(proof.exit.heldContacts,[]);
   const samePeople=(b:SequenceBoundary)=>JSON.stringify(b.actors)===JSON.stringify(proof.entry.actors),producer=proofs.find(p=>p.exit.sourceBeat===proof.entry.sourceBeat&&samePeople(p.exit)),receiver=proofs.find(p=>p.entry.sourceBeat===proof.exit.sourceBeat&&samePeople(p.entry));assert.ok(producer);assert.ok(receiver);assertSequenceHandoff(producer.exit,proof.entry);assertSequenceHandoff(proof.exit,receiver.entry);
   const plan=compileRoleDosidoStep(figure,contextFromBoundary(proof.entry,compiled.dancers),proof.entry),metrics=measureRoleDosido(plan,figure.beats);minimumNewFigureClearance=Math.min(minimumNewFigureClearance,metrics.minimumClearance);assertSequenceHandoff(plan.exitState,proof.exit);
   const entry=new Map(proof.entry.poses.map(p=>[p.id,p])),exit=new Map(proof.exit.poses.map(p=>[p.id,p]));
   for(const actor of proof.entry.actors){const p=exit.get(actor.id)!,expected=actor.role==='robin'?entry.get(plan.namedPair.find(j=>j!==actor.id)!)!:entry.get(actor.id)!,partner=exit.get(new Map(proof.entry.partner).get(actor.id)!)!;assert.deepEqual(p.position,expected.position);assert.ok(Math.abs(turn(p.yaw,heading(p.position,partner.position)))<1e-8);}
   for(const gate of plan.gates){const local=gate.sourceBeat;for(const p of gate.poses){const actual=sample(repeat*64+local).poses[p.id];assert.ok(distance(actual.position,p.position)<1e-7,`actual source gate ${id}/${repeat}/${gate.kind}`);assert.ok(Math.abs(turn(actual.yaw,p.yaw))<1e-7);}}
   roleProofs.push({repeat,producer:producer.adapterId,receiver:receiver.adapterId,entry:proof.entry,exit:proof.exit,namedPair:plan.namedPair,phaseBeats:plan.phaseBeats,gates:plan.gates,metrics});
  }
  // All source boundaries and each new figure's two internal facing/orbit seams.
  const localBoundaries=[...compiled.starts,64,(id===522?24:22)+1,31];
  for(const local of localBoundaries){const beat=repeat*64+local;if(!beat)continue;const before=sample(beat-1e-7),after=sample(beat);for(const p of after.poses){maximumBoundaryRootDelta=Math.max(maximumBoundaryRootDelta,distance(p.position,before.poses[p.id].position));maximumBoundaryYawDelta=Math.max(maximumBoundaryYawDelta,Math.abs(turn(p.yaw,before.poses[p.id].yaw)));}}
  // Quarter-count sampling stays only inside the new figure, and includes
  // stationary opposite-role actors and waiting couples at real finite ends.
  for(let count=id===522?24:22;count<=32;count+=.25){const poses=sample(repeat*64+count).poses;for(let a=0;a<poses.length;a++)for(let b=a+1;b<poses.length;b++)minimumNewFigureClearance=Math.min(minimumNewFigureClearance,distance(poses[a].position,poses[b].position));}
 }
 assert.equal(observedPairs.size,couples*(couples-1)/2);assert.ok(maximumBoundaryRootDelta<1e-4);assert.ok(maximumBoundaryYawDelta<1e-4);assert.ok(minimumNewFigureClearance>=.67);
 const initial=sample(0),returned=sample(compiled.periodRepeats*64);for(const p of initial.poses){assert.ok(distance(p.position,returned.poses[p.id].position)<1e-9);assert.ok(Math.abs(turn(p.yaw,returned.poses[p.id].yaw))<1e-9);}
 return{sourceId:id,snapshotId:review.result.record!.snapshotId,sourceUrl:dance.sourceUrl,title:dance.title,couples,periodRepeats:compiled.periodRepeats,totalBeats:compiled.totalBeats,sourceCounts:review.result.record!.rows.map(r=>r.beats),figureCounts:dance.figures.map(f=>f.beats),encounteredCouplePairs:observedPairs.size,maximumBoundaryRootDelta,maximumBoundaryYawDelta,minimumNewFigureClearance,roleProofs};
}
