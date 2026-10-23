import{compileHeyExitFacing}from'./hey-exit-facing.ts';
/** A role-first hey reaches the graph-owned permutation of actual entry stations.
 * Its released, across-facing endpoint is a common sequence boundary, with no
 * successor-specific spacing, source signature, or invented progression. */
import type {Figure,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {compileRoleHeyEncounters} from './role-hey-encounters.ts';
import {compilePartialHey,type PartialHeyTrajectory} from './partial-hey.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

export interface NeutralRoleHeyPlan extends SequencedMotionPlan {readonly heyPlan:PartialHeyTrajectory;}
const EPS=1e-7;
const distance=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>Math.hypot(a.x-b.x,a.z-b.z);
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('A neutral role-hey sample time must be finite.');return Math.max(0,Math.min(1,t));};

export function assertNeutralRoleHeyFigure(input:Figure):Figure {
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('A neutral role hey needs explicit text metadata and supported confidence.');
 if(f.kind!=='hey'||!((f.amount===1&&f.beats===16&&f.exit==='same-slots-facing-across')||(f.amount===.5&&f.beats===8&&(f.exit as string)==='opposite-slots-facing-across'))||!['partner','neighbor'].includes(f.who??'')||!['lark','robin'].includes(f.heyStartRole??'')||!['left','right'].includes(f.centerShoulder??'')||!['left','right'].includes(f.endShoulder??'')||f.centerShoulder===f.endShoulder||f.entry!=='paired-sidelines'||f.progression)throw new Error('A neutral role hey requires eight half-hey or sixteen full-hey counts, complete role-first pass layers, opposite shoulders, named sideline pairs and an explicit released station-permutation exit without progression.');
 if(f.heyAxis!==undefined||f.heyStartPair!==undefined||f.notation!==undefined)throw new Error('The neutral role-first hey does not consume axis, pair-first or notation variants.');
 return f;
}

export function compileNeutralRoleHeyStep(input:Figure,context:FigureContext,incoming:SequenceBoundary,options?:{boundedExitFacing:true}):NeutralRoleHeyPlan {
 if(options!==undefined){options=capturePlainData(options);if(!options||Object.keys(options).length!==1||options.boundedExitFacing!==true)throw Error('Unknown neutral hey facing option.');}
 const f=assertNeutralRoleHeyFigure(input),boundary=ownSequenceBoundary(incoming),endBeat=advanceSequenceBeat(boundary.sourceBeat,f.beats);
 if(boundary.heldContacts.length)throw new Error('A neutral role hey requires released incoming hands; an existing hold cannot be discarded.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const ids=boundary.actors.map(a=>a.id),byId=new Map(boundary.poses.map(p=>[p.id,p])),actorsById=new Map(boundary.actors.map(a=>[a.id,a]));
 const partner=new Map(boundary.partner),neighbor=new Map(boundary.neighbor),sidePair=f.who==='partner'?partner:neighbor;
 const center={x:boundary.poses.reduce((n,p)=>n+p.position.x,0)/4,z:boundary.poses.reduce((n,p)=>n+p.position.z,0)/4};
 const select=(role:'lark'|'robin',side:number)=>{
  const found=ids.filter(id=>actorsById.get(id)!.role===role&&Math.sign(byId.get(id)!.position.x-center.x)===side);
  if(found.length!==1)throw new Error('A neutral role hey needs one actor of each role on each measured sideline.');
  return found[0];
 };
 const first=f.heyStartRole!,other=first==='lark'?'robin':'lark',west=select(first,-1),east=select(first,1),westOther=select(other,-1),eastOther=select(other,1),entryOrder=[westOther,west,east,eastOther];
 for(const [a,b]of[[west,westOther],[east,eastOther]]){
  const A=byId.get(a)!.position,B=byId.get(b)!.position;
  if(sidePair.get(a)!==b||Math.abs(A.x-B.x)>EPS||distance(A,B)<.5-EPS)throw new Error('The neutral role hey requires its named pairs on the actual incoming sidelines.');
 }
 const sign=f.centerShoulder==='right'?1:-1;
 if(Math.sign(byId.get(west)!.position.z-center.z)!==sign||Math.sign(byId.get(east)!.position.z-center.z)!==-sign)throw new Error('The neutral role-hey first shoulder contradicts the measured incoming role order.');
 const graph=compileRoleHeyEncounters(boundary,{entryOrder,firstRole:first,centerShoulder:f.centerShoulder!,endShoulder:f.endShoulder!,amount:f.amount as .5|1,beats:f.beats});
 const actors=boundary.actors.map(a=>({id:String(a.id),role:a.role,couple:String(a.couple)}));
 // The explicit graph determines station ownership. No spacing is normalized
 // for a following chain, allemande, or any other compatible consumer.
 const end=new Map(graph.endOrder!.map((id,slot)=>[Number(id),{...byId.get(entryOrder[slot])!.position}]));
 const entry=new Map(boundary.poses.map(p=>[String(p.id),{position:{...p.position},velocity:{x:0,z:0},yaw:p.yaw}]));
 const exit=new Map(ids.map(id=>[String(id),{position:end.get(id)!,velocity:{x:0,z:0},yaw:end.get(id)!.x<center.x?Math.PI/2:-Math.PI/2}]));
 const named=(map:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(map.get(id)!)]));
 // Half-hey gates allow 2 1/8 counts from the actual entry to the first
 // encounter, then three equal 35/24-count encounter intervals. The last
 // encounter at 6 1/2 leaves 1 1/2 counts to complete the crossing and turn
 // across. The extra initial eighth avoids speeding wide sideline entrances;
 // no beats or encounters are added. These subfigure times are animation
 // interpretation, not source-authored timestamps. Full mode retains the
 // established full-hey timing and local 1.35 certificate unchanged.
 const path=compilePartialHey({actors,events:graph.events,entry,exit,frame:{origin:center,axis:{x:1,z:0}},beats:f.beats,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:f.amount===.5?[17/8,43/12,121/24,13/2]:[2,3.75,5.5,7.25,9,10.75,12.5,14.25],slotSpacing:1.05,passClearance:.66,maximumSpeed:f.amount===.5?1.3:1.35,maximumYawRate:4,relationships:{partner:named(partner),neighbor:named(neighbor)},source:f.label});
 const actor=(id:number,t:number)=>{if(!byId.has(id))throw new Error('Actor is outside this neutral role hey.');return path.sample(time(t)*f.beats).poses.find(p=>p.id===String(id))!;};
 const prepared=options?compileHeyExitFacing(path):undefined;
 const plan:MotionPlan={position:(id,t)=>actor(id,t).position,facing:(id,t)=>prepared?prepared.facing(String(id),time(t)*f.beats):actor(id,t).yaw,contacts:t=>{time(t);return[];}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 assertSequenceHandoff({...boundary,sourceBeat:endBeat,poses:boundary.poses.map(p=>({...p,position:end.get(p.id)!,yaw:end.get(p.id)!.x<center.x?Math.PI/2:-Math.PI/2}))},exitState);
 return Object.freeze({...plan,heyPlan:path,entryState,exitState});
}




