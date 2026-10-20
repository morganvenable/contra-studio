/** Complete improper adapter with source-declared mid-round progression. The
 * star must actually deliver the stated row permutation before new neighbors
 * are bound. Registered primitive/chain tails may follow only when their actual
 * terminal slots match the next-round logical state. No extra movement, fixed 64-beat clock, or assumed 2N cache period. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {createDancers,initialPoses,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileChainFigure} from './chain.ts';
import {compileEventSection,type BoundFigureStep,type CompiledEventSection} from './event-section.ts';
import {describeBoundEndEffects,ownProgressionDeclaration,bindDirectedCoupleSlots,compileSameEndExchange,type DirectedCoupleSlot,type ProgressionEvidence} from './progression-topology.ts';
import type {CompiledDance,Dance,Pose,Frame} from './types.ts';
export interface ImproperProgressionSpec {afterFigureId:string;source:ProgressionEvidence;count:1;waitingRoleArrangement:'lark-left';}
export interface CompiledProgressingImproper extends CompiledDance {topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;waitingIds:readonly number[];};}
const freeze=<T>(o:T):T=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const copy=(p:Pose)=>({...p,position:{...p.position}});
const key=(slots:readonly DirectedCoupleSlot[])=>[...slots].sort((a,b)=>a.coupleId-b.coupleId).map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|');
export function compileProgressingImproper(input:Dance,couples:number,raw:ImproperProgressionSpec):CompiledProgressingImproper{
 const dance=freeze(structuredClone(input)),spec=ownProgressionDeclaration(dance,raw);
 if(!Number.isInteger(couples)||couples<2||couples>12||new Set(dance.figures.map(f=>f.id)).size!==dance.figures.length)throw new Error('Choose2–12 couples and unique source figure identities.');for(const f of dance.figures)assertFigureArgumentsConsumed(f);
 if(dance.formation!=='duple-improper'||spec.count!==1||spec.initialBinding!==undefined||spec.waitingRoleArrangement!=='lark-left')throw new Error('This source adapter requires one explicit improper progression and conventional wait placement.');
 const figures=structuredClone(dance.figures),at=figures.findIndex(f=>f.id===spec.afterFigureId),totalBeats=figures.reduce((n,f)=>n+f.beats,0);
 const registered=new Set(['balance','swing','circle','star','do-si-do','allemande','long-lines','robins-chain','ladies-chain']);
 if(at<0||at>=figures.length-1||figures[at].kind!=='star'||figures[at].amount!==1||figures[at].direction!=='left'||figures.some(f=>!registered.has(f.kind))||figures.slice(at+1).reduce((n,f)=>n+f.beats,0)<8)throw new Error('This adapter requires an explicit complete left-star progression followed by registered primitive/chain figures with an eight-beat end-turn budget.');
 if(figures.some((f,i)=>f.progression&&i!==at))throw new Error('A second progression must have another source-bound event.');
 const dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role])),initial=initialPoses(dancers),initialSlots:DirectedCoupleSlot[]=dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction})),sections:CompiledEventSection[]=[],slotsByRound:DirectedCoupleSlot[][]=[],seen=new Map<string,number>();
 let poses=initial,slots=initialSlots;
 const starts:number[]=[];let count=0;for(const f of figures){starts.push(count);count+=f.beats;}const eventBeat=starts[at]+figures[at].beats;
 let periodStart=0,period=0;
 // Discover and validate actual finite-state closure. A malformed source cannot
 // gain repeatability by reducing its repeat index modulo a guessed constant.
 for(let round=0;round<512;round++){
  const stateKey=key(slots),prior=seen.get(stateKey);if(prior!==undefined){const expected=prior===0?initial:sections[prior-1].end;if(poses.some(p=>Math.hypot(p.position.x-expected[p.id].position.x,p.position.z-expected[p.id].position.z)>.01))throw new Error('Logical closure does not match the actual finite-line body endpoints.');periodStart=prior;period=round-prior;break;}seen.set(stateKey,round);slotsByRound.push(slots.map(s=>({...s})));
  const binding=bindDirectedCoupleSlots(dancers,round,slots),directions=slots.reduce((values,s)=>{values[s.coupleId]=s.direction;return values;},[] as number[]),nextSlots=slots.map(s=>({...s})),oldTurns=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const c of new Set(binding.waitingIds.map(id=>dancers[id].couple))){const slot=nextSlots.find(s=>s.coupleId===c)!,end=slot.rank===0?'top':slot.rank===couples-1?'bottom':undefined;if(!end)throw new Error('The initial binding has an interior waiter.');if(slot.direction===(end==='top'?-1:1)){oldTurns.set(c,compileSameEndExchange({ids:[c*2,c*2+1],roles,entry:poses,end,roleArrangement:spec.waitingRoleArrangement,startBeat:4,beats:8,evidence:spec.source}));slot.direction=slot.direction===1?-1:1;}}
  for(const g of binding.groups){const a=dancers[g.actors[0]].couple,b=dancers[g.actors[2]].couple,A=nextSlots.find(s=>s.coupleId===a)!,B=nextSlots.find(s=>s.coupleId===b)!;[A.rank,B.rank]=[B.rank,A.rank];}
  const progressed=bindDirectedCoupleSlots(dancers,round+1,nextSlots),expected=poses.map(copy);
  for(const d of dancers){const slot=nextSlots.find(s=>s.coupleId===d.couple)!;expected[d.id].position={x:.9*(d.role==='lark'?slot.direction:-slot.direction),z:(slot.rank-(couples-1)/2)*1.8};expected[d.id].yaw=slot.direction===1?0:Math.PI;}
  const turnPlans=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const c of new Set(progressed.waitingIds.map(id=>dancers[id].couple))){const slot=nextSlots.find(s=>s.coupleId===c)!,end=slot.rank===0?'top':slot.rank===couples-1?'bottom':undefined;if(!end)throw new Error('The progression stranded a couple inside the line.');const plan=compileSameEndExchange({ids:[c*2,c*2+1],roles,entry:expected,end,roleArrangement:spec.waitingRoleArrangement,startBeat:eventBeat,beats:8,evidence:spec.source});turnPlans.set(c,plan);slot.direction=slot.direction===1?-1:1;}
  const change={id:`${spec.afterFigureId}:neighbors:${round}`,beat:eventBeat,expectedEpoch:round,groups:progressed.groups,neighborPairs:[...progressed.relations.neighbor].filter(([a,b])=>a<b),waitingIds:progressed.waitingIds,evidence:spec.source};
  const steps:BoundFigureStep[]=figures.map((figure,i)=>({figure:{...figure,progression:i===at},entryFacingBeats:['balance','swing'].includes(figure.kind)?0:Math.min(1,figure.beats*.12),...(i===at+1?{before:{change,expected}}:{}),compile(context){const f={...figure,progression:i===at};return f.kind==='robins-chain'||f.kind==='ladies-chain'?compileChainFigure(f,context):compilePrimitiveFigure(f,context.ids,context.start,context.dancers,directions,figureContinuity(figures,i));},inactive(beat:number,incoming:readonly Pose[]){return i>at?[...turnPlans.values()].flatMap(p=>p.sample(beat)):binding.waitingIds.map(id=>oldTurns.get(dancers[id].couple)?.sample(beat).find(p=>p.id===id)??{...copy(incoming[id]),stride:0,activity:'waiting' as const});}}));
  const section=compileEventSection({dancers,initial:poses,binding,steps,totalBeats});
  for(const d of dancers){const slot=nextSlots.find(s=>s.coupleId===d.couple)!,p=section.end[d.id],x=.9*(d.role==='lark'?slot.direction:-slot.direction),z=(slot.rank-(couples-1)/2)*1.8;if(Math.hypot(p.position.x-x,p.position.z-z)>1e-6)throw new Error('The post-progression figures must finish at the exact next-round logical slots; no formation reset is inferred.');}
  sections.push(section);poses=section.end.map(copy);slots=nextSlots;
 }
 if(!period)throw new Error('The source did not close within the bounded finite-state verification budget.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/totalBeats),localBeat=beat-repeat*totalBeats,index=repeat<sections.length?repeat:periodStart+(repeat-periodStart)%period;return{beat,repeat,localBeat,index,section:sections[index]};};
 const warnings=['The completed star rebinds neighbors at its source boundary; each out couple turns across that same end in eight beats.'];
 return Object.freeze({dance,dancers,totalBeats,repeatable:true,starts:freeze(starts),warnings:freeze(warnings),topology(beat:number){const s=locate(beat),b=s.section.bindingAt(s.localBeat);return{epoch:s.repeat+Number(s.localBeat>=eventBeat),neighbors:[...b.relations.neighbor].filter(([a,b])=>a<b),waitingIds:b.waitingIds};},sample(beat:number):Frame{const s=locate(beat),frame=s.section.sample(s.localBeat),binding=s.section.bindingAt(s.localBeat),next=s.repeat*totalBeats+(s.localBeat<eventBeat?eventBeat:eventBeat+totalBeats);return{...frame,beat:s.beat,repeat:s.repeat,warnings:[...warnings,...describeBoundEndEffects(dancers,binding,frame.poses,spec.waitingRoleArrangement,next)]};}});
}
