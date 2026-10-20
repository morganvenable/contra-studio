/** Bind a hand-free shoulder round to current partners, neighbors, or a named role.
 * The optional same-person swing prepares inside the gyre's existing final beat.
 */
import {compileGyre,type GyreRelation} from './gyre.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,HandContact,Pose} from './types.ts';
export type GyreFigure=Omit<Figure,'kind'|'who'|'passingShoulder'|'amount'>&{kind:'gyre';who:GyreRelation;passingShoulder:'left'|'right';amount:number};
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const heading=(a:{x:number;z:number},b:{x:number;z:number})=>Math.atan2(b.x-a.x,b.z-a.z);
export function compileGyreFigure(f:GyreFigure,context:FigureContext):MotionPlan {
 // Own every captured value: direct callers may edit their figure/context after
 // compilation, and deterministic scrubbing must retain its original meaning.
 f=structuredClone(f);
 context={...context,ids:[...context.ids],start:structuredClone(context.start),dancers:structuredClone(context.dancers),next:context.next?structuredClone(context.next):undefined,relations:{epoch:context.relations.epoch,partner:new Map(context.relations.partner),neighbor:new Map(context.relations.neighbor)}};
 const allowed=new Set(['id','kind','beats','label','notes','confidence','progression','who','passingShoulder','amount']);
 for(const key of Object.keys(f))if(!allowed.has(key)&&f[key as keyof GyreFigure]!==undefined)throw new Error(`gyre does not consume the “${key}” modifier.`);
 if(f.kind!=='gyre'||f.confidence==='unsupported'||f.progression||!['partner','neighbor','larks','robins'].includes(f.who)||!['left','right'].includes(f.passingShoulder)||!Number.isFinite(f.amount))throw new Error('A gyre needs an explicit supported relation, shoulder, amount and duration without undeclared progression.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers,next}=context;
 const pairs=f.who==='partner'||f.who==='neighbor'?ids.filter(id=>id<(f.who==='partner'?partner:neighbor).get(id)!).map(a=>({a,b:(f.who==='partner'?partner:neighbor).get(a)!,relationship:f.who})):(()=>{const found=ids.filter(id=>dancers[id].role===(f.who==='larks'?'lark':'robin'));if(found.length!==2)throw new Error('A same-role gyre must identify exactly two actors.');return[{a:found[0],b:found[1],relationship:f.who}];})();
 const swingExit=next?.kind==='swing'&&next.who===f.who;
 if(swingExit&&!['partner','neighbor'].includes(f.who))throw new Error('The following swing needs an explicit opposite-role pair.');
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}])),exit=new Map(ids.map(id=>[id,structuredClone(entry.get(id)!)]));
 const theta=2*Math.PI*f.amount*(f.passingShoulder==='right'?1:-1);
 for(const{a,b}of pairs){const A=start[a].position,B=start[b].position,c={x:(A.x+B.x)/2,z:(A.z+B.z)/2};for(const id of[a,b]){const p=start[id].position,v={x:p.x-c.x,z:p.z-c.z},scale=swingExit?.31/Math.hypot(v.x,v.z):1,position={x:c.x+(v.x*Math.cos(theta)-v.z*Math.sin(theta))*scale,z:c.z+(v.x*Math.sin(theta)+v.z*Math.cos(theta))*scale};exit.set(id,{position,yaw:heading(position,c)+(swingExit?Math.PI/3:0),velocity:{x:0,z:0},yawRate:0});}}
 const gyre=compileGyre({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,pairs,passingShoulder:f.passingShoulder,amount:f.amount,beats:f.beats,source:f.notes});
 if(!swingExit)return gyre;
 const terminal=start.map(p=>({...p,position:{...p.position}}));for(const id of ids){terminal[id].position=gyre.position(id,1);terminal[id].yaw=gyre.facing(id,1);}
 const directions=dancers.filter(d=>d.role==='lark').map(d=>d.direction),swing=compilePrimitiveFigure(next!,ids,terminal,dancers,directions,{swingEntry:'prepared-circle'});
 const virtual=(t:number):HandContact[]=>{const poses=start.map(p=>({...p,position:{...p.position}}));for(const id of ids){poses[id].position=gyre.position(id,t);poses[id].yaw=gyre.facing(id,t);}return swing.contacts(0,poses);};
 return Object.freeze({position:gyre.position,facing:gyre.facing,contacts:()=>[],swingPreparation:(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Swing preparation actor is outside the bound gyre.');const strength=smooth((t*f.beats-(f.beats-1)));return strength>0?{contacts:virtual(t),strength}:undefined;}});
}
