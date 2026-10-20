/** Composition boundary for explicitly bound figures. A figure owns its root
 * path; topology owns actor identities. Binding changes occur at source-timed
 * figure endpoints and cannot hide a reset. No 64-beat or 2N-period assumption. */
import type {Dancer,Figure,Frame,Pose,HandContact} from './types.ts';
import type {MotionPlan,FigureContext} from './extended-figures.ts';
import {makeBalanceCue} from './engine.ts';
import {bindActorGroups,rebindAtEndpoint,type GroupBinding,type BindingChange,type EndpointConstraint} from './progression-topology.ts';
export interface BoundFigureStep {
 figure:Figure;
 /** Source-time allocation for a continuous incoming-facing preparation, if the primitive does not own it. */
 entryFacingBeats?:number;
 /** The current epoch is consumed unless an explicit endpoint transaction precedes this figure. */
 before?:{change:BindingChange;expected:readonly EndpointConstraint[]};
 compile(context:FigureContext):MotionPlan & {readonly ownsEntryFacing?:boolean};
 /** One complete keyed pose per currently inactive actor, sampled on the section
  * beat grid. This may finish an end exchange and then hold absolutely still. */
 inactive?(beat:number,incoming:readonly Pose[],binding:GroupBinding):readonly Pose[];
}
export interface EventSectionOptions {dancers:readonly Dancer[];initial:readonly Pose[];binding:GroupBinding;steps:readonly BoundFigureStep[];totalBeats:number;maximumSpeed?:number;minimumClearance?:number;}
export interface CompiledEventSection {totalBeats:number;starts:readonly number[];end:readonly Pose[];endBinding:GroupBinding;events:readonly BindingChange[];sample(beat:number):Frame;bindingAt(beat:number):GroupBinding;}
const copy=(p:Pose):Pose=>({...p,position:{...p.position},balance:p.balance?{...p.balance}:undefined,arch:p.arch?{...p.arch}:undefined});
const dist=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const turn=(a:Pose,b:Pose)=>Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw));
const finite=(p:Pose)=>Number.isFinite(p.position.x)&&Number.isFinite(p.position.z)&&Number.isFinite(p.yaw);
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){for(const c of Object.values(v))freeze(c);Object.freeze(v);}return v;};
function ownBinding(dancers:readonly Dancer[],binding:GroupBinding):GroupBinding{
 return bindActorGroups(dancers,{epoch:binding.epoch,groups:binding.groups,waitingIds:binding.waitingIds,neighborPairs:[...binding.relations.neighbor].filter(([a,b])=>a<b)});
}
export function compileEventSection(raw:EventSectionOptions):CompiledEventSection{
 const dancers=freeze(raw.dancers.map(d=>({...d}))),initial=raw.initial.map(copy),steps=raw.steps.map(s=>({...s,figure:freeze(structuredClone(s.figure)),before:s.before?freeze(structuredClone(s.before)):undefined})),totalBeats=raw.totalBeats,maximum=raw.maximumSpeed??1.8,minimum=raw.minimumClearance??.45;
 if(!Number.isFinite(totalBeats)||totalBeats<=0||totalBeats>1024||!steps.length||steps.length>128||steps.some(s=>!Number.isFinite(s.figure.beats)||s.figure.beats<=0)||Math.abs(steps.reduce((n,s)=>n+s.figure.beats,0)-totalBeats)>1e-8)throw new Error('The explicit source figure counts must exactly fill the declared section.');
 if(!Number.isFinite(maximum)||maximum<=0||!Number.isFinite(minimum)||minimum<0||dancers.some((d,i)=>d.id!==i)||initial.length!==dancers.length||initial.some((p,i)=>p.id!==i||!finite(p)))throw new Error('The runtime boundary needs stable contiguous identities, finite incoming poses and physical budgets.');
 let current=initial,binding=ownBinding(dancers,raw.binding),start=0;
 const segments:Array<{start:number;figure:Figure;binding:GroupBinding;sample:(beat:number)=>{poses:Pose[];contacts:HandContact[]}}>=[],events:BindingChange[]=[];
 for(const [index,step]of steps.entries()){
  const source=current.map(copy),figure=step.figure,segmentStart=start;
  const facingBeats=step.entryFacingBeats??0;if(!Number.isFinite(facingBeats)||facingBeats<0||facingBeats>Math.min(2,figure.beats/4))throw new Error('Facing preparation must fit its explicit source-time allocation.');
  if(step.before){if(Math.abs(step.before.change.beat-start)>1e-8)throw new Error('A topology transaction must be at this source figure boundary.');binding=rebindAtEndpoint(dancers,binding,step.before.change,source,step.before.expected);events.push(step.before.change);}
  const epoch=binding,plans=epoch.groups.map(g=>{const ids=[...g.actors];return{ids,plan:step.compile({ids,start:source,dancers:dancers as Dancer[],relations:epoch.relations,bindingEpoch:epoch.epoch,next:steps[index+1]?.figure})};});
  const active=new Set(epoch.groups.flatMap(g=>[...g.actors])),inactive=[...epoch.waitingIds];
  const sample=(beat:number)=>{const t=Math.max(0,Math.min(1,(beat-segmentStart)/figure.beats)),poses=source.map(copy);for(const {ids,plan}of plans)for(const id of ids){const p=plan.position(id,t),a=plan.position(id,Math.max(0,t-.001)),b=plan.position(id,Math.min(1,t+.001)),targetYaw=plan.facing(id,t,poses),q=facingBeats&&!plan.ownsEntryFacing?Math.max(0,Math.min(1,t*figure.beats/facingBeats)):1,weight=q*q*(3-2*q),yaw=q===1?targetYaw:source[id].yaw+Math.atan2(Math.sin(targetYaw-source[id].yaw),Math.cos(targetYaw-source[id].yaw))*weight;poses[id]={id,position:{...p},yaw,stride:Math.min(1,Math.hypot(b.x-a.x,b.z-a.z)/(.002*figure.beats)*2.5),lean:figure.kind==='swing'?.1:0,bounce:0,turn:figure.kind==='swing'?1:0,activity:figure.kind,chainCourtesyPreparation:plan.chainCourtesyPreparation?.(id,t),swingPreparation:plan.swingPreparation?.(id,t),balance:plan.balance?.(id,t)??makeBalanceCue(figure,id,ids,dancers,t),arch:plan.arch?.(id,t)};}
   const parked=step.inactive?step.inactive(segmentStart+t*figure.beats,source,epoch):inactive.map(id=>({...copy(source[id]),stride:0,activity:'waiting' as const}));
   if(parked.length!==inactive.length||new Set(parked.map(p=>p.id)).size!==parked.length||parked.some(p=>active.has(p.id)||!inactive.includes(p.id)))throw new Error('Inactive motion must name exactly the explicit waiting actors.');
   for(const p of parked)poses[p.id]={...copy(p),chainCourtesyPreparation:undefined};
   const contacts=plans.flatMap(({plan})=>plan.contacts(t,poses)).map(c=>({...c,point:{...c.point}}));
   if(poses.some(p=>!finite(p))||contacts.some(c=>!active.has(c.a)||!active.has(c.b)||![c.point.x,c.point.y,c.point.z,c.strength].every(Number.isFinite)))throw new Error('A figure returned a nonfinite pose/contact or touched an unbound waiting actor.');
   return{poses,contacts};
  };
  const opening=sample(segmentStart);for(const p of opening.poses)if(dist(p,source[p.id])>1e-6||Math.abs(turn(p,source[p.id]))>1e-5)throw new Error(`${figure.label}: actor ${p.id} has a discontinuous entry; no root or facing reset was invented.`);
  // Independent global sampling catches collisions between neighboring minor
  // sets and inactive end tracks, beyond a primitive's local certificate.
  const checks=Math.max(32,Math.ceil(figure.beats*32));let previous=opening.poses;
  for(let n=1;n<=checks;n++){const poses=sample(segmentStart+n/checks*figure.beats).poses;for(const p of poses)if(dist(p,previous[p.id])*checks/figure.beats>maximum+1e-4)throw new Error(`${figure.label}: actor ${p.id} exceeds the section walking-speed budget.`);for(let a=0;a<poses.length;a++)for(let b=a+1;b<poses.length;b++)if(dist(poses[a],poses[b])<minimum-1e-7)throw new Error(`${figure.label}: actors ${a} and ${b} violate the global torso-clearance budget.`);previous=poses;}
  segments.push({start:segmentStart,figure,binding:epoch,sample});current=sample(segmentStart+figure.beats).poses;start+=figure.beats;
 }
 const locate=(beat:number)=>{if(!Number.isFinite(beat)||beat<0||beat>totalBeats)throw new Error('Sample outside the declared source section.');const i=Math.max(0,segments.findLastIndex(s=>s.start<=beat));return{i,segment:segments[i]};};
 return Object.freeze({totalBeats,starts:Object.freeze(segments.map(s=>s.start)),end:freeze(current.map(copy)),endBinding:binding,events:freeze(events),bindingAt(beat:number){return locate(beat).segment.binding;},sample(beat:number):Frame{const{i,segment}=locate(beat),frame=segment.sample(beat);return{beat,localBeat:beat,repeat:0,figureIndex:i,figureProgress:Math.min(1,(beat-segment.start)/segment.figure.beats),...frame,warnings:[]};}});
}
