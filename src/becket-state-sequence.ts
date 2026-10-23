/** A common Becket event wrapper: local figures carry actual state before and
 * after one explicit whole-set slice. No title, table signature or fixed event
 * count selects the choreography; the endpoint transaction owns rebinding. */
import {capturePlainData} from './owned-program-cache.ts';
import {compileBecketSliceStep,captureBecketSliceBoundary,type BecketSlicePlan} from './becket-slice-step.ts';
import {compileEventSection,type CompiledEventSection,type BoundFigureStep} from './event-section.ts';
import {createFiniteBecketState,finiteBecketPoses,ownProgressionDeclaration,describeBoundEndEffects,type FiniteBecketState,type GroupBinding} from './progression-topology.ts';
import {createDancers,compilePrimitiveFigure,figureContinuity,assertCompositionCapabilities,type SequenceStepProof} from './engine.ts';
import {compileSequenceStep} from './sequence-registry.ts';
import {compileChainFigure} from './chain.ts';
import {compileRingTransitionFigure} from './ring-transition-adapter.ts';
import {compilePetronellaFigure,type PetronellaFigure} from './petronella-adapter.ts';
import {captureSequenceBoundary,sampleSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import type {ContraDbImportedDance} from './contradb-import.ts';
import type {Dance,CompiledDance,Frame,Pose,HandContact,MotionCapabilities} from './types.ts';
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
const delta=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){for(const c of Object.values(x))freeze(c);Object.freeze(x);}return x;};
export interface CompiledBecketStateSequence extends CompiledDance {
 readonly period:number;readonly periodStart:number;readonly eventBeat:number;
 topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;waitingIds:readonly number[]};
 sequenceBoundaries(repeat:number):readonly SequenceStepProof[];
}
export function compileBecketStateSequence(input:Dance,couples:number,capabilities:MotionCapabilities,stepCompiler?:typeof compileSequenceStep):CompiledBecketStateSequence {
 const dance=freeze(capturePlainData(input)) as Dance&Partial<Pick<ContraDbImportedDance,'sourceRecord'|'sourceText'>>;
 if(!capabilities.stateCarryingBecketSlices||!capabilities.stateCarryingSequences||!capabilities.progressionEvents)throw new Error('Becket slices need their registered actual-state boundary and source-event sequencer.');
 if(dance.formation!=='becket'||dance.circulation!=='cw')throw new Error('A literal left slice currently requires explicitly reviewed clockwise Becket.');
 const allowed=['id','title','author','formation','circulation','description','figures','verified','sourceUrl','sourceText','sourceRecord','sourceRows','contraDbInterpretation','progressionEvents','endPolicy','notes'];
 if(Object.keys(dance).some(k=>!allowed.includes(k)&&(dance as any)[k]!==undefined))throw new Error('The Becket state sequence cannot ignore an unrelated formation policy.');
 for(const k of['id','title']as const)if(typeof dance[k]!=='string'||!dance[k].trim())throw new Error('Becket sequence identity and title must be explicit text.');
 for(const k of['author','description','sourceUrl','sourceText']as const)if((dance as any)[k]!==undefined&&typeof(dance as any)[k]!=='string')throw new Error('Becket sequence metadata must retain its declared text type.');
 if(dance.notes!==undefined&&(!Array.isArray(dance.notes)||dance.notes.some(n=>typeof n!=='string'))||dance.verified!==undefined&&typeof dance.verified!=='boolean')throw new Error('Becket sequence notes and verification metadata must retain their declared types.');
 if(!Array.isArray(dance.figures)||!dance.figures.length||dance.figures.length>64||dance.figures.some(f=>typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||!Number.isFinite(f.beats)||f.beats<=0||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence)))throw new Error('Each Becket step needs exact metadata and positive source counts.');
 if(new Set(dance.figures.map(f=>f.id)).size!==dance.figures.length||!Array.isArray(dance.progressionEvents)||dance.progressionEvents.length!==1||!dance.endPolicy)throw new Error('A Becket sequence needs unique row IDs, one explicit source event and a separate finite-end choice.');
 const event=ownProgressionDeclaration(dance,dance.progressionEvents[0]),sliceIndex=dance.figures.findIndex(f=>f.id===event.afterFigureId),sliceFigure=dance.figures[sliceIndex];
 if(dance.figures.filter(f=>f.kind==='becket-slice').length!==1||sliceFigure?.kind!=='becket-slice'||event.count!==1||event.initialBinding!==undefined||event.waitingRoleArrangement!=='lark-left'||event.source.basis!=='source-explicit')throw new Error('The Becket event must name the sole declared slice endpoint with one source-explicit neighbor change.');
 if(dance.sourceUrl!==undefined&&event.source.url!==dance.sourceUrl||dance.sourceRecord&&(event.source.sourceId!==dance.sourceRecord.snapshotId||event.source.url!==dance.sourceRecord.sourceUrl))throw new Error('The Becket event must bind the retained source snapshot and URL.');
 if(!stepCompiler)assertCompositionCapabilities(dance.figures,capabilities);
 const starts:number[]=[];let totalBeats=0;for(const f of dance.figures){starts.push(totalBeats);totalBeats+=f.beats;}
 const eventBeat=starts[sliceIndex]+sliceFigure.beats;
 if(totalBeats>256||eventBeat+8>totalBeats)throw new Error('The explicit finite-end turn must fit after the slice inside the source repeat.');
 const dancers=createDancers(couples),initialState=createFiniteBecketState(couples,{circulation:'cw',roleArrangement:'lark-left'});
 type Round={before:FiniteBecketState;slice:BecketSlicePlan;prefix?:CompiledEventSection;suffix?:CompiledEventSection;proofs:SequenceStepProof[];end:Pose[]};
 const rounds:Round[]=[],seen=new Map<string,number>();let state=initialState,current=finiteBecketPoses(state),period=0,periodStart=0;
 const key=(s:FiniteBecketState)=>JSON.stringify(s.couples);
 const localSection=(from:number,to:number,initial:Pose[],binding:GroupBinding,sourceOffset:number,proofs:SequenceStepProof[],waiting?:BecketSlicePlan):CompiledEventSection|undefined=>{
  if(from===to)return undefined;
  const endings=new Map<string,HandContact[]>();
  const steps:BoundFigureStep[]=dance.figures.slice(from,to).map((figure,relative)=>{
   const index=from+relative,continuity=figureContinuity(dance.figures,index),strict=figure.kind==='hey'&&['same-slots-facing-across','opposite-slots-facing-across'].includes(figure.exit??'');
   return{figure,entryFacingBeats:stepCompiler||strict||continuity.swingEntry?0:Math.min(1,figure.beats*.125),compile(context){
    context={...context,next:dance.figures[index+1]};
    // Reuse actual-bound conventional adapters through the established seam.
    // These consume current identities, roots and epoch; no source-specific
    // route or new strict-carried contact certification is implied.
    const established=()=>figure.kind==='robins-chain'||figure.kind==='ladies-chain'?compileChainFigure(figure,context):figure.kind==='ring-balance'?compileRingTransitionFigure(figure,context):figure.kind==='petronella'?compilePetronellaFigure(figure as PetronellaFigure,context):compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,dancers.filter(d=>d.role==='lark').map(d=>d.direction),continuity);
    const groupKey=[...context.ids].sort((a,b)=>a-b).join(':'),raw=endings.get(groupKey)??[],incoming=captureSequenceBoundary(context,starts[index],raw),result=(stepCompiler??compileSequenceStep)(figure,context,incoming,established,capabilities),entry=sampleSequenceBoundary(context,result.plan,starts[index],0),exit=sampleSequenceBoundary(context,result.plan,starts[index]+figure.beats,1);
    if(result.boundaryPlan)assertSequenceHandoff(incoming,entry);
    endings.set(groupKey,structuredClone(exit.heldContacts) as HandContact[]);proofs.push({figureId:figure.id,adapterId:result.adapterId,contactPolicy:result.boundaryPlan?'strict-carried':'established-acquisition',incoming,entry,exit});return result.adapterId==='released-pair-swing'?{...result.plan,ownsEntryFacing:result.ownsEntryFacing}:result.plan;
   },inactive:waiting?(beat)=>waiting.sampleWaiting(sourceOffset+beat):undefined};
  });
  return compileEventSection({dancers,initial,binding,steps,totalBeats:dance.figures.slice(from,to).reduce((n,f)=>n+f.beats,0)});
 };
 for(let r=0;r<4*couples+4;r++){
  const stateKey=key(state),old=seen.get(stateKey);if(old!==undefined){periodStart=old;period=r-old;const expected=old===0?finiteBecketPoses(initialState):rounds[old-1].end;for(const p of current)if(delta(p,expected[p.id])>1e-6||turn(p.yaw,expected[p.id].yaw)>1e-6)throw new Error('The repeated finite Becket state has not physically returned.');break;}seen.set(stateKey,r);
  const proofs:SequenceStepProof[]=[],prefix=localSection(0,sliceIndex,current,state.binding,0,proofs),arrival=prefix?prefix.end.map(copy):current.map(copy),contacts=prefix?prefix.sample(starts[sliceIndex]).contacts:[];
  const incoming=captureBecketSliceBoundary(dancers,arrival,state.binding,starts[sliceIndex],contacts),slice=compileBecketSliceStep(sliceFigure,incoming,state,{progressionSource:event.source,timingSource:{...event.source,basis:'reviewed-interpretation',clause:'Reviewed four counts of diagonal-left approach and four counts of straight-back retreat within the source eight-count slice.'},endPolicy:dance.endPolicy});
  const suffix=localSection(sliceIndex+1,dance.figures.length,slice.sample(eventBeat).poses,slice.endBinding,eventBeat,proofs,slice),end=suffix?suffix.end.map(copy):slice.sample(eventBeat).poses;
  const expected=finiteBecketPoses(slice.nextState);for(const p of end)if(delta(p,expected[p.id])>1e-6||turn(p.yaw,expected[p.id].yaw)>1e-6)throw new Error('The actual local figures do not close to the next finite Becket slots; no repeat reset was inserted.');
  rounds.push({before:state,slice,prefix,suffix,proofs,end});current=end;state=slice.nextState;
 }
 if(!period)throw new Error('The finite Becket circulation did not close within its bounded state period.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('A Becket sample clock must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/totalBeats),localBeat=beat-repeat*totalBeats,index=repeat<rounds.length?repeat:periodStart+(repeat-periodStart)%period;return{beat,repeat,localBeat,round:rounds[index]};};
 const warnings=['The slice approaches diagonally left for four counts and retreats straight back for four; this internal timing is a retained reviewed choice.','Neighbors change only at the source-marked slice endpoint. Waiting couples use the separately reviewed eight-count same-end turn, then wait for the next slice.'];
 const sample=(beat:number):Frame=>{const at=locate(beat),r=at.round,binding=at.localBeat<eventBeat?r.before.binding:r.slice.endBinding;let frame:Frame;if(at.localBeat<starts[sliceIndex])frame=r.prefix!.sample(at.localBeat);else if(at.localBeat<eventBeat)frame={...r.slice.sample(at.localBeat),beat:at.localBeat,localBeat:at.localBeat,repeat:0,figureIndex:sliceIndex,figureProgress:(at.localBeat-starts[sliceIndex])/sliceFigure.beats,warnings:[]};else{frame=r.suffix!.sample(at.localBeat-eventBeat);frame={...frame,figureIndex:frame.figureIndex+sliceIndex+1};}return{...frame,beat:at.beat,localBeat:at.localBeat,repeat:at.repeat,warnings:[...warnings,...describeBoundEndEffects(dancers,binding,frame.poses,'lark-left',at.repeat*totalBeats+(at.localBeat<eventBeat?eventBeat:totalBeats+eventBeat))]};};
 return Object.freeze({dance,dancers,totalBeats,repeatable:true,starts,warnings,period,periodStart,eventBeat,sample,formationSample:sample,topology(beat:number){const at=locate(beat),binding=at.localBeat<eventBeat?at.round.before.binding:at.round.slice.endBinding;return{epoch:at.repeat+Number(at.localBeat>=eventBeat),neighbors:[...binding.relations.neighbor].filter(([a,b])=>a<b),waitingIds:[...binding.waitingIds]};},sequenceBoundaries(repeat:number){if(!Number.isSafeInteger(repeat)||repeat<0)throw new Error('A Becket boundary repeat must be a nonnegative integer.');return structuredClone(locate(repeat*totalBeats).round.proofs);}});
}
