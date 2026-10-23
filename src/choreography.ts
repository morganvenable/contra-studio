import {compileHallLinePolicyDance} from './hall-line-policy.ts';
import {compileImproperWavePolicyDance} from './improper-wave-policy.ts';
import {compileBecketWavePolicyDance} from './becket-wave-policy.ts';
import {compileBecketStateSequence} from './becket-state-sequence.ts';
import {compileInitialWavePolicyDance} from './initial-wave-policy.ts';
import {stateSequenceApplicability} from './sequence-admission.ts';
import {compileStateSequence} from './state-sequence.ts';
import {hasInteriorSequenceEvent,compilePhasedStateSequence} from './phased-state-sequence.ts';
import {compileStarWhirlImproper,type StarWhirlDance} from './star-promenade-whirl-sequence.ts';
import {compileMadRobinImproper,type MadRobinDance} from './mad-robin-sequence.ts';
import {compileRingTwirlImproper,type RingTwirlDance} from './ring-twirl-source-sequence.ts';
import {compileDiagonalHalfHeyBecket} from './diagonal-half-hey-becket.ts';
import {createOwnedProgramCache} from './owned-program-cache.ts';
import {compileSixTwoImproper,type SixTwoSourceDance} from './six-two-source-sequence.ts';
import {compileSwingStartImproper} from './swing-start-sequence.ts';
import {compileOvalImproper,type OvalSourceDance} from './global-promenade-source.ts';
import {compileRoryImproper} from './rory-source-sequence.ts';
import {compilePoussetteStartImproper} from './poussette-source-sequence.ts';
import {compileStarProgressingBecket} from './becket-star-progression.ts';
import {compileDoubleProgressionImproper} from './double-progression-improper.ts';
import {compileRingStartImproper} from './ring-source-sequence.ts';
import {assertProgressionMarkers} from './figure-semantics.ts';
import {compileLongWaveImproper} from './long-wave-source-sequence.ts';
import {compileShortWaveImproper} from './wave-source-sequence.ts';
import {compileDeferredImproper} from './deferred-improper.ts';
import {compileProgressingImproper} from './progressing-improper.ts';
import {compileHalfHeyProgressingBecket} from './half-hey-progression.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {CompiledDance, Dance, Frame, MotionCapabilities} from './types.ts';
import {compileDance,assertCompositionCapabilities} from './engine.ts';
import {withBalanceStance} from './stance.ts';
import {createBecketState, type BecketState} from './becket.ts';
import {compileBecketSection, type CompiledSection, type SectionSpec} from './becket-compiler.ts';

export interface BoundTopology {
  epoch: number;
  neighbors: Array<[number, number]>;
  waitingCouples: number[];
  phase: 'shifting' | 'dancing';
}

export interface CompiledBecketDance extends CompiledDance {
  topology(beat: number): BoundTopology;
}

function freezeOwned<T>(value:T,seen=new WeakSet<object>()):T {
  if(value&&typeof value==='object'&&!seen.has(value as object)){seen.add(value as object);for(const child of Object.values(value as object))freezeOwned(child,seen);Object.freeze(value);}
  return value;
}

/** Formation dispatch is explicit and independent of a dance name or catalog ID.
 * The public result owns its source/identity metadata. External edits must be
 * recompiled rather than changing the meaning of a later scrub in-place. */
export function compileChoreography(dance: Dance, couples = 6, capabilities:MotionCapabilities=REGISTERED_MOTION_CAPABILITIES): CompiledDance {
  return compileOwnedProgram({dance,couples,capabilities});
}
const compileOwnedProgram=createOwnedProgramCache(({dance,couples,capabilities}:{dance:Dance;couples:number;capabilities:MotionCapabilities})=>compileChoreographyUncached(dance,couples,capabilities));

function compileChoreographyUncached(dance: Dance, couples: number, capabilities: MotionCapabilities): CompiledDance {
  if(dance.improperWavePolicy!==undefined){
    if(!capabilities.improperWaveSequences||!capabilities.longWaves||!capabilities.progressionEvents||dance.figures.some(f=>f.kind==='hey'&&f.amount===1)&&!capabilities.ordinaryFullHeys||dance.figures.some(f=>f.kind==='hey'&&f.amount===.5)&&!capabilities.ordinaryHalfHeys||dance.figures.some(f=>f.kind==='ricochet-hey')&&(!capabilities.ricochetHeys||!capabilities.stateCarryingRicochetWaves)||dance.figures.some(f=>f.kind==='do-si-do')&&!capabilities.stateCarryingRoleDosidoWaves||dance.figures.some(f=>f.kind==='ring-balance')&&!capabilities.ringBalances||dance.figures.some(f=>f.kind==='california-twirl')&&!capabilities.californiaTwirls)throw Error('Improper wave interpretation requires carried full-hey wave and finite ring/twirl capabilities.');
    return compileImproperWavePolicyDance(dance,couples);
  }
  if(dance.hallLinePolicy!==undefined){
    if(dance.figures.some(f=>f.kind==='give-and-take')&&(!capabilities.compactGiveTakes||!capabilities.giveAndTakes))throw Error('Four-count give/take requires its separate compact capability.');
    if(!capabilities.hallLineSequences||!capabilities.hallTravel||!capabilities.progressionEvents||!capabilities.stateCarryingSixTwoPasses)throw Error('Hall-line source requires its explicit initial-line, hall and finite pass capabilities.');
    return withBalanceStance(compileHallLinePolicyDance(dance,couples));
  }
  if(dance.becketWavePolicy!==undefined){
    if(!capabilities.becketWaveSequences||!capabilities.longWaves||!capabilities.progressionEvents||!capabilities.ordinaryHalfHeys||!capabilities.stateCarryingSixTwoPasses)throw Error('Becket wave interpretation requires its carried wave, half-hey and circle/pass finite capabilities.');
    if(dance.figures.some(f=>f.kind==='larks-chain')&&!capabilities.stateCarryingRoleChains)throw Error('Becket role chains require their explicit carried role/hand capability.');
    return withBalanceStance(compileBecketWavePolicyDance(dance,couples));
  }
  if(dance.initialWavePolicy!==undefined){
    if(!capabilities.initialWaveSequences||!capabilities.longWaves||!capabilities.progressionEvents||!capabilities.ordinaryHalfHeys)throw new Error('Initial-wave compositions require their explicit carried-wave, half-hey and finite-event capabilities.');
    return withBalanceStance(compileInitialWavePolicyDance(dance,couples));
  }
  if(dance.figures.some(f=>f.kind==='becket-slice'))return withBalanceStance(compileBecketStateSequence(dance,couples,capabilities));
  if(capabilities.stateCarryingSequences&&hasInteriorSequenceEvent(dance))return withBalanceStance(compilePhasedStateSequence(dance,couples,capabilities));
  if(capabilities.stateCarryingSequences&&stateSequenceApplicability(dance)==='applicable')return withBalanceStance(compileStateSequence(dance,couples,capabilities));
  if(dance.madRobinPolicy!==undefined||dance.figures.some(f=>f.kind==='mad-robin')){
    if(!capabilities.madRobins||!capabilities.progressionEvents)throw new Error('Mad-robin compositions require their separately reviewed orbit, partner-facing and finite-end compiler.');
    const compiled=compileMadRobinImproper(dance as MadRobinDance,couples);
    freezeOwned(compiled.dancers);freezeOwned(compiled.starts);freezeOwned(compiled.warnings);return Object.freeze(compiled);
  }
  if(dance.figures.some(f=>f.kind==='star-promenade'||f.kind==='butterfly-whirl')){
    if(!capabilities.starPromenadeWhirls||!capabilities.gyres||!capabilities.ringBalances||!capabilities.petronellas||!capabilities.californiaTwirls||!capabilities.ringPairHandoffs||!capabilities.progressionEvents)throw new Error('Star-promenade and butterfly-whirl compositions require their separately reviewed carried-turn, successor and finite-end adapters.');
    const compiled=compileStarWhirlImproper(dance as StarWhirlDance,couples);
    freezeOwned(compiled.dancers);freezeOwned(compiled.starts);freezeOwned(compiled.warnings);return Object.freeze(compiled);
  }
  if(dance.figures.some(f=>f.kind==='revolving-door'))assertCompositionCapabilities(dance.figures,capabilities);
  if(dance.ringTwirlPolicy!==undefined){
    if(!capabilities.ringTwirlSequences||!capabilities.ringStartSequences||!capabilities.ringPetronellaStarts||!capabilities.ringBalances||!capabilities.petronellas||!capabilities.gyres||!capabilities.californiaTwirls||!capabilities.progressionEvents)throw new Error('Ring/twirl return compositions require their separately reviewed figure, return and finite-end adapters.');
    const compiled=compileRingTwirlImproper(dance as RingTwirlDance,couples);
    freezeOwned(compiled.dancers);freezeOwned(compiled.starts);freezeOwned(compiled.warnings);return Object.freeze(compiled);
  }
  if(dance.diagonalHeyPolicy!==undefined){
    if(!capabilities.diagonalHalfHeys||!capabilities.progressionEvents||!capabilities.rightLeftThrough||!capabilities.ordinaryHalfHeys)throw new Error('Diagonal half-hey compositions require their separately reviewed grouping, event and prefix adapters.');
    const compiled=compileDiagonalHalfHeyBecket(dance,couples);
    freezeOwned(compiled.dancers);freezeOwned(compiled.starts);freezeOwned(compiled.warnings);return Object.freeze(compiled);
  }
  const source=freezeOwned(structuredClone(dance));
  assertCompositionCapabilities(source.figures,{...capabilities,stateCarryingSequences:false});
  if(source.figures.some(f=>f.heyAxis!==undefined))throw new Error('Axis-declared half heys require their dedicated diagonal formation compiler and finite-end policy.');
  if(source.sixTwoPassPolicy!==undefined&&(!capabilities.sixTwoPasses||source.formation!=='duple-improper'||source.progressionEvents?.length!==1||source.ovalPolicy!==undefined||source.figures.some(f=>f.kind==='right-left-through')&&!capabilities.rightLeftThrough||source.figures.some(f=>f.kind==='gyre')&&!capabilities.gyres||source.figures.some(f=>f.kind==='hall-travel')&&!capabilities.hallTravel||source.figures.some(f=>f.kind==='promenade')&&!capabilities.promenades))throw new Error('A six-plus-two policy requires its separately reviewed finite compiler and one source-bound terminal event.');
  if(source.ovalPolicy!==undefined&&(!capabilities.wholeSetOvalPromenades||!capabilities.promenades||!capabilities.rightLeftThrough||source.formation!=='duple-improper'))throw new Error('A whole-set oval policy requires its separately reviewed formation compiler.');
  const ringPetronellaStart=source.formation==='duple-improper'&&source.figures[0]?.kind==='ring-balance'&&source.figures[1]?.kind==='petronella';
  if(source.endPolicy!==undefined&&!(source.sixTwoPassPolicy!==undefined&&capabilities.sixTwoPasses&&source.progressionEvents?.length===1)&&!(source.figures[0]?.kind==='swing'&&source.figures[0].entry==='closed-neighbor-frame'&&capabilities.swingStartSequences&&source.progressionEvents?.length===1)&&!(source.figures[0]?.kind==='form-short-wave'&&source.formation==='duple-improper'&&capabilities.rorySlides&&source.progressionEvents?.length===1)&&!(ringPetronellaStart&&capabilities.ringPetronellaStarts&&source.progressionEvents?.length===1)&&source.progressionEvents?.length!==2&&!(source.progressionEvents?.length===1&&source.formation==='becket'&&source.circulation==='ccw'&&capabilities.becketStarProgressions)&&!(source.progressionEvents?.length===1&&source.formation==='duple-improper'&&source.figures[0]?.kind==='half-poussette'&&capabilities.halfPoussettes&&capabilities.poussetteStartSequences))throw new Error('A finite-end policy declaration requires its explicitly reviewed finite-formation compiler.');
  if(source.figures.some(f=>f.starGrip!==undefined)&&!capabilities.starGrips)throw new Error('Explicit star grip variants require their separately reviewed contact adapter.');
  if(source.progressionEvents!==undefined&&!capabilities.progressionEvents)throw new Error('Source-declared relation events require a registered event-aware formation compiler.');
  const compiled=source.sixTwoPassPolicy!==undefined?withBalanceStance(compileSixTwoImproper(source as SixTwoSourceDance,couples)):source.ovalPolicy!==undefined?withBalanceStance(compileOvalImproper(source as OvalSourceDance,couples)):source.progressionEvents!==undefined?withBalanceStance(compileEventChoreography(source,couples,capabilities)):source.formation==='duple-improper'?withBalanceStance(compileDance(source,couples,capabilities)):source.formation==='becket'?withBalanceStance(compileBecketDance(source,couples)):undefined;
  if(!compiled)throw new Error('This formation does not have a registered motion adapter.');
  freezeOwned(compiled.dancers);freezeOwned(compiled.starts);freezeOwned(compiled.warnings);return Object.freeze(compiled);
}

function compileEventChoreography(dance:Dance,couples:number,capabilities:MotionCapabilities):CompiledDance {
 const events=dance.progressionEvents;
 if(Array.isArray(events)&&events.length===2){
  const policy=dance.endPolicy;
  if(!capabilities.doubleProgressions||!capabilities.archExchanges||dance.formation!=='duple-improper'||!policy||Object.keys(policy).some(k=>!['waitingRoleArrangement','sameEndTurnBeats','reentryPreparationBeats','source'].includes(k))||policy.waitingRoleArrangement!=='lark-left'||policy.sameEndTurnBeats!==8||policy.reentryPreparationBeats!==2||policy.source?.basis!=='reviewed-interpretation')throw new Error('Two physical progressions require their separately registered source adapter and explicit reviewed finite-end policy.');
  return compileDoubleProgressionImproper(dance,couples,{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,reentryPreparationBeats:2,source:policy.source});
 }
 if(!Array.isArray(events)||events.length!==1)throw new Error('This event adapter requires exactly one explicit source-bound progression event.');
 const event=events[0];
 if(!event||Object.keys(event).some(k=>!['afterFigureId','count','waitingRoleArrangement','source','initialBinding'].includes(k))||event.count!==1||!['lark-left','lark-right'].includes(event.waitingRoleArrangement)||typeof event.afterFigureId!=='string'||!event.source||Object.keys(event.source).some(k=>!['sourceId','url','clause','basis'].includes(k)))throw new Error('The progression event has unresolved or unsupported semantics.');
 if(dance.figures.some(f=>f.kind==='box-the-gnat')&&!capabilities.archExchanges||dance.figures.some(f=>f.kind==='right-left-through')&&!capabilities.rightLeftThrough||dance.figures.some(f=>f.kind==='hey'&&(f.heyStartPair!==undefined?(!capabilities.partnerFirstHalfHeys||!capabilities.ordinaryHalfHeys):f.heyStartRole===undefined?!capabilities.partialHeys:f.amount===1?!capabilities.ordinaryFullHeys:!capabilities.ordinaryHalfHeys))||dance.figures.some(f=>f.kind==='hall-travel')&&!capabilities.hallTravel)throw new Error('Every figure in an event sequence requires its separately registered motion capability.');
 if(dance.figures[0]?.kind==='swing'){if(!capabilities.swingStartSequences||!capabilities.ringBalances||!capabilities.ringPassThroughs||dance.formation!=='duple-improper'||event.waitingRoleArrangement!=='lark-left'||event.initialBinding!==undefined)throw new Error('A prepared opening swing needs its separately reviewed closed-frame, terminal-pass and finite-end compiler.');return compileSwingStartImproper(dance,couples);}
 if(dance.figures[0]?.kind==='half-poussette'){const policy=dance.endPolicy;if(!capabilities.halfPoussettes||!capabilities.poussetteStartSequences||!capabilities.ringBalances||!capabilities.californiaTwirls||!capabilities.ordinaryHalfHeys||dance.formation!=='duple-improper'||event.waitingRoleArrangement!=='lark-left'||event.initialBinding!==undefined||!policy||policy.waitingRoleArrangement!=='lark-left'||policy.sameEndTurnOffsetBeats!==4||policy.sameEndTurnBeats!==8||policy.waitingHands!=='release-during-exchange'||policy.reentryPreparationBeats!==4)throw new Error('Opening partner poussette compositions require their separately reviewed compact formation, terminal two-hand twirl and explicit end policy.');return compilePoussetteStartImproper(dance,couples,{...policy,waitingRoleArrangement:'lark-left',sameEndTurnOffsetBeats:4,sameEndTurnBeats:8,waitingHands:'release-during-exchange',reentryPreparationBeats:4});}
 if(dance.formation==='becket'&&dance.circulation==='ccw'){if(!capabilities.becketStarProgressions||event.waitingRoleArrangement!=='lark-left'||event.initialBinding!==undefined)throw new Error('Counterclockwise Becket star progressions require their separately reviewed event and end-policy adapter.');return compileStarProgressingBecket(dance,couples,{...event,count:1,waitingRoleArrangement:'lark-left'});}
 if(dance.figures[0]?.kind==='ring-balance'){if(!capabilities.ringStartSequences||!capabilities.ringBalances||!capabilities.ringPassThroughs||dance.formation!=='duple-improper'||event.waitingRoleArrangement!=='lark-left'||event.initialBinding!==undefined||event.afterFigureId!==dance.figures.at(-1)?.id)throw new Error('Opening-ring finite compositions require their separately reviewed ring, pass and end-policy adapters.');if(dance.figures[1]?.kind==='petronella'){const policy=dance.endPolicy;if(!capabilities.ringPetronellaStarts||!capabilities.petronellas||!policy||policy.waitingRoleArrangement!=='lark-left'||policy.sameEndTurnOffsetBeats!==4||policy.sameEndTurnBeats!==8||policy.reentryPreparationBeats!==4||policy.source?.basis!=='reviewed-interpretation')throw new Error('Opening ring-petronella compositions require their separately reviewed dispatch and finite-end policy.');return compileRingStartImproper(dance,couples,{...policy,waitingRoleArrangement:'lark-left',sameEndTurnOffsetBeats:4,sameEndTurnBeats:8,reentryPreparationBeats:4});}return compileRingStartImproper(dance,couples,{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,source:event.source});}
 if(dance.figures[0]?.kind==='form-short-wave'){const policy=dance.endPolicy;if(!capabilities.rorySlides||dance.formation!=='duple-improper'||event.waitingRoleArrangement!=='lark-left'||event.initialBinding!==undefined||!policy||Object.keys(policy).some(k=>!['waitingRoleArrangement','sameEndTurnBeats','reentryPreparationBeats','source'].includes(k))||policy.waitingRoleArrangement!=='lark-left'||policy.sameEndTurnBeats!==8||policy.reentryPreparationBeats!==0||policy.source?.basis!=='reviewed-interpretation')throw new Error('Rory source compositions require their separately reviewed wave/slide adapter and explicit finite-end policy.');return compileRoryImproper(dance,couples,{...event,count:1,waitingRoleArrangement:'lark-left'});}
 if(dance.figures.some(f=>f.entry==='long-waves'||f.exit==='long-waves')){if(!capabilities.longWaves||dance.formation!=='duple-improper'||event.waitingRoleArrangement!=='lark-left')throw new Error('Full long-wave source compositions require their separately registered adapter.');return compileLongWaveImproper(dance,couples,{...event,count:1,waitingRoleArrangement:'lark-left'});}
 if(dance.figures.some(f=>f.kind==='pass-to-wave'||f.kind==='pass-to-wave-balance')){if(!capabilities.shortWaves||dance.formation!=='duple-improper'||event.waitingRoleArrangement!=='lark-left')throw new Error('Short-wave source compositions require their separately registered adapter.');return compileShortWaveImproper(dance,couples,{...event,count:1,waitingRoleArrangement:'lark-left'});}
 if(event.initialBinding!==undefined){if(event.initialBinding!=='retain-starting-neighbors'||!capabilities.deferredNeighbors||!capabilities.hallTravel||dance.formation!=='duple-improper'||event.waitingRoleArrangement!=='lark-left')throw new Error('This explicit first-pass neighbor policy needs its separately registered adapter.');return compileDeferredImproper(dance,couples,{...event,count:1,waitingRoleArrangement:'lark-left',initialBinding:'retain-starting-neighbors'});}
 if(dance.formation==='duple-improper'&&event.waitingRoleArrangement==='lark-left')return compileProgressingImproper(dance,couples,{...event,count:1,waitingRoleArrangement:'lark-left'});
 if(dance.formation==='becket'&&event.waitingRoleArrangement==='lark-right'&&(capabilities.archToCourtesy||capabilities.archRelationChanges))return compileHalfHeyProgressingBecket(dance,couples,{...event,count:1,waitingRoleArrangement:'lark-right'});
 throw new Error('This formation, wait placement and progression event needs a different reviewed adapter.');
}

export function compileBecketDance(dance: Dance, couples = 6): CompiledBecketDance {
  if(dance.madRobinPolicy!==undefined)throw new Error('A mad-robin policy requires its dedicated improper compiler.');
  if(dance.ringTwirlPolicy!==undefined)throw new Error('A ring/twirl return policy requires its dedicated improper compiler.');
  if (dance.formation !== 'becket' || dance.circulation !== 'cw') {
    throw new Error('This adapter requires explicit clockwise Becket formation.');
  }
  assertProgressionMarkers(dance.figures,0);
  const initial = createBecketState(couples);
  if (!dance.figures.length || dance.figures.length > 64 || dance.figures.reduce((n, f) => n + f.beats, 0) !== 64) {
    throw new Error('The Becket adapter requires a complete 64-beat sequence.');
  }
  const first = dance.figures[0];
  if (first.kind !== 'becket-shift' || first.direction !== 'left') {
    throw new Error('Clockwise Becket requires an explicit opening shift left.');
  }
  for (const figure of dance.figures) {
    if(figure.hands!==undefined||figure.underRole!==undefined)throw new Error('The Becket adapters do not consume handed-balance or under-role modifiers.');
    if (figure.confidence === 'unsupported') throw new Error(`${figure.label} is unresolved.`);
    if (figure.kind === 'becket-shift' && (figure.who || figure.amount !== undefined || figure.notation)) {
      throw new Error('The shift adapter moves each partner couple one place; additional semantics need a separate adapter.');
    }
    if (figure.kind === 'hey' && (figure.direction !== undefined || figure.amount !== undefined || figure.who !== undefined && figure.who !== 'all')) {
      throw new Error('The hey uses its named pass events; extra hand, turn, or participant modifiers are not silently ignored.');
    }
    if (figure.kind === 'hey' && (!figure.notation || figure.entry !== 'side-couples' || figure.exit !== 'same-slots-partner-balance')) {
      throw new Error('A hey requires explicit pass notation and reviewed entry and exit constraints.');
    }
  }
  // The section compiler checks every primitive, receiver, root transition, and actual
  // final formation. This cast narrows only the already checked source constraint fields.
  const spec = {figures: dance.figures, roundBeats: 64} as SectionSpec;
  const states: BecketState[] = [initial];
  const sections: CompiledSection[] = [];
  const period = couples * 2;
  const ensure = (index: number) => {
    while (sections.length <= index) {
      const section = compileBecketSection(states[sections.length], spec);
      sections.push(section);
      states.push(section.shift.nextRound);
    }
    return sections[index];
  };
  // Validate a complete finite circulation, including a two-couple line whose
  // opening shift leaves both couples out. No sequence is accepted only because
  // there was nobody available to execute its figures in the first round.
  ensure(period - 1);
  const starts: number[] = [];
  let elapsed = 0;
  for (const figure of dance.figures) {
    if(figure.hands!==undefined||figure.underRole!==undefined)throw new Error('The Becket adapters do not consume handed-balance or under-role modifiers.'); starts.push(elapsed); elapsed += figure.beats; }
  const warnings = [
    ...(dance.figures.some(f => f.kind === 'hey') ? ['Each full hey reserves 2 source beats for its entrance and 2 for its exit; the named passes use the remaining source time.'] : []),
    'At each finite end, an out couple crosses at that same end, then re-enters on the next shift.'
  ];
  if (couples % 2) warnings.push('This odd-sized line starts with one extra west-side end couple ready to enter.');
  if (!dance.verified) warnings.push('Imported interpretation: review source wording and the modeled transitions before teaching.');
  const locate = (beat: number) => {
    if (!Number.isFinite(beat)) throw new Error('The sample beat must be finite.');
    beat = Math.max(0, beat);
    const repeat = Math.floor(beat / 64);
    const localBeat = beat % 64;
    const index = repeat % period;
    return {beat, repeat, localBeat, index, section: ensure(index)};
  };
  const topology = (beat: number): BoundTopology => {
    const {repeat, localBeat, index, section} = locate(beat);
    const shifted = localBeat >= first.beats;
    const state = shifted ? section.shift.afterShift : states[index];
    return {
      epoch: repeat + Number(shifted),
      neighbors: state.groups.flatMap(g => [[g.dancers[0], g.dancers[3]], [g.dancers[1], g.dancers[2]]] as Array<[number, number]>),
      waitingCouples: shifted ? [...section.shift.waitingCouples] : state.couples.filter(c => c.status !== 'active').map(c => c.id),
      phase: shifted ? 'dancing' : 'shifting'
    };
  };
  return {
    dance, dancers: sections[0].dancers, totalBeats: 64, repeatable: true, starts, warnings, topology,
    sample(beat: number): Frame {
      const at = locate(beat);
      const frame = at.section.sample(at.localBeat);
      const waiting = at.localBeat >= first.beats ? at.section.shift.waitingCouples : [];
      const cues = waiting.length ? [`Couple${waiting.length > 1 ? 's' : ''} ${waiting.map(c => c + 1).join(' and ')}: wait out, cross at this end, and face in for the next left shift.`] : [];
      return {...frame, beat: at.beat, localBeat: at.localBeat, repeat: at.repeat, warnings: [...cues, ...warnings]};
    }
  };
}
