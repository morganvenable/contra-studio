/** Source-counted two-count along-set slide from actual finite Becket stations. */
import{capturePlainData}from'./owned-program-cache.ts';
import{advanceSequenceBeat}from'./sequence-boundary.ts';
import{ownBecketSliceBoundary,captureBecketSliceBoundary,type BecketSliceBoundary,type BecketSlicePlan}from'./becket-slice-step.ts';
import{bindActorGroups,compileFiniteBecketProgression,finiteBecketPoses,rebindAtEndpoint,type BindingChange,type FiniteBecketState,type ProgressionEvidence}from'./progression-topology.ts';
import type{FormationActor}from'./formation-handoff.ts';
import type{Dancer,Figure,HandContact,Pose}from'./types.ts';
export interface BecketSlideOptions{progressionSource:ProgressionEvidence;endSource:ProgressionEvidence;}
const EPS=1e-7,ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));},diff=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const keys=(x:object,allowed:readonly string[],label:string)=>{if(Object.keys(x).some(k=>!allowed.includes(k)))throw Error(`${label} contains an unconsumed declaration.`);};
const evidence=(raw:ProgressionEvidence,basis:ProgressionEvidence['basis'])=>{const e=capturePlainData(raw);keys(e,['sourceId','url','clause','basis'],'Slide evidence');if(e.basis!==basis||![e.sourceId,e.url,e.clause].every(v=>typeof v==='string'&&v.trim()))throw Error('Explicit retained slide evidence required.');return freeze(e);};
const asDancers=(actors:readonly FormationActor[]):Dancer[]=>actors.map(a=>({...a,name:`Actor ${a.id}`,color:'',direction:1}));
const pairKey=(pairs:readonly(readonly[number,number])[])=>JSON.stringify([...pairs].sort((a,b)=>a[0]-b[0]));
export function compileBecketSlideStep(input:Figure,incoming:BecketSliceBoundary,state:FiniteBecketState,options:BecketSlideOptions):BecketSlicePlan {
 const f=capturePlainData(input),boundary=ownBecketSliceBoundary(incoming),o=capturePlainData(options);
 keys(f,['id','kind','beats','label','who','direction','progression','confidence','notes'],'Slide figure');
 if(f.kind!=='becket-shift'||f.beats!==2||f.who!=='all'||f.direction!=='left'||f.progression!==true||typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence)||f.notes!==undefined&&typeof f.notes!=='string')throw Error('A carried left slide retains exactly two counts, all couples and its explicit progression marker.');
 keys(o,['progressionSource','endSource'],'Slide options');const source=evidence(o.progressionSource,'source-explicit'),endSource=evidence(o.endSource,'reviewed-interpretation');if(source.sourceId!==endSource.sourceId||source.url!==endSource.url)throw Error('Slide finite-end evidence must bind the same source snapshot.');
 if(state.circulation!=='cw'||state.roleArrangement!=='lark-left'||state.epoch!==boundary.relationshipEpoch)throw Error('Left slide needs actual clockwise lark-left Becket slots and epoch.');
 const dancers=asDancers(boundary.actors),binding=bindActorGroups(dancers,{epoch:boundary.relationshipEpoch,groups:boundary.groups,waitingIds:boundary.waitingIds,neighborPairs:boundary.neighbor.filter(([a,b])=>a<b)});
 if(JSON.stringify(binding.groups)!==JSON.stringify(state.binding.groups)||JSON.stringify(binding.waitingIds)!==JSON.stringify(state.binding.waitingIds)||pairKey(boundary.partner)!==pairKey([...state.binding.relations.partner])||pairKey(boundary.neighbor)!==pairKey([...state.binding.relations.neighbor]))throw new Error('Slice finite slots and actual incoming relationships disagree.');
 if(state.couples.some(c=>boundary.actors[c.larkId]?.couple!==c.id||boundary.actors[c.larkId]?.role!=='lark'||boundary.actors[c.robinId]?.couple!==c.id||boundary.actors[c.robinId]?.role!=='robin'))throw new Error('Slice topology must retain the actual persistent couples.');
 const topology=compileFiniteBecketProgression(state,{id:f.id,startBeat:boundary.sourceBeat,travelBeats:2,direction:1,endTurnDelay:0,endTurnBeats:8,evidence:source});
 state=topology.before;
 const canonical=finiteBecketPoses(topology.before),origin={x:boundary.poses[0].position.x-canonical[0].position.x,z:boundary.poses[0].position.z-canonical[0].position.z};
 if(boundary.poses.some(p=>Math.hypot(p.position.x-canonical[p.id].position.x-origin.x,p.position.z-canonical[p.id].position.z-origin.z)>EPS))throw new Error('The measured incoming roots must occupy the declared finite Becket slots; no canonical reset is allowed.');
 if(state.halfWidth<.6||state.halfWidth>1.2||state.rowGap<1.1||state.rowGap>1.92)throw new Error('The left slice requires reviewed finite spacing and across-set torso clearance.');
 if(boundary.poses.some(p=>Math.abs(diff(p.yaw,-(state.couples.find(c=>c.larkId===p.id||c.robinId===p.id)!.side==='east'?1:-1)*Math.PI/2))*1.875>3.2))throw Error('Slide entry facing exceeds the existing yaw envelope.');
 const start=boundary.sourceBeat,end=advanceSequenceBeat(start,2),byId=new Map(state.couples.flatMap(c=>[[c.larkId,c],[c.robinId,c]] as const));
 const sample=(sourceBeat:number):{poses:Pose[];contacts:HandContact[]}=>{
  if(!Number.isFinite(sourceBeat)||sourceBeat<start||sourceBeat>end)throw new Error('A slice sample must stay inside its exact source-count interval.');
  const elapsed=sourceBeat-start,out=ease(elapsed/2);
  return{poses:boundary.poses.map(p=>{const side=byId.get(p.id)!.side==='east'?1:-1;return{id:p.id,position:{x:p.position.x,z:p.position.z+side*state.rowGap*out},yaw:p.yaw+diff(p.yaw,-side*Math.PI/2)*ease(elapsed),stride:elapsed>0&&elapsed<2?.65:0,lean:0,bounce:0,turn:0,activity:'becket-shift'};}),contacts:[]};
 };
 const endpoint=sample(end).poses,change:BindingChange=freeze({id:`${f.id}:slide-neighbors:${state.epoch}`,beat:end,expectedEpoch:state.epoch,groups:topology.afterTravel.binding.groups,neighborPairs:[...topology.afterTravel.binding.relations.neighbor].filter(([a,b])=>a<b),waitingIds:topology.afterTravel.binding.waitingIds,evidence:source});
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
