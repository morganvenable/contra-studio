import {compileTerminalPetronellaFigure} from './terminal-petronella.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compilePetronella} from './petronella.ts';
import type {Figure} from './types.ts';
export interface PetronellaFigure extends Omit<Figure,'entry'|'exit'> {kind:'petronella';beats:4;who:'all';direction:'right';amount:.25;spinDirection:'right';spinAmount:.75;clap:'none';entry:'ring';exit:'ring'|'progressed-neighbors';}
export function compilePetronellaFigure(f:PetronellaFigure,context:FigureContext):MotionPlan {
 if(f.exit==='progressed-neighbors')return compileTerminalPetronellaFigure(f,context);
 assertFigureArgumentsConsumed(f as Figure);
 if(f.kind!=='petronella'||f.beats!==4||f.who!=='all'||f.direction!=='right'||f.amount!==.25||f.spinDirection!=='right'||f.spinAmount!==.75||f.clap!=='none'||f.entry!=='ring'||f.exit!=='ring'||f.phaseBeats!==undefined||f.confidence==='unsupported'||f.progression)throw new Error('Petronella requires the explicit four-count, one-station-right, clockwise three-quarter-spin, no-clap ring contract.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 const cyclicIds=[...ids].sort((a,b)=>Math.atan2(start[a].position.z-center.z,start[a].position.x-center.x)-Math.atan2(start[b].position.z-center.z,start[b].position.x-center.x)) as [number,number,number,number];
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const exit=new Map(cyclicIds.map((id,i)=>[id,{position:{...start[cyclicIds[(i+3)%4]].position},yaw:start[id].yaw-3*Math.PI/2,velocity:{x:0,z:0},yawRate:0}]));
 return compilePetronella({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,cyclicIds,beats:4,direction:'right',amount:.25,spinDirection:'right',spinAmount:.75,clap:'none',exitHands:context.next?.kind==='star'?'released':'ring'});
}
