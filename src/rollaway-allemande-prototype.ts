/** Unregistered carried left-allemande ingress. Roots and full 1.5-turn winding
 * remain the established eight-count trajectory; only facing/holds are owned. */
import type {Figure,Pose} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary} from './sequence-boundary.ts';
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
export function compileRollawayAllemandePrototype(input:Figure,context:FigureContext,incoming:SequenceBoundary){
 const f=capturePlainData(input),next=capturePlainData(context.next),entry=ownSequenceBoundary(incoming);
 if(Object.keys(f).some(k=>!['id','label','kind','who','beats','direction','amount','confidence'].includes(k))||f.kind!=='allemande'||f.who!=='robins'||f.direction!=='left'||f.amount!==1.5||f.beats!==8||f.confidence==='unsupported'||!next||Object.keys(next).some(k=>!['id','label','kind','who','beats','confidence'].includes(k))||next.kind!=='balance'||next.who!=='partner'||next.beats!==4||next.confidence==='unsupported')throw new Error('Prototype requires eight-count robin left one-and-a-half turn followed by four-count partner balance.');
 if(entry.heldContacts.length)throw new Error('Prototype requires actually released incoming hands.');
 assertSequenceHandoff(entry,captureSequenceBoundary(context,entry.sourceBeat,[]));
 const {ids,start,dancers}=structuredClone({ids:context.ids,start:context.start,dancers:context.dancers}),partner=new Map(entry.partner),center={x:entry.poses.reduce((s,p)=>s+p.position.x,0)/4,z:entry.poses.reduce((s,p)=>s+p.position.z,0)/4};
 if(new Set(ids.map(id=>`${Math.sign(start[id].position.x-center.x)},${Math.sign(start[id].position.z-center.z)}`)).size!==4||ids.some(id=>Math.abs(Math.abs(start[id].position.x-center.x)-.9)>1e-7||Math.abs(Math.abs(start[id].position.z-center.z)-.9)>1e-7||Math.abs(start[id].position.z-start[partner.get(id)!].position.z)>1e-7))throw new Error('Prototype requires actual standard corners with partners across.');
 const robins=ids.filter(id=>dancers[id].role==='robin');
 if(robins.length!==2||Math.abs(start[robins[0]].position.x-start[robins[1]].position.x)<1||Math.abs(start[robins[0]].position.z-start[robins[1]].position.z)<1)throw new Error('Turning roles must occupy opposite actual corners.');
 const raw=compilePrimitiveFigure(f,ids,start,dancers,[]),end=new Map(ids.map(id=>[id,raw.position(id,1)]));
 for(const id of ids){const a=end.get(id)!,b=end.get(partner.get(id)!)!;if(Math.abs(a.x-b.x)>1e-7||Math.abs(Math.abs(a.z-b.z)-1.8)>1e-7)throw new Error('Actual complete turn must reach vertical partner balance pairs.');}
 const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('Prototype sample must be finite.');return Math.max(0,Math.min(1,t));};
 const position=(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Unknown actor.');return raw.position(id,time(t));};
 const heading=(a:{x:number;z:number},b:{x:number;z:number})=>Math.atan2(b.x-a.x,b.z-a.z);
 const facing=(id:number,t:number,_poses:Pose[])=>{if(!ids.includes(id))throw new Error('Unknown actor.');t=time(t);const beat=t*8,other=robins.find(j=>j!==id)!;
  let natural=start[id].yaw;
  if(robins.includes(id)){natural=heading(position(id,t),position(other,t));natural+=wrap(start[id].yaw-heading(start[id].position,start[other].position))*(1-smooth(beat));}
  if(beat<=7)return natural;
  const target=heading(end.get(id)!,end.get(partner.get(id)!)!);return natural+wrap(target-natural)*smooth(beat-7);
 };
 const reach=(poses:Pose[],id:number,point:{x:number;y:number;z:number})=>{const p=poses[id];return Math.hypot(point.x-p.position.x-.235*Math.cos(p.yaw),point.z-p.position.z+.235*Math.sin(p.yaw),point.y-1.355);};
 const plan:MotionPlan={position,facing,contacts:(t,poses)=>{t=time(t);const beat=t*8,a=poses[robins[0]].position,b=poses[robins[1]].position,point={x:(a.x+b.x)/2,y:1.25,z:(a.z+b.z)/2},maximum=Math.max(...robins.map(id=>reach(poses,id,point))),strength=smooth((beat-1.2)/.5)*smooth((6.8-beat)/.5)*smooth((.64-maximum)/.03);return strength<=1e-9?[]:[{a:robins[0],b:robins[1],handA:'left',handB:'left',kind:'joined',point,strength}];}};
 const entryState=sampleSequenceBoundary(context,plan,entry.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(entry.sourceBeat,8),1);assertSequenceHandoff(entry,entryState);
 let minimumClearance=Infinity,maximumSpeed=0,maximumYawRate=0,maximumShoulderReach=0,maximumStrengthRate=0,firstContactBeat:number|undefined,lastContactBeat:number|undefined,firstFullHoldBeat:number|undefined,lastFullHoldBeat:number|undefined;
 let previous=start.map(p=>({...p,position:{...p.position}})),previousStrength=0;
 for(let n=0;n<=960;n++){const t=n/960,poses=start.map(p=>({...p,position:ids.includes(p.id)?position(p.id,t):p.position,yaw:ids.includes(p.id)?facing(p.id,t,start):p.yaw})),contacts=plan.contacts(t,poses),strength=contacts[0]?.strength??0;
  for(const id of ids){if(n){maximumSpeed=Math.max(maximumSpeed,distance(poses[id].position,previous[id].position)*120);maximumYawRate=Math.max(maximumYawRate,Math.abs(wrap(poses[id].yaw-previous[id].yaw))*120);}for(const j of ids.filter(j=>j>id))minimumClearance=Math.min(minimumClearance,distance(poses[id].position,poses[j].position));}
  if(n)maximumStrengthRate=Math.max(maximumStrengthRate,Math.abs(strength-previousStrength)*120);if(contacts.length){firstContactBeat??=t*8;lastContactBeat=t*8;maximumShoulderReach=Math.max(maximumShoulderReach,...robins.map(id=>reach(poses,id,contacts[0].point)));}if(strength>=.999){firstFullHoldBeat??=t*8;lastFullHoldBeat=t*8;}previous=poses;previousStrength=strength;
 }
 if(minimumClearance<.5||maximumSpeed>1.5||maximumYawRate>3.2||maximumShoulderReach>.64||firstFullHoldBeat===undefined)throw new Error(`Prototype envelope failure ${JSON.stringify({minimumClearance,maximumSpeed,maximumYawRate,maximumShoulderReach,firstFullHoldBeat})}`);
 return Object.freeze({...plan,entryState,exitState,audit:Object.freeze({minimumClearance,maximumSpeed,maximumYawRate,maximumShoulderReach,maximumStrengthRate,firstContactBeat,lastContactBeat,firstFullHoldBeat,lastFullHoldBeat})});
}
