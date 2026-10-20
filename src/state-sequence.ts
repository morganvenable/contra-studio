/** One source-event wrapper around the common state-carrying figure sequencer.
 * It knows the improper formation and terminal event contract, never a complete
 * row list, dance title or source ID. Figure adapters consume actual state. */
import {capturePlainData} from './owned-program-cache.ts';
import {compileStateCarryingCore,type SequenceStepProof} from './engine.ts';
import {ownProgressionDeclaration,bindDirectedCoupleSlots,type DirectedCoupleSlot} from './progression-topology.ts';
import type {CompiledDance,Dance,MotionCapabilities,BalancePreparationContract} from './types.ts';
import type {ContraDbImportedDance} from './contradb-import.ts';
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){for(const c of Object.values(x))freeze(c);Object.freeze(x);}return x;};
export interface CompiledStateSequence extends CompiledDance {
 readonly periodRepeats:number;
 topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;partners:Array<[number,number]>;waitingIds:readonly number[]};
 sequenceBoundaries(repeat:number):readonly SequenceStepProof[];
}

export function compileStateSequence(input:Dance,couples:number,capabilities:MotionCapabilities):CompiledStateSequence {
 const dance=freeze(capturePlainData(input)) as Dance & Partial<Pick<ContraDbImportedDance,'sourceRecord'|'sourceText'>>;
 if(!capabilities.stateCarryingSequences||!capabilities.progressionEvents)throw new Error('The shared state-carrying sequencer and source progression events must be enabled.');
 if(dance.formation!=='duple-improper'||!Number.isInteger(couples)||couples<2||couples>12)throw new Error('This shared sequence formation supports two to twelve improper couples.');
 const allowed=['id','title','author','formation','description','figures','verified','sourceUrl','sourceText','sourceRecord','sourceRows','contraDbInterpretation','progressionEvents','notes'];
 if(Object.keys(dance).some(k=>!allowed.includes(k)&&(dance as any)[k]!==undefined))throw new Error('The shared sequence cannot ignore an unrelated formation policy or dance modifier.');
 for(const k of ['id','title']as const)if(typeof dance[k]!=='string'||!dance[k].trim())throw new Error('Sequence identity and title must be nonempty text.');
 for(const k of ['author','description','sourceUrl','sourceText']as const)if((dance as any)[k]!==undefined&&typeof (dance as any)[k]!=='string')throw new Error('Sequence metadata must retain its declared text type.');
 if(dance.notes!==undefined&&(!Array.isArray(dance.notes)||dance.notes.some(n=>typeof n!=='string')))throw new Error('Sequence notes must retain their declared string-array type.');
 if(dance.verified!==undefined&&typeof dance.verified!=='boolean'||!Array.isArray(dance.figures)||!dance.figures.length||dance.figures.length>64)throw new Error('A sequence needs explicit figures and recognized verification metadata.');
 for(const f of dance.figures)if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||!Number.isFinite(f.beats)||f.beats<=0||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate','unsupported'].includes(f.confidence))throw new Error('Each sequence step needs exact text identity, finite source counts and recognized confidence.');
 if(new Set(dance.figures.map(f=>f.id)).size!==dance.figures.length)throw new Error('Sequence figure identities must be unique.');
 if(!Array.isArray(dance.progressionEvents)||dance.progressionEvents.length!==1)throw new Error('This finite sequencer requires one explicit source-bound terminal event.');
 const event=ownProgressionDeclaration(dance,dance.progressionEvents[0]);
 if(event.afterFigureId!==dance.figures.at(-1)!.id||event.count!==1||event.initialBinding!==undefined||event.waitingRoleArrangement!=='lark-left'||dance.figures.at(-1)!.progression!==true)throw new Error('The source event must name the sole terminal one-place progression; figure geometry cannot invent it.');
 if(dance.sourceUrl!==undefined&&event.source.url!==dance.sourceUrl||dance.sourceRecord&&(event.source.sourceId!==dance.sourceRecord.snapshotId||event.source.url!==dance.sourceRecord.sourceUrl))throw new Error('The progression evidence must bind the retained source snapshot and URL.');
 // The finite engine receives an already-validated event-free execution view.
 // The original dance and its event remain the public program declaration.
 const {progressionEvents:_events,...execution}=dance;
 const core=compileStateCarryingCore(execution as Dance,couples,capabilities);
 if(!core.repeatable)throw new Error('The actual sequence endpoint does not realize its declared one-place progression.');
 const periodRepeats=2*couples,states=Array.from({length:periodRepeats},(_,r)=>core.sequenceState(r));
 const bindings=states.map((s,r)=>{const order=core.dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,z:(s.initial[d.id].position.z+s.initial[d.id+1].position.z)/2})).sort((a,b)=>a.z-b.z);const slots:DirectedCoupleSlot[]=order.map((d,rank)=>({coupleId:d.coupleId,rank,direction:s.directions[d.coupleId] as 1|-1}));const binding=bindDirectedCoupleSlots(core.dancers,r,slots);const expected=[...binding.relations.neighbor].filter(([a,b])=>a<b).sort((a,b)=>a[0]-b[0]);if(JSON.stringify(expected)!==JSON.stringify([...s.neighbor].sort((a,b)=>a[0]-b[0]))||JSON.stringify([...binding.waitingIds].sort((a,b)=>a-b))!==JSON.stringify([...s.waitingIds].sort((a,b)=>a-b)))throw new Error('Actual finite ranks contradict the sequence relationship ledger.');return binding;});
 // Check the physical return, rather than accepting the modulo period alone.
 const last=states.at(-1)!,endpoint=last.end,initial=states[0].initial;
 for(const p of endpoint){const q=initial[p.id];if(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)>1e-6||Math.abs(Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw)))>1e-6)throw new Error('The finite sequence does not return all actor roots and facing after the complete period.');}
 // Adapters, rather than figure-name timers, authorize new preparation windows.
 // Use the latest safe opening across all actual groups and finite repeats.
 // Existing active-swing timing retains its already-reviewed public contract.
 const balancePreparations:BalancePreparationContract[]=dance.figures.filter(f=>f.preparation!==undefined&&f.who!=='ones').map(f=>{
  const proofs=states.flatMap(s=>s.proofs.filter(p=>p.figureId===f.id));
  if(!proofs.length||proofs.some(p=>!p.exitPreparationWindow))throw new Error('A declared balance preparation needs an actual adapter-supplied released exit window.');
  const windows=proofs.map(p=>p.exitPreparationWindow!);
  for(const [i,w]of windows.entries())if(w.kind!=='next-neighbor-balance'||w.after!=='last-named-shoulder-pass'||w.contactState!=='released'||!Number.isFinite(w.sourceStart)||!Number.isFinite(w.sourceEnd)||w.sourceStart<=proofs[i].entry.sourceBeat||w.sourceStart>=w.sourceEnd||w.sourceEnd!==proofs[i].exit.sourceBeat||w.sourceEnd!==core.totalBeats)throw new Error('The exit-preparation window must stay after its named passage and inside the terminal source interval.');
  const sourceStart=Math.max(...windows.map(w=>w.sourceStart)),sourceEnd=core.totalBeats;
  return{figureId:f.id,targetFigureId:dance.figures[0].id,sourceStart,sourceEnd,duration:sourceEnd-sourceStart,targetBinding:'next-cycle-actual-neighbors',formationSample:'before-balance-preparation',after:'last-named-shoulder-pass',contactState:'released'};
 });
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('A sequence sample clock must be finite.');const repeat=Math.floor(Math.max(0,beat)/core.totalBeats);return{repeat,binding:bindings[repeat%periodRepeats]};};
 return Object.freeze({...core,dance,periodRepeats,...(balancePreparations.length?{balancePreparations:freeze(balancePreparations)}:{}),topology(beat:number){const {repeat,binding}=locate(beat);return{epoch:repeat,neighbors:[...binding.relations.neighbor].filter(([a,b])=>a<b),partners:[...binding.relations.partner].filter(([a,b])=>a<b),waitingIds:[...binding.waitingIds]};},sequenceBoundaries(repeat:number){if(!Number.isSafeInteger(repeat)||repeat<0)throw new Error('A boundary proof needs a nonnegative repeat.');return structuredClone(states[repeat%periodRepeats].proofs);}});
}
