/** One actual-state whole-set slice. The figure owns diagonal-forward / straight-
 * back roots, while the existing finite topology declares the endpoint groups.
 * It does not recognize a dance table, initialize a formation, or reset roots. */
import {capturePlainData} from './owned-program-cache.ts';
import {advanceSequenceBeat,ownSequenceBoundary,type SequenceBoundary,type SequenceBoundaryPose} from './sequence-boundary.ts';
import {bindActorGroups,compileFiniteBecketProgression,finiteBecketPoses,rebindAtEndpoint,type ActorGroup,type BindingChange,type FiniteBecketState,type GroupBinding,type ProgressionEvidence} from './progression-topology.ts';
import type {FormationActor} from './formation-handoff.ts';
import type {Dancer,Figure,FiniteEndPolicy,HandContact,Pose,Vec2} from './types.ts';

export interface BecketSliceBoundary {
 readonly sourceBeat:number;readonly relationshipEpoch:number;
 readonly actors:readonly FormationActor[];readonly partner:readonly (readonly [number,number])[];readonly neighbor:readonly (readonly [number,number])[];
 readonly groups:readonly ActorGroup[];readonly waitingIds:readonly number[];
 readonly poses:readonly SequenceBoundaryPose[];readonly heldContacts:readonly HandContact[];
}
export interface BecketSliceOptions {
 readonly compactAdvance?:.34;
 readonly progressionSource:ProgressionEvidence;
 /** Separate reviewed allocation; the source says eight total counts only. */
 readonly timingSource:ProgressionEvidence;
 readonly endPolicy:FiniteEndPolicy;
}
export interface BecketSlicePlan {
 readonly entryState:BecketSliceBoundary;readonly exitState:BecketSliceBoundary;
 readonly afterTravel:FiniteBecketState;readonly nextState:FiniteBecketState;
 readonly change:BindingChange;readonly endBinding:GroupBinding;
 readonly waitingCouples:readonly number[];readonly rebindBeat:number;readonly settledBeat:number;
 readonly origin:Readonly<Vec2>;
 sample(sourceBeat:number):{poses:Pose[];contacts:HandContact[]};
 /** Actual waiting bodies only, during/after their explicit same-end exchange. */
 sampleWaiting(sourceBeat:number):Pose[];
}
const EPS=1e-7,clamp=(x:number)=>Math.max(0,Math.min(1,x)),ease=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
const diff=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){for(const value of Object.values(x))freeze(value);Object.freeze(x);}return x;};
const keys=(x:object,allowed:readonly string[],label:string)=>{if(Object.keys(x).some(k=>!allowed.includes(k)))throw new Error(`${label} contains an unconsumed declaration.`);};
const evidence=(raw:ProgressionEvidence,basis:ProgressionEvidence['basis'])=>{const e=capturePlainData(raw);keys(e,['sourceId','url','clause','basis'],'Slice evidence');if(e.basis!==basis||![e.sourceId,e.url,e.clause].every(v=>typeof v==='string'&&v.trim()))throw new Error(`Slice evidence must explicitly retain its ${basis} provenance.`);return freeze(e);};
const asDancers=(actors:readonly FormationActor[]):Dancer[]=>actors.map(a=>({...a,name:`Actor ${a.id}`,color:'',direction:1}));
const pairKey=(pairs:readonly(readonly[number,number])[])=>JSON.stringify([...pairs].sort((a,b)=>a[0]-b[0]));

/** Capture all actual actors, including a finite waiter. Active groups use the
 * existing four-actor seam validator; no waiter is borrowed into a minor set. */
export function ownBecketSliceBoundary(raw:BecketSliceBoundary):BecketSliceBoundary {
 const b=capturePlainData(raw);keys(b,['sourceBeat','relationshipEpoch','actors','partner','neighbor','groups','waitingIds','poses','heldContacts'],'Whole-set slice boundary');
 if(!Number.isFinite(b.sourceBeat)||b.sourceBeat<0||!Array.isArray(b.actors)||b.actors.length<4||b.actors.length>24||b.actors.some((a,i)=>a.id!==i)||!Array.isArray(b.poses)||b.poses.length!==b.actors.length||!Array.isArray(b.heldContacts)||!Array.isArray(b.partner)||!Array.isArray(b.neighbor))throw new Error('A whole-set slice needs its exact clock, stable roster, actual roots and explicit contacts.');
 for(const a of b.actors)keys(a,['id','role','couple'],'Slice actor');
 const binding=bindActorGroups(asDancers(b.actors),{epoch:b.relationshipEpoch,groups:b.groups,waitingIds:b.waitingIds,neighborPairs:b.neighbor.filter(([a,c])=>a<c)});
 if(pairKey(b.partner)!==pairKey([...binding.relations.partner])||pairKey(b.neighbor)!==pairKey([...binding.relations.neighbor]))throw new Error('A whole-set slice cannot replace persistent partners or current neighbors.');
 if(new Set(b.poses.map(p=>p.id)).size!==b.actors.length||b.poses.some(p=>!b.actors[p.id]||![p.position?.x,p.position?.z,p.yaw].every(Number.isFinite)))throw new Error('Slice roots must cover every stable actor with finite actual position and facing.');
 for(const p of b.poses){keys(p,['id','position','yaw'],'Slice pose');keys(p.position,['x','z'],'Slice root');}
 for(const g of b.groups){keys(g,['id','actors'],'Slice group');if(g.actors.length!==4)throw new Error('Each active slice group must contain four explicitly named actors.');const ids=new Set(g.actors);ownSequenceBoundary({sourceBeat:b.sourceBeat,relationshipEpoch:b.relationshipEpoch,actors:b.actors.filter(a=>ids.has(a.id)),partner:b.partner.filter(([a])=>ids.has(a)),neighbor:b.neighbor.filter(([a])=>ids.has(a)),poses:b.poses.filter(p=>ids.has(p.id)),heldContacts:b.heldContacts.filter(c=>ids.has(c.a)||ids.has(c.b))});}
 // This first whole-set path accepts released entries only. A nonzero incoming
 // hold is never silently dropped or replaced with an invented release.
 if(b.heldContacts.length)throw new Error('The slice requires explicitly released incoming hands; a held contact needs its own release adapter.');
 return freeze({...b,poses:[...b.poses].sort((a,c)=>a.id-c.id)});
}
export function captureBecketSliceBoundary(dancers:readonly Dancer[],poses:readonly Pose[],binding:GroupBinding,sourceBeat:number,heldContacts:readonly HandContact[]):BecketSliceBoundary {
 return ownBecketSliceBoundary({sourceBeat,relationshipEpoch:binding.epoch,actors:dancers.map(({id,role,couple})=>({id,role,couple})),partner:[...binding.relations.partner],neighbor:[...binding.relations.neighbor],groups:binding.groups,waitingIds:binding.waitingIds,poses:poses.map(({id,position,yaw})=>({id,position,yaw})),heldContacts});
}
/** Project the actual post-event state into an ordinary reusable minor-set seam. */
export function becketSliceGroupBoundary(boundary:BecketSliceBoundary,group:ActorGroup):SequenceBoundary {
 const b=ownBecketSliceBoundary(boundary),actual=b.groups.find(g=>g.id===group.id);if(!actual||JSON.stringify(actual.actors)!==JSON.stringify(group.actors))throw new Error('The requested minor set is not in the actual slice boundary.');
 const ids=new Set(group.actors);return ownSequenceBoundary({sourceBeat:b.sourceBeat,relationshipEpoch:b.relationshipEpoch,actors:b.actors.filter(a=>ids.has(a.id)),partner:b.partner.filter(([a])=>ids.has(a)),neighbor:b.neighbor.filter(([a])=>ids.has(a)),poses:b.poses.filter(p=>ids.has(p.id)),heldContacts:[]});
}

export function compileBecketSliceStep(input:Figure,incoming:BecketSliceBoundary,state:FiniteBecketState,options:BecketSliceOptions):BecketSlicePlan {
 const f=capturePlainData(input),boundary=ownBecketSliceBoundary(incoming),o=capturePlainData(options);
 keys(f,['id','kind','beats','label','who','direction','phaseBeats','entry','exit','sliceReturn','progression','confidence','notes'],'Slice figure');
 if(f.kind!=='becket-slice'||f.beats!==8||f.who!=='all'||f.direction!=='left'||f.entry!=='side-couples'||f.exit!=='progressed-neighbors'||f.sliceReturn!=='straight-back'||f.progression!==true||!Array.isArray(f.phaseBeats)||f.phaseBeats.length!==2||f.phaseBeats.some(n=>n!==4)||typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence)||f.notes!==undefined&&typeof f.notes!=='string')throw new Error('This slice consumes only eight-count all-dancer left diagonal-forward / straight-back with reviewed four-plus-four timing and its endpoint marker.');
 keys(o,['progressionSource','timingSource','endPolicy','compactAdvance'],'Slice options');if(o.compactAdvance!==undefined&&o.compactAdvance!==.34)throw Error('Compact slice requires its explicit .34m inward approach.');const source=evidence(o.progressionSource,'source-explicit'),timing=evidence(o.timingSource,'reviewed-interpretation'),policy=o.endPolicy;
 keys(policy,['waitingRoleArrangement','sameEndTurnBeats','sameEndTurnOffsetBeats','reentryPreparationBeats','source'],'Slice end policy');const endSource=evidence(policy.source,'reviewed-interpretation');
 if(timing.sourceId!==source.sourceId||timing.url!==source.url||endSource.sourceId!==source.sourceId||endSource.url!==source.url)throw new Error('Slice timing, progression and finite-end choices must bind the same retained source snapshot.');
 if(policy.waitingRoleArrangement!=='lark-left'||policy.sameEndTurnBeats!==8||policy.sameEndTurnOffsetBeats!==undefined&&policy.sameEndTurnOffsetBeats!==0||policy.reentryPreparationBeats!==0)throw new Error('This slice needs a separately reviewed eight-count same-end exchange with lark-left waiting.');
 if(state.circulation!=='cw'||state.roleArrangement!=='lark-left'||state.epoch!==boundary.relationshipEpoch)throw new Error('Literal left slice currently consumes clockwise lark-left Becket with the actual relationship epoch.');
 const dancers=asDancers(boundary.actors),binding=bindActorGroups(dancers,{epoch:boundary.relationshipEpoch,groups:boundary.groups,waitingIds:boundary.waitingIds,neighborPairs:boundary.neighbor.filter(([a,b])=>a<b)});
 if(JSON.stringify(binding.groups)!==JSON.stringify(state.binding.groups)||JSON.stringify(binding.waitingIds)!==JSON.stringify(state.binding.waitingIds)||pairKey(boundary.partner)!==pairKey([...state.binding.relations.partner])||pairKey(boundary.neighbor)!==pairKey([...state.binding.relations.neighbor]))throw new Error('Slice finite slots and actual incoming relationships disagree.');
 if(state.couples.some(c=>boundary.actors[c.larkId]?.couple!==c.id||boundary.actors[c.larkId]?.role!=='lark'||boundary.actors[c.robinId]?.couple!==c.id||boundary.actors[c.robinId]?.role!=='robin'))throw new Error('Slice topology must retain the actual persistent couples.');
 const topology=compileFiniteBecketProgression(state,{id:f.id,startBeat:boundary.sourceBeat,travelBeats:8,direction:1,endTurnDelay:0,endTurnBeats:8,evidence:source});
 state=topology.before;
 const canonical=finiteBecketPoses(topology.before),origin={x:boundary.poses[0].position.x-canonical[0].position.x,z:boundary.poses[0].position.z-canonical[0].position.z};
 if(boundary.poses.some(p=>Math.hypot(p.position.x-canonical[p.id].position.x-origin.x,p.position.z-canonical[p.id].position.z-origin.z)>EPS))throw new Error('The measured incoming roots must occupy the declared finite Becket slots; no canonical reset is allowed.');
 if(o.compactAdvance!==undefined?state.halfWidth!==.64||state.rowGap!==1.28:state.halfWidth<.75||state.halfWidth>1.2||state.rowGap<1.4||state.rowGap>2.4)throw new Error('The left slice requires reviewed finite spacing and across-set torso clearance.');
 const start=boundary.sourceBeat,end=advanceSequenceBeat(start,8),advance=o.compactAdvance??.52,byId=new Map(state.couples.flatMap(c=>[[c.larkId,c],[c.robinId,c]] as const));
 const sample=(sourceBeat:number):{poses:Pose[];contacts:HandContact[]}=>{
  if(!Number.isFinite(sourceBeat)||sourceBeat<start||sourceBeat>end)throw new Error('A slice sample must stay inside its exact source-count interval.');
  const elapsed=sourceBeat-start,out=ease(elapsed/4),back=ease((elapsed-4)/4),inward=advance*(out-back);
  return{poses:boundary.poses.map(p=>{const side=byId.get(p.id)!.side==='east'?1:-1;return{id:p.id,position:{x:p.position.x-side*inward,z:p.position.z+side*state.rowGap*out},yaw:p.yaw+diff(p.yaw,-side*Math.PI/2)*ease(elapsed),stride:elapsed>0&&elapsed<8?.65:0,lean:0,bounce:0,turn:0,activity:'becket-slice'};}),contacts:[]};
 };
 const endpoint=sample(end).poses,change:BindingChange=freeze({id:`${f.id}:slice-neighbors:${state.epoch}`,beat:end,expectedEpoch:state.epoch,groups:topology.afterTravel.binding.groups,neighborPairs:[...topology.afterTravel.binding.relations.neighbor].filter(([a,b])=>a<b),waitingIds:topology.afterTravel.binding.waitingIds,evidence:source});
 // Endpoint assertions are against the explicit finite slots plus the measured
 // world origin; the topology transaction never edits the supplied bodies.
 const expected=finiteBecketPoses(topology.afterTravel).map(p=>({id:p.id,position:{x:p.position.x+origin.x,z:p.position.z+origin.z},yaw:p.yaw}));
 const endBinding=rebindAtEndpoint(dancers,binding,change,endpoint,expected),exitState=captureBecketSliceBoundary(dancers,endpoint,endBinding,end,[]),waiting=new Set(endBinding.waitingIds);
 const sampleWaiting=(sourceBeat:number):Pose[]=>{
  if(!Number.isFinite(sourceBeat)||sourceBeat<end)throw new Error('Finite waiting motion starts at the actual slice endpoint.');
  // Translate the existing physical same-end exchange by the measured origin,
  // anchored exactly to each produced endpoint, rather than installing poses.
  return topology.sample(sourceBeat).filter(p=>waiting.has(p.id)).map(p=>({...p,position:{x:p.position.x+origin.x,z:p.position.z+origin.z},yaw:endpoint[p.id].yaw+diff(endpoint[p.id].yaw,p.yaw)}));
 };
 for(const p of sampleWaiting(end))if(Math.hypot(p.position.x-endpoint[p.id].position.x,p.position.z-endpoint[p.id].position.z)>EPS||Math.abs(diff(p.yaw,endpoint[p.id].yaw))>EPS)throw new Error('Finite-end motion cannot reset the actual slice endpoint.');
 return Object.freeze({entryState:boundary,exitState,afterTravel:topology.afterTravel,nextState:topology.nextState,change,endBinding,waitingCouples:topology.waitingCouples,rebindBeat:end,settledBeat:topology.settledBeat,origin:freeze(origin),sample,sampleWaiting});
}
