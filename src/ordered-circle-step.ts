/** Complete the declared circle before turning toward the persistent partner.
 * This row-local boundary uses the existing circle path and source counts. */
import type {Figure,Pose} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function assertOrderedCircleFigure(input:Figure):Figure {
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('An ordered circle needs explicit text metadata and supported confidence.');
 if(f.kind!=='circle'||f.who!=='all'||!['left','right'].includes(f.direction??'')||f.amount!==1||f.beats!==8||f.exit!=='progressed-neighbors'||f.turnToward!=='partner'||!Array.isArray(f.phaseBeats)||f.phaseBeats.length!==2||f.phaseBeats[0]!==7||f.phaseBeats[1]!==1)throw new Error('An ordered circle exit requires one full circle in seven counts, then one partnerward facing-only count.');
 return f;
}
export function compileOrderedCircleStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan {
 const f=assertOrderedCircleFigure(input),boundary=ownSequenceBoundary(incoming);
 if(context.next!==undefined)throw new Error('The declared progressed-neighbor circle exit belongs at the finite event boundary.');
 if(boundary.heldContacts.length)throw new Error('This ordered circle entry requires the preceding hold to have released.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const endBeat=advanceSequenceBeat(boundary.sourceBeat,8),owned=structuredClone({ids:context.ids,start:context.start,dancers:context.dancers});
 const {ids,start,dancers}=owned,center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const partner=new Map(boundary.partner),poseById=new Map(boundary.poses.map(p=>[p.id,p]));
 const {phaseBeats:_phase,turnToward:_turn,exit:_exit,...ordinary}=f;
 const base=compilePrimitiveFigure({...ordinary,beats:7,progression:false},ids,start,dancers,[]);
 const ends=new Map(ids.map(id=>[id,base.position(id,1)])),turns=new Map<number,{from:number;delta:number}>();
 for(const id of ids){const p=ends.get(id)!,q=ends.get(partner.get(id)!)!,actor=boundary.actors.find(a=>a.id===id)!;
  if(Math.abs(p.x-center.x)<.5||Math.abs(p.z-q.z)>1e-6||Math.abs(p.x+q.x-2*center.x)>1e-6)throw new Error('An ordered circle exit needs actual across-set persistent partners.');
  const from=base.facing(id,1,start),toward=wrap(Math.atan2(q.x-p.x,q.z-p.z)-from),direction=Math.sign(p.x-center.x)*(actor.role==='lark'?1:-1),target=direction===1?0:Math.PI,delta=wrap(target-from);
  if(Math.abs(toward)<1e-7||Math.abs(delta)<1e-7||toward*delta<=0||Math.abs(toward)>Math.abs(delta)+1e-7)throw new Error('The onward facing must be reached by turning toward the actual partner after circle completion.');
  turns.set(id,{from,delta});
 }
 const phase=(t:number)=>Math.min(1,Math.max(0,t)*8/7);
 const plan:MotionPlan={position:(id,t)=>base.position(id,phase(t)),facing:(id,t,poses:Pose[])=>{
  if(t>=7/8){const turn=turns.get(id)!;return turn.from+turn.delta*smooth((t*8-7));}
  const natural=base.facing(id,phase(t),poses),entry=poseById.get(id)!.yaw;
  return t<.12?entry+wrap(natural-entry)*smooth(t/.12):natural;
 },contacts:(t,poses)=>t>=7/8?[]:base.contacts(phase(t),poses)};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState});
}
