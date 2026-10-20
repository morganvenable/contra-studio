/** Released circle entry and explicitly timed swing preparation. The existing
 * ring path supplies motion; counts 5.5–7.5 gather, then 7.5–8 acquire the frame. */
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import type {Figure} from './types.ts';
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const time=(t:number)=>{if(!Number.isFinite(t))throw Error('Circle sample time must be finite.');return Math.max(0,Math.min(1,t));};
export function compileReleasedCircleStep(input:Figure,rawContext:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan{
 const f=capturePlainData(input),boundary=ownSequenceBoundary(incoming),context:FigureContext={...rawContext,
  ids:[...rawContext.ids],start:structuredClone(rawContext.start),dancers:structuredClone(rawContext.dancers),
  relations:{epoch:rawContext.relations.epoch,partner:new Map(rawContext.relations.partner),neighbor:new Map(rawContext.relations.neighbor)},
  next:rawContext.next?capturePlainData(rawContext.next):undefined};
 if(f.kind!=='circle'||f.beats!==8||f.progression||boundary.heldContacts.length)throw Error('Released circle entry requires eight authored counts and actually released hands.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const next=context.next,receiver=next?.kind==='swing'&&['partner','neighbor'].includes(next.who??'')?next.who as 'partner'|'neighbor':undefined;
 const kernel=compilePrimitiveFigure(f,context.ids,context.start,context.dancers,context.dancers.filter(d=>d.role==='lark').map(d=>d.direction),receiver?{circleExit:receiver}:{});
 const natural=receiver?compilePrimitiveFigure(f,context.ids,context.start,context.dancers,context.dancers.filter(d=>d.role==='lark').map(d=>d.direction)):kernel;
 const known=(id:number)=>{if(!context.ids.includes(id))throw Error('Actor outside released circle.');};
 const plan:MotionPlan={
  position(id,t){known(id);t=time(t);if(!receiver)return kernel.position(id,t);const p=natural.position(id,t),end=kernel.position(id,1),w=smooth((t*8-5.5)/2);return{x:p.x+(end.x-p.x)*w,z:p.z+(end.z-p.z)*w};},
  facing(id,t,poses){known(id);t=time(t);let target=natural.facing(id,t,poses);
   if(receiver)target+=wrap(kernel.facing(id,1,poses)-target)*smooth((t*8-5.5)/2);
   if(t>=1/8)return target;const q=t*8,weight=q*q*(3-2*q),start=context.start[id].yaw;return start+wrap(target-start)*weight;},
  contacts(t,poses){t=time(t);
   if(receiver&&t*8>7.5)return kernel.contacts(1,poses).map(h=>({...h,strength:h.strength*smooth((t*8-7.5)/.5)})).filter(h=>h.strength>1e-9);
   const weight=smooth((t*8-1)/.5)*(receiver?smooth((5.5-t*8)/.5):1);
   return natural.contacts(t,poses).map(h=>({...h,strength:h.strength*weight})).filter(h=>h.strength>1e-9);
  },
 };
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0);
 assertSequenceHandoff(boundary,entryState);
 const exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,8),1);
 let previous=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0).poses;
 for(let n=1;n<=512;n++){
  const t=n/512,poses=context.start.map(p=>({...p,position:{...p.position}}));
  for(const id of context.ids)poses[id].position=plan.position(id,t);
  for(const id of context.ids)poses[id].yaw=plan.facing(id,t,poses);
  for(let a=0;a<context.ids.length;a++)for(let b=a+1;b<context.ids.length;b++){const A=poses[context.ids[a]].position,B=poses[context.ids[b]].position;if(Math.hypot(A.x-B.x,A.z-B.z)<.45-1e-7)throw Error('Released circle violates its sampled clearance envelope.');}
  for(const old of previous){const p=poses[old.id],speed=Math.hypot(p.position.x-old.position.x,p.position.z-old.position.z)*64,yawRate=Math.abs(wrap(p.yaw-old.yaw))*64;if(speed>1.8+1e-5||yawRate>3.2+1e-5)throw Error(`Released circle exceeds its sampled motion envelope at count ${t*8}: speed ${speed}, yaw ${yawRate}.`);}
  for(const h of plan.contacts(t,poses))for(const[id,hand]of(!h.target||h.target==='hands'?[[h.a,h.handA],[h.b,h.handB]]:[[h.a,h.handA]])as [number,'left'|'right'][]){
   const p=poses[id],side=hand==='left'?1:-1,reach=Math.hypot(h.point.x-p.position.x-side*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+side*.235*Math.sin(p.yaw));
   if(reach>.64+1e-7)throw Error(`Released circle hand exceeds reach at count ${t*8}: ${reach}.`);
  }
  previous=context.ids.map(id=>poses[id]);
 }
 return Object.freeze({...plan,entryState,exitState});
}

