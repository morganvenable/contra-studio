/** Released chain entry with an explicit timed facing correction; roots and
 * existing contact reach gates remain owned by the ordinary chain adapter. */
import {compileChainFigure} from './chain.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {ownSequenceBoundary,captureSequenceBoundary,sampleSequenceBoundary,assertSequenceHandoff,advanceSequenceBeat,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';import type {Figure,Pose} from './types.ts';
export interface ReleasedChainOptions {receiverYield:.3;}
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
export function compileReleasedChainStep(input:Figure,context:FigureContext,incoming:SequenceBoundary,options?:ReleasedChainOptions):SequencedMotionPlan&{readonly ownsEntryFacing:true;readonly maximumObservedYawRate:number;readonly baselineMaximumObservedYawRate:number;readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number}{
 const f=capturePlainData(input),boundary=ownSequenceBoundary(incoming);if(f.beats!==8||boundary.heldContacts.length)throw Error('A released chain entry requires eight source counts and actually released hands.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const base=compileChainFigure(f,context),start=new Map(boundary.poses.map(p=>[p.id,p])),entryCorrection=new Map(boundary.poses.map(p=>[p.id,wrap(p.yaw-base.facing(p.id,0))]));
 const center={x:boundary.poses.reduce((n,p)=>n+p.position.x/4,0),z:boundary.poses.reduce((n,p)=>n+p.position.z/4,0)},receivers=new Set(base.receivers.values());
 if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)))throw Error('Chain preparation options must be an explicit record.');
 const selected=options===undefined?undefined:capturePlainData(options);
 if(selected&&(Object.keys(selected).some(k=>k!=='receiverYield')||selected.receiverYield!==.3))throw Error('The compact chain requires an explicit 0.3 receiver yield.');
 if(selected&&boundary.poses.some(p=>Math.abs(Math.abs(p.position.x-center.x)-.64)>1e-7||Math.abs(Math.abs(p.position.z-center.z)-.64)>1e-7))throw Error('The certified receiver yield requires measured compact 0.64 by 0.64 half-extents.');
 const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const time=(t:number)=>{if(!Number.isFinite(t))throw Error('Chain sample time must be finite.');return Math.max(0,Math.min(1,t));};
 const facing=(id:number,t:number)=>{if(!start.has(id))throw Error('Actor outside released chain.');t=time(t);const u=Math.min(1,t*8/1.25),ease=u*u*(3-2*u);return base.facing(id,t)+entryCorrection.get(id)!*(1-ease);};
 // The explicit optional path lets receivers keep clear while crossers arrive.
 // It is zero at both ends, and ends before the existing courtesy phase.
 const position=(id:number,t:number)=>{t=time(t);const p={...base.position(id,t)};if(selected&&receivers.has(id)&&t<.52){const u=t/.52;p.x+=Math.sign(start.get(id)!.position.x-center.x)*.3*smooth(u/.5)*(1-smooth((u-.72)/.28));}return p;};
 const posesAt=(t:number):Pose[]=>boundary.poses.map(p=>({id:p.id,position:position(p.id,t),yaw:facing(p.id,t),stride:0,lean:0,bounce:0,turn:0,activity:f.kind}));
 const plan={position,facing,contacts:(t:number)=>{t=time(t);return base.contacts(t,posesAt(t));},chainCourtesyPreparation:base.chainCourtesyPreparation};
 let maximumObservedYawRate=0,baselineMaximumObservedYawRate=0,minimumObservedClearance=Infinity,maximumObservedSpeed=0,baselineMaximumObservedSpeed=0;
 const ticks=1024;
 for(let n=1;n<=ticks;n++){const t=n/ticks,previous=(n-1)/ticks;for(const id of start.keys()){const a=position(id,t),b=position(id,previous),A=base.position(id,t),B=base.position(id,previous);maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(a.x-b.x,a.z-b.z)*ticks/8);baselineMaximumObservedSpeed=Math.max(baselineMaximumObservedSpeed,Math.hypot(A.x-B.x,A.z-B.z)*ticks/8);maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(wrap(facing(id,t)-facing(id,previous)))*ticks/8);baselineMaximumObservedYawRate=Math.max(baselineMaximumObservedYawRate,Math.abs(wrap(base.facing(id,t)-base.facing(id,previous)))*ticks/8);}const poses=posesAt(t);for(let a=0;a<poses.length;a++)for(let b=a+1;b<poses.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,Math.hypot(poses[a].position.x-poses[b].position.x,poses[a].position.z-poses[b].position.z));const byId=new Map(poses.map(p=>[p.id,p]));for(const c of base.contacts(t,poses))for(const[id,hand]of[[c.a,c.handA],[c.b,c.handB]] as const){const p=byId.get(id)!,side=hand==='left'?1:-1,reach=Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+side*.235*Math.sin(p.yaw));if(reach>.68+1e-7||c.strength>.999999&&reach>.6201)throw Error('Released chain facing exceeds existing hand-reach gates.');}}
 if(selected&&(minimumObservedClearance<.5-1e-6||maximumObservedSpeed>baselineMaximumObservedSpeed+1e-5))throw Error('The compact receiver yield fails the unchanged chain speed envelope or 0.5 local clearance check.');
 if(maximumObservedYawRate>baselineMaximumObservedYawRate+1e-5)throw Error('Released chain entry exceeds the unchanged chain sampled turning envelope.');
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,8),1);assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState,ownsEntryFacing:true,maximumObservedYawRate,baselineMaximumObservedYawRate,minimumObservedClearance,maximumObservedSpeed});
}
