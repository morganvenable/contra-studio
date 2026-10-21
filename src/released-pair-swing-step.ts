import{prepareSwingRingExit}from'./ring-pair-handoff.ts';
/** A released sideline pair spirals inward while already rotating. The existing
 * prepared-frame swing owns orbit winding, release and the reached exit slots. */
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {Figure,Pose} from './types.ts';import type {FigureContext,MotionPlan} from './extended-figures.ts';
const EPS=1e-7,CLOSE_COUNTS=1.25;
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
/** Local applicability only; retained closed frames continue to their old route. */
export function needsReleasedPairSwingEntry(f:Figure,c:FigureContext,b:SequenceBoundary):boolean {
 if(f.kind!=='swing'||f.who!=='partner'||![14,16].includes(f.beats)||f.entry!==undefined||f.exit!==undefined||!!f.progression||b.heldContacts.length||(f.beats===16?c.next&&c.next.kind!=='long-lines':!c.next||!['circle','ring-balance'].includes(c.next.kind)))return false;
 const byId=new Map(b.poses.map(p=>[p.id,p])),partner=new Map(b.partner),center={x:b.poses.reduce((s,p)=>s+p.position.x,0)/4,z:b.poses.reduce((s,p)=>s+p.position.z,0)/4};
 return b.poses.length===4&&b.poses.every(p=>{const other=byId.get(partner.get(p.id)!);return !!other&&Math.abs(p.position.x-other.position.x)<EPS&&Math.abs(Math.abs(p.position.x-center.x)-.9)<EPS&&Math.abs(Math.abs(p.position.z-center.z)-.9)<EPS&&Math.abs(distance(p.position,other.position)-1.8)<EPS;});
}
export interface ReleasedPairSwingPlan extends SequencedMotionPlan {
 readonly frameSchedule:{readonly closeCounts:1.25;readonly fullAt:1.75;readonly approach:'rotating-inward-spiral'};
 readonly audit:{readonly minimumClearance:number;readonly maximumSpeed:number;readonly maximumYawRate:number;readonly maximumShoulderReach:number};
}
export function compileReleasedPairSwingStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):ReleasedPairSwingPlan {
 const f=capturePlainData(input),b=ownSequenceBoundary(incoming);
 if(!needsReleasedPairSwingEntry(f,context,b)||Object.keys(f).some(k=>!['id','label','kind','who','beats','confidence','progression'].includes(k))||f.confidence==='unsupported'||typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim())throw new Error('Released pair swing requires an ordinary fourteen- or sixteen-count partner swing from released standard sideline corners.');
 assertSequenceHandoff(b,captureSequenceBoundary(context,b.sourceBeat,[]));
 const {ids,start,dancers}=structuredClone({ids:context.ids,start:context.start,dancers:context.dancers}),partner=new Map(b.partner),center=new Map(ids.map(id=>{const a=start[id].position,q=start[partner.get(id)!].position;return[id,{x:(a.x+q.x)/2,z:(a.z+q.z)/2}];}));
 const closed=start.map(p=>({...p,position:{...p.position}}));
 for(const id of ids){const c=center.get(id)!,v={x:start[id].position.x-c.x,z:start[id].position.z-c.z},r=Math.hypot(v.x,v.z);closed[id].position={x:c.x+v.x*.31/r,z:c.z+v.z*.31/r};closed[id].yaw=Math.atan2(c.x-closed[id].position.x,c.z-closed[id].position.z)+Math.PI/3;}
 const kernel=compilePrimitiveFigure(f,ids,closed,dancers,[],{swingEntry:'prepared-circle',geometry:{halfWidth:.9,rowGap:1.8}});
 const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('Released swing sample must be finite.');return Math.max(0,Math.min(1,t));};
 const known=(id:number)=>{if(!center.has(id))throw new Error('Unknown released swing actor.');return center.get(id)!;};
 const position=(id:number,t:number)=>{const c=known(id);t=time(t);if(t===0)return{...start[id].position};const p=kernel.position(id,t),r=distance(p,c),extra=(distance(start[id].position,c)-.31)*(1-smooth(t*f.beats/CLOSE_COUNTS));return{x:p.x+(p.x-c.x)*extra/r,z:p.z+(p.z-c.z)*extra/r};};
 const facing=(id:number,t:number,poses:Pose[])=>{known(id);t=time(t);const natural=kernel.facing(id,t,poses),initial=kernel.facing(id,0,closed);return natural+wrap(start[id].yaw-initial)*(1-smooth(t*f.beats/CLOSE_COUNTS));};
 const reach=(poses:Pose[],id:number,hand:'left'|'right',point:{x:number;y:number;z:number})=>{const p=poses[id],s=hand==='left'?1:-1;return Math.hypot(point.x-p.position.x-s*.235*Math.cos(p.yaw),point.z-p.position.z+s*.235*Math.sin(p.yaw),point.y-1.355);};
 let plan:MotionPlan={position,facing,contacts:(t,poses)=>{t=time(t);if(t===0)return[];return kernel.contacts(t,poses).map(h=>{const maximum=Math.max(reach(poses,h.a,h.handA,h.point),...(!h.target||h.target==='hands'?[reach(poses,h.b,h.handB,h.point)]:[]));return{...h,strength:h.strength*smooth((t*f.beats-1.25)/.5)*smooth((.64-maximum)/.014)};}).filter(h=>h.strength>1e-9);}};
 if(context.next?.kind==='ring-balance')plan=prepareSwingRingExit(f,context,plan);
 const entryState=sampleSequenceBoundary(context,plan,b.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(b.sourceBeat,f.beats),1);assertSequenceHandoff(b,entryState);
 let minimumClearance=Infinity,maximumSpeed=0,maximumYawRate=0,maximumShoulderReach=0,prior=start;
 for(let n=0;n<=1920;n++){const t=n/1920,poses=start.map(p=>({...p,position:ids.includes(p.id)?plan.position(p.id,t):p.position,yaw:ids.includes(p.id)?plan.facing(p.id,t,start):p.yaw}));for(const id of ids){if(n){maximumSpeed=Math.max(maximumSpeed,distance(poses[id].position,prior[id].position)*1920/f.beats);maximumYawRate=Math.max(maximumYawRate,Math.abs(wrap(poses[id].yaw-prior[id].yaw))*1920/f.beats);}for(const other of ids.filter(j=>j>id))minimumClearance=Math.min(minimumClearance,distance(poses[id].position,poses[other].position));}for(const h of plan.contacts(t,poses))maximumShoulderReach=Math.max(maximumShoulderReach,reach(poses,h.a,h.handA,h.point),...(!h.target||h.target==='hands'?[reach(poses,h.b,h.handB,h.point)]:[]));prior=poses;}
 if(minimumClearance<.5||maximumSpeed>1.5||maximumYawRate>3.2||maximumShoulderReach>.64)throw new Error(`Released swing exceeds sampled motion/reach envelope ${JSON.stringify({minimumClearance,maximumSpeed,maximumYawRate,maximumShoulderReach})}`);
 const fullPoses=start.map(p=>({...p,position:ids.includes(p.id)?position(p.id,1.75/f.beats):p.position,yaw:ids.includes(p.id)?facing(p.id,1.75/f.beats,start):p.yaw})),full=plan.contacts(1.75/f.beats,fullPoses);if(full.length!==6||full.some(h=>h.strength<1-1e-7))throw new Error('Released swing must reach two complete frames by count 1.75.');
 return Object.freeze({...plan,entryState,exitState,frameSchedule:Object.freeze({closeCounts:1.25 as const,fullAt:1.75 as const,approach:'rotating-inward-spiral' as const}),audit:Object.freeze({minimumClearance,maximumSpeed,maximumYawRate,maximumShoulderReach})});
}








