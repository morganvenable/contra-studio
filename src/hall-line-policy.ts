import {lowerHallLinePolicy} from './source-hall-line.ts';
import {compileHallLineSequence} from './hall-line-sequence.ts';
import {capturePlainData} from './owned-program-cache.ts';
import type {Dance,CompiledDance,Pose} from './types.ts';
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function compileHallLinePolicyDance(input:Dance,couples:number):CompiledDance {
 const dance=freeze(capturePlainData(input)),lowered=lowerHallLinePolicy(dance.hallLinePolicy!);
 if(dance.formation!=='becket'||dance.circulation!=='cw'||JSON.stringify(dance.figures)!==JSON.stringify(lowered.figures)||JSON.stringify(dance.progressionEvents)!==JSON.stringify(lowered.progressionEvents)||Object.keys(dance).some(k=>/policy$/i.test(k)&&k!=='hallLinePolicy'))throw Error('Hall-line policy must preserve exact figures, event, formation and no competing policies.');
 const plan=compileHallLineSequence(lowered.program,couples),starts:number[]=[];let cursor=0;for(const f of dance.figures){starts.push(cursor);cursor+=f.beats;}
 return Object.freeze({dance,dancers:freeze(capturePlainData(plan.dancers)),totalBeats:64,repeatable:true,starts:freeze(starts),warnings:freeze([] as string[]),sample(beat:number){
  if(!Number.isFinite(beat))throw Error('Hall-line sample clock must be finite.');beat=Math.max(0,beat);
  const at=plan.sample(beat),before=plan.sample(Math.max(0,beat-.001)),after=plan.sample(beat+.001),localBeat=beat%64,repeat=Math.floor(beat/64),figureIndex=starts.findLastIndex(s=>s<=localBeat),figure=dance.figures[figureIndex],figureProgress=(localBeat-starts[figureIndex])/figure.beats,waiting=new Set(plan.topology(beat).waitingIds);
  return capturePlainData({beat,localBeat,repeat,figureIndex,figureProgress,contacts:at.contacts,warnings:[],poses:at.poses.map((p:Pose)=>{const a=before.poses.find((q:Pose)=>q.id===p.id)!,b=after.poses.find((q:Pose)=>q.id===p.id)!,speed=Math.hypot(b.position.x-a.position.x,b.position.z-a.position.z)/(Math.min(.001,beat)+.001);return{...p,position:{...p.position},activity:waiting.has(p.id)?'waiting':figure.kind,stride:Math.min(1,speed/.8),lean:figure.kind==='swing'&&!waiting.has(p.id)?.08:0,turn:figure.kind==='swing'&&!waiting.has(p.id)?1:0,bounce:0};})});
 }});
}
