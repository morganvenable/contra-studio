/** Source-counted terminal petronella: the complete rightward station and body
 * spin precede an explicit opening/facing convention, with no extra station. */
import {compilePetronella,type PetronellaOptions} from './petronella.ts';
import {ownActors,ownConstraints,ownRelations,distance,turn,progress,sampleTime,immutableMap,type TurnConstraint} from './ring-twirl-contract.ts';
import type {HandContact,Pose,Vec2} from './types.ts';
export interface TerminalPetronellaOptions extends Omit<PetronellaOptions,'exitHands'> {
 phaseBeats:readonly [3,1];
 /** Physical spacing convention, independent of the right-station permutation. */
 exitScale:number;
 forward:Vec2;
}
export function compileTerminalPetronella(options:TerminalPetronellaOptions){
 const {actors,ids}=ownActors(options.actors,4),relations=ownRelations(options.relations,options.bindingEpoch,actors),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids),cycle=[...options.cyclicIds] as [number,number,number,number];
 const forward={...options.forward},exitScale=options.exitScale;
 if(!Array.isArray(options.phaseBeats)||options.phaseBeats.length!==2||options.phaseBeats[0]!==3||options.phaseBeats[1]!==1||![forward.x,forward.z,exitScale].every(Number.isFinite)||Math.abs(distance(forward,{x:0,z:0})-1)>1e-8||exitScale<1||exitScale>1.8)throw new Error('Terminal petronella requires an explicit three-plus-one allocation, unit hall direction and bounded opening scale.');
 const center={x:ids.reduce((s,id)=>s+entry.get(id)!.position.x,0)/4,z:ids.reduce((s,id)=>s+entry.get(id)!.position.z,0)/4};
 const stationExit=new Map(cycle.map((id,i)=>[id,{position:{...entry.get(cycle[(i+3)%4])!.position},yaw:entry.get(id)!.yaw-3*Math.PI/2,velocity:{x:0,z:0},yawRate:0}]));
 const basic=compilePetronella({...options,actors,entry,exit:stationExit,relations,cyclicIds:cycle,exitHands:'released'});
 const forwardYaw=Math.atan2(forward.x,forward.z),dot=(p:Vec2)=>(p.x-center.x)*forward.x+(p.z-center.z)*forward.z;
 const facingDelta=new Map<number,number>();
 for(const id of ids){const station=stationExit.get(id)!,target=exit.get(id)!,radial={x:station.position.x-center.x,z:station.position.z-center.z},wanted={x:center.x+radial.x*exitScale,z:center.z+radial.z*exitScale},row=dot(wanted),partner=exit.get(relations.partner.get(id)!)!;
  if(Math.abs(row)<1e-8||distance(target.position,wanted)>1e-7||Math.abs(dot(partner.position)-row)>1e-7||Math.abs(turn(target.yaw,forwardYaw+(row>0?0:Math.PI)))>1e-7)throw new Error('Terminal petronella must open the exact named right station into a persistent-partner row facing onward along the set.');
  facingDelta.set(id,turn(target.yaw,station.yaw));
 }
 const root=(id:number,beat:number)=>{if(!entry.has(id))throw new Error('Actor is outside this bound terminal petronella.');const t=sampleTime(beat),stationProgress=Math.min(1,t/3),p=basic.sample(stationProgress*4).poses.find(p=>p.id===id)!,open=progress(t-3);return{id,position:{x:center.x+(p.position.x-center.x)*(1+(exitScale-1)*open),z:center.z+(p.position.z-center.z)*(1+(exitScale-1)*open)},yaw:p.yaw+facingDelta.get(id)!*open};};
 const contacts=(beat:number,poses:readonly Pose[]):HandContact[]=>basic.contacts(Math.min(1,sampleTime(beat)/3),poses as Pose[]);
 const sample=(beat:number)=>{const b=sampleTime(beat),h=1e-5,lo=Math.max(0,b-h),hi=Math.min(4,b+h),poses=ids.map(id=>{const p=root(id,b),a=root(id,lo),q=root(id,hi);return{...p,velocity:{x:(q.position.x-a.position.x)/(hi-lo),z:(q.position.z-a.position.z)/(hi-lo)},yawRate:(q.yaw-a.yaw)/(hi-lo)};});return{beat:b,poses,contacts:contacts(b,poses.map(p=>({...p,stride:1,lean:0,bounce:0,turn:0,activity:'petronella' as const})))};};
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let n=0;n<=400;n++){const f=sample(n/100);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.velocity,{x:0,z:0}));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 const limits=[options.minimumClearance??.7,options.maximumSpeed??1,options.maximumYawRate??3];if(!limits.every(n=>Number.isFinite(n)&&n>0)||minimumObservedClearance<limits[0]-1e-7||maximumObservedSpeed>limits[1]+1e-7||maximumObservedYawRate>limits[2]+1e-7)throw new Error(`Terminal petronella exceeds physical budgets: ${minimumObservedClearance}/${maximumObservedSpeed}/${maximumObservedYawRate}.`);
 return Object.freeze({beats:4 as const,phaseBeats:Object.freeze([3,1] as const),exitScale,epoch:relations.epoch,entry:immutableMap(entry),exit:immutableMap(exit),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,sampleTime(t*4)).position,facing:(id:number,t:number)=>root(id,sampleTime(t*4)).yaw,contacts:(t:number,poses:Pose[])=>contacts(sampleTime(t*4),poses)});
}

import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure} from './types.ts';
/** Standard improper-set adapter. It opens physical spacing within the last
 * count; the four named station assignments do not change during that opening. */
export function compileTerminalPetronellaFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='petronella'||f.beats!==4||f.who!=='all'||f.direction!=='right'||f.amount!==.25||f.spinDirection!=='right'||f.spinAmount!==.75||f.clap!=='none'||f.entry!=='ring'||f.exit!=='progressed-neighbors'||f.phaseBeats?.length!==2||f.phaseBeats[0]!==3||f.phaseBeats[1]!==1||f.confidence==='unsupported'||context.next!==undefined)throw new Error('Terminal petronella requires a final four-count right station/full spin, explicit three-plus-one opening and next-neighbor facing.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 const half=Math.abs(start[ids[0]].position.x-center.x);
 if(half<.5||half>.65||ids.some(id=>Math.abs(Math.abs(start[id].position.x-center.x)-half)>1e-7||Math.abs(Math.abs(start[id].position.z-center.z)-half)>1e-7))throw new Error('Terminal petronella needs a compact square aligned with the improper set.');
 const cyclicIds=[...ids].sort((a,b)=>Math.atan2(start[a].position.z-center.z,start[a].position.x-center.x)-Math.atan2(start[b].position.z-center.z,start[b].position.x-center.x)) as [number,number,number,number];
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const exit=new Map(cyclicIds.map((id,i)=>{const p=start[cyclicIds[(i+3)%4]].position;return[id,{position:{x:center.x+(p.x-center.x)*.9/half,z:center.z+(p.z-center.z)*.9/half},yaw:p.z>center.z?0:Math.PI,velocity:{x:0,z:0},yawRate:0}];}));
 return compileTerminalPetronella({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,cyclicIds,beats:4,direction:'right',amount:.25,spinDirection:'right',spinAmount:.75,clap:'none',phaseBeats:[3,1],exitScale:.9/half,forward:{x:0,z:1}});
}
