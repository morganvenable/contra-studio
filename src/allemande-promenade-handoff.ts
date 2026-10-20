/** Retain the complete named allemande and prepare its same-person half
 * promenade inside the turn's existing last count. No extra turn or actor
 * exchange is substituted for the source instruction. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compilePromenadeFigure} from './promenade-adapter.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {ease,turn} from './ring-twirl-contract.ts';
import type {Figure,Pose} from './types.ts';
export function prepareAllemandePromenadeExit(f:Figure,context:FigureContext,plan:MotionPlan):MotionPlan {
 f=structuredClone(f);assertFigureArgumentsConsumed(f);
 const next=context.next;
 if(f.kind!=='allemande'||f.beats<6||f.amount!==1.5||!['partner','neighbor'].includes(f.who??'')||!['left','right'].includes(f.direction??'')||f.progression||f.entry!==undefined||f.exit!==undefined||f.phaseBeats!==undefined||f.hands!==undefined||f.underRole!==undefined||f.inwardRole!==undefined||f.outwardRole!==undefined||next?.kind!=='promenade'||next.who!==f.who)throw new Error('An allemande-to-promenade handoff requires an explicit complete one-and-a-half named turn followed by the same-person across-set half promenade.');
 resolveBoundFigureRelation(context,f.who as 'partner'|'neighbor');
 const ids=[...context.ids],end=structuredClone(context.start),center={x:ids.reduce((sum,id)=>sum+plan.position(id,1).x,0)/4,z:ids.reduce((sum,id)=>sum+plan.position(id,1).z,0)/4},targetYaw=new Map<number,number>();
 for(const id of ids){const p=plan.position(id,1);if(Math.abs(Math.abs(p.x-center.x)-.9)>1e-6||Math.abs(Math.abs(p.z-center.z)-.9)>1e-6)throw new Error('The reviewed allemande-to-promenade bridge requires exact canonical sideline endpoints.');end[id].position={x:p.x,z:center.z+Math.sign(p.z-center.z)*.34};end[id].yaw=p.x>center.x?-Math.PI/2:Math.PI/2;const natural=plan.facing(id,1,end);targetYaw.set(id,natural+turn(end[id].yaw,natural));}
 // Validate source qualifiers, left/right pair order and actual across-facing
 // promenade entry. No contact is acquired before that following figure.
 compilePromenadeFigure(next,{...context,start:end,next:undefined});
 const amount=(t:number)=>ease(t*f.beats-(f.beats-1));
 return Object.freeze({...plan,position(id:number,t:number){const a=plan.position(id,t),b=end[id].position,w=amount(t);return{x:a.x+(b.x-a.x)*w,z:a.z+(b.z-a.z)*w};},facing(id:number,t:number,poses:Pose[]){const a=plan.facing(id,t,poses),w=amount(t);if(!w)return a;const onset=plan.facing(id,1-1/f.beats,poses),current=onset+turn(a,onset),target=onset+turn(targetYaw.get(id)!,onset);return current+(target-current)*w;},contacts(t:number,poses:Pose[]){const release=1-ease((t*f.beats-(f.beats-1))/.5);return plan.contacts(t,poses).map(c=>({...c,strength:c.strength*release})).filter(c=>c.strength>0);}});
}
