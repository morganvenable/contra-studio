/** One full right-shoulder do-si-do by the actual persistent partner units.
 * The deliberately schematic released units translate without rotating or
 * squeezing: every member's measured room-relative offset stays unchanged.
 * Incoming yaws settle during the first count of the eight-count orbit. */
import type {Figure,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import {distance,ease,heading,turn} from './ring-twirl-contract.ts';

const EPS=1e-7,TAU=2*Math.PI,FACING_COUNTS=1,ORBIT_COUNTS=8,RAMP=.12,ROOT_LANE=.34;
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const dot=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>a.x*b.x+a.z*b.z;
const subtract=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>({x:a.x-b.x,z:a.z-b.z});
const time=(value:number)=>{if(!Number.isFinite(value))throw new Error('A coupled do-si-do sample time must be finite.');return Math.max(0,Math.min(1,value));};
/** C2 zero-speed endpoint ramps; constant angular progress between them. */
const paced=(value:number):number=>{const t=time(value),n=1-RAMP;if(t<RAMP){const u=t/RAMP;return RAMP*(u*u*u-.5*u*u*u*u)/n;}if(t>1-RAMP)return 1-paced(1-t);return(t-RAMP/2)/n;};
const unpace=(target:number)=>{if(target<=0)return 0;if(target>=1)return 1;let lo=0,hi=1;for(let i=0;i<52;i++){const mid=(lo+hi)/2;if(paced(mid)<target)lo=mid;else hi=mid;}return(lo+hi)/2;};

export interface CoupledDosidoUnit {
 readonly ids:readonly [number,number]; // actual lark, actual robin
 readonly relation:'partner';
 readonly startCenter:Readonly<Vec2>;
 readonly facing:number;
 readonly offsets:readonly {readonly id:number;readonly offset:Readonly<Vec2>}[];
}
export interface CoupledDosidoGate {
 readonly kind:'robins-right-shoulder'|'backs-pass'|'larks-left-shoulder'|'full-return';
 readonly sourceBeat:number;
 readonly angle:number;
 readonly namedActors:readonly number[];
 readonly unitCenters:readonly Readonly<Vec2>[];
 readonly poses:readonly {readonly id:number;readonly position:Readonly<Vec2>;readonly yaw:number}[];
}
export interface CoupledDosidoPlan extends SequencedMotionPlan {
 readonly namedUnits:readonly [CoupledDosidoUnit,CoupledDosidoUnit];
 readonly exitContract:'same-stations-facing-opposing-unit';
 readonly phaseBeats:readonly [1,7];
 readonly phases:readonly {readonly kind:'orientation-during-dosido'|'fixed-facing-dosido';readonly sourceStart:number;readonly sourceEnd:number}[];
 readonly orbit:{readonly center:Readonly<Vec2>;readonly halfWidth:number;readonly halfDepth:number;readonly laneRadius:number;readonly sourceStart:number;readonly sourceEnd:number;readonly angle:number};
 readonly gates:readonly CoupledDosidoGate[];
 readonly minimumClearanceBound:number;
 readonly clearanceWitness:{readonly actors:readonly [number,number];readonly angle:number};
 readonly maximumSpeedBound:number;
 readonly maximumYawRateBound:number;
}

export function assertCoupledDosidoFigure(input:Figure):Figure {
 const f=capturePlainData(input);
 if(!f||typeof f!=='object'||Array.isArray(f))throw new Error('A coupled do-si-do needs an explicit figure.');
 assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('A coupled do-si-do needs text identity and supported confidence.');
 if(f.kind!=='couples-do-si-do'||f.who!=='neighbor'||f.unitRelation!=='partner'||f.passingShoulder!=='right'||f.unitHold!=='released'||f.facing!=='fixed-room'||f.amount!==1||f.beats!==8||f.progression===true)throw new Error('A coupled do-si-do requires released partner units doing one full right-shoulder neighbor do-si-do with fixed room facing in eight source counts, without progression.');
 return f;
}

export function compileCoupledDosidoStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):CoupledDosidoPlan {
 const figure=assertCoupledDosidoFigure(input),boundary=ownSequenceBoundary(incoming),endBeat=advanceSequenceBeat(boundary.sourceBeat,figure.beats),orbitStart=boundary.sourceBeat,orientationEnd=advanceSequenceBeat(boundary.sourceBeat,FACING_COUNTS);
 if(advanceSequenceBeat(orientationEnd,7)!==endBeat)throw new Error('A coupled do-si-do must preserve its exact one-plus-seven source-count phases.');
 if(boundary.heldContacts.length)throw new Error('Released coupled do-si-do units cannot discard an incoming held contact.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const byId=new Map(boundary.poses.map(p=>[p.id,p])),partner=new Map(boundary.partner),larks=boundary.actors.filter(a=>a.role==='lark').map(a=>a.id);
 if(larks.length!==2||boundary.actors.filter(a=>a.role==='robin').length!==2)throw new Error('A coupled do-si-do requires two actual larks and two actual robins.');
 const pairs=larks.map(id=>[id,partner.get(id)!] as [number,number]),centers=pairs.map(ids=>({x:(byId.get(ids[0])!.position.x+byId.get(ids[1])!.position.x)/2,z:(byId.get(ids[0])!.position.z+byId.get(ids[1])!.position.z)/2})),gap=distance(centers[0],centers[1]);
 if(gap<1.3-EPS||gap>2.2+EPS)throw new Error('Coupled do-si-do units require a measured center gap between 1.3 and 2.2 root units.');
 const halfDepth=gap/2,forward={x:(centers[1].x-centers[0].x)/gap,z:(centers[1].z-centers[0].z)/gap},left={x:forward.z,z:-forward.x},center={x:(centers[0].x+centers[1].x)/2,z:(centers[0].z+centers[1].z)/2};
 const halfWidth=distance(byId.get(pairs[0][0])!.position,byId.get(pairs[0][1])!.position)/2;
 if(halfWidth<.65-EPS||halfWidth>1.2+EPS)throw new Error('Coupled do-si-do units require actual partner half-width between .65 and 1.2 root units.');
 const units=pairs.map((ids,index)=>{const sign=index===0?1:-1,unitLeft={x:sign*left.x,z:sign*left.z},offsets=ids.map(id=>({id,offset:subtract(byId.get(id)!.position,centers[index])}));
  if(offsets.some((p,role)=>Math.abs(dot(p.offset,forward))>EPS||Math.abs(dot(p.offset,unitLeft)-(role===0?halfWidth:-halfWidth))>EPS))throw new Error('Persistent partner units must occupy equal-width facing rows with the actual lark left and robin right; incompatible unit bindings cannot be repaired.');
  return{ids,relation:'partner' as const,startCenter:centers[index],facing:heading(centers[index],centers[1-index]),offsets};
 });
 const namedUnits:[CoupledDosidoUnit,CoupledDosidoUnit]=[units[0],units[1]];
 const laneRadius=halfWidth+ROOT_LANE;
 // For each pair of actual roots, minimize the squared distance continuously.
 // Cross-unit separation is 4h²(1-s²)+(2L*s+k)², s=sin(angle),
 // with k the measured difference of room-fixed partner offsets. This checks
 // the interior quadratic minimum as well as both shoulder extrema. The
 // tiny accepted forward residual is subtracted by the reverse triangle
 // inequality, so geometric tolerance cannot overstate this lower bound.
 let minimumClearanceBound=Infinity,clearanceWitness:{actors:[number,number];angle:number}={actors:[pairs[0][0],pairs[0][1]],angle:0};
 const rootData=namedUnits.flatMap((unit,index)=>unit.offsets.map(p=>({...p,unit:index}))).sort((a,b)=>a.id-b.id);
 for(let i=0;i<rootData.length;i++)for(let j=i+1;j<rootData.length;j++){
  const a=rootData[i],b=rootData[j];let squared:number,angle=0,longitudinalResidual=0;
  if(a.unit===b.unit)squared=distance(a.offset,b.offset)**2;
  else{const first=a.unit===0?a:b,second=a.unit===0?b:a,offsetDelta=subtract(first.offset,second.offset),k=dot(offsetDelta,left);longitudinalResidual=Math.abs(dot(offsetDelta,forward));const A=4*(laneRadius**2-halfDepth**2),B=4*laneRadius*k,C=4*halfDepth**2+k*k,candidates=[-1,1];if(A>0){const vertex=-B/(2*A);if(vertex>-1&&vertex<1)candidates.push(vertex);}let s=0;squared=Infinity;for(const candidate of candidates){const d=A*candidate*candidate+B*candidate+C;if(d<squared){squared=d;s=candidate;}}angle=(Math.asin(s)+TAU)%TAU;}
  const clearance=Math.max(0,Math.sqrt(Math.max(0,squared))-longitudinalResidual);if(clearance<minimumClearanceBound){minimumClearanceBound=clearance;clearanceWitness={actors:[a.id,b.id],angle};}
 }
 if(minimumClearanceBound<.62-EPS)throw new Error('The measured finite-width coupled do-si-do lane cannot maintain .62 root clearance continuously.');
 const unitCenter=(index:number,angle:number):Vec2=>{const sign=index===0?1:-1;return{x:center.x+sign*(-forward.x*halfDepth*Math.cos(angle)+left.x*laneRadius*Math.sin(angle)),z:center.z+sign*(-forward.z*halfDepth*Math.cos(angle)+left.z*laneRadius*Math.sin(angle))};};
 const member=new Map(rootData.map(p=>[p.id,p])),orbitPosition=(id:number,angle:number):Vec2=>{const p=member.get(id)!;if(angle===0||angle===TAU)return{...byId.get(id)!.position};const unit=unitCenter(p.unit,angle);return{x:unit.x+p.offset.x,z:unit.z+p.offset.z};};
 const position=(id:number,raw:number):Vec2=>{if(!member.has(id))throw new Error('The sampled actor is outside this coupled do-si-do.');const beat=time(raw)*8;if(beat<=0||beat>=8)return{...byId.get(id)!.position};return orbitPosition(id,TAU*paced(beat/ORBIT_COUNTS));};
 const facing=(id:number,raw:number):number=>{const p=member.get(id);if(!p)throw new Error('The sampled actor is outside this coupled do-si-do.');const start=byId.get(id)!.yaw,target=namedUnits[p.unit].facing;return start+turn(target,start)*ease(time(raw)*8/FACING_COUNTS);};
 const plan:MotionPlan={position,facing,contacts:(raw:number)=>{time(raw);return[];}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);assertSequenceHandoff(boundary,entryState);
 const kinds:CoupledDosidoGate['kind'][]=['robins-right-shoulder','backs-pass','larks-left-shoulder','full-return'];
 const gates=kinds.map((kind,index)=>{const angle=(index+1)*Math.PI/2,sourceBeat=index===3?endBeat:orbitStart+ORBIT_COUNTS*unpace((index+1)/4),namedActors=index===0?pairs.map(p=>p[1]):index===2?pairs.map(p=>p[0]):boundary.actors.map(a=>a.id);return{kind,angle,sourceBeat,namedActors,unitCenters:[unitCenter(0,angle),unitCenter(1,angle)],poses:boundary.actors.map(a=>({id:a.id,position:orbitPosition(a.id,angle),yaw:facing(a.id,1)}))};});
 for(const [index,shoulder] of [[0,1],[2,-1]] as const){const gate=gates[index];for(const id of gate.namedActors){const p=gate.poses.find(p=>p.id===id)!,q=gate.poses.find(p=>p.id===gate.namedActors.find(j=>j!==id))!,delta=subtract(q.position,p.position),forward={x:Math.sin(p.yaw),z:Math.cos(p.yaw)},right={x:-Math.cos(p.yaw),z:Math.sin(p.yaw)};if(Math.abs(dot(delta,forward))>EPS||shoulder*dot(delta,right)<2*ROOT_LANE-EPS)throw new Error('The coupled do-si-do must pass actual robins right shoulders before actual larks left shoulders.');}}
 for(const unit of namedUnits){const index=namedUnits.indexOf(unit),toOther=subtract(gates[1].unitCenters[1-index],gates[1].unitCenters[index]);if(dot(toOther,{x:Math.sin(unit.facing),z:Math.cos(unit.facing)})>=-EPS)throw new Error('The coupled do-si-do must pass backs with both unit facings unchanged.');}
 const maximumSpeedBound=TAU*Math.max(halfDepth,laneRadius)/(ORBIT_COUNTS*(1-RAMP)),maximumYawRateBound=Math.max(...rootData.map(p=>Math.abs(turn(namedUnits[p.unit].facing,byId.get(p.id)!.yaw))))*1.875/FACING_COUNTS;
 return freeze({...plan,entryState,exitState,namedUnits,exitContract:'same-stations-facing-opposing-unit' as const,phaseBeats:[1,7] as const,phases:[{kind:'orientation-during-dosido' as const,sourceStart:boundary.sourceBeat,sourceEnd:orientationEnd},{kind:'fixed-facing-dosido' as const,sourceStart:orientationEnd,sourceEnd:endBeat}],orbit:{center,halfWidth,halfDepth,laneRadius,sourceStart:orbitStart,sourceEnd:endBeat,angle:TAU},gates,minimumClearanceBound,clearanceWitness,maximumSpeedBound,maximumYawRateBound});
}
