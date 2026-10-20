/** A row-local carried rollaway. Actual named counterparts exchange their
 * entire measured slots; the rolling actor goes in front of the half-sashayer.
 * Facing acquisition overlaps the first 1.5 of the same four source counts.
 * The full roll is measured relative to that acquiring pair-facing frame.
 * Hands are a disclosed nearest-hand release/change/regrip model, not an arch. */
import type {Figure,HandContact,Role,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compileRollaway,type RollawayFrame} from './rollaway.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {distance,heading,progress,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

const EPS=1e-7,ACQUIRE_COUNTS=1.5,SAMPLES=800;
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const center=(a:Readonly<Vec2>,b:Readonly<Vec2>):Vec2=>({x:(a.x+b.x)/2,z:(a.z+b.z)/2});
const inverseProgress=(target:number)=>{let lo=0,hi=1;for(let n=0;n<52;n++){const t=(lo+hi)/2;if(progress(t)<target)lo=t;else hi=t;}return(lo+hi)/2;};
export type StandaloneRollawayFigure=Omit<Figure,'kind'>&{kind:'rollaway';who:'partner'|'neighbor';rollRole:Role;sashayRole:Role;rollRelation:'partner'|'neighbor';rollDirection:'left-to-right'|'right-to-left';rollHalfSashay:true;beats:4};
export interface StandaloneRollawayPair {
 readonly rollingId:number;readonly sashayingId:number;readonly relationship:'partner'|'neighbor';
 readonly center:Readonly<Vec2>;readonly pairYaw:number;readonly width:number;readonly fullRollRadians:number;
}
export interface StandaloneRollawayGate {
 readonly kind:'quarter-roll'|'facing-acquired'|'roller-in-front'|'three-quarter-roll'|'slots-exchanged-released';
 readonly sourceBeat:number;readonly rollProgress:number;
 readonly poses:readonly {readonly id:number;readonly position:Readonly<Vec2>;readonly yaw:number}[];
}
export interface StandaloneRollawayPlan extends SequencedMotionPlan {
 readonly beats:4;readonly epoch:number;readonly namedPairs:readonly StandaloneRollawayPair[];
 readonly facingAcquisitionBeats:1.5;readonly contactConvention:'released-nearest-hands-change-release';
 readonly gates:readonly StandaloneRollawayGate[];
 readonly minimumObservedClearance:number;readonly minimumClearanceBound:number;
 readonly maximumObservedSpeed:number;readonly maximumSpeedBound:number;
 readonly maximumObservedYawRate:number;readonly maximumYawRateBound:number;
 readonly maximumRawHandReach:number;
 sample(beat:number):RollawayFrame;
}

export function assertStandaloneRollawayFigure(input:Figure|StandaloneRollawayFigure):StandaloneRollawayFigure {
 const f=capturePlainData(input),keys=new Set(['id','kind','beats','label','notes','confidence','progression','who','rollRole','sashayRole','rollRelation','rollDirection','rollHalfSashay']);
 if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).some(k=>!keys.has(k)&&f[k as keyof typeof f]!==undefined))throw new Error('A standalone rollaway cannot ignore extra figure modifiers.');
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence)||f.progression!==undefined&&f.progression!==false)throw new Error('A standalone rollaway needs supported metadata without a progression event.');
 if(f.kind!=='rollaway'||f.beats!==4||!['partner','neighbor'].includes(f.who??'')||f.who!==f.rollRelation||!['lark','robin'].includes(f.rollRole??'')||!['lark','robin'].includes(f.sashayRole??'')||f.rollRole===f.sashayRole||!['left-to-right','right-to-left'].includes(f.rollDirection??'')||f.rollHalfSashay!==true)throw new Error('A standalone rollaway needs four counts, explicit opposite rolling/sashaying roles, the matching named relation, direction and half sashay.');
 return f as StandaloneRollawayFigure;
}

export function compileStandaloneRollawayStep(input:Figure|StandaloneRollawayFigure,context:FigureContext,incoming:SequenceBoundary):StandaloneRollawayPlan {
 const f=assertStandaloneRollawayFigure(input),boundary=ownSequenceBoundary(incoming),endBeat=advanceSequenceBeat(boundary.sourceBeat,4);
 if(boundary.heldContacts.length)throw new Error('This standalone rollaway requires released incoming hands; it cannot discard an incoming held contact.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const ids=boundary.actors.map(a=>a.id),byId=new Map(boundary.poses.map(p=>[p.id,p])),actorById=new Map(boundary.actors.map(a=>[a.id,a])),relation=new Map(boundary[f.rollRelation]);
 const pairs=boundary.actors.filter(a=>a.role===f.rollRole).map(a=>({rollingId:a.id,sashayingId:relation.get(a.id)!,relationship:f.rollRelation}));
 if(pairs.length!==2||pairs.some(p=>actorById.get(p.sashayingId)?.role!==f.sashayRole)||new Set(pairs.flatMap(p=>[p.rollingId,p.sashayingId])).size!==4)throw new Error('The rollaway roles and actual relation must name two distinct current pairs.');
 const centers=pairs.map(p=>center(byId.get(p.rollingId)!.position,byId.get(p.sashayingId)!.position)),centerGap=distance(centers[0],centers[1]);
 if(centerGap<1.4-EPS||centerGap>2.2+EPS)throw new Error('Standalone rollaway requires opposing measured pair centers within its four-body envelope.');
 const namedPairs=pairs.map((p,index)=>({...p,center:centers[index],pairYaw:heading(centers[index],centers[1-index]),width:distance(byId.get(p.rollingId)!.position,byId.get(p.sashayingId)!.position),fullRollRadians:f.rollDirection==='left-to-right'?-2*Math.PI:2*Math.PI}));
 const constraint=(id:number):TurnConstraint=>({position:{...byId.get(id)!.position},yaw:byId.get(id)!.yaw,velocity:{x:0,z:0},yawRate:0});
 const relations={epoch:boundary.relationshipEpoch,partner:new Map(boundary.partner),neighbor:new Map(boundary.neighbor)};
 const paths=namedPairs.map(p=>{const named=[p.rollingId,p.sashayingId],entry=new Map(named.map(id=>[id,constraint(id)])),exit=new Map(named.map(id=>[id,{position:{...byId.get(relation.get(id)!)!.position},yaw:p.pairYaw,velocity:{x:0,z:0},yawRate:0}]));
  return compileRollaway({actors:capturePlainData(named.map(id=>context.dancers[id])),entry,exit,relations,bindingEpoch:boundary.relationshipEpoch,relationship:p.relationship,rollingId:p.rollingId,sashayingId:p.sashayingId,direction:f.rollDirection,halfSashay:true,beats:4,entryFacing:'acquire-pair-frame',pairYaw:p.pairYaw,maximumYawRate:3});
 });
 const sample=(raw:number):RollawayFrame=>{const beat=sampleTime(raw),frames=paths.map(p=>p.sample(beat));return{beat,poses:frames.flatMap(p=>p.poses).sort((a,b)=>a.id-b.id),contacts:frames.flatMap(p=>p.contacts)};};
 // q' <= 1/(4*.82); root derivative is width along the pair plus a bounded
 // .45*pi orthogonal arc. A half-grid Lipschitz margin certifies every one
 // of the six four-body distances between the sampled states.
 const maximumSpeedBound=Math.max(...namedPairs.map(p=>Math.hypot(p.width,.45*Math.PI)/(4*.82))),maximumYawRateBound=2*Math.PI/(4*.82)+(Math.PI/4)*1.875/ACQUIRE_COUNTS;
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0,maximumRawHandReach=0;
 for(let n=0;n<=SAMPLES;n++){const frame=sample(n*4/SAMPLES),occupied=new Set<string>();
  for(let i=0;i<4;i++){const a=frame.poses[i];maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(a.velocity.x,a.velocity.z));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(a.yawRate));for(let j=i+1;j<4;j++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(a.position,frame.poses[j].position));}
  for(const c of frame.contacts)for(const [id,hand]of[[c.a,c.handA],[c.b,c.handB]] as const){const key=`${id}:${hand}`;if(occupied.has(key))throw new Error('The standalone rollaway cannot give a hand two simultaneous owners.');occupied.add(key);const p=frame.poses.find(p=>p.id===id)!,s=hand==='left'?1:-1;maximumRawHandReach=Math.max(maximumRawHandReach,Math.hypot(c.point.x-p.position.x-s*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+s*.235*Math.sin(p.yaw)));}
 }
 const minimumClearanceBound=minimumObservedClearance-maximumSpeedBound*4/SAMPLES;
 if(minimumClearanceBound<.6-EPS||maximumObservedSpeed>maximumSpeedBound+EPS||maximumObservedYawRate>maximumYawRateBound+EPS||maximumRawHandReach>=.645)throw new Error('The standalone rollaway violates its four-body, speed, yaw or reachable-hand envelope.');
 const actor=(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Actor is outside this standalone rollaway.');return sample(t*4).poses.find(p=>p.id===id)!;};
 const plan:MotionPlan={position:(id,t)=>actor(id,t).position,facing:(id,t)=>actor(id,t).yaw,contacts:(t):HandContact[]=>sample(t*4).contacts};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);assertSequenceHandoff(boundary,entryState);
 const gateSpecs:readonly (readonly [StandaloneRollawayGate['kind'],number])[]=[['quarter-roll',inverseProgress(.25)*4],['facing-acquired',ACQUIRE_COUNTS],['roller-in-front',2],['three-quarter-roll',inverseProgress(.75)*4],['slots-exchanged-released',4]];
 const gates=gateSpecs.map(([kind,beat])=>({kind,sourceBeat:boundary.sourceBeat+beat,rollProgress:progress(beat/4),poses:sample(beat).poses.map(({id,position,yaw})=>({id,position,yaw}))}));
 return freeze({...plan,beats:4,epoch:boundary.relationshipEpoch,namedPairs,facingAcquisitionBeats:ACQUIRE_COUNTS,contactConvention:'released-nearest-hands-change-release',gates,entryState,exitState,sample,minimumObservedClearance,minimumClearanceBound,maximumObservedSpeed,maximumSpeedBound,maximumObservedYawRate,maximumYawRateBound,maximumRawHandReach} as StandaloneRollawayPlan);
}
