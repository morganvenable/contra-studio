import {assertProgressionMarkers} from './figure-semantics.ts';
import type {Figure} from './types.ts';
/** Event-indexed finite-line topology. Source timing, circulation and role placement
 * are separate assertions. A topology event never moves a body or selects a
 * neighbor by proximity. This adapter can be used by a figure which supplies its
 * own progression trajectory (half hey, star, rollaway, etc.). */
import type {Dancer,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';

export type Circulation='cw'|'ccw';
export type RoleArrangement='lark-left'|'lark-right';
export type PhysicalEnd='top'|'bottom';
export interface ProgressionEvidence {sourceId:string;url:string;clause:string;basis:'source-explicit'|'reviewed-interpretation';}
export interface ProgressionAssertion<T> {value:T;evidence:ProgressionEvidence;}
export interface SelectedAssertion<T> {selected:ProgressionAssertion<T>;alternatives:readonly ProgressionAssertion<T>[];}
export interface ActorGroup {id:string;actors:readonly number[];}
export interface GroupBinding {epoch:number;groups:readonly ActorGroup[];waitingIds:readonly number[];relations:BoundRelationships;}
export interface BindingChange {id:string;beat:number;expectedEpoch:number;groups:readonly ActorGroup[];neighborPairs:readonly(readonly[number,number])[];waitingIds:readonly number[];evidence:ProgressionEvidence;}
export interface EndpointConstraint {id:number;position:Vec2;yaw?:number;}
const EPS=1e-7;
const finitePoint=(p:Vec2)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const finiteBeat=(n:number)=>Number.isFinite(n)&&n>=0;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDiff=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const copyPose=(p:Pose):Pose=>({...p,position:{...p.position},balance:p.balance?{...p.balance}:undefined,arch:p.arch?{...p.arch}:undefined});
function freeze<T>(o:T):T {if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;}
function evidence(e:ProgressionEvidence):ProgressionEvidence {
 if(!e||!e.sourceId?.trim()||!e.url?.trim()||!e.clause?.trim()||!['source-explicit','reviewed-interpretation'].includes(e.basis))throw new Error('A progression needs an explicit source or reviewed interpretation decision.');
 return freeze({...e});
}
function readonlyMap<K,V>(values:Iterable<readonly[K,V]>):ReadonlyMap<K,V>{
 const map=new Map(values);const view:ReadonlyMap<K,V>={get size(){return map.size;},get:k=>map.get(k),has:k=>map.has(k),keys:()=>map.keys(),values:()=>map.values(),entries:()=>map.entries(),[Symbol.iterator]:()=>map[Symbol.iterator](),forEach:(fn,thisArg)=>map.forEach((v,k)=>fn.call(thisArg,v,k,view))};return Object.freeze(view);
}
/** Conflicting source assertions must have a selected source identity. Selecting
 * one interpretation retains every other assertion, including registry metadata. */
export function selectProgressionAssertion<T>(assertions:readonly ProgressionAssertion<T>[],sourceId?:string):SelectedAssertion<T>{
 if(!assertions.length||assertions.length>64)throw new Error('One to 64 source assertions are required.');
 const owned=assertions.map(a=>freeze({value:structuredClone(a.value),evidence:evidence(a.evidence)}));
 const values=new Set(owned.map(a=>JSON.stringify(a.value)));
 if(values.size>1&&!sourceId)throw new Error('Conflicting progression sources require an explicit source selection.');
 const selected=sourceId?owned.find(a=>a.evidence.sourceId===sourceId):owned[0];
 if(!selected||sourceId&&owned.filter(a=>a.evidence.sourceId===sourceId).length!==1)throw new Error('The selected source must identify exactly one progression assertion.');
 return freeze({selected,alternatives:owned});
}

/** Four is a figure constraint, not a topology constraint. This boundary accepts
 * any explicitly partitioned groups and reciprocal named-neighbor pairs. */
export function bindActorGroups(dancers:readonly Dancer[],input:{epoch:number;groups:readonly ActorGroup[];neighborPairs:readonly(readonly[number,number])[];waitingIds?:readonly number[]}):GroupBinding{
 if(!Number.isSafeInteger(input.epoch)||input.epoch<0||!dancers.length||dancers.length>256||new Set(dancers.map(d=>d.id)).size!==dancers.length||dancers.some(d=>!Number.isSafeInteger(d.id)||d.id<0||!Number.isSafeInteger(d.couple)||d.couple<0||!['lark','robin'].includes(d.role)))throw new Error('A binding needs a bounded stable actor roster and a safe epoch.');
 const actors=new Map(dancers.map(d=>[d.id,d])),partners:[number,number][]=[],couples=new Map<number,Dancer[]>();
 for(const d of dancers)couples.set(d.couple,[...(couples.get(d.couple)??[]),d]);
 for(const pair of couples.values()){if(pair.length!==2||pair[0].role===pair[1].role)throw new Error('Persistent partners must be two explicit opposite-role identities.');partners.push([pair[0].id,pair[1].id],[pair[1].id,pair[0].id]);}
 const groupOf=new Map<number,string>();
 if(new Set(input.groups.map(g=>g.id)).size!==input.groups.length)throw new Error('Group identifiers must be unique at one epoch.');
 const groups=input.groups.map(g=>{if(!g.id.trim()||g.actors.length<2||new Set(g.actors).size!==g.actors.length)throw new Error('A group needs distinct explicit actors.');for(const id of g.actors){if(!actors.has(id)||groupOf.has(id))throw new Error('Every active actor must belong to exactly one group.');groupOf.set(id,g.id);}return freeze({id:g.id,actors:[...g.actors]});});
 const waitingIds=[...(input.waitingIds??[])];
 if(new Set(waitingIds).size!==waitingIds.length||waitingIds.some(id=>!actors.has(id)||groupOf.has(id))||waitingIds.length+groupOf.size!==dancers.length)throw new Error('Active groups and explicit waiting actors must partition the full roster.');
 const neighbors:[number,number][]=[],seen=new Set<number>();
 for(const pair of input.neighborPairs){const[a,b]=pair;if(pair.length!==2||a===b||!actors.has(a)||!actors.has(b)||!groupOf.has(a)||groupOf.get(a)!==groupOf.get(b)||seen.has(a)||seen.has(b))throw new Error('Each current-neighbor pair must be reciprocal, unique, and in its explicit active group.');seen.add(a);seen.add(b);neighbors.push([a,b],[b,a]);}
 return Object.freeze({epoch:input.epoch,groups:Object.freeze(groups),waitingIds:Object.freeze(waitingIds),relations:Object.freeze({epoch:input.epoch,partner:readonlyMap(partners),neighbor:readonlyMap(neighbors)})});
}

/** Validate the producing figure's actual endpoint before rebinding. This does
 * not translate, reset or turn the supplied poses. */
export function rebindAtEndpoint(dancers:readonly Dancer[],before:GroupBinding,change:BindingChange,poses:readonly Pose[],expected:readonly EndpointConstraint[],tolerance=.001):GroupBinding{
 evidence(change.evidence);
 if(!change.id?.trim()||!finiteBeat(change.beat)||change.expectedEpoch!==before.epoch)throw new Error('A binding event cannot consume a stale epoch or implicit timing.');
 if(!Number.isFinite(tolerance)||tolerance<0||tolerance>.05)throw new Error('Endpoint tolerance must not conceal a formation reset.');
 const ids=new Set(dancers.map(d=>d.id)),actual=new Map(poses.map(p=>[p.id,p]));
 if(poses.length!==ids.size||actual.size!==ids.size||poses.some(p=>!ids.has(p.id)||!finitePoint(p.position)||!Number.isFinite(p.yaw))||expected.length!==ids.size||new Set(expected.map(p=>p.id)).size!==ids.size)throw new Error('An endpoint assertion must cover every stable actor exactly once.');
 for(const q of expected){const p=actual.get(q.id);if(!p||!finitePoint(q.position)||q.yaw!==undefined&&!Number.isFinite(q.yaw)||distance(p.position,q.position)>tolerance||q.yaw!==undefined&&Math.abs(angleDiff(p.yaw,q.yaw))>.05)throw new Error(`Actor ${q.id} has not reached the declared progression endpoint; no reset was invented.`);}
 const after=bindActorGroups(dancers,{epoch:before.epoch+1,groups:change.groups,neighborPairs:change.neighborPairs,waitingIds:change.waitingIds});
 for(const d of dancers)if(after.relations.partner.get(d.id)!==before.relations.partner.get(d.id))throw new Error('Progression cannot rewrite a persistent partner identity.');
 return after;
}

export interface EndExchangeOptions {
 ids:readonly[number,number];roles:ReadonlyMap<number,'lark'|'robin'>;entry:readonly Pose[];
 end:PhysicalEnd;roleArrangement:RoleArrangement;startBeat:number;beats:number;outwardClearance?:number;evidence:ProgressionEvidence;
}
export interface EndExchange {ids:readonly number[];startBeat:number;endBeat:number;end:PhysicalEnd;exit:readonly Pose[];sample(beat:number):Pose[];}
/** Pandora-style split partners at one finite end. Both identity endpoints are
 * explicit; reverse role placement is independent of progression direction.
 * The exchange occupies a compact beat interval and then is completely still. */
export function compileSameEndExchange(options:EndExchangeOptions):EndExchange{
 const {startBeat,beats,end,roleArrangement}=options;evidence(options.evidence);
 if(!finiteBeat(startBeat)||!Number.isFinite(beats)||beats<4||beats>12||!['top','bottom'].includes(end)||!['lark-left','lark-right'].includes(roleArrangement)||options.ids.length!==2||options.ids[0]===options.ids[1])throw new Error('An end exchange needs two identities, one physical end and a compact 4–12 beat interval.');
 const entry=options.ids.map(id=>{const matches=options.entry.filter(p=>p.id===id);if(matches.length!==1)throw new Error('End actors must have exact keyed incoming poses.');return copyPose(matches[0]);});
 if(entry.some(p=>!finitePoint(p.position)||!Number.isFinite(p.yaw))||options.ids.filter(id=>options.roles.get(id)==='lark').length!==1||options.ids.filter(id=>options.roles.get(id)==='robin').length!==1)throw new Error('An end exchange needs finite poses and explicit opposite roles.');
 const a=entry[0].position,b=entry[1].position,center={x:(a.x+b.x)/2,z:(a.z+b.z)/2},halfWidth=Math.abs(a.x-b.x)/2,out=end==='top'?-1:1,inwardYaw=end==='top'?0:Math.PI,clearance=options.outwardClearance??.45;
 if(Math.abs(a.z-b.z)>.001||halfWidth<.4||halfWidth>1.4||!Number.isFinite(clearance)||clearance<0||clearance>.8)throw new Error('This end policy requires split partners across the same physical end row.');
 // At the top, facing down the hall, left is +x. At the bottom it is -x.
 const larkXSign=(roleArrangement==='lark-left'?1:-1)*(end==='top'?1:-1);
 if(1.5*Math.PI*(halfWidth+clearance)/beats>1.8)throw new Error('The compact same-end exchange exceeds its explicit walking-speed budget.');
 const destination=new Map(entry.map(p=>[p.id,{x:center.x+(options.roles.get(p.id)==='lark'?larkXSign:-larkXSign)*halfWidth,z:center.z}]));
 const exchange=distance(entry[0].position,destination.get(entry[0].id)!)>.001;
 const sample=(beat:number):Pose[]=>{if(!Number.isFinite(beat))throw new Error('End sampling requires a finite beat.');const u=smooth((beat-startBeat)/beats),theta=Math.PI*u;return entry.map(p=>{const radial={x:p.position.x-center.x,z:p.position.z-center.z};const position=exchange?{x:center.x+radial.x*Math.cos(theta)-radial.z*Math.sin(theta),z:center.z+radial.x*Math.sin(theta)+radial.z*Math.cos(theta)+out*clearance*Math.sin(theta)}:{...p.position};const yaw=p.yaw+angleDiff(inwardYaw,p.yaw)*u;return{...p,position,yaw,stride:exchange&&u>0&&u<1?.65:0,lean:0,bounce:0,turn:0,activity:'waiting',balance:undefined,arch:undefined};});};
 const exit=sample(startBeat+beats);return Object.freeze({ids:Object.freeze([...options.ids]),startBeat,endBeat:startBeat+beats,end,exit:freeze(exit),sample});
}

export interface SameEndArcOptions {from:Vec2;to:Vec2;end:PhysicalEnd;startBeat:number;beats:number;depth?:number;evidence:ProgressionEvidence;}
/** Scoped bicycle-chain turn around a physical end. The caller owns the named
 * encounter order and inbound/outbound tracks; this arc cannot wrap hall ends. */
export function compileSameEndArc(options:SameEndArcOptions){
 evidence(options.evidence);const {startBeat,beats,end}=options,from={...options.from},to={...options.to},depth=options.depth??Math.abs(from.x-to.x)/2;
 if(!finitePoint(from)||!finitePoint(to)||Math.abs(from.z-to.z)>.001||from.x===to.x||!['top','bottom'].includes(end)||!finiteBeat(startBeat)||!Number.isFinite(beats)||beats<2||beats>12||!Number.isFinite(depth)||depth<=0||depth>2)throw new Error('A bicycle-chain end arc needs opposite sidelines at the same physical end and explicit feasible timing.');
 const center={x:(from.x+to.x)/2,z:(from.z+to.z)/2},radius=(from.x-to.x)/2,sign=end==='top'?-1:1;
 if(1.5*Math.PI*Math.max(Math.abs(radius),depth)/beats>1.8)throw new Error('The same-end arc is too long for its source beat budget.');
 return Object.freeze({startBeat,endBeat:startBeat+beats,end,from:freeze(from),to:freeze(to),sample(beat:number):Vec2{if(!Number.isFinite(beat))throw new Error('End arc sampling requires a finite beat.');const t=smooth((beat-startBeat)/beats);return{x:center.x+radius*Math.cos(Math.PI*t),z:center.z+sign*depth*Math.sin(Math.PI*t)};}});
}

export interface FiniteCouple {id:number;larkId:number;robinId:number;side:'east'|'west';rank:number;status:'active'|'waiting'|'ready-to-reenter';}
export interface FiniteBecketState {formation:'becket';circulation:Circulation;roleArrangement:RoleArrangement;epoch:number;rowGap:number;halfWidth:number;couples:readonly FiniteCouple[];binding:GroupBinding;}
const sideSign=(side:'east'|'west')=>side==='east'?1:-1;
const roster=(couples:readonly FiniteCouple[]):Dancer[]=>couples.flatMap(c=>[{id:c.larkId,name:`Lark ${c.id+1}`,role:'lark' as const,couple:c.id,direction:1 as const,color:''},{id:c.robinId,name:`Robin ${c.id+1}`,role:'robin' as const,couple:c.id,direction:1 as const,color:''}]);
function finiteBinding(couples:readonly FiniteCouple[],epoch:number):GroupBinding{
 const groups:ActorGroup[]=[],pairs:[number,number][]=[],active=new Set<number>();
 for(const east of couples.filter(c=>c.side==='east')){const west=couples.find(c=>c.side==='west'&&c.rank===east.rank);if(west){groups.push({id:`${epoch}:${east.id}:${west.id}`,actors:[east.larkId,east.robinId,west.larkId,west.robinId]});pairs.push([east.larkId,west.robinId],[east.robinId,west.larkId]);active.add(east.id);active.add(west.id);}}
 return bindActorGroups(roster(couples),{epoch,groups,neighborPairs:pairs,waitingIds:couples.filter(c=>!active.has(c.id)).flatMap(c=>[c.larkId,c.robinId])});
}
function makeState(s:Omit<FiniteBecketState,'binding'>):FiniteBecketState{return freeze({...s,binding:finiteBinding(s.couples,s.epoch)});}
export function createFiniteBecketState(count:number,options:{circulation:Circulation;roleArrangement:RoleArrangement;rowGap?:number;halfWidth?:number}):FiniteBecketState{
 if(!Number.isInteger(count)||count<2||count>12||!['cw','ccw'].includes(options.circulation)||!['lark-left','lark-right'].includes(options.roleArrangement))throw new Error('Choose 2–12 couples with explicit circulation and role arrangement.');
 const rowGap=options.rowGap??1.8,halfWidth=options.halfWidth??.9;if(!Number.isFinite(rowGap)||rowGap<=0||!Number.isFinite(halfWidth)||halfWidth<=0)throw new Error('Finite positive formation dimensions are required.');
 const pairs=Math.floor(count/2),couples:FiniteCouple[]=[];
 for(let row=0;row<pairs;row++)for(const side of['east','west'] as const){const id=couples.length;couples.push({id,larkId:id*2,robinId:id*2+1,side,rank:2*row-(pairs-1),status:'active'});}
 if(count%2){const id=couples.length;couples.push({id,larkId:id*2,robinId:id*2+1,side:options.circulation==='cw'?'west':'east',rank:pairs+1,status:'ready-to-reenter'});}
 return makeState({formation:'becket',circulation:options.circulation,roleArrangement:options.roleArrangement,epoch:0,rowGap,halfWidth,couples});
}
export function finiteBecketPoses(state:FiniteBecketState):Pose[]{return state.couples.flatMap(c=>{const sign=sideSign(c.side),roles=state.roleArrangement==='lark-left'?1:-1;return[{id:c.larkId,offset:1},{id:c.robinId,offset:-1}].map(d=>({id:d.id,position:{x:sign*state.halfWidth,z:c.rank*state.rowGap+sign*roles*d.offset*state.rowGap/2},yaw:-sign*Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting' as const}));}).sort((a,b)=>a.id-b.id);}
export interface FiniteProgressionStep {id:string;startBeat:number;travelBeats:number;direction:1|-1;endTurnDelay:number;endTurnBeats:number;evidence:ProgressionEvidence;}
export interface FiniteProgressionPlan {before:FiniteBecketState;afterTravel:FiniteBecketState;nextState:FiniteBecketState;step:FiniteProgressionStep;rebindBeat:number;settledBeat:number;waitingCouples:readonly number[];sample(beat:number):Pose[];}
/** One semantic neighbor progression. Double progression is two explicitly timed
 * steps, each with its own epoch and finite-end policy, never one long jump. */
export function compileFiniteBecketProgression(state:FiniteBecketState,raw:FiniteProgressionStep):FiniteProgressionPlan{
 if(state.formation!=='becket'||!['cw','ccw'].includes(state.circulation)||!['lark-left','lark-right'].includes(state.roleArrangement)||!Number.isSafeInteger(state.epoch)||state.epoch<0||!Number.isFinite(state.rowGap)||state.rowGap<=0||!Number.isFinite(state.halfWidth)||state.halfWidth<=0||state.couples.length<2||state.couples.length>12||state.couples.some((c,i)=>c.id!==i||c.larkId!==2*i||c.robinId!==2*i+1||!['east','west'].includes(c.side)||!['active','waiting','ready-to-reenter'].includes(c.status)))throw new Error('Malformed finite Becket identity, geometry or formation state.');
 const expectedBinding=finiteBinding(state.couples,state.epoch);
 if(state.binding.epoch!==state.epoch||JSON.stringify(state.binding.groups)!==JSON.stringify(expectedBinding.groups)||JSON.stringify(state.binding.waitingIds)!==JSON.stringify(expectedBinding.waitingIds)||[...expectedBinding.relations.partner].some(([a,b])=>state.binding.relations.partner.get(a)!==b)||[...expectedBinding.relations.neighbor].some(([a,b])=>state.binding.relations.neighbor.get(a)!==b)||state.binding.relations.neighbor.size!==expectedBinding.relations.neighbor.size)throw new Error('The finite formation has stale explicit relationship bindings.');
 state=makeState({...state,couples:state.couples.map(c=>({...c}))});
 const step=freeze({...raw,evidence:evidence(raw.evidence)});
 if(!step.id.trim()||!finiteBeat(step.startBeat)||!Number.isFinite(step.travelBeats)||step.travelBeats<=0||step.travelBeats>64||![-1,1].includes(step.direction)||!finiteBeat(step.endTurnDelay)||!Number.isFinite(step.endTurnBeats)||step.endTurnBeats<4||step.endTurnBeats>12)throw new Error('A progression needs explicit feasible travel and compact end-turn timing.');
 if(state.couples.some(c=>c.status==='waiting')||new Set(state.couples.map(c=>`${c.side}:${c.rank}`)).size!==state.couples.length||state.couples.some(c=>!Number.isSafeInteger(c.rank)))throw new Error('Incoming finite slots must be unique, settled and integral.');
 if(state.rowGap*1.5/step.travelBeats>1.8)throw new Error('The one-place progression exceeds the walking-speed budget.');
 const direction=(state.circulation==='cw'?1:-1)*step.direction,moved=state.couples.map(c=>({...c,rank:c.rank+sideSign(c.side)*direction}));
 const preliminary=finiteBinding(moved,state.epoch+1),waitingIds=new Set(preliminary.waitingIds),waiting=moved.filter(c=>waitingIds.has(c.larkId)),active=moved.filter(c=>!waitingIds.has(c.larkId));
 if(waiting.length>2||waiting.some(c=>active.length&&c.rank>=Math.min(...active.map(a=>a.rank))&&c.rank<=Math.max(...active.map(a=>a.rank))))throw new Error('An unmatched middle couple cannot be reassigned to an end.');
 const afterTravel=makeState({...state,epoch:state.epoch+1,couples:moved.map(c=>({...c,status:waitingIds.has(c.larkId)?'waiting':'active'}))});
 const nextState=makeState({...state,epoch:state.epoch+1,couples:afterTravel.couples.map(c=>waitingIds.has(c.larkId)?{...c,side:c.side==='east'?'west':'east',status:'ready-to-reenter'}:{...c})});
 const rebindBeat=step.startBeat+step.travelBeats,settledBeat=rebindBeat+(waiting.length?step.endTurnDelay+step.endTurnBeats:0),initial=finiteBecketPoses(state),shifted=finiteBecketPoses(afterTravel),final=finiteBecketPoses(nextState),waitingCouples=Object.freeze(waiting.map(c=>c.id));
 const sample=(beat:number):Pose[]=>{if(!Number.isFinite(beat))throw new Error('Progression sampling requires a finite beat.');const travel=smooth((beat-step.startBeat)/step.travelBeats),turn=smooth((beat-rebindBeat-step.endTurnDelay)/step.endTurnBeats);return initial.map(p=>{const c=state.couples.find(c=>c.larkId===p.id||c.robinId===p.id)!,out=sideSign(c.side)*direction;if(beat<=rebindBeat)return{...p,position:{x:p.position.x,z:p.position.z+out*state.rowGap*travel},stride:travel>0&&travel<1?.65:0,activity:'becket-shift'};if(!waitingIds.has(p.id))return copyPose(shifted[p.id]);const q=shifted[p.id],centerZ=afterTravel.couples.find(d=>d.id===c.id)!.rank*state.rowGap,radialZ=q.position.z-centerZ,theta=-sideSign(c.side)*Math.PI*turn;return{...q,position:{x:sideSign(c.side)*state.halfWidth*(1-2*turn)-radialZ*Math.sin(theta),z:centerZ+radialZ*Math.cos(theta)+out*.45*Math.sin(Math.PI*turn)},yaw:q.yaw+angleDiff(final[p.id].yaw,q.yaw)*turn,stride:turn>0&&turn<1?.65:0,activity:'waiting'};});};
 return Object.freeze({before:state,afterTravel,nextState,step,rebindBeat,settledBeat,waitingCouples,sample});
}

export function compileFiniteProgressionSchedule(initial:FiniteBecketState,steps:readonly FiniteProgressionStep[],options:{totalBeats:number;expectedCount:number}){
 if(!Number.isFinite(options.totalBeats)||options.totalBeats<=0||!Number.isInteger(options.expectedCount)||Math.abs(options.expectedCount)>64||steps.length>64||new Set(steps.map(s=>s.id)).size!==steps.length||steps.reduce((n,s)=>n+s.direction,0)!==options.expectedCount)throw new Error('Source progression count and explicitly timed events must agree.');
 const plans:FiniteProgressionPlan[]=[];let state=initial,last=0;
 for(const step of steps){if(step.startBeat<last)throw new Error('A new progression cannot start before the preceding end turn is settled.');const plan=compileFiniteBecketProgression(state,step);plans.push(plan);state=plan.nextState;last=plan.settledBeat;}
 if(last>options.totalBeats)throw new Error('Finite-end motion exceeds the source phrase budget.');
 return Object.freeze({totalBeats:options.totalBeats,plans:Object.freeze(plans),netProgression:options.expectedCount,nextState:state,sample(beat:number):Pose[]{if(!Number.isFinite(beat)||beat<0||beat>options.totalBeats)throw new Error('Sample outside the declared source section.');const plan=plans.findLast(p=>p.step.startBeat<=beat);return plan?plan.sample(beat):finiteBecketPoses(initial);},bindingAt(beat:number):GroupBinding{if(!Number.isFinite(beat)||beat<0||beat>options.totalBeats)throw new Error('Sample outside the declared source section.');const plan=plans.findLast(p=>p.rebindBeat<=beat);return plan?plan.afterTravel.binding:initial.binding;}});
}

/** Exact integer-slot diagonals. Missing end counterparts are returned explicitly;
 * no actor is borrowed from another row and no cyclic wrapping is performed. */
export function bindBecketDiagonal(state:FiniteBecketState,side:'left'|'right'):{groups:readonly ActorGroup[];unmatchedCouples:readonly number[]}{
 if(!['left','right'].includes(side))throw new Error('The diagonal side must be explicit.');
 const offset=side==='right'?-2:2,groups:ActorGroup[]=[],used=new Set<number>();
 for(const east of state.couples.filter(c=>c.side==='east')){const west=state.couples.find(c=>c.side==='west'&&c.rank===east.rank+offset);if(west){groups.push({id:`diagonal:${state.epoch}:${side}:${east.id}:${west.id}`,actors:[east.larkId,east.robinId,west.larkId,west.robinId]});used.add(east.id);used.add(west.id);}}
 return freeze({groups,unmatchedCouples:state.couples.filter(c=>!used.has(c.id)).map(c=>c.id)});
}

export interface DirectedCoupleSlot {coupleId:number;rank:number;direction:1|-1;}
/** Bind neighboring integer ranks in a finite improper line after a producing
 * figure has declared each couple's slot and travel direction. These are logical
 * slot assertions, not a spatial nearest-neighbor search. Useful after Pandora's
 * completed half hey and after an improper star's actual permutation. */
export function bindDirectedCoupleSlots(dancers:readonly Dancer[],epoch:number,slots:readonly DirectedCoupleSlot[]):GroupBinding{
 const byCouple=new Map<number,Dancer[]>();for(const d of dancers)byCouple.set(d.couple,[...(byCouple.get(d.couple)??[]),d]);
 if(slots.length!==byCouple.size||new Set(slots.map(s=>s.coupleId)).size!==slots.length||new Set(slots.map(s=>s.rank)).size!==slots.length||slots.some(s=>!byCouple.has(s.coupleId)||!Number.isSafeInteger(s.rank)||![-1,1].includes(s.direction)))throw new Error('Every persistent couple needs one explicit unique integer rank and direction.');
 const ordered=slots.map(s=>({...s})).sort((a,b)=>a.rank-b.rank),groups:ActorGroup[]=[],neighborPairs:[number,number][]=[],waitingIds:number[]=[];
 for(let i=0;i<ordered.length;){const a=ordered[i],b=ordered[i+1];if(b&&a.direction===1&&b.direction===-1&&b.rank===a.rank+1){const A=byCouple.get(a.coupleId)!,B=byCouple.get(b.coupleId)!,al=A.find(d=>d.role==='lark')!,ar=A.find(d=>d.role==='robin')!,bl=B.find(d=>d.role==='lark')!,br=B.find(d=>d.role==='robin')!;if(!al||!ar||!bl||!br)throw new Error('Explicit opposite-role persistent partners are required.');groups.push({id:`${epoch}:r${a.rank}:${a.coupleId}:${b.coupleId}`,actors:[al.id,ar.id,bl.id,br.id]});neighborPairs.push([al.id,br.id],[ar.id,bl.id]);i+=2;}else{if(i!==0&&i!==ordered.length-1)throw new Error('An unmatched interior rank is not a finite end.');waitingIds.push(...byCouple.get(a.coupleId)!.map(d=>d.id));i++;}}
 return bindActorGroups(dancers,{epoch,groups,neighborPairs,waitingIds});
}

/** Direct compiler boundary: event semantics are explicit, owned and cannot be
 * smuggled through a second declaration or an unconsumed modifier. */
export function ownProgressionDeclaration(dance:{figures?:readonly Figure[];progressionEvents?:readonly unknown[]},raw:{afterFigureId:string;count:number;waitingRoleArrangement:RoleArrangement;initialBinding?:'retain-starting-neighbors';source:ProgressionEvidence}){
 const keys=['afterFigureId','count','waitingRoleArrangement','initialBinding','source'];
 if(!raw||raw.initialBinding!==undefined&&raw.initialBinding!=='retain-starting-neighbors'||Object.keys(raw).some(k=>!keys.includes(k))||!raw.afterFigureId?.trim()||!Number.isSafeInteger(raw.count)||!['lark-left','lark-right'].includes(raw.waitingRoleArrangement)||Object.keys(raw.source??{}).some(k=>!['sourceId','url','clause','basis'].includes(k)))throw new Error('Every progression event argument must be explicitly consumed.');
 if(dance.figures){const at=dance.figures.flatMap((f,i)=>f.id===raw.afterFigureId?[i]:[]);if(at.length!==1)throw new Error('A progression event must identify exactly one figure boundary.');assertProgressionMarkers(dance.figures,at[0]);}
 const owned=freeze({...raw,source:evidence(raw.source)});
 const same=(a:unknown,b:unknown)=>a&&b&&typeof a==='object'&&typeof b==='object'?JSON.stringify(Object.entries(a).sort(([x],[y])=>x.localeCompare(y)))===JSON.stringify(Object.entries(b).sort(([x],[y])=>x.localeCompare(y))):a===b;
 if(dance.progressionEvents!==undefined){if(!Array.isArray(dance.progressionEvents)||dance.progressionEvents.length!==1)throw new Error('This compiler consumes exactly one declared source progression event.');const value=dance.progressionEvents[0];if(!value||typeof value!=='object'||Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!same((value as Record<string,unknown>)[k],(raw as unknown as Record<string,unknown>)[k])))throw new Error('The selected progression event contradicts the dance declaration.');}
 return owned;
}

/** UI-facing finite-end cues come from the current explicit partition, not an
 * assumed every-other repeat or a dancer's nearest visible neighbor. */
export function describeBoundEndEffects(dancers:readonly Dancer[],binding:GroupBinding,poses:readonly Pose[],roleArrangement:RoleArrangement,nextEntryBeat:number,motionPhase:'same-end-exchange'|'reentry-preparation'='same-end-exchange'):string[]{
 const couples=[...new Set(binding.waitingIds.map(id=>dancers[id].couple))].sort((a,b)=>a-b);
 return couples.map(c=>{const ids=binding.waitingIds.filter(id=>dancers[id].couple===c),z=ids.reduce((n,id)=>n+poses[id].position.z,0)/ids.length,moving=ids.some(id=>poses[id].stride>0),placement=roleArrangement==='lark-right'?'lark right, robin left (indecent)':'lark left, robin right',entry=`Re-enter at the declared neighbor change on count ${Math.round(nextEntryBeat)+1}.`,action=motionPhase==='reentry-preparation'?'prepare to re-enter':moving?'complete the compact same-end exchange':'wait out';return `Couple ${c+1}: ${action} at the ${z<0?'top':'bottom'}; ${placement}. ${entry}`;});
}
