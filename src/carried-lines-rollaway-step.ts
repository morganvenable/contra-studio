import type {Figure} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compileLongLinesRollawayFigure,type LongLinesRollawayFigure} from './long-lines-rollaway-adapter.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const ease=(q:number)=>{q=Math.max(0,Math.min(1,q));return q*q*q*(10+q*(-15+6*q));};
/** Roots and named pairs are carried unchanged into the existing return solver.
 * Only heading acquisition overlaps the first 1.5 advance counts; new hands
 * acquire after that turn, and the old epoch remains throughout. */
export function compileCarriedLinesRollawayStep(figure:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan{
 figure=capturePlainData(figure) as Figure;
 const boundary=ownSequenceBoundary(incoming);if(boundary.heldContacts.length)throw Error('The forward/return rollaway requires released entry hands.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const center={x:boundary.poses.reduce((v,p)=>v+p.position.x,0)/4,z:boundary.poses.reduce((v,p)=>v+p.position.z,0)/4},relation=new Map(boundary[figure.rollRelation==='partner'?'partner':'neighbor']),initial=new Map(boundary.poses.map(p=>[p.id,p]));
 const prepared=context.start.map(p=>({...p,position:{...p.position}}));
 let acquiring=false;
 for(const p of boundary.poses){const other=initial.get(relation.get(p.id)!)!,x=(p.position.x+other.position.x)/2,z=(p.position.z+other.position.z)/2,yaw=Math.atan2(center.x-x,center.z-z);if(Math.abs(turn(yaw,p.yaw))>Math.PI/2+1e-7)throw Error('Forward/return entry facing exceeds its quarter-turn acquisition envelope.');prepared[p.id].yaw=yaw;acquiring||=Math.abs(turn(yaw,p.yaw))>1e-7;}
 const kernel=compileLongLinesRollawayFigure(figure as LongLinesRollawayFigure,{...context,start:prepared});
 const plan:MotionPlan={position:(id,t)=>kernel.position(id,t),facing:(id,t,poses)=>{const yaw=kernel.facing(id,t,poses),start=initial.get(id);if(!start)throw Error('Actor is outside the carried forward/return group.');return t*8<1.5?start.yaw+turn(prepared[id].yaw,start.yaw)*ease(t*8/1.5):yaw;},contacts:(t,poses)=>{const factor=acquiring?ease((t*8-1.5)/.75):1;return kernel.contacts(t,poses).map(c=>({...c,strength:c.strength*factor})).filter(c=>c.strength>.001);}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,8),1);assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState});
}
