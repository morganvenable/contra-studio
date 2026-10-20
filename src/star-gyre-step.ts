/** Release a completed star toward the actual next gyre partner. Root paths and
 * musical counts stay with the star; the hand-free receiver gets real facing. */
import type {Figure,Pose} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function acceptsStarGyreStep(f:Figure,next?:Figure):boolean {
 return f.kind==='star'&&f.direction==='right'&&f.amount===.75&&f.beats===8&&!f.progression&&next?.kind==='gyre'&&next.who==='partner'&&next.passingShoulder==='right'&&next.amount===1&&next.beats===4;
}
export function compileStarGyreStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan {
 const f=capturePlainData(input),next=capturePlainData(context.next),boundary=ownSequenceBoundary(incoming);
 if(!acceptsStarGyreStep(f,next))throw new Error('Star-to-gyre preparation requires an eight-count right three-quarter star and four-count full right partner gyre.');
 assertFigureArgumentsConsumed(next!);
 if(next!.progression||next!.confidence==='unsupported')throw new Error('Star-to-gyre preparation requires a supported gyre without progression.');
 if(boundary.heldContacts.length)throw new Error('Star-to-gyre entry requires released incoming contacts.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const owned=structuredClone({ids:context.ids,start:context.start,dancers:context.dancers}),{ids,start,dancers}=owned;
 const base=compilePrimitiveFigure(f,ids,start,dancers,[]),partners=new Map(boundary.partner),entry=new Map(boundary.poses.map(p=>[p.id,p.yaw]));
 const center=ids.reduce((sum,id)=>sum+base.position(id,1).x,0)/ids.length;
 const centerZ=ids.reduce((sum,id)=>sum+start[id].position.z,0)/ids.length;
 if(new Set(ids.map(id=>`${Math.sign(start[id].position.x-center)},${Math.sign(start[id].position.z-centerZ)}`)).size!==4||ids.some(id=>Math.abs(Math.abs(start[id].position.x-center)-.9)>1e-7||Math.abs(Math.abs(start[id].position.z-centerZ)-.9)>1e-7))throw new Error('Star-to-gyre requires actual standard four-corner geometry.');
 for(const id of ids){const other=partners.get(id);if(other===undefined)throw new Error('Star-to-gyre needs explicit partners.');const a=base.position(id,1),b=base.position(other,1);
  if(Math.abs(a.x-b.x)>1e-7||Math.abs(a.z-b.z)<.62||Math.abs(a.z-b.z)>2.6||Math.abs(a.x-center)<.5)throw new Error('Star-to-gyre must finish with actual partners on the same sideline.');
 }
 // Release over beats 5.6–6.56, then turn during the final 1.44 counts.
 // These are presentation windows, not a new subdivision of the source row.
 const plan:MotionPlan={position:base.position,facing:(id,t,poses:Pose[])=>{
  const natural=base.facing(id,t,poses);
  if(t<.18)return entry.get(id)!+wrap(natural-entry.get(id)!)*smooth(t/.18);
  if(t<=.82)return natural;
  const a=base.position(id,t),b=base.position(partners.get(id)!,t),target=Math.atan2(b.x-a.x,b.z-a.z);
  return natural+wrap(target-natural)*smooth((t-.82)/.18);
 },contacts:(t,poses)=>t>=.82?[]:base.contacts(t,poses).map(c=>({...c,strength:c.strength*(1-smooth((t-.70)/.12))})).filter(c=>c.strength>1e-9)};
 // Check the carried incoming facing too, rather than assuming every upstream
 // producer supplies the tested swing/long-lines entry.
 for(const id of ids)for(let n=1;n<=960;n++)if(Math.abs(wrap(plan.facing(id,n/960,start)-plan.facing(id,(n-1)/960,start)))*120>3.2+1e-7)throw new Error('Star-to-gyre facing preparation exceeds 3.2 radians per count.');
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,f.beats),1);
 assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState});
}
