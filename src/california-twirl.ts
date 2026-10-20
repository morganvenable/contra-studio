/** California twirl: side-by-side nearest-hand exchange, never a facing-entry
 * box-the-gnat. The named lark travels the wider right-turning semicircle and
 * the named robin the tighter left-turning semicircle beneath their joined
 * lark-right / robin-left hands. Both reverse facing in the source's four beats.
 * References: https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm
 * https://teaching.callerlab.org/mainstream/california-twirl-definition/
 */
import type {Dancer,HandContact,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,turn,progress,smooth,ease,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
export type CaliforniaTwirlConstraint=TurnConstraint;
export interface CaliforniaTwirlOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,TurnConstraint>;exit:ReadonlyMap<number,TurnConstraint>;
 /** Logical incoming slots may be wider than the reachable physical handhold.
  * The outgoing actor occupies the OTHER actor's explicit logical slot. */
 entrySlots:ReadonlyMap<number,Vec2>;
 relations:BoundRelationships;bindingEpoch:number;overId:number;underId:number;
 overHand:'right';underHand:'left';beats:4;direction:'right';amount:.5;
 minimumClearance?:number;maximumSpeed?:number;
}
export interface CaliforniaTwirlPose extends TurnConstraint {id:number;under:boolean;archProgress:number;kneeLowering:number;}
export interface CaliforniaTwirlFrame {beat:number;poses:CaliforniaTwirlPose[];contacts:HandContact[];}
export function compileCaliforniaTwirl(options:CaliforniaTwirlOptions){
 const {actors,ids,byId}=ownActors(options.actors,2),relations=ownRelations(options.relations,options.bindingEpoch,actors,false),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids),{overId,underId}=options;
 if(!ids.includes(overId)||!ids.includes(underId)||overId===underId||byId.get(overId)!.role!=='lark'||byId.get(underId)!.role!=='robin'||relations.partner.get(overId)!==underId)throw new Error('The explicit over-lark and under-robin must be the two persistent partners.');
 if(options.overHand!=='right'||options.underHand!=='left'||options.beats!==4||options.direction!=='right'||options.amount!==.5)throw new Error('California twirl requires four beats, lark-right/robin-left hands and an explicit right half-turn.');
 if(options.entrySlots.size!==2||ids.some(id=>!options.entrySlots.has(id)||![options.entrySlots.get(id)!.x,options.entrySlots.get(id)!.z].every(Number.isFinite)))throw new Error('Two explicit finite logical entry slots are required.');
 const slots=new Map(ids.map(id=>[id,Object.freeze({...options.entrySlots.get(id)!})])),A=entry.get(overId)!,B=entry.get(underId)!,X=exit.get(overId)!,Z=exit.get(underId)!,spacing=distance(A.position,B.position),finalSpacing=distance(X.position,Z.position),center={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2},yaw=A.yaw,forward={x:Math.sin(yaw),z:Math.cos(yaw)},right={x:-Math.cos(yaw),z:Math.sin(yaw)};
 if(spacing<.9-1e-8||spacing>1.2+1e-8||finalSpacing<spacing-1e-8||finalSpacing>1.8+1e-8)throw new Error('The twirl needs a reachable .9–1.2 physical entry and an explicit equally wide or wider exit up to1.8.');
 if(Math.abs(turn(B.yaw,yaw))>1e-7||Math.abs((B.position.x-A.position.x)*forward.x+(B.position.z-A.position.z)*forward.z)>1e-7||(B.position.x-A.position.x)*right.x+(B.position.z-A.position.z)*right.z<spacing-1e-7)throw new Error('California twirl requires same-facing side-by-side entry with the lark explicitly on the left.');
 for(const[id,other]of[[overId,underId],[underId,overId]]){const e=exit.get(id)!,s=slots.get(other)!;if(distance(e.position,s)>1e-7||Math.abs(turn(e.yaw,yaw+Math.PI))>1e-7)throw new Error('The explicit exit must exchange the two logical slots and reverse both headings.');const logical=slots.get(id)!,physical=entry.get(id)!,v={x:logical.x-center.x,z:logical.z-center.z},sign=id===overId?-1:1;if(Math.abs(v.x*forward.x+v.z*forward.z)>1e-7||Math.abs(v.x*right.x+v.z*right.z-sign*finalSpacing/2)>1e-7||distance(physical.position,{x:center.x+right.x*sign*spacing/2,z:center.z+right.z*sign*spacing/2})>1e-7)throw new Error('Physical entry and explicit logical slots must share the same side-by-side center and role order.');}
 const roots=(beat:number)=>{const q=progress(beat/4),theta=Math.PI*q,underTheta=Math.PI*(q+.12*Math.sin(Math.PI*q)),r=spacing/2+(finalSpacing-spacing)/2*ease((q-.60)/.40),along=r*Math.cos(theta),overArc=.60*Math.sin(theta),underArc=.08*Math.sin(underTheta);return[
  {id:overId,position:{x:center.x-right.x*along+forward.x*overArc,z:center.z-right.z*along+forward.z*overArc},yaw:yaw-theta,under:false},
  {id:underId,position:{x:center.x+right.x*r*Math.cos(underTheta)+forward.x*underArc,z:center.z+right.z*r*Math.cos(underTheta)+forward.z*underArc},yaw:yaw+underTheta,under:true}
 ];};
 const sample=(beat:number):CaliforniaTwirlFrame=>{beat=sampleTime(beat);const q=progress(beat/4),value=roots(beat),h=1e-5,lo=Math.max(0,beat-h),hi=Math.min(4,beat+h),a=roots(lo),b=roots(hi),poses=value.map((p,i)=>({...p,velocity:{x:(b[i].position.x-a[i].position.x)/(hi-lo),z:(b[i].position.z-a[i].position.z)/(hi-lo)},yawRate:(b[i].yaw-a[i].yaw)/(hi-lo),archProgress:q,kneeLowering:p.under?.14*Math.sin(Math.PI*q)**4:0}));
  const shoulder=(p:CaliforniaTwirlPose,side:number)=>({x:p.position.x+side*.235*Math.cos(p.yaw),z:p.position.z-side*.235*Math.sin(p.yaw)}),S=shoulder(poses[0],-1),T=shoulder(poses[1],1),bias=.17*Math.sin(Math.PI*q)**2,mid={x:S.x+(T.x-S.x)*(.5+bias),z:S.z+(T.z-S.z)*(.5+bias)},desired=1.14+.76*smooth(q/.24)*smooth((1-q)/.2),maxY=Math.min(...poses.map((p,i)=>1.355-p.kneeLowering+Math.sqrt(Math.max(0,.64**2-distance(i===0?S:T,mid)**2)))),strength=smooth((.64-Math.max(distance(S,mid),distance(T,mid)))/.035)*smooth((1-q)/.18),contacts:HandContact[]=strength>.001?[{a:overId,b:underId,handA:'right',handB:'left',point:{...mid,y:Math.min(desired,maxY)},strength,kind:'arch',underId}]:[];
  return{beat,poses,contacts};
 };
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0;for(let i=0;i<=800;i++){const f=sample(i/200);minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[0].position,f.poses[1].position));for(const p of f.poses)maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.velocity,{x:0,z:0}));}
 const minimum=options.minimumClearance??.5,maximum=options.maximumSpeed??1.2;if(![minimum,maximum].every(v=>Number.isFinite(v)&&v>0))throw new Error('Physical budgets must be finite and positive.');if(minimumObservedClearance<minimum-1e-7||maximumObservedSpeed>maximum+1e-7)throw new Error(`California twirl exceeds physical root budgets: clearance${minimumObservedClearance}, speed${maximumObservedSpeed}.`);
 const actor=(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Actor is outside this bound California twirl.');return sample(t*4).poses.find(p=>p.id===id)!;};
 return Object.freeze({beats:4 as const,epoch:relations.epoch,overId,underId,overHand:'right' as const,underHand:'left' as const,entry:immutableMap(entry),exit:immutableMap(exit),entrySlots:immutableMap(slots),minimumObservedClearance,maximumObservedSpeed,sample,position:(id:number,t:number)=>actor(id,t).position,facing:(id:number,t:number)=>actor(id,t).yaw,arch:(id:number,t:number):Pose['arch']=>{const p=actor(id,t);return{underId,progress:p.archProgress,kneeLowering:p.kneeLowering};},contacts:(t:number)=>sample(t*4).contacts});
}
