/** Focused row-local evidence. Full finite-set/event proofs belong to the
 * shared source wrapper; this helper does not substitute a complete dance. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {compileChoreography} from '../../src/choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
import {compileActiveOnesSwingStep,type ActiveOnesSwingFigure,type ActiveOnesSwingPlan,type CurrentMinorSetRank} from '../../src/active-ones-swing-step.ts';
import {assertSequenceHandoff,type SequenceBoundary} from '../../src/sequence-boundary.ts';
import type {FigureContext} from '../../src/extended-figures.ts';
import type {Dancer,Pose} from '../../src/types.ts';
import type {CompiledStateSequence} from '../../src/state-sequence.ts';

export const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
export const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export function contextFromBoundary(boundary:SequenceBoundary,dancers:Dancer[],rank?:CurrentMinorSetRank):FigureContext {
 const start:Pose[]=dancers.map(d=>({id:d.id,position:{x:0,z:0},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 for(const p of boundary.poses)start[p.id]={...start[p.id],position:{...p.position},yaw:p.yaw};
 return{ids:boundary.actors.map(a=>a.id),start,dancers:structuredClone(dancers),bindingEpoch:boundary.relationshipEpoch,relations:{epoch:boundary.relationshipEpoch,partner:new Map(boundary.partner),neighbor:new Map(boundary.neighbor)},...(rank?{minorSetRanks:rank}:{})};
}
export function actualSourceEntry(id:1036|2141){
 const capabilities=REGISTERED_MOTION_CAPABILITIES,review=prepareContraDbReview(readFileSync(new URL(`../contradb/${id}.json`,import.meta.url),'utf8'),[],capabilities),result=review.result,record=result.record!,row=record.rows.at(-1)!;
 assert.equal(row.beats,8);assert.equal(row.progression,true);assert.equal(row.text,id===1036?'ones swing - face down to next couple ⁋':'ones swing and face next neighbors ⁋');
 const prefix=result.rows.slice(0,-1).flatMap(r=>r.figures);assert.equal(prefix.reduce((n,f)=>n+f.beats,0),56);assert.ok(result.rows.slice(0,-1).every(r=>r.figures.length));
 // Extract only the first actual group from the unchanged full source. A
 // prefix truncated at56 would trigger a spurious terminal-facing convention.
 assert.ok(result.dance,result.errors.join('; '));const compiled=compileChoreography(result.dance,2,capabilities) as CompiledStateSequence,proofs=compiled.sequenceBoundaries(0),proof=proofs.find(p=>p.figureId===row.id)!,incoming=proof.incoming,currentRank=proof.currentRank!;
 const figure=result.dance.figures.at(-1)! as ActiveOnesSwingFigure;
 const context=contextFromBoundary(incoming,compiled.dancers,currentRank),plan=compileActiveOnesSwingStep(figure,context,incoming),producer=proofs.find(p=>p.exit.sourceBeat===56)!;
 assertSequenceHandoff(producer.exit,plan.entryState);assertSequenceHandoff(proof.exit,plan.exitState);
 return{sourceId:id,snapshotId:record.snapshotId,sourceUrl:record.sourceUrl,sourceCounts:record.rows.map(r=>r.beats),sourceFinalText:row.text,figure,incoming,context,plan,producer};
}
export function measureActiveOnesSwing(plan:ActiveOnesSwingPlan){
 let minimumClearance=Infinity,minimumActiveInactiveClearance=Infinity,maximumSpeed=0,maximumYawRate=0,maximumHandReach=0,winding=0,previous=0,minimumPositiveContactBeat=Infinity,maximumPositiveContactBeat=-Infinity;
 const active=new Set(plan.activePair),a=plan.activePair[0],b=plan.activePair[1],ids=plan.entryState.actors.map(a=>a.id);
 for(let n=0;n<=256;n++){
  const t=n/256,lo=Math.max(0,t-1e-5),hi=Math.min(1,t+1e-5),poses=new Map(ids.map(id=>[id,{position:plan.position(id,t),yaw:plan.facing(id,t,[])}]));
  for(const id of ids){maximumSpeed=Math.max(maximumSpeed,distance(plan.position(id,lo),plan.position(id,hi))/((hi-lo)*8));maximumYawRate=Math.max(maximumYawRate,Math.abs(wrap(plan.facing(id,hi,[])-plan.facing(id,lo,[])))/((hi-lo)*8));}
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){const gap=distance(poses.get(ids[i])!.position,poses.get(ids[j])!.position);minimumClearance=Math.min(minimumClearance,gap);if(active.has(ids[i])!==active.has(ids[j]))minimumActiveInactiveClearance=Math.min(minimumActiveInactiveClearance,gap);}
  const p=poses.get(a)!.position,q=poses.get(b)!.position,angle=Math.atan2(p.z-q.z,p.x-q.x);if(n)winding+=wrap(angle-previous);previous=angle;
  const contacts=plan.contacts(t,[]),owners=new Set<string>();
  for(const c of contacts){assert.ok(active.has(c.a)&&active.has(c.b));assert.equal(c.kind,'swing-frame');const hands=[[c.a,c.handA],...(c.target==='hands'?[[c.b,c.handB]]:[])] as [number,'left'|'right'][];for(const[id,hand]of hands){const key=`${id}:${hand}`;assert.ok(!owners.has(key),'a hand cannot own two targets');owners.add(key);const p=poses.get(id)!,s=hand==='left'?1:-1,reach=Math.hypot(c.point.x-p.position.x-s*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+s*.235*Math.sin(p.yaw));maximumHandReach=Math.max(maximumHandReach,reach);assert.ok(reach<.68+1e-8);}minimumPositiveContactBeat=Math.min(minimumPositiveContactBeat,t*8);maximumPositiveContactBeat=Math.max(maximumPositiveContactBeat,t*8);}
 }
 assert.ok(Math.abs(winding-2*Math.PI)<1e-8);assert.ok(minimumClearance>=plan.minimumClearanceBound-1e-8);assert.ok(maximumSpeed<=plan.maximumSpeedBound+1e-5);assert.ok(maximumYawRate<=plan.maximumYawRateBound+1e-5);
 return{minimumClearance,minimumActiveInactiveClearance,maximumSpeed,maximumYawRate,maximumHandReach,winding,minimumPositiveContactBeat,maximumPositiveContactBeat};
}
