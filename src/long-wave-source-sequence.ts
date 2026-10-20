/** Full-set long-wave source programs. The zero-count setup is an assertion on
 * a moving figure's actual exit; progression follows the real two-box row swap. */
import {createDancers,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileEventSection,type CompiledEventSection,type BoundFigureStep} from './event-section.ts';
import {bindDirectedCoupleSlots,compileSameEndExchange,describeBoundEndEffects,ownProgressionDeclaration,type DirectedCoupleSlot,type GroupBinding,type ProgressionEvidence} from './progression-topology.ts';
import type {WaveFigureSpec} from './wave-figure-adapter.ts';
import {compileCarriedWaveCirculate,type CarriedWaveState} from './carried-wave-circulate.ts';
import {joinLongWaveSegments,fullLongWaveContacts,type FullLongWaveGraph} from './full-long-wave.ts';
import type {WaveGraph} from './wave-figures.ts';
import type {Dance,Figure,Pose,CompiledDance,Frame,Role} from './types.ts';
export interface LongWaveAllemandeFigure extends Omit<Figure,'kind'|'who'|'direction'|'amount'|'exit'> {kind:'allemande';beats:8;who:'neighbor';direction:'right';amount:1.5;exit:'long-waves';inwardRole:'lark';outwardRole:'robin';}
export interface LongWaveCirculateFigure extends Omit<Extract<WaveFigureSpec,{kind:'balance-box-circulate'}>,'entry'|'exit'> {entry:'long-waves';exit:'long-waves'|'progressed-neighbors';progression?:boolean;}
export type LongWaveSourceFigure=Figure|LongWaveAllemandeFigure|LongWaveCirculateFigure;
export interface LongWaveSourceDance extends Omit<Dance,'figures'> {figures:LongWaveSourceFigure[];}
export interface LongWaveProgression {afterFigureId:string;count:1;waitingRoleArrangement:'lark-left';source:ProgressionEvidence;}
/** Formation spacing, not a scale on adult bodies or their limbs. */
export const LONG_WAVE_GEOMETRY=Object.freeze({halfWidth:.64,rowGap:1.28,allemandeRadius:.39});
/** Within the existing eight-count RH turn, both pair centers open outward to
 * clear free adult arms, then return before the zero-count topology assertion. */
export const LONG_WAVE_TURN_PREPARATION=Object.freeze({outwardCenterShift:.24,openingBeats:1.5,closingBeats:1.5});
const copy=(p:Pose):Pose=>({...p,position:{...p.position}}),wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
const clamp=(n:number)=>Math.max(0,Math.min(1,n)),ease=(n:number)=>{const t=clamp(n);return t*t*t*(10+t*(-15+6*t));};
const freeze=<T>(o:T):T=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const slotKey=(slots:readonly DirectedCoupleSlot[])=>slots.map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|');
const graph=(west:readonly number[],east:readonly number[]):WaveGraph=>({lines:[{order:west,axis:{x:0,z:1}},{order:east,axis:{x:0,z:1}}],hands:[{a:west[0],b:west[1],handA:'right',handB:'right'},{a:east[0],b:east[1],handA:'right',handB:'right'}]});
function assertProgram(source:LongWaveSourceDance,spec:ReturnType<typeof ownProgressionDeclaration>){
 const f=source.figures,last=f.at(-1),first=f.at(-2),setup=f.at(-3) as LongWaveAllemandeFigure;
 if(f.some(x=>x.progression!==undefined&&typeof x.progression!=='boolean'))throw new Error('Every source progression marker must be an explicit boolean.');
 if(source.formation!=='duple-improper'||f.length<4||f.length>64||new Set(f.map(x=>x.id)).size!==f.length||f.some(x=>!x.id||!x.label||x.confidence==='unsupported'||!Number.isFinite(x.beats)||x.beats<=0)||f.reduce((n,x)=>n+x.beats,0)!==64)throw new Error('A full long-wave program needs an explicit unique 64-count improper source sequence.');
 if(spec.count!==1||spec.waitingRoleArrangement!=='lark-left'||spec.initialBinding!==undefined||spec.afterFigureId!==last!.id||f.some((x,i)=>x.progression&&i!==f.length-1))throw new Error('The long-wave progression must follow the final source-counted physical circulation.');
 if(setup?.kind!=='allemande'||setup.beats!==8||setup.who!=='neighbor'||setup.direction!=='right'||setup.amount!==1.5||setup.exit!=='long-waves'||setup.inwardRole!=='lark'||setup.outwardRole!=='robin')throw new Error('The zero-count long-wave setup must be the declared eight-count neighbor RH 1½ exit, larks in and robins out.');
 for(const[x,role,exit]of[[first,'lark','long-waves'],[last,'robin','progressed-neighbors']] as const){const c=x as LongWaveCirculateFigure;if(c.kind!=='balance-box-circulate'||c.beats!==8||c.entry!=='long-waves'||c.exit!==exit||c.crossRole!==role||c.loopRole===(role as Role)||!['lark','robin'].includes(c.loopRole)||c.loopDirection!=='right'||c.balanceStyle!=='right-left'||c.phaseBeats?.length!==2||c.phaseBeats.some(n=>n!==4))throw new Error('The full-wave source requires explicit 4+4 balances, larks then robins crossing, and right loops.');}
 // Lowering to the reusable call must not discard unconsumed source modifiers.
 const circulateKeys=new Set(['id','label','kind','beats','notes','confidence','entry','exit','progression','crossRole','loopRole','loopDirection','balanceStyle','phaseBeats']);
 for(const figure of [first!,last!])for(const key of Object.keys(figure))if(!circulateKeys.has(key)&&(figure as any)[key]!==undefined)throw new Error('The long-wave circulate does not consume '+key+'.');
 const keys=new Set(['id','label','kind','beats','notes','confidence','who','direction','amount','exit','inwardRole','outwardRole','progression']);for(const k of Object.keys(setup))if(!keys.has(k)&&(setup as any)[k]!==undefined)throw new Error(`The long-wave setup does not consume “${k}”.`);
}
interface Cycle {prelude:CompiledEventSection;binding:GroupBinding;graphs:readonly FullLongWaveGraph[];end:readonly Pose[];sample(beat:number):Frame;}
export function compileLongWaveImproper(input:LongWaveSourceDance,couples:number,raw:LongWaveProgression):CompiledDance&{periodRepeats:number;geometry:typeof LONG_WAVE_GEOMETRY;topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;waitingIds:readonly number[];wave?:FullLongWaveGraph}} {
 const source=freeze(structuredClone(input)),dance=source as unknown as Dance,spec=ownProgressionDeclaration(dance,raw);assertProgram(source,spec);
 if(!Number.isInteger(couples)||couples<2||couples>12)throw new Error('A full long-wave source requires 2–12 couples.');
 const figures=source.figures,dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role])),G=LONG_WAVE_GEOMETRY,initial:Pose[]=dancers.map(d=>({id:d.id,position:{x:G.halfWidth*(d.role==='lark'?d.direction:-d.direction),z:(d.couple-(couples-1)/2)*G.rowGap},yaw:d.direction===1?0:Math.PI,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 let cursor=0;const starts=figures.map(f=>{const start=cursor;cursor+=f.beats;return start;}),prefix=figures.slice(0,-2),waveStart=48,cycles:Cycle[]=[],seen=new Map<string,number>();
 let poses=initial,slots:DirectedCoupleSlot[]=dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction})),period=0,periodStart=0;
 for(let round=0;round<512;round++){
  const key=slotKey(slots),previous=seen.get(key);if(previous!==undefined){const expected=previous===0?initial:cycles[previous-1].end;if(poses.some(p=>Math.hypot(p.position.x-expected[p.id].position.x,p.position.z-expected[p.id].position.z)>1e-6||Math.abs(wrap(p.yaw-expected[p.id].yaw))>1e-6))throw new Error('Full-wave finite closure must match physical roots and headings.');periodStart=previous;period=round-previous;break;}seen.set(key,round);
  const binding=bindDirectedCoupleSlots(dancers,round,slots),directions=slots.reduce((a,s)=>{a[s.coupleId]=s.direction;return a;},[] as number[]),nextSlots=slots.map(s=>({...s})),turns=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const couple of new Set(binding.waitingIds.map(id=>dancers[id].couple))){const slot=nextSlots.find(s=>s.coupleId===couple)!,end=slot.rank===0?'top':slot.rank===couples-1?'bottom':undefined;if(!end)throw new Error('An unmatched actor cannot be assigned to an interior end.');turns.set(couple,compileSameEndExchange({ids:[couple*2,couple*2+1],roles,entry:poses,end,roleArrangement:'lark-left',startBeat:0,beats:8,evidence:spec.source}));slot.direction=slot.direction===1?-1:1;}
  const steps:BoundFigureStep[]=prefix.map((figure,index)=>({figure:{...figure,progression:false} as unknown as Figure,entryFacingBeats:['circle','allemande','star','long-lines','do-si-do'].includes(figure.kind)?Math.min(1,figure.beats*.12):0,compile(context){
    const declared=index===prefix.length-1,ordinary={...figure,progression:false} as any;if(declared){delete ordinary.exit;delete ordinary.inwardRole;delete ordinary.outwardRole;}
    const plan=compilePrimitiveFigure(ordinary,context.ids,context.start,context.dancers,directions,{...figureContinuity(prefix as Figure[],index),geometry:G});
    if(!declared)return plan;
    // A RH allemande walks tangent to its orbit, right shoulder toward the
    // joined hand. Its literal 1½ root exchange therefore already exits into
    // larks-in/robins-out waves; the zero-count setup adds no turn or travel.
    return{...plan,position(id,t){const p=plan.position(id,t),S=LONG_WAVE_TURN_PREPARATION,opening=S.outwardCenterShift*ease(t*figure.beats/S.openingBeats)*ease((1-t)*figure.beats/S.closingBeats);return{x:p.x+Math.sign(context.start[id].position.x)*opening,z:p.z};},facing(id,t,all){return plan.facing(id,t,all)+Math.PI/2;}};
   },inactive(beat,incoming){return binding.waitingIds.map(id=>turns.get(dancers[id].couple)!.sample(beat).find(p=>p.id===id)??{...copy(incoming[id]),stride:0,activity:'waiting' as const});}}));
  const prelude=compileEventSection({dancers,initial:poses,binding,steps,totalBeats:waveStart});
  const waveEntry=prelude.end.map(copy),ids=binding.groups.flatMap(g=>[...g.actors]),localGraphs=binding.groups.map(g=>{const[a,b,c,d]=g.actors;return graph([a,d],[b,c]);}),initialWave=joinLongWaveSegments(localGraphs,waveEntry,ids,round),plans:Array<ReturnType<typeof compileCarriedWaveCirculate>>=[],graphs:FullLongWaveGraph[]=[initialWave];
  let carried:CarriedWaveState={sourceBeat:waveStart,bindingEpoch:round,
   actors:dancers.map(({id,role,couple})=>({id,role,couple})),poses:waveEntry,
   partner:[...binding.relations.partner],neighbor:[...binding.relations.neighbor],
   boxPartitions:binding.groups.map(g=>[...g.actors]),wave:initialWave,
   heldContacts:fullLongWaveContacts(initialWave,waveEntry),waitingIds:binding.waitingIds};
  for(const declared of figures.slice(-2) as LongWaveCirculateFigure[]){
   const plan=compileCarriedWaveCirculate({kind:'balance-box-circulate',beats:8,
    crossRole:declared.crossRole,loopRole:declared.loopRole,loopDirection:declared.loopDirection,
    phaseBeats:declared.phaseBeats,balanceStyle:declared.balanceStyle},carried);
   plans.push(plan);carried=plan.exitState;graphs.push(carried.wave);
  }
  const terminalBase=plans[1].sample(6.75).poses,terminalExit=plans[1].exitState.poses;
  const sampleWave=(beat:number):Frame=>{
   const phase=beat<56?0:1,local=clamp((beat-(48+phase*8))/8),phaseBeat=local*8,plan=plans[phase],
    framePoses=plan.sample(phaseBeat).poses.map(copy),before=plan.sample(Math.max(0,local-.0001)*8).poses,
    after=plan.sample(Math.min(1,local+.0001)*8).poses;
   for(const id of ids){const p=framePoses[id].position,a=before[id].position,b=after[id].position;let yaw=framePoses[id].yaw;
    if(phase===1&&phaseBeat>6.75){const base=terminalBase[id].yaw,end=terminalExit[id].yaw,target=directions[dancers[id].couple]===1?0:Math.PI;yaw+=(base+wrap(target-base)-(base+wrap(end-base)))*ease((phaseBeat-6.75)/1.25);}
    framePoses[id]={id,position:p,yaw,stride:Math.min(1,Math.hypot(b.x-a.x,b.z-a.z)/(.0002*8)*2.5),lean:0,bounce:0,turn:0,activity:'balance-box-circulate'};
   }
   let contacts=phaseBeat<=4?fullLongWaveContacts(graphs[phase],framePoses):phaseBeat<4.15?fullLongWaveContacts(graphs[phase],framePoses,1-ease((phaseBeat-4)/.15)):phase===0&&phaseBeat>7.85?fullLongWaveContacts(graphs[phase+1],framePoses,ease((phaseBeat-7.85)/.15)):[];
   return{beat,localBeat:beat,repeat:0,figureIndex:figures.length-2+phase,figureProgress:local,poses:framePoses,contacts,warnings:[]};
  };
  const sample=(beat:number):Frame=>{if(beat<48){const f=prelude.sample(beat);if(beat>47.85)f.contacts=fullLongWaveContacts(initialWave,f.poses,ease((beat-47.85)/.15));return f;}return sampleWave(beat);};
  // Global certificate includes adjacent boxes, all seam hands and inactive ends.
  let previousFrame=sample(47.75);for(let n=1;n<=16.25*64;n++){const frame=sample(47.75+n/64);for(const p of frame.poses){const q=previousFrame.poses[p.id];if(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)*64>1.8+1e-5)throw new Error('The full-wave source exceeds its walking-speed budget.');}for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)if(Math.hypot(frame.poses[a].position.x-frame.poses[b].position.x,frame.poses[a].position.z-frame.poses[b].position.z)<.45-1e-6)throw new Error('A full-wave circulation collides with another box or a waiting end.');previousFrame=frame;}
  const end=sampleWave(64).poses;
  for(const g of binding.groups){const A=nextSlots.find(s=>s.coupleId===dancers[g.actors[0]].couple)!,B=nextSlots.find(s=>s.coupleId===dancers[g.actors[2]].couple)!;[A.rank,B.rank]=[B.rank,A.rank];}
  for(const d of dancers){const s=nextSlots.find(s=>s.coupleId===d.couple)!,p=end[d.id],x=G.halfWidth*(d.role==='lark'?s.direction:-s.direction),z=(s.rank-(couples-1)/2)*G.rowGap,yaw=s.direction===1?0:Math.PI;if(Math.hypot(p.position.x-x,p.position.z-z)>1e-6||Math.abs(wrap(p.yaw-yaw))>1e-6)throw new Error('The final circulation must physically produce its asserted next couple rows and receiving headings.');}
  cycles.push({prelude,binding,graphs:freeze(graphs),end:freeze(end.map(copy)),sample});poses=end.map(copy);slots=nextSlots;
 }
 if(!period)throw new Error('The complete long-wave source did not close within its finite verification budget.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/64),local=beat-repeat*64,index=repeat<cycles.length?repeat:periodStart+(repeat-periodStart)%period;return{beat,repeat,local,cycle:cycles[index]};};
 const warnings=freeze(['Full-set long waves use an explicit compact formation: 1.28 scene units between rows; adult bodies and limbs retain their fixed sizes.','Wave balance styling uses beat-locked walking; literal right-step/touch styling is not yet modeled.','Out couples exchange sides at the same physical end during the next opening eight counts and remain outside the active wave hands.','The inherited allemande-to-swing handoff can briefly clip a forearm through the torso; the new wave paths and contacts have separate geometric checks.']);
 return Object.freeze({dance,dancers,totalBeats:64,repeatable:true,starts:freeze(starts),warnings,periodRepeats:period,geometry:G,topology(beat:number){const s=locate(beat),wave=s.local>=48&&s.local<=52?s.cycle.graphs[0]:s.local>=56&&s.local<=60?s.cycle.graphs[1]:undefined;return{epoch:s.repeat,neighbors:[...s.cycle.binding.relations.neighbor].filter(([a,b])=>a<b),waitingIds:s.cycle.binding.waitingIds,wave:wave?freeze({...wave,bindingEpoch:s.repeat}):undefined};},sample(beat:number):Frame{const s=locate(beat),f=s.cycle.sample(s.local);return{...f,beat:s.beat,repeat:s.repeat,warnings:[...warnings,...describeBoundEndEffects(dancers,s.cycle.binding,f.poses,'lark-left',(s.repeat+1)*64)]};}});
}
