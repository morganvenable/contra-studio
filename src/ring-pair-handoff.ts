/** Bounded bridges between a named pair and an existing four-person ring.
 * No actor permutation, relationship change, extra station or extra count is
 * introduced here. The following source figure determines the exact endpoint. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compilePetronellaFigure,type PetronellaFigure} from './petronella-adapter.ts';
import {compileRingBalanceFigure} from './ring-california-adapter.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {ease,heading,turn} from './ring-twirl-contract.ts';
import type {Figure,Pose} from './types.ts';

/** A complete petronella still finishes its named station and three-quarter
 * spin inward. Release the ring before the next named pair balance acquires;
 * that following balance owns its own facing change and all four counts. */
export function compilePetronellaToPairFigure(f:Figure,context:FigureContext):MotionPlan {
 const next=context.next;
 if(f.kind!=='petronella'||f.exit!=='ring'||next?.kind!=='balance'||next.beats!==4||!['partner','neighbor'].includes(next.who??'')||next.hands!==undefined)throw new Error('A ring-to-pair handoff requires a complete ring petronella followed by an explicit four-count named pair balance.');
 assertFigureArgumentsConsumed(next);
 const relation=resolveBoundFigureRelation(context,next.who as 'partner'|'neighbor'),plan=compilePetronellaFigure(f as PetronellaFigure,context);
 for(const id of context.ids){const a=plan.position(id,1),b=plan.position(relation.get(id)!,1);if(Math.abs(a.x-b.x)>1e-6||Math.abs(Math.abs(a.z-b.z)-1.1)>1e-6)throw new Error('A petronella-to-pair handoff requires the named pair at adjacent compact sideline corners.');}
 return Object.freeze({...plan,contacts(t:number,poses:Pose[]){const release=1-ease((t*4-3.5)/.5);return plan.contacts(t,poses).map(c=>({...c,strength:c.strength*release})).filter(c=>c.strength>0);}});
}

/** Complete the already compiled swing in the exact same cyclic corner order,
 * opening the named pair into the four-hand ring during its last two counts.
 * The spin/release phase is schematic; it uses the original source interval. */
export function prepareSwingRingExit(f:Figure,context:FigureContext,plan:MotionPlan):MotionPlan {
 f=structuredClone(f);
 assertFigureArgumentsConsumed(f);
 const next=context.next;
 if(f.kind!=='swing'||!['partner','neighbor'].includes(f.who??'')||f.beats<4||f.exit!==undefined||f.progression||next?.kind!=='ring-balance'||next.beats!==4||next.who!=='all'||next.hands!=='both'||next.exit!==undefined)throw new Error('A swing-to-ring handoff requires a named, nonprogressing swing and a following unmodified four-hand ring balance.');
 resolveBoundFigureRelation(context,f.who as 'partner'|'neighbor');
 const ids=[...context.ids],end=structuredClone(context.start),center={x:ids.reduce((n,id)=>n+plan.position(id,1).x,0)/4,z:ids.reduce((n,id)=>n+plan.position(id,1).z,0)/4},targetYaw=new Map<number,number>();
 const seen=new Set<string>();
 for(const id of ids){const p=plan.position(id,1),sx=Math.sign(p.x-center.x),sz=Math.sign(p.z-center.z);if(!sx||!sz||seen.has(`${sx}:${sz}`))throw new Error('A swing-to-ring exit needs four distinct canonical corners; it cannot invent a new permutation.');seen.add(`${sx}:${sz}`);end[id].position={x:center.x+sx*.55,z:center.z+sz*.55};end[id].yaw=heading(end[id].position,center);const natural=plan.facing(id,1,end);targetYaw.set(id,natural+turn(end[id].yaw,natural));}
 // Compiling the target ring verifies alternating named relationships, inward
 // facing, finite spacing and full-strength hand reach before any bridge exists.
 const ring=compileRingBalanceFigure(next,{...context,start:end,next:undefined}),amount=(t:number)=>ease((t*f.beats-(f.beats-2))/2);
 return Object.freeze({...plan,position(id:number,t:number){const a=plan.position(id,t),b=end[id].position,w=amount(t);return{x:a.x+(b.x-a.x)*w,z:a.z+(b.z-a.z)*w};},facing(id:number,t:number,poses:Pose[]){const a=plan.facing(id,t,poses);return a+(targetYaw.get(id)!-a)*amount(t);},contacts(t:number,poses:Pose[]){const release=1-ease((t*f.beats-(f.beats-.75))/.25),acquire=ease((t*f.beats-(f.beats-.5))/.5);return[...plan.contacts(t,poses).map(c=>({...c,strength:c.strength*release})),...ring.contacts(0,poses).map(c=>({...c,strength:c.strength*acquire}))].filter(c=>c.strength>0);}});
}
