/** A terminal, current-rank-only partner swing. The rank is an epoch-bound
 * declaration from the cycle ledger; actual row occupancy never selects it.
 * Roots already reached by the prefix are retained through the local swing.
 * Its topology transaction belongs to the source-bound finite wrapper. */
import type {Figure,HandContact,Vec2} from './types.ts';
import type {FigureContext,MotionPlan,CurrentMinorSetRank} from './extended-figures.ts';
export type {CurrentMinorSetRank} from './extended-figures.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

const EPS=1e-7,TAU=2*Math.PI,RADIUS=.31,CLOSE_BEATS=1.25,ORBIT_BEATS=5.25,OPEN_BEATS=1.5,RELEASE_START=6.25,RELEASE_END=6.5;
const smooth=(raw:number)=>{const t=Math.max(0,Math.min(1,raw));return t*t*(3-2*t);};
const turn=(target:number,from:number)=>Math.atan2(Math.sin(target-from),Math.cos(target-from));
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('An active-ones swing sample time must be finite.');return Math.max(0,Math.min(1,t));};
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};

/** This local alias also works before the shared Figure union admits ones. */
export type ActiveOnesSwingFigure=Omit<Figure,'kind'|'who'|'beats'|'exit'|'progression'>&{
 kind:'swing';who:'ones';beats:8;exit:'face-down-line'|'progressed-neighbors';progression:true;
};
export interface ActiveOnesSwingPlan extends SequencedMotionPlan {
 readonly currentRank:CurrentMinorSetRank;
 /** Lark first only to assign the established standard frame's hand owners. */
 readonly activePair:readonly [number,number];
 readonly inactivePair:readonly [number,number];
 readonly phaseBeats:readonly [1.25,5.25,1.5];
 readonly frameSchedule:{readonly acquisitionStart:1;readonly fullAt:1.25;readonly releaseStart:6.25;readonly releasedAt:6.5};
 readonly orbit:{readonly center:Readonly<Vec2>;readonly radius:.31;readonly angle:number;readonly sourceStart:number;readonly sourceEnd:number};
 readonly exitContract:'same-reached-roots-facing-down'|'same-reached-roots-facing-next-neighbors';
 readonly inactiveConvention:'retain-actual-roots-turn-to-next-neighbors-in-final-1.5-counts';
 /** Root-space bounds; these do not claim body-mesh collision certification. */
 readonly minimumClearanceBound:number;
 readonly maximumSpeedBound:number;
 readonly maximumYawRateBound:number;
}

export function assertActiveOnesSwingFigure(input:Figure|ActiveOnesSwingFigure):ActiveOnesSwingFigure {
 const f=capturePlainData(input);
 if(!f||typeof f!=='object'||Array.isArray(f))throw new Error('An active-ones swing needs an explicit figure.');
 assertFigureArgumentsConsumed(f as Figure);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('An active-ones swing needs text identity and supported confidence.');
 if(f.preparation!==undefined&&(f.preparation!=='next-neighbor-balance'||f.exit!=='progressed-neighbors'))throw new Error('The active-swing preparation requires its explicit next-neighbor exit.');
 if(f.kind!=='swing'||f.who!=='ones'||f.beats!==8||f.entry!==undefined||!['face-down-line','progressed-neighbors'].includes(f.exit??'')||f.progression!==true)throw new Error('An active-ones terminal swing requires current ones, exactly eight source counts, an explicit next-neighbor or down-line exit, a source progression marker, and no invented entry qualifier.');
 return freeze(f as ActiveOnesSwingFigure);
}

/** Capture the declared rank without consulting coordinates, role, couple
 * numbers or actor-array order to decide which persistent pair is active. */
export function ownCurrentMinorSetRank(input:unknown,boundary:SequenceBoundary):CurrentMinorSetRank {
 const r=capturePlainData(input) as CurrentMinorSetRank;
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!['relationshipEpoch','ones','twos','forwardDirection'].includes(k)))throw new Error('The active-ones swing needs an explicit current minor-set rank declaration with no unconsumed fields.');
 if(!Number.isSafeInteger(r.relationshipEpoch)||r.relationshipEpoch<0||r.relationshipEpoch!==boundary.relationshipEpoch)throw new Error('The current minor-set rank must retain the incoming relationship epoch.');
 if(r.forwardDirection!==1&&r.forwardDirection!==-1)throw new Error('The current minor-set rank needs an explicit forward direction.');
 const ids=new Set(boundary.actors.map(a=>a.id)),partner=new Map(boundary.partner);
 if(!Array.isArray(r.ones)||!Array.isArray(r.twos)||r.ones.length!==2||r.twos.length!==2||new Set([...r.ones,...r.twos]).size!==4||[...r.ones,...r.twos].some(id=>!ids.has(id))||[r.ones,r.twos].some(([a,b])=>partner.get(a)!==b||partner.get(b)!==a))throw new Error('Current ones and twos must be disjoint, complete, exact persistent partner pairs in the actual group.');
 return freeze({relationshipEpoch:r.relationshipEpoch,ones:[...r.ones] as [number,number],twos:[...r.twos] as [number,number],forwardDirection:r.forwardDirection});
}

export function compileActiveOnesSwingStep(input:Figure|ActiveOnesSwingFigure,context:FigureContext,incoming:SequenceBoundary,declaredRank:CurrentMinorSetRank|undefined=context.minorSetRanks):ActiveOnesSwingPlan {
 const figure=assertActiveOnesSwingFigure(input),boundary=ownSequenceBoundary(incoming),currentRank=ownCurrentMinorSetRank(declaredRank,boundary),endBeat=advanceSequenceBeat(boundary.sourceBeat,figure.beats);
 if(context.minorSetRanks!==undefined){const contextRank=ownCurrentMinorSetRank(context.minorSetRanks,boundary);if(contextRank.forwardDirection!==currentRank.forwardDirection||(['ones','twos']as const).some(k=>contextRank[k].some(id=>!currentRank[k].includes(id))))throw new Error('The explicit current minor-set rank conflicts with the context rank binding.');}
 if(boundary.heldContacts.length)throw new Error('An active-ones swing needs released incoming hands; an existing held contact cannot be discarded.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const byId=new Map(boundary.poses.map(p=>[p.id,p])),roles=new Map(boundary.actors.map(a=>[a.id,a.role]));
 const roleOrder=(pair:readonly [number,number])=>[...pair].sort((a,b)=>Number(roles.get(a)==='robin')-Number(roles.get(b)==='robin')) as [number,number];
 const activePair=roleOrder(currentRank.ones),inactivePair=roleOrder(currentRank.twos),A=byId.get(activePair[0])!,B=byId.get(activePair[1])!,C=byId.get(inactivePair[0])!,D=byId.get(inactivePair[1])!;
 const center={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2},halfWidth=Math.abs(A.position.x-B.position.x)/2,rowGap=Math.abs(center.z-(C.position.z+D.position.z)/2);
 // Validate a measured rectangle but do not use its row signs to infer rank.
 if(halfWidth<.65-EPS||halfWidth>1.2+EPS||rowGap<1.1-EPS||rowGap>2.2+EPS||Math.abs(A.position.z-B.position.z)>EPS||Math.abs(C.position.z-D.position.z)>EPS||Math.abs((C.position.x+D.position.x)/2-center.x)>EPS||Math.abs(Math.abs(C.position.x-D.position.x)/2-halfWidth)>EPS)throw new Error('An active-ones swing requires actual across-row persistent pairs within the .65–1.2 half-width and 1.1–2.2 row-gap envelope.');
 const exitYaw=figure.exit==='face-down-line'?0:currentRank.forwardDirection===1?0:Math.PI;
 const data=new Map(activePair.map(id=>{const p=byId.get(id)!,theta=Math.atan2(p.position.z-center.z,p.position.x-center.x),frame=-theta-Math.PI/2+Math.PI/3,entryYaw=p.yaw+turn(frame,p.yaw);return[id,{theta,entryYaw,exitYaw:entryYaw-TAU+turn(exitYaw,entryYaw-TAU)}];}));
 const known=(id:number)=>{const p=byId.get(id);if(!p)throw new Error('The sampled actor is outside this active-ones swing.');return p;};
 const position=(id:number,raw:number):Vec2=>{
  const p=known(id),beat=time(raw)*8,d=data.get(id);if(!d||beat===0||beat===8)return{...p.position};
  if(beat<=CLOSE_BEATS){const u=smooth(beat/CLOSE_BEATS),r=halfWidth+(RADIUS-halfWidth)*u;return{x:center.x+Math.cos(d.theta)*r,z:center.z+Math.sin(d.theta)*r};}
  if(beat>=RELEASE_END){const u=smooth((beat-RELEASE_END)/OPEN_BEATS),r=RADIUS+(halfWidth-RADIUS)*u;return{x:center.x+Math.cos(d.theta)*r,z:center.z+Math.sin(d.theta)*r};}
  const angle=d.theta+TAU*smooth((beat-CLOSE_BEATS)/ORBIT_BEATS);return{x:center.x+Math.cos(angle)*RADIUS,z:center.z+Math.sin(angle)*RADIUS};
 };
 const facing=(id:number,raw:number):number=>{
  const p=known(id),beat=time(raw)*8,d=data.get(id);if(beat===0)return p.yaw;
  // The source does not command the twos to stand still. This separately
  // disclosed waiting convention retains every root and changes facing only
  // during the existing release, toward the twos' next-neighbor direction.
  if(!d)return p.yaw+turn(currentRank.forwardDirection===1?Math.PI:0,p.yaw)*smooth((beat-RELEASE_END)/OPEN_BEATS);
  if(beat<=CLOSE_BEATS)return p.yaw+(d.entryYaw-p.yaw)*smooth(beat/CLOSE_BEATS);
  if(beat>=RELEASE_END)return d.entryYaw-TAU+(d.exitYaw-d.entryYaw+TAU)*smooth((beat-RELEASE_END)/OPEN_BEATS);
  // Keep winding through a complete clockwise turn, including release.
  return d.entryYaw-TAU*smooth((beat-CLOSE_BEATS)/ORBIT_BEATS);
 };
 const contacts=(raw:number):HandContact[]=>{
  const t=time(raw),beat=t*8,envelope=smooth((beat-1)/.25)*smooth((RELEASE_END-beat)/.25);if(envelope===0)return[];
  const [a,b]=activePair,pa={position:position(a,t),yaw:facing(a,t)},pb={position:position(b,t),yaw:facing(b,t)},mid={x:(pa.position.x+pb.position.x)/2,z:(pa.position.z+pb.position.z)/2},v={x:pb.position.x-pa.position.x,z:pb.position.z-pa.position.z};
  // Same standard joined/back/upper-arm frame as the ordinary swing kernel.
  // This is intentionally not the unreviewed reciprocal-blade preview.
  const rawContacts:HandContact[]=[
   {a,b,handA:'left',handB:'right',point:{x:mid.x+v.z*.25,y:1.31,z:mid.z-v.x*.25},strength:envelope,kind:'swing-frame',target:'hands'},
   {a,b,handA:'right',handB:'left',point:{x:pb.position.x-Math.sin(pb.yaw)*.13+Math.cos(pb.yaw)*.13,y:1.28,z:pb.position.z-Math.cos(pb.yaw)*.13-Math.sin(pb.yaw)*.13},strength:envelope,kind:'swing-frame',target:'back',bodyPoint:{x:.13,y:1.28,z:-.13},bodyBlend:1},
   {a:b,b:a,handA:'left',handB:'right',point:{x:pa.position.x-Math.cos(pa.yaw)*.23,y:1.33,z:pa.position.z+Math.sin(pa.yaw)*.23},strength:envelope,kind:'swing-frame',target:'upper-arm'},
  ];
  return rawContacts.map(c=>{const reach=(id:number,hand:'left'|'right')=>{const p=id===a?pa:pb,side=hand==='left'?1:-1;return Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+side*.235*Math.sin(p.yaw));},distance=Math.max(reach(c.a,c.handA),c.target==='hands'?reach(c.b,c.handB):0);return{...c,strength:c.strength*smooth((.68-distance)/.035)};}).filter(c=>c.strength>0);
 };
 const plan:MotionPlan={position,facing,contacts},entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 const minimumClearanceBound=Math.min(2*RADIUS,rowGap-RADIUS),maximumSpeedBound=Math.max((halfWidth-RADIUS)*1.5/CLOSE_BEATS,RADIUS*TAU*1.5/ORBIT_BEATS,(halfWidth-RADIUS)*1.5/OPEN_BEATS),maximumYawRateBound=Math.max(TAU*1.5/ORBIT_BEATS,...activePair.map(id=>{const p=byId.get(id)!,d=data.get(id)!;return Math.max(Math.abs(d.entryYaw-p.yaw)*1.5/CLOSE_BEATS,Math.abs(d.exitYaw-d.entryYaw+TAU)*1.5/OPEN_BEATS);}),...inactivePair.map(id=>Math.abs(turn(currentRank.forwardDirection===1?Math.PI:0,byId.get(id)!.yaw))*1.5/OPEN_BEATS));
 return freeze({...plan,entryState,exitState,currentRank,activePair,inactivePair,phaseBeats:[CLOSE_BEATS,ORBIT_BEATS,OPEN_BEATS] as const,frameSchedule:{acquisitionStart:1 as const,fullAt:CLOSE_BEATS,releaseStart:RELEASE_START,releasedAt:RELEASE_END},orbit:{center,radius:RADIUS,angle:TAU,sourceStart:advanceSequenceBeat(boundary.sourceBeat,CLOSE_BEATS),sourceEnd:advanceSequenceBeat(boundary.sourceBeat,RELEASE_END)},exitContract:figure.exit==='face-down-line'?'same-reached-roots-facing-down' as const:'same-reached-roots-facing-next-neighbors' as const,inactiveConvention:'retain-actual-roots-turn-to-next-neighbors-in-final-1.5-counts' as const,minimumClearanceBound,maximumSpeedBound,maximumYawRateBound});
}
