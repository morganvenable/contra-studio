/** Isolated source-shaped producers. Whole-source finite composition is tested
 * separately by the shared integration owner, not claimed by this packet. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDancers,initialPoses,compilePrimitiveFigure} from '../../src/engine.ts';
import {captureSequenceBoundary,assertSequenceHandoff,type SequenceBoundary} from '../../src/sequence-boundary.ts';
import {sampleFormationEndpoint} from '../../src/formation-handoff.ts';
import {compileCoupledDosidoStep,type CoupledDosidoPlan} from '../../src/coupled-dosido-step.ts';
import {distance,turn} from '../../src/ring-twirl-contract.ts';
import type {FigureContext} from '../../src/extended-figures.ts';
import type {Figure} from '../../src/types.ts';

export const coupledDosidoFigure:Figure={id:'literal-coupled-row',kind:'couples-do-si-do',label:'neighbors do si do once as couples',who:'neighbor',unitRelation:'partner',passingShoulder:'right',unitHold:'released',facing:'fixed-room',amount:1,beats:8};
export function ordinaryCoupledContext():FigureContext {
 const dancers=createDancers(2),start=initialPoses(dancers);
 return{ids:[0,1,2,3],start,dancers,bindingEpoch:0,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])}};
}
export function coupledDosidoProducer(sourceId:624|1702){
 const source=JSON.parse(readFileSync(new URL(`../contradb/${sourceId}.json`,import.meta.url),'utf8'));
 assert.match(source.html,/neighbors do si do once as couples/);
 const context=ordinaryCoupledContext();let boundary:SequenceBoundary;
 if(sourceId===624){
  assert.match(source.html,/circle left 4 places/);
  const figure:Figure={id:'actual-full-circle',label:'circle left 4 places',kind:'circle',who:'all',direction:'left',amount:1,beats:8},producer=compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,[1,-1]);
  assert.ok(producer.contacts(.99,context.start).some(c=>c.strength>0));
  context.start=sampleFormationEndpoint(context,producer,1);boundary=captureSequenceBoundary(context,8,producer.contacts(1,context.start));
  // Use the supplied retained entry packet, never regenerate the baseline from
  // this producer. The earlier external research artifact was not in the handoff.
  const retained=JSON.parse(readFileSync(new URL('./isolated-evidence.json',import.meta.url),'utf8')).sources.find((source:{sourceId:number})=>source.sourceId===624)?.entry;
  assert.ok(retained,'The bundled source 624 entry evidence must be retained.');
  assertSequenceHandoff(retained,boundary);
  for(const p of boundary.poses){const q=retained.poses.find((q:{id:number})=>q.id===p.id);assert.ok(distance(p.position,q.position)<1e-12);assert.ok(Math.abs(turn(p.yaw,q.yaw))<1e-12);}
 }else boundary=captureSequenceBoundary(context,0,[]);
 const plan=compileCoupledDosidoStep(coupledDosidoFigure,context,boundary);
 return{sourceId,sourceUrl:source.sourceUrl,context,boundary,plan};
}
export function measureCoupledDosido(plan:CoupledDosidoPlan){
 let minimumClearance=Infinity,maximumSpeed=0,maximumYawRate=0,maximumOffsetDrift=0,maximumFixedFacingDrift=0;
 const times=new Set([...Array.from({length:257},(_,i)=>i/256),...plan.gates.map(g=>(g.sourceBeat-plan.entryState.sourceBeat)/8),.125]);
 for(const t of times){
  const poses=plan.entryState.poses.map(p=>({id:p.id,position:plan.position(p.id,t)})),lo=Math.max(0,t-1e-6),hi=Math.min(1,t+1e-6);
  for(let i=0;i<poses.length;i++){
   const p=poses[i];maximumSpeed=Math.max(maximumSpeed,distance(plan.position(p.id,lo),plan.position(p.id,hi))/((hi-lo)*8));maximumYawRate=Math.max(maximumYawRate,Math.abs(turn(plan.facing(p.id,hi,[]),plan.facing(p.id,lo,[])))/((hi-lo)*8));
   for(let j=i+1;j<poses.length;j++)minimumClearance=Math.min(minimumClearance,distance(p.position,poses[j].position));
  }
  for(const unit of plan.namedUnits){const [a,b]=unit.ids,A=plan.position(a,t),B=plan.position(b,t),initialA=plan.entryState.poses.find(p=>p.id===a)!.position,initialB=plan.entryState.poses.find(p=>p.id===b)!.position;maximumOffsetDrift=Math.max(maximumOffsetDrift,Math.hypot((A.x-B.x)-(initialA.x-initialB.x),(A.z-B.z)-(initialA.z-initialB.z)));if(t>=.125)for(const id of unit.ids)maximumFixedFacingDrift=Math.max(maximumFixedFacingDrift,Math.abs(turn(plan.facing(id,t,[]),unit.facing)));}
 }
 assert.ok(minimumClearance>=plan.minimumClearanceBound-1e-10);assert.ok(minimumClearance>=.62);assert.ok(maximumSpeed<=plan.maximumSpeedBound+1e-7);assert.ok(maximumYawRate<=plan.maximumYawRateBound+1e-7);assert.ok(maximumOffsetDrift<1e-12);assert.ok(maximumFixedFacingDrift<1e-12);
 return{sampleCount:times.size,minimumClearance,analyticMinimumClearance:plan.minimumClearanceBound,maximumSpeed,maximumSpeedBound:plan.maximumSpeedBound,maximumYawRate,maximumYawRateBound:plan.maximumYawRateBound,maximumOffsetDrift,maximumFixedFacingDrift};
}
export function collectCoupledDosidoEvidence(sourceId:624|1702){const {sourceUrl,boundary,plan}=coupledDosidoProducer(sourceId);return{sourceId,sourceUrl,scope:'isolated actual producer and one reusable coupled figure; no whole-source or finite-body claim',entry:boundary,exit:plan.exitState,namedUnits:plan.namedUnits,phases:plan.phases,phaseBeats:plan.phaseBeats,orbit:plan.orbit,gates:plan.gates,clearanceWitness:plan.clearanceWitness,metrics:measureCoupledDosido(plan)};}
