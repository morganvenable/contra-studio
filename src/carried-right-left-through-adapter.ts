/** Row-local right-and-left-through from the actual incoming boundary. The
 * ordinary released/across path delegates the established binder unchanged.
 * Compact or still-held entries retain their roots, release their existing
 * ring, and finish their across-facing preparation during the named crossing.
 * No source ID, dance title, earlier figure, or future width is consulted. */
import type {Figure,HandContact,Pose} from './types.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileRightLeftThrough,type RightLeftThroughPlan} from './right-left-through.ts';
import {compileRightLeftThroughFigure} from './right-left-through-adapter.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

const EPS=1e-7,RELEASE_BEATS=.5,FACING_BEATS=2,ACQUIRE_START=1.5;
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const ease=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*t*(10+t*(-15+6*t));};
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('A carried right-and-left-through sample time must be finite.');return Math.max(0,Math.min(1,t));};
export interface RightLeftExitFootprint {readonly halfWidth:number;readonly halfDepth:number;}
export interface CarriedRightLeftThroughPlan extends SequencedMotionPlan {
 readonly requiredExit?:Readonly<RightLeftExitFootprint>;
 readonly entryMode:'established'|'released-facing-preparation'|'held-ring-release';
 readonly geometry:{readonly halfWidth:number;readonly halfDepth:number;readonly exitHalfWidth:number;readonly exitHalfDepth:number;readonly passingRadius:number};
 readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;
}
function figure(input:Figure):Figure {
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('A carried right-and-left-through needs explicit text metadata and supported confidence.');
 if(f.kind!=='right-left-through'||f.beats!==8||f.direction!=='right'||!['partner','neighbor'].includes(f.who??'')||!['partner','neighbor'].includes(f.crossingRelation??'')||!['lark','robin'].includes(f.courtesyLeader??''))throw new Error('A carried right-and-left-through requires eight counts and explicit crossing, courtesy relation, and leader role.');
 if(f.amount!==undefined||f.hands!==undefined||f.underRole!==undefined||f.notation!==undefined||f.entry!==undefined||f.exit!==undefined||f.progression)throw new Error('A carried right-and-left-through does not consume extra hand, amount, notation, entry/exit, or progression modifiers.');
 return f;
}
/** A held entry is a complete inward-facing clockwise right-to-left ring.
 * The exact producer targets remain at t=0; incompatible or partial holds
 * cannot be silently discarded just because the roots look suitable. */
function assertRing(boundary:SequenceBoundary,origin:{x:number;z:number}):void {
 const byId=new Map(boundary.poses.map(p=>[p.id,p])),contacts=boundary.heldContacts;
 if(contacts.length!==4)throw new Error('A carried right-and-left-through accepts either a released boundary or a complete held ring.');
 for(const p of boundary.poses)if(Math.abs(turn(p.yaw,Math.atan2(origin.x-p.position.x,origin.z-p.position.z)))>EPS)throw new Error('The incoming held ring must retain its actual inward-facing bodies.');
 const from=new Set<number>(),to=new Set<number>();
 for(const c of contacts){
  const a=byId.get(c.a)!,b=byId.get(c.b)!,ax=a.position.x-origin.x,az=a.position.z-origin.z,bx=b.position.x-origin.x,bz=b.position.z-origin.z;
  if(c.kind!=='joined'||c.handA!=='right'||c.handB!=='left'||c.target!==undefined&&c.target!=='hands'||c.underId!==undefined||c.bodyPoint!==undefined||c.bodyBlend!==undefined||Math.abs(c.strength-1)>EPS||from.has(c.a)||to.has(c.b)||ax*bz-az*bx>=-EPS||Math.abs(a.position.x-b.position.x)>EPS&&Math.abs(a.position.z-b.position.z)>EPS||Math.hypot(c.point.x-(a.position.x+b.position.x)/2,c.point.z-(a.position.z+b.position.z)/2)>EPS||Math.abs(c.point.y-1.14)>EPS)throw new Error('The incoming hold must be the actual adjacent right-to-left ring with its retained midpoint targets.');
  from.add(c.a);to.add(c.b);
 }
 if(from.size!==4||to.size!==4)throw new Error('The incoming ring must cover every actor exactly once in each direction.');
}
/** Applicability is a local measured-state decision, never a recovery from a
 * failed semantic binding. In particular, already-valid compact old entries
 * do not acquire a new output footprint merely because they are narrower. */
export function needsCarriedRightLeftThroughEntry(incoming:SequenceBoundary):boolean {
 const b=ownSequenceBoundary(incoming),origin={x:b.poses.reduce((n,p)=>n+p.position.x,0)/4,z:b.poses.reduce((n,p)=>n+p.position.z,0)/4};
 return b.heldContacts.length>0||b.poses.some(p=>Math.abs(p.position.z-origin.z)<.7-EPS||Math.abs(turn(p.yaw,Math.atan2(-Math.sign(p.position.x-origin.x),0)))>EPS);
}
export function compileCarriedRightLeftThroughStep(input:Figure,context:FigureContext,incoming:SequenceBoundary,requiredExit?:RightLeftExitFootprint):CarriedRightLeftThroughPlan {
 const f=figure(input),boundary=ownSequenceBoundary(incoming),endBeat=advanceSequenceBeat(boundary.sourceBeat,8);
 const requirement=requiredExit===undefined?undefined:capturePlainData(requiredExit);
 if(requirement&&(!requirement||typeof requirement!=='object'||Array.isArray(requirement)||Object.keys(requirement).some(k=>!['halfWidth','halfDepth'].includes(k))||![requirement.halfWidth,requirement.halfDepth].every(Number.isFinite)||requirement.halfWidth<.65||requirement.halfWidth>1.2||requirement.halfDepth<.55||requirement.halfDepth>1.1))throw new Error('A right-and-left-through exit footprint must be an explicit owned reachable rectangle.');
 if(requiredExit!==undefined&&!requirement)throw new Error('A required right-and-left-through exit footprint must be explicit.');
 const partner=new Map(resolveBoundFigureRelation(context,'partner')),neighbor=new Map(resolveBoundFigureRelation(context,'neighbor'));
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,boundary.heldContacts));
 const {ids,start,dancers}=structuredClone({ids:context.ids,start:context.start,dancers:context.dancers}),epoch=boundary.relationshipEpoch;
 const origin={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const halfWidth=Math.abs(start[ids[0]].position.x-origin.x),halfDepth=Math.abs(start[ids[0]].position.z-origin.z);
 if(ids.some(id=>Math.abs(Math.abs(start[id].position.x-origin.x)-halfWidth)>EPS||Math.abs(Math.abs(start[id].position.z-origin.z)-halfDepth)>EPS))throw new Error('A carried right-and-left-through requires actual rectangular side-couple roots.');
 if(boundary.heldContacts.length)assertRing(boundary,origin);
 const canonical=new Map(ids.map(id=>{const p=start[id],across=Math.atan2(-Math.sign(p.position.x-origin.x),0);return[id,p.yaw+turn(across,p.yaw)];}));
 const exitHalfWidth=requirement?.halfWidth??halfWidth,exitHalfDepth=requirement?.halfDepth??halfDepth;
 const aligned=ids.every(id=>Math.abs(canonical.get(id)!-start[id].yaw)<EPS),unchangedFootprint=!requirement||Math.abs(exitHalfWidth-halfWidth)<EPS&&Math.abs(exitHalfDepth-halfDepth)<EPS,established=boundary.heldContacts.length===0&&aligned&&halfDepth>=.7-EPS&&unchangedFootprint;
 let base:RightLeftThroughPlan,plan:MotionPlan;
 if(established){
  // Delegation keeps the old physical path, facings, receiver identities and
  // every contact value byte-for-byte for previously valid ordinary entries.
  base=compileRightLeftThroughFigure(f,{...context,ids,start,dancers,relations:{epoch,partner,neighbor},bindingEpoch:epoch}) as RightLeftThroughPlan;
  plan=base;
 }else{
  if(halfWidth<.65-EPS||halfWidth>1.2+EPS||halfDepth<.55-EPS||halfDepth>1.1+EPS)throw new Error('Measured carried right-and-left-through roots are outside the validated .65–1.2 by .55–1.1 half-dimension envelope.');
  // Quintic turning has peak derivative 1.875. Reject instead of making an
  // unbounded extra turn or changing the eight-count source allocation.
  if(ids.some(id=>Math.abs(canonical.get(id)!-start[id].yaw)*1.875/FACING_BEATS>2+EPS))throw new Error('The actual incoming facing cannot reach the named crossing inside its two-count preparation and yaw budget.');
  const maps={partner,neighbor},courtesy=maps[f.who as 'partner'|'neighbor'],crossing=maps[f.crossingRelation!],leaders=ids.filter(id=>dancers[id].role===f.courtesyLeader);
  const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:canonical.get(id)!,velocity:{x:0,z:0},yawRate:0}]));
  const exit=new Map(ids.map(id=>[id,{position:requirement?{x:origin.x-Math.sign(start[id].position.x-origin.x)*exitHalfWidth,z:origin.z-Math.sign(start[id].position.z-origin.z)*exitHalfDepth}:{x:2*origin.x-start[id].position.x,z:2*origin.z-start[id].position.z},yaw:canonical.get(id)!+Math.PI,velocity:{x:0,z:0},yawRate:0}]));
  base=compileRightLeftThrough({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch,partner,neighbor},bindingEpoch:epoch,crossingPairs:ids.filter(id=>id<crossing.get(id)!).map(id=>[id,crossing.get(id)!] as const),passingHand:'right',passingShoulder:'right',courtesyPairs:leaders.map(leaderId=>({leaderId,followerId:courtesy.get(leaderId)!,relationship:f.who as 'partner'|'neighbor'})),courtesyHold:'left-front-right-waist',frame:{origin,across:{x:1,z:0}},beats:8,crossingBeats:4,entryGeometry:'measured-rectangle'});
  plan={position:(id,t)=>base.position(id,time(t)),facing:(id,t,poses)=>{t=time(t);const initial=start[id];if(!ids.includes(id)||!initial)throw new Error('Actor is outside this carried right-and-left-through.');return base.facing(id,t,poses)-(canonical.get(id)!-initial.yaw)*(1-ease(t*8/FACING_BEATS));},contacts:(raw,poses)=>{
   const t=time(raw),beat=t*8,release=1-ease(beat/RELEASE_BEATS),acquire=ease((beat-ACQUIRE_START)/(FACING_BEATS-ACQUIRE_START));
   const prior:HandContact[]=release>0?boundary.heldContacts.map(c=>({...c,point:{...c.point},strength:c.strength*release})):[];
   return[...prior,...base.contacts(t,poses).map(c=>({...c,strength:c.strength*(beat<3.3?acquire:1)})).filter(c=>c.strength>0)];
  }};
 }
 const ownedContext={...context,ids,start,dancers,relations:{epoch,partner,neighbor},bindingEpoch:epoch},entryState=sampleSequenceBoundary(ownedContext,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(ownedContext,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 const maximumObservedYawRate=Math.max(base.maximumObservedYawRate,...ids.map(id=>established?0:Math.abs(canonical.get(id)!-start[id].yaw)*1.875/FACING_BEATS));
 return Object.freeze({...plan,entryState,exitState,...(requirement?{requiredExit:Object.freeze({...requirement})}:{}),entryMode:established?'established':boundary.heldContacts.length?'held-ring-release':'released-facing-preparation',geometry:Object.freeze({halfWidth,halfDepth,exitHalfWidth,exitHalfDepth,passingRadius:established?.33:Math.min(.33,halfDepth/2)}),minimumObservedClearance:base.minimumObservedClearance,maximumObservedSpeed:base.maximumObservedSpeed,maximumObservedYawRate});
}
