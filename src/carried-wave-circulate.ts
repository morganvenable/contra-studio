/** Full active-wave ownership around the existing four-person motion kernel.
 * Wave hands span boxes; contra relationships and binding epochs do not change.
 * Waiting actors, when supplied, remain explicit and stationary. */
import {capturePlainData} from './owned-program-cache.ts';
import {resolveBoxCirculateBinding} from './box-circulate-binding.ts';
import {compileBoxCirculate,compileWaveBalance,type WaveGraph,type WaveConstraint} from './wave-figures.ts';
import {joinLongWaveSegments,validateFullLongWave,fullLongWaveContacts,type FullLongWaveGraph} from './full-long-wave.ts';
import type {Role,Pose,HandContact} from './types.ts';
export interface CarriedWaveState {
 readonly sourceBeat:number;readonly bindingEpoch:number;
 readonly actors:readonly {id:number;role:Role;couple:number}[];
 readonly poses:readonly Pose[];
 readonly partner:readonly (readonly [number,number])[];
 readonly neighbor:readonly (readonly [number,number])[];
 readonly boxPartitions:readonly (readonly number[])[];
 readonly wave:FullLongWaveGraph;
 readonly heldContacts:readonly HandContact[];
 readonly waitingIds?:readonly number[];
}
export interface CarriedWaveCirculateSpec {
 kind:'box-circulate'|'balance-box-circulate';beats:4|8;
 crossRole:Role;loopRole:Role;loopDirection:'right';
 phaseBeats?:readonly [4,4];balanceStyle?:'right-left'|'forward-back';
}
const EPS=1e-7;
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const keys=(value:object,allowed:readonly string[])=>{if(Object.keys(value).some(k=>!allowed.includes(k)))throw Error('Unconsumed carried-wave field.');};
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
const constraint=(p:Pose):WaveConstraint=>({position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0});
const contactKey=(h:HandContact)=>[h.a,h.b,h.handA,h.handB,h.kind].join(':');
const ease=(x:number)=>{x=Math.max(0,Math.min(1,x));return Math.max(0,Math.min(1,x*x*x*(10+x*(-15+6*x))));};
function sameContacts(actual:readonly HandContact[],expected:readonly HandContact[]){
 if(actual.length!==expected.length)throw Error('Carried wave must retain all actual full-strength hands, including between-box seams.');
 const remaining=new Map(expected.map(h=>[contactKey(h),h]));
 for(const h of actual){
  const want=remaining.get(contactKey(h));remaining.delete(contactKey(h));
  if(!want||!h.point||!Number.isFinite(h.strength)||Math.abs(h.strength-want.strength)>EPS||
   !['x','y','z'].every(k=>Number.isFinite(h.point[k as 'x'])&&Math.abs(h.point[k as 'x']-want.point[k as 'x'])<=EPS)||
   h.target!==undefined&&h.target!=='hands'||h.bodyPoint!==undefined||h.bodyBlend!==undefined||h.underId!==undefined)throw Error('Actual carried contacts contradict the complete wave graph.');
 }
}
export function ownCarriedWaveState(input:CarriedWaveState):CarriedWaveState{
 const state=capturePlainData(input);
 keys(state,['sourceBeat','bindingEpoch','actors','poses','partner','neighbor','boxPartitions','wave','heldContacts','waitingIds']);
 if(!Number.isFinite(state.sourceBeat)||state.sourceBeat<0||!Number.isSafeInteger(state.bindingEpoch)||state.bindingEpoch<0||
  !Array.isArray(state.actors)||!Array.isArray(state.poses)||!Array.isArray(state.heldContacts)||!Array.isArray(state.boxPartitions))throw Error('Explicit finite clocks, actors, poses, boxes and contacts are required.');
 const actors=new Map(state.actors.map(a=>[a.id,a]));
 if(actors.size!==state.actors.length||state.actors.some(a=>{keys(a,['id','role','couple']);return!Number.isSafeInteger(a.id)||a.id<0||!Number.isSafeInteger(a.couple)||a.couple<0||!['lark','robin'].includes(a.role);}))throw Error('Wave actors must retain unique identities, roles and couples.');
 const poses=new Map(state.poses.map(p=>[p.id,p]));
 if(poses.size!==actors.size||state.poses.length!==actors.size||state.poses.some(p=>!actors.has(p.id)))throw Error('Every supplied actor requires exactly one actual pose.');
 validateFullLongWave(state.wave,state.poses,state.bindingEpoch);
 const active=new Set(state.wave.actorIds),waiting=new Set(state.waitingIds??[]);
 if(waiting.size!==(state.waitingIds??[]).length||[...waiting].some(id=>!actors.has(id)||active.has(id))||[...actors.keys()].some(id=>!active.has(id)&&!waiting.has(id))||[...active].some(id=>!actors.has(id)))throw Error('Active and explicit waiting identities must partition all supplied actors.');
 for(const name of['partner','neighbor']as const){
  const pairs=state[name];if(!Array.isArray(pairs)||pairs.some(p=>!Array.isArray(p)||p.length!==2))throw Error('Wave relationships require explicit pair arrays.');
  const map=new Map(pairs);
  if(map.size!==pairs.length||[...active].some(id=>!map.has(id))||[...map].some(([a,b])=>!actors.has(a)||!actors.has(b)||a===b||map.get(b)!==a||actors.get(a)!.role===actors.get(b)!.role||(actors.get(a)!.couple===actors.get(b)!.couple)!==(name==='partner')))throw Error('Carried wave relationships must remain reciprocal and preserve partners.');
 }
 const partition=state.boxPartitions.flat();
 if(partition.length!==active.size||new Set(partition).size!==active.size||partition.some(id=>!active.has(id))||state.boxPartitions.some(box=>box.length!==4))throw Error('Explicit four-person boxes must partition exactly the active wave actors.');
 sameContacts(state.heldContacts,fullLongWaveContacts(state.wave,state.poses));
 return freeze(state);
}
/** Exactly one authored call. Repeated calls consume the preceding exit state;
 * their number and role order are not dispatch selectors. */
export function compileCarriedWaveCirculate(raw:CarriedWaveCirculateSpec,input:CarriedWaveState){
 const spec=capturePlainData(raw),entryState=ownCarriedWaveState(input);
 keys(spec,['kind','beats','crossRole','loopRole','loopDirection','phaseBeats','balanceStyle']);
 const balance=spec.kind==='balance-box-circulate',offset=balance?4:0;
 if(!['box-circulate','balance-box-circulate'].includes(spec.kind)||spec.beats!==(balance?8:4)||!['lark','robin'].includes(spec.crossRole)||!['lark','robin'].includes(spec.loopRole)||spec.crossRole===spec.loopRole||spec.loopDirection!=='right')throw Error('A carried circulation requires four counts, or an explicit eight-count balance/circulate, distinct roles and right loops.');
 if(balance?(!Array.isArray(spec.phaseBeats)||spec.phaseBeats.length!==2||spec.phaseBeats.some(n=>n!==4)||!['right-left','forward-back'].includes(spec.balanceStyle??'')):(spec.phaseBeats!==undefined||spec.balanceStyle!==undefined))throw Error('Balance timing/style must be explicit and cannot be added to a standalone circulation.');
 const sourceBeat=entryState.sourceBeat+spec.beats;if(!Number.isFinite(sourceBeat)||sourceBeat-entryState.sourceBeat!==spec.beats)throw Error('Source clock cannot represent the exact authored duration.');
 const byId=new Map(entryState.poses.map(p=>[p.id,p])),roles=new Map(entryState.actors.map(a=>[a.id,a.role]));
 const localGraphs:WaveGraph[]=[],exitGraphs:WaveGraph[]=[];
 const boxes=entryState.boxPartitions.map(ids=>{
  const members=new Set(ids);
  const lines=entryState.wave.lines.map(line=>({order:line.order.filter(id=>members.has(id)),axis:{...line.axis}}));
  const hands=entryState.wave.hands.filter(h=>members.has(h.a)&&members.has(h.b));
  const graph:WaveGraph={lines,hands};localGraphs.push(graph);
  const entry=new Map(ids.map(id=>[id,constraint(byId.get(id)!)]));
  const origin=ids.reduce((p,id)=>({x:p.x+byId.get(id)!.position.x/4,z:p.z+byId.get(id)!.position.z/4}),{x:0,z:0});
  const binding=resolveBoxCirculateBinding({entry,entryWave:graph,roles:new Map(ids.map(id=>[id,roles.get(id)!])),crossRole:spec.crossRole,loopRole:spec.loopRole,frame:{origin,across:{x:1,z:0}}});
  const circulate=compileBoxCirculate({actorIds:ids,entry,exit:new Map(binding.exit),beats:4,entryWave:graph,exitWave:binding.exitWave,mapping:binding.mapping,frame:binding.frame});
  const balancing=balance?compileWaveBalance({actorIds:ids,entry,exit:entry,beats:4,wave:graph,style:spec.balanceStyle!,amplitude:.1}):undefined;
  exitGraphs.push(binding.exitWave);return{ids,circulate,balancing};
 });
 // Reassembly verifies supplied box order and every edge of the original full
 // graph. The local projections above never own or discard cross-box contacts.
 const joined=joinLongWaveSegments(localGraphs,entryState.poses,entryState.wave.actorIds,entryState.bindingEpoch);
 if(JSON.stringify(joined.lines)!==JSON.stringify(entryState.wave.lines)||JSON.stringify(joined.hands)!==JSON.stringify(entryState.wave.hands)||JSON.stringify(joined.seamHands)!==JSON.stringify(entryState.wave.seamHands))throw Error('Box partitions do not reproduce the actual complete wave graph.');
 const outgoingPoses=entryState.poses.map(copy),outById=new Map(outgoingPoses.map(p=>[p.id,p]));
 for(const box of boxes)for(const id of box.ids){const pose=outById.get(id)!;pose.position={...box.circulate.position(id,1)};pose.yaw=box.circulate.facing(id,1);}
 const exitWave=joinLongWaveSegments(exitGraphs,outgoingPoses,entryState.wave.actorIds,entryState.bindingEpoch);
 const exitState=ownCarriedWaveState({...entryState,sourceBeat,poses:outgoingPoses,wave:exitWave,heldContacts:fullLongWaveContacts(exitWave,outgoingPoses)});
 const sample=(count:number)=>{
  if(!Number.isFinite(count))throw Error('Wave sample count must be finite.');
  const beat=Math.max(0,Math.min(spec.beats,count)),poses=entryState.poses.map(copy),byId=new Map(poses.map(p=>[p.id,p]));
  for(const box of boxes){
   const plan=balance&&beat<4?box.balancing!:box.circulate,local=balance&&beat<4?beat:beat-offset;
   for(const id of box.ids){const pose=byId.get(id)!;pose.position={...plan.position(id,local/4)};pose.yaw=plan.facing(id,local/4);}
  }
  const circulateBeat=beat-offset;
  const contacts=circulateBeat<=0?fullLongWaveContacts(entryState.wave,poses):circulateBeat<.15?fullLongWaveContacts(entryState.wave,poses,1-ease(circulateBeat/.15)):circulateBeat>3.85?fullLongWaveContacts(exitWave,poses,ease((circulateBeat-3.85)/.15)):[];
  return{poses,contacts};
 };
 // Retain the established whole-set sampled envelope, including neighboring
 // boxes and explicit waiters. Local four-person checks cannot certify seams.
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,previous=sample(0);
 for(let tick=1;tick<=spec.beats*64;tick++){
  const frame=sample(tick/64),prior=new Map(previous.poses.map(p=>[p.id,p]));
  for(const p of frame.poses){const q=prior.get(p.id)!;maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)*64);}
  for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,Math.hypot(frame.poses[a].position.x-frame.poses[b].position.x,frame.poses[a].position.z-frame.poses[b].position.z));
  if(maximumObservedSpeed>1.8+1e-5||minimumObservedClearance<.45-1e-6)throw Error('Full carried-wave motion exceeds its sampled speed or clearance envelope, including adjacent boxes and waiters.');
  previous=frame;
 }
 const pose=(id:number,t:number)=>{if(!byId.has(id))throw Error('Actor outside carried wave state.');return sample(t*spec.beats).poses.find(p=>p.id===id)!;};
 return Object.freeze({beats:spec.beats,entryState,exitState,minimumObservedClearance,maximumObservedSpeed,sample,position:(id:number,t:number)=>pose(id,t).position,facing:(id:number,t:number)=>pose(id,t).yaw,contacts:(t:number)=>sample(t*spec.beats).contacts});
}
