/** One carried same-role do-si-do 1½. The named pair makes a complete
 * fixed-facing, right-shoulder do-si-do and a further half exchange. Only their
 * actual stations exchange; partner/neighbor identities and epoch do not.
 * Facing preparation is explicit inside the source's eight or ten counts. */
import type {Figure,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import {distance,ease,heading,turn} from './ring-twirl-contract.ts';

const EPS=1e-7,LANE=.34,FACING_COUNTS=1,QUARTER=Math.PI/2,ARC_STEPS=768,RAMP=.12;
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('A role do-si-do sample time must be finite.');return Math.max(0,Math.min(1,t));};
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const dot=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>a.x*b.x+a.z*b.z;
const subtract=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>({x:a.x-b.x,z:a.z-b.z});
/** Short zero-speed boundary ramps followed by steady arc-length progress. */
const paced=(value:number):number=>{const t=time(value),n=1-RAMP;if(t<RAMP){const u=t/RAMP;return RAMP*(u*u*u-.5*u*u*u*u)/n;}if(t>1-RAMP)return 1-paced(1-t);return(t-RAMP/2)/n;};
const unpace=(target:number)=>{if(target<=0)return 0;if(target>=1)return 1;let lo=0,hi=1;for(let i=0;i<52;i++){const mid=(lo+hi)/2;if(paced(mid)<target)lo=mid;else hi=mid;}return(lo+hi)/2;};

export interface RoleDosidoGate {
 readonly kind:'right-shoulder'|'back-to-back'|'left-shoulder'|'full-return'|'half-exchange';
 readonly sourceBeat:number;
 readonly angle:number;
 readonly pair:readonly [number,number];
 readonly poses:readonly {readonly id:number;readonly position:Readonly<Vec2>;readonly yaw:number}[];
}
export interface RoleDosidoPlan extends SequencedMotionPlan {
 readonly namedPair:readonly [number,number];
 readonly relationship:'larks'|'robins';
 readonly exitContract:'exchanged-stations-facing-partner';
 readonly phaseBeats:readonly [1,6|8,1];
 readonly orbit:{readonly center:Readonly<Vec2>;readonly halfSpan:number;readonly laneRadius:.34;readonly angle: number;readonly sourceStart:number;readonly sourceEnd:number;readonly arcLength:number};
 readonly gates:readonly RoleDosidoGate[];
 /** Conservative pacing bound from the measured ellipse, in root units/count. */
 readonly minimumClearanceBound:number;
 readonly maximumSpeedBound:number;
 readonly maximumYawRateBound:number;
}

export function assertRoleDosidoFigure(input:Figure):Figure {
 const f=capturePlainData(input);
 if(!f||typeof f!=='object'||Array.isArray(f))throw new Error('A carried role do-si-do needs an explicit figure.');
 assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('A carried role do-si-do needs text identity and supported confidence.');
 if(f.kind!=='do-si-do'||!['larks','robins'].includes(f.who??'')||f.direction!=='right'||f.amount!==1.5||![8,10].includes(f.beats)||f.progression===true)throw new Error('A carried role do-si-do requires named larks or robins, right shoulder, exactly 1½, and eight or ten source counts without progression.');
 return f;
}

export function compileRoleDosidoStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):RoleDosidoPlan {
 const figure=assertRoleDosidoFigure(input),boundary=ownSequenceBoundary(incoming),endBeat=advanceSequenceBeat(boundary.sourceBeat,figure.beats);
 if(boundary.heldContacts.length)throw new Error('A hand-free role do-si-do needs released incoming hands; a held contact cannot be discarded.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const ids=boundary.actors.map(a=>a.id),byId=new Map(boundary.poses.map(p=>[p.id,p])),partner=new Map(boundary.partner),role=figure.who==='larks'?'lark':'robin',active=boundary.actors.filter(a=>a.role===role).map(a=>a.id);
 if(active.length!==2||boundary.actors.filter(a=>a.role!==role).length!==2)throw new Error('The named role must identify exactly two of the actual four actors.');
 const pair=active as [number,number],A=byId.get(pair[0])!.position,B=byId.get(pair[1])!.position,center={x:boundary.poses.reduce((n,p)=>n+p.position.x,0)/4,z:boundary.poses.reduce((n,p)=>n+p.position.z,0)/4};
 const halfWidth=Math.abs(A.x-center.x),halfDepth=Math.abs(A.z-center.z);
 if(halfWidth<.65-EPS||halfWidth>1.2+EPS||halfDepth<.55-EPS||halfDepth>1.1+EPS||boundary.poses.some(p=>Math.abs(Math.abs(p.position.x-center.x)-halfWidth)>EPS||Math.abs(Math.abs(p.position.z-center.z)-halfDepth)>EPS)||new Set(boundary.poses.map(p=>`${Math.sign(p.position.x-center.x)},${Math.sign(p.position.z-center.z)}`)).size!==4)throw new Error('A carried role do-si-do requires four actual rectangular corners within the .65–1.2 by .55–1.1 half-dimension envelope.');
 if(Math.abs(A.x+B.x-2*center.x)>EPS||Math.abs(A.z+B.z-2*center.z)>EPS)throw new Error('The named same-role dancers must occupy opposite measured stations.');
 const end=new Map(boundary.poses.map(p=>[p.id,{...p.position}]));end.set(pair[0],{...B});end.set(pair[1],{...A});
 for(const id of ids){const p=end.get(id)!,q=end.get(partner.get(id)!)!;if(Math.abs(p.x-q.x)>EPS||Math.sign(p.x-center.x)!==Math.sign(q.x-center.x)||Math.abs(p.z-q.z)<1.1-EPS)throw new Error('Exchanging the named role stations must put the existing persistent partners together on their actual sidelines.');}
 const gap=distance(A,B),halfSpan=gap/2,orbitBeats=(figure.beats-2*FACING_COUNTS) as 6|8,orbitStart=advanceSequenceBeat(boundary.sourceBeat,FACING_COUNTS),orbitEnd=advanceSequenceBeat(orbitStart,orbitBeats);
 if(advanceSequenceBeat(orbitEnd,FACING_COUNTS)!==endBeat)throw new Error('The role do-si-do must retain all three exact source-count phases.');
 const pairData=new Map(pair.map((id,index)=>{const p=byId.get(id)!,other=byId.get(pair[1-index])!,forward={x:(other.position.x-p.position.x)/gap,z:(other.position.z-p.position.z)/gap};return[id,{forward,radial:{x:-forward.x,z:-forward.z},left:{x:forward.z,z:-forward.x},yaw:p.yaw+turn(heading(p.position,other.position),p.yaw)}];}));
 // This renderer's anatomical right is (-cos(yaw), sin(yaw)). The existing
 // do-si-do's +sin lateral excursion puts the other actor on that right side
 // at the first gate; the middle gate passes left on the backward return.
 const angleStep=3*Math.PI/ARC_STEPS,arc=[0],speed=(angle:number)=>Math.hypot(halfSpan*Math.sin(angle),LANE*Math.cos(angle));
 for(let i=1;i<=ARC_STEPS;i++){const a=(i-1)*angleStep,b=i*angleStep;arc.push(arc[i-1]+(b-a)*(speed(a)+4*speed((a+b)/2)+speed(b))/6);}
 const arcLength=arc.at(-1)!;
 const angleAt=(progress:number)=>{if(progress<=0)return 0;if(progress>=1)return 3*Math.PI;const length=progress*arcLength;let lo=0,hi=ARC_STEPS;while(hi-lo>1){const mid=(lo+hi)>>1;if(arc[mid]<length)lo=mid;else hi=mid;}return(lo+(length-arc[lo])/(arc[hi]-arc[lo]))*angleStep;};
 const orbitPosition=(id:number,angle:number):Vec2=>{const d=pairData.get(id);if(!d)return{...byId.get(id)!.position};return{x:center.x+d.radial.x*halfSpan*Math.cos(angle)+d.left.x*LANE*Math.sin(angle),z:center.z+d.radial.z*halfSpan*Math.cos(angle)+d.left.z*LANE*Math.sin(angle)};};
 const position=(id:number,raw:number):Vec2=>{if(!byId.has(id))throw new Error('The sampled actor is outside this carried role do-si-do.');const beat=time(raw)*figure.beats;if(beat<=FACING_COUNTS)return{...byId.get(id)!.position};if(beat>=figure.beats-FACING_COUNTS)return{...end.get(id)!};return orbitPosition(id,angleAt(paced((beat-FACING_COUNTS)/orbitBeats)));};
 const targetYaw=new Map(ids.map(id=>[id,heading(end.get(id)!,end.get(partner.get(id)!)!)]));
 const facing=(id:number,raw:number):number=>{const p=byId.get(id);if(!p)throw new Error('The sampled actor is outside this carried role do-si-do.');const beat=time(raw)*figure.beats,orbitYaw=pairData.get(id)?.yaw??p.yaw;if(beat<FACING_COUNTS)return p.yaw+turn(orbitYaw,p.yaw)*ease(beat/FACING_COUNTS);if(beat<=figure.beats-FACING_COUNTS)return orbitYaw;return orbitYaw+turn(targetYaw.get(id)!,orbitYaw)*ease((beat-figure.beats+FACING_COUNTS)/FACING_COUNTS);};
 const plan:MotionPlan={position,facing,contacts:(t:number)=>{time(t);return[];}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 const gateKinds:RoleDosidoGate['kind'][]=['right-shoulder','back-to-back','left-shoulder','full-return','right-shoulder','half-exchange'];
 const gates=gateKinds.map((kind,index)=>{const angle=(index+1)*QUARTER,sourceBeat=orbitStart+orbitBeats*unpace(arc[(index+1)*ARC_STEPS/6]/arcLength);return{kind,angle,sourceBeat,pair,poses:pair.map(id=>({id,position:orbitPosition(id,angle),yaw:pairData.get(id)!.yaw}))};});
 // Independent anatomical checks make the direction and full-return gate
 // auditable without inferring them from a label or the endpoint permutation.
 for(const [index,expected]of[[0,1],[2,-1],[4,1]] as const){const gate=gates[index];for(const p of gate.poses){const q=gate.poses.find(q=>q.id!==p.id)!,delta=subtract(q.position,p.position),forward={x:Math.sin(p.yaw),z:Math.cos(p.yaw)},right={x:-Math.cos(p.yaw),z:Math.sin(p.yaw)};if(Math.abs(dot(delta,forward))>EPS||expected*dot(delta,right)<2*LANE-EPS)throw new Error('The role do-si-do missed its declared right/left/right shoulder order.');}}
 for(const id of pair)if(distance(gates[3].poses.find(p=>p.id===id)!.position,byId.get(id)!.position)>EPS||distance(gates[5].poses.find(p=>p.id===id)!.position,end.get(id)!)>EPS)throw new Error('The role do-si-do must complete its full return before the extra half exchange.');
 // Piecewise-linear arc inversion can overestimate the exact derivative by at
 // most the ratio of the segment's largest ellipse speed to its mean. Bound
 // that small interpolation effect explicitly rather than calling it exact.
 const interpolationBound=Math.max(...arc.slice(1).map((length,index)=>{const a=index*angleStep,b=(index+1)*angleStep,peak=Math.max(speed(a),speed(b),speed((a+b)/2));return peak*angleStep/(length-arc[index]);}));
 // The inactive corner's perpendicular distance to the active diagonal is
 // 2wh / halfSpan. Subtracting the whole lateral radius is a conservative
 // separation bound for every phase, rather than a sampled-body promise.
 const minimumClearanceBound=Math.min(2*LANE,2*halfWidth*halfDepth/halfSpan-LANE);
 const maximumSpeedBound=arcLength/(orbitBeats*(1-RAMP))*interpolationBound*(1+1e-10);
 const maximumYawRateBound=Math.max(...ids.map(id=>{const p=byId.get(id)!,orbitYaw=pairData.get(id)?.yaw??p.yaw;return Math.max(Math.abs(turn(orbitYaw,p.yaw)),Math.abs(turn(targetYaw.get(id)!,orbitYaw)))*1.875/FACING_COUNTS;}));
 return freeze({...plan,entryState,exitState,namedPair:pair,relationship:figure.who as 'larks'|'robins',exitContract:'exchanged-stations-facing-partner' as const,phaseBeats:[1,orbitBeats,1] as const,orbit:{center,halfSpan,laneRadius:LANE,angle:3*Math.PI,sourceStart:orbitStart,sourceEnd:orbitEnd,arcLength},gates,minimumClearanceBound,maximumSpeedBound,maximumYawRateBound});
}
