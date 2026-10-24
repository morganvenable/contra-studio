import {assertNeighborDosidoFigure} from './neighbor-dosido-step.ts';
import {assertDosidoRingFigure} from './dosido-ring-step.ts';
import {assertStandaloneRollawayFigure} from './standalone-rollaway-step.ts';
import {assertCoupledDosidoFigure} from './coupled-dosido-step.ts';
import {assertActiveSwingPreparationSequence} from './active-swing-preparation.ts';
import {assertActiveOnesSwingFigure,type ActiveOnesSwingPlan} from './active-ones-swing-step.ts';
import type {CurrentMinorSetRank} from './extended-figures.ts';
import {assertOrderedCircleFigure} from './ordered-circle-step.ts';
import {compileSequenceStep,type SequenceStepResult} from './sequence-registry.ts';
import {captureSequenceBoundary,assertSequenceHandoff,type SequenceBoundary} from './sequence-boundary.ts';
import {assertSquareThroughStepFigure} from './square-through-step.ts';
import {compileSquareThroughFigure,assertSquareThroughComposition} from './square-through-adapter.ts';
import {compilePartnerFirstHalfHeyHandoff,assertPartnerFirstHalfHeyDeclaration} from './partner-first-half-hey.ts';
import {compileOrdinaryFullHeyHandoff} from './ordinary-hey-handoff.ts';
import {compileTerminalNamedPullByFigure,assertTerminalNamedPullByComposition} from './terminal-named-pull-by.ts';
import {compileNamedPullByFigure} from './named-pull-by-adapter.ts';
import {prepareAllemandePromenadeExit} from './allemande-promenade-handoff.ts';
import {prepareSwingRingExit} from './ring-pair-handoff.ts';
import {compileRevolvingDoorFigure,type RevolvingDoorFigure} from './revolving-door-adapter.ts';
import {assertRevolvingDoorComposition,REVOLVING_DOOR_WARNING} from './revolving-door-composition.ts';
import {compileCrossTrailsFigure} from './cross-trails-adapter.ts';
import {compileArchSwingFigure} from './arch-swing-adapter.ts';
import {compileGiveAndTakeFigure,type GiveAndTakeFigure} from './give-and-take-adapter.ts';
import {compileRingPassFigure} from './ring-pass-adapter.ts';
import {compileRingTransitionFigure} from './ring-transition-adapter.ts';
import {compileRicochetHeyFigure,type RicochetHeyFigure} from './ricochet-hey-adapter.ts';
import {compileGyreFigure,type GyreFigure} from './gyre-adapter.ts';
import {compilePetronellaFigure,type PetronellaFigure} from './petronella-adapter.ts';
import {starGrips} from './star-grips.ts';
import {compileLongLinesRollawayFigure,type LongLinesRollawayFigure} from './long-lines-rollaway-adapter.ts';
import {compileRingBalanceFigure,compileCaliforniaTwirlFigure} from './ring-california-adapter.ts';
import {compileOrdinaryFullHeyFigure} from './ordinary-full-hey.ts';
import {compileOrdinaryHalfHeyFigure} from './ordinary-half-hey.ts';
import {compilePromenadeFigure} from './promenade-adapter.ts';
import {compileTravelFigure} from './travel-figure-adapter.ts';
import {assertFigureArgumentsConsumed,assertProgressionMarkers} from './figure-semantics.ts';
import {compileRightLeftThroughFigure} from './right-left-through-adapter.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {assertBareArchFigure} from './bare-arch-step.ts';
import {compileArchFigure,compileHalfHeyFigure,type MotionPlan} from './extended-figures.ts';
import {compileChainFigure,type BoundRelationships} from './chain.ts';
import type {CompiledDance, Dance, Dancer, Figure, Frame, HandContact, Pose, Vec2, BalanceCue, MotionCapabilities, FigureExitPreparationWindow} from './types.ts';

export const HALF_WIDTH=.9, ROW_GAP=1.8;
const TAU=Math.PI*2;
const positiveTurn=(angle:number)=>{const value=((angle%TAU)+TAU)%TAU;return value>TAU-1e-7?0:value;};
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=(t:number)=>{t=clamp(t);return t*t*(3-2*t)};
// Short C2 speed ramps keep one musical step per beat possible without the
// 50% mid-figure speed surge of a whole-figure smoothstep.
const steadyProgress=(time:number,r=.16):number=>{const t=clamp(time),n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-steadyProgress(1-t,r);return(t-r/2)/n;};
const add=(a:Vec2,b:Vec2):Vec2=>({x:a.x+b.x,z:a.z+b.z});
const sub=(a:Vec2,b:Vec2):Vec2=>({x:a.x-b.x,z:a.z-b.z});
const mul=(a:Vec2,n:number):Vec2=>({x:a.x*n,z:a.z*n});
const mix=(a:Vec2,b:Vec2,t:number):Vec2=>add(mul(a,1-t),mul(b,t));
const len=(a:Vec2)=>Math.hypot(a.x,a.z);
const rotate=(p:Vec2,a:number):Vec2=>({x:p.x*Math.cos(a)-p.z*Math.sin(a),z:p.x*Math.sin(a)+p.z*Math.cos(a)});
const angle=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
const angleMix=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const mean=(ps:Vec2[])=>mul(ps.reduce(add,{x:0,z:0}),1/ps.length);
const clone=(p:Pose):Pose=>({...p,position:{...p.position}});
interface Segment {start:number;figure:Figure;poseAt:(t:number)=>Pose[];rawContactsAt:(t:number,poses:Pose[])=>HandContact[];contactsAt:(t:number,poses:Pose[])=>HandContact[];}
export interface SequenceStepProof {figureId:string;adapterId:string;contactPolicy:'strict-carried'|'established-acquisition';currentRank?:CurrentMinorSetRank;exitPreparationWindow?:FigureExitPreparationWindow;incoming:SequenceBoundary;entry:SequenceBoundary;exit:SequenceBoundary;}
interface Cycle {segments:Segment[];end:Pose[];directions:number[];warnings:string[];sequenceState?:{groups:number[][];waitingIds:number[];neighbor:Array<[number,number]>;initial:Pose[];end:Pose[];directions:number[];proofs:SequenceStepProof[]};}
export interface StateCarryingCore extends CompiledDance {sequenceState(repeat:number):NonNullable<Cycle['sequenceState']>;}

export function createDancers(couples=6):Dancer[]{return Array.from({length:couples*2},(_,id)=>({id,name:`${id%2?'Robin':'Lark'} ${Math.floor(id/2)+1}`,role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:Math.floor(id/2)%2?-1:1,color:id%2?'#cb815a':'#438b86'}));}
export function initialPoses(dancers:Dancer[]):Pose[]{const rows=dancers.length/2;return dancers.map(d=>({id:d.id,position:{x:HALF_WIDTH*(d.role==='lark'?d.direction:-d.direction),z:(d.couple-(rows-1)/2)*ROW_GAP},yaw:d.direction===1?0:Math.PI,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));}

export function compileDance(dance:Dance,couples=6,capabilities:MotionCapabilities=REGISTERED_MOTION_CAPABILITIES):CompiledDance{return compileDanceCore(dance,couples,capabilities,false);}
/** Internal finite sampler: source/event ownership is checked by the common sequence wrapper. */
export function compileStateCarryingCore(dance:Dance,couples:number,capabilities:MotionCapabilities):StateCarryingCore{return compileDanceCore(dance,couples,capabilities,true) as StateCarryingCore;}
function compileDanceCore(dance:Dance,couples:number,capabilities:MotionCapabilities,stateSequencing:boolean):CompiledDance{
  if(stateSequencing&&!capabilities.stateCarryingSequences)throw new Error('State-carrying figure sequencing is not enabled.');
  assertCompositionCapabilities(dance.figures,{...capabilities,stateCarryingSequences:stateSequencing});
  if(dance.madRobinPolicy!==undefined)throw new Error('A mad-robin policy requires its dedicated reviewed finite compiler.');
  if(dance.ringTwirlPolicy!==undefined)throw new Error('A ring/twirl return policy requires its dedicated reviewed finite compiler.');
  if(dance.diagonalHeyPolicy!==undefined)throw new Error('A diagonal-hey policy requires its dedicated reviewed formation compiler.');
  if(dance.sixTwoPassPolicy!==undefined||dance.figures.some(f=>f.entry==='circle-exit')&&!(stateSequencing&&(capabilities.stateCarryingSixTwoPasses||capabilities.stateCarryingMirroredSixTwoPasses)))throw new Error('A six-count circle and two-count pass require their dedicated reviewed whole-formation compiler.');
  if(dance.figures.some(f=>f.heyAxis!==undefined))throw new Error('An axis-declared hey requires its dedicated reviewed diagonal formation compiler.');
  if(dance.ovalPolicy!==undefined)throw new Error('A whole-set oval policy requires its dedicated formation compiler.');
  if(dance.figures[0]?.kind==='swing')throw new Error('A prepared opening swing requires its dedicated finite initial-frame and repeat-return compiler.');
  if(dance.endPolicy!==undefined)throw new Error('A finite-end policy declaration requires its explicitly reviewed multi-event compiler.');
  if(dance.progressionEvents!==undefined)throw new Error('Source-declared relation events require a registered event-aware formation compiler.');
  if(dance.formation!=='duple-improper')throw new Error('This adapter requires duple-improper formation; choose a registered formation compiler.');
  assertProgressionMarkers(dance.figures,dance.figures.length-1);
  if(!Number.isInteger(couples)||couples<2||couples>12)throw new Error('Choose 2–12 couples.');
  const supported=new Set(['balance','swing','circle','allemande','do-si-do','ladies-chain','robins-chain','long-lines','star']);
  if(stateSequencing&&capabilities.stateCarryingRollaways)supported.add('rollaway');
  if(stateSequencing&&capabilities.stateCarryingCouplesDosidos)supported.add('couples-do-si-do');
  if(stateSequencing&&capabilities.stateCarryingMadRobins&&capabilities.madRobins)supported.add('mad-robin');if(capabilities.squareThroughs)supported.add('square-through');if(capabilities.namedPullBys)supported.add('pull-by');if(capabilities.revolvingDoors)supported.add('revolving-door');if(capabilities.crossTrails)supported.add('cross-trails');if(capabilities.giveAndTakes)supported.add('give-and-take');if(capabilities.ringPassThroughs)supported.add('pass-through');if(capabilities.ricochetHeys)supported.add('ricochet-hey');if(capabilities.gyres)supported.add('gyre');if(capabilities.petronellas)supported.add('petronella');if(capabilities.longLinesRollaways)supported.add('long-lines-rollaway');if(capabilities.archExchanges)supported.add('box-the-gnat');if(capabilities.partialHeys||capabilities.ordinaryHalfHeys||capabilities.ordinaryFullHeys)supported.add('hey');if(capabilities.rightLeftThrough)supported.add('right-left-through');if(capabilities.hallTravel)supported.add('hall-travel');if(capabilities.promenades)supported.add('promenade');if(capabilities.ringBalances)supported.add('ring-balance');if(capabilities.californiaTwirls)supported.add('california-twirl');
  if(stateSequencing&&capabilities.stateCarryingRoleChains)supported.add('larks-chain');
  for(const f of dance.figures){if(f.starReleaseRole!==undefined&&(!stateSequencing||!capabilities.stateCarryingStarAllemandes))throw Error('A declared role release requires the held-star carried-state capability.');if(f.kind==='petronella'&&f.exit==='progressed-neighbors'&&!capabilities.terminalPetronellas)throw new Error('A terminal petronella requires its separately reviewed physical spacing and facing exit.');if(f.kind==='promenade'&&f.who==='neighbor'&&!capabilities.neighborPromenades)throw new Error('A neighbor promenade requires its separately reviewed relationship adapter.');if(f.kind==='ring-balance'&&['partner-swing','neighbor-swing'].includes(f.exit??'')&&!capabilities.ringStartSequences)throw new Error('Ring-to-swing exits require their separately reviewed composition adapter.');if(f.kind==='hey'&&f.exit==='opposite-paired-swing'&&!capabilities.ordinaryHeySwingExits)throw new Error('A half hey handing directly into a swing requires its separately reviewed exit adapter.');if(f.starGrip!==undefined&&!capabilities.starGrips)throw new Error('Explicit star grips require their separately reviewed contact adapter.');if(f.starGrip!==undefined&&!['hands-across','wrist-grip'].includes(f.starGrip))throw new Error('Unknown star grip variant.');if(f.kind==='hey'&&f.heyStartRole===undefined&&f.heyStartPair===undefined&&!capabilities.partialHeys)throw new Error('Exact-pass partial heys require their registered adapter.');if(f.kind==='hey'&&f.heyStartRole!==undefined&&!(f.amount===1?capabilities.ordinaryFullHeys:capabilities.ordinaryHalfHeys))throw new Error('Source-semantic role/shoulder heys need their separately registered amount-specific adapter.');if(!['right-left-through','promenade','larks-chain'].includes(f.kind)&&(f.courtesyLeader!==undefined||f.crossingRelation!==undefined))throw new Error('Courtesy leader and crossing relationship need a registered right-left-through adapter.');if(f.hands!==undefined&&!(stateSequencing&&capabilities.stateCarryingRoleChains&&f.kind==='larks-chain'&&['left','right'].includes(f.hands))&&!(stateSequencing&&['robins-chain','ladies-chain'].includes(f.kind)&&f.exit==='partners-facing-across'&&f.hands==='right')&&!(capabilities.squareThroughs&&f.kind==='square-through'&&f.hands==='right-left')&&!(capabilities.namedPullBys&&f.kind==='pull-by'&&['left','right'].includes(f.hands))&&!(capabilities.revolvingDoors&&f.kind==='revolving-door'&&f.hands==='right')&&!(capabilities.giveAndTakes&&f.kind==='give-and-take'&&f.hands==='both')&&!(capabilities.ringBalances&&f.kind==='ring-balance'&&f.hands==='both')&&!(capabilities.californiaTwirls&&f.kind==='california-twirl'&&f.hands==='right-left')&&!(capabilities.promenades&&f.kind==='promenade'&&f.hands==='both')&&!(capabilities.archExchanges&&['balance','box-the-gnat'].includes(f.kind)&&f.hands==='right'))throw new Error('This figure has no registered explicit hand variant.');if(f.underRole!==undefined&&!['box-the-gnat','california-twirl'].includes(f.kind))throw new Error('This figure does not consume an under-role modifier.');}
  if(!dance.figures.length)throw new Error('A dance needs at least one figure.');
  if(dance.figures.some(f=>f.kind==='balance'&&f.beats!==4))throw new Error('This balance adapter requires four counts: two steps in and two steps out.');
  for(const [i,f]of dance.figures.entries()){if(f.exit==='face-down-line'&&dance.figures[i+1]?.kind!=='hall-travel'&&!(stateSequencing&&capabilities.stateCarryingActiveSwings&&f.kind==='swing'&&f.who==='ones'&&i===dance.figures.length-1))throw new Error('The down-facing swing exit requires its explicitly following hall-travel composition.');if(['balance','swing','long-lines'].includes(f.kind)&&(f.direction!==undefined||f.amount!==undefined))throw new Error('This figure does not consume direction or amount modifiers.');if(f.kind==='balance'&&f.hands==='right'&&(dance.figures[i+1]?.kind!=='box-the-gnat'||dance.figures[i+1]?.who!==f.who))throw new Error('A right-hand balance requires the declared same-person arch transition.');if(!['hey','ricochet-hey'].includes(f.kind)&&!(stateSequencing&&capabilities.ringBalances&&f.kind==='do-si-do'&&f.exit==='ring'&&f.entry===undefined&&f.notation===undefined)&&!(stateSequencing&&capabilities.stateCarryingNeighborDosidos&&f.kind==='do-si-do'&&f.who==='neighbor'&&f.amount===1.5&&f.exit==='progressed-neighbors'&&f.entry===undefined&&f.notation===undefined)&&!(stateSequencing&&capabilities.stateCarryingActiveSwings&&f.kind==='swing'&&f.who==='ones'&&f.entry===undefined&&f.notation===undefined)&&!(stateSequencing&&(capabilities.stateCarryingSixTwoPasses||capabilities.stateCarryingMirroredSixTwoPasses)&&f.kind==='pass-through'&&f.entry==='circle-exit'&&f.exit==='progressed-neighbors'&&f.notation===undefined)&&!(stateSequencing&&capabilities.stateCarryingArchPullBys&&f.kind==='box-the-gnat'&&f.entry==='paired-sidelines'&&f.exit==='paired-sidelines'&&f.notation===undefined)&&!(stateSequencing&&f.kind==='mad-robin'&&capabilities.stateCarryingMadRobins)&&!(stateSequencing&&f.kind==='circle'&&capabilities.orderedCircleExits&&f.exit==='progressed-neighbors')&&!(stateSequencing&&['robins-chain','ladies-chain'].includes(f.kind)&&f.exit==='partners-facing-across'&&f.hands==='right'&&f.entry===undefined&&f.notation===undefined)&&!(capabilities.squareThroughs&&f.kind==='square-through'&&f.entry==='partners-facing-across'&&(f.exit==='progressed-neighbors'||stateSequencing&&f.exit==='partners-facing-across')&&f.notation===undefined)&&!(capabilities.terminalNamedPullBys&&f.kind==='pull-by'&&f.entry===undefined&&f.exit==='progressed-neighbors'&&f.notation===undefined)&&!(capabilities.revolvingDoors&&f.kind==='revolving-door'&&f.entry==='side-couples'&&f.exit==='opposite-paired-swing'&&f.notation===undefined)&&!(capabilities.crossTrails&&f.kind==='cross-trails'&&f.entry==='partners-facing-across'&&f.exit==='progressed-neighbors'&&f.notation===undefined)&&!(capabilities.giveAndTakes&&f.kind==='give-and-take'&&f.entry==='side-couples'&&f.exit==='same-person-swing'&&f.notation===undefined)&&!(stateSequencing&&capabilities.stateCarryingAcrossPasses&&f.kind==='pass-through'&&f.entry==='ring'&&f.exit==='opposite-paired-gyre'&&f.notation===undefined)&&!(stateSequencing&&capabilities.stateCarryingAcrossPasses&&f.kind==='pass-through'&&f.entry==='paired-sidelines'&&f.exit==='opposite-paired-swing'&&f.notation===undefined)&&!(capabilities.ringPassThroughs&&f.kind==='pass-through'&&f.entry==='ring'&&f.exit==='progressed-neighbors'&&f.notation===undefined)&&!(capabilities.petronellas&&f.kind==='petronella'&&f.entry==='ring'&&(f.exit==='ring'||capabilities.terminalPetronellas&&f.exit==='progressed-neighbors')&&f.notation===undefined)&&!(capabilities.ringBalances&&f.kind==='ring-balance'&&f.entry===undefined&&f.notation===undefined&&[undefined,'partner-california-twirl',...(capabilities.ringStartSequences?['partner-swing','neighbor-swing']:[])].includes(f.exit))&&!(capabilities.californiaTwirls&&f.kind==='california-twirl'&&f.entry==='side-by-side-facing-same'&&f.exit===undefined&&f.notation===undefined)&&!(capabilities.promenades&&f.kind==='promenade'&&f.entry==='side-couples'&&f.exit===undefined&&f.notation===undefined)&&!(capabilities.hallTravel&&f.kind==='hall-travel'&&f.entry==='paired-sidelines-facing-down'&&f.exit===undefined&&f.notation===undefined)&&!(capabilities.hallTravel&&f.kind==='swing'&&f.exit==='face-down-line'&&f.entry===undefined&&f.notation===undefined)&&(f.entry!==undefined||f.exit!==undefined||f.notation!==undefined))throw new Error('This figure does not consume hey entry, exit or pass notation.');}
  const bad=dance.figures.filter(f=>!supported.has(f.kind)||!Number.isFinite(f.beats)||f.beats<=0||f.confidence==='unsupported');
  if(dance.figures.some(f=>f.kind==='do-si-do'&&f.amount!==undefined&&f.amount!==1&&!(stateSequencing&&((capabilities.stateCarryingRoleDosidos&&['larks','robins'].includes(f.who??''))||(capabilities.stateCarryingNeighborDosidos&&f.who==='neighbor'&&f.exit==='progressed-neighbors'))&&f.amount===1.5)))throw new Error('Only a complete do-si-do or its registered state-carried role or neighbor exchange is currently modeled.');
  if(bad.length)throw new Error(`Unsupported or invalid figures: ${bad.map(f=>f.label).join(', ')}. No animation was invented.`);
  for(const f of dance.figures)assertFigureArgumentsConsumed(f);
  const dancers=createDancers(couples), totalBeats=dance.figures.reduce((n,f)=>n+f.beats,0), starts:number[]=[];
  let sum=0;for(const f of dance.figures){starts.push(sum);sum+=f.beats;}
  const warnings:string[]=[];
  if(dance.figures.some(f=>f.kind==='revolving-door'))warnings.push(REVOLVING_DOOR_WARNING);
  if(dance.figures.some((f,i)=>f.kind==='swing'&&dance.figures[i+1]?.kind==='ring-balance'))warnings.push('Schematic footwork: the swing opens into the same cyclic ring corners during its final two source counts. No beats are added.');
  if(dance.figures.some((f,i)=>f.kind==='allemande'&&dance.figures[i+1]?.kind==='promenade'))warnings.push('Schematic footwork: the complete allemande gathers the same pair and prepares across-set facing during its final source count. No beats are added.');
  for(const [index,figure] of dance.figures.entries())if(figure.kind==='swing'&&dance.figures[index-1]?.kind==='do-si-do')warnings.push(`Animation handoff convention: the swing after a do-si-do connects inward for ${(figure.beats*.14).toFixed(2)} counts and acquires its full frame by ${(figure.beats*.2).toFixed(2)} counts, within the source’s ${figure.beats}-count swing. This short connection is modeled explicitly rather than shown as an already-held frame.`);
  if(dance.figures.some((figure,index)=>figure.kind==='box-the-gnat'&&dance.figures[index+1]?.kind==='swing'))warnings.push('Animation handoff convention: each four-count box-the-gnat uses three counts for the full right-hand exchange, with a small outward pair-center route, and its final count to prepare the same-person swing. These internal choices are not specified by the source.');
  if(dance.figures.some(f=>f.kind==='swing'&&f.who==='ones'))warnings.push('Schematic current-ones swing: the explicitly bound active pair closes for 1.25 counts, turns for 5.25, and opens for 1.5 within the source eight counts. '+(dance.figures.at(-1)?.preparation==='next-neighbor-balance'?'After the old frame releases at 6.5 counts, actors with an actual next neighbor, including newly available end waiters, gather and acquire that next balance within the remaining 1.5 counts. The formation sample exposes the path before this reviewed preparation.':'Reviewed inactive twos keep their actual roots, then turn toward their next-neighbor direction during the final 1.5 counts.'));
  if(dance.figures.some(f=>f.kind==='rollaway'))warnings.push('Schematic standalone rollaway: the named rolling actor turns once in front while the counterpart half-sashays behind, exchanging their actual stations. Entry facing settles during the first 1.5 of the same four counts; reachable nearest hands connect, release before changing, and release again at the exit.');
  if(dance.figures.some(f=>f.kind==='do-si-do'&&f.who==='neighbor'&&f.exit==='progressed-neighbors'))warnings.push('Reviewed neighbor do-si-do: the old named pairs pass right shoulders, left shoulders and right shoulders again, completing a full return followed by another half passage within eight counts. Actual entry facing settles during initial travel. Any declared next-balance preparation begins only after the final old-neighbor shoulder passage, using actual next-cycle targets without an early relationship change. The nominal exchanged stations remain inspectable separately from the prepared public endpoint.');
  if(dance.figures.some(f=>f.kind==='couples-do-si-do'))warnings.push('Reviewed schematic coupled do-si-do: persistent partners travel as synchronized, released units without a displayed grip. Their actual entry facing turns during the first count of the eight-count full-return motion, then stays fixed during travel. No source beats are added.');
  if(totalBeats!==64)warnings.push(`This sequence is ${totalBeats} beats; a standard contra repeat is 64.`);
  if(!dance.verified)warnings.push('Study preview: the imported sequence has not been checked for complete formation and progression.');
  const executionDance={...dance,figures:dance.figures.map(f=>({...f,progression:stateSequencing&&(capabilities.stateCarryingActiveSwings&&f.kind==='swing'&&f.who==='ones'||capabilities.stateCarryingNeighborDosidos&&f.kind==='do-si-do'&&f.exit==='progressed-neighbors')?f.progression:false}))};
  const cycles:Cycle[]=[];
  const ensure=(repeat:number)=>{while(cycles.length<=repeat){const last=cycles.at(-1);cycles.push(buildCycle(executionDance,dancers,last?.end??initialPoses(dancers),last?.directions??dancers.filter(d=>d.role==='lark').map(d=>d.direction),cycles.length,capabilities,stateSequencing));}};
  ensure(0);
  const end=cycles[0].end,initial=initialPoses(dancers);
  const repeatable=Array.from({length:couples},(_,c)=>c).every(c=>{
    const a=end[c*2].position,b=end[c*2+1].position,expectedRow=(c%2===0?(c+1<couples?c+1:c):c-1);
    const expectedZ=(expectedRow-(couples-1)/2)*ROW_GAP;
    return Math.abs(a.z-b.z)<.05&&Math.abs((a.z+b.z)/2-expectedZ)<.05&&Math.abs(a.x+b.x)<.05&&Math.abs(Math.abs(a.x)-HALF_WIDTH)<.05;
  });
  if(repeatable){executionDance.figures.at(-1)!.progression=true;cycles.length=0;}
  if(!repeatable)warnings.push('The ending formation is not a validated single progression. Playback is limited to one repeat.');
  return {dance,dancers,totalBeats,repeatable,starts,warnings,...(stateSequencing?{sequenceState(repeat:number){if(!Number.isSafeInteger(repeat)||repeat<0)throw new Error('Sequence repeat must be a nonnegative integer.');ensure(repeat%(2*couples));return structuredClone(cycles[repeat%(2*couples)].sequenceState!);}}:{}),sample(beat:number):Frame{
    beat=Math.max(0,Number.isFinite(beat)?beat:0);if(!repeatable)beat=Math.min(beat,totalBeats-.000001);const repeat=Math.floor(beat/totalBeats),localBeat=beat-repeat*totalBeats,cycleIndex=repeat%(2*couples);ensure(cycleIndex);
    const cycle=cycles[cycleIndex];let fi=starts.findLastIndex(s=>s<=localBeat);if(fi<0)fi=0;
    const seg=cycle.segments[fi],p=clamp((localBeat-seg.start)/seg.figure.beats),poses=seg.poseAt(p);
    return {beat,localBeat,figureIndex:fi,figureProgress:p,repeat,poses,contacts:seg.contactsAt(p,poses),warnings:[...warnings,...cycle.warnings]};
  }};
}

function buildCycle(dance:Dance,dancers:Dancer[],initial:Pose[],initialDirections:number[],bindingEpoch:number,capabilities:MotionCapabilities,stateSequencing=false):Cycle{
  const directions=[...initialDirections], rows=Array.from({length:dancers.length/2},(_,c)=>({couple:c,z:(initial[c*2].position.z+initial[c*2+1].position.z)/2})).sort((a,b)=>a.z-b.z);
  const groups:number[][]=[],waiting:number[]=[],minorSetRanks:CurrentMinorSetRank[]=[];
  for(let i=0;i<rows.length;){const a=rows[i],b=rows[i+1];if(b&&directions[a.couple]===1&&directions[b.couple]===-1){groups.push([a.couple*2,a.couple*2+1,b.couple*2,b.couple*2+1]);minorSetRanks.push(Object.freeze({relationshipEpoch:bindingEpoch,ones:Object.freeze([a.couple*2,a.couple*2+1]) as readonly [number,number],twos:Object.freeze([b.couple*2,b.couple*2+1]) as readonly [number,number],forwardDirection:1}));i+=2;}else{waiting.push(a.couple);i++;}}
  // Resolve identities once per actual finite-set topology epoch. A chain never
  // chooses its receiving person by proximity or by an unconsumed who flag.
  const partner=new Map<number,number>(),neighbor=new Map<number,number>();
  for(const d of dancers)partner.set(d.id,d.id%2?d.id-1:d.id+1);
  for(const ids of groups)for(const id of ids){const other=ids.find(j=>dancers[j].role!==dancers[id].role&&dancers[j].couple!==dancers[id].couple)!;neighbor.set(id,other);}
  const relations:BoundRelationships={epoch:bindingEpoch,partner,neighbor};
  const total=dance.figures.reduce((s,f)=>s+f.beats,0), segments:Segment[]=[], cycleWarnings:string[]=[];
  let current=initial.map(clone), start=0;const proofs:SequenceStepProof[]=[];
  for(const [figureIndex,figure] of dance.figures.entries()){
    const continuity=figureContinuity(dance.figures,figureIndex);
    const source=current.map(clone), segStart=start;
    // The pair-first hey starts hand-free. Validate the actual predecessor's
    // endpoint contacts rather than silently treating every entry as released.
    const partnerHeyEntryContacts=figure.heyStartPair!==undefined?(segments.at(-1)?.rawContactsAt(1,source)??[]):[];
    const previousRaw=stateSequencing?(segments.at(-1)?.rawContactsAt(1,source)??[]):[];
    const incomingStates:SequenceBoundary[]=[];
    const planResults:SequenceStepResult[]=groups.map((ids,groupIndex)=>{const context={ids,start:source,dancers,relations,bindingEpoch,minorSetRanks:minorSetRanks[groupIndex],next:dance.figures[figureIndex+1],allowRelationChangingArchExit:capabilities.archRelationChanges,allowArchToCourtesyExit:capabilities.archToCourtesy};const established=()=>{if(figure.heyStartPair!==undefined){assertPartnerFirstHalfHeyDeclaration(figure);return compilePartnerFirstHalfHeyHandoff(figure,context,segStart,partnerHeyEntryContacts.filter(c=>ids.includes(c.a)||ids.includes(c.b)));}return figure.kind==='square-through'?compileSquareThroughFigure(figure as import('./square-through-adapter.ts').SquareThroughFigure,context,segStart):figure.kind==='pull-by'?(figure.exit==='progressed-neighbors'?compileTerminalNamedPullByFigure(figure,context):compileNamedPullByFigure(figure,context)):figure.kind==='revolving-door'?compileRevolvingDoorFigure(figure as RevolvingDoorFigure,context):figure.kind==='cross-trails'?compileCrossTrailsFigure(figure,context):figure.kind==='give-and-take'?compileGiveAndTakeFigure(figure as GiveAndTakeFigure,context):figure.kind==='pass-through'?compileRingPassFigure(figure,context):figure.kind==='ricochet-hey'?compileRicochetHeyFigure(figure as RicochetHeyFigure,context):figure.kind==='gyre'?compileGyreFigure(figure as GyreFigure,context):figure.kind==='petronella'?compilePetronellaFigure(figure as PetronellaFigure,context):figure.kind==='long-lines-rollaway'?compileLongLinesRollawayFigure(figure as LongLinesRollawayFigure,context):figure.kind==='ring-balance'?compileRingTransitionFigure(figure,context):figure.kind==='california-twirl'?compileCaliforniaTwirlFigure(figure,context):figure.kind==='promenade'?compilePromenadeFigure(figure,context):figure.kind==='hall-travel'?compileTravelFigure(figure,context):figure.kind==='right-left-through'?compileRightLeftThroughFigure(figure,context):figure.kind==='box-the-gnat'?(context.next?.kind==='swing'?compileArchSwingFigure(figure,context):compileArchFigure(figure,context)):figure.kind==='hey'?(figure.heyStartRole!==undefined?(figure.amount===1?(['same-slots-partner-balance','same-slots-neighbor-balance','same-person-swing'].includes(figure.exit??'')?compileOrdinaryFullHeyHandoff(figure,context,segStart):compileOrdinaryFullHeyFigure(figure,context)):compileOrdinaryHalfHeyFigure(figure,context)):compileHalfHeyFigure(figure,context)):figure.kind==='robins-chain'||figure.kind==='ladies-chain'?compileChainFigure(figure,context):figure.kind==='swing'&&context.next?.kind==='ring-balance'?prepareSwingRingExit(figure,context,planFigure(figure,ids,source,dancers,directions,continuity)):figure.kind==='allemande'&&context.next?.kind==='promenade'?prepareAllemandePromenadeExit(figure,context,planFigure(figure,ids,source,dancers,directions,continuity)):planFigure(figure,ids,source,dancers,directions,continuity);};if(!stateSequencing)return{adapterId:`established:${figure.kind}`,plan:established(),ownsEntryFacing:false};const incoming=captureSequenceBoundary(context,segStart,previousRaw.filter(c=>ids.includes(c.a)||ids.includes(c.b)));incomingStates.push(incoming);return compileSequenceStep(figure,context,incoming,established,capabilities);});
    const plans=planResults.map(r=>r.plan);
    const poseAt=(t:number)=>{
      const poses=source.map(clone);
      for(let gi=0;gi<groups.length;gi++)for(const id of groups[gi]){
        const plan=plans[gi],inactive=planResults[gi].adapterId==='active-ones-swing'&&(plan as ActiveOnesSwingPlan).inactivePair.includes(id),pos=plan.position(id,t),before=plan.position(id,Math.max(0,t-.002)),after=plan.position(id,Math.min(1,t+.002));
        const dist=len(sub(after,before)),walking=clamp(dist/(.004*figure.beats)*2.5,0,1);
        let yaw=plan.facing(id,t,poses);
        if(figure.progression&&planResults[gi].adapterId!=='active-ones-swing'&&figure.exit!=='progressed-neighbors'&&figure.kind!=='california-twirl'&&t>.85)yaw=angleMix(yaw,directions[dancers[id].couple]===1?0:Math.PI,smooth((t-.85)/.15));
        if(t<.12&&!planResults[gi].ownsEntryFacing&&!continuity.swingEntry&&!['square-through','pull-by','revolving-door','cross-trails','give-and-take','box-the-gnat','hey','ricochet-hey','pass-through','california-twirl','petronella','ring-balance','gyre'].includes(figure.kind))yaw=angleMix(source[id].yaw,yaw,smooth(t/.12));
        poses[id]={id,position:pos,yaw,stride:walking,lean:inactive?0:figure.kind==='swing'?.1:figure.kind==='balance'?.07*Math.sin(t*TAU):.03*walking,bounce:Math.sin((segStart+t*figure.beats)*Math.PI*2)*.018*walking,turn:!inactive&&figure.kind==='swing'?1:0,activity:inactive?'waiting':figure.kind,...(plan.revolvingDoorPreparation?{revolvingDoorPreparation:plan.revolvingDoorPreparation(id,t)}:{}),chainCourtesyPreparation:plan.chainCourtesyPreparation?.(id,t),swingPreparation:plan.swingPreparation?.(id,t),balance:plan.balance?.(id,t)??makeBalanceCue(figure,id,groups[gi],dancers,t),arch:plan.arch?.(id,t)};
      }
      for(const couple of waiting){const elapsed=segStart+t*figure.beats,a=initial[couple*2].position,b=initial[couple*2+1].position,center=mix(a,b,.5),phase=smooth((elapsed-4)/8);
        for(const id of [couple*2,couple*2+1]){const orig=initial[id];const radial=sub(orig.position,center);const pos=add(center,rotate(radial,Math.PI*phase));pos.z+=Math.sin(phase*Math.PI)*directions[couple]*.5;
          poses[id]={...orig,position:pos,yaw:angleMix(orig.yaw,orig.yaw+Math.PI,phase),stride:phase>0&&phase<1?.55:0,bounce:0,activity:'waiting',...(orig.revolvingDoorPreparation?{revolvingDoorPreparation:undefined}:{}),chainCourtesyPreparation:undefined,swingPreparation:undefined,balance:undefined,arch:undefined};}
      }
      return poses;
    };
    const rawContactsAt=(t:number,poses:Pose[])=>plans.flatMap(p=>p.contacts(t,poses));
    const contactsAt=(t:number,poses:Pose[])=>rawContactsAt(t,poses).map(c=>{if(['robins-chain','ladies-chain'].includes(figure.kind))return c;
      const reach=(id:number,hand:'left'|'right')=>{const p=poses[id],side=hand==='left'?1:-1;return Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-(1.355-(p.arch?.kneeLowering??0)),c.point.z-p.position.z+side*.235*Math.sin(p.yaw));};
      const distance=Math.max(reach(c.a,c.handA),c.target&&c.target!=='hands'?0:reach(c.b,c.handB));
      return {...c,strength:c.strength*smooth((.68-distance)/(c.kind==='swing-frame'||c.kind==='arch'?.035:.06))};
    }).filter(c=>c.strength>(['robins-chain','ladies-chain','revolving-door'].includes(figure.kind)||continuity.swingExit==='revolving-door'?0:.01));
    if(stateSequencing){const first=poseAt(0),last=poseAt(1),rawFirst=rawContactsAt(0,first),rawLast=rawContactsAt(1,last);for(let gi=0;gi<groups.length;gi++){const ids=groups[gi],context={ids,start:first,dancers,relations,bindingEpoch,next:dance.figures[figureIndex+1]},entry=captureSequenceBoundary(context,segStart,rawFirst.filter(c=>ids.includes(c.a)||ids.includes(c.b))),exit=captureSequenceBoundary({...context,start:last},segStart+figure.beats,rawLast.filter(c=>ids.includes(c.a)||ids.includes(c.b))),result=planResults[gi];
      // Established adapters retain their reviewed contact acquisition. Their
      // actual roots/identity/clock still pass the same shared handoff check.
      assertSequenceHandoff(result.boundaryPlan?incomingStates[gi]:{...incomingStates[gi],heldContacts:entry.heldContacts},entry);
      if(result.boundaryPlan)assertSequenceHandoff(result.boundaryPlan.exitState,exit);
      proofs.push({figureId:figure.id,adapterId:result.adapterId,contactPolicy:result.boundaryPlan?'strict-carried':'established-acquisition',incoming:incomingStates[gi],entry,exit,...(result.boundaryPlan?.exitPreparationWindow?{exitPreparationWindow:structuredClone(result.boundaryPlan.exitPreparationWindow)}:{}),...(result.adapterId==='active-ones-swing'?{currentRank:(result.plan as ActiveOnesSwingPlan).currentRank}:{})});}}
    segments.push({start,figure,poseAt,rawContactsAt,contactsAt});current=poseAt(1);start+=figure.beats;
  }
  for(const c of waiting)directions[c]*=-1;
  if(waiting.length)cycleWarnings.push(`Couple${waiting.length>1?'s':''} ${waiting.map(c=>c+1).join(' & ')} wait out, change sides, and re-enter next round.`);
  // End orientation is the next-neighbor direction, reached within the last figure, not a teleport.
  return {segments,end:current.map(clone),directions,warnings:cycleWarnings,...(stateSequencing?{sequenceState:{groups:groups.map(g=>[...g]),waitingIds:waiting.flatMap(c=>[c*2,c*2+1]),neighbor:[...neighbor].filter(([a,b])=>a<b),initial:initial.map(clone),end:current.map(clone),directions:[...initialDirections],proofs}}:{})};
}

export interface PrimitiveContinuity {balanceEntry?:'held-two-hand'|'held-right-hand';swingEntryGeometry?:'paired-radial-frame';revolvingDoorSupport?:boolean;geometry?:Readonly<{halfWidth:number;rowGap:number;allemandeRadius?:number}>;starRingEntry?:boolean;heldAllemandeExit?:boolean;sameRoleExit?:'larks'|'robins';canonicalSwingLayout?:boolean;pairedHeyExit?:'partner'|'neighbor';acrossExit?:boolean;swingExit?:'revolving-door'|'give-and-take'|'paired-promenade'|'partner-promenade'|'paired-ricochet';ringExit?:boolean;ringEntry?:boolean;balanceExit?:'same-person-swing'|'right-hand-arch';circleExit?:'partner'|'neighbor';swingEntry?:'two-hand-balance'|'prepared-circle';}
export function figureContinuity(figures:readonly Figure[],index:number):PrimitiveContinuity {
 const figure=figures[index],previous=figures[index-1],next=figures[index+1],beforePrevious=figures[index-2];
 const centralQuarter=(turn:Figure|undefined,follow:Figure|undefined)=>turn?.kind==='allemande'&&['partner','neighbor'].includes(turn.who??'')&&Number.isFinite(turn.amount)&&Math.abs(((turn.amount!%.5)+.5)%.5-.25)<1e-8&&follow?.kind==='allemande'&&['larks','robins'].includes(follow.who??'')&&turn.direction!==follow.direction;
 const revolvingDoorSupport=figure.kind==='swing'&&(next?.kind==='revolving-door'||previous?.kind==='revolving-door')||['circle','allemande'].includes(figure.kind)&&next?.kind==='swing'&&figures[index+2]?.kind==='revolving-door';
 const canonicalSwingLayout=figure.kind==='allemande'&&centralQuarter(previous,figure)&&next?.kind==='swing'&&next.who===previous?.who||figure.kind==='swing'&&centralQuarter(beforePrevious,previous)&&figure.who===beforePrevious?.who;
 return{...(revolvingDoorSupport?{revolvingDoorSupport:true}:{}),...(figure.kind==='swing'&&next?.kind==='revolving-door'&&next?.who===figure.who?{swingExit:'revolving-door' as const}:{}),...(centralQuarter(figure,next)?{heldAllemandeExit:true,sameRoleExit:next!.who as 'larks'|'robins'}:{}),...(canonicalSwingLayout?{canonicalSwingLayout:true}:{}),...(figure.kind==='swing'&&['partner','neighbor'].includes(figure.who??'')&&next?.kind==='give-and-take'&&next.entry==='side-couples'&&['partner','neighbor'].includes(next.who??'')&&next.who!==figure.who?{swingExit:'give-and-take' as const}:{}),...(figure.kind==='swing'&&next?.kind==='ricochet-hey'&&next.entry==='paired-sidelines'&&next.who===figure.who?{swingExit:'paired-ricochet' as const}:{}),...(figure.kind==='star'&&['petronella','ring-balance'].includes(previous?.kind??'')?{starRingEntry:true}:{}),...(figure.kind==='allemande'&&['partner','neighbor'].includes(figure.who??'')&&next?.kind==='hey'&&next.heyStartRole!==undefined&&next.entry==='paired-sidelines'&&next.who===figure.who?{pairedHeyExit:figure.who as 'partner'|'neighbor',acrossExit:true}:{}),...(figure.kind==='circle'&&(next?.kind==='right-left-through'||next?.entry==='paired-sidelines-facing-across')?{acrossExit:true}:{}),...(figure.kind==='circle'&&next?.kind==='ring-balance'?{ringExit:true}:{}),...(figure.kind==='swing'&&['partner','neighbor'].includes(figure.who??'')&&next?.kind==='promenade'&&next.who===figure.who?{swingExit:'paired-promenade' as const}:{}),...(figure.kind==='circle'&&previous?.kind==='hall-travel'?{ringEntry:true}:{}),...(figure.kind==='balance'&&next?.kind==='swing'&&next.who===figure.who?{balanceExit:'same-person-swing' as const}:figure.kind==='balance'&&figure.hands==='right'&&next?.kind==='box-the-gnat'&&next.who===figure.who?{balanceExit:'right-hand-arch' as const}:{}),...(figure.kind==='swing'&&previous?.kind==='balance'&&previous.who===figure.who?{swingEntry:'two-hand-balance' as const}:figure.kind==='swing'&&(previous?.kind==='revolving-door'&&previous?.who!==figure.who||previous?.kind==='circle'||previous?.kind==='pass-through'&&previous.exit==='opposite-paired-swing'||previous?.kind==='allemande'||previous?.kind==='box-the-gnat'&&previous.who===figure.who||previous?.kind==='ring-balance'&&previous.exit===`${figure.who}-swing`||previous?.kind==='gyre'&&previous.who===figure.who||previous?.kind==='give-and-take'&&previous.exit==='same-person-swing'&&previous.who===figure.who||previous?.kind==='ricochet-hey'&&previous.exit==='ricochet-paired-swing'&&previous.ricochetExitRelation===figure.who||previous?.kind==='hey'&&previous.who===figure.who&&(previous.exit==='opposite-paired-swing'||previous.amount===1&&previous.heyStartRole!==undefined&&previous.entry==='paired-sidelines'&&previous.exit==='same-person-swing'))?{swingEntry:'prepared-circle' as const}:{}),...((figure.kind==='circle'||figure.kind==='allemande')&&next?.kind==='swing'&&(next.who==='partner'||next.who==='neighbor')?{circleExit:next.who}:{})};
}
/** New composition geometry is independently gated, even when all of its figure names are established. */
export function assertCompositionCapabilities(figures:readonly Figure[],capabilities:MotionCapabilities):void {
 assertActiveSwingPreparationSequence(figures);
 for(const f of figures)if(f.kind==='do-si-do'&&(f.exit!==undefined||f.preparation!==undefined)){
  if(f.exit==='ring'){
   if(!capabilities.stateCarryingSequences||!capabilities.ringBalances)throw new Error('A do-si-do ring preparation needs its registered state-carrying ring boundary.');
   assertDosidoRingFigure(f);const next=figures[(figures.indexOf(f)+1)%figures.length];
   if(next?.kind!=='ring-balance'||next.beats!==4||next.who!=='all'||next.hands!=='both')throw new Error('A do-si-do ring preparation must immediately precede its declared ring balance.');
   continue;
  }
  if(!capabilities.stateCarryingSequences||!capabilities.stateCarryingNeighborDosidos)throw new Error('A progressing neighbor do-si-do requires its registered state-carrying boundary.');
  assertNeighborDosidoFigure(f);
  if(f!==figures.at(-1))throw new Error('This progressing neighbor do-si-do must hand its old-neighbor exchange to the terminal event.');
  const first=figures[0],next=figures[1],openingStance=first?.kind==='balance'&&['partner','neighbor'].includes(first.who??'')&&next?.who===first.who&&(next.kind==='swing'&&first.hands===undefined||next.kind==='box-the-gnat'&&first.hands==='right');
  if(openingStance&&f.preparation===undefined)throw new Error('A terminal neighbor do-si-do before a balance requires its explicit released next-neighbor-balance preparation.');
 }

 for(const f of figures)if(f.kind==='rollaway'){if(!capabilities.stateCarryingSequences||!capabilities.stateCarryingRollaways)throw new Error('A standalone rollaway requires its registered actual-state exchange boundary.');assertStandaloneRollawayFigure(f);}
 for(const f of figures)if(f.kind==='couples-do-si-do'){if(!capabilities.stateCarryingSequences||!capabilities.stateCarryingCouplesDosidos)throw new Error('A couples do-si-do requires its registered carried partner-unit boundary.');assertCoupledDosidoFigure(f);}
 for(const f of figures)if(f.who==='ones'){if(!capabilities.stateCarryingSequences||!capabilities.stateCarryingActiveSwings)throw new Error('A current-ones swing requires its registered rank-carrying sequence boundary.');assertActiveOnesSwingFigure(f);}
 if(figures.some(f=>f.kind==='hey'&&f.heyStartRole!==undefined&&f.exit==='opposite-paired-gyre')&&!capabilities.ordinaryHalfHeyGyreExits)throw new Error('A role-first half-hey gyre exit requires its separately registered released-pair boundary.');
 if(figures.some(f=>f.kind==='do-si-do'&&['larks','robins'].includes(f.who??'')&&f.amount===1.5)&&(!capabilities.stateCarryingSequences||!capabilities.stateCarryingRoleDosidos))throw new Error('A same-role one-and-a-half do-si-do requires its registered state-carrying station exchange.');
 if(figures.some(f=>f.kind==='hey'&&f.exit==='same-slots-facing-across')&&(!capabilities.stateCarryingSequences||!capabilities.stateCarryingFullHeys||!capabilities.ordinaryFullHeys))throw new Error('A neutral full-hey return requires its registered state-carrying same-station boundary.');
 for(const f of figures)if(f.kind==='box-the-gnat'&&(f.entry!==undefined||f.exit!==undefined)){if(!capabilities.stateCarryingSequences||!capabilities.stateCarryingArchPullBys||!capabilities.archExchanges||!capabilities.namedPullBys)throw new Error('A bare arch and role pull-by require their registered state-carrying boundary.');assertBareArchFigure(f);}
 if(capabilities.stateCarryingSequences&&figures.some((f,i)=>f.kind==='pull-by'&&['larks','robins'].includes(f.who??'')&&f.exit===undefined&&figures[i+1]?.kind==='swing')&&!capabilities.stateCarryingArchPullBys)throw new Error('A state-carried same-role pull-by into a swing requires its registered boundary.');
 if(capabilities.stateCarryingSequences&&figures.some(f=>f.kind==='mad-robin')&&!capabilities.stateCarryingMadRobins)throw new Error('State-carried mad robins require their registered actual-state boundary.');
 for(const f of figures)if(f.kind==='circle'&&(f.phaseBeats!==undefined||f.turnToward!==undefined||f.exit!==undefined)){if(!capabilities.stateCarryingSequences||!capabilities.orderedCircleExits)throw new Error('Ordered circle completion requires its state-carried completion and facing adapter.');assertOrderedCircleFigure(f);}
 if(figures.some(f=>f.kind==='mad-robin')&&!capabilities.madRobins)throw new Error('Mad robins require their separately reviewed named-orbit and partner-facing adapter.');
 if(figures.some(f=>f.kind==='star-promenade'||f.kind==='butterfly-whirl')&&!capabilities.starPromenadeWhirls)throw new Error('Star promenades and butterfly whirls require their separately reviewed carried-turn adapter.');
 if(figures.some(f=>f.kind==='square-through')){if(!capabilities.squareThroughs||!capabilities.namedPullBys)throw new Error('Square-through requires its separately reviewed named-hand composition and source-bound terminal event.');if(capabilities.stateCarryingSequences){for(const f of figures.filter(f=>f.kind==='square-through'))assertSquareThroughStepFigure(f);}else assertSquareThroughComposition(figures);}
 for(const figure of figures)if(figure.heyStartPair!==undefined){if(!capabilities.partnerFirstHalfHeys||!capabilities.ordinaryHalfHeys)throw new Error('Partner-first half heys require their separately reviewed pair-first formation handoff and ordinary half-hey capability.');assertPartnerFirstHalfHeyDeclaration(figure);}
 if(figures.some(f=>f.kind==='hey'&&f.amount===1&&f.heyStartRole!==undefined&&['same-slots-partner-balance','same-slots-neighbor-balance','same-person-swing'].includes(f.exit??''))&&!capabilities.ordinaryHeyHandoffs)throw new Error('An ordinary full-hey continuation requires its separately reviewed named formation handoff.');
 if(figures.some(f=>f.kind==='pull-by')&&!capabilities.namedPullBys)throw new Error('Named pull-bys require their separately reviewed named-hand passage and continuation adapter.');
 if(figures.some(f=>f.kind==='pull-by'&&(f.exit==='progressed-neighbors'||f.progression))){if(!capabilities.terminalNamedPullBys)throw new Error('A terminal named pull-by requires its separately reviewed source-marked endpoint and finite return adapter.');assertTerminalNamedPullByComposition(figures);}
 if(figures.some((f,i)=>f.kind==='allemande'&&figures[i+1]?.kind==='promenade')&&!capabilities.allemandePromenadeHandoffs)throw new Error('An allemande-to-promenade handoff requires its separately reviewed same-person adapter.');
 if(figures.some((f,i)=>f.kind==='swing'&&figures[i+1]?.kind==='ring-balance'||f.kind==='petronella'&&figures[i+1]?.kind==='balance')&&!capabilities.ringPairHandoffs)throw new Error('Ring and named-pair handoffs require their separately reviewed source-counted adapter.');
 if(figures.some(f=>f.kind==='revolving-door')){if(!capabilities.revolvingDoors)throw new Error('Revolving doors require their separately reviewed carried-turn and neighboring-swing adapter.');assertRevolvingDoorComposition(figures);}
 if(capabilities.stateCarryingSequences&&figures.some(f=>f.entry==='circle-exit'&&f.passingShoulder==='right')&&!capabilities.stateCarryingSixTwoPasses)throw new Error('A measured circle-six/pass-two boundary requires its registered state-carrying adapter.');
 if(capabilities.stateCarryingSequences&&figures.some(f=>f.entry==='circle-exit'&&f.passingShoulder==='left')&&!capabilities.stateCarryingMirroredSixTwoPasses)throw new Error('A measured right-circle/left-pass boundary requires its registered state-carrying adapter.');
 if(figures.some(f=>f.entry==='circle-exit')&&!capabilities.sixTwoPasses)throw new Error('A two-count circle-exit pass requires its separately reviewed six-plus-two adapter.');
 if(figures.some(f=>f.heyAxis!==undefined)&&!capabilities.diagonalHalfHeys)throw new Error('Axis-declared half heys require their separately reviewed diagonal grouping adapter.');
 if(figures.some(f=>f.kind==='cross-trails')&&!capabilities.crossTrails)throw new Error('Cross trails requires its separately reviewed two-passage adapter.');
 if(figures[0]?.kind==='swing'&&(!capabilities.swingStartSequences||figures[0].entry!=='closed-neighbor-frame'))throw new Error('A bare opening swing requires a separately reviewed initial closed frame and physical repeat-end approach before its first swing count.');
 if(figures.some(f=>f.kind==='allemande'&&f.phaseBeats!==undefined)&&(!capabilities.rorySlides||figures[0]?.kind!=='form-short-wave'))throw new Error('An explicitly subdivided allemande requires its dedicated reviewed wave-turn composition.');
 if(!capabilities.archSwingExits&&figures.some((figure,index)=>figure.kind==='box-the-gnat'&&figures[index+1]?.kind==='swing'))throw new Error('An arch-to-swing handoff requires a separately reviewed prepared-frame adapter before its first swing count.');
 if(!capabilities.heldQuarterAllemandes&&figures.some((_,index)=>figureContinuity(figures,index).heldAllemandeExit))throw new Error('Held quarter-ending allemande compositions require their separately reviewed precursor adapter.');
}
/** Styling cues only: these are not measured forces or a recommendation to hang. */
export function makeBalanceCue(figure:Figure,id:number,ids:readonly number[],dancers:readonly Dancer[],progress:number):BalanceCue|undefined {
 if(figure.kind!=='balance'||!['partner','neighbor'].includes(figure.who??''))return undefined;
 const otherId=ids.find(other=>dancers[other].role!==dancers[id].role&&(figure.who==='partner'?dancers[other].couple===dancers[id].couple:dancers[other].couple!==dancers[id].couple));
 if(otherId===undefined)return undefined;
 const bell=(start:number,end:number)=>progress<=start||progress>=end?0:Math.sin(Math.PI*(progress-start)/(end-start))**2;
 return{otherId,progress,forwardWeight:bell(.04,.76),counterWeight:bell(.50,1)*(figure.hands==='right'?.5:1),midpointPulse:bell(.44,.56)};
}

type Plan=MotionPlan;
function planFigure(f:Figure,ids:number[],start:Pose[],dancers:Dancer[],directions:number[],continuity:PrimitiveContinuity={}):Plan{
  const points=ids.map(i=>start[i].position),center=mean(points),extentX=Math.max(continuity.geometry?.halfWidth??HALF_WIDTH,...points.map(p=>Math.abs(p.x-center.x))),extentZ=(continuity.geometry?.rowGap??ROW_GAP)/2;
  const partners=ids.filter(i=>dancers[i].role==='lark').map(i=>[i,ids.find(j=>dancers[j].role==='robin'&&dancers[j].couple===dancers[i].couple)!]);
  const larks=ids.filter(i=>dancers[i].role==='lark'),robins=ids.filter(i=>dancers[i].role==='robin');
  const neighborPairs=larks.map(i=>[i,robins.find(j=>dancers[j].couple!==dancers[i].couple)!]);
  const pairs=f.who==='partner'?partners:f.who==='larks'?[larks]:f.who==='robins'?[robins]:neighborPairs;
  const pairFor=(id:number)=>pairs.find(p=>p.includes(id));
  const pairCenter=(pair:number[])=>mean(pair.map(i=>start[i].position));
  let position:Plan['position']=(id,_t)=>start[id].position;
  let facing:Plan['facing']=(id,t)=>{const p=position(id,t),q=pairFor(id);return q?angle(p,position(q.find(j=>j!==id)!,t)):angle(p,center);};
  const contactPairs:Array<{a:number;b:number;handA:'left'|'right';handB:'left'|'right';kind:'joined'|'swing-frame'|'courtesy'}>=[];
  let contactStrength=(t:number)=>smooth(t/.12)*smooth((1-t)/.12);
  const swingProgress=(t:number)=>{
    if(!continuity.swingEntry)return smooth((t-.14)/.86);
    // A fraction-of-figure lead made long swings wait almost two counts. Start
    // turning on the first count with a fixed .15-beat acceleration instead.
    const a=.15/f.beats,b=Math.min(2.5,f.beats*.3)/f.beats,n=1-(a+b)/2,q=clamp(t);
    if(q<a){const u=q/a;return a*(u*u*u-.5*u*u*u*u)/n;}
    if(q>1-b){const u=(1-q)/b;return 1-b*(u*u*u-.5*u*u*u*u)/n;}
    return(q-a/2)/n;
  };
  const pairOrbit=(id:number,t:number,turns:number,radius:number,exit:Vec2)=>{
    const pair=pairFor(id);if(!pair)return start[id].position;const c=pairCenter(pair),p=start[id].position,v=sub(p,c),theta=Math.atan2(v.z,v.x);
    const lead=continuity.swingEntry?0:.14;
    if(t<lead)return mix(p,add(c,{x:Math.cos(theta)*radius,z:Math.sin(theta)*radius}),smooth(t/lead));
    const exitVector=sub(exit,c),exitAngle=Math.atan2(exitVector.z,exitVector.x),offset=positiveTurn(exitAngle-theta);
    const net=TAU*Math.max(1,Math.floor(turns))+offset,a=theta+net*swingProgress(t);
    const release=.18;
    const r=radius+(len(exitVector)-radius)*smooth((t-(1-release))/release);
    return add(c,{x:Math.cos(a)*r,z:Math.sin(a)*r});
  };
  switch(f.kind){
    case 'balance':{
      const arch=continuity.balanceExit==='right-hand-arch';
      position=(id,t)=>{const pair=pairFor(id),c=pair?pairCenter(pair):center;if(!continuity.balanceExit)return mix(start[id].position,c,.35*Math.sin(Math.PI*t)+.09*Math.sin(t*TAU));const spacing=pair?len(sub(start[pair[0]].position,start[pair[1]].position)):1.8,out=arch?1.10:1.18,target=t<=.5?spacing+(.92-spacing)*smooth(t/.5):t<=.75?.92+(out-.92)*smooth((t-.5)/.25):arch?out:1.18-.56*smooth((t-.8125)/.1875);return mix(start[id].position,c,Math.max(0,1-target/spacing));};
      if(continuity.balanceExit){contactStrength=t=>continuity.balanceEntry?1:smooth(t/.12);facing=(id,t)=>{const pair=pairFor(id);return (pair?angle(position(id,t),position(pair.find(j=>j!==id)!,t)):start[id].yaw)+(arch?0:Math.PI/3*smooth((t-.8125)/.1875));};}
      for(const[a,b]of pairs){if(f.hands==='right')contactPairs.push({a,b,handA:'right',handB:'right',kind:'joined'});else contactPairs.push({a,b,handA:'right',handB:'left',kind:'joined'},{a,b,handA:'left',handB:'right',kind:'joined'});}break;}
    case 'swing':position=(id,t)=>{const pair=pairFor(id);if(!pair)return start[id].position;const c=pairCenter(pair);let side=Math.sign(c.x-center.x);if(!side)side=pair===pairs[0]?1:-1;const exit={x:center.x+side*(continuity.canonicalSwingLayout?(continuity.geometry?.halfWidth??HALF_WIDTH):extentX),z:center.z+(dancers[id].role==='lark'?side:-side)*(['revolving-door','paired-promenade','partner-promenade'].includes(continuity.swingExit??'')?.34:continuity.swingExit==='paired-ricochet'?.55:continuity.swingExit==='give-and-take'?.45:extentZ)};return pairOrbit(id,t,Math.max(1,f.beats/4-.5),.31,exit);};
      facing=(id,t)=>{const pair=pairFor(id);if(!pair)return start[id].yaw;const c=pairCenter(pair),radial=sub(start[id].position,c),theta=Math.atan2(radial.z,radial.x),end=sub(position(id,1),c),exitAngle=Math.atan2(end.z,end.x),offset=positiveTurn(exitAngle-theta),net=TAU*Math.max(1,Math.floor(Math.max(1,f.beats/4-.5)))+offset;
        // Keep the winding number through release; shortest-angle branches can flip mid-swing.
        const frameAngle=Math.PI/3,body=-theta-net*swingProgress(t)-Math.PI/2+frameAngle,endBody=-theta-net-Math.PI/2+frameAngle,exitBase=f.exit==='face-down-line'?0:c.x>center.x?-Math.PI/2:Math.PI/2,exit=endBody+Math.atan2(Math.sin(exitBase-endBody),Math.cos(exitBase-endBody));
        return t>.84?body+(exit-body)*smooth((t-.84)/.16):body;};
      for(const [a,b] of pairs){contactPairs.push({a,b,handA:'left',handB:'right',kind:'swing-frame'},{a,b,handA:'right',handB:'left',kind:'swing-frame'});}contactStrength=t=>(continuity.swingEntry?1:smooth(t/.2))*(continuity.swingExit==='revolving-door'?1:smooth((.93-t)/.14));break;
    case 'circle':case 'star':{
      if(f.kind==='circle'&&(continuity.ringEntry||continuity.ringExit))contactStrength=t=>(continuity.ringEntry?1:smooth(t/.12))*(continuity.ringExit?1:smooth((1-t)/.12));
      const sign=f.direction==='right'?-1:1;const direction=f.kind==='star'?-sign:sign;const amount=f.amount??1;
      position=(id,t)=>{const radial=sub(start[id].position,center);let radius=f.kind==='star'?1-.36*Math.min(smooth(t/.18),smooth((1-t)/.18)):1-.32*Math.min(smooth(t/.16),smooth((1-t)/.16));if(f.kind==='star'&&continuity.starRingEntry){radius=1+(.63/len(radial)-1)*smooth(t/.18);radius+=(.9/Math.max(Math.abs(radial.x),Math.abs(radial.z))-radius)*smooth((t-.8125)/.1875);}if(f.kind==='circle'&&continuity.ringExit)radius+=(.55/Math.max(...points.map(p=>Math.max(Math.abs(p.x-center.x),Math.abs(p.z-center.z))))-radius)*smooth((t-.75)/.25);return add(center,rotate(mul(radial,radius),direction*TAU*amount*steadyProgress(f.kind==='star'&&continuity.starRingEntry?Math.min(1,t/.8125):t)));};
      facing=(id,t)=>{const p=position(id,t);let yaw=f.kind==='circle'?angle(p,center):angle(p,add(p,rotate(sub(p,center),direction*Math.PI/2)));if(f.progression&&t>.85){const d=directions[dancers[id].couple];const target=d===1?0:Math.PI;yaw=angleMix(yaw,target,smooth((t-.85)/.15));}return yaw;};
      const ordered=[...ids].sort((a,b)=>Math.atan2(start[a].position.z-center.z,start[a].position.x-center.x)-Math.atan2(start[b].position.z-center.z,start[b].position.x-center.x));
      if(f.kind==='star'){for(let i=0;i<2;i++)contactPairs.push({a:ordered[i],b:ordered[i+2],handA:f.direction??'left',handB:f.direction??'left',kind:'joined'});}else{for(let i=0;i<4;i++)contactPairs.push({a:ordered[i],b:ordered[(i+1)%4],handA:'left',handB:'right',kind:'joined'});}
      break;}
    case 'do-si-do':position=(id,t)=>{const pair=pairFor(id);if(!pair)return start[id].position;const other=pair.find(j=>j!==id)!,v=sub(start[other].position,start[id].position),forward=mul(v,1/Math.max(.1,len(v))),right=rotate(forward,-Math.PI/2),advance=(1-Math.cos(t*TAU))*.5,side=Math.sin(t*TAU)*.34;return add(start[id].position,add(mul(v,advance),mul(right,side)));};facing=(id)=>{const pair=pairFor(id);return pair?angle(start[id].position,start[pair.find(j=>j!==id)!].position):start[id].yaw;};break;
    case 'allemande':{
      const turns=f.amount??1.5,sign=f.direction==='left'?-1:1,holdRadius=continuity.geometry?.allemandeRadius??.55;
      position=(id,t)=>{const pair=pairFor(id);if(!pair)return start[id].position;const c=pairCenter(pair),p=start[id].position;const v=sub(p,c),r=len(v),gather=1-(1-holdRadius/Math.max(holdRadius,r))*((continuity.circleExit||continuity.pairedHeyExit||continuity.heldAllemandeExit)?smooth(t/.17):Math.min(smooth(t/.17),smooth((1-t)/.17)));return add(c,rotate(mul(v,gather),TAU*turns*sign*steadyProgress(t)));};
      for(const [a,b] of pairs)contactPairs.push({a,b,handA:f.direction??'right',handB:f.direction??'right',kind:'joined'});break;}
    case 'long-lines':position=(id,t)=>{const p=start[id].position;return {x:p.x-Math.sign(p.x-center.x)*.52*Math.sin(Math.PI*t),z:p.z};};facing=(id,t)=>angle(position(id,t),{x:center.x,z:position(id,t).z});break;
    default: throw new Error(`No primitive trajectory is registered for ${f.kind}.`);
  }
  // A circle flowing into a swing prepares the named pair during its last
  // three-quarter count. The source circle reaches its actual corner targets;
  // body-root offsets close the frame there without changing identities.
  let circleSwing:Plan|undefined;
  const preparationBeats=f.kind==='allemande'?1:.75;
  const circlePrepare=(t:number)=>smooth((t-(1-preparationBeats/f.beats))/(preparationBeats/f.beats));
  if((f.kind==='circle'||f.kind==='allemande')&&continuity.circleExit){
    const followingPairs=continuity.circleExit==='partner'?partners:neighborPairs;
    const terminal=start.map(clone);for(const id of ids){const pair=pairFor(id);terminal[id].position=f.kind==='allemande'&&pair?add(pairCenter(pair),rotate(sub(start[id].position,pairCenter(pair)),TAU*(f.amount??1.5)*(f.direction==='left'?-1:1))):position(id,1);}
    for(const pair of followingPairs){const oldCenter=mean(pair.map(id=>terminal[id].position)),c={x:center.x+Math.sign(oldCenter.x-center.x)*(continuity.canonicalSwingLayout?(continuity.geometry?.halfWidth??HALF_WIDTH):extentX),z:oldCenter.z};for(const id of pair){const v=sub(terminal[id].position,oldCenter);if(!Number.isFinite(len(v))||len(v)<1e-8)throw new Error('The literal turn ends in a degenerate named swing frame; this entry needs a separately modeled physical handoff.');terminal[id].position=add(c,mul(v,.31/len(v)));terminal[id].yaw=angle(terminal[id].position,c)+Math.PI/3;}}
    circleSwing=planFigure({id:'prepared-swing',kind:'swing',beats:8,label:'Prepared swing',who:continuity.circleExit},ids,terminal,dancers,directions,{swingEntry:'prepared-circle',geometry:continuity.geometry,...(continuity.revolvingDoorSupport?{revolvingDoorSupport:true}:{})});
    const rawPosition=position,rawFacing=facing,first=1-preparationBeats/f.beats;
    position=(id,t)=>mix(rawPosition(id,t),terminal[id].position,circlePrepare(t));
    facing=(id,t,poses)=>{if(t<=first)return rawFacing(id,t,poses);const initial=rawFacing(id,first,poses),current=initial+Math.atan2(Math.sin(rawFacing(id,t,poses)-initial),Math.cos(rawFacing(id,t,poses)-initial)),target=initial+Math.atan2(Math.sin(terminal[id].yaw-initial),Math.cos(terminal[id].yaw-initial));return current+(target-current)*circlePrepare(t);};
  }
  // Prepare the upcoming same-role partner before the opposite hand acquires.
  // This changes facing only during the existing final count: the named turn,
  // held radius, root winding, source duration and contact schedule are untouched.
  if(continuity.sameRoleExit){
    const natural=facing,onset=Math.max(0,1-1/f.beats),active=continuity.sameRoleExit==='larks'?larks:robins;
    facing=(id,t,poses)=>{if(t<=onset||!active.includes(id))return natural(id,t,poses);const other=active.find(j=>j!==id)!,base=natural(id,onset,poses),current=base+Math.atan2(Math.sin(natural(id,t,poses)-base),Math.cos(natural(id,t,poses)-base)),target=angle(position(id,1),position(other,1)),end=base+Math.atan2(Math.sin(target-base),Math.cos(target-base));return current+(end-current)*smooth((t-onset)/(1-onset));};
  }
  if(continuity.acrossExit){const natural=facing,onset=Math.max(0,1-1/f.beats);facing=(id,t,poses)=>{const base=natural(id,onset,poses),current=base+Math.atan2(Math.sin(natural(id,t,poses)-base),Math.cos(natural(id,t,poses)-base));if(t<=onset)return natural(id,t,poses);const p=position(id,1),target=p.x>center.x?-Math.PI/2:Math.PI/2,end=base+Math.atan2(Math.sin(target-base),Math.cos(target-base));return current+(end-current)*smooth((t-onset)/(1-onset));};}
  const contacts=(t:number,poses:Pose[]):HandContact[]=>{
    if(f.kind==='star'&&f.starGrip!==undefined)return starGrips(ids.map(id=>poses[id]),f.direction!,f.starGrip,contactStrength(t));
    const preparation=circleSwing?circlePrepare(t):0;
    if(circleSwing&&preparation>=.5)return circleSwing.contacts(0,poses).map(c=>({...c,strength:c.strength*smooth((preparation-.5)/.5)})).filter(c=>c.strength>.01);
    const strength=contactStrength(t)*(circleSwing?1-smooth(preparation/.5):1);if(strength<.01)return[];
    if(f.kind==='swing'||continuity.balanceExit==='same-person-swing'&&t>=.8125)return pairs.flatMap(pair=>{
      const a=pair.find(i=>dancers[i].role==='lark')!,b=pair.find(i=>dancers[i].role==='robin')!;if(a===undefined||b===undefined)return[];
      // Retain the previously reviewed frame until reciprocal blade support
      // clears actual arm/torso geometry review. The user's requested reciprocal
      // variant remains an explicit open styling task, not an enabled claim.
      const pa=poses[a],pb=poses[b],mid=mix(pa.position,pb.position,.5),v=sub(pb.position,pa.position),joined=add(mid,mul(rotate(v,-Math.PI/2),.25));
      const doorExit=continuity.swingExit==='revolving-door',lower=doorExit?smooth((t-.875)/.125):0;const back={x:pb.position.x-Math.sin(pb.yaw)*.13+Math.cos(pb.yaw)*.13,y:1.28-.10*lower,z:pb.position.z-Math.cos(pb.yaw)*.13-Math.sin(pb.yaw)*.13};
      const shoulder={x:pa.position.x-Math.cos(pa.yaw)*.23,y:1.33,z:pa.position.z+Math.sin(pa.yaw)*.23};
      const sourceMid=mix(start[a].position,start[b].position,.5),sourceYaw=start[a].yaw,held=(sign:number)=>({x:sourceMid.x+sign*.22*Math.cos(sourceYaw),y:1.24,z:sourceMid.z-sign*.22*Math.sin(sourceYaw)}),handoff=continuity.balanceExit?smooth((t-.8125)/.1875):continuity.swingEntry?1:smooth(t/.16);
      const transition=(from:ReturnType<typeof held>,to:{x:number;y:number;z:number},owner?:Pose,hand?:'left'|'right')=>{
        if(!continuity.swingEntry&&!continuity.balanceExit)return to;
        const point={...mix(from,to,handoff),y:from.y+(to.y-from.y)*handoff};
        // A supporting hand travels through a bent-elbow offer as it leaves the
        // two-hand balance. The C1 bow keeps the entire transfer within reach,
        // then lands exactly on the counterpart's blade. Leading hands stay joined.
        if(owner&&hand){const sign=hand==='left'?1:-1,shoulder={x:owner.position.x+sign*.235*Math.cos(owner.yaw),y:1.355,z:owner.position.z-sign*.235*Math.sin(owner.yaw)},bow=.48*Math.sin(Math.PI*handoff)**1.2;return{...mix(point,shoulder,bow),y:point.y+(shoulder.y-point.y)*bow};}
        return point;
      };
      return [
        {a,b,handA:'left' as const,handB:'right' as const,point:transition(held(1),{...joined,y:1.31}),strength:strength*(doorExit?smooth((.93-t)/.14):1),kind:'swing-frame' as const,target:'hands' as const},
        {a,b,handA:'right' as const,handB:'left' as const,point:transition(held(-1),back,pa,'right'),strength,kind:'swing-frame' as const,target:doorExit&&lower>0?'waist' as const:'back' as const,bodyPoint:{x:.13,y:1.28-.10*lower,z:-.13},bodyBlend:continuity.swingEntry||continuity.balanceExit?handoff*(1-.48*Math.sin(Math.PI*handoff)**1.2):1},
        {a:b,b:a,handA:'left' as const,handB:'right' as const,point:transition(held(-1),shoulder,pb,'left'),strength,kind:'swing-frame' as const,target:'upper-arm' as const,...(continuity.revolvingDoorSupport?{bodyPoint:{x:-.23,y:1.33,z:0}}:{})}
      ];
    });
    return contactPairs.map(c=>{
      const a=poses[c.a],b=poses[c.b],mid=mix(a.position,b.position,.5);
      let p=mid,y=f.kind==='star'?1.34:1.14;
      if(f.kind==='balance'){if(continuity.balanceExit)y=1.24;if(f.hands!=='right'){const s=c.handA==='left'?1:-1;p={x:mid.x+s*.22*Math.cos(a.yaw),z:mid.z-s*.22*Math.sin(a.yaw)};}}
      if(f.kind==='swing'){const v=sub(b.position,a.position),side=mul(rotate(v,-Math.PI/2),.24*(c.handA==='left'?1:-1));p=add(mid,side);y=c.handA==='left'?1.32:1.18;}
      if(f.kind==='star')p=mix(mid,center,.75);
      if(f.kind==='circle'&&continuity.ringExit){const sa={x:a.position.x+.235*Math.cos(a.yaw),z:a.position.z-.235*Math.sin(a.yaw)},sb={x:b.position.x-.235*Math.cos(b.yaw),z:b.position.z+.235*Math.sin(b.yaw)};p=mix(p,mix(sa,sb,.5),smooth((t-.75)/.25));}
      return {...c,point:{...p,y},strength};
    }).filter(c=>len(sub(poses[c.a].position,{x:c.point.x,z:c.point.z}))<1.18&&len(sub(poses[c.b].position,{x:c.point.x,z:c.point.z}))<1.18);
  };
  return {position,facing,contacts};
}

/** A checked primitive boundary for the next topology compiler. Chains use their own
 * explicit relationship adapter; unsupported figures cannot enter through this API. */
export function compilePrimitiveFigure(f:Figure,ids:number[],start:Pose[],dancers:Dancer[],directions:number[],continuity:PrimitiveContinuity={}):Plan {
  if(continuity.geometry&&(!Number.isFinite(continuity.geometry.halfWidth)||!Number.isFinite(continuity.geometry.rowGap)||continuity.geometry.halfWidth<.5||continuity.geometry.halfWidth>1.2||continuity.geometry.rowGap<1||continuity.geometry.rowGap>2.4))throw new Error('An explicit primitive geometry profile needs finite half-width0.5–1.2 and row-gap1.0–2.4.');
  if(continuity.geometry?.allemandeRadius!==undefined&&(!Number.isFinite(continuity.geometry.allemandeRadius)||continuity.geometry.allemandeRadius<.31||continuity.geometry.allemandeRadius>.65))throw new Error('An explicit allemande radius must be within0.31–0.65.');
  if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!Number.isInteger(id)||!start[id]||start[id].id!==id||!dancers[id]||dancers[id].id!==id||![start[id].position.x,start[id].position.z,start[id].yaw].every(Number.isFinite)))throw new Error('A primitive requires four stable identities and finite incoming poses.');
  if(!['balance','swing','circle','allemande','do-si-do','long-lines','star'].includes(f.kind))throw new Error(`No registered primitive adapter for ${f.kind}.`);
  if(continuity.balanceEntry!==undefined&&!(f.kind==='balance'&&(continuity.balanceEntry==='held-two-hand'&&continuity.balanceExit==='same-person-swing'&&f.hands===undefined||continuity.balanceEntry==='held-right-hand'&&continuity.balanceExit==='right-hand-arch'&&f.hands==='right')))throw new Error('Held two-hand entry requires an explicit paired balance-to-swing contract.');
  if(f.kind==='balance'&&f.beats!==4)throw new Error('This balance adapter requires four counts: two steps in and two steps out.');
  if(!Number.isFinite(f.beats)||f.beats<=0||f.beats>64)throw new Error('Figure beats must be finite, positive, and at most 64.');
  assertFigureArgumentsConsumed(f);
  if(f.underRole!==undefined||f.hands!==undefined&&!(f.kind==='balance'&&f.hands==='right'&&continuity.balanceExit==='right-hand-arch'))throw new Error('This primitive boundary requires an explicit right-hand balance-to-arch continuity contract.');
  if(f.confidence==='unsupported')throw new Error('The figure was explicitly marked unsupported.');
  if(f.kind==='circle'&&(f.phaseBeats!==undefined||f.turnToward!==undefined||f.exit!==undefined))throw new Error('An ordinary circle primitive cannot consume an ordered completion contract.');
  if(['circle','star'].includes(f.kind)){
    if(!['left','right'].includes(f.direction??'')||f.who!=='all'||!Number.isFinite(f.amount)||f.amount!<=0||f.amount!>4)throw new Error('Circle/star hand, amount, and all-four participants must be explicit.');
  }
  if(f.starGrip!==undefined&&!['hands-across','wrist-grip'].includes(f.starGrip))throw new Error('Unknown star grip variant.');
  if(f.kind==='allemande'&&(!['left','right'].includes(f.direction??'')||!Number.isFinite(f.amount)||f.amount!<=0||f.amount!>4||!['partner','neighbor','larks','robins'].includes(f.who??'')))throw new Error('An allemande needs explicit hand, amount, and participants.');
  const roleDosido=f.kind==='do-si-do'&&['larks','robins'].includes(f.who??'');
  if(['balance','swing','do-si-do'].includes(f.kind)&&!roleDosido&&f.who!=='partner'&&f.who!=='neighbor')throw new Error('This figure needs a bound partner or neighbor.');
  if(roleDosido&&(ids.filter(id=>dancers[id].role==='lark').length!==2||ids.filter(id=>dancers[id].role==='robin').length!==2))throw new Error('A complete same-role do-si-do requires exactly two named actors and two opposite-role spectators.');
  if(f.kind==='do-si-do'&&(f.amount!==1||f.direction!=='right'||f.exit!==undefined||f.preparation!==undefined))throw new Error('Only explicit complete right-shoulder do-si-dos are registered.');
  if(f.kind==='allemande'&&f.phaseBeats!==undefined)throw new Error('Ordinary allemandes do not consume a source-time subdivision; use the dedicated wave-turn adapter.');
  if(f.inwardRole!==undefined||f.outwardRole!==undefined||f.entry!==undefined||f.kind==='allemande'&&f.exit!==undefined)throw new Error('A short-wave entry or exit requires its dedicated wave transition adapter.');
  if(f.kind==='swing'&&f.exit!==undefined&&f.exit!=='face-down-line')throw new Error('This swing exit has no registered preparation contract.');
  if(continuity.swingEntryGeometry!==undefined&&(continuity.swingEntryGeometry!=='paired-radial-frame'||f.kind!=='swing'||continuity.swingEntry!=='two-hand-balance'||continuity.canonicalSwingLayout!==true||!continuity.geometry||continuity.geometry.rowGap!==1.8))throw new Error('A radial swing entry requires its explicit held-frame, measured geometry and ordinary exit contract.');
  if(f.kind==='swing'){
    const groupCenter=ids.reduce((sum,id)=>sum+start[id].position.x,0)/ids.length,centerZ=ids.reduce((sum,id)=>sum+start[id].position.z,0)/ids.length;
    for(const id of ids.filter(id=>dancers[id].role==='lark')){const other=ids.find(j=>dancers[j].role==='robin'&&(f.who==='partner'?dancers[j].couple===dancers[id].couple:dancers[j].couple!==dancers[id].couple));
      if(continuity.swingEntryGeometry==='paired-radial-frame'){
        if(other===undefined)throw new Error('A radial swing requires complete named pairs.');
        const a=start[id],b=start[other],c={x:(a.position.x+b.position.x)/2,z:(a.position.z+b.position.z)/2};
        if(Math.abs(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)-.62)>1e-7||Math.abs(c.z-centerZ)>1e-7||Math.abs(a.position.z-b.position.z)>1e-7||Math.abs(Math.abs(c.x-groupCenter)-continuity.geometry!.halfWidth)>1e-7)throw new Error('A radial swing must consume the actual .62 frame at its measured opposite sideline centers.');
        for(const p of[a,b]){const expected=Math.atan2(c.x-p.position.x,c.z-p.position.z)+Math.PI/3;if(Math.abs(Math.atan2(Math.sin(p.yaw-expected),Math.cos(p.yaw-expected)))>1e-7)throw new Error('A radial swing must retain the actual prepared frame facing.');}
      }else if(other===undefined||Math.abs(start[id].position.x-start[other].position.x)>.08||Math.abs(start[id].position.z-start[other].position.z)<.5||Math.sign(start[id].position.x-groupCenter)!==Math.sign(start[other].position.x-groupCenter))throw new Error('This swing adapter requires the named pair already together on a sideline.');
    }
  }
  if(f.kind==='long-lines'&&f.who!=='all')throw new Error('Long lines use the whole bound group.');
  if(['balance','swing','long-lines'].includes(f.kind)&&(f.direction!==undefined||f.amount!==undefined))throw new Error('This adapter does not consume direction or amount modifiers on that figure.');
  const owned=planFigure(structuredClone(f),[...ids],structuredClone(start),structuredClone(dancers),[...directions],structuredClone(continuity));
  return Object.freeze({...owned,position:(id:number,t:number)=>({...owned.position(id,t)})});
}

