/** Four-count balance of an actual complete carried wave, including seam hands. */
import {capturePlainData} from './owned-program-cache.ts';
import {ownCarriedWaveState,type CarriedWaveState} from './carried-wave-circulate.ts';
import {compileWaveBalance,type WaveGraph} from './wave-figures.ts';
import {joinLongWaveSegments,fullLongWaveContacts} from './full-long-wave.ts';
export interface CarriedWaveBalanceSpec {kind:'wave-balance';beats:4;style:'right-left'|'forward-back';}
export function compileCarriedWaveBalance(raw:CarriedWaveBalanceSpec,input:CarriedWaveState){
 const spec=capturePlainData(raw),entryState=ownCarriedWaveState(input);
 if(Object.keys(spec).some(k=>!['kind','beats','style'].includes(k))||spec.kind!=='wave-balance'||spec.beats!==4||!['right-left','forward-back'].includes(spec.style))throw Error('A carried wave balance requires exactly four counts and an explicit supported balance style.');
 const sourceBeat=entryState.sourceBeat+4;if(!Number.isFinite(sourceBeat)||sourceBeat-entryState.sourceBeat!==4)throw Error('Source clock cannot retain the exact four balance counts.');
 const posesById=new Map(entryState.poses.map(p=>[p.id,p])),graphs:WaveGraph[]=[];
 const plans=entryState.boxPartitions.map(ids=>{
  const members=new Set(ids),wave:WaveGraph={lines:entryState.wave.lines.map(line=>({order:line.order.filter(id=>members.has(id)),axis:{...line.axis}})),hands:entryState.wave.hands.filter(h=>members.has(h.a)&&members.has(h.b))};graphs.push(wave);
  const entry=new Map(ids.map(id=>{const p=posesById.get(id)!;return[id,{position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0}];}));
  return{ids,plan:compileWaveBalance({actorIds:ids,entry,exit:entry,beats:4,wave,style:spec.style,amplitude:.1})};
 });
 const joined=joinLongWaveSegments(graphs,entryState.poses,entryState.wave.actorIds,entryState.bindingEpoch);
 if(JSON.stringify(joined.lines)!==JSON.stringify(entryState.wave.lines)||JSON.stringify(joined.hands)!==JSON.stringify(entryState.wave.hands)||JSON.stringify(joined.seamHands)!==JSON.stringify(entryState.wave.seamHands))throw Error('Balance partitions must reproduce the entire carried wave and seam graph.');
 const exitState=ownCarriedWaveState({...entryState,sourceBeat});
 const sample=(count:number)=>{
  if(!Number.isFinite(count))throw Error('Wave balance sample count must be finite.');const beat=Math.max(0,Math.min(4,count)),poses=entryState.poses.map(p=>({...p,position:{...p.position}})),byId=new Map(poses.map(p=>[p.id,p]));
  for(const{ids,plan}of plans)for(const id of ids){const p=byId.get(id)!;p.position={...plan.position(id,beat/4)};p.yaw=plan.facing(id,beat/4);}
  return{poses,contacts:fullLongWaveContacts(entryState.wave,poses)};
 };
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,previous=sample(0);
 for(let tick=0;tick<=256;tick++){
  const frame=sample(tick/64),prior=new Map(previous.poses.map(p=>[p.id,p]));
  for(const p of frame.poses){const q=prior.get(p.id)!;maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)*64);}
  for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,Math.hypot(frame.poses[a].position.x-frame.poses[b].position.x,frame.poses[a].position.z-frame.poses[b].position.z));
  if(maximumObservedSpeed>1.8+1e-5||minimumObservedClearance<.45-1e-6)throw Error('Carried balance exceeds the sampled full-set speed or clearance envelope.');previous=frame;
 }
 const pose=(id:number,t:number)=>{if(!posesById.has(id))throw Error('Actor outside carried wave balance.');return sample(t*4).poses.find(p=>p.id===id)!;};
 return Object.freeze({beats:4,entryState,exitState,minimumObservedClearance,maximumObservedSpeed,sample,position:(id:number,t:number)=>pose(id,t).position,facing:(id:number,t:number)=>pose(id,t).yaw,contacts:(t:number)=>sample(t*4).contacts});
}
