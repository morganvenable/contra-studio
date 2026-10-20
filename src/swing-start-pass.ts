/** An explicitly reviewed terminal current-neighbor pass into the next swing frame.
 * The formation owner supplies every physical destination. This primitive does
 * not choose future neighbors, advance rows, or repair mismatching endpoints. */
import type {Dancer,HandContact,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {compileRingBalance} from './ring-balance.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,heading,turn,ease,progress,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
export interface SwingStartPassOptions {
 actors:readonly Dancer[]; entry:ReadonlyMap<number,TurnConstraint>;exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;bindingEpoch:number;cyclicIds:readonly[number,number,number,number];
 frame:{origin:Vec2;axis:Vec2};beats:4;relation:'neighbor';passingShoulder:'right';
 minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
}
export function compileSwingStartPass(options:SwingStartPassOptions){
 if(!options||Object.keys(options).some(k=>!['actors','entry','exit','relations','bindingEpoch','cyclicIds','frame','beats','relation','passingShoulder','minimumClearance','maximumSpeed','maximumYawRate'].includes(k))||!options.frame||Object.keys(options.frame).some(k=>!['origin','axis'].includes(k)))throw new Error('The prepared-swing pass does not consume unknown option or hall-frame fields.');
 const {actors,ids}=ownActors(options.actors,4),relations=ownRelations(options.relations,options.bindingEpoch,actors),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids),cycle=Object.freeze([...options.cyclicIds]) as readonly[number,number,number,number];
 const origin=Object.freeze({...options.frame?.origin}),axis=Object.freeze({...options.frame?.axis}),across={x:axis.z,z:-axis.x};
 if(options.beats!==4||options.relation!=='neighbor'||options.passingShoulder!=='right'||![origin.x,origin.z,axis.x,axis.z].every(Number.isFinite)||Math.abs(Math.hypot(axis.x,axis.z)-1)>1e-7)throw new Error('A ring pass requires four counts, current neighbors, an explicit right shoulder, and a finite unit hall frame.');
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*axis.x+(p.z-origin.z)*axis.z}),world=(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*axis.x,z:origin.z+p.x*across.z+p.z*axis.z});
 const starts=new Map(ids.map(id=>[id,local(entry.get(id)!.position)])),ends=new Map(ids.map(id=>[id,local(exit.get(id)!.position)]));
 // Reuse the strict ring contract, including current identity edges, inward
 // facings and fixed-arm reach, rather than calling any nearby foursome a ring.
 const ring=compileRingBalance({actors,entry,exit:entry,relations,bindingEpoch:options.bindingEpoch,cyclicIds:cycle,beats:4,hands:'both',exitMode:'same-ring'});
 const pairs=ids.filter(id=>id<relations.neighbor.get(id)!).map(id=>[id,relations.neighbor.get(id)!] as const);
 for(const id of ids){const a=starts.get(id)!,b=starts.get(relations.neighbor.get(id)!)!,e=ends.get(id)!;
  if(Math.abs(a.x-b.x)>1e-7||Math.abs(a.z+b.z)>1e-7||Math.abs(Math.abs(a.x)-.55)>1e-7||Math.abs(Math.abs(a.z)-.55)>1e-7)throw new Error('The named current neighbors must occupy opposite rows of the explicit compact ring on the same sideline.');
  const nextFrame=Math.abs(Math.abs(e.z)-1.49)<1e-7,waiting=Math.abs(Math.abs(e.z)-.9)<1e-7;
  if(Math.sign(e.x)!==Math.sign(a.x)||Math.abs(Math.abs(e.x)-.9)>1e-7||Math.sign(e.z)!==-Math.sign(a.z)||!nextFrame&&!waiting)throw new Error('A prepared-swing pass must arrive at exact next-frame or same-end waiting destinations on its original sideline.');
  const forward={x:-Math.sign(a.z)*axis.x,z:-Math.sign(a.z)*axis.z},yaw=heading({x:0,z:0},forward);
  if(Math.abs(turn(exit.get(id)!.yaw,yaw+(nextFrame?Math.PI/3:0)))>1e-7)throw new Error('The completed prepared-swing pass must have its exact next-frame facing or outward waiting direction.');
 }
 const root=(id:number,beat:number)=>{const A=entry.get(id),B=exit.get(id);if(!A||!B)throw new Error('Actor is outside this explicit ring-pass group.');const a=starts.get(id)!,b=ends.get(id)!,t=beat/4,u=progress(t),w=ease(t),bow=4*u*(1-u),side=Math.sign(a.x),forward=-Math.sign(a.z),baseWidth=Math.abs(a.x)+(Math.abs(b.x)-Math.abs(a.x))*w;
  const p={x:side*(baseWidth+(.9-(Math.abs(a.x)+Math.abs(b.x))/2)*bow)+forward*.53*bow,z:a.z+(b.z-a.z)*u};
  const travelYaw=heading({x:0,z:0},{x:forward*axis.x,z:forward*axis.z}),yaw=A.yaw+turn(travelYaw,A.yaw)*ease(beat/.8)+turn(B.yaw,travelYaw)*ease((beat-3)/1);
  return{id,position:world(p),yaw};
 };
 const contacts=(beat:number):HandContact[]=>{const strength=1-ease(beat/.4);if(strength<=0)return[];const poses=ids.map(id=>root(id,beat));return ring.contacts(0,poses as Pose[]).map(c=>({...c,strength}));};
 const sample=(beat:number)=>{beat=sampleTime(beat);const h=1e-5,lo=Math.max(0,beat-h),hi=Math.min(4,beat+h);return{beat,poses:ids.map(id=>{const p=root(id,beat),a=root(id,lo),b=root(id,hi);return{...p,velocity:{x:(b.position.x-a.position.x)/(hi-lo),z:(b.position.z-a.position.z)/(hi-lo)},yawRate:(b.yaw-a.yaw)/(hi-lo)};}),contacts:contacts(beat)};};
 const minimum=options.minimumClearance??.62,maximum=options.maximumSpeed??1.35,angular=options.maximumYawRate??2.5;
 if(![minimum,maximum,angular].every(x=>Number.isFinite(x)&&x>0))throw new Error('Finite positive ring-pass motion budgets are required.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;for(let n=0;n<=800;n++){const f=sample(n/200);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.velocity.x,p.velocity.z));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-1e-7||maximumObservedSpeed>maximum+1e-7||maximumObservedYawRate>angular+1e-7)throw new Error(`Ring pass exceeds sampled motion budgets: clearance ${minimumObservedClearance}, speed ${maximumObservedSpeed}, yaw ${maximumObservedYawRate}.`);
 // Each pair crosses exactly once. Its right shoulders meet at the declared
 // gate: the other actor must lie on this actor's right, so the top actor
 // takes the positive-across lane and its receiver the negative-across lane.
 const gates=pairs.map(([a,b])=>{let lo=0,hi=4;const sign=Math.sign(starts.get(a)!.z-starts.get(b)!.z);for(let n=0;n<50;n++){const mid=(lo+hi)/2,A=local(root(a,mid).position),B=local(root(b,mid).position);if(Math.sign(A.z-B.z)===sign)lo=mid;else hi=mid;}const beat=(lo+hi)/2,A=local(root(a,beat).position),B=local(root(b,beat).position);if((B.x-A.x)*sign<.62-1e-7)throw new Error('The named pass does not complete through the explicit right-shoulder gate.');return Object.freeze({beat,pair:Object.freeze([a,b]),shoulder:'right' as const});});
 return Object.freeze({beats:4 as const,epoch:relations.epoch,entry:immutableMap(entry),exit:immutableMap(exit),cyclicIds:cycle,gates:Object.freeze(gates),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,sampleTime(t*4)).position,facing:(id:number,t:number)=>root(id,sampleTime(t*4)).yaw,contacts:(t:number)=>contacts(sampleTime(t*4))});
}
