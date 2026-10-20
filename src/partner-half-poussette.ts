/** Ordinary partner half poussette, with a separately declared neighbor-swing exit.
 * The paired centers orbit through half a circle; individual room headings do
 * not rotate while the two-hand hold is maintained. A draw poussette is a
 * different figure and is deliberately not accepted here.
 * Definition: https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm
 */
import type {Dancer,HandContact,Pose,Role,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,turn,ease,smooth,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
export type PoussetteConstraint=TurnConstraint;
export interface PoussettePair {pullerId:number;pusherId:number;relationship:'partner';}
export interface PartnerHalfPoussetteOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,PoussetteConstraint>;exit:ReadonlyMap<number,PoussetteConstraint>;
 relations:BoundRelationships;bindingEpoch:number;pairs:readonly PoussettePair[];
 beats:8;amount:.5;hands:'both';pullRole:Role;pullDirection:'back-left'|'back-right';facing:'fixed-room';
 phaseBeats:readonly [6,2];exitKind:'neighbor-swing';frame:{origin:Vec2;across:Vec2};
 minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;source?:string;
}
export interface PoussettePose extends PoussetteConstraint {id:number;acceleration:Vec2;yawAcceleration:number;}
const EPS=1e-7,zero={x:0,z:0};
const easeD=(t:number)=>t<=0||t>=1?0:30*t*t*(1-t)*(1-t);
const easeDD=(t:number)=>t<=0||t>=1?0:60*t*(1-t)*(1-2*t);
function progress(t:number):[number,number,number]{
 t=Math.max(0,Math.min(1,t));const r=.18,n=1-r;
 if(t>1-r){const[q,v,a]=progress(1-t);return[1-q,v,-a];}
 if(t<r){const u=t/r;return[r*(u*u*u-.5*u*u*u*u)/n,(3*u*u-2*u*u*u)/n,(6*u-6*u*u)/(r*n)];}
 return[(t-r/2)/n,1/n,0];
}
export function compilePartnerHalfPoussette(o:PartnerHalfPoussetteOptions){
 const {actors,ids,byId}=ownActors(o.actors,4),relations=ownRelations(o.relations,o.bindingEpoch,actors),entry=ownConstraints(o.entry,ids),exit=ownConstraints(o.exit,ids);
 if(o.beats!==8||o.amount!==.5||o.hands!=='both'||!['lark','robin'].includes(o.pullRole)||!['back-left','back-right'].includes(o.pullDirection)||o.facing!=='fixed-room'||o.exitKind!=='neighbor-swing'||!Array.isArray(o.phaseBeats)||o.phaseBeats.length!==2||o.phaseBeats[0]!==6||o.phaseBeats[1]!==2)throw new Error('This ordinary half poussette requires eight counts, both partner hands, explicit pull role/direction, fixed room-facing, and reviewed six-plus-two orbit/swing preparation.');
 if(o.source!==undefined&&typeof o.source!=='string')throw new Error('Source attribution must be a string.');
 const pullRole=o.pullRole,pullDirection=o.pullDirection,source=o.source,pairs=o.pairs.map(p=>Object.freeze({...p}));
 if(pairs.length!==2||new Set(pairs.flatMap(p=>[p.pullerId,p.pusherId])).size!==4||pairs.some(p=>p.relationship!=='partner'||byId.get(p.pullerId)?.role!==pullRole||relations.partner.get(p.pullerId)!==p.pusherId))throw new Error('Two disjoint partner pairs must name the pulling role and preserve the current persistent partner binding.');
 const origin={...o.frame.origin},across={...o.frame.across},along={x:-across.z,z:across.x};
 if(![origin.x,origin.z,across.x,across.z].every(Number.isFinite)||distance(across,zero)<1-EPS||distance(across,zero)>1+EPS)throw new Error('A finite explicit origin and unit across-set frame are required.');
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*along.x+(p.z-origin.z)*along.z});
 const world=(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*along.x,z:origin.z+p.x*across.z+p.z*along.z});
 const vector=(p:Vec2)=>({x:p.x*across.x+p.z*along.x,z:p.x*across.z+p.z*along.z});
 const start=new Map(ids.map(id=>[id,local(entry.get(id)!.position)])),end=new Map(ids.map(id=>[id,local(exit.get(id)!.position)])),pairFor=new Map<number,Readonly<PoussettePair>>();
 for(const pair of pairs){const A=start.get(pair.pullerId)!,B=start.get(pair.pusherId)!;
  if(Math.abs(Math.abs(A.x)-.52)>EPS||Math.abs(A.x+B.x)>EPS||Math.abs(A.z-B.z)>EPS||Math.abs(Math.abs(A.z)-.9)>EPS)throw new Error('Partner entry must use explicit reachable 1.04-wide two-hand holds, in rows 1.8 apart.');
  if(Math.sign(A.x)!==(pullDirection==='back-left'?-1:1)*Math.sign(A.z))throw new Error('The declared pull direction contradicts the incoming corner order.');
  for(const id of[pair.pullerId,pair.pusherId]){pairFor.set(id,pair);const p=start.get(id)!,yaw=Math.atan2(-Math.sign(p.x)*across.x,-Math.sign(p.x)*across.z);if(Math.abs(turn(entry.get(id)!.yaw,yaw))>EPS)throw new Error('Each partner must face directly across in the received two-hand hold.');
   const nextZ=-Math.sign(p.z)*.31,target={x:Math.sign(p.x)*.9,z:nextZ},other=start.get(relations.neighbor.get(id)!)!;
   if(Math.sign(other.x)!==Math.sign(p.x)||Math.sign(other.z)===Math.sign(p.z))throw new Error('The outgoing swing must retain the original neighbor on the same sideline.');
   const targetYaw=Math.atan2(-nextZ*along.x,-nextZ*along.z)+Math.PI/3;
   if(distance(end.get(id)!,target)>EPS||Math.abs(turn(exit.get(id)!.yaw,targetYaw))>EPS)throw new Error('Explicit exit must prepare the same neighbor on the same sideline after the partner couples exchange rows.');
  }
 }
 if(new Set(pairs.map(p=>Math.sign(start.get(p.pullerId)!.z))).size!==2)throw new Error('The two partner couples must begin in opposite rows.');
 const root=(id:number,beat:number):PoussettePose=>{
  const p=start.get(id),initial=entry.get(id);if(!p||!initial)throw new Error('Actor is outside the bound partner half poussette.');
  if(beat<=6){const pair=pairFor.get(id)!,side=Math.sign(start.get(pair.pullerId)!.x),[q,v,a]=progress(beat/6),theta=Math.PI*q,w=Math.PI*v/6,alpha=Math.PI*a/36,c=Math.cos(theta),s=Math.sin(theta),radius=1.08;
   return{id,position:world({x:p.x+side*radius*s,z:p.z*c}),velocity:vector({x:side*radius*c*w,z:-p.z*s*w}),acceleration:vector({x:side*radius*(c*alpha-s*w*w),z:-p.z*(s*alpha+c*w*w)}),yaw:initial.yaw,yawRate:0,yawAcceleration:0};
  }
  const u=(beat-6)/2,q=ease(u),v=easeD(u)/2,a=easeDD(u)/4,target=end.get(id)!,dx=target.x-p.x,dz=target.z+p.z,dyaw=turn(exit.get(id)!.yaw,initial.yaw);
  return{id,position:world({x:p.x+dx*q,z:-p.z+dz*q}),velocity:vector({x:dx*v,z:dz*v}),acceleration:vector({x:dx*a,z:dz*a}),yaw:initial.yaw+dyaw*q,yawRate:dyaw*v,yawAcceleration:dyaw*a};
 };
 const time=(beat:number)=>sampleTime(beat,8);
 const contactAt=(beat:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[]):HandContact[]=>{
  const byId=new Map(poses.map(p=>[p.id,p]));if(byId.size!==poses.length||ids.some(id=>!byId.has(id))||poses.some(p=>![p.position.x,p.position.z,p.yaw].every(Number.isFinite)))throw new Error('Contacts require unique finite poses for all bound identities.');
  const strength=1-smooth((beat-5.65)/.35);if(strength<=0)return[];
  return pairs.flatMap(({pullerId:a,pusherId:b})=>{const A=byId.get(a)!,B=byId.get(b)!,yaw=A.yaw;return(['left','right']as const).map(hand=>{const sign=hand==='left'?1:-1;return{a,b,handA:hand,handB:hand==='left'?'right' as const:'left' as const,point:{x:(A.position.x+B.position.x)/2+sign*.235*Math.cos(yaw),y:1.20,z:(A.position.z+B.position.z)/2-sign*.235*Math.sin(yaw)},strength,kind:'joined' as const};});});
 };
 const sample=(beat:number)=>{beat=time(beat);const poses=ids.map(id=>root(id,beat));return{beat,poses,contacts:contactAt(beat,poses)};};
 const minimum=o.minimumClearance??.6,maximum=o.maximumSpeed??1.1,maxYaw=o.maximumYawRate??2.6;
 if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0))throw new Error('Physical budgets must be positive and finite.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=1600;i++){const f=sample(i/200);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.velocity,zero));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-EPS||maximumObservedSpeed>maximum+EPS||maximumObservedYawRate>maxYaw+EPS)throw new Error(`Partner half poussette exceeds explicit physical budgets: clearance ${minimumObservedClearance}, speed ${maximumObservedSpeed}, yaw ${maximumObservedYawRate}.`);
 return Object.freeze({beats:8 as const,amount:.5 as const,hands:'both' as const,pullRole,pullDirection,facingPolicy:'fixed-room' as const,source,epoch:relations.epoch,phaseBeats:Object.freeze([6,2]as const),phaseBoundaries:Object.freeze([0,1.08,4.92,5.65,6,8]),pairs:Object.freeze(pairs),entry:immutableMap(entry),exit:immutableMap(exit),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,time(t*8)).position,facing:(id:number,t:number)=>root(id,time(t*8)).yaw,contacts:(t:number,poses?:readonly Pose[])=>{const beat=time(t*8);return contactAt(beat,poses??ids.map(id=>root(id,beat)));}});
}
