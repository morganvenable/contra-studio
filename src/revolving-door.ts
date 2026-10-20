/** Source-backed revolving door: two named couples carry the outer larks
 * through half of the central robins' right-hand turn; the larks release on
 * the opposite side while the robins finish once around. This is not a star
 * or promenade alias. The source count includes pickup and swing acquisition.
 * Mechanics: Rick Mohr, Cup of Joe / Gaye's Groove; David Smukler, Love's Evolution.
 */
import type {Dancer,HandContact,Pose,Vec2,Vec3} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,clamp,smooth,ease,progress,distance,turn,finite,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
export type RevolvingDoorRelation='partner'|'neighbor';
export interface RevolvingDoorPair {carrierId:number;carriedId:number;relationship:RevolvingDoorRelation;}
export interface RevolvingDoorOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,TurnConstraint>;exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;bindingEpoch:number;pairs:readonly RevolvingDoorPair[];
 centerRole:'robin';hand:'right';direction:'right';amount:1;dropOffAfter:.5;
 approachHold:'half-shoulder-waist';beats:8;phaseBeats:readonly [1.25,4.5,1.25,1];
 frame:{origin:Vec2;across:Vec2};minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;source?:string;
}
export interface RevolvingDoorPose extends TurnConstraint {id:number;}
export interface RevolvingDoorFrame {beat:number;poses:RevolvingDoorPose[];contacts:HandContact[];}
export interface RevolvingDoorPlan {
 readonly beats:8;readonly epoch:number;readonly source?:string;readonly centerRole:'robin';readonly hand:'right';readonly direction:'right';readonly amount:1;readonly dropOffAfter:.5;readonly approachHold:'half-shoulder-waist';readonly phaseBeats:readonly [1.25,4.5,1.25,1];
 readonly pairs:readonly Readonly<RevolvingDoorPair>[];readonly entry:ReadonlyMap<number,Readonly<TurnConstraint>>;readonly exit:ReadonlyMap<number,Readonly<TurnConstraint>>;
 readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;readonly phaseBoundaries:readonly number[];
 sample(beat:number):RevolvingDoorFrame;position(id:number,t:number):Vec2;facing(id:number,t:number,poses?:readonly Pose[]):number;contacts(t:number,poses?:readonly Pose[]):HandContact[];
}
const EPS=1e-7,TAU=2*Math.PI,INNER=.30,OUTER=.86,PICKUP=1.25,CARRY=4.5,FREE=1.25,EXIT=1,HALF=PICKUP+CARRY,TURN_END=HALF+FREE,DIAGONAL=Math.atan2(.31,.9);
const add=(a:Vec2,b:Vec2)=>({x:a.x+b.x,z:a.z+b.z}),scale=(p:Vec2,s:number)=>({x:p.x*s,z:p.z*s}),mix=(a:Vec2,b:Vec2,t:number)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
function reach(point:Vec3,p:Pick<Pose,'position'|'yaw'>,hand:'left'|'right'){const s=hand==='left'?1:-1;return Math.hypot(point.x-p.position.x-s*.235*Math.cos(p.yaw),point.y-1.355,point.z-p.position.z+s*.235*Math.sin(p.yaw));}
function bodyPoint(p:Pick<Pose,'position'|'yaw'>,q:Vec3):Vec3{return{x:p.position.x+q.x*Math.cos(p.yaw)+q.z*Math.sin(p.yaw),y:q.y,z:p.position.z-q.x*Math.sin(p.yaw)+q.z*Math.cos(p.yaw)};}
export function compileRevolvingDoor(options:RevolvingDoorOptions):RevolvingDoorPlan {
 // Runtime source contracts must not discard unconsumed modifiers, including
 // nested pair data that would otherwise survive a shallow frozen snapshot.
 const keys=(value:unknown,allowed:readonly string[],required:readonly string[]=allowed)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Reflect.ownKeys(value).every(key=>typeof key==='string'&&allowed.includes(key))&&required.every(key=>Object.hasOwn(value,key));
 const allowed=['actors','entry','exit','relations','bindingEpoch','pairs','centerRole','hand','direction','amount','dropOffAfter','approachHold','beats','phaseBeats','frame','minimumClearance','maximumSpeed','maximumYawRate','source'];
 if(!keys(options,allowed,allowed.slice(0,15))||!keys(options.frame,['origin','across'])||!keys(options.frame.origin,['x','z'])||!keys(options.frame.across,['x','z']))throw new Error('Revolving door does not ignore extra or missing motion, turn or frame modifiers.');
 if(!Array.isArray(options.pairs)||options.pairs.length!==2||Reflect.ownKeys(options.pairs).some(key=>!['0','1','length'].includes(String(key))||typeof key!=='string')||[0,1].some(i=>!Object.hasOwn(options.pairs,i)||!keys(options.pairs[i],['carrierId','carriedId','relationship'])))throw new Error('Revolving-door pairs require exactly the explicit carrierId, carriedId and relationship fields.');
 // Shared endpoint ownership remains unchanged; this source-specific boundary
 // additionally rejects modifiers that a generic constraint copy would omit.
 for(const constraints of [options.entry,options.exit])for(const endpoint of constraints.values())if(!keys(endpoint,['position','yaw','velocity','yawRate'])||!keys(endpoint.position,['x','z'])||!keys(endpoint.velocity,['x','z']))throw new Error('Revolving-door endpoint constraints require exactly position, yaw, velocity and yawRate, with explicit x/z vectors and no extra modifiers.');
 const {actors,ids,byId}=ownActors(options.actors,4),relations=ownRelations(options.relations,options.bindingEpoch,actors),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids);
 if(options.centerRole!=='robin'||options.hand!=='right'||options.direction!=='right'||options.amount!==1||options.dropOffAfter!==.5||options.approachHold!=='half-shoulder-waist')throw new Error('A revolving door requires explicit robin right-hand full-turn, half-turn lark drop-off and half-shoulder-waist carriage.');
 if(options.beats!==8||!Array.isArray(options.phaseBeats)||options.phaseBeats.length!==4||Reflect.ownKeys(options.phaseBeats).some(key=>typeof key!=='string'||!['0','1','2','3','length'].includes(key))||[1.25,4.5,1.25,1].some((n,i)=>!Object.hasOwn(options.phaseBeats,i)||options.phaseBeats[i]!==n))throw new Error('The reviewed revolving-door budget is exactly eight counts: 1.25 pickup, 4.5 carried half-turn, 1.25 free half-turn, one swing acquisition.');
 if(options.source!==undefined&&typeof options.source!=='string')throw new Error('Revolving-door source must be immutable text.');
 const origin={...options.frame.origin},across={...options.frame.across},along={x:-across.z,z:across.x};
 if(!finite(origin)||!finite(across)||Math.abs(Math.hypot(across.x,across.z)-1)>EPS)throw new Error('A finite origin and unit across-set frame are required.');
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*along.x+(p.z-origin.z)*along.z}),world=(p:Vec2)=>add(origin,add(scale(across,p.x),scale(along,p.z))),frameYaw=Math.atan2(along.x,along.z);
 const start=new Map(ids.map(id=>[id,local(entry.get(id)!.position)])),finish=new Map(ids.map(id=>[id,local(exit.get(id)!.position)])),pairs:Readonly<RevolvingDoorPair>[]=(options.pairs as readonly RevolvingDoorPair[]).map(p=>Object.freeze({carrierId:p.carrierId,carriedId:p.carriedId,relationship:p.relationship})),side=new Map<number,number>();
 if(pairs.length!==2||new Set(pairs.flatMap(p=>[p.carrierId,p.carriedId])).size!==4||pairs.some(p=>!ids.includes(p.carrierId)||!ids.includes(p.carriedId)||byId.get(p.carrierId)!.role!=='robin'||byId.get(p.carriedId)!.role!=='lark'||!['partner','neighbor'].includes(p.relationship)||relations[p.relationship].get(p.carrierId)!==p.carriedId)||pairs[0].relationship!==pairs[1].relationship)throw new Error('Two explicit disjoint robin/lark pairs must match one current incoming relationship.');
 const incoming=pairs[0].relationship,outgoing=incoming==='partner'?'neighbor':'partner';
 for(const pair of pairs){const r=start.get(pair.carrierId)!,l=start.get(pair.carriedId)!,s=Math.sign(r.x),yaw=frameYaw-s*Math.PI/2;
  if(!s||Math.abs(r.x-l.x)>EPS||Math.abs(r.z+l.z)>EPS||Math.sign(r.z)!==-s||Math.sign(l.z)!==s||Math.abs(r.x)<.65||Math.abs(r.x)>1.2||Math.abs(r.z)<.28||Math.abs(r.z)>.9)throw new Error('Revolving-door entry must name side-couples with lark on the left, robin on the right, facing across.');
  for(const id of[pair.carrierId,pair.carriedId]){if(Math.abs(turn(entry.get(id)!.yaw,yaw))>EPS)throw new Error('A revolving-door entry must explicitly face across.');side.set(id,s);}
 }
 if(side.get(pairs[0].carrierId)===side.get(pairs[1].carrierId))throw new Error('The carried couples must start on opposite sides.');
 for(const id of ids){const p=finish.get(id)!,s=byId.get(id)!.role==='robin'?side.get(id)!:-side.get(id)!,other=finish.get(relations[outgoing].get(id)!)!;
  if(Math.abs(p.x-s*.9)>EPS||Math.abs(p.z-(byId.get(id)!.role==='lark'?s:-s)*.31)>EPS||Math.abs(p.x-other.x)>EPS||Math.abs(turn(exit.get(id)!.yaw,heading(world(p),world(other))+Math.PI/3))>EPS)throw new Error('The named larks must cross, robins return to their own side, and the opposite current relation must meet in the declared swing frame.');
 }
 const angular=(beat:number)=>beat<=HALF?Math.PI*progress((beat-PICKUP)/CARRY):Math.PI+Math.PI*progress((beat-HALF)/FREE),halfTime=HALF;
 const raw=(id:number,beat:number):{position:Vec2;yaw:number}=>{
  if(!byId.has(id))throw new Error(`Actor ${id} is outside this revolving door.`);
  const s=side.get(id)!,robin=byId.get(id)!.role==='robin',source=start.get(id)!,initial=entry.get(id)!,dest=finish.get(id)!,final=exit.get(id)!,radius=robin?INNER:OUTER;
  // The first source count opens the carried pair into the radial promenade
  // hold. Pair spacing stays positive; no pose or identity is substituted.
  if(beat<=PICKUP){const q=ease(Math.pow(beat/PICKUP,1.15)),a=ease(Math.pow(beat/PICKUP,1.4)),pair=pairs.find(p=>p.carrierId===id||p.carriedId===id)!,r=start.get(pair.carrierId)!,l=start.get(pair.carriedId)!,half=Math.abs(r.z),pairX=r.x+((INNER+OUTER)/2*s*Math.cos(DIAGONAL)-r.x)*q,pairZ=-(INNER+OUTER)/2*s*Math.sin(DIAGONAL)*q,angle=(robin?-s:s)*Math.PI/2-(Math.PI/2+DIAGONAL)*a,spacing=half+((OUTER-INNER)/2-half)*q;return{position:world({x:pairX+spacing*Math.cos(angle),z:pairZ+spacing*Math.sin(angle)}),yaw:initial.yaw+(Math.PI/2+DIAGONAL)*a};}
  if(robin&&beat<=TURN_END||!robin&&beat<=halfTime){const a=(s===1?0:Math.PI)-DIAGONAL+angular(beat),yaw=initial.yaw+Math.PI/2+DIAGONAL-angular(beat);return{position:world({x:(radius+(!robin?.10*ease((beat-(HALF-1))/1):0))*Math.cos(a),z:(radius+(!robin?.10*ease((beat-(HALF-1))/1):0))*Math.sin(a)}),yaw};}
  if(!robin){
   // Drop on the opposite side after half the central turn; keep moving in a
   // small clockwise outside loop to the arriving opposite-relation robin.
   const q=progress((beat-halfTime)/(8-halfTime)),S=-s,D={x:S*(OUTER+.10)*Math.cos(DIAGONAL),z:-S*(OUTER+.10)*Math.sin(DIAGONAL)},A=add(D,{x:S*.15,z:S*.35}),B=add(dest,{x:S*.68,z:0}),v=1-q,point=add(add(scale(D,v*v*v),scale(A,3*v*v*q)),add(scale(B,3*v*q*q),scale(dest,q*q*q))),dropYaw=initial.yaw+Math.PI/2+DIAGONAL-Math.PI;return{position:world(point),yaw:dropYaw+turn(final.yaw,dropYaw)*q};
  }
  const q=ease((beat-TURN_END)/EXIT),p={x:s*INNER*Math.cos(DIAGONAL),z:-s*INNER*Math.sin(DIAGONAL)},from=initial.yaw+Math.PI/2+DIAGONAL-TAU;return{position:world(mix(p,dest,q)),yaw:from+turn(final.yaw,from)*q};
 };
 const root=(id:number,beat:number):RevolvingDoorPose=>{const p=raw(id,beat),h=1e-5,a=raw(id,Math.max(0,beat-h)),b=raw(id,Math.min(8,beat+h)),dt=Math.min(8,beat+h)-Math.max(0,beat-h);return{id,...p,velocity:{x:(b.position.x-a.position.x)/dt,z:(b.position.z-a.position.z)/dt},yawRate:turn(b.yaw,a.yaw)/dt};};
 const contactsAt=(beat:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[])=>{
  const p=new Map(poses.map(p=>[p.id,p]));if(p.size!==poses.length||ids.some(id=>!p.has(id))||poses.some(p=>!finite(p.position)||!Number.isFinite(p.yaw)))throw new Error('Revolving-door contacts require a unique finite pose for every named actor.');
  const contacts:HandContact[]=[],carry=smooth((halfTime-beat)/.4);
  for(const pair of pairs){const R=p.get(pair.carrierId)!,L=p.get(pair.carriedId)!;
   // A half-shoulder-waist hold has two directed body contacts, not a
   // fictitious joined hand. The robins' right hands stay available centrally.
   const waist={x:.13,y:1.18,z:-.13},shoulder={x:-.23,y:1.33,z:0},waistPoint=bodyPoint(R,waist),shoulderPoint=bodyPoint(L,shoulder);
   if(carry>0){const a=carry*smooth((.625-reach(waistPoint,L,'right'))/.025),b=carry*smooth((.625-reach(shoulderPoint,R,'left'))/.025);if(a>0)contacts.push({a:L.id,b:R.id,handA:'right',handB:'left',point:waistPoint,strength:a,kind:'courtesy',target:'waist',bodyPoint:waist});if(b>0)contacts.push({a:R.id,b:L.id,handA:'left',handB:'right',point:shoulderPoint,strength:b,kind:'courtesy',target:'upper-arm',bodyPoint:shoulder});}
  }
  const r=pairs.map(pair=>p.get(pair.carrierId)!),point={x:(r[0].position.x+r[1].position.x)/2,y:1.2,z:(r[0].position.z+r[1].position.z)/2},right=smooth((beat-PICKUP+.35)/.35)*smooth((TURN_END-beat)/.35)*smooth((.625-Math.max(...r.map(p=>reach(point,p,'right'))))/.025);
  if(right>0)contacts.push({a:r[0].id,b:r[1].id,handA:'right',handB:'right',point,strength:right,kind:'joined',target:'hands'});
  return contacts;
 };
 const sample=(beat:number):RevolvingDoorFrame=>{beat=sampleTime(beat,8);const poses=ids.map(id=>root(id,beat));return{beat,poses,contacts:contactsAt(beat,poses)};};
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=1600;i++){const f=sample(i/200);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.velocity.x,p.velocity.z));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 const budgets=[options.minimumClearance??.5,options.maximumSpeed??1.3,options.maximumYawRate??3.5];if(budgets.some(v=>!Number.isFinite(v)||v<=0))throw new Error('Revolving-door physical budgets must be finite and positive.');
 if(minimumObservedClearance<budgets[0]-EPS)throw new Error(`Revolving-door root clearance ${minimumObservedClearance} is below ${budgets[0]}.`);
 if(maximumObservedSpeed>budgets[1]+EPS)throw new Error(`Revolving-door speed ${maximumObservedSpeed} exceeds ${budgets[1]}.`);
 if(maximumObservedYawRate>budgets[2]+EPS)throw new Error(`Revolving-door yaw rate ${maximumObservedYawRate} exceeds ${budgets[2]}.`);
 return Object.freeze({beats:8 as const,epoch:relations.epoch,source:options.source,centerRole:'robin' as const,hand:'right' as const,direction:'right' as const,amount:1 as const,dropOffAfter:.5 as const,approachHold:'half-shoulder-waist' as const,phaseBeats:Object.freeze([1.25,4.5,1.25,1] as const),pairs:Object.freeze(pairs),entry:immutableMap(entry),exit:immutableMap(exit),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,phaseBoundaries:Object.freeze([0,.35,PICKUP-.35,PICKUP,HALF-1,HALF-.6,HALF-.4,HALF,TURN_END-.35,TURN_END,8]),sample,position:(id:number,t:number)=>raw(id,sampleTime(t*8,8)).position,facing:(id:number,t:number)=>raw(id,sampleTime(t*8,8)).yaw,contacts:(t:number,poses?:readonly Pose[])=>{const beat=sampleTime(t*8,8);return contactsAt(beat,poses??ids.map(id=>raw(id,beat)).map((p,i)=>({id:ids[i],...p})));}});
}
