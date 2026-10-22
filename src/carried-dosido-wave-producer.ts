/** Full-set ownership of a counted full role do-si-do and its reached wave hands. */
import {capturePlainData} from './owned-program-cache.ts';
import {compileRoleDosidoWaveStep,type RoleDosidoWaveSpec} from './role-dosido-wave-step.ts';
import {ownSequenceBoundary} from './sequence-boundary.ts';
import {ownCarriedWaveState,type CarriedWaveState} from './carried-wave-circulate.ts';
import {joinLongWaveSegments,fullLongWaveContacts} from './full-long-wave.ts';
import type {Hand,Pose} from './types.ts';
export type CarriedReleasedDosidoState=Omit<CarriedWaveState,'wave'>;
export interface CarriedDosidoWaveSpec extends RoleDosidoWaveSpec {localHand:Hand;handRelation:'partner'|'neighbor';acquisitionBeats:.25;}
const ease=(n:number)=>{const x=Math.max(0,Math.min(1,n));return x*x*x*(10+x*(-15+6*x));};
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
export function compileCarriedDosidoWaveProducer(raw:CarriedDosidoWaveSpec,input:CarriedReleasedDosidoState){
 const spec=capturePlainData(raw),entry=capturePlainData(input);
 if(Object.keys(spec).some(k=>!['beats','role','shoulder','inwardRole','localHand','handRelation','acquisitionBeats'].includes(k))||!['left','right'].includes(spec.localHand)||!['partner','neighbor'].includes(spec.handRelation)||spec.acquisitionBeats!==.25)throw Error('Wave producer requires explicit hands, receivers and quarter-count acquisition.');
 if(Object.keys(entry).some(k=>!['sourceBeat','bindingEpoch','actors','poses','partner','neighbor','boxPartitions','heldContacts','waitingIds'].includes(k))||entry.heldContacts.length)throw Error('Role do-si-do consumes an actually released full-set boundary.');
 const ids=new Set(entry.actors.map(a=>a.id)),active=entry.boxPartitions.flat(),waiting=entry.waitingIds??[];
 if(new Set([...active,...waiting]).size!==ids.size||active.length+waiting.length!==ids.size||[...active,...waiting].some(id=>!ids.has(id)))throw Error('Explicit boxes, waiters and endpoint identities must cover exactly the carried actors.');
 const plans=entry.boxPartitions.map(box=>{
  const boundary=ownSequenceBoundary({sourceBeat:entry.sourceBeat,relationshipEpoch:entry.bindingEpoch,actors:entry.actors.filter(a=>box.includes(a.id)),poses:entry.poses.filter(p=>box.includes(p.id)).map(({id,position,yaw})=>({id,position,yaw})),partner:entry.partner.filter(([id])=>box.includes(id)),neighbor:entry.neighbor.filter(([id])=>box.includes(id)),heldContacts:[]});
  const {localHand:_hand,handRelation:_relation,acquisitionBeats:_time,...local}=spec;
  return {box,plan:compileRoleDosidoWaveStep(boundary,local)};
 });
 const endpoint=entry.poses.map(copy);for(const {plan}of plans)for(const target of plan.exitState.poses){const p=endpoint.find(p=>p.id===target.id)!;p.position={...target.position};p.yaw=target.yaw;}
 const relation=new Map(entry[spec.handRelation]);
 const segments=plans.map(({box})=>{
  const center=box.reduce((x,id)=>x+endpoint.find(p=>p.id===id)!.position.x/4,0);
  const lines=[-1,1].map(side=>({order:box.filter(id=>Math.sign(endpoint.find(p=>p.id===id)!.position.x-center)===side).sort((a,b)=>endpoint.find(p=>p.id===a)!.position.z-endpoint.find(p=>p.id===b)!.position.z),axis:{x:0,z:1}}));
  const hands=lines.map(l=>{const[a,b]=l.order;if(relation.get(a)!==b)throw Error('Reached wave hand must name its declared carried receiver.');return{a,b,handA:spec.localHand,handB:spec.localHand};});return{lines,hands};
 });
 const wave=joinLongWaveSegments(segments,endpoint,active,entry.bindingEpoch);
 const exitState=ownCarriedWaveState({...entry,sourceBeat:entry.sourceBeat+spec.beats,poses:endpoint,wave,heldContacts:fullLongWaveContacts(wave,endpoint)});
 const sample=(count:number)=>{if(!Number.isFinite(count))throw Error('Role do-si-do sample count must be finite.');const beat=Math.max(0,Math.min(spec.beats,count)),poses=entry.poses.map(copy);for(const {box,plan}of plans)for(const id of box){const p=poses.find(p=>p.id===id)!;p.position=plan.position(id,beat/spec.beats);p.yaw=plan.facing(id,beat/spec.beats,poses);}return{poses,contacts:beat>spec.beats-.25?fullLongWaveContacts(wave,poses,ease((beat-(spec.beats-.25))/.25)):[]};};
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,previous=sample(0);
 for(let n=1;n<=spec.beats*64;n++){const current=sample(n/64);for(const p of current.poses){const q=previous.poses.find(q=>q.id===p.id)!;maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)*64);}for(let a=0;a<current.poses.length;a++)for(let b=a+1;b<current.poses.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,Math.hypot(current.poses[a].position.x-current.poses[b].position.x,current.poses[a].position.z-current.poses[b].position.z));previous=current;}
 if(minimumObservedClearance<.45-1e-6||maximumObservedSpeed>1.35+1e-5)throw Error('Full-set role do-si-do exceeds its existing root envelope, including waiters.');
 return Object.freeze({beats:spec.beats,exitState,sample,minimumObservedClearance,maximumObservedSpeed});
}
