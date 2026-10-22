/** Literal half hey reaching supplied same-geometry opposite stations and facing.
 * The caller owns endpoint rebinding; this adapter cannot move a dancer during it. */
import {capturePlainData} from './owned-program-cache.ts';
import {ownSequenceBoundary,advanceSequenceBeat,type SequenceBoundary,type SequenceBoundaryPose,type SequencedMotionPlan} from './sequence-boundary.ts';
import {compileRoleHeyEncounters} from './role-hey-encounters.ts';
import {compilePartialHey,type PartialHeyTrajectory} from './partial-hey.ts';
import type {Role} from './types.ts';
export interface RoleHalfHeyEndpointSpec {beats:8;firstRole:Role;sidePair:'partner'|'neighbor';centerShoulder:'left'|'right';endShoulder:'left'|'right';exitPoses:readonly SequenceBoundaryPose[];}
export interface RoleHalfHeyEndpointPlan extends SequencedMotionPlan {readonly heyPlan:PartialHeyTrajectory;}
const EPS=1e-7;
export function compileRoleHalfHeyEndpointStep(incoming:SequenceBoundary,raw:RoleHalfHeyEndpointSpec):RoleHalfHeyEndpointPlan{
 const entryState=ownSequenceBoundary(incoming),spec=capturePlainData(raw);
 if(Object.keys(spec).some(k=>!['beats','firstRole','sidePair','centerShoulder','endShoulder','exitPoses'].includes(k))||spec.beats!==8||!['partner','neighbor'].includes(spec.sidePair))throw Error('A role half-hey endpoint needs eight counts, explicit side pair, inward role and measured endpoints.');
 if(entryState.heldContacts.length)throw Error('The role hey requires actually released entry hands.');
 const poses=new Map(entryState.poses.map(p=>[p.id,p])),actors=new Map(entryState.actors.map(a=>[a.id,a])),ids=[...actors.keys()],relations=new Map(entryState[spec.sidePair]);
 const center={x:entryState.poses.reduce((n,p)=>n+p.position.x/4,0),z:entryState.poses.reduce((n,p)=>n+p.position.z/4,0)};
 const width=Math.abs(entryState.poses[0].position.x-center.x),depth=Math.abs(entryState.poses[0].position.z-center.z);
 if(width<.6||width>1.1||depth<.35||depth>.65||entryState.poses.some(p=>Math.abs(Math.abs(p.position.x-center.x)-width)>EPS||Math.abs(Math.abs(p.position.z-center.z)-depth)>EPS)||new Set(entryState.poses.map(p=>`${Math.sign(p.position.x-center.x)}:${Math.sign(p.position.z-center.z)}`)).size!==4)throw Error('Half-hey entry requires actual four rectangular paired stations within the existing wave geometry contract.');
 const select=(role:Role,side:number)=>{const found=ids.filter(id=>actors.get(id)!.role===role&&Math.sign(poses.get(id)!.position.x-center.x)===side);if(found.length!==1)throw Error('Each actual sideline needs both named roles.');return found[0];};
 const other=spec.firstRole==='lark'?'robin':'lark',west=select(spec.firstRole,-1),east=select(spec.firstRole,1),westOther=select(other,-1),eastOther=select(other,1),order=[westOther,west,east,eastOther];
 if(relations.get(west)!==westOther||relations.get(east)!==eastOther)throw Error('Named side pairs do not match actual incoming stations.');
 const sign=spec.centerShoulder==='right'?1:-1;if(Math.sign(poses.get(west)!.position.z-center.z)!==sign||Math.sign(poses.get(east)!.position.z-center.z)!==-sign)throw Error('First center shoulder contradicts actual role order.');
 const graph=compileRoleHeyEncounters(entryState,{entryOrder:order,firstRole:spec.firstRole,centerShoulder:spec.centerShoulder,endShoulder:spec.endShoulder,amount:spec.beats===8?.5:1,beats:spec.beats});
 const desired=ownSequenceBoundary({...entryState,sourceBeat:advanceSequenceBeat(entryState.sourceBeat,spec.beats),poses:spec.exitPoses,heldContacts:[]});
 const targets=new Map(desired.poses.map(p=>[p.id,p])),targetDepth=Math.abs(desired.poses[0].position.z-center.z);
 if(targetDepth<.35||targetDepth>.65)throw Error('Half-hey endpoint spacing must remain inside the existing box-wave range.');
 for(const [slot,idText]of graph.endOrder!.entries()){
  const id=Number(idText),station=poses.get(order[slot])!.position,target=targets.get(id)!,side=Math.sign(station.x-center.x);
  if(Math.abs(target.position.x-station.x)>EPS||Math.abs(target.position.z-(center.z+Math.sign(station.z-center.z)*targetDepth))>EPS)throw Error('Half-hey endpoint must preserve the source hey station permutation, measured center/width and finite supplied facing.');
 }
 const named=(pairs:SequenceBoundary['partner'])=>new Map(pairs.map(([a,b])=>[String(a),String(b)]));
 const path=compilePartialHey({actors:entryState.actors.map(a=>({...a,id:String(a.id),couple:String(a.couple)})),events:graph.events,entry:new Map(entryState.poses.map(p=>[String(p.id),{position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0}}])),exit:new Map(desired.poses.map(p=>[String(p.id),{position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0}}])),frame:{origin:center,axis:{x:1,z:0}},beats:spec.beats,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:[2.25,3.75,5.25,6.75],slotSpacing:1.05,passClearance:.66,maximumSpeed:spec.beats===8?1.3:1.35,maximumYawRate:4,relationships:{partner:named(entryState.partner),neighbor:named(entryState.neighbor)}});
 const at=(id:number,t:number)=>{if(!actors.has(id)||!Number.isFinite(t))throw Error('Role hey wave sample requires a known actor and finite time.');return path.sample(Math.max(0,Math.min(1,t))*spec.beats).poses.find(p=>p.id===String(id))!;};
 return Object.freeze({entryState,exitState:desired,heyPlan:path,position:(id:number,t:number)=>at(id,t).position,facing:(id:number,t:number)=>at(id,t).yaw,contacts:(t:number)=>{if(!Number.isFinite(t))throw Error('Sample time must be finite.');return[];}});
}
