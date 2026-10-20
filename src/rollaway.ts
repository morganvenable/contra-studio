/** A directed rollaway with half sashay: the named rolling actor turns once
 * in front, while the named counterpart sidesteps behind. Both retain their
 * original facing and exchange explicit slots. This is not an underarm turn.
 *
 * Contra terminology and simultaneous long-lines composition:
 * https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm
 * Four-beat action and interrupted/changing hand connection:
 * https://teaching.callerlab.org/basic-part-1/sashay-rollaway-definition/
 */
import type {Dancer,Hand,HandContact,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {ownActors,ownConstraints,immutableMap,distance,turn,progress,smooth,ease,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';

export interface RollawayOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,TurnConstraint>;exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;bindingEpoch:number;relationship:'partner'|'neighbor';
 rollingId:number;sashayingId:number;direction:'left-to-right'|'right-to-left';halfSashay:true;beats:4;
 /** Opt-in carried ring entry. The explicit pair frame is acquired during
  * the first 1.5 counts while root travel and the full roll already proceed.
  * Without this option, every prior frame and admissibility check is unchanged. */
 entryFacing?:'acquire-pair-frame';pairYaw?:number;
 minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
}
export interface RollawayPose extends TurnConstraint {id:number;rolling:boolean;rollProgress:number;}
export interface RollawayFrame {beat:number;poses:RollawayPose[];contacts:HandContact[];}
const plus=(a:Vec2,b:Vec2,k=1):Vec2=>({x:a.x+b.x*k,z:a.z+b.z*k});
const center=(a:Vec2,b:Vec2):Vec2=>({x:(a.x+b.x)/2,z:(a.z+b.z)/2});
const dot=(a:Vec2,b:Vec2)=>a.x*b.x+a.z*b.z;
const sub=(a:Vec2,b:Vec2):Vec2=>({x:a.x-b.x,z:a.z-b.z});

/** The common carrier may retreat, so the same primitive composes into the
 * return of long lines. Explicit endpoints, not a hidden reset, own that move. */
export function compileRollaway(options:RollawayOptions){
 const {actors,ids,byId}=ownActors(options.actors,2),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids),{rollingId,sashayingId}=options;
 if(!ids.includes(rollingId)||!ids.includes(sashayingId)||rollingId===sashayingId||byId.get(rollingId)!.role===byId.get(sashayingId)!.role)throw new Error('A rollaway needs separate named opposite-role rolling and half-sashaying actors.');
 if(options.beats!==4||options.halfSashay!==true||!['left-to-right','right-to-left'].includes(options.direction)||!['partner','neighbor'].includes(options.relationship))throw new Error('This rollaway requires four beats, an explicit directed full roll, named relationship and half sashay.');
 const epoch=options.relations.epoch,relation=new Map(options.relations[options.relationship]);
 if(!Number.isSafeInteger(epoch)||epoch<0||epoch!==options.bindingEpoch)throw new Error('The rollaway requires the current explicit relationship epoch.');
 if(relation.get(rollingId)!==sashayingId||relation.get(sashayingId)!==rollingId||(byId.get(rollingId)!.couple===byId.get(sashayingId)!.couple)!==(options.relationship==='partner'))throw new Error('The named rollaway pair contradicts its reciprocal relation or persistent couple identity.');
 const extension:Record<string,unknown>={};for(const key of['entryFacing','pairYaw'] as const){const descriptor=Object.getOwnPropertyDescriptor(options,key);if(key in options&&!descriptor||descriptor&&(!descriptor.enumerable||!('value' in descriptor)))throw new Error('Carried rollaway options must be own visible data values, without accessors.');if(descriptor)extension[key]=descriptor.value;}
 const carried=capturePlainData(extension),acquire=carried.entryFacing==='acquire-pair-frame';if(carried.entryFacing!==undefined&&!acquire||acquire&&!Number.isFinite(carried.pairYaw)||!acquire&&carried.pairYaw!==undefined)throw new Error('A carried rollaway facing acquisition needs its explicit finite pair frame.');
 const direction=options.direction,sign=direction==='left-to-right'?1:-1,A=entry.get(rollingId)!,B=entry.get(sashayingId)!,X=exit.get(rollingId)!,Z=exit.get(sashayingId)!,yaw=acquire?carried.pairYaw as number:A.yaw,forward={x:Math.sin(yaw),z:Math.cos(yaw)},right={x:-Math.cos(yaw),z:Math.sin(yaw)},C=center(A.position,B.position),D=center(X.position,Z.position),carrier=sub(D,C),spacing=distance(A.position,B.position),finalSpacing=distance(X.position,Z.position);
 if(spacing<1.0||spacing>(acquire?1.8+1e-8:1.70)||finalSpacing<1.0||finalSpacing>1.8+1e-8||Math.abs(dot(carrier,right))>1e-8||dot(carrier,forward)>1e-8||dot(carrier,forward)<-.6-1e-8)throw new Error('Rollaway entry requires a reachable side-by-side stance and a stationary or explicitly retreating carrier.');
 if(acquire&&[A,B].some(p=>Math.abs(turn(p.yaw,yaw))>Math.PI/4+1e-7))throw new Error('A carried rollaway acquires at most forty-five degrees into its explicit pair frame.');
 if(!acquire&&Math.abs(turn(B.yaw,yaw))>1e-7||Math.abs(dot(sub(B.position,A.position),forward))>1e-7||dot(sub(B.position,A.position),right)*sign<spacing-1e-7)throw new Error('The named roller must occupy the explicit starting side and share the counterpart’s facing.');
 for(const[id,side]of[[rollingId,sign],[sashayingId,-sign]]){const p=exit.get(id)!;if(distance(p.position,plus(D,right,side*finalSpacing/2))>1e-7||Math.abs(turn(p.yaw,yaw))>1e-7)throw new Error('Rollaway exit must exchange slots and retain both original headings.');}
 const initialHands=Object.freeze({rolling:(sign===1?'right':'left') as Hand,sashaying:(sign===1?'left':'right') as Hand}),finalHands=Object.freeze({rolling:initialHands.sashaying,sashaying:initialHands.rolling});
 const roots=(beat:number)=>{const q=progress(beat/4),c=plus(C,carrier,ease(beat/4)),width=spacing+(finalSpacing-spacing)*ease(q),arc=Math.sin(Math.PI*q);return[
  {id:rollingId,position:acquire&&beat<=0?{...A.position}:acquire&&beat>=4?{...X.position}:plus(plus(c,right,sign*width*(q-.5)),forward,.22*arc),yaw:acquire?A.yaw+turn(yaw,A.yaw)*ease(beat/1.5)-sign*Math.PI*2*q:yaw-sign*Math.PI*2*q,rolling:true,rollProgress:q},
  {id:sashayingId,position:acquire&&beat<=0?{...B.position}:acquire&&beat>=4?{...Z.position}:plus(plus(c,right,-sign*width*(q-.5)),forward,-.45*arc),yaw:acquire?B.yaw+turn(yaw,B.yaw)*ease(beat/1.5):yaw,rolling:false,rollProgress:q}
 ];};
 const sample=(rawBeat:number):RollawayFrame=>{const beat=sampleTime(rawBeat),q=progress(beat/4),r=roots(beat),h=1e-5,lo=Math.max(0,beat-h),hi=Math.min(4,beat+h),a=roots(lo),b=roots(hi),poses=r.map((p,i)=>({...p,velocity:{x:(b[i].position.x-a[i].position.x)/(hi-lo),z:(b[i].position.z-a[i].position.z)/(hi-lo)},yawRate:(b[i].yaw-a[i].yaw)/(hi-lo)}));
  // Release the original nearest hands before acquiring the other nearest
  // hands. No wrist is simultaneously owned by two grips; no raised arch.
  const first=q<.5,hands=first?initialHands:finalHands,strength=first?smooth((.48-q)/.12):smooth((q-.52)/.12)*smooth((1-q)/.10),shoulder=(p:RollawayPose,hand:Hand)=>{const s=hand==='left'?1:-1;return{x:p.position.x+s*.235*Math.cos(p.yaw),z:p.position.z-s*.235*Math.sin(p.yaw)};},S=shoulder(poses[0],hands.rolling),T=shoulder(poses[1],hands.sashaying),point={...center(S,T),y:1.19},reach=Math.max(Math.hypot(distance(S,point),1.355-point.y),Math.hypot(distance(T,point),1.355-point.y)),weight=strength*(acquire?smooth(beat/.5):1)*smooth((.645-reach)/.035),contacts:HandContact[]=weight>.001?[{a:rollingId,b:sashayingId,handA:hands.rolling,handB:hands.sashaying,point,strength:weight,kind:'joined'}]:[];
  return{beat,poses,contacts};
 };
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;for(let i=0;i<=800;i++){const f=sample(i/200);minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[0].position,f.poses[1].position));for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.velocity,{x:0,z:0}));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}}
 const minimum=options.minimumClearance??.6,maximum=options.maximumSpeed??1.1,maxYaw=options.maximumYawRate??2.1;if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0)||minimumObservedClearance<minimum-1e-7||maximumObservedSpeed>maximum+1e-7||maximumObservedYawRate>maxYaw+1e-7)throw new Error('Rollaway exceeds its explicit root or body-turn budgets.');
 const actor=(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Actor is outside this bound rollaway.');return sample(t*4).poses.find(p=>p.id===id)!;};
 return Object.freeze({beats:4 as const,epoch,rollingId,sashayingId,direction,halfSashay:true as const,initialHands,finalHands,entry:immutableMap(entry),exit:immutableMap(exit),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>actor(id,t).position,facing:(id:number,t:number)=>actor(id,t).yaw,contacts:(t:number)=>sample(t*4).contacts});
}
