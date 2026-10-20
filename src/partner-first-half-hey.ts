/** Separately gated partner-first ordinary half-hey composition. The source names
 * partners on the sides, not a starting role. Later roles are read from explicit
 * physical slot adjacency after each pass. The capability is independently gated. */
import {compileBasicPassEvents,parseHeyNotation,type HeyEventPlan} from './hey.ts';
import {compilePartialHey,type PartialHeyTrajectory} from './partial-hey.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {compileGyreFigure,type GyreFigure} from './gyre-adapter.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {captureFormationState,sampleFormationEndpoint,assertSuccessorEntry,type FormationState} from './formation-handoff.ts';
import type {Figure,HandContact,Vec2} from './types.ts';

/** Narrow the shared Figure declaration to the explicit side-first contract. */
export type PartnerFirstHalfHeyFigure=Figure&{
 kind:'hey';who:'partner';amount:.5;beats:8;heyStartPair:'partner';heyStartRole?:never;
 centerShoulder:'left';endShoulder:'right';entry:'paired-sidelines';
 exit:'opposite-paired-balance'|'opposite-paired-gyre';
};
export interface PartnerFirstHalfHeyPlan extends MotionPlan {
 readonly graph:HeyEventPlan;readonly heyPlan:PartialHeyTrajectory;
 readonly entryState:FormationState;readonly exitState:FormationState;
}
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const allowed=new Set(['id','kind','beats','label','notes','confidence','progression','who','amount','entry','exit','heyStartPair','centerShoulder','endShoulder']);
/** Validate raw declarations before ownership cloning can erase their meaning. */
function assertRawFigureData(input:unknown):void {
 if(!input||typeof input!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw new Error('A partner-first hey or successor declaration must be a plain data record.');
 for(const key of Reflect.ownKeys(input)){const d=Object.getOwnPropertyDescriptor(input,key)!;if(typeof key!=='string'||!d.enumerable||!('value'in d))throw new Error('Symbol, hidden or accessor figure declarations cannot be erased by ownership cloning.');}
 const f=input as Record<string,unknown>;
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate','unsupported'].includes(f.confidence as string)||typeof f.beats!=='number'||!Number.isFinite(f.beats)||f.beats<=0||f.beats>64)throw new Error('Figure metadata and source counts must be explicit, finite and well-formed.');
}

export function assertPartnerFirstHalfHeyDeclaration(input:unknown):asserts input is PartnerFirstHalfHeyFigure {
 assertRawFigureData(input);
 for(const key of Reflect.ownKeys(input as object))if(typeof key!=='string'||!allowed.has(key))throw new Error('The partner-first half hey contains an unconsumed declaration.');
 const f=input as Partial<PartnerFirstHalfHeyFigure>;
 if(f.kind!=='hey'||f.who!=='partner'||f.beats!==8||f.amount!==.5||f.heyStartPair!=='partner'||f.centerShoulder!=='left'||f.endShoulder!=='right'||f.entry!=='paired-sidelines'||!['opposite-paired-balance','opposite-paired-gyre'].includes(f.exit??'')||f.confidence==='unsupported'||f.progression!==undefined&&f.progression!==false)throw new Error('This pilot requires an unprogressed eight-count partner-first half hey, rights on ends and lefts in center, with an explicit opposite-paired balance or gyre exit.');
}
export function compilePartnerFirstHalfHeyHandoff(input:PartnerFirstHalfHeyFigure,incoming:FigureContext,sourceBeat=0,heldContacts:readonly HandContact[]=[]):PartnerFirstHalfHeyPlan {
 assertPartnerFirstHalfHeyDeclaration(input);
 if(incoming.next){assertRawFigureData(incoming.next);assertFigureArgumentsConsumed(incoming.next);}
 const f=structuredClone(input),context:FigureContext={...incoming,ids:[...incoming.ids],start:structuredClone(incoming.start),dancers:structuredClone(incoming.dancers),next:incoming.next?structuredClone(incoming.next):undefined,relations:{epoch:incoming.relations.epoch,partner:new Map(incoming.relations.partner),neighbor:new Map(incoming.relations.neighbor)}};
 const {ids,start,dancers,next}=context,partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor');
 if(next?.who!=='partner'||next.confidence==='unsupported'||next.progression||f.exit==='opposite-paired-balance'&&(next.kind!=='balance'||next.beats!==4)||f.exit==='opposite-paired-gyre'&&(next.kind!=='gyre'||next.beats!==4||next.passingShoulder!=='right'||next.amount!==1))throw new Error('The half-hey endpoint requires its explicit same-partner four-count balance or right-shoulder once-around gyre successor.');
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const west=ids.filter(id=>start[id].position.x<center.x).sort((a,b)=>start[a].position.z-start[b].position.z),east=ids.filter(id=>start[id].position.x>center.x).sort((a,b)=>start[a].position.z-start[b].position.z);
 if(west.length!==2||east.length!==2)throw new Error('The partner-first hey requires two explicit actors on each sideline.');
 for(const side of[west,east]){const[a,b]=side;if(partner.get(a)!==b||dancers[a].role===dancers[b].role||Math.abs(start[a].position.x-start[b].position.x)>1e-7||Math.abs(Math.abs(start[a].position.x-center.x)-.9)>1e-7||Math.abs((start[a].position.z+start[b].position.z)/2-center.z)>1e-7||gap(start[a].position,start[b].position)<1.05||gap(start[a].position,start[b].position)>1.801)throw new Error('Incoming side-pairs must already be the bound persistent partners in the declared geometric profile.');}
 // A right-shoulder side pass puts the west/east lower station first in each
 // ordered pair. Role and identity do not choose the ordering. Then every next
 // actor pair is obtained solely by the declared side/center swap permutation.
 const entryOrder=[...west,...east];
 const geometry={kind:'paired-sidelines' as const,sidePair:'partner' as const,origin:center,halfWidth:.9,pairGap:gap(start[west[0]].position,start[west[1]].position)};
 const entryState=captureFormationState(context,{sourceBeat,orderedIds:entryOrder,geometry,heldContacts});
 if(entryState.heldContacts.length)throw new Error('The hand-free first pass requires the predecessor to release its held contacts before this exact boundary.');
 const tokens:string[]=[];let order=[...entryOrder];
 for(let phase=0;phase<4;phase++){
  const sides=phase%2===0,pairs=sides?[[order[0],order[1]],[order[2],order[3]]]:[[order[1],order[2]]];
  const names=pairs.map(([a,b])=>sides?partner.get(a)===b?'P':neighbor.get(a)===b?'N':undefined:dancers[a].role===dancers[b].role?dancers[a].role==='lark'?'M':'W':undefined);
  if(!names[0]||names.some(n=>n!==names[0]))throw new Error('The later center/side pass does not resolve from explicit adjacency and bound relationships.');
  tokens.push(names[0]+(sides?'R':'L'));
  if(sides){[order[0],order[1]]=[order[1],order[0]];[order[2],order[3]]=[order[3],order[2]];}else [order[1],order[2]]=[order[2],order[1]];
 }
 const actors=ids.map(id=>({id:String(id),role:dancers[id].role,couple:String(dancers[id].couple)})),graph=compileBasicPassEvents(parseHeyNotation(`(8) Hey 1/2 (${tokens.join(';')})`),actors,entryOrder.map(String));
 if(graph.events[0].phase!=='sides'||graph.events[0].token.selector!=='partner'||graph.events.length!==4||graph.events.reduce((n,e)=>n+e.pairs.length,0)!==6||graph.needsPartialExit||graph.endOrder?.some((id,i)=>id!==String(entryOrder[3-i])))throw new Error('The half hey must prove all six named encounters and its exact reversed slot permutation.');
 const desiredGap=f.exit==='opposite-paired-balance'?1.18:1.1;
 const end=new Map(graph.endOrder!.map((id,slot)=>[Number(id),{x:start[entryOrder[slot]].position.x,z:center.z+Math.sign(start[entryOrder[slot]].position.z-center.z)*desiredGap/2}]));
 const entry=new Map(ids.map(id=>[String(id),{position:{...start[id].position},velocity:{x:0,z:0},yaw:start[id].yaw}]));
 const exit=new Map(ids.map(id=>[String(id),{position:end.get(id)!,velocity:{x:0,z:0},yaw:heading(end.get(id)!,end.get(partner.get(id)!)!)}]));
 const named=(m:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(m.get(id)!)]));
 const heyPlan=compilePartialHey({actors,events:graph.events,entry,exit,frame:{origin:center,axis:{x:1,z:0}},beats:8,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:[1.25,35/12,55/12,6.25],slotSpacing:.7,passClearance:.66,maximumSpeed:1.3,maximumYawRate:4,relationships:{partner:named(partner),neighbor:named(neighbor)},source:f.label});
 const pose=(id:number,t:number)=>{const p=heyPlan.sample(t*8).poses.find(p=>p.id===String(id));if(!p)throw new Error('Actor outside the bound partner-first half hey.');return p;};
 const basic:MotionPlan={position:(id,t)=>pose(id,t).position,facing:(id,t)=>pose(id,t).yaw,contacts:()=>[]},terminal=sampleFormationEndpoint(context,basic,1);
 const exitState=captureFormationState({...context,start:terminal},{sourceBeat:sourceBeat+8,orderedIds:graph.endOrder!.map(Number),geometry:{...geometry,pairGap:desiredGap}});
 const successor=f.exit==='opposite-paired-gyre'?compileGyreFigure(next as GyreFigure,{...context,start:terminal,next:undefined}):compilePrimitiveFigure(next!,ids,terminal,dancers,dancers.filter(d=>d?.role==='lark').map(d=>d.direction));
 assertSuccessorEntry(exitState,{...context,start:terminal},successor);
 return Object.freeze({...basic,graph:freeze(graph),heyPlan,entryState,exitState});
}
