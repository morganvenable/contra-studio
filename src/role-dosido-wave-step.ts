/** A literal full same-role do-si-do, ending at the same stations facing a wave.
 * Pacing convention: one count facing preparation, 5.5 full-orbit counts,
 * and 1.5 counts to face the explicitly declared wave, within the source eight.
 * No hands are invented here: the full-set producer owns reached wave contacts. */
import {capturePlainData} from './owned-program-cache.ts';
import {ownSequenceBoundary,advanceSequenceBeat,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {Role,Vec2} from './types.ts';
export interface RoleDosidoWaveSpec {beats:8;role:Role;shoulder:'right';inwardRole:Role;}
const EPS=1e-7,LANE=.34,STEPS=1024,RAMP=.12;
const clamp=(t:number)=>{if(!Number.isFinite(t))throw Error('Sample time must be finite.');return Math.max(0,Math.min(1,t));};
const ease=(t:number)=>t*t*t*(10+t*(-15+6*t));
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
const paced=(t:number):number=>t<RAMP?RAMP*((t/RAMP)**3-.5*(t/RAMP)**4)/(1-RAMP):t>1-RAMP?1-paced(1-t):(t-RAMP/2)/(1-RAMP);
export function compileRoleDosidoWaveStep(input:SequenceBoundary,raw:RoleDosidoWaveSpec):SequencedMotionPlan {
 const entryState=ownSequenceBoundary(input),spec=capturePlainData(raw);
 if(Object.keys(spec).some(k=>!['beats','role','shoulder','inwardRole'].includes(k))||spec.beats!==8||spec.shoulder!=='right'||!['lark','robin'].includes(spec.role)||!['lark','robin'].includes(spec.inwardRole))throw Error('Full role do-si-do wave requires eight counts, right shoulder and explicit roles.');
 if(entryState.heldContacts.length)throw Error('Role do-si-do requires actually released hands.');
 const poses=new Map(entryState.poses.map(p=>[p.id,p])),actors=new Map(entryState.actors.map(a=>[a.id,a])),active=entryState.actors.filter(a=>a.role===spec.role).map(a=>a.id);
 if(poses.size!==4||active.length!==2||entryState.actors.filter(a=>a.role!==spec.role).length!==2)throw Error('A role do-si-do box requires two actual dancers of each role.');
 const center={x:entryState.poses.reduce((n,p)=>n+p.position.x/4,0),z:entryState.poses.reduce((n,p)=>n+p.position.z/4,0)},width=Math.abs(entryState.poses[0].position.x-center.x),depth=Math.abs(entryState.poses[0].position.z-center.z);
 if(width<.6||width>1.1||depth<.35||depth>.65||entryState.poses.some(p=>Math.abs(Math.abs(p.position.x-center.x)-width)>EPS||Math.abs(Math.abs(p.position.z-center.z)-depth)>EPS)||new Set(entryState.poses.map(p=>`${Math.sign(p.position.x-center.x)}:${Math.sign(p.position.z-center.z)}`)).size!==4)throw Error('Role do-si-do wave requires measured rectangular wave-range stations.');
 const A=poses.get(active[0])!,B=poses.get(active[1])!;
 if(Math.abs(A.position.x+B.position.x-2*center.x)>EPS||Math.abs(A.position.z+B.position.z-2*center.z)>EPS)throw Error('Named roles must be at opposite actual stations.');
 const halfSpan=Math.hypot(A.position.x-B.position.x,A.position.z-B.position.z)/2,arc=[0],step=2*Math.PI/STEPS,speed=(a:number)=>Math.hypot(halfSpan*Math.sin(a),LANE*Math.cos(a));
 for(let n=1;n<=STEPS;n++){const a=(n-1)*step,b=n*step;arc.push(arc[n-1]+step*(speed(a)+4*speed((a+b)/2)+speed(b))/6);}
 const angleAt=(t:number)=>{if(t<=0)return 0;if(t>=1)return 2*Math.PI;const length=paced(t)*arc.at(-1)!;let lo=0,hi=STEPS;while(hi-lo>1){const m=(lo+hi)>>1;if(arc[m]<length)lo=m;else hi=m;}return(lo+(length-arc[lo])/(arc[hi]-arc[lo]))*step;};
 const directions=new Map(active.map((id,i)=>{const p=poses.get(id)!,q=poses.get(active[1-i])!,f={x:(q.position.x-p.position.x)/(2*halfSpan),z:(q.position.z-p.position.z)/(2*halfSpan)};return[id,{f,yaw:Math.atan2(f.x,f.z)}];}));
 const targetYaw=(id:number)=>(actors.get(id)!.role===spec.inwardRole?-1:1)*Math.sign(poses.get(id)!.position.x-center.x)*Math.PI/2;
 const at=(id:number,t:number)=>{if(!poses.has(id))throw Error('Actor outside carried box.');return clamp(t)*8;};
 const position=(id:number,t:number):Vec2=>{const beat=at(id,t),p=poses.get(id)!,d=directions.get(id);if(!d||beat<=1||beat>=6.5)return{...p.position};const a=angleAt((beat-1)/5.5);return{x:center.x-d.f.x*halfSpan*Math.cos(a)+d.f.z*LANE*Math.sin(a),z:center.z-d.f.z*halfSpan*Math.cos(a)-d.f.x*LANE*Math.sin(a)};};
 const facing=(id:number,t:number)=>{const beat=at(id,t),p=poses.get(id)!,orbit=directions.get(id)?.yaw??p.yaw;if(beat<1)return p.yaw+wrap(orbit-p.yaw)*ease(beat);if(beat<=6.5)return orbit;return orbit+wrap(targetYaw(id)-orbit)*ease((beat-6.5)/1.5);};
 const exitState=ownSequenceBoundary({...entryState,sourceBeat:advanceSequenceBeat(entryState.sourceBeat,8),poses:entryState.poses.map(p=>({...p,position:{...p.position},yaw:facing(p.id,1)})),heldContacts:[]});
 let previous=entryState.poses.map(p=>({...p}));
 for(let n=1;n<=512;n++){const current=entryState.poses.map(p=>({id:p.id,position:position(p.id,n/512),yaw:facing(p.id,n/512)}));for(const p of current){const q=previous.find(q=>q.id===p.id)!;if(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)*64>1.35||Math.abs(wrap(p.yaw-q.yaw))*64>3.2)throw Error('Role do-si-do wave exceeds established speed or facing budget.');}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)if(Math.hypot(current[a].position.x-current[b].position.x,current[a].position.z-current[b].position.z)<.45)throw Error('Role do-si-do wave violates actual box clearance.');previous=current;}
 return Object.freeze({entryState,exitState,position,facing,contacts:(t:number)=>{clamp(t);return[];}});
}
