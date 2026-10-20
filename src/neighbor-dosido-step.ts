/** Two actual neighbor pairs complete a fixed-facing right-shoulder do-si-do
 * and a further half exchange. The eight-count path owns all three passages;
 * a declared future balance can use only the tail after the final shoulder.
 * The separate source event owns progression, never this local station swap. */
import type {Figure,FigureExitPreparationWindow,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import {distance,ease,heading,turn} from './ring-twirl-contract.ts';

const EPS=1e-7,LANE=.45,HALF_SPAN=.9,BEATS=8,FACING_COUNTS=1,ANGLE=3*Math.PI,ARC_STEPS=4096,RAMP=.215;
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const dot=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>a.x*b.x+a.z*b.z;
const subtract=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>({x:a.x-b.x,z:a.z-b.z});
const time=(value:number)=>{if(!Number.isFinite(value))throw new Error('A neighbor do-si-do sample time must be finite.');return Math.max(0,Math.min(1,value));};
// Preserve the established progressing do-si-do's .45 by .9 ellipse and its
// exact arc-length lookup and endpoint ramps. Its ten-count adapter is intact.
const arc=[0];let prior={x:0,z:-HALF_SPAN};
for(let i=1;i<=ARC_STEPS;i++){const angle=ANGLE*i/ARC_STEPS,p={x:LANE*Math.sin(angle),z:-HALF_SPAN*Math.cos(angle)};arc.push(arc[i-1]+distance(p,prior));prior=p;}
const arcLength=arc.at(-1)!;
const paced=(value:number):number=>{const t=time(value),n=1-RAMP;if(t<RAMP){const u=t/RAMP;return RAMP*(u*u*u-.5*u*u*u*u)/n;}if(t>1-RAMP)return 1-paced(1-t);return(t-RAMP/2)/n;};
const unpace=(target:number)=>{if(target<=0)return 0;if(target>=1)return 1;let lo=0,hi=1;for(let i=0;i<56;i++){const mid=(lo+hi)/2;if(paced(mid)<target)lo=mid;else hi=mid;}return(lo+hi)/2;};
const angleAt=(progress:number)=>{if(progress<=0)return 0;if(progress>=1)return ANGLE;const target=progress*arcLength;let lo=0,hi=ARC_STEPS;while(lo+1<hi){const mid=(lo+hi)>>1;if(arc[mid]<target)lo=mid;else hi=mid;}return ANGLE*(lo+(target-arc[lo])/(arc[hi]-arc[lo]))/ARC_STEPS;};
const arcFraction=(angle:number)=>{if(angle<=0)return 0;if(angle>=ANGLE)return 1;const index=angle*ARC_STEPS/ANGLE,lo=Math.floor(index);return(arc[lo]+(arc[lo+1]-arc[lo])*(index-lo))/arcLength;};

export interface NeighborDosidoGate {
 readonly kind:'right-shoulder'|'back-to-back'|'left-shoulder'|'full-return'|'half-exchange';
 readonly sourceBeat:number;
 readonly angle:number;
 readonly namedPairs:readonly (readonly [number,number])[];
 readonly poses:readonly {readonly id:number;readonly position:Readonly<Vec2>;readonly yaw:number}[];
}
export interface NeighborDosidoPlan extends SequencedMotionPlan {
 readonly namedPairs:readonly [readonly [number,number],readonly [number,number]];
 readonly relationship:'neighbor';
 readonly exitContract:'exchanged-neighbor-stations';
 readonly phases:readonly {readonly kind:'orientation-during-dosido'|'fixed-facing-dosido';readonly sourceStart:number;readonly sourceEnd:number}[];
 readonly orbit:{readonly centers:readonly Readonly<Vec2>[];readonly halfSpan:.9;readonly laneRadius:.45;readonly angle:number;readonly sourceStart:number;readonly sourceEnd:number;readonly arcLength:number};
 readonly gates:readonly NeighborDosidoGate[];
 readonly lastShoulderPass:{readonly sourceBeat:number;readonly namedPairs:readonly (readonly [number,number])[];readonly contactState:'released'};
 readonly release:{readonly sourceBeat:number;readonly namedPairs:readonly (readonly [number,number])[];readonly contactState:'released';readonly relationshipEpoch:number};
 readonly exitPreparationWindow?:FigureExitPreparationWindow;
 readonly minimumClearanceBound:number;
 readonly maximumSpeedBound:number;
 readonly maximumYawRateBound:number;
}

export function assertNeighborDosidoFigure(input:Figure):Figure {
 const f=capturePlainData(input);
 if(!f||typeof f!=='object'||Array.isArray(f))throw new Error('A carried neighbor do-si-do needs an explicit figure.');
 assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('A carried neighbor do-si-do needs text identity and supported confidence.');
 if(f.kind!=='do-si-do'||f.who!=='neighbor'||f.direction!=='right'||f.amount!==1.5||f.beats!==BEATS||f.progression!==true||f.exit!=='progressed-neighbors'||f.preparation!==undefined&&f.preparation!=='next-neighbor-balance')throw new Error('A carried neighbor do-si-do requires current neighbors, right shoulders, exactly 1½ in eight source counts, and the explicit progressed-neighbors exit.');
 return f;
}

export function compileNeighborDosidoStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):NeighborDosidoPlan {
 const figure=assertNeighborDosidoFigure(input),boundary=ownSequenceBoundary(incoming),endBeat=advanceSequenceBeat(boundary.sourceBeat,BEATS),orientationEnd=advanceSequenceBeat(boundary.sourceBeat,FACING_COUNTS);
 if(advanceSequenceBeat(orientationEnd,BEATS-FACING_COUNTS)!==endBeat)throw new Error('The neighbor do-si-do must retain its exact eight-count source interval.');
 if(boundary.heldContacts.length)throw new Error('A hand-free neighbor do-si-do cannot discard an incoming held contact.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const byId=new Map(boundary.poses.map(p=>[p.id,p])),neighbor=new Map(boundary.neighbor),ids=boundary.actors.map(a=>a.id),pairs=ids.filter(id=>id<neighbor.get(id)!).map(id=>[id,neighbor.get(id)!] as [number,number]);
 if(pairs.length!==2)throw new Error('The neighbor do-si-do needs two actual reciprocal neighbor pairs.');
 const namedPairs:[readonly [number,number],readonly [number,number]]=[pairs[0],pairs[1]],centers=pairs.map(pair=>{const a=byId.get(pair[0])!.position,b=byId.get(pair[1])!.position;if(Math.abs(distance(a,b)-2*HALF_SPAN)>EPS)throw new Error('A carried neighbor do-si-do needs the actual 1.8-unit neighbor stations.');return{x:(a.x+b.x)/2,z:(a.z+b.z)/2};});
 const data=new Map(pairs.flatMap((pair,index)=>pair.map((id,i)=>{const p=byId.get(id)!,q=byId.get(pair[1-i])!,gap=distance(p.position,q.position),forward={x:(q.position.x-p.position.x)/gap,z:(q.position.z-p.position.z)/gap};return[id,{center:centers[index],forward,left:{x:forward.z,z:-forward.x},halfSpan:gap/2,yaw:p.yaw+turn(heading(p.position,q.position),p.yaw)}] as const;})));
 const axis=data.get(pairs[0][0])!.forward,otherAxis=data.get(pairs[1][0])!.forward,centerDelta=subtract(centers[1],centers[0]),centerGap=distance(centers[0],centers[1]);
 if(Math.abs(Math.abs(dot(axis,otherAxis))-1)>EPS||Math.abs(dot(centerDelta,axis))>EPS||centerGap<1.6-EPS)throw new Error('Neighbor do-si-do pairs require aligned parallel corridors with at least 1.6 units between their measured centers.');
 const orbitPosition=(id:number,angle:number):Vec2=>{const p=byId.get(id)!,d=data.get(id)!;if(angle===0||angle===2*Math.PI)return{...p.position};if(angle===ANGLE)return{...byId.get(neighbor.get(id)!)!.position};const forward=d.halfSpan*(1-Math.cos(angle)),side=LANE*Math.sin(angle);return{x:p.position.x+d.forward.x*forward+d.left.x*side,z:p.position.z+d.forward.z*forward+d.left.z*side};};
 const position=(id:number,raw:number):Vec2=>{if(!byId.has(id))throw new Error('The sampled actor is outside this carried neighbor do-si-do.');return orbitPosition(id,angleAt(paced(time(raw))));};
 const facing=(id:number,raw:number):number=>{const p=byId.get(id);if(!p)throw new Error('The sampled actor is outside this carried neighbor do-si-do.');return p.yaw+turn(data.get(id)!.yaw,p.yaw)*ease(time(raw)*BEATS/FACING_COUNTS);};
 const plan:MotionPlan={position,facing,contacts:(raw:number)=>{time(raw);return[];}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);assertSequenceHandoff(boundary,entryState);
 const kinds:NeighborDosidoGate['kind'][]=['right-shoulder','back-to-back','left-shoulder','full-return','right-shoulder','half-exchange'];
 const gates=kinds.map((kind,index)=>{const angle=(index+1)*Math.PI/2,sourceBeat=index===5?endBeat:boundary.sourceBeat+BEATS*unpace(arcFraction(angle));return{kind,angle,sourceBeat,namedPairs,poses:ids.map(id=>({id,position:orbitPosition(id,angle),yaw:data.get(id)!.yaw}))};});
 if(gates[0].sourceBeat<=orientationEnd||gates.some((gate,i)=>gate.sourceBeat<=(i?gates[i-1].sourceBeat:boundary.sourceBeat)))throw new Error('Neighbor do-si-do gates must retain distinct source clocks after facing acquisition.');
 // Check actual anatomy, not the relationship label or endpoint permutation.
 for(const[index,shoulder]of[[0,1],[2,-1],[4,1]] as const)for(const p of gates[index].poses){const q=gates[index].poses.find(q=>q.id===neighbor.get(p.id))!,delta=subtract(q.position,p.position),forward={x:Math.sin(p.yaw),z:Math.cos(p.yaw)},right={x:-Math.cos(p.yaw),z:Math.sin(p.yaw)};if(Math.abs(dot(delta,forward))>EPS||shoulder*dot(delta,right)<2*LANE-EPS)throw new Error('Neighbor do-si-do must retain the named right/left/right shoulder sequence.');}
 for(const id of ids)if(distance(gates[3].poses.find(p=>p.id===id)!.position,byId.get(id)!.position)>EPS||distance(gates[5].poses.find(p=>p.id===id)!.position,byId.get(neighbor.get(id)!)!.position)>EPS)throw new Error('Neighbor do-si-do must fully return before the extra half exchange.');
 // Same-pair roots stay at least two lane radii apart. Distinct corridors have
 // transverse gap minus both lane radii; account conservatively for residual
 // axis misalignment admitted by geometric tolerance.
 const axisResidual=Math.sqrt(Math.max(0,2*(1-Math.abs(dot(axis,otherAxis))))),minimumClearanceBound=Math.min(2*LANE,centerGap-2*LANE-4*HALF_SPAN*axisResidual-EPS);
 const measuredHalfSpan=Math.max(...[...data.values()].map(d=>d.halfSpan));
 const speed=(angle:number)=>Math.hypot(measuredHalfSpan*Math.sin(angle),LANE*Math.cos(angle)),angleStep=ANGLE/ARC_STEPS;
 const interpolationBound=Math.max(...arc.slice(1).map((length,i)=>{const a=i*angleStep,b=(i+1)*angleStep,k=Math.ceil((a-Math.PI/2)/Math.PI),critical=Math.PI/2+k*Math.PI,peak=critical<=b?measuredHalfSpan:Math.max(speed(a),speed(b));return peak*angleStep/(length-arc[i]);}));
 const maximumSpeedBound=arcLength/(BEATS*(1-RAMP))*interpolationBound*(1+1e-10),maximumYawRateBound=Math.max(...ids.map(id=>Math.abs(turn(data.get(id)!.yaw,byId.get(id)!.yaw))))*1.875/FACING_COUNTS;
 const lastShoulderPass={sourceBeat:gates[4].sourceBeat,namedPairs,contactState:'released' as const},release={sourceBeat:endBeat,namedPairs,contactState:'released' as const,relationshipEpoch:boundary.relationshipEpoch};
 const exitPreparationWindow=figure.preparation==='next-neighbor-balance'?{kind:'next-neighbor-balance' as const,sourceStart:lastShoulderPass.sourceBeat,sourceEnd:endBeat,after:'last-named-shoulder-pass' as const,contactState:'released' as const}:undefined;
 return freeze({...plan,entryState,exitState,namedPairs,relationship:'neighbor' as const,exitContract:'exchanged-neighbor-stations' as const,phases:[{kind:'orientation-during-dosido' as const,sourceStart:boundary.sourceBeat,sourceEnd:orientationEnd},{kind:'fixed-facing-dosido' as const,sourceStart:orientationEnd,sourceEnd:endBeat}],orbit:{centers,halfSpan:HALF_SPAN,laneRadius:LANE,angle:ANGLE,sourceStart:boundary.sourceBeat,sourceEnd:endBeat,arcLength},gates,lastShoulderPass,release,...(exitPreparationWindow?{exitPreparationWindow}:{}),minimumClearanceBound,maximumSpeedBound,maximumYawRateBound});
}
