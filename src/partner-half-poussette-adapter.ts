import {compilePartnerHalfPoussette} from './partner-half-poussette.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,HandContact,Role} from './types.ts';
/** Staged independently of the global Figure schema until source/runtime review. */
export type PartnerHalfPoussetteFigure=Omit<Figure,'kind'|'entry'|'exit'> & {
 kind:'half-poussette';who:'partner';beats:8;amount:.5;hands:'both';pullRole:Role;pullDirection:'back-left'|'back-right';
 facing:'fixed-room';phaseBeats:readonly[6,2];entry:'partners-facing-across';exit:'neighbor-swing';
};
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function compilePartnerHalfPoussetteFigure(raw:PartnerHalfPoussetteFigure,context:FigureContext):MotionPlan {
 const f=structuredClone(raw);context={...context,ids:[...context.ids],start:structuredClone(context.start),dancers:structuredClone(context.dancers),next:context.next?structuredClone(context.next):undefined,relations:{epoch:context.relations.epoch,partner:new Map(context.relations.partner),neighbor:new Map(context.relations.neighbor)}};
 const allowed=new Set(['id','kind','beats','label','notes','confidence','progression','who','amount','hands','pullRole','pullDirection','facing','phaseBeats','entry','exit']);
 if(Object.keys(f).some(k=>!allowed.has(k)&&f[k as keyof PartnerHalfPoussetteFigure]!==undefined)||f.kind!=='half-poussette'||f.beats!==8||f.who!=='partner'||f.amount!==.5||f.hands!=='both'||f.facing!=='fixed-room'||f.entry!=='partners-facing-across'||f.exit!=='neighbor-swing'||f.progression!==undefined&&f.progression!==false||f.confidence==='unsupported')throw new Error('Partner half poussette requires its explicit eight-count fixed-facing partner-hold and neighbor-swing contract.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers,next}=context;
 if(next?.kind!=='swing'||next.who!=='neighbor'||next.beats<4)throw new Error('The declared half-poussette exit must lead immediately into the same current neighbors’ swing.');
 const center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4},entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const exit=new Map(ids.map(id=>{const x=Math.sign(start[id].position.x-center.x)*.9,z=-Math.sign(start[id].position.z-center.z)*.31;return[id,{position:{x:center.x+x,z:center.z+z},yaw:Math.atan2(0,-z)+Math.PI/3,velocity:{x:0,z:0},yawRate:0}];}));
 const pairs=ids.filter(id=>dancers[id].role===f.pullRole).map(pullerId=>({pullerId,pusherId:partner.get(pullerId)!,relationship:'partner' as const}));
 const plan=compilePartnerHalfPoussette({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,pairs,beats:8,amount:.5,hands:'both',pullRole:f.pullRole,pullDirection:f.pullDirection,facing:f.facing,phaseBeats:f.phaseBeats,exitKind:f.exit,frame:{origin:center,across:{x:1,z:0}},source:f.notes});
 const terminal=start.map(p=>({...p,position:{...p.position}}));for(const id of ids){terminal[id].position=plan.position(id,1);terminal[id].yaw=plan.facing(id,1);}
 const swing=compilePrimitiveFigure(next,ids,terminal,dancers,dancers.filter(d=>d.role==='lark').map(d=>d.direction),{swingEntry:'prepared-circle'});
 const preparation=(t:number):HandContact[]=>{const poses=start.map(p=>({...p,position:{...p.position}}));for(const id of ids){poses[id].position=plan.position(id,t);poses[id].yaw=plan.facing(id,t);}return swing.contacts(0,poses);};
 return Object.freeze({position:plan.position,facing:plan.facing,contacts:plan.contacts,swingPreparation:(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Actor is outside the bound partner half poussette.');const strength=smooth((t*8-7)/1);return strength>0?{contacts:preparation(t),strength}:undefined;}});
}
