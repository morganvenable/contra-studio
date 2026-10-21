/** Full-wave release into an explicitly counted named swing. */
import {capturePlainData} from './owned-program-cache.ts';
import {ownCarriedWaveState,type CarriedWaveState} from './carried-wave-circulate.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {fullLongWaveContacts} from './full-long-wave.ts';
import type {Pose,Dancer,HandContact} from './types.ts';
export interface CarriedWaveSwingSpec {kind:'swing';beats:8|12;who:'neighbor'|'partner';}
export interface CarriedReleasedSwingState extends Omit<CarriedWaveState,'wave'> {readonly exit:{readonly kind:'released-neighbor-swing'|'released-partner-swing'};}
const CLOSE=1.25,ACQUIRE=.5,WAVE_RELEASE=.15,FRAME_RELEASE=1;
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
const distance=(a:Pose['position'],b:Pose['position'])=>Math.hypot(a.x-b.x,a.z-b.z);
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export function compileCarriedWaveSwing(raw:CarriedWaveSwingSpec,input:CarriedWaveState){
 const spec=capturePlainData(raw),entryState=ownCarriedWaveState(input);
 if(Object.keys(spec).some(k=>!['kind','beats','who'].includes(k))||spec.kind!=='swing'||![8,12].includes(spec.beats)||!['partner','neighbor'].includes(spec.who))throw Error('Carried wave swing requires eight or twelve counts and explicit carried partners or neighbors.');
 if(entryState.poses.some(p=>![p.position.x,p.position.z,p.yaw].every(Number.isFinite)))throw Error('Every active and waiting pose must remain finite.');
 // Eight-count mode uses the previously measured monotone phase u+.035*sin(pi*u).
 // This preserves every rotation and endpoint while allowing its final facing
 // turn to finish within the unchanged3.2-radian/count limit. Twelve-count
 // motion retains its established linear phase and release timing.
 const beats=spec.beats,EXPAND=beats===8?6.4:beats*.82;
 const endBeat=entryState.sourceBeat+beats;if(!Number.isFinite(endBeat)||endBeat-entryState.sourceBeat!==beats)throw Error('Swing source clock cannot retain declared counts.');
 // Dense kernel indices are private. All public identities and relationships stay carried.
 const index=new Map(entryState.actors.map((a,i)=>[a.id,i])),original=entryState.actors.map(a=>a.id),byId=new Map(entryState.poses.map(p=>[p.id,p]));
 const start=original.map((id,i)=>({...copy(byId.get(id)!),id:i})),closed=start.map(copy),neighbor=new Map(entryState.neighbor),partner=new Map(entryState.partner),active=new Set(entryState.wave.actorIds);
 const dancers:Dancer[]=entryState.actors.map((a,id)=>({...a,id,name:String(a.id),direction:1,color:''}));
 const centers=new Map<number,Pose['position']>();
 const kernels=entryState.boxPartitions.map(box=>{
  const ids=box.map(id=>index.get(id)!),cx=ids.reduce((n,id)=>n+start[id].position.x/4,0),cz=ids.reduce((n,id)=>n+start[id].position.z/4,0);
  if(ids.filter(id=>dancers[id].role==='lark').length!==2)throw Error('Swing box requires two actors of each role.');
  for(const id of ids){const actual=original[id],p=start[id],q=start[index.get((spec.who==='partner'?partner:neighbor).get(actual)!)!];
   if(!box.includes(neighbor.get(actual)!)||!box.includes(partner.get(actual)!)||Math.abs(Math.abs(p.position.x-cx)-.64)>1e-7||Math.abs(Math.abs(p.position.z-cz)-.64)>1e-7||Math.abs(p.position.x-q.position.x)>1e-7||Math.abs(distance(p.position,q.position)-1.28)>1e-7||Math.abs(Math.cos(p.yaw))>1e-7)throw Error('Wave swing requires measured compact named side pairs and across-facing entry.');
   const inferred=ids.find(j=>dancers[j].role!==dancers[id].role&&(spec.who==='partner'?dancers[j].couple===dancers[id].couple:dancers[j].couple!==dancers[id].couple));if(inferred!==q.id)throw Error('Kernel pair must equal the actual carried receiver.');
   const c={x:(p.position.x+q.position.x)/2,z:(p.position.z+q.position.z)/2};centers.set(id,c);closed[id].position={x:c.x+(p.position.x-c.x)*.31/.64,z:c.z+(p.position.z-c.z)*.31/.64};closed[id].yaw=Math.atan2(c.x-closed[id].position.x,c.z-closed[id].position.z)+Math.PI/3;
  }
  return{ids,kernel:compilePrimitiveFigure({id:'carried-wave-swing',label:'Neighbor swing',kind:'swing',who:spec.who,beats},ids,closed,dancers,[],{swingEntry:'prepared-circle',geometry:{halfWidth:.64,rowGap:1.28},canonicalSwingLayout:true})};
 });
 const reach=(poses:Pose[],id:number,hand:string,point:HandContact['point'])=>{const p=poses[id],side=hand==='left'?1:-1;return Math.hypot(point.x-p.position.x-side*.235*Math.cos(p.yaw),point.z-p.position.z+side*.235*Math.sin(p.yaw),point.y-1.355);};
 const sample=(count:number)=>{
  if(!Number.isFinite(count))throw Error('Swing sample count must be finite.');const beat=Math.max(0,Math.min(beats,count)),u=beat/beats,t=beats===8?u+.035*Math.sin(Math.PI*u):u,poses=start.map(copy);
  for(const{ids,kernel}of kernels)for(const id of ids){const c=centers.get(id)!,p=kernel.position(id,t),r=distance(p,c),extra=.33*(1-smooth(beat/CLOSE));poses[id].position=beat===0?{...start[id].position}:{x:p.x+(p.x-c.x)*extra/r,z:p.z+(p.z-c.z)*extra/r};poses[id].yaw=beat===0?start[id].yaw:kernel.facing(id,t,poses)+wrap(start[id].yaw-kernel.facing(id,0,closed))*(1-smooth(beat/CLOSE));}
  const publicPoses=poses.map((p,id)=>({...p,id:original[id]}));
  const contacts:HandContact[]=beat===0?entryState.heldContacts.map(h=>({...h,point:{...h.point}})):beat<WAVE_RELEASE?fullLongWaveContacts(entryState.wave,publicPoses,1-smooth(beat/WAVE_RELEASE)):[];
  for(const{kernel}of kernels)for(const h of kernel.contacts(t,poses)){
   const R=Math.max(reach(poses,h.a,h.handA,h.point),...(!h.target||h.target==='hands'?[reach(poses,h.b,h.handB,h.point)]:[]));
   // Release during the count before radial expansion, rather than allowing the
   // emergency reach gate to tear the frame away after separation starts.
   const strength=h.strength*smooth((beat-CLOSE)/ACQUIRE)*(1-smooth((beat-(EXPAND-FRAME_RELEASE))/FRAME_RELEASE))*smooth((.64-R)/.014);
   if(strength>1e-9)contacts.push({...h,a:original[h.a],b:original[h.b],strength});
  }
  return{poses:publicPoses,contacts};
 };
 let maximumObservedSpeed=0,maximumObservedYawRate=0,minimumObservedClearance=Infinity,maximumObservedReach=0,previous=sample(0);
 for(let n=1;n<=beats*128;n++){
  const frame=sample(n/128),prior=new Map(previous.poses.map(p=>[p.id,p])),dense=original.map((id,i)=>({...frame.poses.find(p=>p.id===id)!,id:i}));
  for(const p of frame.poses){const q=prior.get(p.id)!;maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.position,q.position)*128);maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(wrap(p.yaw-q.yaw))*128);}
  for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(frame.poses[a].position,frame.poses[b].position));
  const hands=new Set<string>();for(const h of frame.contacts){const R=Math.max(reach(dense,index.get(h.a)!,h.handA,h.point),...(!h.target||h.target==='hands'?[reach(dense,index.get(h.b)!,h.handB,h.point)]:[]));maximumObservedReach=Math.max(maximumObservedReach,R);if(R>(h.kind==='swing-frame'?.64:.62)+1e-7)throw Error('Wave swing exceeds its hand-reach envelope.');for(const key of[`${h.a}:${h.handA}`,...(!h.target||h.target==='hands'?[`${h.b}:${h.handB}`]:[])]){if(hands.has(key))throw Error('Wave swing assigns two targets to one hand.');hands.add(key);}}
  previous=frame;
 }
 if(maximumObservedSpeed>1.5+1e-5||maximumObservedYawRate>3.2+1e-5||minimumObservedClearance<.45-1e-6)throw Error('Wave swing exceeds the sampled full-set motion envelope.');
 const full=sample(CLOSE+ACQUIRE).contacts;if(full.length!==active.size/2*3||full.some(h=>h.strength<1-1e-7))throw Error('Wave swing must acquire complete named frames.');
 const {wave:_wave,...carried}=entryState,exitState:CarriedReleasedSwingState=freeze({...carried,sourceBeat:endBeat,poses:sample(beats).poses,heldContacts:[],exit:{kind:spec.who==='partner'?'released-partner-swing':'released-neighbor-swing'}});
 const pose=(id:number,t:number)=>{if(!index.has(id))throw Error('Actor outside wave swing.');return sample(t*beats).poses.find(p=>p.id===id)!;};
 return Object.freeze({beats,entryState,exitState,maximumObservedSpeed,maximumObservedYawRate,minimumObservedClearance,maximumObservedReach,sample,position:(id:number,t:number)=>pose(id,t).position,facing:(id:number,t:number)=>pose(id,t).yaw,contacts:(t:number)=>sample(t*beats).contacts});
}

