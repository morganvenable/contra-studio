/** Explicit paired-balance and terminal-twirl return for inward-ring sources.
 * This module neither changes source counts nor changes a relationship epoch. */
import {compilePrimitiveFigure} from './engine.ts';
import {compileCaliforniaTwirl} from './california-twirl.ts';
import {compileGyreFigure,type GyreFigure} from './gyre-adapter.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {ownConstraints,ease,heading,turn,distance,type TurnConstraint} from './ring-twirl-contract.ts';
import {ownRingTwirlPolicy,type RingTwirlPolicy} from './ring-twirl-policy.ts';
import type {Figure,Pose,HandContact} from './types.ts';
const own=(c:FigureContext):FigureContext=>({...c,ids:[...c.ids],start:structuredClone(c.start),dancers:structuredClone(c.dancers),next:c.next?structuredClone(c.next):undefined,relations:{epoch:c.relations.epoch,partner:new Map(c.relations.partner),neighbor:new Map(c.relations.neighbor)}});
const finiteTime=(t:number)=>{if(!Number.isFinite(t))throw new Error('The ring/twirl sample must be finite.');return Math.max(0,Math.min(1,t));};
function assertTwirl(f:Figure):void {assertFigureArgumentsConsumed(f);if(f.kind!=='california-twirl'||f.beats!==4||f.who!=='partner'||f.hands!=='right-left'||f.underRole!=='robin'||f.direction!=='right'||f.amount!==.5||f.entry!=='side-by-side-facing-same'||f.exit!==undefined||f.phaseBeats!==undefined||f.confidence==='unsupported')throw new Error('This ring return consumes an ordinary explicit four-count partner California half-twirl with no unconsumed exit or phase modifiers.');}

export function compilePartnerBalanceTwirlFigure(raw:Figure,original:FigureContext,policy:RingTwirlPolicy):MotionPlan {
 ownRingTwirlPolicy(policy);const f=structuredClone(raw),context=own(original);assertFigureArgumentsConsumed(f);
 if(f.kind!=='balance'||f.beats!==4||f.who!=='partner'||f.hands!==undefined||f.confidence==='unsupported'||f.progression||!context.next)throw new Error('The ring/twirl tail requires the explicit four-count unmodified partner balance.');assertTwirl(context.next);
 const partners=resolveBoundFigureRelation(context,'partner'),{ids,start,dancers}=context,center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4},end=structuredClone(start),directions=dancers.filter(d=>d.role==='lark').map(d=>d.direction),paired=structuredClone(start);
 for(const id of ids){const p=start[id],other=start[partners.get(id)!],pairCenter={x:(p.position.x+other.position.x)/2,z:(p.position.z+other.position.z)/2};if(Math.abs(pairCenter.x-center.x)>1e-7||Math.abs(p.position.z-other.position.z)>1e-7||Math.abs(Math.abs(p.position.x-center.x)-.9)>1e-6||Math.abs(Math.abs(p.position.z-center.z)-.9)>1e-6)throw new Error('The partner balance requires the exact canonical cross-set partner rows after the source circle.');paired[id].yaw=heading(p.position,other.position);end[id].position={x:center.x+Math.sign(p.position.x-center.x)*.55,z:p.position.z};end[id].yaw=heading(pairCenter,center);}
 // A usual paired inward/outward pulse is compressed only to the explicitly
 // reviewed three-count phase. The complete fourth count prepares the twirl.
 const pulse=compilePrimitiveFigure(f,ids,paired,dancers,directions),position=(id:number,t:number)=>{t=finiteTime(t);if(t<=.75)return pulse.position(id,t/.75);const a=pulse.position(id,1),b=end[id].position,w=ease((t-.75)/.25);return{x:a.x+(b.x-a.x)*w,z:a.z+(b.z-a.z)*w};};
 const facing=(id:number,t:number,poses:Pose[])=>{t=finiteTime(t);const toward=paired[id].yaw;if(t<=.75)return start[id].yaw+turn(toward,start[id].yaw)*ease(Math.min(1,t*4/.5));return toward+turn(end[id].yaw,toward)*ease((t-.75)/.25);};
 // Validate side-by-side lark-left placement before exposing the prepared hold.
 const twirl=compileRingReturnTwirlFigure({...context.next,progression:false},{...context,start:end,next:undefined},new Map(ids.map(id=>{const p=end[partners.get(id)!];return[id,{position:{x:center.x+Math.sign(p.position.x-center.x)*.9,z:p.position.z},yaw:end[id].yaw+Math.PI,velocity:{x:0,z:0},yawRate:0}];})),policy);
 return Object.freeze({position,facing,contacts(t:number,poses:Pose[]):HandContact[]{t=finiteTime(t);const release=1-ease((t*4-2.5)/.5),acquire=ease((t*4-3.5)/.5);return[...pulse.contacts(Math.min(1,t/.75),poses).map(c=>({...c,strength:c.strength*release})),...twirl.contacts(0,poses).map(c=>({...c,strength:c.strength*acquire}))].filter(c=>c.strength>0);}});
}

export function compileRingReturnTwirlFigure(raw:Figure,original:FigureContext,destination:ReadonlyMap<number,TurnConstraint>,policy:RingTwirlPolicy):MotionPlan {
 ownRingTwirlPolicy(policy);const f=structuredClone(raw),context=own(original);assertTwirl(f);if(context.next!==undefined)throw new Error('A ring-return twirl must be the last source figure.');
 const partners=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,exit=ownConstraints(destination,ids),centerX=ids.reduce((n,id)=>n+start[id].position.x,0)/4;
 const paths=ids.filter(id=>dancers[id].role==='lark').map(overId=>{const underId=partners.get(overId)!,pair=[overId,underId],center={x:(start[overId].position.x+start[underId].position.x)/2,z:(start[overId].position.z+start[underId].position.z)/2},entry=new Map(pair.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}])),entrySlots=new Map(pair.map(id=>[id,{...start[id].position}])),twirlExit=new Map(pair.map(id=>[id,{position:{...start[partners.get(id)!].position},yaw:start[id].yaw+Math.PI,velocity:{x:0,z:0},yawRate:0}]));
  if(Math.abs(center.x-centerX)>1e-7||Math.abs(start[overId].position.z-start[underId].position.z)>1e-7||Math.abs(distance(start[overId].position,start[underId].position)-1.1)>1e-6)throw new Error('The ring-return twirl needs the declared compact1.1-unit persistent-partner row.');
  for(const id of pair){const target=exit.get(id)!,physical=twirlExit.get(id)!.position,deltaZ=target.position.z-center.z,side=Math.sign(physical.x-centerX),half=Math.abs(target.position.x-centerX),outward={x:Math.sin(start[id].yaw+Math.PI),z:Math.cos(start[id].yaw+Math.PI)};
   if(Math.sign(target.position.x-centerX)!==side||![.55,.9].some(n=>Math.abs(half-n)<1e-6)||Math.abs(deltaZ)>.35+1e-6||deltaZ*outward.z< -1e-7||Math.abs(target.position.z-exit.get(partners.get(id)!)!.position.z)>1e-7||Math.abs(half-Math.abs(exit.get(partners.get(id)!)!.position.x-centerX))>1e-7||Math.abs(turn(target.yaw,start[id].yaw+Math.PI))>Math.PI/4+1e-6)throw new Error('The ring-return destination must keep the twirl-exchanged named sides and progress outward by at most.35 into the next ring or same-end wait.');
  }
  const plan=compileCaliforniaTwirl({actors:pair.map(id=>dancers[id]),entry,entrySlots,exit:twirlExit,relations:{epoch:context.relations.epoch,partner:partners,neighbor},bindingEpoch:context.bindingEpoch,overId,underId,overHand:'right',underHand:'left',beats:4,direction:'right',amount:.5});return{pair,plan};
 });
 const forActor=(id:number)=>{const p=paths.find(p=>p.pair.includes(id));if(!p)throw new Error('Actor outside the declared terminal twirl.');return p.plan;};
 return Object.freeze({position(id:number,t:number){t=finiteTime(t);const plan=forActor(id);if(t<=.75)return plan.position(id,t/.75);const a=plan.position(id,1),b=exit.get(id)!.position,w=ease((t-.75)/.25);return{x:a.x+(b.x-a.x)*w,z:a.z+(b.z-a.z)*w};},facing(id:number,t:number){t=finiteTime(t);const plan=forActor(id),a=plan.facing(id,Math.min(1,t/.75));return a+turn(exit.get(id)!.yaw,a)*ease((t-.75)/.25);},arch(id:number,t:number){t=finiteTime(t);return forActor(id).arch(id,Math.min(1,t/.75));},contacts(t:number){t=finiteTime(t);return t<=.75?paths.flatMap(p=>p.plan.contacts(t/.75)):[];}});
}

/** A same-role gyre hands off to the named partner swing without dropping its
 * complete orbit or changing the original roles. The final count releases. */
export function compileRingRoleGyreSwingFigure(raw:Figure,original:FigureContext):MotionPlan {
 const f=structuredClone(raw),context=own(original),next=context.next;if(f.kind!=='gyre'||f.who!=='robins'||f.passingShoulder!=='right'||f.amount!==1.5||f.beats!==8||next?.kind!=='swing'||next.who!=='partner'||next.beats!==8||next.entry!==undefined||next.exit!==undefined||next.progression||next.confidence==='unsupported')throw new Error('This ring composition supports the complete robin right one-and-a-half gyre into the named partner swing.');
 assertFigureArgumentsConsumed(next);
 const base=compileGyreFigure(f as GyreFigure,context),partners=resolveBoundFigureRelation(context,'partner'),end=structuredClone(context.start),ids=context.ids;
 for(const id of ids){const p=base.position(id,1),q=base.position(partners.get(id)!,1),center={x:(p.x+q.x)/2,z:(p.z+q.z)/2},gap=distance(p,q);if(Math.abs(p.x-q.x)>1e-6||Math.abs(gap-1.8)>1e-6)throw new Error('The complete same-role gyre must naturally deliver the original partners to canonical sidelines.');end[id].position={x:center.x+(p.x-center.x)*.62/gap,z:center.z+(p.z-center.z)*.62/gap};end[id].yaw=heading(end[id].position,center)+Math.PI/3;}
 const sample=(t:number)=>Math.min(1,finiteTime(t)*8/7),preparation=(t:number)=>ease(t*8-7);
 return Object.freeze({position(id:number,t:number){const a=base.position(id,sample(t)),b=end[id].position,w=preparation(t);return{x:a.x+(b.x-a.x)*w,z:a.z+(b.z-a.z)*w};},facing(id:number,t:number,poses:Pose[]){const a=base.facing(id,sample(t),poses),w=preparation(t);return a+turn(end[id].yaw,a)*w;},contacts:()=>[]});
}
