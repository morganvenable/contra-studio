/** Explicit terminal square-through-two adapter. It owns balance, the two
 * ordered named hand passages and their transitions; it never rebinds people.
 * Only the finite formation compiler may advance the epoch after the exit. */
import type {Figure} from './types.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileSquareThrough,assertSquareThroughTiming} from './square-through.ts';
import {captureFormationState,assertSuccessorEntry,type FormationState} from './formation-handoff.ts';
import {heading} from './ring-twirl-contract.ts';

/** Kept local while the shared schema is staged. These fields have exactly one
 * interpretation; additional hands, passages and turns are not admitted. */
export type SquareThroughFigure=Omit<Figure,'kind'>&{kind:'square-through'};
export function assertSquareThroughFigure(f:SquareThroughFigure):void {
 const allowed=['id','kind','beats','label','notes','confidence','progression','who','amount','hands','entry','exit','phaseBeats'];
 if(!f||typeof f!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(f)))throw new Error('Square-through must be a plain figure record.');
 for(const key of Reflect.ownKeys(f)){const d=Object.getOwnPropertyDescriptor(f,key)!;if(typeof key!=='string'||!allowed.includes(key)||!d.enumerable||!('value'in d))throw new Error('Square-through cannot ignore additional hands, participants, turns or hidden declarations.');}
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate','unsupported'].includes(f.confidence)||!Number.isFinite(f.beats))throw new Error('Square-through requires nonempty text identity and label, optional text notes, recognized confidence and finite counts.');
 if(f.kind!=='square-through'||f.who!=='all'||f.amount!==2||f.hands!=='right-left'||f.entry!=='partners-facing-across'||f.exit!=='progressed-neighbors'||f.beats!==8||f.confidence==='unsupported'||f.progression!==undefined&&typeof f.progression!=='boolean')throw new Error('The bounded square-through requires eight counts, two partner-right/current-neighbor-left passages, partner-facing-across entry and explicit progressed-neighbor exit.');
 assertSquareThroughTiming(f.phaseBeats);
}
/** Run against the original declaration before the ordinary finite compiler
 * clears its working markers. A source event cannot be invented by geometry. */
export function assertSquareThroughComposition(figures:readonly (Figure|SquareThroughFigure)[]):void {
 const found=figures.map((f,i)=>({f,i})).filter(({f})=>f.kind==='square-through');
 if(found.length!==1)throw new Error('This square-through composition requires exactly one explicit terminal square-through-two.');
 const{f,i}=found[0];assertSquareThroughFigure(f as SquareThroughFigure);const previous=figures[i-1];
 const opening=figures[0],arch=figures[1];
 if(i!==figures.length-1||f.progression!==true||figures.filter(f=>f.progression===true).length!==1||previous?.kind!=='long-lines'||previous.who!=='all'||previous.beats!==8||figures.reduce((n,f)=>n+f.beats,0)!==64||opening?.kind!=='balance'||opening.who!=='neighbor'||opening.hands!=='right'||opening.beats!==4||arch?.kind!=='box-the-gnat'||arch.who!=='neighbor'||arch.hands!=='right'||arch.underRole!=='robin'||arch.beats!==4)throw new Error('Balanced square-through-two requires the sole source-marked final eight-count event after eight-count long lines in a complete 64-count improper sequence returning to neighbor right-hand balance4 and box-the-gnat4.');
}
/** The declared terminal passage owns the old-neighbor left gate at count7.
 * Prepare the next opening during the final .75 count, after that gate. Hand
 * acquisition remains the stance layer's later release-safe operation. */
export function squareThroughPreparationBeats(f:Pick<Figure,'kind'>|SquareThroughFigure):.75|undefined {
 if(f.kind!=='square-through')return;
 assertSquareThroughFigure({...f,...((f as Figure).exit==='partners-facing-across'?{exit:'progressed-neighbors' as const}:{})} as SquareThroughFigure);return .75;
}
export function compileSquareThroughFigure(f:SquareThroughFigure,context:FigureContext,sourceBeat=0):MotionPlan&{readonly formations:readonly FormationState[];readonly gates:ReturnType<typeof compileSquareThrough>['gates']} {
 assertSquareThroughFigure(f);
 if(context.next!==undefined)throw new Error('This square-through adapter requires the explicitly declared terminal exit.');
 if(!Number.isFinite(sourceBeat)||sourceBeat<0||[4,6,8].some(delta=>!Number.isFinite(sourceBeat+delta)||(sourceBeat+delta)-sourceBeat!==delta))throw new Error('Square-through requires a valid source clock.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context;
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const exit=new Map(ids.map(id=>{const a=start[id].position,position={x:2*center.x-a.x,z:2*center.z-a.z};return[id,{position,yaw:heading(a,{x:a.x,z:position.z}),velocity:{x:0,z:0},yawRate:0}];}));
 const path=compileSquareThrough({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner:new Map(ids.map(id=>[id,partner.get(id)!])),neighbor:new Map(ids.map(id=>[id,neighbor.get(id)!]))},bindingEpoch:context.bindingEpoch,frame:{origin:center,axis:{x:0,z:1}},beats:8,phaseBeats:f.phaseBeats as readonly[4,2,2],passages:[{relation:'partner',hand:'right'},{relation:'neighbor',hand:'left'}]});
 const formations:FormationState[]=[];
 for(const[beat,map,width]of[[0,path.entry,.9],[4,path.balanceEnd,.55],[6,path.firstPassEnd,.55],[8,path.exit,.9]]as const){
  const poses=structuredClone(start);for(const id of ids){const p=map.get(id)!;poses[id].position={...p.position};poses[id].yaw=p.yaw;}
  // Keep a fixed physical station order (west north/south, east north/south),
  // recording the actual changing occupant IDs after each named exchange.
  const orderedIds=[...ids].sort((a,b)=>Math.sign(poses[a].position.x-center.x)-Math.sign(poses[b].position.x-center.x)||poses[a].position.z-poses[b].position.z);
  const state=captureFormationState({...context,start:poses},{sourceBeat:sourceBeat+beat,orderedIds,geometry:{kind:'paired-sidelines',sidePair:'neighbor',origin:center,halfWidth:width,pairGap:1.8},heldContacts:path.contacts(beat/8,poses)});
  // Independently declared endpoint constraints must equal the actual motion
  // at each ownership boundary, including clock, epoch, roots and held hands.
  const boundaryPlan:MotionPlan={position:id=>path.position(id,beat/8),facing:id=>path.facing(id,beat/8),contacts:(_t,poses)=>path.contacts(beat/8,poses)};
  assertSuccessorEntry(state,context,boundaryPlan);formations.push(state);
 }
 return Object.freeze({...path,formations:Object.freeze(formations)});
}
