/** Explicit six-count complete neighbor do-si-do, then two-count held-ring
 * acquisition. The full return precedes any gathering; the following balance
 * receives its actual inward-facing roots and all four hands at count zero. */
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileRingBalanceFigure} from './ring-california-adapter.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure,Pose,Vec2} from './types.ts';
const EPS=1e-7,ease=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z),gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
export function assertDosidoRingFigure(input:Figure):Figure{
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(f.kind!=='do-si-do'||f.who!=='neighbor'||f.direction!=='right'||f.amount!==1||f.beats!==8||f.exit!=='ring'||JSON.stringify(f.phaseBeats)!=='[6,2]'||f.progression||f.preparation!==undefined||f.confidence==='unsupported')throw Error('Do-si-do ring preparation requires a complete right-shoulder neighbor return in six counts then two ring-acquisition counts, within eight nonprogressing source counts.');
 return f;
}
export interface DosidoRingPlan extends SequencedMotionPlan{
 readonly gates:readonly {kind:'right-shoulder'|'back-to-back'|'left-shoulder'|'full-return';sourceBeat:number;poses:readonly {id:number;position:Vec2;yaw:number}[]}[];
 readonly maximumObservedSpeed:number;readonly minimumObservedClearance:number;
}
export function compileDosidoRingStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):DosidoRingPlan&{ownsEntryFacing:true}{
 const f=assertDosidoRingFigure(input),boundary=ownSequenceBoundary(incoming);
 context={...context,ids:[...context.ids],start:structuredClone(context.start),dancers:structuredClone(context.dancers),next:context.next?structuredClone(context.next):undefined,relations:{epoch:context.relations.epoch,partner:new Map(context.relations.partner),neighbor:new Map(context.relations.neighbor)}};
 if(boundary.heldContacts.length||context.next?.kind!=='ring-balance'||context.next.beats!==4||context.next.who!=='all'||context.next.hands!=='both')throw Error('Do-si-do ring preparation requires released incoming hands and the immediately declared four-count ring balance.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const start=new Map(boundary.poses.map(p=>[p.id,p])),neighbors=new Map(boundary.neighbor),ids=context.ids,center={x:boundary.poses.reduce((n,p)=>n+p.position.x/4,0),z:boundary.poses.reduce((n,p)=>n+p.position.z/4,0)};
 const w=Math.abs(boundary.poses[0].position.x-center.x),d=Math.abs(boundary.poses[0].position.z-center.z);
 if(ids.length!==4||w<.65-EPS||w>1.2+EPS||d<.55-EPS||d>1.1+EPS||boundary.poses.some(p=>Math.abs(Math.abs(p.position.x-center.x)-w)>EPS||Math.abs(Math.abs(p.position.z-center.z)-d)>EPS)||new Set(boundary.poses.map(p=>`${Math.sign(p.position.x-center.x)},${Math.sign(p.position.z-center.z)}`)).size!==4)throw Error('Do-si-do ring preparation requires four actual rectangular corners in the measured envelope.');
 const pairData=new Map(ids.map(id=>{const p=start.get(id)!,other=start.get(neighbors.get(id)!);if(!other||Math.abs(p.position.x-other.position.x)>EPS&&Math.abs(p.position.z-other.position.z)>EPS)throw Error('Named neighbors must occupy actual adjacent stations.');const length=gap(p.position,other.position),forward={x:(other.position.x-p.position.x)/length,z:(other.position.z-p.position.z)/length};return[id,{other:other.position,forward,yaw:heading(p.position,other.position)}];}));
 const end=new Map(ids.map(id=>{const p=start.get(id)!;const position={x:center.x+Math.sign(p.position.x-center.x)*.55,z:center.z+Math.sign(p.position.z-center.z)*.55};return[id,{position,yaw:heading(position,center)}];}));
 const clock=(t:number)=>{if(!Number.isFinite(t))throw Error('Do-si-do ring sample time must be finite.');return Math.max(0,Math.min(1,t))*8;};
 const position=(id:number,t:number):Vec2=>{const p=start.get(id),data=pairData.get(id);if(!p||!data)throw Error('Actor outside bound do-si-do ring.');const beat=clock(t);if(beat>=6){const u=ease((beat-6)/2),target=end.get(id)!.position;return{x:p.position.x+(target.x-p.position.x)*u,z:p.position.z+(target.z-p.position.z)*u};}const angle=2*Math.PI*ease(beat/6),advance=(1-Math.cos(angle))/2,side=.34*Math.sin(angle);return{x:p.position.x+(data.other.x-p.position.x)*advance+data.forward.z*side,z:p.position.z+(data.other.z-p.position.z)*advance-data.forward.x*side};};
 const facing=(id:number,t:number)=>{const p=start.get(id),data=pairData.get(id);if(!p||!data)throw Error('Actor outside bound do-si-do ring.');const beat=clock(t),yaw=p.yaw+turn(data.yaw,p.yaw);return beat<6?p.yaw+turn(data.yaw,p.yaw)*ease(beat):yaw+turn(end.get(id)!.yaw,yaw)*ease((beat-6)/2);};
 const arrival=context.start.map(p=>end.has(p.id)?{...p,...end.get(p.id)!}:p),ring=compileRingBalanceFigure(context.next,{...context,start:arrival,next:undefined});
 const plan={position,facing,ownsEntryFacing:true as const,contacts(t:number,poses:Pose[]){const beat=clock(t);if(beat<=6)return[];return ring.contacts(0,poses).map(h=>{const reach=Math.max(...([[h.a,h.handA],[h.b,h.handB]] as const).map(([id,hand])=>{const p=poses[id],side=hand==='left'?1:-1;return Math.hypot(h.point.x-p.position.x-side*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+side*.235*Math.sin(p.yaw));}));return{...h,strength:h.strength*ease(beat-7)*ease((.68-reach)/.06)};}).filter(h=>h.strength>0);}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,8),1);assertSequenceHandoff(boundary,entryState);assertSequenceHandoff(exitState,captureSequenceBoundary({...context,start:arrival},exitState.sourceBeat,ring.contacts(0,arrival)));
 const unEase=(v:number)=>{if(v<=0)return 0;if(v>=1)return 1;let a=0,b=1;for(let k=0;k<50;k++){const m=(a+b)/2;if(ease(m)<v)a=m;else b=m;}return(a+b)/2;};
 const gates=([['right-shoulder',.25],['back-to-back',.5],['left-shoulder',.75],['full-return',1]] as const).map(([kind,q])=>{const beat=6*unEase(q);return{kind,sourceBeat:boundary.sourceBeat+beat,poses:ids.map(id=>({id,position:position(id,beat/8),yaw:facing(id,beat/8)}))};});
 let maximumObservedSpeed=0,minimumObservedClearance=Infinity;for(let k=1;k<=2048;k++){const t=k/2048,previous=(k-1)/2048;for(const id of ids)maximumObservedSpeed=Math.max(maximumObservedSpeed,gap(position(id,t),position(id,previous))*256);for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,gap(position(ids[a],t),position(ids[b],t)));}
 if(maximumObservedSpeed>1.8+EPS||minimumObservedClearance<.45-EPS)throw Error('Do-si-do ring preparation exceeds the existing section speed or clearance budget.');
 return Object.freeze({...plan,entryState,exitState,gates,maximumObservedSpeed,minimumObservedClearance});
}

