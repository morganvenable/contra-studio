/** Establish an explicitly declared initial formation before playback starts.
 * Positions and relationships are supplied; this is not a zero-count motion step. */
import {capturePlainData} from './owned-program-cache.ts';
import {ownCarriedWaveState,type CarriedWaveState} from './carried-wave-circulate.ts';
import {joinLongWaveSegments,fullLongWaveContacts} from './full-long-wave.ts';
import type {WaveGraph} from './wave-figures.ts';
import type {Role} from './types.ts';
export interface InitialLongWaveInput extends Omit<CarriedWaveState,'wave'|'heldContacts'> {readonly inwardRole:Role;readonly neighborHand:'right';}
export function createInitialLongWaveState(input:InitialLongWaveInput):CarriedWaveState {
 const raw=capturePlainData(input);
 const allowed=new Set(['sourceBeat','bindingEpoch','actors','poses','partner','neighbor','boxPartitions','waitingIds','inwardRole','neighborHand']);
 if(Object.keys(raw).some(k=>!allowed.has(k)))throw Error('Initial long-wave declaration contains an unconsumed field.');
 if(raw.sourceBeat!==0)throw Error('An initial long-wave declaration is only valid at source count zero.');
 if(!['lark','robin'].includes(raw.inwardRole)||raw.neighborHand!=='right')throw Error('Initial long waves require an explicit inward role and reviewed right-hand neighbor convention.');
 if(!Array.isArray(raw.actors)||!Array.isArray(raw.poses)||!Array.isArray(raw.boxPartitions)||!Array.isArray(raw.neighbor))throw Error('Initial long waves require actual actors, poses, neighbors and ordered boxes.');
 if(raw.poses.some(p=>!p||![p.position?.x,p.position?.z,p.yaw].every(Number.isFinite)))throw Error('Initial pose coordinates and incoming headings must be finite before declaration.');
 const actors=new Map(raw.actors.map(a=>[a.id,a])),poses=raw.poses.map(p=>({...p,position:{...p.position}})),byId=new Map(poses.map(p=>[p.id,p])),neighbor=new Map(raw.neighbor);
 const segments:WaveGraph[]=raw.boxPartitions.map((ids:readonly number[])=>{
  if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!actors.has(id)||!byId.has(id)))throw Error('Each initial box must name four actual distinct actors.');
  const center=ids.reduce((n,id)=>n+byId.get(id)!.position.x/4,0),west=ids.filter(id=>byId.get(id)!.position.x<center),east=ids.filter(id=>byId.get(id)!.position.x>center);
  if(west.length!==2||east.length!==2)throw Error('An initial box needs two actors on each measured sideline.');
  for(const id of ids){const p=byId.get(id)!,side=Math.sign(p.position.x-center),inward=actors.get(id)!.role===raw.inwardRole;p.yaw=(inward?-side:side)*Math.PI/2;}
  // Membership is explicit. Ordering these two known station occupants never
  // chooses a neighbor; the named relation is independently required below.
  for(const side of[west,east])side.sort((a,b)=>byId.get(a)!.position.z-byId.get(b)!.position.z);
  const hands=[west,east].map(([a,b])=>{if(neighbor.get(a)!==b||neighbor.get(b)!==a)throw Error('The initial right hand must belong to the actual reciprocal current neighbor.');return{a,b,handA:'right' as const,handB:'right' as const};});
  return{lines:[{order:west,axis:{x:0,z:1}},{order:east,axis:{x:0,z:1}}],hands};
 });
 const active=raw.boxPartitions.flat(),wave=joinLongWaveSegments(segments,poses,active,raw.bindingEpoch);
 const {inwardRole:_role,neighborHand:_hand,...state}=raw;
 return ownCarriedWaveState({...state,poses,wave,heldContacts:fullLongWaveContacts(wave,poses)});
}
