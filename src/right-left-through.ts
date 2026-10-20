/** Identity-explicit right-and-left-through, deliberately not registered for playback.
 *
 * A source-level right-and-left-through does not imply right-hand contact in all
 * communities. The caller must explicitly choose the crossing hand, shoulder,
 * courtesy recipients, and physical leader/follower slots. This adapter supports
 * one eight-beat crossing with a conventional two-hand courtesy half-turn only.
 * It does not consume diagonal progression, subset, no-hands, or extra-facing
 * clauses. Reference: Caller's Box Glossary, Right and left through/Courtesy turn.
 * Role names describe actors; they NEVER choose who leads a courtesy turn.
 */
import type {Dancer,HandContact,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
export interface RightLeftConstraint {position:Vec2;yaw:number;velocity:Vec2;yawRate:number;}
export interface RightLeftCourtesyPair {leaderId:number;followerId:number;relationship:'partner'|'neighbor';}
export interface RightLeftThroughOptions {
 actors:readonly Dancer[];
 entry:ReadonlyMap<number,RightLeftConstraint>;
 exit:ReadonlyMap<number,RightLeftConstraint>;
 relations:BoundRelationships;bindingEpoch:number;
 crossingPairs:readonly (readonly [number,number])[];
 passingHand:'right';passingShoulder:'right';
 courtesyPairs:readonly RightLeftCourtesyPair[];
 courtesyHold:'left-front-right-waist';
 frame:{origin:Vec2;across:Vec2};
 beats:8;crossingBeats:4;
 /** Opt-in measured roots; ordinary callers retain the original geometry. */
 entryGeometry?:'measured-rectangle';
 minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
 source?:string;
}
export interface RightLeftPose extends RightLeftConstraint {id:number;acceleration:Vec2;yawAcceleration:number;}
export interface RightLeftFrame {beat:number;poses:RightLeftPose[];contacts:HandContact[];}
export interface RightLeftThroughPlan {
 readonly beats:8;readonly crossingBeats:4;readonly epoch:number;readonly passingHand:'right';readonly passingShoulder:'right';
 readonly courtesyHold:'left-front-right-waist';readonly source?:string;
 readonly courtesyPairs:readonly Readonly<RightLeftCourtesyPair>[];
 readonly crossingPairs:readonly (readonly [number,number])[];
 readonly entry:ReadonlyMap<number,Readonly<RightLeftConstraint>>;
 readonly exit:ReadonlyMap<number,Readonly<RightLeftConstraint>>;
 readonly phaseBoundaries:readonly number[];
 readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;
 sample(beat:number):RightLeftFrame;
 position(id:number,t:number):Vec2;
 facing(id:number,t:number,poses?:readonly Pose[]):number;
 contacts(t:number,poses?:readonly Pose[]):HandContact[];
}
const EPS=1e-7;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const finite=(p:Vec2)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const norm=(p:Vec2)=>Math.hypot(p.x,p.z);
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDifference=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
const ease=(x:number)=>{const t=clamp(x);return t*t*t*(10+t*(-15+6*t));};
const easeD=(x:number)=>x<=0||x>=1?0:30*x*x*(1-x)*(1-x);
const easeDD=(x:number)=>x<=0||x>=1?0:60*x*(1-x)*(1-2*x);
/** C2 acceleration/deceleration with a long constant-speed section. */
function progress(x:number):[number,number,number]{
 const t=clamp(x),r=.18,n=1-r;
 if(t>1-r){const[q,v,a]=progress(1-t);return[1-q,v,-a];}
 if(t<r){const u=t/r;return[r*(u*u*u-.5*u*u*u*u)/n,(3*u*u-2*u*u*u)/n,(6*u-6*u*u)/(r*n)];}
 return[(t-r/2)/n,1/n,0];
}
function polynomial(a:number,b:number,va:number,vb:number,duration:number):number[]{
 const d=b-a,u=va*duration,v=vb*duration;return[a,u,0,10*d-6*u-4*v,-15*d+8*u+7*v,6*d-3*u-3*v];
}
function evaluate(c:number[],u:number,duration:number):[number,number,number]{
 let p=0,v=0,a=0;for(let i=c.length-1;i>=0;i--)p=p*u+c[i];for(let i=c.length-1;i>=1;i--)v=v*u+c[i]*i;for(let i=c.length-1;i>=2;i--)a=a*u+c[i]*i*(i-1);return[p,v/duration,a/duration**2];
}
function immutableMap<K,V>(m:Map<K,V>):ReadonlyMap<K,V>{
 const view:ReadonlyMap<K,V>=Object.freeze({get size(){return m.size;},get:(k:K)=>m.get(k),has:(k:K)=>m.has(k),entries:()=>m.entries(),keys:()=>m.keys(),values:()=>m.values(),[Symbol.iterator]:()=>m[Symbol.iterator](),forEach:(fn:(v:V,k:K,m:ReadonlyMap<K,V>)=>void,thisArg?:unknown)=>m.forEach((v,k)=>fn.call(thisArg,v,k,view))});return view;
}
function constraint(p:RightLeftConstraint):Readonly<RightLeftConstraint>{
 if(!p||!finite(p.position)||!finite(p.velocity)||![p.yaw,p.yawRate].every(Number.isFinite)||Math.abs(p.yaw)>1e6||Math.max(Math.abs(p.position.x),Math.abs(p.position.z))>1e6)throw new Error('Finite explicit endpoint position, velocity, yaw, and yaw rate are required.');
 if(norm(p.velocity)>EPS||Math.abs(p.yawRate)>EPS)throw new Error('This isolated adapter requires stationary entry and exit derivatives; it cannot silently discard incoming motion.');
 return Object.freeze({position:Object.freeze({...p.position}),yaw:p.yaw,velocity:Object.freeze({...p.velocity}),yawRate:p.yawRate});
}
export function compileRightLeftThrough(options:RightLeftThroughOptions):RightLeftThroughPlan {
 const actors=options.actors.map(a=>Object.freeze({...a})),ids=actors.map(a=>a.id),actor=new Map(actors.map(a=>[a.id,a]));
 if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!Number.isSafeInteger(id)||id<0)||actors.some(a=>!['lark','robin'].includes(a.role)||!Number.isSafeInteger(a.couple)||a.couple<0))throw new Error('Exactly four unique stable actor identities, explicit roles, and persistent couple identities are required.');
 const epoch=options.relations.epoch;
 if(!Number.isSafeInteger(epoch)||epoch<0||!Number.isSafeInteger(options.bindingEpoch)||options.bindingEpoch!==epoch)throw new Error('The current relationship epoch must be a matching nonnegative safe integer.');
 const relations={partner:new Map(options.relations.partner),neighbor:new Map(options.relations.neighbor)};
 for(const kind of ['partner','neighbor'] as const)for(const id of ids){const other=relations[kind].get(id);if(other===undefined||other===id||!actor.has(other)||relations[kind].get(other)!==id||actor.get(other)!.role===actor.get(id)!.role)throw new Error(`The current ${kind} binding must be reciprocal, opposite-role, and within these four actors.`);if((actor.get(id)!.couple===actor.get(other)!.couple)!==(kind==='partner'))throw new Error(`The ${kind} binding contradicts persistent couple identity.`);}
 const copyMap=(m:ReadonlyMap<number,RightLeftConstraint>)=>{if(m.size!==4||ids.some(id=>!m.has(id)))throw new Error('Entry and exit maps must contain exactly the four stable actor identities.');return new Map(ids.map(id=>[id,constraint(m.get(id)!)]));};
 const entry=copyMap(options.entry),exit=copyMap(options.exit),{passingHand,passingShoulder,courtesyHold}=options;
 if(passingHand!=='right'||passingShoulder!=='right'||courtesyHold!=='left-front-right-waist')throw new Error('Explicit right-hand/right-shoulder crossing and left-front/right-waist courtesy hold are required; no-hands and modified turns are distinct variants.');
 if(options.beats!==8||options.crossingBeats!==4)throw new Error('This adapter requires an exact eight-beat budget, four crossing plus four courtesy, with no added steps.');
 if(options.source!==undefined&&typeof options.source!=='string')throw new Error('Source attribution must be an immutable string.');
 if(options.entryGeometry!==undefined&&options.entryGeometry!=='measured-rectangle')throw new Error('Unknown right-and-left-through entry geometry.');
 const measured=options.entryGeometry==='measured-rectangle';
 const beats=8 as const,origin={...options.frame.origin},across={...options.frame.across},along={x:-across.z,z:across.x};
 if(!finite(origin)||!finite(across)||Math.abs(norm(across)-1)>EPS)throw new Error('A finite world-space origin and unit across frame are required.');
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*along.x+(p.z-origin.z)*along.z});
 const world=(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*along.x,z:origin.z+p.x*across.z+p.z*along.z});
 const vector=(p:Vec2)=>({x:p.x*across.x+p.z*along.x,z:p.x*across.z+p.z*along.z});
 const start=new Map(ids.map(id=>[id,local(entry.get(id)!.position)])),finish=new Map(ids.map(id=>[id,local(exit.get(id)!.position)]));
 const pairs=options.courtesyPairs.map(p=>Object.freeze({...p})),crossing=options.crossingPairs.map(p=>Object.freeze([...p]) as readonly [number,number]);
 if(pairs.length!==2||new Set(pairs.flatMap(p=>[p.leaderId,p.followerId])).size!==4||pairs.some(p=>!ids.includes(p.leaderId)||!ids.includes(p.followerId)||!['partner','neighbor'].includes(p.relationship)||relations[p.relationship].get(p.leaderId)!==p.followerId))throw new Error('Two explicit, disjoint courtesy leader/follower pairs must match their named current relationship.');
 if(crossing.length!==2||crossing.some(p=>p.length!==2)||new Set(crossing.flat()).size!==4||crossing.flat().some(id=>!ids.includes(id)))throw new Error('Two explicit, disjoint crossing pairs must cover the same four actors.');
 const direction=new Map<number,number>(),isLeader=new Map<number,boolean>();
 for(const pair of pairs){
  const a=start.get(pair.leaderId)!,b=start.get(pair.followerId)!,A=finish.get(pair.leaderId)!,B=finish.get(pair.followerId)!,d=-Math.sign(a.x),entryYaw=Math.atan2(d*across.x,d*across.z);
  if(!d||Math.abs(a.x-b.x)>EPS||Math.abs(a.z+b.z)>EPS||Math.sign(a.z)!==-d||Math.sign(b.z)!==d||Math.abs(a.x)<.5||Math.abs(a.x)>1.2||Math.abs(a.z)<(measured?.55-EPS:.7)||Math.abs(a.z)>1.1)throw new Error('The courtesy leader must explicitly occupy the left slot of the incoming side-by-side pair; roles cannot be flipped to repair it.');
  if(Math.abs(A.x-B.x)>EPS||Math.sign(A.x)!==d||Math.abs(A.z+B.z)>EPS||Math.sign(A.z)!==d||Math.sign(B.z)!==-d||Math.abs(A.x)<.65||Math.abs(A.x)>1.2||Math.abs(A.z)<.34||Math.abs(A.z)>1.1)throw new Error('Explicit exit slots must exchange sides and reverse the same courtesy pair, with reachable turn space.');
  for(const id of[pair.leaderId,pair.followerId]){if(Math.abs(angleDifference(entry.get(id)!.yaw,entryYaw))>EPS||Math.abs(angleDifference(exit.get(id)!.yaw,entryYaw+Math.PI))>EPS)throw new Error('Entry must face across and exit must face back across; an extra final-facing clause requires a different declared plan.');direction.set(id,d);isLeader.set(id,id===pair.leaderId);}
 }
 if(new Set(pairs.map(p=>direction.get(p.leaderId))).size!==2)throw new Error('The two courtesy pairs must start on opposite sides.');
 for(const[a,b]of crossing){const A=start.get(a)!,B=start.get(b)!;if(direction.get(a)===direction.get(b)||Math.abs(A.z-B.z)>EPS||Math.abs(A.x+B.x)>EPS)throw new Error('The named crossing identities must face each other in the same incoming lane, not be chosen by proximity.');}
 const radius=.34,passRadius=measured?Math.min(.33,...[...start.values()].map(p=>Math.abs(p.z)/2)):.33,curves=new Map<number,{x:number[];z:number[]}[]>();
 for(const id of ids){const p=start.get(id)!,d=direction.get(id)!,out=finish.get(id)!,gate={x:0,z:p.z-d*passRadius},end={x:out.x,z:(isLeader.get(id)?-d:d)*radius},gateSpeed=d*.65;
  curves.set(id,[{x:polynomial(p.x,gate.x,0,gateSpeed,2),z:polynomial(p.z,gate.z,0,0,2)},{x:polynomial(gate.x,end.x,gateSpeed,0,2),z:polynomial(gate.z,end.z,0,0,2)}]);
 }
 const root=(id:number,beat:number):RightLeftPose=>{
  const p=entry.get(id);if(!p)throw new Error(`Actor ${id} is outside this bound right-and-left-through.`);
  if(beat<=4){const index=beat<2?0:1,u=(beat-index*2)/2,c=curves.get(id)![index],[x,vx,ax]=evaluate(c.x,u,2),[z,vz,az]=evaluate(c.z,u,2);return{id,position:world({x,z}),velocity:vector({x:vx,z:vz}),acceleration:vector({x:ax,z:az}),yaw:p.yaw,yawRate:0,yawAcceleration:0};}
  const t=beat-4,d=direction.get(id)!,sign=isLeader.get(id)?-d:d,out=finish.get(id)!,[q,v,a]=progress(t/3),theta=Math.PI*q,omega=Math.PI*v/3,alpha=Math.PI*a/9,u=t-3,delta=Math.abs(out.z)-radius,r=radius+delta*ease(u),rv=delta*easeD(u),ra=delta*easeDD(u);
  // Clockwise planar half-turn; yaw increases in Three.js's convention.
  const x=out.x+sign*r*Math.sin(theta),z=sign*r*Math.cos(theta),vx=sign*(rv*Math.sin(theta)+r*Math.cos(theta)*omega),vz=sign*(rv*Math.cos(theta)-r*Math.sin(theta)*omega),ax=sign*((ra-r*omega**2)*Math.sin(theta)+(2*rv*omega+r*alpha)*Math.cos(theta)),az=sign*((ra-r*omega**2)*Math.cos(theta)-(2*rv*omega+r*alpha)*Math.sin(theta));
  return{id,position:world({x,z}),velocity:vector({x:vx,z:vz}),acceleration:vector({x:ax,z:az}),yaw:p.yaw+theta,yawRate:omega,yawAcceleration:alpha};
 };
 const time=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');return Math.max(0,Math.min(8,beat));};
 const contactAt=(beat:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[]):HandContact[]=>{
  const byId=new Map(poses.map(p=>[p.id,p]));if(byId.size!==poses.length||ids.some(id=>!byId.has(id))||poses.some(p=>!finite(p.position)||!Number.isFinite(p.yaw)))throw new Error('Contacts require unique finite poses for every bound actor.');
  if(beat<3.3){const window=smooth((beat-.7)/.5)*smooth((3.3-beat)/.5);if(window===0)return[];return crossing.flatMap(([a,b])=>{const A=byId.get(a)!,B=byId.get(b)!,point={x:(A.position.x+B.position.x)/2,y:1.18,z:(A.position.z+B.position.z)/2},reach=(p:typeof A)=>Math.hypot(point.x-p.position.x+.235*Math.cos(p.yaw),point.y-1.355,point.z-p.position.z-.235*Math.sin(p.yaw)),strength=window*smooth((.64-Math.max(reach(A),reach(B)))/.06);return strength>0?[{a,b,handA:'right' as const,handB:'right' as const,point,strength,kind:'joined' as const}]:[];});}
  const strength=smooth((beat-3.3)/.5)*smooth((7.2-beat)/.2);if(!strength)return[];
  return pairs.flatMap(({leaderId:a,followerId:b})=>{const A=byId.get(a)!,B=byId.get(b)!,p={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2},yaw=A.yaw;return[
   {a,b,handA:'left' as const,handB:'left' as const,point:{x:p.x+Math.sin(yaw)*.23+Math.cos(yaw)*.12,y:1.16,z:p.z+Math.cos(yaw)*.23-Math.sin(yaw)*.12},strength,kind:'courtesy' as const},
   {a,b,handA:'right' as const,handB:'right' as const,point:{x:B.position.x-Math.sin(yaw)*.225-Math.cos(yaw)*.1,y:1.11,z:B.position.z-Math.cos(yaw)*.225+Math.sin(yaw)*.1},strength,kind:'courtesy' as const}
  ];});
 };
 const sample=(beat:number):RightLeftFrame=>{beat=time(beat);const poses=ids.map(id=>root(id,beat));return{beat,poses,contacts:contactAt(beat,poses)};};
 const minimum=options.minimumClearance??.5,maximum=options.maximumSpeed??1.2,maxYaw=options.maximumYawRate??2;
 if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0))throw new Error('Physical clearance, speed, and yaw-rate budgets must be finite and positive.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=1600;i++){const f=sample(i/200);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,norm(p.velocity));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-EPS)throw new Error(`Right-and-left-through root clearance ${minimumObservedClearance} is below ${minimum}.`);
 if(maximumObservedSpeed>maximum+EPS)throw new Error(`Right-and-left-through speed ${maximumObservedSpeed} exceeds ${maximum}.`);
 if(maximumObservedYawRate>maxYaw+EPS)throw new Error(`Right-and-left-through yaw rate ${maximumObservedYawRate} exceeds ${maxYaw}.`);
 return Object.freeze({beats,crossingBeats:4 as const,epoch,passingHand,passingShoulder,courtesyHold,source:options.source,courtesyPairs:Object.freeze(pairs),crossingPairs:Object.freeze(crossing),entry:immutableMap(entry),exit:immutableMap(exit),phaseBoundaries:Object.freeze([0,2,4,4.54,6.46,7,8]),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,time(t*beats)).position,facing:(id:number,t:number)=>root(id,time(t*beats)).yaw,contacts:(t:number,poses?:readonly Pose[])=>{const beat=time(t*beats);return contactAt(beat,poses??ids.map(id=>root(id,beat)));}});
}
