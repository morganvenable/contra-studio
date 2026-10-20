/** A row-local square-through step. Admission is its actual incoming people,
 * roots, hands and clock; no title, source ID or whole-program signature. */
import type {Figure} from './types.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertSquareThroughFigure,type SquareThroughFigure} from './square-through-adapter.ts';
import {compileSquareThrough} from './square-through.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {captureSequenceBoundary,assertSequenceHandoff,ownSequenceBoundary,advanceSequenceBeat,type SequenceBoundary} from './sequence-boundary.ts';
import {heading} from './ring-twirl-contract.ts';

/** Each repeated balanced two-hand unit remains its own eight-count step.
 * A four-hand source row may supply two such units only through reviewed source
 * normalization, never by interpreting an unknown amount here. */
export function assertSquareThroughStepFigure(input:Figure):Figure {
 const f=capturePlainData(input);
 if(!['partners-facing-across','progressed-neighbors'].includes(f.exit??''))throw new Error('Square-through needs a proved partner-facing continuation or terminal progression exit.');
 assertSquareThroughFigure({...f,exit:'progressed-neighbors'} as SquareThroughFigure);
 if(f.exit==='partners-facing-across'&&f.progression===true)throw new Error('A continuing square-through cannot advance the relationship epoch.');
 return f;
}
export function compileSquareThroughStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):MotionPlan&{readonly entryState:SequenceBoundary;readonly exitState:SequenceBoundary;readonly gates:ReturnType<typeof compileSquareThrough>['gates']} {
 incoming=ownSequenceBoundary(incoming);
 const f=assertSquareThroughStepFigure(input),terminal=f.exit==='progressed-neighbors',next=context.next;
 if(terminal&&next!==undefined)throw new Error('A progressed-neighbor square exit requires the finite sequence boundary.');
 // A nonterminal unit promises its measured partner-facing endpoint. The
 // common sequencer, rather than an adjacency whitelist, admits its successor.
 const sourceBeat=incoming.sourceBeat;
 for(const count of[4,6,8])advanceSequenceBeat(sourceBeat,count);
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context;
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4},width=Math.abs(start[ids[0]].position.x-center.x);
 const entryHalfWidth: .55|.9=Math.abs(width-.55)<1e-7?.55:.9;
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const end=new Map(ids.map(id=>[id,{x:center.x-Math.sign(start[id].position.x-center.x)*.9,z:2*center.z-start[id].position.z}]));
 const exit=new Map(ids.map(id=>{const a=start[id].position,position=end.get(id)!;return[id,{position,yaw:terminal?heading(a,{x:a.x,z:position.z}):heading(position,end.get(partner.get(id)!)!),velocity:{x:0,z:0},yawRate:0}];}));
 const path=compileSquareThrough({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner:new Map(ids.map(id=>[id,partner.get(id)!])),neighbor:new Map(ids.map(id=>[id,neighbor.get(id)!]))},bindingEpoch:context.bindingEpoch,frame:{origin:center,axis:{x:0,z:1}},beats:8,phaseBeats:f.phaseBeats as readonly[4,2,2],passages:[{relation:'partner',hand:'right'},{relation:'neighbor',hand:'left'}],entryHalfWidth,exitFacing:terminal?'onward':'partner'});
 const first=sampleFormationEndpoint(context,path,0),last=sampleFormationEndpoint(context,path,1);
 const entryState=captureSequenceBoundary({...context,start:first},sourceBeat,path.contacts(0,first)),exitState=captureSequenceBoundary({...context,start:last},sourceBeat+8,path.contacts(1,last));
 assertSequenceHandoff(incoming,entryState);
 return Object.freeze({...path,entryState,exitState});
}
