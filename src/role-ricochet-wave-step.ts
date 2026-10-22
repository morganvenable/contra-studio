/** Counted ricochet half hey reaching explicit local wave stations in source counts.
 * Mechanism corroboration: https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm
 * Left-center replacement retreats back-right, remains facing across, and keeps
 * its center slots; the ordinary role completes the half hey.
 * The caller owns subsequent whole-wave contacts and any endpoint progression. */
import {capturePlainData} from './owned-program-cache.ts';
import {ownSequenceBoundary,advanceSequenceBeat,type SequenceBoundary,type SequenceBoundaryPose,type SequencedMotionPlan} from './sequence-boundary.ts';
import {compileRicochetHey,type Ricochet} from './ricochet-hey.ts';

import type {Role} from './types.ts';
export interface RoleRicochetWaveSpec {beats:8;ricochets:readonly Ricochet[];firstRole:Role;sidePair:'partner'|'neighbor';centerShoulder:'left'|'right';endShoulder:'left'|'right';inwardRole:Role;exitPoses:readonly SequenceBoundaryPose[];}
export interface RoleRicochetWavePlan extends SequencedMotionPlan {readonly ricochetPlan:ReturnType<typeof compileRicochetHey>;}
const EPS=1e-7,wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function compileRoleRicochetWaveStep(incoming:SequenceBoundary,raw:RoleRicochetWaveSpec):RoleRicochetWavePlan{
 const entryState=ownSequenceBoundary(incoming),spec=capturePlainData(raw);
 if(Object.keys(spec).some(k=>!['beats','ricochets','firstRole','sidePair','centerShoulder','endShoulder','inwardRole','exitPoses'].includes(k))||spec.beats!==8||!['lark','robin'].includes(spec.inwardRole)||!['partner','neighbor'].includes(spec.sidePair))throw Error('A role hey wave endpoint needs eight counts, explicit side pair, inward role and measured endpoints.');
 if(entryState.heldContacts.length)throw Error('The role hey requires actually released entry hands.');
 const poses=new Map(entryState.poses.map(p=>[p.id,p])),actors=new Map(entryState.actors.map(a=>[a.id,a])),ids=[...actors.keys()],relations=new Map(entryState[spec.sidePair]);
 const center={x:entryState.poses.reduce((n,p)=>n+p.position.x/4,0),z:entryState.poses.reduce((n,p)=>n+p.position.z/4,0)};
 const width=Math.abs(entryState.poses[0].position.x-center.x),depth=Math.abs(entryState.poses[0].position.z-center.z);
 if(width<.6||width>1.1||depth<.35||depth>.65||entryState.poses.some(p=>Math.abs(Math.abs(p.position.x-center.x)-width)>EPS||Math.abs(Math.abs(p.position.z-center.z)-depth)>EPS)||new Set(entryState.poses.map(p=>`${Math.sign(p.position.x-center.x)}:${Math.sign(p.position.z-center.z)}`)).size!==4)throw Error('Ricochet wave entry requires actual four rectangular paired stations within the existing wave geometry contract.');
 const select=(role:Role,side:number)=>{const found=ids.filter(id=>actors.get(id)!.role===role&&Math.sign(poses.get(id)!.position.x-center.x)===side);if(found.length!==1)throw Error('Each actual sideline needs both named roles.');return found[0];};
 const other=spec.firstRole==='lark'?'robin':'lark',west=select(spec.firstRole,-1),east=select(spec.firstRole,1),westOther=select(other,-1),eastOther=select(other,1),order=[westOther,west,east,eastOther];
 if(relations.get(west)!==westOther||relations.get(east)!==eastOther)throw Error('Named side pairs do not match actual incoming stations.');
 const sign=spec.centerShoulder==='right'?1:-1;if(Math.sign(poses.get(west)!.position.z-center.z)!==sign||Math.sign(poses.get(east)!.position.z-center.z)!==-sign)throw Error('First center shoulder contradicts actual role order.');
 const stationOrder=[...order];let occurrence={lark:0,robin:0};for(let i=0;i<4;i++){if(i%2===0){const role=actors.get(stationOrder[1])!.role,n=++occurrence[role];if(!spec.ricochets.some(r=>r.role===role&&r.occurrence===n))[stationOrder[1],stationOrder[2]]=[stationOrder[2],stationOrder[1]];}else{[stationOrder[0],stationOrder[1]]=[stationOrder[1],stationOrder[0]];[stationOrder[2],stationOrder[3]]=[stationOrder[3],stationOrder[2]];}}
 const desired=ownSequenceBoundary({...entryState,sourceBeat:advanceSequenceBeat(entryState.sourceBeat,spec.beats),poses:spec.exitPoses,heldContacts:[]});
 const targets=new Map(desired.poses.map(p=>[p.id,p])),targetDepth=Math.abs(desired.poses[0].position.z-center.z);
 if(targetDepth<.35||targetDepth>.65)throw Error('Wave endpoint spacing must remain inside the existing box-wave range.');
 for(const [slot,idText]of stationOrder.entries()){
  const id=Number(idText),station=poses.get(order[slot])!.position,target=targets.get(id)!,side=Math.sign(station.x-center.x),yaw=(actors.get(id)!.role===spec.inwardRole?-side:side)*Math.PI/2;
  if(Math.abs(target.position.x-station.x)>EPS||Math.abs(target.position.z-(center.z+Math.sign(station.z-center.z)*targetDepth))>EPS||Math.abs(wrap(target.yaw-yaw))>EPS)throw Error('Wave endpoint must preserve the source hey station permutation, measured center/width and declared facing.');
 }
 const path=compileRicochetHey({actors:entryState.actors,entryOrder:order,partner:new Map(entryState.partner),neighbor:new Map(entryState.neighbor),epoch:entryState.relationshipEpoch,bindingEpoch:entryState.relationshipEpoch,beats:8,passes:4,centerShoulder:spec.centerShoulder,endShoulder:spec.endShoulder,ricochets:spec.ricochets,entry:new Map(entryState.poses.map(p=>[p.id,{position:{...p.position},yaw:p.yaw}])),exit:new Map(desired.poses.map(p=>[p.id,{position:{...p.position},yaw:p.yaw}])),origin:center,minimumClearance:.45,maximumSpeed:1.45,maximumYawRate:3.2});
 const at=(id:number,t:number)=>{if(!actors.has(id)||!Number.isFinite(t))throw Error('Role hey wave sample requires a known actor and finite time.');return path.sample(Math.max(0,Math.min(1,t))*spec.beats).poses.find(p=>p.id===id)!;};
 return Object.freeze({entryState,exitState:desired,ricochetPlan:path,position:(id:number,t:number)=>at(id,t).position,facing:(id:number,t:number)=>at(id,t).yaw,contacts:(t:number)=>path.sample(t*8).contacts});
}
