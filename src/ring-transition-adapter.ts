/** Explicit ring exits compose the four-hand balance with a named closed frame.
 * The original ring completes its inward/outward weight change before the final
 * count opens the frame. No actor identity or relationship epoch changes here. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileRingBalanceFigure} from './ring-california-adapter.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {ease,heading,turn} from './ring-twirl-contract.ts';
import type {Figure,Pose} from './types.ts';
export function compileRingTransitionFigure(f:Figure,context:FigureContext):MotionPlan {
 f=structuredClone(f);context={...context,ids:[...context.ids],start:structuredClone(context.start),dancers:structuredClone(context.dancers),next:context.next?structuredClone(context.next):undefined,relations:{epoch:context.relations.epoch,partner:new Map(context.relations.partner),neighbor:new Map(context.relations.neighbor)}};
 if(!['partner-swing','neighbor-swing'].includes(f.exit??''))return compileRingBalanceFigure(f,context);
 assertFigureArgumentsConsumed(f);
 const relation=f.exit==='partner-swing'?'partner':'neighbor';
 if(f.kind!=='ring-balance'||f.beats!==4||f.who!=='all'||f.hands!=='both'||f.progression||f.confidence==='unsupported'||context.next?.kind!=='swing'||context.next.who!==relation||context.next.beats<4)throw new Error('An explicit ring-to-swing exit requires that exact named following swing and four ring counts.');
 const centerX=context.ids.reduce((sum,id)=>sum+context.start[id].position.x,0)/4,pairs=resolveBoundFigureRelation(context,relation),ring=compileRingBalanceFigure({...f,exit:undefined},context),end=structuredClone(context.start),directions=context.dancers.filter(d=>d.role==='lark').map(d=>d.direction);
 for(const id of context.ids){const a=context.start[id].position,b=context.start[pairs.get(id)!].position,c={x:(a.x+b.x)/2,z:(a.z+b.z)/2},gap=Math.hypot(a.x-b.x,a.z-b.z);if(gap<1.09||gap>1.11)throw new Error('A ring-to-swing exit requires the named pair to occupy adjacent compact ring corners.');const destinationCenter={x:centerX+Math.sign(c.x-centerX)*.9,z:c.z};if(Math.abs(c.x-centerX)<.5)throw new Error('Ring-to-swing currently requires the named pair along one sideline.');end[id].position={x:destinationCenter.x+(a.x-c.x)*.62/gap,z:destinationCenter.z+(a.z-c.z)*.62/gap};end[id].yaw=heading(end[id].position,destinationCenter)+Math.PI/3;}
 const held=structuredClone(end);for(const id of context.ids){const p=end[id].position,other=end[pairs.get(id)!].position,c={x:(p.x+other.x)/2,z:(p.z+other.z)/2};held[id].position={x:c.x+(p.x-c.x)*1.18/.62,z:c.z+(p.z-c.z)*1.18/.62};held[id].yaw=heading(held[id].position,c);}
 const transfer=compilePrimitiveFigure({id:'ring-frame-transfer',kind:'balance',label:'Ring frame transfer',beats:4,who:relation},context.ids,held,context.dancers,directions,{balanceExit:'same-person-swing'}),amount=(t:number)=>ease((t*4-2.75)/1.25);
 const position=(id:number,t:number)=>{const a=ring.position(id,t),b=end[id].position,q=amount(t);return{x:a.x+(b.x-a.x)*q,z:a.z+(b.z-a.z)*q};};
 const facing=(id:number,t:number,poses:Pose[])=>{const a=ring.facing(id,t,poses);return a+turn(end[id].yaw,a)*amount(t);};
 return Object.freeze({position,facing,balance:(id:number,t:number)=>({...ring.balance!(id,t)!,handRoute:'released-ring-to-swing' as const}),contacts(t:number,poses:Pose[]){const q=amount(t),release=1-ease((t*4-3)/.35),acquire=ease((q-.90)/.10);return[...ring.contacts(t,poses).map(c=>({...c,strength:c.strength*release})),...transfer.contacts(.8125+.1875*ease((q-.45)/.55),poses).map(c=>({...c,strength:c.strength*acquire}))].filter(c=>c.strength>0);}});
}
