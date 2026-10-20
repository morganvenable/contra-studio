/** Unregistered strict-carried prototype. Five counts complete the held turn;
 * one count releases, approaches and acquires the named next swing frame. */
import type {Figure,Pose} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary} from './sequence-boundary.ts';
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export function compileRoleTurnSwingPrototype(input:Figure,context:FigureContext,incoming:SequenceBoundary){
 const f=capturePlainData(input),next=capturePlainData(context.next),boundary=ownSequenceBoundary(incoming);
 if(Object.keys(f).some(k=>!['id','label','kind','who','direction','amount','beats','confidence'].includes(k))||f.kind!=='allemande'||f.who!=='robins'||f.direction!=='right'||f.amount!==.75||f.beats!==6||f.confidence==='unsupported'||!next||Object.keys(next).some(k=>!['id','label','kind','who','beats','confidence'].includes(k))||next.kind!=='swing'||next.who!=='neighbor'||next.beats!==10||next.confidence==='unsupported')throw new Error('Prototype requires six-count robin right three-quarter turn and ten-count neighbor swing.');
 if(boundary.heldContacts.length)throw new Error('Prototype requires released entry hands.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const {ids,start,dancers}=structuredClone({ids:context.ids,start:context.start,dancers:context.dancers}),neighbors=new Map(boundary.neighbor);
 const center={x:boundary.poses.reduce((s,p)=>s+p.position.x,0)/4,z:boundary.poses.reduce((s,p)=>s+p.position.z,0)/4};
 if(new Set(ids.map(id=>`${Math.sign(start[id].position.x-center.x)},${Math.sign(start[id].position.z-center.z)}`)).size!==4||ids.some(id=>Math.abs(Math.abs(start[id].position.x-center.x)-.9)>1e-7||Math.abs(Math.abs(start[id].position.z-center.z)-.9)>1e-7||Math.abs(start[id].position.x-start[neighbors.get(id)!].position.x)>1e-7))throw new Error('Prototype requires actual standard corners with current neighbors on sidelines.');
 const robins=ids.filter(id=>dancers[id].role==='robin');
 const held=compilePrimitiveFigure(f,ids,start,dancers,[],{heldAllemandeExit:true}),end=start.map(p=>({...p,position:{...p.position}}));
 for(const id of ids)end[id].position=held.position(id,1);
 const targets=end.map(p=>({...p,position:{...p.position}}));
 for(const id of ids.filter(id=>dancers[id].role==='lark')){const other=neighbors.get(id)!,a=end[id].position,b=end[other].position,c={x:center.x+Math.sign((a.x+b.x)/2-center.x)*.9,z:(a.z+b.z)/2};
  if(distance(a,b)<.5||Math.abs(c.x-center.x)<.8)throw new Error('Actual turn does not reach a nondegenerate named sideline approach.');
  for(const actor of[id,other]){const p=end[actor].position;targets[actor].position={x:c.x,z:c.z+Math.sign(p.z-c.z)*.31};targets[actor].yaw=Math.atan2(c.x-targets[actor].position.x,c.z-targets[actor].position.z)+Math.PI/3;}
 }
 const swing=compilePrimitiveFigure(next,ids,targets,dancers,[],{swingEntry:'prepared-circle'});
 const valid=(t:number)=>{if(!Number.isFinite(t))throw new Error('Prototype sample must be finite.');return Math.max(0,Math.min(1,t))*6;};
 const position=(id:number,t:number)=>{const beat=valid(t);if(!ids.includes(id))throw new Error('Unknown actor.');if(beat<=5)return held.position(id,beat/5);const u=smooth((beat-5.25)/.75),a=end[id].position,b=targets[id].position;return{x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u};};
 const facing=(id:number,t:number,_poses:Pose[])=>{const beat=valid(t);if(!ids.includes(id))throw new Error('Unknown actor.');
  const turnYaw=(b:number)=>{if(!robins.includes(id))return start[id].yaw;const other=robins.find(j=>j!==id)!,a=held.position(id,b/5),q=held.position(other,b/5),natural=Math.atan2(q.x-a.x,q.z-a.z),initial=Math.atan2(start[other].position.x-start[id].position.x,start[other].position.z-start[id].position.z);return natural+wrap(start[id].yaw-initial)*(1-smooth(b/.75));};
  if(beat<=5)return turnYaw(beat);const a=turnYaw(5);return a+wrap(targets[id].yaw-a)*smooth((beat-5.25)/.75);
 };
 const shoulderReach=(poses:Pose[],id:number,hand:'left'|'right',point:{x:number;y:number;z:number})=>{const p=poses[id],sign=hand==='left'?1:-1;return Math.hypot(point.x-(p.position.x+sign*.235*Math.cos(p.yaw)),point.z-(p.position.z-sign*.235*Math.sin(p.yaw)),point.y-1.355);};
 const contactReach=(poses:Pose[],contacts:ReturnType<MotionPlan['contacts']>)=>Math.max(0,...contacts.flatMap(c=>[shoulderReach(poses,c.a,c.handA,c.point),...(!c.target||c.target==='hands'?[shoulderReach(poses,c.b,c.handB,c.point)]:[])]));
 const finalReach=contactReach(targets,swing.contacts(0,targets));
 if(finalReach>=.64)throw new Error('Existing swing endpoint itself exceeds the .64 shoulder limit.');
 const plan:MotionPlan={position,facing,contacts:(t,poses)=>{const beat=valid(t);if(beat<=5.25){const strength=smooth((beat-.85)/.4)*(1-smooth((beat-5)/.25));if(strength<=1e-9)return[];const a=poses[robins[0]].position,b=poses[robins[1]].position;return[{a:robins[0],b:robins[1],handA:'right',handB:'right',kind:'joined',strength,point:{x:(a.x+b.x)/2,y:1.14,z:(a.z+b.z)/2}}];}const contacts=swing.contacts(0,poses),strength=smooth((beat-5.75)/.25)*smooth((.64-contactReach(poses,contacts))/(.64-finalReach));return strength<=1e-9?[]:contacts.map(c=>({...c,strength:c.strength*strength}));}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,6),1);
 assertSequenceHandoff(boundary,entryState);
 let minimumClearance=Infinity,maximumSpeed=0,maximumYawRate=0,maximumContactRootReach=0,maximumShoulderReach=0;
 let shoulderFailure:undefined|{beat:number;actor:number;hand:string;target:string;reach:number;strength:number};
 const posesAt=(t:number)=>start.map(p=>({...p,position:ids.includes(p.id)?position(p.id,t):p.position,yaw:ids.includes(p.id)?facing(p.id,t,start):p.yaw}));
 let prior=posesAt(0);for(let n=0;n<=720;n++){const t=n/720,poses=posesAt(t);for(const id of ids){if(n){maximumSpeed=Math.max(maximumSpeed,distance(poses[id].position,prior[id].position)*120);maximumYawRate=Math.max(maximumYawRate,Math.abs(wrap(poses[id].yaw-prior[id].yaw))*120);}for(const j of ids.filter(j=>j>id))minimumClearance=Math.min(minimumClearance,distance(poses[id].position,poses[j].position));}for(const c of plan.contacts(t,poses))maximumContactRootReach=Math.max(maximumContactRootReach,distance(poses[c.a].position,c.point),...((!c.target||c.target==='hands')?[distance(poses[c.b].position,c.point)]:[]));prior=poses;}
 for(let n=0;n<=720;n++){const t=n/720,poses=posesAt(t);for(const c of plan.contacts(t,poses)){const hands:[[number,'left'|'right'],...Array<[number,'left'|'right']>]=[[c.a,c.handA],...(!c.target||c.target==='hands'?[[c.b,c.handB] as [number,'left'|'right']]:[])];for(const[id,hand]of hands){const p=poses[id],sign=hand==='left'?1:-1,reach=Math.hypot(c.point.x-(p.position.x+sign*.235*Math.cos(p.yaw)),c.point.z-(p.position.z-sign*.235*Math.sin(p.yaw)),c.point.y-1.355);if(reach>maximumShoulderReach){maximumShoulderReach=reach;shoulderFailure={beat:t*6,actor:id,hand,target:c.target??'hands',reach,strength:c.strength};}}}}
 if(minimumClearance<.5||maximumSpeed>1.5||maximumYawRate>3.2)throw new Error(`Prototype motion budget failure ${JSON.stringify({minimumClearance,maximumSpeed,maximumYawRate})}`);
 return Object.freeze({...plan,entryState,exitState,motionCertificate:Object.freeze({minimumClearance,maximumSpeed,maximumYawRate}),contactAudit:Object.freeze({maximumContactRootReach,maximumShoulderReach,armLimit:.64,passed:maximumShoulderReach<=.64,worst:shoulderFailure}),stages:Object.freeze({turnCompleteBeat:5,oldHoldReleasedBeat:5.25,swingAcquireBeat:5.75,endBeat:6})});
}
