/** Source-counted short-wave improper programs. A separately registered public
 * capability gates composition; named wave state and actual endpoint oracles
 * decide support, rather than a title or one exact figure-kind sequence. */
import {createDancers,initialPoses,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileWaveFigure,type WaveFigureSpec,type WaveHandRelation} from './wave-figure-adapter.ts';
import {compileWaveHalfAllemandeFigure,compileWavePartnerSwingFigure,type WaveHalfAllemandeFigure,type WavePartnerSwingFigure} from './wave-transition-adapter.ts';
import {compileRightLeftThroughFigure} from './right-left-through-adapter.ts';
import {compileEventSection,type CompiledEventSection,type BoundFigureStep} from './event-section.ts';
import {bindDirectedCoupleSlots,compileSameEndExchange,describeBoundEndEffects,ownProgressionDeclaration,type DirectedCoupleSlot,type ProgressionEvidence} from './progression-topology.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {WaveGraph} from './wave-figures.ts';
import type {Dance,Figure,Pose,CompiledDance,Frame} from './types.ts';
export type ShortWaveSourceFigure=Figure|WaveFigureSpec|WaveHalfAllemandeFigure|WavePartnerSwingFigure;
export interface ShortWaveSourceDance extends Omit<Dance,'figures'> {figures:ShortWaveSourceFigure[];}
export interface ShortWaveProgression {afterFigureId:string;count:1;waitingRoleArrangement:'lark-left';source:ProgressionEvidence;}
interface ShortWaveState {graph:WaveGraph;handRelations:readonly WaveHandRelation[];exit:'short-wave'|'partner-swing';}
const copy=(p:Pose)=>({...p,position:{...p.position}});
const freeze=<T>(o:T):T=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const slotKey=(slots:readonly DirectedCoupleSlot[])=>slots.map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|');
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
const isPass=(f:ShortWaveSourceFigure|undefined)=>f?.kind==='pass-to-wave'||f?.kind==='pass-to-wave-balance';
const ordinary=new Set(['balance','swing','circle','allemande','do-si-do','long-lines','star']);

/** Preparation is part of the existing figure's source counts and follows an
 * explicit receiving entry. It never changes roots or invents a relationship. */
function prepareFacing(plan:MotionPlan,figure:Figure,next:ShortWaveSourceFigure|undefined,context:FigureContext,directions:number[],final:boolean):MotionPlan {
 const towardBalance=next?.kind==='balance'&&(next.who==='partner'||next.who==='neighbor'),towardPass=isPass(next);
 if(!final&&!towardBalance&&!towardPass)return plan;
 const receiving=towardBalance?resolveBoundFigureRelation(context,next!.who as 'partner'|'neighbor'):undefined;
 const centerX=context.ids.reduce((sum,id)=>sum+plan.position(id,1).x,0)/context.ids.length;
 const duration=final?Math.min(2,figure.beats*.15):Math.min(1,figure.beats*.25),onset=1-duration/figure.beats;
 return {...plan,facing(id,t,all){
  if(t<=onset)return plan.facing(id,t,all);
  const p=plan.position(id,1),other=receiving?.get(id),q=other===undefined?undefined:plan.position(other,1);
  const target=final?(directions[context.dancers[id].couple]===1?0:Math.PI):q?Math.atan2(q.x-p.x,q.z-p.z):p.x>centerX?-Math.PI/2:Math.PI/2;
  const base=plan.facing(id,onset,all),current=base+wrap(plan.facing(id,t,all)-base),end=base+wrap(target-base),u=(t-onset)/(1-onset),weight=u*u*(3-2*u);
  return current+(end-current)*weight;
 }};
}

export function compileShortWaveImproper(input:ShortWaveSourceDance,couples:number,raw:ShortWaveProgression):CompiledDance&{topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;waitingIds:readonly number[]}}{
 const source=freeze(structuredClone(input)),dance=source as unknown as Dance,spec=ownProgressionDeclaration(dance,raw),figures=source.figures;
 if(!Number.isInteger(couples)||couples<2||couples>12||!figures.length||figures.length>64||new Set(figures.map(f=>f.id)).size!==figures.length)throw new Error('Short-wave source playback needs 2–12 couples and unique figure identities.');
 if(dance.formation!=='duple-improper'||spec.count!==1||spec.waitingRoleArrangement!=='lark-left'||spec.initialBinding!==undefined||figures.some(f=>!Number.isFinite(f.beats)||f.beats<=0)||figures.reduce((n,f)=>n+f.beats,0)!==64||!figures.some(isPass))throw new Error('A short-wave program requires an explicit source-counted 64-beat improper cycle and its reviewed end policy.');
 if(spec.afterFigureId!==figures.at(-1)!.id||figures.some((f,i)=>'progression'in f&&f.progression&&i!==figures.length-1))throw new Error('This wave composition requires a single declared progression at its final actual endpoint.');
 let cursor=0;const starts=figures.map(f=>{const start=cursor;cursor+=f.beats;return start;});
 const dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role])),initial=initialPoses(dancers),initialSlots:DirectedCoupleSlot[]=dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction})),sections:CompiledEventSection[]=[],seen=new Map<string,number>();
 let slots=initialSlots,poses=initial,period=0,periodStart=0;
 for(let round=0;round<512;round++){
  const key=slotKey(slots),previous=seen.get(key);
  if(previous!==undefined){
   const expected=previous===0?initial:sections[previous-1].end;
   if(poses.some(p=>Math.hypot(p.position.x-expected[p.id].position.x,p.position.z-expected[p.id].position.z)>1e-6||Math.abs(wrap(p.yaw-expected[p.id].yaw))>1e-6))throw new Error('Short-wave finite-state closure must match actual body roots and headings.');
   periodStart=previous;period=round-previous;break;
  }
  seen.set(key,round);
  const binding=bindDirectedCoupleSlots(dancers,round,slots),nextSlots=slots.map(s=>({...s})),directions=slots.reduce((a,s)=>{a[s.coupleId]=s.direction;return a;},[] as number[]),turns=new Map<number,ReturnType<typeof compileSameEndExchange>>(),waveStates=new Map<string,ShortWaveState>();
  for(const c of new Set(binding.waitingIds.map(id=>dancers[id].couple))){
   const slot=nextSlots.find(s=>s.coupleId===c)!,end=slot.rank===0?'top':slot.rank===couples-1?'bottom':undefined;
   if(!end)throw new Error('A waiting couple cannot be inside the finite line.');
   turns.set(c,compileSameEndExchange({ids:[c*2,c*2+1],roles,entry:poses,end,roleArrangement:'lark-left',startBeat:0,beats:8,evidence:spec.source}));slot.direction=slot.direction===1?-1:1;
  }
  const steps:BoundFigureStep[]=figures.map((figure,i)=>({
   figure:{...figure,progression:false} as Figure,
   entryFacingBeats:['long-lines','circle','star','allemande','do-si-do'].includes(figure.kind)&&(figure as Figure).entry!=='short-wave'?Math.min(1,figure.beats*.12):0,
   compile(context){
    const groupKey=context.ids.join(':'),current=waveStates.get(groupKey),next=figures[i+1],final=i===figures.length-1;
    if(isPass(figure)){
     if(current)throw new Error('A pass-to-wave cannot discard an existing explicit wave state.');
     const f=figure as Extract<WaveFigureSpec,{kind:'pass-to-wave'|'pass-to-wave-balance'}>,plan=compileWaveFigure(f,context);
     waveStates.set(groupKey,{graph:plan.exitWave,handRelations:[f.sideRelation,'same-role',f.sideRelation],exit:'short-wave'});return plan;
    }
    if(figure.kind==='wave-balance'){
     if(!current)throw new Error('A wave balance requires the preceding explicit wave state.');
     const plan=compileWaveFigure(figure as Extract<WaveFigureSpec,{kind:'wave-balance'}>,{...context,wave:{graph:current.graph,handRelations:current.handRelations}});
     waveStates.set(groupKey,{...current,graph:plan.exitWave});return plan;
    }
    if(figure.kind==='allemande'&&figure.entry==='short-wave'){
     if(!current||current.exit!=='short-wave')throw new Error('A short-wave half-turn needs its explicit preceding wave entry state.');
     const f=figure as WaveHalfAllemandeFigure,plan=compileWaveHalfAllemandeFigure(f,{...context,wave:current.graph}),side=f.exit==='partner-swing'?'partner':f.who as 'partner'|'neighbor';
     waveStates.set(groupKey,{graph:plan.exitWave,handRelations:[side,'same-role',side],exit:f.exit});return plan;
    }
    if(figure.kind==='swing'&&figure.entry==='short-wave-partners'){
     if(!current||current.exit!=='partner-swing')throw new Error('The wave partner swing requires its declared center-half-turn exit state.');
     const plan=compileWavePartnerSwingFigure(figure as WavePartnerSwingFigure,{...context,wave:current.graph});waveStates.delete(groupKey);
     return prepareFacing(plan,figure as Figure,next,context,directions,final);
    }
    if(current)throw new Error('An ordinary figure cannot silently discard the current named wave graph; an explicit wave exit is required.');
    const f={...figure,progression:false} as Figure;
    if(f.kind!=='right-left-through'&&!ordinary.has(f.kind))throw new Error(`The short-wave program has no registered composition for ${f.kind}.`);
    const plan=f.kind==='right-left-through'?compileRightLeftThroughFigure(f,context):compilePrimitiveFigure(f,context.ids,context.start,context.dancers,directions,figureContinuity(dance.figures,i));
    return prepareFacing(plan,f,next,context,directions,final);
   },
   inactive(beat:number,incoming:readonly Pose[]){return binding.waitingIds.map(id=>turns.get(dancers[id].couple)!.sample(beat).find(p=>p.id===id)??{...copy(incoming[id]),stride:0,activity:'waiting' as const});}
  }));
  const section=compileEventSection({dancers,initial:poses,binding,steps,totalBeats:64});
  if(waveStates.size)throw new Error('The final progression cannot discard an unresolved wave state.');
  for(const g of binding.groups){const A=nextSlots.find(s=>s.coupleId===dancers[g.actors[0]].couple)!,B=nextSlots.find(s=>s.coupleId===dancers[g.actors[2]].couple)!;[A.rank,B.rank]=[B.rank,A.rank];}
  for(const d of dancers){const slot=nextSlots.find(s=>s.coupleId===d.couple)!,p=section.end[d.id],x=.9*(d.role==='lark'?slot.direction:-slot.direction),z=(slot.rank-(couples-1)/2)*1.8;if(Math.hypot(p.position.x-x,p.position.z-z)>1e-6)throw new Error('The final figure must actually produce the declared next partner-row permutation.');}
  sections.push(section);poses=section.end.map(copy);slots=nextSlots;
 }
 if(!period)throw new Error('The short-wave source did not close within the finite-state verification budget.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/64),localBeat=beat-repeat*64,index=repeat<sections.length?repeat:periodStart+(repeat-periodStart)%period;return{beat,repeat,localBeat,section:sections[index]};};
 const warnings=freeze(['Wave balances use schematic beat-locked walking; literal right-step/touch styling is not yet modeled.','Two-count wave allemandes retain their exact source paths; the fixed-bone walking rig currently corrects foot reach by up to 0.054 scene units.','The declared final figure supplies the actual progression; out couples turn across the same physical end in the next opening eight counts.']);
 return Object.freeze({dance,dancers,totalBeats:64,repeatable:true,starts:freeze(starts),warnings,topology(beat:number){const s=locate(beat),b=s.section.bindingAt(s.localBeat);return{epoch:s.repeat,neighbors:[...b.relations.neighbor].filter(([a,b])=>a<b),waitingIds:b.waitingIds};},sample(beat:number):Frame{const s=locate(beat),frame=s.section.sample(s.localBeat),binding=s.section.bindingAt(s.localBeat);return{...frame,beat:s.beat,repeat:s.repeat,warnings:[...warnings,...describeBoundEndEffects(dancers,binding,frame.poses,'lark-left',(s.repeat+1)*64)]};}});
}
