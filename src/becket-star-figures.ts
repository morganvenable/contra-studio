/** Source-time transition contracts for a counterclockwise Becket star family.
 * These paths change no source hand, identity endpoint or figure duration. */
import {compilePrimitiveFigure,figureContinuity,smooth} from './engine.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,HandContact,Pose} from './types.ts';
const heading=(a:{x:number;z:number},b:{x:number;z:number})=>Math.atan2(b.x-a.x,b.z-a.z);
function reachable(contacts:HandContact[],poses:Pose[]):HandContact[]{return contacts.map(c=>{const reach=(id:number,hand:'left'|'right')=>{const p=poses[id],side=hand==='left'?1:-1;return Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+side*.235*Math.sin(p.yaw));},distance=Math.max(reach(c.a,c.handA),c.target&&c.target!=='hands'?0:reach(c.b,c.handB));return{...c,strength:c.strength*smooth((.65-distance)/.04)};}).filter(c=>c.strength>.01);}
/** The incoming larks complete their actual one-and-a-half allemande while all
 * four prepare the named neighbor balance facing inside its final source count. */
export function compileAllemandeToNeighborBalance(figure:Figure,context:FigureContext,directions:number[],figures:Figure[],index:number):MotionPlan{
 const original=compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,directions,figureContinuity(figures,index)),neighbors=new Map(resolveBoundFigureRelation(context,'neighbor'));
 if(figure.kind!=='allemande'||figure.who!=='larks'||figure.direction!=='left'||figure.amount!==1.5||figure.beats!==8||context.next?.kind!=='balance'||context.next.who!=='neighbor')throw new Error('This facing preparation consumes an eight-count lark left allemande one-and-a-half into the current neighbor balance.');
 return Object.freeze({...original,facing:(id:number,t:number,poses:Pose[])=>{const at=original.facing(id,t,poses),target=heading(original.position(id,1),original.position(neighbors.get(id)!,1)),weight=smooth((t-.875)/.125);return at+Math.atan2(Math.sin(target-at),Math.cos(target-at))*weight;},contacts:(t:number,poses:Pose[])=>reachable(original.contacts(t,poses),poses)});
}
/** Complete right-shoulder do-si-do with a .45-unit side lane. The ordinary
 * .34 lane grazes articulated upper arms in this new-neighbor composition. */
export function compileSpaciousNeighborDoSiDo(figure:Figure,context:FigureContext,directions:number[],figures:Figure[],index:number):MotionPlan{
 const original=compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,directions,figureContinuity(figures,index)),neighbors=new Map(resolveBoundFigureRelation(context,'neighbor')),start=structuredClone(context.start),ids=[...context.ids];
 if(figure.kind!=='do-si-do'||figure.who!=='neighbor'||figure.direction!=='right'||figure.amount!==1||figure.beats!==8)throw new Error('This wider path preserves a complete eight-count right-shoulder neighbor do-si-do.');
 for(const id of ids){const a=start[id].position,b=start[neighbors.get(id)!].position;if(Math.abs(a.x-b.x)>1e-6||Math.abs(Math.abs(a.z-b.z)-1.8)>1e-6)throw new Error('The new-neighbor do-si-do needs exact named 1.8-unit sideline endpoints.');}
 return Object.freeze({...original,position:(id:number,t:number)=>{if(!ids.includes(id)||!Number.isFinite(t))throw new Error('The do-si-do requires a named actor and finite time.');const a=start[id].position,b=start[neighbors.get(id)!].position,v={x:b.x-a.x,z:b.z-a.z},length=Math.hypot(v.x,v.z),phase=t*2*Math.PI,forward=(1-Math.cos(phase))/2,side=.45*Math.sin(phase);return{x:a.x+v.x*forward+v.z/length*side,z:a.z+v.z*forward-v.x/length*side};}});
}
/** Full LEFT-hand star with its own signed tangent and left-hand contact graph.
 * Its compact hub is gathered and released inside eight counts. The final
 * source corner is unchanged, so topology can never manufacture translation. */
export function compileProgressingLeftStar(figure:Figure,context:FigureContext,directions:readonly number[]):MotionPlan{
 // Validate every modifier through the existing strict primitive boundary,
 // then use the explicit source-counted compact path below.
 compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,[...directions]);
 if(figure.kind!=='star'||figure.who!=='all'||figure.direction!=='left'||figure.amount!==1||figure.beats!==8||figure.progression!==true||figure.starGrip!==undefined&&figure.starGrip!=='hands-across')throw new Error('This progressing star requires one complete eight-count left-hand revolution and the reviewed hands-across contact graph.');
 resolveBoundFigureRelation(context,'neighbor');resolveBoundFigureRelation(context,'partner');
 const ids=[...context.ids],start=structuredClone(context.start),dancers=structuredClone(context.dancers),owned=[...directions],center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 if(ids.some(id=>![-1,1].includes(owned[dancers[id].couple])))throw new Error('The star requires the explicit outgoing direction of every persistent couple.');
 const angularProgress=(raw:number):number=>{const t=Math.max(0,Math.min(1,raw)),r=.18,n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-angularProgress(1-t);return(t-r/2)/n;};
 const position=(id:number,t:number)=>{if(!ids.includes(id)||!Number.isFinite(t))throw new Error('The star requires a named actor and finite time.');const a=start[id].position,v={x:a.x-center.x,z:a.z-center.z},radius=Math.hypot(v.x,v.z),gather=Math.min(smooth(t/.235),smooth((1-t)/.235)),scale=1+(.63/radius-1)*gather,theta=-2*Math.PI*angularProgress(t);return{x:center.x+scale*(v.x*Math.cos(theta)-v.z*Math.sin(theta)),z:center.z+scale*(v.x*Math.sin(theta)+v.z*Math.cos(theta))};};
 const facing=(id:number,t:number)=>{const p=position(id,t),tangent=heading(p,{x:p.x+(p.z-center.z),z:p.z-(p.x-center.x)}),target=owned[dancers[id].couple]===1?0:Math.PI,amount=smooth((t-.8)/.2);return tangent+Math.atan2(Math.sin(target-tangent),Math.cos(target-tangent))*amount;};
 const strength=(t:number)=>smooth((t-.20)/.05)*smooth((.80-t)/.05),order=[...ids].sort((a,b)=>Math.atan2(start[a].position.z-center.z,start[a].position.x-center.x)-Math.atan2(start[b].position.z-center.z,start[b].position.x-center.x));
 return Object.freeze({position,facing,contacts:(t:number)=>strength(t)<=0?[]:order.slice(0,2).map((a,i)=>({a,b:order[i+2],handA:'left' as const,handB:'left' as const,point:{...center,y:1.34},strength:strength(t),kind:'joined' as const,target:'hands' as const}))});
}
