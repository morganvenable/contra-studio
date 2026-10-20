/** A source-counted six-count circle followed by a two-count terminal passage.
 * This is deliberately separate from the four-count ring-pass primitive: its
 * incoming prepared slots, released hands and whole-formation dimensions are explicit.
 */
import type {Dancer,Pose,Vec2,Figure} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,heading,turn,ease,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
export const SIX_TWO_GEOMETRY=Object.freeze({halfWidth:.72,rowGap:1.44});
export interface SixTwoPassOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,TurnConstraint>;exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;bindingEpoch:number;frame:{origin:Vec2;axis:Vec2};
 beats:2;relation:'neighbor';passingShoulder:'right';geometry:typeof SIX_TWO_GEOMETRY;
}
function travel(raw:number):number{const t=Math.max(0,Math.min(1,raw)),r=.08,n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-travel(1-t);return(t-r/2)/n;}
function consumedRecord(value:unknown,keys:readonly string[]):void{if(!value||typeof value!=='object'||Array.isArray(value)||Reflect.ownKeys(value).some(k=>typeof k!=='string'||!keys.includes(k)))throw new Error('The six-plus-two pass requires fully consumed frame vectors and endpoint records.');}
export function compileSixTwoPass(options:SixTwoPassOptions){
 if(!options||Object.keys(options).some(k=>!['actors','entry','exit','relations','bindingEpoch','frame','beats','relation','passingShoulder','geometry'].includes(k))||!options.frame||Object.keys(options.frame).some(k=>!['origin','axis'].includes(k))||!options.geometry||Object.keys(options.geometry).some(k=>!['halfWidth','rowGap'].includes(k)))throw new Error('The six-plus-two pass requires a fully consumed explicit physical contract.');
 for(const vector of[options.frame.origin,options.frame.axis])consumedRecord(vector,['x','z']);
 for(const endpoints of[options.entry,options.exit])for(const p of endpoints.values()){consumedRecord(p,['position','yaw','velocity','yawRate']);consumedRecord(p.position,['x','z']);consumedRecord(p.velocity,['x','z']);}
 const {actors,ids}=ownActors(options.actors,4),relations=ownRelations(options.relations,options.bindingEpoch,actors),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids),origin=Object.freeze({...options.frame.origin}),axis=Object.freeze({...options.frame.axis}),across={x:axis.z,z:-axis.x};
 if(options.beats!==2||options.relation!=='neighbor'||options.passingShoulder!=='right'||options.geometry.halfWidth!==.72||options.geometry.rowGap!==1.44||![origin.x,origin.z,axis.x,axis.z].every(Number.isFinite)||Math.abs(Math.hypot(axis.x,axis.z)-1)>1e-8)throw new Error('The two-count passage requires current neighbors, right shoulders and the declared0.72×1.44 whole-formation profile.');
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*axis.x+(p.z-origin.z)*axis.z}),world=(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*axis.x,z:origin.z+p.x*across.z+p.z*axis.z});
 const starts=new Map(ids.map(id=>[id,local(entry.get(id)!.position)])),ends=new Map(ids.map(id=>[id,local(exit.get(id)!.position)]));
 for(const id of ids){const a=starts.get(id)!,b=starts.get(relations.neighbor.get(id)!)!,e=ends.get(id)!,forward=-Math.sign(a.z),yaw=heading({x:0,z:0},{x:forward*axis.x,z:forward*axis.z});
  if(Math.abs(a.x-(Math.sign(a.x)*.76-Math.sign(a.z)*.30))>1e-7||Math.abs(Math.abs(a.z)-.48)>1e-7||Math.abs((a.x+b.x)/2-Math.sign(a.x)*.76)>1e-7||Math.abs(a.z+b.z)>1e-7)throw new Error('The two-count pass requires the explicit released lane/forward preparation from the declared six-count circle and named same-sideline current neighbors.');
  if(Math.abs(e.x-Math.sign(a.x)*.72)>1e-7||Math.abs(e.z+Math.sign(a.z)*.72)>1e-7||Math.abs(turn(entry.get(id)!.yaw,yaw))>1e-7||Math.abs(turn(exit.get(id)!.yaw,yaw))>1e-7)throw new Error('The two-count pass must physically arrive at the exact exchanged next-round compact row and forward facing.');
 }
 const root=(id:number,beat:number)=>{const a=starts.get(id),b=ends.get(id);if(!a||!b)throw new Error('Actor is outside this explicit two-count passage.');const t=sampleTime(beat,2)/2,u=travel(t),out=1-ease((t-.5)/.5),bow=.30*(1-ease(t))+.24*Math.sin(Math.PI*u),side=Math.sign(a.x),forward=-Math.sign(a.z);return{id,position:world({x:side*(.72+.04*out)+forward*bow,z:a.z+(b.z-a.z)*u}),yaw:entry.get(id)!.yaw};};
 const sample=(beat:number)=>{beat=sampleTime(beat,2);const h=1e-5,lo=Math.max(0,beat-h),hi=Math.min(2,beat+h);return{beat,poses:ids.map(id=>{const p=root(id,beat),a=root(id,lo),b=root(id,hi);return{...p,velocity:{x:(b.position.x-a.position.x)/(hi-lo),z:(b.position.z-a.position.z)/(hi-lo)},yawRate:0};}),contacts:[]};};
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0;for(let i=0;i<=800;i++){const f=sample(i/400);for(const p of f.poses)maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.velocity.x,p.velocity.z));for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<.65-1e-7||maximumObservedSpeed>.85+1e-7)throw new Error(`The two-count passage exceeds its fixed body-motion budget: ${minimumObservedClearance}/${maximumObservedSpeed}.`);
 const gates=ids.filter(id=>id<relations.neighbor.get(id)!).map(id=>{const other=relations.neighbor.get(id)!,a=starts.get(id)!,b=ends.get(id)!,fraction=-a.z/(b.z-a.z);let lo=0,hi=1;for(let n=0;n<60;n++){const mid=(lo+hi)/2;if(travel(mid)<fraction)lo=mid;else hi=mid;}const beat=lo+hi,A=root(id,beat),B=root(other,beat),right={x:-Math.cos(A.yaw),z:Math.sin(A.yaw)},projection=(B.position.x-A.position.x)*right.x+(B.position.z-A.position.z)*right.z;if(projection<.65||Math.abs(local(A.position).z-local(B.position).z)>1e-7)throw new Error('The named current neighbors do not cross through the right-shoulder gate.');return Object.freeze({beat,pair:Object.freeze([id,other]),shoulder:'right' as const});});
 return Object.freeze({beats:2 as const,epoch:relations.epoch,geometry:SIX_TWO_GEOMETRY,entry:immutableMap(entry),exit:immutableMap(exit),gates:Object.freeze(gates),minimumObservedClearance,maximumObservedSpeed,sample,position:(id:number,t:number)=>root(id,t*2).position,facing:(id:number,t:number)=>root(id,t*2).yaw,contacts:()=>[]});
}
/** Retains the full literal three-quarter circle in5¼ of its six source counts.
 * The final¾ count explicitly releases hands, faces onward and prepares the
 * .30 shoulder lane/.24 forward/.04 outward offsets before the two-count pass. */
export function compileSixCountCircle(figure:Figure,context:FigureContext,directions:number[]):MotionPlan{
 assertFigureArgumentsConsumed(figure);resolveBoundFigureRelation(context,'partner');resolveBoundFigureRelation(context,'neighbor');
 if(figure.kind!=='circle'||figure.beats!==6||figure.who!=='all'||figure.direction!=='left'||figure.amount!==.75||figure.progression||figure.confidence==='unsupported'||context.next?.kind!=='pass-through'||context.next.beats!==2||context.next.who!=='neighbor'||context.next.passingShoulder!=='right'||context.next.entry!==('circle-exit' as Figure['entry'])||context.next.exit!=='progressed-neighbors'||context.next.progression!==true)throw new Error('This explicit six-count circle requires all four, left three places, and the following two-count terminal passage.');
 const ids=[...context.ids],start=structuredClone(context.start),center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 if(ids.some(id=>Math.abs(Math.abs(start[id].position.x-center.x)-.72)>1e-7||Math.abs(Math.abs(start[id].position.z-center.z)-.72)>1e-7))throw new Error('The entire preceding composition must deliver the declared0.72×1.44 formation; the circle cannot silently shrink its entry.');
 const original=compilePrimitiveFigure(figure,ids,start,context.dancers,directions,{geometry:SIX_TWO_GEOMETRY});
 const radius=(q:number)=>1-.22*Math.min(ease(q/.2),ease((1-q)/.2)),arc=[0];let arcLength=0,last={x:1,z:0};for(let i=1;i<=4096;i++){const q=i/4096,a=1.5*Math.PI*q,r=radius(q),p={x:r*Math.cos(a),z:r*Math.sin(a)};arcLength+=distance(p,last);arc.push(arcLength);last=p;}
 const phase=(t:number)=>{const length=arcLength*travel(Math.min(1,t*6/5.25));let lo=0,hi=4096;while(lo+1<hi){const m=(lo+hi)>>1;if(arc[m]<length)lo=m;else hi=m;}return(lo+(length-arc[lo])/(arc[hi]-arc[lo]))/4096;};
 const position=(id:number,t:number)=>{if(!ids.includes(id)||!Number.isFinite(t))throw new Error('The circle requires a named actor and finite time.');const p=start[id].position,x=p.x-center.x,z=p.z-center.z,q=phase(t),a=1.5*Math.PI*q,targetX=z,targetZ=-x,w=ease((t-5.25/6)*8),r=radius(q);return{x:center.x+r*(x*Math.cos(a)-z*Math.sin(a))+(Math.sign(targetX)*.04-Math.sign(targetZ)*.30)*w,z:center.z+r*(x*Math.sin(a)+z*Math.cos(a))-Math.sign(targetZ)*.24*w};};
 return Object.freeze({...original,position,facing:(id:number,t:number,poses:Pose[])=>{const a=heading(position(id,t),center),p=position(id,1),target=p.z<center.z?0:Math.PI,w=ease((t-5.25/6)*8);return a+turn(target,a)*w;},contacts:(t:number,poses:Pose[])=>original.contacts(t,poses).map(c=>({...c,strength:c.strength*(1-ease((t-5.25/6)*8))})).filter(c=>c.strength>0)});
}
export function compileSixTwoPassFigure(figure:Figure,context:FigureContext,destination:ReadonlyMap<number,TurnConstraint>):MotionPlan{
 assertFigureArgumentsConsumed(figure);
 if(figure.kind!=='pass-through'||figure.beats!==2||figure.who!=='neighbor'||figure.passingShoulder!=='right'||figure.entry!==('circle-exit' as Figure['entry'])||figure.exit!=='progressed-neighbors'||figure.progression!==true||figure.confidence==='unsupported'||context.next!==undefined)throw new Error('The two-count terminal passage needs explicit current neighbors, right shoulders, released circle exit and progressed neighbors.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4},entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 return compileSixTwoPass({actors:ids.map(id=>dancers[id]),entry,exit:destination,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,frame:{origin:center,axis:{x:0,z:1}},beats:2,relation:'neighbor',passingShoulder:'right',geometry:SIX_TWO_GEOMETRY});
}
