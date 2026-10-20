/** Explicit short-wave half-allemande and swing handoffs. Source time stays in
 * its own figures: the two-count turns finish literal exchanged wave slots;
 * the following swing closes its frame while already rotating from count one. */
import {compileWaveAllemande,validateWaveGraph,type WaveGraph,type WaveConstraint,type WavePlan} from './wave-figures.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compilePrimitiveFigure} from './engine.ts';
import type {Figure,HandContact,Pose,Role,Vec2} from './types.ts';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(t:number)=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
const constraint=(p:Pose):WaveConstraint=>({position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0});
export interface WaveTransitionContext extends FigureContext {wave?:WaveGraph;}
export interface WaveHalfAllemandeFigure {id:string;label:string;kind:'allemande';beats:2;who:'partner'|'neighbor'|'robins'|'larks';direction:'right'|'left';amount:.5;entry:'short-wave';exit:'short-wave'|'partner-swing';confidence?:'verified'|'approximate'|'unsupported';notes?:string;}
export interface WavePartnerSwingFigure {id:string;label:string;kind:'swing';beats:12;who:'partner';entry:'short-wave-partners';confidence?:'verified'|'approximate'|'unsupported';notes?:string;}
const allowed=(f:object,keys:string[])=>{for(const key of Object.keys(f))if(!keys.includes(key)&&(f as any)[key]!==undefined)throw new Error(`The wave transition does not consume “${key}”.`);};
/** Exact physical slots plus current role/relation bindings select this graph.
 * Sorting/proximity is never used to identify the receiving person. */
export function conventionalShortWaveGraph(context:FigureContext,sideRelation:'partner'|'neighbor',centerRole?:Role):WaveGraph{
 const side=resolveBoundFigureRelation(context,sideRelation),{ids,start,dancers}=context,origin={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4},order=[-1.5,-.5,.5,1.5].map(x=>{const match=ids.filter(id=>Math.hypot(start[id].position.x-origin.x-x,start[id].position.z-origin.z)<1e-6);if(match.length!==1)throw new Error('A reviewed short-wave transition needs exact ordered unit-spaced slots.');return match[0];});
 if(centerRole&&order.slice(1,3).some(id=>dancers[id].role!==centerRole)||dancers[order[1]].role!==dancers[order[2]].role)throw new Error('The source center-role declaration contradicts the short-wave identities.');for(const[a,b]of[[order[0],order[1]],[order[2],order[3]]])if(side.get(a)!==b)throw new Error('The wave end hand contradicts its current side relation.');const graph={lines:[{order,axis:{x:1,z:0}}],hands:order.slice(0,3).map((a,i)=>({a,b:order[i+1],handA:i===1?'left' as const:'right' as const,handB:i===1?'left' as const:'right' as const}))};return validateWaveGraph(graph,new Map(ids.map(id=>[id,constraint(start[id])])),ids);
}
function checkCurrentWave(context:WaveTransitionContext,expected:WaveGraph){
 if(!context.wave)return;
 const actual=validateWaveGraph(context.wave,new Map(context.ids.map(id=>[id,constraint(context.start[id])])),context.ids);
 if(actual.lines.length!==1||actual.lines[0].order.some((id,i)=>id!==expected.lines[0].order[i])||actual.hands.some(h=>!expected.hands.some(e=>e.a===h.a&&e.b===h.b&&e.handA===h.handA&&e.handB===h.handB)))throw new Error('The explicit current wave state contradicts this transition entry.');
}
export function compileWaveHalfAllemandeFigure(f:WaveHalfAllemandeFigure,context:WaveTransitionContext):WavePlan{
 allowed(f,['id','label','kind','beats','who','direction','amount','entry','exit','confidence','notes']);if(f.kind!=='allemande'||f.beats!==2||f.amount!==.5||f.entry!=='short-wave'||f.confidence==='unsupported')throw new Error('Short-wave allemandes require an explicit two-count half-turn.');
 const paired=['partner','neighbor'].includes(f.who);if(paired?(f.direction!=='right'||f.exit!=='short-wave'):(f.direction!=='left'||!['larks','robins'].includes(f.who)||f.exit!=='partner-swing'))throw new Error('This wave transition distinguishes paired RH halves from center-role LH halves into partner swing.');
 const graph=conventionalShortWaveGraph(context,paired?f.who as 'partner'|'neighbor':'neighbor',paired?undefined:f.who==='larks'?'lark':'robin'),order=graph.lines[0].order,pairs:readonly (readonly [number,number])[]=paired?[[order[0],order[1]],[order[2],order[3]]]:[[order[1],order[2]]],entry=new Map(context.ids.map(id=>[id,constraint(context.start[id])])),active=new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]])),exit=new Map(context.ids.map(id=>{const p=entry.get(id)!,other=active.get(id);return[id,{...p,position:{...(other===undefined?p.position:entry.get(other)!.position)},yaw:p.yaw+(other===undefined?0:paired?-Math.PI:Math.PI)}];})),outOrder=order.map(id=>active.get(id)??id),exitWave={lines:[{order:outOrder,axis:{x:1,z:0}}],hands:outOrder.slice(0,3).map((a,i)=>({a,b:outOrder[i+1],handA:i===1?'left' as const:'right' as const,handB:i===1?'left' as const:'right' as const}))};
 checkCurrentWave(context,graph);
 if(!paired){const partners=resolveBoundFigureRelation(context,'partner');if(partners.get(outOrder[0])!==outOrder[1]||partners.get(outOrder[2])!==outOrder[3])throw new Error('The center half-turn must actually produce the declared partner-side swing entrance.');}
 return compileWaveAllemande({actorIds:context.ids,entry,exit,beats:2,mode:paired?'paired-right-half':'centers-left-half',entryWave:graph,exitWave,pairs});
}
/** A continuous twelve-count swing starts turning on the first count from its
 * actual horizontal wave-side partner frame. Center/radius preparation happens
 * during that rotation, never in a separate pre-swing gather or extra counts. */
export function compileWavePartnerSwingFigure(f:WavePartnerSwingFigure,context:WaveTransitionContext):MotionPlan{
 allowed(f,['id','label','kind','beats','who','entry','confidence','notes']);if(f.kind!=='swing'||f.beats!==12||f.who!=='partner'||f.entry!=='short-wave-partners'||f.confidence==='unsupported')throw new Error('The short-wave partner swing requires an explicit twelve-count source figure.');
 const graph=conventionalShortWaveGraph(context,'partner','robin'),partner=resolveBoundFigureRelation(context,'partner'),{ids,dancers}=context,start=context.start.map(p=>({...p,position:{...p.position}})),center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4},prepared=start.map(p=>({...p,position:{...p.position}})),pairData=new Map<number,{center:Vec2;targetCenter:Vec2;theta:number;radius:number;side:number}>();
 checkCurrentWave(context,graph);
 for(const a of ids.filter(id=>dancers[id].role==='lark')){const b=partner.get(a)!,c={x:(start[a].position.x+start[b].position.x)/2,z:center.z},side=Math.sign(c.x-center.x),targetCenter={x:center.x+side*.9,z:center.z};for(const id of[a,b]){const radial={x:start[id].position.x-c.x,z:start[id].position.z-c.z},theta=Math.atan2(radial.z,radial.x),p={x:targetCenter.x+.31*Math.cos(theta+Math.PI/2),z:targetCenter.z+.31*Math.sin(theta+Math.PI/2)};prepared[id]={...prepared[id],position:p,yaw:heading(p,targetCenter)+Math.PI/3};pairData.set(id,{center:c,targetCenter,theta,radius:Math.hypot(radial.x,radial.z),side});}}
 const directions=dancers.filter(d=>d.role==='lark').map(d=>d.direction),swingFigure:Figure={id:f.id,label:f.label,kind:'swing',beats:12,who:'partner'},framePlan=compilePrimitiveFigure(swingFigure,ids,prepared,dancers,directions,{swingEntry:'prepared-circle'}),net=4.5*Math.PI;
 const local=(t:number)=>{if(!Number.isFinite(t))throw new Error('Wave-swing progress must be finite.');return clamp(t);};
 const clock=(t:number)=>{const a=.15/12,b=2.5/12,n=1-(a+b)/2;if(t<a){const u=t/a;return a*(u*u*u-.5*u*u*u*u)/n;}if(t>1-b){const u=(1-t)/b;return 1-b*(u*u*u-.5*u*u*u*u)/n;}return(t-a/2)/n;};
 const position=(id:number,t:number)=>{t=local(t);const p=pairData.get(id);if(!p)throw new Error('Actor is outside this wave swing.');const gather=ease(t*12/1.5),release=ease((t-.82)/.18),radius=p.radius+(.31-p.radius)*gather+(.9-.31)*release,theta=p.theta+net*clock(t);return{x:p.center.x+(p.targetCenter.x-p.center.x)*gather+radius*Math.cos(theta),z:p.center.z+(p.targetCenter.z-p.center.z)*gather+radius*Math.sin(theta)};};
 const facing=(id:number,t:number,_poses:Pose[])=>{t=local(t);const p=pairData.get(id);if(!p)throw new Error('Actor is outside this wave swing.');const yaw=start[id].yaw-net*clock(t)-Math.PI/6*ease(t*12/1.5),naturalEnd=start[id].yaw-net-Math.PI/6,exitBase=p.side>0?-Math.PI/2:Math.PI/2;return yaw+wrap(exitBase-naturalEnd)*ease((t-.84)/.16);};
 const contacts=(t:number,poses:Pose[]):HandContact[]=>{t=local(t);const beat=t*12,byId=new Map(poses.map(p=>[p.id,p])),old=beat<.2?graph.hands.map(h=>{const a=byId.get(h.a)!,b=byId.get(h.b)!;return{...h,point:{x:(a.position.x+b.position.x)/2,y:1.28,z:(a.position.z+b.position.z)/2},strength:1-ease(beat/.2),kind:'joined' as const};}):[];return[...old,...(beat>.2?framePlan.contacts(t,poses).map(h=>({...h,strength:h.strength*ease((beat-.2)/1.3)})):[])];};
 return{position,facing,contacts};
}
