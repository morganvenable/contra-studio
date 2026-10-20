import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileRingPass} from './ring-pass.ts';
import {heading,type TurnConstraint} from './ring-twirl-contract.ts';
import type {Figure} from './types.ts';
/** Optional destinations are supplied only by an endpoint-validating formation
 * compiler. The ordinary terminal adapter uses the exact exchanged logical rows. */
export function compileRingPassFigure(f:Figure,context:FigureContext,destination?:ReadonlyMap<number,TurnConstraint>):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='pass-through'||f.beats!==4||f.who!=='neighbor'||f.passingShoulder!=='right'||f.entry!=='ring'||f.exit!=='progressed-neighbors'||f.confidence==='unsupported'||context.next!==undefined)throw new Error('Ring pass-through requires an explicit terminal four-count current-neighbor right-shoulder pass from a ring to progressed neighbors.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 const cyclicIds=[...ids].sort((a,b)=>Math.atan2(start[a].position.z-center.z,start[a].position.x-center.x)-Math.atan2(start[b].position.z-center.z,start[b].position.x-center.x)) as [number,number,number,number];
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const exit=destination??new Map(ids.map(id=>{const p=start[id].position,position={x:center.x+Math.sign(p.x-center.x)*.9,z:center.z-Math.sign(p.z-center.z)*.9};return[id,{position,yaw:heading(p,{x:p.x,z:position.z}),velocity:{x:0,z:0},yawRate:0}];}));
 return compileRingPass({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,cyclicIds,frame:{origin:center,axis:{x:0,z:1}},beats:4,relation:'neighbor',passingShoulder:'right'});
}
