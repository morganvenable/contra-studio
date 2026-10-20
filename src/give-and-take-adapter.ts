import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileGiveAndTake} from './give-and-take.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,HandContact,Role} from './types.ts';
export type GiveAndTakeFigure=Omit<Figure,'kind'|'entry'|'exit'> & {kind:'give-and-take';who:'partner'|'neighbor';takeRole:Role;phaseBeats:readonly [4,4];entry:'side-couples';exit:'same-person-swing';hands:'both';approachHold:'joined-inside'};
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function compileGiveAndTakeFigure(f:GiveAndTakeFigure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f as Figure);
 f=structuredClone(f);context={...context,ids:[...context.ids],start:structuredClone(context.start),dancers:structuredClone(context.dancers),next:context.next?structuredClone(context.next):undefined,relations:{epoch:context.relations.epoch,partner:new Map(context.relations.partner),neighbor:new Map(context.relations.neighbor)}};
 const allowed=new Set(['id','kind','beats','label','notes','confidence','progression','who','takeRole','phaseBeats','entry','exit','hands','approachHold']);
 if(Object.keys(f).some(k=>!allowed.has(k)&&f[k as keyof GiveAndTakeFigure]!==undefined)||f.kind!=='give-and-take'||f.beats!==8||!['partner','neighbor'].includes(f.who)||!['lark','robin'].includes(f.takeRole)||f.progression||f.confidence==='unsupported'||f.entry!=='side-couples'||f.exit!=='same-person-swing'||f.hands!=='both'||f.approachHold!=='joined-inside')throw new Error('Give-and-take needs the explicit eight-count connected approach, taking role, current relationship and immediate same-person swing contract.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers,next}=context,received=f.who==='partner'?partner:neighbor;
 if(next?.kind!=='swing'||next.who!==f.who)throw new Error('The give-and-take exit requires an immediate swing with exactly the named received person.');
 const center={x:ids.reduce((sum,id)=>sum+start[id].position.x,0)/4,z:ids.reduce((sum,id)=>sum+start[id].position.z,0)/4},pairs=ids.filter(id=>dancers[id].role===f.takeRole).map(takerId=>({takerId,takenId:received.get(takerId)!,relationship:f.who}));
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}])),exit=new Map(ids.map(id=>{const pair=pairs.find(p=>p.takerId===id||p.takenId===id)!,side=Math.sign(start[pair.takerId].position.x-center.x),z=(dancers[id].role==='lark'?side:-side)*.31;return[id,{position:{x:center.x+side*.9,z:center.z+z},yaw:Math.atan2(0,-z)+Math.PI/3,velocity:{x:0,z:0},yawRate:0}];}));
 const plan=compileGiveAndTake({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,pairs,takeRole:f.takeRole,beats:8,phaseBeats:f.phaseBeats,approachHold:f.approachHold,hands:f.hands,exitKind:f.exit,frame:{origin:center,across:{x:1,z:0}},source:f.notes});
 const terminal=start.map(p=>({...p,position:{...p.position}}));for(const id of ids){terminal[id].position=plan.position(id,1);terminal[id].yaw=plan.facing(id,1);}
 const directions=dancers.filter(d=>d.role==='lark').map(d=>d.direction),swing=compilePrimitiveFigure(next,ids,terminal,dancers,directions,{swingEntry:'prepared-circle'});
 const preparation=(t:number):HandContact[]=>{const poses=start.map(p=>({...p,position:{...p.position}}));for(const id of ids){poses[id].position=plan.position(id,t);poses[id].yaw=plan.facing(id,t);}return swing.contacts(0,poses);};
 return Object.freeze({position:plan.position,facing:plan.facing,contacts:plan.contacts,swingPreparation:(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Swing preparation actor is outside the bound give-and-take.');const strength=smooth((t*8-6.65)/1.35);return strength>0?{contacts:preparation(t),strength}:undefined;}});
}
