/** Identity-explicit, contact-bearing ricochet hey. A bounce preserves its two
 * center slots, while a pass exchanges them. This is deliberately separate from
 * the ordinary hey graph: substituting an ordinary half hey changes identities.
 * Source: The Caller's Box glossary, “Ricochet hey”. Timing/geometry are declared
 * rehearsal interpretations, not an assertion that the source specifies them. */
import {compileHeyTrajectory,type HeyEventPlan,type PassEvent,type Point} from './hey.ts';
import type {HandContact,Role} from './types.ts';
export interface Ricochet {role:Role;occurrence:1|2;direction:'back-left'|'back-right';facing:'across';hands:'both';}
export interface RicochetConstraint {position:Point;yaw:number;}
export interface RicochetEvent {index:number;phase:'center'|'sides';action:'pass'|'ricochet';pairs:readonly (readonly [number,number])[];incomingOrder:readonly number[];outgoingOrder:readonly number[];shoulder:'left'|'right';role?:Role;occurrence?:number;direction?:'back-left'|'back-right';}
export interface RicochetHeyOptions {
 actors:readonly {id:number;role:Role;couple:number}[];entryOrder:readonly number[];
 partner:ReadonlyMap<number,number>;neighbor:ReadonlyMap<number,number>;
 epoch:number;bindingEpoch:number;beats:8|16;passes:4|8;centerShoulder:'left'|'right';endShoulder:'left'|'right';ricochets:readonly Ricochet[];
 entry:ReadonlyMap<number,RicochetConstraint>;exit:ReadonlyMap<number,RicochetConstraint>;
 origin:Point;gateBeats?:readonly number[];minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
}
export interface RicochetHeyPose {id:number;position:Point;yaw:number;velocity:Point;yawRate:number;}
export interface RicochetHeyPlan {
 readonly beats:number;readonly events:readonly RicochetEvent[];readonly gateBeats:readonly number[];readonly endOrder:readonly number[];
 readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;
 sample(beat:number):{beat:number;poses:RicochetHeyPose[];contacts:HandContact[]};
}
const EPS=1e-7,clamp=(v:number)=>Math.max(0,Math.min(1,v)),wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
const norm=(p:Point)=>Math.hypot(p.x,p.z),distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const smooth=(u:number)=>{u=clamp(u);return u*u*(3-2*u);};
const finite=(p:Point)=>p&&[p.x,p.z].every(Number.isFinite);
function poly(p:number,q:number,v:number,w:number,d:number){const x=q-p,V=v*d,W=w*d;return[p,V,0,10*x-6*V-4*W,-15*x+8*V+7*W,6*x-3*V-3*W];}
const evalPoly=(c:readonly number[],u:number)=>c.reduceRight((s,v)=>s*u+v,0);
const deriv=(c:readonly number[],d:number)=>c.slice(1).map((v,i)=>v*(i+1)/d);
const immutable=<T>(x:T):T=>{if(x&&typeof x==='object'){for(const v of Object.values(x))immutable(v);Object.freeze(x);}return x;};
export function compileRicochetHey(raw:RicochetHeyOptions):RicochetHeyPlan {
 const o={...raw,actors:raw.actors.map(a=>({...a})),entryOrder:[...raw.entryOrder],ricochets:raw.ricochets.map(r=>({...r})),origin:{...raw.origin}},ids=o.actors.map(a=>a.id),byId=new Map(o.actors.map(a=>[a.id,a]));
 if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!Number.isSafeInteger(id)||id<0)||o.actors.some(a=>!['lark','robin'].includes(a.role)||!Number.isSafeInteger(a.couple)||a.couple<0)||o.entryOrder.length!==4||new Set(o.entryOrder).size!==4||o.entryOrder.some(id=>!byId.has(id)))throw new Error('A ricochet hey requires four explicit stable actors and a complete entry order.');
 if(!Number.isSafeInteger(o.epoch)||o.epoch<0||o.epoch!==o.bindingEpoch)throw new Error('Ricochet hey relationship epoch is stale.');
 const partner=new Map(o.partner),neighbor=new Map(o.neighbor);
 for(const [kind,map]of [['partner',partner],['neighbor',neighbor]] as const)for(const id of ids){const other=map.get(id);if(other===undefined||other===id||!byId.has(other)||map.get(other)!==id||byId.get(id)!.role===byId.get(other)!.role||(kind==='partner')!==(byId.get(id)!.couple===byId.get(other)!.couple))throw new Error('Ricochet relationships must be reciprocal and agree with named partner identities.');}
 if(!finite(o.origin)||![8,16].includes(o.beats)||o.passes!==o.beats/2||!['left','right'].includes(o.centerShoulder)||!['left','right'].includes(o.endShoulder)||o.centerShoulder===o.endShoulder)throw new Error('Ricochet heys require an explicit four/eight-layer budget and opposite center/end shoulders.');
 if(!o.ricochets.length||o.ricochets.length>o.passes/2)throw new Error('At least one explicit ricochet occurrence is required.');
 const marks=new Map<string,Ricochet>();for(const r of o.ricochets){const k=r.role+':'+r.occurrence;if(Object.keys(r).some(k=>!['role','occurrence','direction','facing','hands'].includes(k))||!['lark','robin'].includes(r.role)||![1,2].includes(r.occurrence)||r.facing!=='across'||r.hands!=='both'||r.direction!==(o.centerShoulder==='right'?'back-left':'back-right')||marks.has(k))throw new Error('Ricochet role, occurrence, two hands, across-facing and shoulder-derived retreat direction must be explicit and consistent.');marks.set(k,r);}
 const copy=(m:ReadonlyMap<number,RicochetConstraint>)=>{if(m.size!==4||ids.some(id=>!m.has(id)))throw new Error('Every ricochet endpoint must name all four actors.');return new Map(ids.map(id=>{const p=m.get(id)!;if(!finite(p.position)||!Number.isFinite(p.yaw))throw new Error('Ricochet endpoints must have finite positions and facing.');return[id,{position:{...p.position},yaw:p.yaw}];}));},entry=copy(o.entry),exit=copy(o.exit);
 let order=[...o.entryOrder];const events:RicochetEvent[]=[],ordinary:PassEvent[]=[],occurrences={lark:0,robin:0},used=new Set<string>();
 for(let i=0;i<o.passes;i++){
  const phase=i%2===0?'center':'sides',incoming=[...order],pairs=(phase==='center'?[[order[1],order[2]]]:[[order[0],order[1]],[order[2],order[3]]]) as [number,number][],shoulder=phase==='center'?o.centerShoulder:o.endShoulder;
  let role:Role|undefined,occurrence:number|undefined,mark:Ricochet|undefined,selector:'larks'|'robins'|'partner'|'neighbor';
  if(phase==='center'){role=byId.get(order[1])!.role;if(byId.get(order[2])!.role!==role)throw new Error('The declared ricochet graph cannot resolve a same-role center pair.');occurrence=++occurrences[role];mark=marks.get(role+':'+occurrence);selector=role==='lark'?'larks':'robins';if(mark)used.add(role+':'+occurrence);}
  else{const kinds=pairs.map(([a,b])=>partner.get(a)===b?'partner':neighbor.get(a)===b?'neighbor':undefined);if(!kinds[0]||kinds.some(k=>k!==kinds[0]))throw new Error('Every ricochet hey side pass must resolve one explicit paired relationship.');selector=kinds[0];}
  if(phase==='center'){if(!mark)[order[1],order[2]]=[order[2],order[1]];}else{[order[0],order[1]]=[order[1],order[0]];[order[2],order[3]]=[order[3],order[2]];}
  events.push({index:i,phase,action:mark?'ricochet':'pass',pairs,incomingOrder:incoming,outgoingOrder:[...order],shoulder,...(role?{role,occurrence}:{}),...(mark?{direction:mark.direction}:{})});
  ordinary.push({phase,token:{raw:(selector==='larks'?'M':selector==='robins'?'W':selector==='partner'?'P':'N')+(shoulder==='right'?'R':'L'),selector,shoulder,completion:'complete',...(selector==='neighbor'?{neighborOrdinal:1}:{})},pairs:pairs.map(p=>p.map(String) as [string,string]),loopers:phase==='center'?[String(incoming[0]),String(incoming[3])]:[],incomingOrder:incoming.map(String),outgoingOrder:order.map(String)});
 }
 if(used.size!==marks.size)throw new Error('A ricochet occurrence is outside the declared pass budget; no requested bounce may be dropped.');
 // Endpoint station membership is a semantic condition, independent of loose
 // physical budgets. Exit compression may change spacing, never swap actors.
 const slotSigns=[[-1,-1],[-1,1],[1,-1],[1,1]],centerSign=o.centerShoulder==='right'?1:-1;
 for(const [map,stationOrder,label]of [[entry,o.entryOrder,'entry'],[exit,order,'exit']] as const)for(let slot=0;slot<4;slot++){const p=map.get(stationOrder[slot])!.position,[x,z]=slotSigns[slot];if(Math.sign(p.x-o.origin.x)!==x||Math.sign(p.z-o.origin.z)!==z*centerSign)throw new Error(`Ricochet ${label} station identity contradicts the explicit event permutation.`);}

 const gates=o.gateBeats?[...o.gateBeats]:o.passes===4?[2,3.75,5.5,7.25]:Array.from({length:o.passes},(_,i)=>2+i*1.75);
 if(gates.length!==o.passes||gates.some((g,i)=>!Number.isFinite(g)||g<=0||g>=o.beats||(i>0&&g<=gates[i-1])))throw new Error('All ricochet event times must be strictly ordered inside the source beat budget.');
 const base=compileHeyTrajectory({syntax:{source:'explicit ricochet graph geometry',beats:o.beats,fraction:o.passes===4?.5:1,axis:'across',tokens:ordinary.map(e=>e.token)},events:ordinary,needsPartialExit:false} as HeyEventPlan,{slotSpacing:1.05,passClearance:.66,origin:o.origin});
 type Knot={beat:number;poses:Map<number,{position:Point;velocity:Point;yaw:number}>};
 const knots:Knot[]=[{beat:0,poses:new Map(ids.map(id=>[id,{...entry.get(id)!,velocity:{x:0,z:0}}]))}],held=new Map<number,number>(),sign=o.centerShoulder==='right'?1:-1;
 for(const [i,e]of events.entries()){
  const poses=new Map(base.sample(2*i+1).poses.map(p=>[Number(p.id),{position:{...p.position},velocity:{...p.velocity},yaw:p.yaw}]));
  if(e.phase==='center'){for(const id of [e.incomingOrder[0],e.incomingOrder[3]])poses.get(id)!.position.x=o.origin.x+Math.sign(poses.get(id)!.position.x-o.origin.x)*1.20;for(const id of e.pairs[0])held.delete(id);}else for(const p of poses.values())p.position.x=o.origin.x+(p.position.x-o.origin.x)*(1/1.05);
  if(e.action==='ricochet')for(const [j,id]of e.pairs[0].entries()){const side=j===0?-1:1,p=poses.get(id)!;p.position={x:o.origin.x+side*.40,z:o.origin.z};p.velocity={x:0,z:side*sign*.22};p.yaw=-side*Math.PI/2;held.set(id,p.yaw);}
  for(const [id,yaw]of held)poses.get(id)!.yaw=yaw;
  knots.push({beat:gates[i],poses});
 }
 knots.push({beat:o.beats,poses:new Map(ids.map(id=>[id,{...exit.get(id)!,velocity:{x:0,z:0}}]))});
 const segments=knots.slice(1).map((b,i)=>{const a=knots[i],duration=b.beat-a.beat;return{start:a.beat,duration,curves:new Map(ids.map(id=>{const A=a.poses.get(id)!,B=b.poses.get(id)!;return[id,{x:poly(A.position.x,B.position.x,A.velocity.x,B.velocity.x,duration),z:poly(A.position.z,B.position.z,A.velocity.z,B.velocity.z,duration),yaw:poly(A.yaw,A.yaw+wrap(B.yaw-A.yaw),0,0,duration)}];}))};});
 const poseAt=(id:number,beat:number):RicochetHeyPose=>{const s=segments.find(s=>beat<=s.start+s.duration+EPS)??segments.at(-1)!,c=s.curves.get(id);if(!c)throw new Error('Actor outside this ricochet hey.');const u=clamp((beat-s.start)/s.duration);return{id,position:{x:evalPoly(c.x,u),z:evalPoly(c.z,u)},velocity:{x:evalPoly(deriv(c.x,s.duration),u),z:evalPoly(deriv(c.z,s.duration),u)},yaw:evalPoly(c.yaw,u),yawRate:evalPoly(deriv(c.yaw,s.duration),u)};};
 const sample=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('A ricochet sample beat must be finite.');beat=Math.max(0,Math.min(o.beats,beat));const poses=ids.map(id=>poseAt(id,beat)),contacts:HandContact[]=[];
  for(const e of events.filter(e=>e.action==='ricochet')){const delta=Math.abs(beat-gates[e.index]);if(delta>.35)continue;const[a,b]=e.pairs[0],A=poses.find(p=>p.id===a)!,B=poses.find(p=>p.id===b)!,strength=smooth((.35-delta)/.18);for(const handA of ['left','right'] as const){const side=handA==='left'?1:-1;contacts.push({a,b,handA,handB:handA==='left'?'right':'left',point:{x:(A.position.x+B.position.x)/2,y:1.32,z:(A.position.z+B.position.z)/2-side*.235*Math.sin(A.yaw)},strength,kind:'joined'});}}
  return{beat,poses,contacts};};
 const minimum=o.minimumClearance??.58,maximum=o.maximumSpeed??1.45,maxYaw=o.maximumYawRate??4;
 if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0))throw new Error('Ricochet physical budgets must be finite and positive.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=o.beats*160;i++){const f=sample(i/160);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,norm(p.velocity));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-EPS)throw new Error(`Ricochet root clearance ${minimumObservedClearance} is below ${minimum}.`);
 if(maximumObservedSpeed>maximum+EPS)throw new Error(`Ricochet speed ${maximumObservedSpeed} exceeds ${maximum}.`);
 if(maximumObservedYawRate>maxYaw+EPS)throw new Error(`Ricochet facing rate ${maximumObservedYawRate} exceeds ${maxYaw}.`);
 return Object.freeze({beats:o.beats,events:immutable(events),gateBeats:Object.freeze(gates),endOrder:Object.freeze([...order]),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample});
}
