/** Hand-free shoulder round with named actors and a checked relationship epoch.
 * A gyre is not a no-hands allemande alias: facing follows the other actor,
 * no hand contact is declared, and every turn and preparation uses its budget.
 */
import type {Dancer,HandContact,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
export type GyreRelation='partner'|'neighbor'|'larks'|'robins';
export interface GyreConstraint {position:Vec2;yaw:number;velocity:Vec2;yawRate:number;}
export interface GyrePair {a:number;b:number;relationship:GyreRelation;}
export interface GyreOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,GyreConstraint>;exit:ReadonlyMap<number,GyreConstraint>;
 relations:BoundRelationships;bindingEpoch:number;pairs:readonly GyrePair[];
 passingShoulder:'left'|'right';amount:number;beats:number;
 /** Compact free orbit; source choreography determines turns, not this radius. */
 orbitRadius?:number;minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
 source?:string;
}
export interface GyrePose extends GyreConstraint {id:number;}
export interface GyreFrame {beat:number;poses:GyrePose[];contacts:HandContact[];}
export interface GyrePlan {
 readonly beats:number;readonly epoch:number;readonly passingShoulder:'left'|'right';readonly amount:number;
 readonly pairs:readonly Readonly<GyrePair>[];readonly source?:string;
 readonly entry:ReadonlyMap<number,Readonly<GyreConstraint>>;readonly exit:ReadonlyMap<number,Readonly<GyreConstraint>>;
 readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;
 sample(beat:number):GyreFrame;position(id:number,t:number):Vec2;facing(id:number,t:number,poses?:readonly Pose[]):number;contacts(t?:number,poses?:readonly Pose[]):HandContact[];
}
const EPS=1e-7,TAU=2*Math.PI;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const t=clamp(x);return t*t*t*(10+t*(-15+6*t));};
const norm=(p:Vec2)=>Math.hypot(p.x,p.z);
const finite=(p:Vec2)=>p&&[p.x,p.z].every(Number.isFinite);
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
function progress(x:number):number {const t=clamp(x),r=.16,n=1-r;if(t>1-r)return 1-progress(1-t);if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}return(t-r/2)/n;}
function immutableMap<K,V>(m:Map<K,V>):ReadonlyMap<K,V>{const view:ReadonlyMap<K,V>=Object.freeze({get size(){return m.size;},get:(k:K)=>m.get(k),has:(k:K)=>m.has(k),entries:()=>m.entries(),keys:()=>m.keys(),values:()=>m.values(),[Symbol.iterator]:()=>m[Symbol.iterator](),forEach:(fn:(v:V,k:K,m:ReadonlyMap<K,V>)=>void,thisArg?:unknown)=>m.forEach((v,k)=>fn.call(thisArg,v,k,view))});return view;}
export function compileGyre(options:GyreOptions):GyrePlan {
 const actors=options.actors.map(a=>Object.freeze({...a})),ids=actors.map(a=>a.id),byId=new Map(actors.map(a=>[a.id,a]));
 if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!Number.isSafeInteger(id)||id<0)||actors.some(a=>!['lark','robin'].includes(a.role)||!Number.isSafeInteger(a.couple)||a.couple<0))throw new Error('A gyre group requires four stable actor identities, roles and persistent couple identities.');
 const epoch=options.relations.epoch;
 if(!Number.isSafeInteger(epoch)||epoch<0||epoch!==options.bindingEpoch)throw new Error('A gyre requires a matching current relationship epoch.');
 const relations={partner:new Map(options.relations.partner),neighbor:new Map(options.relations.neighbor)};
 for(const kind of ['partner','neighbor'] as const)for(const id of ids){const other=relations[kind].get(id);if(other===undefined||other===id||!byId.has(other)||relations[kind].get(other)!==id||byId.get(id)!.role===byId.get(other)!.role||(kind==='partner')!==(byId.get(id)!.couple===byId.get(other)!.couple))throw new Error(`Gyre ${kind} bindings must be reciprocal and agree with persistent identities.`);}
 const copy=(map:ReadonlyMap<number,GyreConstraint>)=>{if(map.size!==4||ids.some(id=>!map.has(id)))throw new Error('Gyre endpoints must contain exactly every bound actor.');return new Map(ids.map(id=>{const p=map.get(id)!;if(!p||!finite(p.position)||!finite(p.velocity)||![p.yaw,p.yawRate].every(Number.isFinite)||Math.max(Math.abs(p.position.x),Math.abs(p.position.z),Math.abs(p.yaw))>1e6)throw new Error('Gyre endpoint position, facing and derivatives must be explicit and finite.');if(norm(p.velocity)>EPS||Math.abs(p.yawRate)>EPS)throw new Error('This gyre adapter requires stationary endpoint derivatives; incoming motion cannot be discarded.');return[id,Object.freeze({position:Object.freeze({...p.position}),yaw:p.yaw,velocity:Object.freeze({...p.velocity}),yawRate:p.yawRate})];}));};
 const entry=copy(options.entry),exit=copy(options.exit),pairs=options.pairs.map(p=>Object.freeze({...p}));
 if(!pairs.length||pairs.length>2||new Set(pairs.flatMap(p=>[p.a,p.b])).size!==pairs.length*2)throw new Error('A gyre requires one or two disjoint, explicitly named pairs.');
 for(const p of pairs){const a=byId.get(p.a),b=byId.get(p.b);if(!a||!b||a.id===b.id||!['partner','neighbor','larks','robins'].includes(p.relationship))throw new Error('A gyre pair must name actors in this bound group and an explicit relationship.');if(p.relationship==='partner'||p.relationship==='neighbor'){if(relations[p.relationship].get(p.a)!==p.b)throw new Error('The named gyre pair contradicts its bound relationship.');}else if(a.role!==(p.relationship==='larks'?'lark':'robin')||b.role!==a.role||a.couple===b.couple)throw new Error('A same-role gyre must name the two actors of that role.');}
 const {beats,amount,passingShoulder}=options;
 if(!Number.isInteger(beats)||beats<4||beats>32||!Number.isFinite(amount)||amount<=0||amount>2||!['left','right'].includes(passingShoulder))throw new Error('Gyre duration, shoulder and positive turn amount must be explicit: 4–32 whole beats and at most two turns.');
 if(options.source!==undefined&&typeof options.source!=='string')throw new Error('Gyre source attribution must be a string.');
 const radius=options.orbitRadius??.40,sign=passingShoulder==='right'?1:-1;
 if(!Number.isFinite(radius)||radius<.34||radius>.70)throw new Error('The free-gyre orbit radius must be between .34 and .70 units.');
 const data=new Map<number,{center:Vec2;theta:number;entryRadius:number;exitRadius:number;entryYaw:number;exitYaw:number;other:number}>();
 for(const pair of pairs){const A=entry.get(pair.a)!,B=entry.get(pair.b)!,X=exit.get(pair.a)!,Y=exit.get(pair.b)!,center={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2},endCenter={x:(X.position.x+Y.position.x)/2,z:(X.position.z+Y.position.z)/2},gap=distance(A.position,B.position),endGap=distance(X.position,Y.position);
  if(distance(center,endCenter)>EPS||gap<.62-EPS||gap>2.6+EPS||endGap<.62-EPS||endGap>2.6+EPS)throw new Error('Gyre endpoints must retain the named pair center with a reachable .62–2.6-unit pair spacing.');
  for(const[id,other]of[[pair.a,pair.b],[pair.b,pair.a]]){const start=entry.get(id)!,end=exit.get(id)!,theta=Math.atan2(start.position.z-center.z,start.position.x-center.x),endTheta=Math.atan2(end.position.z-center.z,end.position.x-center.x),natural=-theta-Math.PI/2,terminal=natural-sign*TAU*amount;
   if(Math.abs(wrap(endTheta-theta-sign*TAU*amount))>EPS)throw new Error('Gyre exit slots contradict its explicit shoulder and amount; no silent extra turn is allowed.');
   const entryYaw=natural+wrap(start.yaw-natural),exitYaw=terminal+wrap(end.yaw-terminal);
   if(Math.abs(entryYaw-natural)>Math.PI*.75+EPS||Math.abs(exitYaw-terminal)>Math.PI*.75+EPS)throw new Error('Gyre entry or exit facing requires an unsupported extra body turn.');
   data.set(id,{center,theta,entryRadius:gap/2,exitRadius:endGap/2,entryYaw,exitYaw,other});
  }
 }
 for(const id of ids)if(!data.has(id)){const a=entry.get(id)!,b=exit.get(id)!;if(distance(a.position,b.position)>EPS||Math.abs(wrap(a.yaw-b.yaw))>EPS)throw new Error('An actor outside the named gyre pairs must retain the explicit entry pose.');}
 const time=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('A gyre sample beat must be finite.');return Math.max(0,Math.min(beats,beat));};
 const point=(id:number,beat:number):{position:Vec2;yaw:number}=>{const e=entry.get(id);if(!e)throw new Error('The actor is outside this bound gyre.');const d=data.get(id);if(!d)return{position:{...e.position},yaw:e.yaw};const t=beat/beats,q=progress((beat-.25)/(beats-.25)),gather=Math.min(1.25,beats*.25),release=Math.min(1.25,beats*.25),r=radius+(d.entryRadius-radius)*(1-ease(beat/gather))+(d.exitRadius-radius)*ease((beat-(beats-release))/release),theta=d.theta+sign*TAU*amount*q,natural=-theta-Math.PI/2,startNatural=-d.theta-Math.PI/2,endNatural=startNatural-sign*TAU*amount;
  return{position:{x:d.center.x+r*Math.cos(theta),z:d.center.z+r*Math.sin(theta)},yaw:natural+(d.entryYaw-startNatural)*(1-ease(beat/Math.min(1.25,beats*.3125)))+(d.exitYaw-endNatural)*ease((beat-(beats-release))/release)};};
 const pose=(id:number,beat:number):GyrePose=>{const p=point(id,beat),h=1e-5,a=point(id,Math.max(0,beat-h)),b=point(id,Math.min(beats,beat+h)),duration=Math.min(beats,beat+h)-Math.max(0,beat-h);return{id,...p,velocity:beat===0||beat===beats?{x:0,z:0}:{x:(b.position.x-a.position.x)/duration,z:(b.position.z-a.position.z)/duration},yawRate:beat===0||beat===beats?0:(b.yaw-a.yaw)/duration};};
 const sample=(beat:number):GyreFrame=>{beat=time(beat);return{beat,poses:ids.map(id=>pose(id,beat)),contacts:[]};};
 const minimum=options.minimumClearance??.60,maximum=options.maximumSpeed??1.5,maxYaw=options.maximumYawRate??3.2;
 if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0))throw new Error('Gyre physical budgets must be finite and positive.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=beats*120;i++){const f=sample(i/120);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,norm(p.velocity));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-EPS)throw new Error(`Gyre root clearance ${minimumObservedClearance} is below ${minimum}.`);
 if(maximumObservedSpeed>maximum+EPS)throw new Error(`Gyre speed ${maximumObservedSpeed} exceeds ${maximum}.`);
 if(maximumObservedYawRate>maxYaw+EPS)throw new Error(`Gyre facing rate ${maximumObservedYawRate} exceeds ${maxYaw}.`);
 return Object.freeze({beats,epoch,passingShoulder,amount,pairs:Object.freeze(pairs),source:options.source,entry:immutableMap(entry),exit:immutableMap(exit),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>point(id,time(t*beats)).position,facing:(id:number,t:number)=>point(id,time(t*beats)).yaw,contacts:()=>[]});
}
