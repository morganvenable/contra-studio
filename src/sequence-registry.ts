import {acceptsPreparedFourteenSwing,compilePreparedFourteenSwing} from './prepared-fourteen-swing-step.ts';
import {compileAcrossSidelinePassStep} from './across-sideline-pass-step.ts';
import {compileCarriedHallStep} from './carried-hall-step.ts';
import {compileLarkChainFigure} from './role-chain-step.ts';
import {compileStarRoleExitStep,acceptsHeldRoleAllemande,compileHeldRoleAllemandeStep} from './star-role-allemande-step.ts';
import {compileAcrossRingPassStep} from './across-ring-pass-step.ts';
import {compileRoleShoulderPassStep} from './role-shoulder-pass-step.ts';
import {compileCarriedLinesRollawayStep} from './carried-lines-rollaway-step.ts';
import {needsShortReleasedPairSwingEntry,compileShortReleasedPairSwingStep} from './short-released-pair-swing-step.ts';
import {compileNeighborDosidoStep} from './neighbor-dosido-step.ts';
import {needsReleasedPairSwingEntry,compileReleasedPairSwingStep} from './released-pair-swing-step.ts';
import {acceptsStarGyreStep,compileStarGyreStep} from './star-gyre-step.ts';
import {compileStandaloneRollawayStep} from './standalone-rollaway-step.ts';
import {compileCoupledDosidoStep} from './coupled-dosido-step.ts';
import {compileActiveOnesSwingStep} from './active-ones-swing-step.ts';
/** Shared figure registry for the state-carrying sequence seam. Entries inspect
 * only one figure, its immediate successor and the measured incoming state. */
import type {Figure,MotionCapabilities} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import type {SequenceBoundary,SequencedMotionPlan} from './sequence-boundary.ts';
import {compileMirroredSixCountCircleStep,compileMirroredTwoCountPassStep} from './mirrored-six-two-step.ts';
import {compilePairedRadialSwingStep,needsPairedRadialSwingEntry} from './paired-radial-swing-step.ts';
import {compileRoleDosidoStep} from './role-dosido-step.ts';
import {compileNeutralFullHeyStep} from './neutral-full-hey-step.ts';
import {compileNeutralRoleHeyStep} from './neutral-role-hey-step.ts';
import {compileCarriedRightLeftThroughStep,needsCarriedRightLeftThroughEntry} from './carried-right-left-through-adapter.ts';
import {compileMeasuredSixCountCircleStep,compileMeasuredTwoCountPassStep} from './measured-six-two-step.ts';
import {compileBareArchStep} from './bare-arch-step.ts';
import {compileRolePullBySwingStep} from './role-pull-by-swing-step.ts';
import {compileMadRobinStep} from './mad-robin-step.ts';
import {compileOrderedCircleStep} from './ordered-circle-step.ts';
import {compileSquareThroughStep} from './square-through-step.ts';
import {compileChainSquareHandoff} from './chain-square-handoff.ts';
import {needsCompactPairBalance,compileCompactPairBalanceStep} from './compact-pair-balance-step.ts';
import {compileDosidoRingStep} from './dosido-ring-step.ts';

interface SequenceAdapter {
 readonly id:string;
 accepts(figure:Figure,context:FigureContext):boolean;
 compile(figure:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan;
}
const adapters:readonly SequenceAdapter[]=Object.freeze([
 {id:'carried-lines-rollaway',accepts:(f:Figure)=>f.kind==='long-lines-rollaway'&&f.rollRelation==='neighbor',compile:compileCarriedLinesRollawayStep},
 {id:'star-to-partner-gyre',accepts:(f:Figure,c:FigureContext)=>acceptsStarGyreStep(f,c.next),compile:compileStarGyreStep},
 {id:'bare-arch-exchange',accepts:(f:Figure)=>f.kind==='box-the-gnat'&&f.entry==='paired-sidelines',compile:compileBareArchStep},
 {id:'role-pull-by-swing',accepts:(f:Figure,c:FigureContext)=>f.kind==='pull-by'&&['larks','robins'].includes(f.who??'')&&f.exit===undefined&&c.next?.kind==='swing',compile:compileRolePullBySwingStep},
 {id:'mad-robin-full-return',accepts:(f:Figure)=>f.kind==='mad-robin',compile:compileMadRobinStep},
 {id:'ordered-circle-exit',accepts:(f:Figure)=>f.kind==='circle'&&f.exit==='progressed-neighbors',compile:compileOrderedCircleStep},
 {id:'balanced-square-through',accepts:(f:Figure)=>f.kind==='square-through',compile:compileSquareThroughStep},
 {id:'chain-to-square',accepts:(f:Figure,c:FigureContext)=>['robins-chain','ladies-chain'].includes(f.kind)&&c.next?.kind==='square-through',compile:compileChainSquareHandoff},
]);
export interface SequenceStepResult {readonly adapterId:string;readonly plan:MotionPlan;readonly ownsEntryFacing:boolean;readonly boundaryPlan?:SequencedMotionPlan;}

/** Established adapters retain their existing presentation while being carried
 * through the same actual-state seam. New adapters consume the complete held
 * boundary directly; no whole-source signature is available to this registry. */
export function compileSequenceStep(figure:Figure,context:FigureContext,incoming:SequenceBoundary,compileEstablished:()=>MotionPlan,capabilities:MotionCapabilities={}):SequenceStepResult {
 if(figure.kind==='hall-travel'){if(!capabilities.stateCarryingSequences||!capabilities.hallTravel)throw Error('Carried hall travel requires registered source and motion capabilities.');const plan=compileCarriedHallStep(figure,context,incoming);return{adapterId:'carried-hall-travel',plan,ownsEntryFacing:true,boundaryPlan:plan};}
 if(figure.kind==='larks-chain'){if(!capabilities.stateCarryingSequences||!capabilities.stateCarryingRoleChains)throw Error('Role chains need their actual-state capability.');const plan=compileLarkChainFigure(figure,context,incoming);return{adapterId:'explicit-role-chain',plan,ownsEntryFacing:true,boundaryPlan:plan};}
 if(figure.kind==='do-si-do'&&figure.exit==='ring'){
  if(!capabilities.stateCarryingSequences||!capabilities.ringBalances)throw Error('Do-si-do ring preparation needs its registered state-carrying ring boundary.');
  const plan=compileDosidoRingStep(figure,context,incoming);
  return{adapterId:'dosido-to-held-ring',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(needsCompactPairBalance(figure,context,incoming)){
  const plan=compileCompactPairBalanceStep(figure,context,incoming);
  return{adapterId:'compact-pair-balance',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='star'&&figure.starReleaseRole!==undefined||acceptsHeldRoleAllemande(figure,incoming)){if(!capabilities.stateCarryingStarAllemandes)throw Error('Held star/role transitions require their carried-state capability.');const star=figure.kind==='star',plan=star?compileStarRoleExitStep(figure,context,incoming):compileHeldRoleAllemandeStep(figure,context,incoming);return{adapterId:star?'star-role-release':'held-role-allemande',plan,ownsEntryFacing:true,boundaryPlan:plan};}
 if(acceptsPreparedFourteenSwing(figure,context,incoming)){const plan=compilePreparedFourteenSwing(figure,context,incoming);return{adapterId:'prepared-fourteen-partner-swing',plan,ownsEntryFacing:true,boundaryPlan:plan};}
 if(needsReleasedPairSwingEntry(figure,context,incoming)){
  const plan=compileReleasedPairSwingStep(figure,context,incoming);
  return{adapterId:'released-pair-swing',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(needsShortReleasedPairSwingEntry(figure,context,incoming)){
  const plan=compileShortReleasedPairSwingStep(figure,context,incoming);
  return{adapterId:'released-pair-swing',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='do-si-do'&&figure.who==='neighbor'&&figure.exit!==undefined){
  if(!capabilities.stateCarryingNeighborDosidos)throw new Error('A progressing neighbor do-si-do requires its registered actual-state pair boundary.');
  const plan=compileNeighborDosidoStep(figure,context,incoming);
  return{adapterId:'neighbor-dosido-exchange',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='pass-through'&&figure.entry==='paired-sidelines'&&figure.exit==='opposite-paired-swing'){if(!capabilities.stateCarryingAcrossPasses)throw Error('Across sideline passage requires carried-state capability.');const plan=compileAcrossSidelinePassStep(figure,context,incoming);return{adapterId:'across-sideline-pass',plan,ownsEntryFacing:true,boundaryPlan:plan};}
 if(figure.kind==='pass-through'&&figure.entry==='ring'&&figure.exit==='opposite-paired-gyre'){if(!capabilities.stateCarryingAcrossPasses)throw Error('Across-ring passages require their carried-state capability.');const plan=compileAcrossRingPassStep(figure,context,incoming);return{adapterId:'across-ring-pass',plan,ownsEntryFacing:true,boundaryPlan:plan};}
 if(figure.kind==='pass-through'&&['larks','robins'].includes(figure.who??'')){
  if(!capabilities.stateCarryingRolePasses)throw Error('Role shoulder passages require their registered carried-state capability.');
  const plan=compileRoleShoulderPassStep(figure,context,incoming);return{adapterId:'role-shoulder-pass',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='rollaway'){
  if(!capabilities.stateCarryingRollaways)throw new Error('A standalone rollaway requires its registered actual-state exchange boundary.');
  const plan=compileStandaloneRollawayStep(figure,context,incoming);
  return{adapterId:'standalone-rollaway',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='couples-do-si-do'){
  if(!capabilities.stateCarryingCouplesDosidos)throw new Error('A couples do-si-do requires its registered carried partner-unit boundary.');
  const plan=compileCoupledDosidoStep(figure,context,incoming);
  return{adapterId:'couples-do-si-do',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.who==='ones'){
  if(!capabilities.stateCarryingActiveSwings)throw new Error('A current-ones swing requires its registered rank-carrying boundary.');
  const plan=compileActiveOnesSwingStep(figure,context,incoming);
  return{adapterId:'active-ones-swing',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(capabilities.stateCarryingRadialSwings&&needsPairedRadialSwingEntry(figure,incoming)){
  const plan=compilePairedRadialSwingStep(figure,context,incoming);
  return{adapterId:'paired-radial-swing',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='do-si-do'&&['larks','robins'].includes(figure.who??'')&&figure.amount===1.5){
  if(!capabilities.stateCarryingRoleDosidos)throw new Error('A same-role one-and-a-half do-si-do requires its registered state-carrying boundary.');
  const plan=compileRoleDosidoStep(figure,context,incoming);
  return{adapterId:'role-dosido-exchange',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='hey'&&figure.exit==='opposite-slots-facing-across'){
  if(!capabilities.stateCarryingHalfHeys||!capabilities.ordinaryHalfHeys)throw new Error('A neutral half hey requires its registered state-carrying boundary.');
  const plan=compileNeutralRoleHeyStep(figure,context,incoming);
  return{adapterId:'neutral-half-hey',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='hey'&&figure.exit==='same-slots-facing-across'){
  if(!capabilities.stateCarryingFullHeys||!capabilities.ordinaryFullHeys)throw new Error('A neutral full-hey return requires its registered state-carrying boundary.');
  const plan=compileNeutralFullHeyStep(figure,context,incoming);
  return{adapterId:'neutral-full-hey',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(figure.kind==='right-left-through'&&capabilities.stateCarryingRightLeftThroughs&&needsCarriedRightLeftThroughEntry(incoming)){
  const plan=compileCarriedRightLeftThroughStep(figure,context,incoming,{halfWidth:.9,halfDepth:.9});
  return{adapterId:'carried-right-left-through',plan,ownsEntryFacing:true,boundaryPlan:plan};
 }
 if(capabilities.stateCarryingMirroredSixTwoPasses){
  const mirrored=figure.kind==='circle'&&figure.direction==='right'&&context.next?.entry==='circle-exit'?{id:'mirrored-circle-six',compile:compileMirroredSixCountCircleStep}:figure.kind==='pass-through'&&figure.passingShoulder==='left'&&figure.entry==='circle-exit'?{id:'mirrored-pass-two',compile:compileMirroredTwoCountPassStep}:undefined;
  if(mirrored){const plan=mirrored.compile(figure,context,incoming);return{adapterId:mirrored.id,plan,ownsEntryFacing:true,boundaryPlan:plan};}
 }
 if(capabilities.stateCarryingSixTwoPasses){
  const measured=figure.kind==='circle'&&context.next?.entry==='circle-exit'?{id:'measured-circle-six',compile:compileMeasuredSixCountCircleStep}:figure.kind==='pass-through'&&figure.entry==='circle-exit'?{id:'measured-pass-two',compile:compileMeasuredTwoCountPassStep}:undefined;
  if(measured){const plan=measured.compile(figure,context,incoming);return{adapterId:measured.id,plan,ownsEntryFacing:true,boundaryPlan:plan};}
 }
 const adapter=adapters.find(a=>a.accepts(figure,context));
 if(adapter){const plan=adapter.compile(figure,context,incoming);return{adapterId:adapter.id,plan,ownsEntryFacing:true,boundaryPlan:plan};}
 return{adapterId:`established:${figure.kind}`,plan:compileEstablished(),ownsEntryFacing:false};
}
