import{compileBecketPassShortWaveSequence}from'./becket-pass-short-wave-sequence.ts';
import{lowerBecketShortWavePolicy}from'./source-becket-short-wave.ts';
import{compileBecketStateSequence}from'./becket-state-sequence.ts';
import{compileBecketShortWaveStep}from'./becket-short-wave-step.ts';
import{capturePlainData}from'./owned-program-cache.ts';
import type{Dance,MotionCapabilities,Pose}from'./types.ts';
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export function compileBecketShortWavePolicyDance(input:Dance,couples:number,capabilities:MotionCapabilities){
 const dance=freeze(capturePlainData(input)),lowered=lowerBecketShortWavePolicy(dance.becketShortWavePolicy!);
 if(dance.formation!=='becket'||dance.circulation!=='cw'||['figures','progressionEvents','endPolicy'].some(k=>JSON.stringify((dance as any)[k])!==JSON.stringify((lowered as any)[k]))||Object.keys(dance).some(k=>/policy$/i.test(k)&&!['becketShortWavePolicy','endPolicy'].includes(k)))throw Error('Short-wave policy must preserve exact source figures, event and end choices.');
 if('program'in lowered){const p=compileBecketPassShortWaveSequence(lowered.program,couples,capabilities);return Object.freeze({...p,dance,totalBeats:64,repeatable:true,warnings:[],sample(beat:number){const at=p.sample(beat),before=p.sample(Math.max(0,beat-.001)),after=p.sample(beat+.001),localBeat=beat%64,repeat=Math.floor(beat/64),figureIndex=p.starts.findLastIndex(n=>n<=localBeat),figure=dance.figures[figureIndex],waiting=new Set(p.topology(beat).waitingIds);return{...at,beat,localBeat,repeat,figureIndex,figureProgress:(localBeat-p.starts[figureIndex])/figure.beats,warnings:[],poses:at.poses.map((q:Pose)=>({...q,activity:waiting.has(q.id)?'waiting' as const:figure.kind,stride:Math.min(1,Math.hypot(after.poses[q.id].position.x-before.poses[q.id].position.x,after.poses[q.id].position.z-before.poses[q.id].position.z)/(Math.min(.001,beat)+.001)/.8),lean:figure.kind==='swing'&&!waiting.has(q.id)?.08:0,turn:figure.kind==='swing'&&!waiting.has(q.id)?1:0,bounce:0}))};}});}
 const{becketShortWavePolicy,...local}=dance,plan=compileBecketStateSequence(local,couples,capabilities,compileBecketShortWaveStep);
 return Object.freeze({...plan,dance});
}
