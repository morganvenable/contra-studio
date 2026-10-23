import{lowerBecketShortWavePolicy}from'./source-becket-short-wave.ts';
import{compileBecketStateSequence}from'./becket-state-sequence.ts';
import{compileBecketShortWaveStep}from'./becket-short-wave-step.ts';
import{capturePlainData}from'./owned-program-cache.ts';
import type{Dance,MotionCapabilities}from'./types.ts';
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export function compileBecketShortWavePolicyDance(input:Dance,couples:number,capabilities:MotionCapabilities){
 const dance=freeze(capturePlainData(input)),lowered=lowerBecketShortWavePolicy(dance.becketShortWavePolicy!);
 if(dance.formation!=='becket'||dance.circulation!=='cw'||['figures','progressionEvents','endPolicy'].some(k=>JSON.stringify((dance as any)[k])!==JSON.stringify((lowered as any)[k]))||Object.keys(dance).some(k=>/policy$/i.test(k)&&!['becketShortWavePolicy','endPolicy'].includes(k)))throw Error('Short-wave policy must preserve exact source figures, event and end choices.');
 const{becketShortWavePolicy,...local}=dance,plan=compileBecketStateSequence(local,couples,capabilities,compileBecketShortWaveStep);
 return Object.freeze({...plan,dance});
}
