/** Identity-bound give-and-take: connected approach, a named role takes the
 * opposite person back to that role's original side, then releases into swing.
 * Counts and hold are explicit interpretations, never aliases for a circle.
 */
import type {Dancer,HandContact,Pose,Role,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
export interface GiveAndTakeConstraint {position:Vec2;yaw:number;velocity:Vec2;yawRate:number;}
export interface GiveAndTakePair {takerId:number;takenId:number;relationship:'partner'|'neighbor';}
export interface GiveAndTakeOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,GiveAndTakeConstraint>;exit:ReadonlyMap<number,GiveAndTakeConstraint>;
 relations:BoundRelationships;bindingEpoch:number;pairs:readonly GiveAndTakePair[];takeRole:Role;
 beats:8;phaseBeats:readonly [4,4];approachHold:'joined-inside';hands:'both';exitKind:'same-person-swing';
 frame:{origin:Vec2;across:Vec2};minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;source?:string;
}
export interface GiveAndTakePose extends GiveAndTakeConstraint {id:number;acceleration:Vec2;yawAcceleration:number;}
export interface GiveAndTakeFrame {beat:number;poses:GiveAndTakePose[];contacts:HandContact[];}
export interface GiveAndTakePlan {
 readonly source?:string;readonly beats:8;readonly phaseBeats:readonly [4,4];readonly epoch:number;readonly takeRole:Role;
 readonly pairs:readonly Readonly<GiveAndTakePair>[];readonly entry:ReadonlyMap<number,Readonly<GiveAndTakeConstraint>>;readonly exit:ReadonlyMap<number,Readonly<GiveAndTakeConstraint>>;
 readonly phaseBoundaries:readonly number[];readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;
 sample(beat:number):GiveAndTakeFrame;position(id:number,t:number):Vec2;facing(id:number,t:number,poses?:readonly Pose[]):number;contacts(t:number,poses?:readonly Pose[]):HandContact[];
}
const EPS=1e-7;
const clamp=(t:number)=>Math.max(0,Math.min(1,t));
const smooth=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
const ease=(t:number)=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
const easeD=(t:number)=>t<=0||t>=1?0:30*t*t*(1-t)*(1-t);
const easeDD=(t:number)=>t<=0||t>=1?0:60*t*(1-t)*(1-2*t);
const finite=(p:Vec2)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const distance=(a:Vec2,b:Vec2={x:0,z:0})=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDifference=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function immutableMap<K,V>(m:Map<K,V>):ReadonlyMap<K,V>{const view:ReadonlyMap<K,V>=Object.freeze({get size(){return m.size;},get:(k:K)=>m.get(k),has:(k:K)=>m.has(k),entries:()=>m.entries(),keys:()=>m.keys(),values:()=>m.values(),[Symbol.iterator]:()=>m[Symbol.iterator](),forEach:(fn:(v:V,k:K,m:ReadonlyMap<K,V>)=>void,thisArg?:unknown)=>m.forEach((v,k)=>fn.call(thisArg,v,k,view))});return view;}
function copyConstraint(p:GiveAndTakeConstraint):Readonly<GiveAndTakeConstraint>{
 if(!p||!finite(p.position)||!finite(p.velocity)||![p.yaw,p.yawRate].every(Number.isFinite)||Math.max(Math.abs(p.position.x),Math.abs(p.position.z),Math.abs(p.yaw))>1e6)throw new Error('Finite explicit entry and exit position, yaw and derivatives are required.');
 if(distance(p.velocity)>EPS||Math.abs(p.yawRate)>EPS)throw new Error('This adapter requires stationary endpoint derivatives; it cannot discard incoming motion.');
 return Object.freeze({position:Object.freeze({...p.position}),yaw:p.yaw,velocity:Object.freeze({...p.velocity}),yawRate:p.yawRate});
}
export function compileGiveAndTake(o:GiveAndTakeOptions):GiveAndTakePlan {
 const actors=o.actors.map(a=>Object.freeze({...a})),ids=actors.map(a=>a.id),actor=new Map(actors.map(a=>[a.id,a]));
 if(ids.length!==4||new Set(ids).size!==4||actors.some(a=>!Number.isSafeInteger(a.id)||a.id<0||!['lark','robin'].includes(a.role)||!Number.isSafeInteger(a.couple)||a.couple<0))throw new Error('Exactly four unique stable actor identities with explicit roles and couples are required.');
 if(o.source!==undefined&&typeof o.source!=='string')throw new Error('Source attribution must be a string.');
 const source=o.source,epoch=o.relations.epoch;if(!Number.isSafeInteger(epoch)||epoch<0||epoch!==o.bindingEpoch)throw new Error('A matching current relationship epoch is required.');
 const relations={partner:new Map(o.relations.partner),neighbor:new Map(o.relations.neighbor)};
 for(const kind of ['partner','neighbor'] as const)for(const id of ids){const other=relations[kind].get(id);if(other===undefined||other===id||!actor.has(other)||relations[kind].get(other)!==id||actor.get(other)!.role===actor.get(id)!.role||(actor.get(other)!.couple===actor.get(id)!.couple)!==(kind==='partner'))throw new Error('Give-and-take requires reciprocal bound partner/neighbor identities consistent with persistent couples.');}
 const copyMap=(m:ReadonlyMap<number,GiveAndTakeConstraint>)=>{if(m.size!==4||ids.some(id=>!m.has(id)))throw new Error('Endpoint maps must contain exactly the four stable actor identities.');return new Map(ids.map(id=>[id,copyConstraint(m.get(id)!)]));};
 const entry=copyMap(o.entry),exit=copyMap(o.exit),pairs=o.pairs.map(p=>Object.freeze({...p})),takeRole=o.takeRole;
 if(!['lark','robin'].includes(takeRole)||pairs.length!==2||new Set(pairs.flatMap(p=>[p.takerId,p.takenId])).size!==4||pairs.some(p=>actor.get(p.takerId)?.role!==takeRole||!['partner','neighbor'].includes(p.relationship)||relations[p.relationship]?.get(p.takerId)!==p.takenId)||pairs[0].relationship!==pairs[1].relationship)throw new Error('Two disjoint taking pairs must name the selected role and the same current relationship.');
 if(o.beats!==8||!Array.isArray(o.phaseBeats)||o.phaseBeats.length!==2||o.phaseBeats[0]!==4||o.phaseBeats[1]!==4||o.approachHold!=='joined-inside'||o.hands!=='both'||o.exitKind!=='same-person-swing')throw new Error('This adapter consumes exactly four connected approach counts and four take/release counts, both hands, and a same-person swing exit.');
 const origin={...o.frame.origin},across={...o.frame.across},along={x:-across.z,z:across.x};if(!finite(origin)||!finite(across)||Math.abs(distance(across)-1)>EPS)throw new Error('An explicit finite origin and unit across-set frame are required.');
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*along.x+(p.z-origin.z)*along.z});
 const world=(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*along.x,z:origin.z+p.x*across.z+p.z*along.z});
 const vector=(p:Vec2)=>({x:p.x*across.x+p.z*along.x,z:p.x*across.z+p.z*along.z});
 const start=new Map(ids.map(id=>[id,local(entry.get(id)!.position)])),side=new Map<number,number>(),pairOf=new Map<number,Readonly<GiveAndTakePair>>();
 for(const pair of pairs){const A=start.get(pair.takerId)!,B=start.get(pair.takenId)!,s=Math.sign(A.x);if(!s||Math.abs(Math.abs(A.x)-.9)>EPS||Math.abs(A.x+B.x)>EPS||Math.abs(A.z-B.z)>EPS||Math.abs(Math.abs(A.z)-.45)>EPS)throw new Error('The received pair must face directly across from compact .90-wide side couples at explicit .90 sidelines.');
  for(const id of[pair.takerId,pair.takenId]){const p=start.get(id)!,expectedYaw=Math.atan2(-Math.sign(p.x)*across.x,-Math.sign(p.x)*across.z);if(Math.abs(angleDifference(entry.get(id)!.yaw,expectedYaw))>EPS)throw new Error('Incoming side couples must face across.');side.set(id,s);pairOf.set(id,pair);const expectedZ=(actor.get(id)!.role==='lark'?s:-s)*.31,expected=world({x:s*.9,z:expectedZ}),yaw=Math.atan2(-expectedZ*along.x,-expectedZ*along.z)+Math.PI/3;if(distance(exit.get(id)!.position,expected)>EPS||Math.abs(angleDifference(exit.get(id)!.yaw,yaw))>EPS)throw new Error('Each named person must finish in the prepared swing on the taker’s original side; endpoint identity cannot be swapped.');}
 }
 if(new Set(pairs.map(p=>side.get(p.takerId))).size!==2||new Set(pairs.map(p=>start.get(p.takerId)!.z)).size!==2)throw new Error('The two takers must occupy opposite sides and distinct across-set lanes.');
 const sidePairs=[-1,1].map(s=>{const people=ids.filter(id=>Math.sign(start.get(id)!.x)===s),a=people.find(id=>actor.get(id)!.role==='lark')!,b=people.find(id=>actor.get(id)!.role==='robin')!;if(people.length!==2||a===undefined||b===undefined||Math.sign(start.get(a)!.z)!==s||relations[pairs[0].relationship==='partner'?'neighbor':'partner'].get(a)!==b)throw new Error('Connected incoming side couples must retain the opposite bound relationship with the lark in the left slot.');return{a,b};});
 const turn=takeRole==='lark'?Math.PI/2:-Math.PI/2;
 const root=(id:number,beat:number):GiveAndTakePose=>{
  const p=start.get(id);if(!p)throw new Error(`Actor ${id} is outside this bound give-and-take.`);const initial=entry.get(id)!;
  if(beat<=4){const u=beat/4,dx=Math.sign(p.x)*(.42-.9);return{id,position:world({x:p.x+dx*ease(u),z:p.z}),velocity:vector({x:dx*easeD(u)/4,z:0}),acceleration:vector({x:dx*easeDD(u)/16,z:0}),yaw:initial.yaw,yawRate:0,yawAcceleration:0};}
  const pair=pairOf.get(id)!,s=side.get(id)!,sign=id===pair.takerId?1:-1,lane=start.get(pair.takerId)!.z,u=(beat-4)/1.6,v=(beat-5.6)/2.4,q=ease(v),qd=easeD(v)/2.4,qdd=easeDD(v)/2.4**2,theta=turn*q,omega=turn*qd,alpha=turn*qdd,r=.42-.11*q,rd=-.11*qd,rdd=-.11*qdd,cx=s*.9*ease(u),cz=lane*(1-q),vx=s*.9*easeD(u)/1.6,vz=-lane*qd,ax=s*.9*easeDD(u)/1.6**2,az=-lane*qdd,c=Math.cos(theta),sn=Math.sin(theta),k=s*sign;
  const position=world({x:cx+k*r*c,z:cz+k*r*sn}),velocity=vector({x:vx+k*(rd*c-r*sn*omega),z:vz+k*(rd*sn+r*c*omega)}),acceleration=vector({x:ax+k*((rdd-r*omega**2)*c-(2*rd*omega+r*alpha)*sn),z:az+k*((rdd-r*omega**2)*sn+(2*rd*omega+r*alpha)*c)});
  // Turn the connected pair only after its lane has cleared the middle. The
  // final framing angle belongs to these four source counts, not an extra lead.
  const delta=-turn+Math.PI/3;return{id,position,velocity,acceleration,yaw:initial.yaw+delta*q,yawRate:delta*qd,yawAcceleration:delta*qdd};
 };
 const time=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');return Math.max(0,Math.min(8,beat));};
 const contactAt=(beat:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[]):HandContact[]=>{
  const byId=new Map(poses.map(p=>[p.id,p]));if(byId.size!==poses.length||ids.some(id=>!byId.has(id))||poses.some(p=>!finite(p.position)||!Number.isFinite(p.yaw)))throw new Error('Contacts require unique finite poses for all bound actors.');
  const inside=smooth(beat/.5)*smooth((3.1-beat)/.5),taken=smooth((beat-3.1)/.5)*smooth((6.65-beat)/.45);const contacts:HandContact[]=[];
  if(inside>0)for(const{a,b}of sidePairs){const A=byId.get(a)!,B=byId.get(b)!;contacts.push({a,b,handA:'right',handB:'left',point:{x:(A.position.x+B.position.x)/2+Math.sin(A.yaw)*.15,y:1.16,z:(A.position.z+B.position.z)/2+Math.cos(A.yaw)*.15},strength:inside,kind:'joined'});}
  if(taken>0)for(const{takerId:a,takenId:b}of pairs){const A=byId.get(a)!,B=byId.get(b)!,yaw=Math.atan2(B.position.x-A.position.x,B.position.z-A.position.z);for(const hand of['left','right']as const){const sign=hand==='left'?1:-1;contacts.push({a,b,handA:hand,handB:hand==='left'?'right':'left',point:{x:(A.position.x+B.position.x)/2+sign*.22*Math.cos(yaw),y:1.20,z:(A.position.z+B.position.z)/2-sign*.22*Math.sin(yaw)},strength:taken,kind:'joined'});}}
  return contacts;
 };
 const sample=(beat:number):GiveAndTakeFrame=>{beat=time(beat);const poses=ids.map(id=>root(id,beat));return{beat,poses,contacts:contactAt(beat,poses)};};
 const minimum=o.minimumClearance??.6,maximum=o.maximumSpeed??1.2,maxYaw=o.maximumYawRate??2.2;if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0))throw new Error('Finite positive clearance and speed budgets are required.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=1600;i++){const f=sample(i/200);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.velocity));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-EPS)throw new Error(`Give-and-take root clearance ${minimumObservedClearance} is below ${minimum}.`);if(maximumObservedSpeed>maximum+EPS)throw new Error(`Give-and-take speed ${maximumObservedSpeed} exceeds ${maximum}.`);if(maximumObservedYawRate>maxYaw+EPS)throw new Error(`Give-and-take yaw rate ${maximumObservedYawRate} exceeds ${maxYaw}.`);
 return Object.freeze({source,beats:8 as const,phaseBeats:Object.freeze([4,4]as const),epoch,takeRole,pairs:Object.freeze(pairs),entry:immutableMap(entry),exit:immutableMap(exit),phaseBoundaries:Object.freeze([0,.5,2.6,3.1,3.6,4,5.6,6.2,6.65,8]),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,time(t*8)).position,facing:(id:number,t:number)=>root(id,time(t*8)).yaw,contacts:(t:number,poses?:readonly Pose[])=>{const beat=time(t*8);return contactAt(beat,poses??ids.map(id=>root(id,beat)));}});
}
