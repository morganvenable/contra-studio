/** Isolated row-local circle-six/pass-two adapters. Dimensions are measured from
 * actual roots. The old compact source compiler and its kernels remain intact.
 * The finite sequencer owns source-event validation and relationship rebinding. */
import type {Figure,Pose,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {distance,ease,heading,turn,sampleTime} from './ring-twirl-contract.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

const EPS=1e-7,ROTATION_BEATS=5.25,PREPARATION_BEATS=.75,LANE=.30,OUTWARD=.04,PASS_BOW=.24,PASS_TRAVEL=1.20;
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Identical pacing to the audited compact kernel. */
function travel(raw:number):number{const t=Math.max(0,Math.min(1,raw)),r=.08,n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-travel(1-t);return(t-r/2)/n;}
const radius=(q:number)=>1-.22*Math.min(ease(q/.2),ease((1-q)/.2));
const arc=[0];let arcLength=0,last={x:1,z:0};
for(let i=1;i<=4096;i++){const q=i/4096,a=1.5*Math.PI*q,r=radius(q),p={x:r*Math.cos(a),z:r*Math.sin(a)};arcLength+=distance(p,last);arc.push(arcLength);last=p;}
function phase(t:number):number{const length=arcLength*travel(Math.min(1,t*6/ROTATION_BEATS));let lo=0,hi=4096;while(lo+1<hi){const m=(lo+hi)>>1;if(arc[m]<length)lo=m;else hi=m;}return(lo+(length-arc[lo])/(arc[hi]-arc[lo]))/4096;}

export interface MeasuredSixTwoGeometry {
 readonly origin:Readonly<Vec2>;readonly axis:Readonly<Vec2>;
 readonly halfWidth:number;readonly rowGap:number;readonly forwardPreparation:number;
 readonly lanePreparation:.30;readonly outwardPreparation:.04;
}
export interface MeasuredSixTwoPlan extends SequencedMotionPlan {
 readonly geometry:MeasuredSixTwoGeometry;
 readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;
 readonly gates:readonly {readonly beat:number;readonly pair:readonly [number,number];readonly shoulder:'right'}[];
}
// The finite core clears marker flags for its endpoint proof. The declared
// exit is consumed here; the outer source event, not this path, authorizes rebinding.
function figure(input:Figure,kind:'circle'|'pass-through'):Figure{
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('Measured six-plus-two rows need explicit text metadata and supported confidence.');
 if(kind==='circle'){
  if(f.kind!=='circle'||f.beats!==6||f.who!=='all'||f.direction!=='left'||f.amount!==.75||f.progression||f.phaseBeats!==undefined||f.turnToward!==undefined||f.exit!==undefined)throw new Error('The measured circle requires six counts, all four, and exactly three places left.');
 }else if(f.kind!=='pass-through'||f.beats!==2||f.who!=='neighbor'||f.passingShoulder!=='right'||f.entry!=='circle-exit'||f.exit!=='progressed-neighbors')throw new Error('The measured passage requires two counts, released circle entry, current neighbors, right shoulders and an explicit terminal progression exit.');
 return f;
}
function entry(context:FigureContext,incoming:SequenceBoundary):SequenceBoundary{
 const b=ownSequenceBoundary(incoming);
 if(b.heldContacts.length)throw new Error('The measured six-plus-two boundary requires an actual released incoming hold.');
 assertSequenceHandoff(b,captureSequenceBoundary(context,b.sourceBeat,[]));return b;
}
function frame(boundary:SequenceBoundary,axis:Vec2){
 const origin={x:boundary.poses.reduce((n,p)=>n+p.position.x,0)/4,z:boundary.poses.reduce((n,p)=>n+p.position.z,0)/4},across={x:axis.z,z:-axis.x};
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*axis.x+(p.z-origin.z)*axis.z});
 const world=(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*axis.x,z:origin.z+p.x*across.z+p.z*axis.z});
 return{origin,axis,local,world};
}
function geometry(f:ReturnType<typeof frame>,halfWidth:number):MeasuredSixTwoGeometry{
 if(!Number.isFinite(halfWidth)||halfWidth<.72-EPS||halfWidth>.9+EPS)throw new Error('Measured six-plus-two roots must stay in the verified .72–.90 half-width envelope; no width repair is performed.');
 return Object.freeze({origin:Object.freeze({...f.origin}),axis:Object.freeze({...f.axis}),halfWidth,rowGap:2*halfWidth,forwardPreparation:2*halfWidth-PASS_TRAVEL,lanePreparation:LANE,outwardPreparation:OUTWARD});
}
function actorTime(boundary:SequenceBoundary,id:number,t:number):number{
 if(!boundary.actors.some(a=>a.id===id))throw new Error('Actor is outside this measured six-plus-two step.');return sampleTime(t,1);
}
function finish(context:FigureContext,boundary:SequenceBoundary,plan:MotionPlan,beats:number,g:MeasuredSixTwoGeometry,gates:MeasuredSixTwoPlan['gates']=[]):MeasuredSixTwoPlan{
 const endBeat=advanceSequenceBeat(boundary.sourceBeat,beats),entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0;
 const ids=boundary.actors.map(a=>a.id),checks=beats===2?800:1200,h=1e-5;
 for(let n=0;n<=checks;n++){
  const t=n/checks,lo=Math.max(0,t-h),hi=Math.min(1,t+h),positions=ids.map(id=>plan.position(id,t));
  for(const id of ids)maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(plan.position(id,lo),plan.position(id,hi))/((hi-lo)*beats));
  for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(positions[a],positions[b]));
 }
 if(minimumObservedClearance<.65-EPS||maximumObservedSpeed>(beats===2?.85:1.8)+EPS)throw new Error(`Measured six-plus-two exceeds its unchanged root budget: ${minimumObservedClearance}/${maximumObservedSpeed}.`);
 return Object.freeze({...plan,entryState,exitState,geometry:g,gates:Object.freeze(gates),minimumObservedClearance,maximumObservedSpeed});
}

/** The current partner edges establish the actual longways axis. No source,
 * title, ID ordering or whole-prefix geometry is consulted. */
export function compileMeasuredSixCountCircleStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):MeasuredSixTwoPlan{
 const f=figure(input,'circle');if(!context.next)throw new Error('The measured circle needs its immediate two-count passage.');figure(context.next,'pass-through');
 const b=entry(context,incoming),byId=new Map(b.poses.map(p=>[p.id,p])),partner=new Map(b.partner),neighbor=new Map(b.neighbor),first=b.poses[0].position,mate=byId.get(partner.get(b.poses[0].id)!)!.position,gap=distance(first,mate);
 if(gap<EPS)throw new Error('The measured circle needs distinct partner slots.');
 const space=frame(b,{x:(mate.x-first.x)/gap,z:(mate.z-first.z)/gap}),starts=new Map(b.poses.map(p=>[p.id,space.local(p.position)])),h=gap/2,g=geometry(space,h);
 for(const[id,p]of starts){const a=starts.get(partner.get(id)!)!,n=starts.get(neighbor.get(id)!)!;
  if(Math.abs(Math.abs(p.x)-h)>EPS||Math.abs(Math.abs(p.z)-h)>EPS||Math.abs(p.x-a.x)>EPS||Math.abs(p.z+a.z)>EPS||Math.abs(p.x+n.x)>EPS||Math.abs(p.z-n.z)>EPS)throw new Error('The measured circle requires actual square roots, sideline partners and across-set current neighbors.');
 }
 const ids=b.actors.map(a=>a.id),start=context.start.map(p=>({...p,position:{...p.position}})),dancers=context.dancers.map(d=>({...d}));
 const original=compilePrimitiveFigure(f,ids,start,dancers,[]);
 const position=(id:number,raw:number)=>{const t=actorTime(b,id,raw),p=starts.get(id)!,q=phase(t),a=1.5*Math.PI*q,r=radius(q),targetX=p.z,targetZ=-p.x,w=ease((t*6-ROTATION_BEATS)/PREPARATION_BEATS);return space.world({x:r*(p.x*Math.cos(a)-p.z*Math.sin(a))+(Math.sign(targetX)*OUTWARD-Math.sign(targetZ)*LANE)*w,z:r*(p.x*Math.sin(a)+p.z*Math.cos(a))-Math.sign(targetZ)*g.forwardPreparation*w});};
 const facing=(id:number,raw:number)=>{const t=actorTime(b,id,raw),a=heading(position(id,t),space.origin),p=starts.get(id)!,forward=Math.sign(p.x),target=heading({x:0,z:0},{x:forward*space.axis.x,z:forward*space.axis.z}),w=ease((t*6-ROTATION_BEATS)/PREPARATION_BEATS),natural=a+turn(target,a)*w,initial=byId.get(id)!.yaw;return t<.12?initial+turn(natural,initial)*smooth(t/.12):natural;};
 const plan:MotionPlan={position,facing,contacts:(raw,poses)=>{const t=sampleTime(raw,1);return original.contacts(t,poses).map(c=>({...c,strength:c.strength*(1-ease((t*6-ROTATION_BEATS)/PREPARATION_BEATS))})).filter(c=>c.strength>0);}};
 return finish(context,b,plan,6,g);
}

/** Re-measure only the prepared roots and their forward facing. The existing
 * boundary itself carries all state; no hidden continuation ticket is needed. */
export function compileMeasuredTwoCountPassStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):MeasuredSixTwoPlan{
 figure(input,'pass-through');if(context.next!==undefined)throw new Error('The measured two-count passage must end at the declared finite event.');
 const b=entry(context,incoming),yaw=b.poses[0].yaw,space=frame(b,{x:Math.sin(yaw),z:Math.cos(yaw)}),starts=new Map(b.poses.map(p=>[p.id,space.local(p.position)])),byId=new Map(b.poses.map(p=>[p.id,p])),neighbor=new Map(b.neighbor),partner=new Map(b.partner);
 const centers=b.poses.map(p=>{const a=starts.get(p.id)!,n=starts.get(neighbor.get(p.id)!)!;return(a.x+n.x)/2;}),h=centers.reduce((n,x)=>n+Math.abs(x),0)/4-OUTWARD,g=geometry(space,h),ends=new Map<number,Vec2>();
 for(const[id,a]of starts){const n=starts.get(neighbor.get(id)!)!,side=Math.sign(a.x),front=Math.sign(a.z),forward=-front,expectedYaw=heading({x:0,z:0},{x:forward*space.axis.x,z:forward*space.axis.z});
  if(Math.abs(a.x-(side*(h+OUTWARD)-front*LANE))>EPS||Math.abs(Math.abs(a.z)-(PASS_TRAVEL-h))>EPS||Math.abs((a.x+n.x)/2-side*(h+OUTWARD))>EPS||Math.abs(a.z+n.z)>EPS||Math.abs(turn(byId.get(id)!.yaw,expectedYaw))>EPS)throw new Error('The measured passage requires the exact released preparation and forward-facing current-neighbor shoulder lanes.');
  ends.set(id,{x:side*h,z:-front*h});
 }
 for(const[id,p]of ends){const q=ends.get(partner.get(id)!)!;if(Math.abs(p.x+q.x)>EPS||Math.abs(p.z-q.z)>EPS)throw new Error('The measured passage must physically restore across-set persistent partners.');}
 const position=(id:number,raw:number)=>{const t=actorTime(b,id,raw),a=starts.get(id)!,e=ends.get(id)!,u=travel(t),out=1-ease((t-.5)/.5),bow=LANE*(1-ease(t))+PASS_BOW*Math.sin(Math.PI*u);return space.world({x:Math.sign(a.x)*(h+OUTWARD*out)-Math.sign(a.z)*bow,z:a.z+(e.z-a.z)*u});};
 const plan:MotionPlan={position,facing:(id,t)=>{actorTime(b,id,t);return byId.get(id)!.yaw;},contacts:(t)=>{sampleTime(t,1);return[];}};
 const gates=b.poses.filter(p=>p.id<neighbor.get(p.id)!).map(p=>{
  const id=p.id,other=neighbor.get(id)!,a=starts.get(id)!,e=ends.get(id)!,fraction=-a.z/(e.z-a.z);let lo=0,hi=1;for(let n=0;n<60;n++){const mid=(lo+hi)/2;if(travel(mid)<fraction)lo=mid;else hi=mid;}
  const t=(lo+hi)/2,A=position(id,t),B=position(other,t),right={x:-Math.cos(p.yaw),z:Math.sin(p.yaw)},projection=(B.x-A.x)*right.x+(B.z-A.z)*right.z;
  if(projection<.65||Math.abs(space.local(A).z-space.local(B).z)>EPS)throw new Error('The measured current neighbors must actually cross through right-shoulder gates.');
  return Object.freeze({beat:t*2,pair:Object.freeze([id,other] as const),shoulder:'right' as const});
 });
 return finish(context,b,plan,2,g,gates);
}
