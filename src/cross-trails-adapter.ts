import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileCrossTrails,type CrossTrailsPassage} from './cross-trails.ts';
import {heading} from './ring-twirl-contract.ts';
import type {Figure} from './types.ts';

/** Current-neighbor binding and both named passages stay fixed for all eight
 * counts. Terminal finite-line rebinding belongs to the formation compiler. */
export function compileCrossTrailsFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='cross-trails'||f.beats!==8||f.who!=='all'||f.entry!=='partners-facing-across'||f.exit!=='progressed-neighbors'||f.confidence==='unsupported'||context.next!==undefined)throw new Error('Cross trails requires the explicit terminal eight-count partner-across/current-neighbor-along contract.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context;
 const center={x:ids.reduce((sum,id)=>sum+start[id].position.x,0)/4,z:ids.reduce((sum,id)=>sum+start[id].position.z,0)/4};
 if(ids.some(id=>Math.abs(Math.abs(start[id].position.x-center.x)-.9)>1e-7||Math.abs(Math.abs(start[id].position.z-center.z)-.9)>1e-7))throw new Error('This improper cross-trails adapter requires exact standard longways corners.');
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const exit=new Map(ids.map(id=>{const a=start[id].position,position={x:2*center.x-a.x,z:2*center.z-a.z};return[id,{position,yaw:heading(a,{x:a.x,z:position.z}),velocity:{x:0,z:0},yawRate:0}];}));
 return compileCrossTrails({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,frame:{origin:center,axis:{x:0,z:1}},beats:8,phaseBeats:f.phaseBeats as readonly [4,4],passages:f.passages as readonly[CrossTrailsPassage,CrossTrailsPassage]});
}
