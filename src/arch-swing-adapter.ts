/** A right-hand arch with an explicitly bound immediate same-person swing.
 * The source still owns four arch counts: three for the complete conventional
 * exchange, then one for closing and preparing the swing frame in the exchanged
 * slots. No swing count is borrowed, and no new relation is inferred.
 * A20mm outward pair-center bow preserves the exact local arch/hand geometry
 * while clearing opposing knees; it returns to the literal slots before pickup. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileArchExchange} from './arch-exchange.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,HandContact,Pose} from './types.ts';
const clamp=(t:number)=>Math.max(0,Math.min(1,t));
const smooth=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
const heading=(a:{x:number;z:number},b:{x:number;z:number})=>Math.atan2(b.x-a.x,b.z-a.z);
export function compileArchSwingFigure(input:Figure,raw:FigureContext):MotionPlan {
 const f=structuredClone(input),context={...raw,ids:[...raw.ids],start:structuredClone(raw.start),dancers:structuredClone(raw.dancers),next:raw.next?structuredClone(raw.next):undefined,relations:{epoch:raw.relations.epoch,partner:new Map(raw.relations.partner),neighbor:new Map(raw.relations.neighbor)}};
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='box-the-gnat'||f.beats!==4||f.hands!=='right'||f.underRole!=='robin'||!['partner','neighbor'].includes(f.who??'')||f.progression||f.confidence==='unsupported')throw new Error('An arch-to-swing needs four source counts, right hands, the robin under, and an explicit current paired relation.');
 if(f.direction!==undefined||f.amount!==undefined||f.notation!==undefined||f.entry!==undefined||f.exit!==undefined)throw new Error('The arch-to-swing does not consume extra turn, path, or endpoint modifiers.');
 const {ids,start,dancers,next}=context;
 if(next?.kind!=='swing'||next.who!==f.who||!Number.isFinite(next.beats)||next.beats<4||next.confidence==='unsupported')throw new Error('The arch-to-swing requires an immediate swing with exactly the same bound person.');
 assertFigureArgumentsConsumed(next);
 if(next.entry!==undefined||next.exit!==undefined&&next.exit!=='face-down-line')throw new Error('The arch-to-swing only prepares an ordinary same-person swing entry and its supported ordinary or down-line exit.');
 const relation=new Map(resolveBoundFigureRelation(context,f.who as 'partner'|'neighbor'));
 const setCenter={x:ids.reduce((sum,id)=>sum+start[id].position.x,0)/4,z:ids.reduce((sum,id)=>sum+start[id].position.z,0)/4};
 const paths=ids.filter(id=>dancers[id].role==='lark').map(over=>{
  const under=relation.get(over)!,A=start[over],B=start[under],gap=Math.hypot(A.position.x-B.position.x,A.position.z-B.position.z),center={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2};
  if(Math.abs(A.position.x-B.position.x)>1e-6||Math.abs(center.z-setCenter.z)>1e-6||Math.abs(Math.abs(center.x-setCenter.x)-.9)>1e-6)throw new Error('The arch-to-swing requires both bound pairs in opposite longways sidelines with a common set-center row.');
  if(Math.abs(gap-1.10)>1e-6)throw new Error('The arch-to-swing needs the preceding exact reachable1.10-unit right-hand stance.');
  const entry=[over,under].map(id=>({id:String(id),position:{...start[id].position},yaw:start[id].yaw}));
  const exit=entry.map(p=>({id:p.id,position:{x:2*center.x-p.position.x,z:2*center.z-p.position.z},yaw:heading(p.id===String(over)?B.position:A.position,center)}));
  return{center,side:Math.sign(center.x-setCenter.x),path:compileArchExchange({entry,exit,overId:String(over),underId:String(under),hand:'right',beats:3})};
 });
 const forActor=(id:number)=>{const found=paths.find(p=>p.path.overId===String(id)||p.path.underId===String(id));if(!found)throw new Error('The sampled actor is outside the bound arch-to-swing.');return found;};
 const sample=(id:number,t:number)=>{if(!Number.isFinite(t))throw new Error('Arch-to-swing sample time must be finite.');const {path,center,side}=forActor(id),beat=clamp(t)*4,p=path.sample(Math.min(3,beat)).poses.find(p=>p.id===String(id))!,preparation=smooth(beat-3),scale=1+(.31/.55-1)*preparation;return{...p,position:{x:center.x+(p.position.x-center.x)*scale+side*.02*Math.sin(Math.PI*p.archProgress)**2,z:center.z+(p.position.z-center.z)*scale},yaw:p.yaw+Math.PI/3*preparation};};
 const position=(id:number,t:number)=>sample(id,t).position,facing=(id:number,t:number)=>sample(id,t).yaw;
 const posesAt=(t:number):Pose[]=>{const poses=structuredClone(start);for(const id of ids){poses[id].position=position(id,t);poses[id].yaw=facing(id,t);}return poses;};
 const swing=compilePrimitiveFigure(next,ids,posesAt(1),dancers,dancers.filter(d=>d.role==='lark').map(d=>d.direction),{swingEntry:'prepared-circle'});
 const virtual=(t:number):HandContact[]=>swing.contacts(0,posesAt(t));
 return Object.freeze({position,facing,
  arch:(id:number,t:number)=>{const p=sample(id,t);return{underId:Number(forActor(id).path.underId),progress:p.archProgress,kneeLowering:p.kneeLowering};},
  swingPreparation:(id:number,t:number)=>{forActor(id);const strength=smooth(clamp(t)*4-3);return strength>0?{contacts:virtual(t),strength}:undefined;},
  contacts:(t:number)=>clamp(t)*4<=3?paths.flatMap(({path,side})=>{const frame=path.sample(clamp(t)*4),offset=side*.02*Math.sin(Math.PI*frame.poses[0].archProgress)**2;return frame.contacts.map(c=>({...c,point:{...c.point,x:c.point.x+offset},a:Number(c.a),b:Number(c.b),underId:Number(c.underId)}));}):virtual(t).map(c=>({...c,strength:c.strength*smooth((clamp(t)*4-3.65)/.35)})).filter(c=>c.strength>.01)
 });
}
