import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileRingBalance} from './ring-balance.ts';
import {compileCaliforniaTwirl} from './california-twirl.ts';
import {heading} from './ring-twirl-contract.ts';
import type {Figure} from './types.ts';
export function compileRingBalanceFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='ring-balance'||f.beats!==4||f.who!=='all'||f.hands!=='both'||f.confidence==='unsupported'||f.progression||f.exit!==undefined&&f.exit!=='partner-california-twirl')throw new Error('Ring balance requires four beats, all four actors, both hands and a declared optional partner-twirl exit.');
 if(f.exit==='partner-california-twirl'&&(context.next?.kind!=='california-twirl'||context.next.who!=='partner'))throw new Error('The partner-twirl ring exit requires that exact following figure.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 // Match explicit physical corner slots to the already bound four identities.
 // Sorting the ring's cyclic slots cannot rebind a partner or neighbor.
 const cyclicIds=[...ids].sort((a,b)=>Math.atan2(start[a].position.z-center.z,start[a].position.x-center.x)-Math.atan2(start[b].position.z-center.z,start[b].position.x-center.x)) as [number,number,number,number];
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const exit=new Map(ids.map(id=>{const p=start[id],other=start[partner.get(id)!],pairCenter={x:(p.position.x+other.position.x)/2,z:(p.position.z+other.position.z)/2},twirl=f.exit==='partner-california-twirl';return[id,{position:twirl?{x:p.position.x,z:center.z+Math.sign(pairCenter.z-center.z)*.9}:{...p.position},yaw:twirl?heading(pairCenter,center):p.yaw,velocity:{x:0,z:0},yawRate:0}];}));
 return compileRingBalance({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,cyclicIds,beats:4,hands:'both',exitMode:f.exit==='partner-california-twirl'?'partner-california-twirl':'same-ring'});
}
export function compileCaliforniaTwirlFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.exit!==undefined||f.phaseBeats!==undefined||f.kind!=='california-twirl'||f.beats!==4||f.who!=='partner'||f.hands!=='right-left'||f.underRole!=='robin'||f.direction!=='right'||f.amount!==.5||f.entry!=='side-by-side-facing-same'||f.confidence==='unsupported')throw new Error('California twirl requires an explicit four-beat partner, right/left-hand, robin-under right half-turn from same-facing side-by-side slots.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,centerX=ids.reduce((s,id)=>s+start[id].position.x,0)/4;
 const paths=ids.filter(id=>dancers[id].role==='lark').map(overId=>{const underId=partner.get(overId)!,pair=[overId,underId],entry=new Map(pair.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}])),entrySlots=new Map(pair.map(id=>[id,{x:centerX+Math.sign(start[id].position.x-centerX)*.9,z:start[id].position.z}])),exit=new Map(pair.map(id=>[id,{position:{...entrySlots.get(partner.get(id)!)!},yaw:start[id].yaw+Math.PI,velocity:{x:0,z:0},yawRate:0}]));return compileCaliforniaTwirl({actors:pair.map(id=>dancers[id]),entry,entrySlots,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,overId,underId,overHand:'right',underHand:'left',beats:4,direction:'right',amount:.5});});
 const forActor=(id:number)=>{const p=paths.find(p=>p.overId===id||p.underId===id);if(!p)throw new Error('Actor is outside the bound California-twirl group.');return p;};
 return{position:(id,t)=>forActor(id).position(id,t),facing:(id,t)=>forActor(id).facing(id,t),arch:(id,t)=>forActor(id).arch(id,t),contacts:t=>paths.flatMap(p=>p.contacts(t))};
}
