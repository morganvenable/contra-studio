/** Preserve the printed source clock while measuring a cycle from its explicit
 * progression boundary. Reindexing samples never changes positions or bindings. */
import {capturePlainData} from './owned-program-cache.ts';
import {compileStateSequence,type CompiledStateSequence} from './state-sequence.ts';
import {ownProgressionDeclaration} from './progression-topology.ts';
import type {Dance,Frame,MotionCapabilities} from './types.ts';
import type {SequenceBoundary} from './sequence-boundary.ts';
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){for(const c of Object.values(x))freeze(c);Object.freeze(x);}return x;};
export function hasInteriorSequenceEvent(dance:Dance):boolean {
 return dance.formation==='duple-improper'&&dance.progressionEvents?.length===1&&dance.figures.some((f,i)=>i<dance.figures.length-1&&f.id===dance.progressionEvents![0].afterFigureId&&f.progression===true&&f.kind==='pass-through'&&f.entry==='circle-exit'&&f.exit==='progressed-neighbors')&&[dance.endPolicy,dance.madRobinPolicy,dance.ringTwirlPolicy,dance.diagonalHeyPolicy,dance.sixTwoPassPolicy,dance.ovalPolicy,dance.initialWavePolicy].every(p=>p===undefined);
}
export function compilePhasedStateSequence(input:Dance,couples:number,capabilities:MotionCapabilities):CompiledStateSequence {
 const dance=freeze(capturePlainData(input));if(!hasInteriorSequenceEvent(dance))throw Error('A phased sequence needs one explicit interior improper event and no other formation policy.');
 const event=ownProgressionDeclaration(dance,dance.progressionEvents![0]);
 if(event.source.basis!=='source-explicit')throw Error('An interior event must retain its explicit source declaration.');
 const at=dance.figures.findIndex(f=>f.id===event.afterFigureId),suffix=dance.figures.slice(at+1),prefix=dance.figures.slice(0,at+1),offset=suffix.reduce((sum,f)=>sum+f.beats,0);
 const core=compileStateSequence({...dance,figures:[...suffix,...prefix]},couples,capabilities),total=core.totalBeats;
 if(core.balancePreparations?.length)throw Error('An interior event needs separately mapped exit-preparation windows.');
 const starts:number[]=[];let beat=0;for(const f of dance.figures){starts.push(beat);beat+=f.beats;}
 const checked=(value:number)=>{if(!Number.isFinite(value))throw Error('A phased sequence sample clock must be finite.');return Math.max(0,value);};
 const remap=(frame:Frame,raw:number):Frame=>{const beat=checked(raw),repeat=Math.floor(beat/total),localBeat=beat-repeat*total,figureIndex=starts.findLastIndex(start=>start<=localBeat);return{...frame,beat,repeat,localBeat,figureIndex,figureProgress:(localBeat-starts[figureIndex])/dance.figures[figureIndex].beats};};
 const boundary=(b:SequenceBoundary,shift:number,epoch:number):SequenceBoundary=>({...b,sourceBeat:b.sourceBeat+shift,relationshipEpoch:epoch});
 return Object.freeze({...core,dance,starts:freeze(starts),sample(raw:number){const beat=checked(raw);return remap(core.sample(beat+offset),beat);},topology(raw:number){return core.topology(checked(raw)+offset);},sequenceBoundaries(repeat:number){
  if(!Number.isSafeInteger(repeat)||repeat<0)throw Error('A boundary proof needs a nonnegative repeat.');
  const segment=(cycle:number,first:boolean)=>core.sequenceBoundaries(cycle).filter(p=>first?p.entry.sourceBeat>=offset:p.entry.sourceBeat<offset).map(p=>{const shift=first?-offset:total-offset;return{...p,incoming:boundary(p.incoming,shift,cycle),entry:boundary(p.entry,shift,cycle),exit:boundary(p.exit,shift,cycle)};});
  return[...segment(repeat,true),...segment(repeat+1,false)];
 }});
}
