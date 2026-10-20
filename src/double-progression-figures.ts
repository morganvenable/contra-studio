/** The two new physical contracts used by the first double-progression source.
 * The do-si-do owns all three half-passages. The arch owns its release back to
 * the literal sideline slots before the following complete right-hand star. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileArchExchange} from './arch-exchange.ts';
import {heading} from './ring-twirl-contract.ts';
import type {Figure} from './types.ts';

export function compileProgressingDoSiDoFigure(input:Figure,context:FigureContext):MotionPlan {
 const f=structuredClone(input);assertFigureArgumentsConsumed(f);
 if(f.kind!=='do-si-do'||f.who!=='neighbor'||f.direction!=='right'||f.amount!==1.5||f.beats!==10||f.progression!==true||f.confidence==='unsupported')throw new Error('The progressing do-si-do requires ten source counts, named current neighbors, right shoulders, and exactly one-and-a-half traversals.');
 const neighbors=new Map(resolveBoundFigureRelation(context,'neighbor')),start=structuredClone(context.start),ids=[...context.ids];
 for(const id of ids){const a=start[id].position,b=start[neighbors.get(id)!].position;if(Math.abs(a.x-b.x)>1e-6||Math.abs(Math.abs(a.z-b.z)-1.8)>1e-6)throw new Error('The progressing do-si-do requires current neighbors in the exact1.8-unit sideline slots.');}
 // Arc-length timing avoids accelerating the fixed-facing back-and-forth
 // traversal at its shoulder gates. It preserves the complete three half passes.
 const divisions=4096,lengths=[0];let length=0,last={x:0,z:-.9};for(let i=1;i<=divisions;i++){const phase=3*Math.PI*i/divisions,p={x:.45*Math.sin(phase),z:-.9*Math.cos(phase)};length+=Math.hypot(p.x-last.x,p.z-last.z);lengths.push(length);last=p;}
 const travelProgress=(raw:number):number=>{const t=Math.max(0,Math.min(1,raw)),r=.215,n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-travelProgress(1-t);return(t-r/2)/n;};
 const phaseAt=(t:number)=>{const target=travelProgress(t)*length;let lo=0,hi=divisions;while(lo+1<hi){const m=(lo+hi)>>1;if(lengths[m]<target)lo=m;else hi=m;}return 3*Math.PI*(lo+(target-lengths[lo])/(lengths[hi]-lengths[lo]))/divisions;};
 const position=(id:number,t:number)=>{if(!ids.includes(id)||!Number.isFinite(t))throw new Error('Do-si-do sampling requires a named bound actor and finite time.');const a=start[id].position,b=start[neighbors.get(id)!].position,v={x:b.x-a.x,z:b.z-a.z},length=Math.hypot(v.x,v.z),detour={x:v.z/length,z:-v.x/length},phase=phaseAt(t),forward=(1-Math.cos(phase))/2,side=.45*Math.sin(phase);return{x:a.x+v.x*forward+detour.x*side,z:a.z+v.z*forward+detour.z*side};};
 const facing=(id:number)=>heading(start[id].position,start[neighbors.get(id)!].position);
 return Object.freeze({position,facing,contacts:()=>[]});
}

export function compileArchToStarFigure(input:Figure,context:FigureContext):MotionPlan {
 const f=structuredClone(input);assertFigureArgumentsConsumed(f);
 if(f.kind!=='box-the-gnat'||f.beats!==4||f.who!=='neighbor'||f.hands!=='right'||f.underRole!=='robin'||f.progression||f.confidence==='unsupported'||context.next?.kind!=='star'||context.next.direction!=='right'||context.next.amount!==1||context.next.beats!==8)throw new Error('This explicit next-neighbor right-hand arch releases into a complete eight-count right-hand star.');
 const neighbors=new Map(resolveBoundFigureRelation(context,'neighbor')),start=structuredClone(context.start),dancers=structuredClone(context.dancers),ids=[...context.ids];
 const paths=ids.filter(id=>dancers[id].role==='lark').map(over=>{const under=neighbors.get(over)!,pair=[over,under],a=start[over],b=start[under],gap=Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),center={x:(a.position.x+b.position.x)/2,z:(a.position.z+b.position.z)/2};if(Math.abs(gap-1.10)>1e-6||Math.abs(a.position.x-b.position.x)>1e-6)throw new Error('The arch-to-star composition needs the exact reachable preceding right-hand balance stance.');
  const entry=pair.map(id=>({id:String(id),position:{...start[id].position},yaw:start[id].yaw})),exit=pair.map(id=>{const source=start[id];return{id:String(id),position:{x:center.x+(center.x-source.position.x)*1.8/gap,z:center.z+(center.z-source.position.z)*1.8/gap},yaw:source.yaw+Math.PI};});
  return compileArchExchange({entry,exit,overId:String(over),underId:String(under),hand:'right',beats:4});});
 const forActor=(id:number)=>{const path=paths.find(p=>p.overId===String(id)||p.underId===String(id));if(!path)throw new Error('Actor is outside the named arch-to-star group.');return path;},actor=(id:number,t:number)=>forActor(id).sample(t*4).poses.find(p=>p.id===String(id))!;
 return Object.freeze({position:(id:number,t:number)=>actor(id,t).position,facing:(id:number,t:number)=>actor(id,t).yaw,arch:(id:number,t:number)=>({underId:Number(forActor(id).underId),progress:actor(id,t).archProgress,kneeLowering:actor(id,t).kneeLowering,releaseRouting:'wide-exit' as const}),contacts:(t:number)=>paths.flatMap(p=>p.sample(t*4).contacts.map(c=>({...c,a:Number(c.a),b:Number(c.b),underId:Number(c.underId)})))});
}

/** Compact, reachable complete right-hand star. The source still owns eight
 * counts and one full revolution; gathering/releasing the hub is allocated
 * inside those counts and cannot append a progression translation. */
export function compileProgressingRightStarFigure(input:Figure,context:FigureContext,directions:readonly number[]):MotionPlan {
 const f=structuredClone(input);assertFigureArgumentsConsumed(f);
 if(f.kind!=='star'||f.who!=='all'||f.direction!=='right'||f.amount!==1||f.beats!==8||f.progression!==true||f.confidence==='unsupported'||f.starGrip!==undefined&&f.starGrip!=='hands-across')throw new Error('This completed progressing star requires eight counts, one right-hand revolution and the reviewed hands-across contact graph.');
 resolveBoundFigureRelation(context,'neighbor');resolveBoundFigureRelation(context,'partner');
 const ownedDirections=[...directions];if(context.ids.some(id=>![-1,1].includes(ownedDirections[context.dancers[id].couple])))throw new Error('The full star requires the explicit outgoing direction of every persistent couple.');
 const ids=[...context.ids],start=structuredClone(context.start),dancers=structuredClone(context.dancers),center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 const smooth=(raw:number)=>{const t=Math.max(0,Math.min(1,raw));return t*t*(3-2*t);};
 const angularProgress=(raw:number):number=>{const t=Math.max(0,Math.min(1,raw)),r=.18,n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-angularProgress(1-t);return(t-r/2)/n;};
 const position=(id:number,t:number)=>{if(!ids.includes(id)||!Number.isFinite(t))throw new Error('The star requires a named actor and finite time.');const a=start[id].position,v={x:a.x-center.x,z:a.z-center.z},radius=Math.hypot(v.x,v.z),gather=Math.min(smooth(t/.235),smooth((1-t)/.235)),scale=1+(.63/radius-1)*gather,theta=2*Math.PI*angularProgress(t);return{x:center.x+scale*(v.x*Math.cos(theta)-v.z*Math.sin(theta)),z:center.z+scale*(v.x*Math.sin(theta)+v.z*Math.cos(theta))};};
 const facing=(id:number,t:number)=>{const p=position(id,t),tangent=heading(p,{x:p.x-(p.z-center.z),z:p.z+(p.x-center.x)}),target=ownedDirections[dancers[id].couple]===1?0:Math.PI,amount=smooth((t-.8)/.2);return tangent+Math.atan2(Math.sin(target-tangent),Math.cos(target-tangent))*amount;};
 const strength=(t:number)=>smooth((t-.20)/.05)*smooth((.80-t)/.05),order=[...ids].sort((a,b)=>Math.atan2(start[a].position.z-center.z,start[a].position.x-center.x)-Math.atan2(start[b].position.z-center.z,start[b].position.x-center.x));
 return Object.freeze({position,facing,contacts:(t:number)=>strength(t)<=0?[]:order.slice(0,2).map((a,i)=>({a,b:order[i+2],handA:'right' as const,handB:'right' as const,point:{...center,y:1.34},strength:strength(t),kind:'joined' as const,target:'hands' as const}))});
}
