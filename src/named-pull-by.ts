/** One explicitly named, handed passage. This is neither an allemande nor a
 * no-contact pass-through: named actors physically exchange their entry slots,
 * meet at a same-hand gate and release. Relationship changes belong to the
 * formation owner, never this primitive. */
import type {Dancer,Hand,HandContact,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,heading,turn,ease,progress,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
export type PullByRelation='partner'|'neighbor'|'larks'|'robins';
export interface NamedPullByPair {a:number;b:number;relationship:PullByRelation;}
export interface NamedPullByOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,TurnConstraint>;exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;bindingEpoch:number;pairs:readonly NamedPullByPair[];
 hand:Hand;beats:2|4;minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
}
const EPS=1e-7;
export function compileNamedPullBy(options:NamedPullByOptions){
 const allowed=new Set(['actors','entry','exit','relations','bindingEpoch','pairs','hand','beats','minimumClearance','maximumSpeed','maximumYawRate']);
 if(!options||Object.keys(options).some(key=>!allowed.has(key)))throw new Error('A named pull-by does not ignore extra turn, role, or progression modifiers.');
 const{actors,ids,byId}=ownActors(options.actors,4),relations=ownRelations(options.relations,options.bindingEpoch,actors),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids);
 const{beats,hand}=options;
 if(![2,4].includes(beats)||!['left','right'].includes(hand))throw new Error('A named pull-by requires an explicit left or right hand and an exact two- or four-count budget.');
 if(!Array.isArray(options.pairs)||!options.pairs.length||options.pairs.length>2||options.pairs.some(p=>!p||Object.keys(p).sort().join('|')!=='a|b|relationship'))throw new Error('Pull-by pairs must explicitly name both actors and their relationship.');
 const pairs:readonly Readonly<NamedPullByPair>[]=Object.freeze(options.pairs.map(p=>Object.freeze({...p}))),relationship=pairs[0].relationship;
 if(!['partner','neighbor','larks','robins'].includes(relationship)||pairs.some(p=>p.relationship!==relationship)||new Set(pairs.flatMap(p=>[p.a,p.b])).size!==pairs.length*2)throw new Error('A pull-by uses disjoint pairs with one explicit named relationship.');
 if(pairs.length!==(['partner','neighbor'].includes(relationship)?2:1))throw new Error('Every actor in the named pull-by relationship must be covered exactly once.');
 const data=new Map<number,{other:number;forward:Vec2;right:Vec2;yaw:number}>();
 for(const{a,b,relationship}of pairs){
  const A=byId.get(a),B=byId.get(b);
  if(!A||!B||a===b)throw new Error('A pull-by pair must name two distinct actors in the bound group.');
  if(relationship==='partner'||relationship==='neighbor'){if(relations[relationship].get(a)!==b)throw new Error('The named pull-by receiver contradicts the current relationship binding.');}
  else if(A.role!==(relationship==='larks'?'lark':'robin')||B.role!==A.role||A.couple===B.couple)throw new Error('The same-role pull-by must name the two different-couple actors of that role.');
  const gap=distance(entry.get(a)!.position,entry.get(b)!.position);
  if(gap<1.05-EPS||gap>2.60+EPS)throw new Error('The bounded pull-by requires a reachable 1.05–2.60-unit incoming pair spacing.');
  for(const[id,other]of[[a,b],[b,a]]){
   const A=entry.get(id)!,B=entry.get(other)!,X=exit.get(id)!;
   if(distance(X.position,B.position)>EPS)throw new Error('A pull-by must physically exchange the named receiver’s exact entry slot.');
   const forward={x:(B.position.x-A.position.x)/gap,z:(B.position.z-A.position.z)/gap},yaw=A.yaw+turn(heading(A.position,B.position),A.yaw);
   data.set(id,{other,forward,right:{x:-forward.z,z:forward.x},yaw});
  }
 }
 for(const id of ids)if(!data.has(id)&&distance(entry.get(id)!.position,exit.get(id)!.position)>EPS)throw new Error('Actors outside the named pull-by retain their entry root slots.');
 // Each actor bows away from the named hand, putting that hand on the
 // receiver-facing side at the half-time gate. The gate is a true crossing.
 const lane=.35,sign=hand==='right'?1:-1;
 const root=(id:number,beat:number)=>{
  const A=entry.get(id),X=exit.get(id);if(!A||!X)throw new Error('Actor is outside this bound named pull-by.');
  const t=beat/beats,d=data.get(id);
  if(!d)return{id,position:{...A.position},yaw:A.yaw+turn(X.yaw,A.yaw)*ease(t)};
  const B=entry.get(d.other)!,u=progress(t),bow=16*u*u*(1-u)*(1-u),yaw=d.yaw+(A.yaw-d.yaw)*(1-ease(t/.45))+turn(X.yaw,d.yaw)*ease((t-.55)/.45);
  return{id,position:{x:A.position.x+(B.position.x-A.position.x)*u-sign*d.right.x*lane*bow,z:A.position.z+(B.position.z-A.position.z)*u-sign*d.right.z*lane*bow},yaw};
 };
 const contactAt=(beat:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[]):HandContact[]=>{
  const byId=new Map(poses.map(p=>[p.id,p]));
  if(byId.size!==poses.length||ids.some(id=>!byId.has(id))||poses.some(p=>![p.position.x,p.position.z,p.yaw].every(Number.isFinite)))throw new Error('Pull-by contacts require unique finite poses for every bound actor.');
  const t=beat/beats,window=ease((t-.25)/.12)*ease((.75-t)/.12);if(!window)return[];
  return pairs.flatMap(({a,b})=>{
   const A=byId.get(a)!,B=byId.get(b)!,point={x:(A.position.x+B.position.x)/2,y:1.18,z:(A.position.z+B.position.z)/2};
   const reach=(p:typeof A)=>Math.hypot(point.x-p.position.x+sign*.235*Math.cos(p.yaw),point.y-1.355,point.z-p.position.z-sign*.235*Math.sin(p.yaw));
   const strength=window*ease((.64-Math.max(reach(A),reach(B)))/.08);
   return strength>0?[{a,b,handA:hand,handB:hand,point,strength,kind:'joined' as const}]:[];
  });
 };
 const sample=(beat:number)=>{
  beat=sampleTime(beat,beats);const h=1e-5,lo=Math.max(0,beat-h),hi=Math.min(beats,beat+h);
  const poses=ids.map(id=>{const p=root(id,beat),a=root(id,lo),b=root(id,hi);return{...p,velocity:{x:(b.position.x-a.position.x)/(hi-lo),z:(b.position.z-a.position.z)/(hi-lo)},yawRate:(b.yaw-a.yaw)/(hi-lo)};});
  return{beat,poses,contacts:contactAt(beat,poses)};
 };
 const gates=Object.freeze(pairs.map(pair=>{
  const frame=sample(beats/2),A=frame.poses.find(p=>p.id===pair.a)!,B=frame.poses.find(p=>p.id===pair.b)!,d=data.get(pair.a)!,delta={x:B.position.x-A.position.x,z:B.position.z-A.position.z};
  if(Math.abs(delta.x*d.forward.x+delta.z*d.forward.z)>EPS||sign*(delta.x*d.right.x+delta.z*d.right.z)<2*lane-EPS||!frame.contacts.some(c=>c.a===pair.a&&c.b===pair.b&&c.handA===hand&&c.handB===hand&&c.strength>.99))throw new Error('The named pull-by did not reach its independently checked same-hand crossing gate.');
  return Object.freeze({...pair,hand,beat:beats/2});
 }));
 const minimum=options.minimumClearance??.64,maximum=options.maximumSpeed??1.65,angular=options.maximumYawRate??6;
 if(![minimum,maximum,angular].every(x=>Number.isFinite(x)&&x>0))throw new Error('Finite positive pull-by motion budgets are required.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let n=0;n<=beats*160;n++){
  const f=sample(n/160);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.velocity,{x:0,z:0}));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}
  for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));
 }
 if(minimumObservedClearance<minimum-EPS||maximumObservedSpeed>maximum+EPS||maximumObservedYawRate>angular+EPS)throw new Error(`Named pull-by exceeds sampled motion budgets: clearance ${minimumObservedClearance}, speed ${maximumObservedSpeed}, yaw ${maximumObservedYawRate}.`);
 return Object.freeze({beats,hand,epoch:relations.epoch,pairs,entry:immutableMap(entry),exit:immutableMap(exit),gates,minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,sampleTime(t*beats,beats)).position,facing:(id:number,t:number)=>root(id,sampleTime(t*beats,beats)).yaw,contacts:(t:number,poses?:readonly Pose[])=>{const beat=sampleTime(t*beats,beats);return contactAt(beat,poses??ids.map(id=>root(id,beat)));}});
}
