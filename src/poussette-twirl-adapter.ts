/** The source-qualified “California twirl then join two hands” tail.
 * The full opposite-winding half-turn occupies three reviewed counts; count
 * four turns the partners to face one another and acquires their two-hand hold.
 * This does not change the ordinary four-count California-twirl adapter.
 */
import {compileCaliforniaTwirl} from './california-twirl.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {ownConstraints,ease,smooth,turn,distance,type TurnConstraint} from './ring-twirl-contract.ts';
import type {Figure,HandContact,Pose} from './types.ts';
export type PoussetteTwirlFigure=Omit<Figure,'exit'> & {kind:'california-twirl';exit:'partner-two-hand-hold';phaseBeats:readonly[3,1]};
export function partnerTwoHandContacts(ids:readonly number[],partners:ReadonlyMap<number,number>,poses:readonly Pose[],strength=1):HandContact[]{
 const byId=new Map(poses.map(p=>[p.id,p]));
 if(!Number.isFinite(strength)||strength<0||strength>1||new Set(ids).size!==ids.length||byId.size!==poses.length||ids.some(id=>!byId.has(id)||!ids.includes(partners.get(id)!)||partners.get(partners.get(id)!)!==id))throw new Error('A partner two-hand hold needs complete explicit reciprocal identities and finite strength.');
 if(!strength)return[];
 return ids.filter(id=>id<partners.get(id)!).flatMap(a=>{const b=partners.get(a)!,A=byId.get(a)!,B=byId.get(b)!;return(['left','right']as const).map(hand=>{const sign=hand==='left'?1:-1,S={x:A.position.x+sign*.235*Math.cos(A.yaw),z:A.position.z-sign*.235*Math.sin(A.yaw)},T={x:B.position.x-sign*.235*Math.cos(B.yaw),z:B.position.z+sign*.235*Math.sin(B.yaw)};return{a,b,handA:hand,handB:hand==='left'?'right' as const:'left' as const,point:{x:(S.x+T.x)/2,y:1.20,z:(S.z+T.z)/2},strength,kind:'joined' as const};});});
}
export function compilePoussetteTwirlFigure(raw:PoussetteTwirlFigure,context:FigureContext,destination:ReadonlyMap<number,TurnConstraint>):MotionPlan {
 const f=structuredClone(raw);context={...context,ids:[...context.ids],start:structuredClone(context.start),dancers:structuredClone(context.dancers),relations:{epoch:context.relations.epoch,partner:new Map(context.relations.partner),neighbor:new Map(context.relations.neighbor)}};
 const allowed=new Set(['id','kind','beats','label','notes','confidence','progression','who','hands','underRole','direction','amount','entry','exit','phaseBeats']);
 if(Object.keys(f).some(k=>!allowed.has(k)&&f[k as keyof PoussetteTwirlFigure]!==undefined)||f.kind!=='california-twirl'||f.beats!==4||f.who!=='partner'||f.hands!=='right-left'||f.underRole!=='robin'||f.direction!=='right'||f.amount!==.5||f.entry!=='side-by-side-facing-same'||f.exit!=='partner-two-hand-hold'||f.confidence==='unsupported'||!Array.isArray(f.phaseBeats)||f.phaseBeats.length!==2||f.phaseBeats[0]!==3||f.phaseBeats[1]!==1||f.progression!==undefined&&typeof f.progression!=='boolean')throw new Error('This source-qualified tail requires a complete partner California half-twirl, then explicit two-hand facing preparation in a reviewed three-plus-one allocation.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,exit=ownConstraints(destination,ids);
 const paths=ids.filter(id=>dancers[id].role==='lark').map(overId=>{const underId=partner.get(overId)!,pair=[overId,underId],A=start[overId],B=start[underId],center={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2},spacing=distance(A.position,B.position);
  if(Math.abs(center.x)>1e-7||Math.abs(A.position.z-B.position.z)>1e-7||spacing<1.04-1e-7||spacing>1.2+1e-7)throw new Error('The qualified twirl must receive the explicit cross-set partner row and reachable ring-produced hold.');
  const entry=new Map(pair.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}])),entrySlots=new Map(pair.map(id=>[id,{...start[id].position}])),twirlExit=new Map(pair.map(id=>[id,{position:{...start[partner.get(id)!].position},yaw:start[id].yaw+Math.PI,velocity:{x:0,z:0},yawRate:0}]));
  for(const id of pair){const out=exit.get(id)!,physical=twirlExit.get(id)!.position,side=Math.sign(physical.x),yaw=-side*Math.PI/2;if(distance(out.position,{x:side*.52,z:center.z})>1e-7||Math.abs(turn(out.yaw,yaw))>1e-7)throw new Error('The qualified twirl destination must preserve the exchanged named sides and row, then face the same partner in a compact two-hand hold.');}
  const plan=compileCaliforniaTwirl({actors:pair.map(id=>dancers[id]),entry,entrySlots,exit:twirlExit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,overId,underId,overHand:'right',underHand:'left',beats:4,direction:'right',amount:.5});return{pair,plan};
 });
 const forActor=(id:number)=>{const p=paths.find(p=>p.pair.includes(id));if(!p)throw new Error('Actor is outside this source-qualified partner twirl.');return p.plan;};
 const position=(id:number,t:number)=>{if(!Number.isFinite(t))throw new Error('Finite twirl sample required.');t=Math.max(0,Math.min(1,t));const plan=forActor(id);if(t<=.75)return plan.position(id,t/.75);const a=plan.position(id,1),b=exit.get(id)!.position,q=ease((t-.75)/.25);return{x:a.x+(b.x-a.x)*q,z:a.z+(b.z-a.z)*q};};
 const facing=(id:number,t:number)=>{if(!Number.isFinite(t))throw new Error('Finite twirl sample required.');t=Math.max(0,Math.min(1,t));const plan=forActor(id);if(t<=.75)return plan.facing(id,t/.75);const a=plan.facing(id,1);return a+turn(exit.get(id)!.yaw,a)*ease((t-.75)/.25);};
 // The shorter physical turn needs its own under-person duck and arm route.
 // Keep the role cue through the facing count so the released hands return
 // continuously before acquiring the unchanged explicit two-hand contacts.
 const arch=(id:number,t:number):Pose['arch']=>{if(!Number.isFinite(t))throw new Error('Finite twirl sample required.');const cue=forActor(id).arch(id,Math.max(0,Math.min(1,t/.75)))!;return{...cue,kneeLowering:cue.kneeLowering*1.65,armRoute:'three-count-poussette'};};
 return Object.freeze({position,facing,arch,contacts:(t:number,poses:Pose[])=>t<=.75?paths.flatMap(p=>p.plan.contacts(t/.75)):partnerTwoHandContacts(ids,partner,poses,smooth((t*4-3.5)/.5))});
}
