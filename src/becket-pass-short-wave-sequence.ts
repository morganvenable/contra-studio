/** Finite Becket program with a counted circle/pass reaching a short wave. */
import{createFiniteBecketState,finiteBecketPoses}from'./progression-topology.ts';
import{createDancers,compilePrimitiveFigure,figureContinuity}from'./engine.ts';
import{capturePlainData}from'./owned-program-cache.ts';
import{captureBecketSliceBoundary}from'./becket-slice-step.ts';
import{captureSequenceBoundary,sampleSequenceBoundary,assertSequenceHandoff}from'./sequence-boundary.ts';
import{compileCompactReleasedStep}from'./compact-released-step.ts';
import{compileBecketPassShortWaveStep}from'./becket-pass-short-wave-step.ts';
import{compileShortWaveNeighborBalanceStep}from'./short-wave-neighbor-balance-step.ts';
import{compileBecketShortWaveStep}from'./becket-short-wave-step.ts';
import type{BecketCirclePassOptions}from'./becket-circle-pass-step.ts';
import type{Figure,Pose,HandContact,MotionCapabilities}from'./types.ts';
const copy=(p:Pose):Pose=>({...p,position:{...p.position}}),wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
export interface BecketPassShortWaveProgram{figures:Figure[];eventOptions:BecketCirclePassOptions;}
export function compileBecketPassShortWaveSequence(input:BecketPassShortWaveProgram,count:number,cap:MotionCapabilities){
 const program=freeze(capturePlainData(input)),figures=program.figures;
 if(Object.keys(program).some(k=>!['figures','eventOptions'].includes(k))||!Array.isArray(figures)||figures.reduce((s,f)=>s+f.beats,0)!==64||new Set(figures.map(f=>f.id)).size!==figures.length||figures.filter(f=>f.progression).length!==1)throw Error('Explicit short-wave finite program requires unique figures,64 source counts and one event.');
 if(!cap.stateCarryingSequences||!cap.stateCarryingSixTwoPasses||!cap.progressionEvents||!cap.shortWaves||!cap.rorySlides||!cap.stateCarryingAcrossPasses)throw Error('The finite short-wave pass requires all registered carried-event and wave capabilities.');
 const dancers=createDancers(count),initialState=createFiniteBecketState(count,{circulation:'cw',roleArrangement:'lark-left',halfWidth:.64,rowGap:1.28}),starts:number[]=[];let clock=0;for(const f of figures){starts.push(clock);clock+=f.beats;}
 const rounds:any[]=[],seen=new Map<string,number>();let state=initialState,poses=finiteBecketPoses(state),period=0,periodStart=0;
 for(let round=0;round<4*count+4;round++){
  const stateKey=JSON.stringify(state.couples),old=seen.get(stateKey);if(old!==undefined){periodStart=old;period=round-old;break;}seen.set(stateKey,round);
  const before=state,sections:any[]=[],proofs:any[]=[];let contacts:HandContact[]=[],binding=state.binding,event:ReturnType<typeof compileBecketPassShortWaveStep>|undefined;
  const add=(start:number,beats:number,sample:(beat:number)=>{poses:Pose[];contacts:HandContact[]})=>{const wrapped=(beat:number)=>{const f=sample(beat);if(event&&start>=event.rebindBeat)for(const p of event.sampleWaiting(start+beat))f.poses[p.id]=copy(p);return f;};sections.push({start,beats,sample:wrapped});const end=wrapped(beats);poses=end.poses.map(copy);contacts=structuredClone(end.contacts);};
  for(let i=0;i<figures.length;i++){
   const f=figures[i],start=starts[i];
   if(f.kind==='long-lines'){const plan=compileCompactReleasedStep(f,captureBecketSliceBoundary(dancers,poses,binding,start,contacts),{mode:'long-lines',amplitude:.34});add(start,f.beats,plan.sample);continue;}
   if(f.kind==='circle'&&f.beats===6&&figures[i+1]?.kind==='pass-through'){
    if(event)throw Error('A second event is not consumed.');const plan=compileBecketPassShortWaveStep(f,figures[i+1],captureBecketSliceBoundary(dancers,poses,binding,start,contacts),state,program.eventOptions);add(start,8,n=>plan.sample(start+n));event=plan;state=plan.nextState;binding=plan.endBinding;i++;continue;
   }
   const incoming=poses.map(copy),plans=binding.groups.map(g=>{const context={ids:[...g.actors],start:incoming,dancers,bindingEpoch:binding.epoch,relations:binding.relations,next:figures[i+1]},held=contacts.filter(h=>g.actors.includes(h.a)),boundary=captureSequenceBoundary(context,start,held);
    if(f.kind==='balance'){const plan=compileShortWaveNeighborBalanceStep(f,context,boundary);proofs.push({figureId:f.id,adapterId:'short-wave-neighbor-balance',contactPolicy:'strict-carried',incoming:boundary,entry:plan.entryState,exit:plan.exitState});return{ids:g.actors,plan};}
    const factory=()=>compilePrimitiveFigure(f,[...g.actors],incoming,dancers,[],{...figureContinuity(figures,i),geometry:{halfWidth:.64,rowGap:1.28},canonicalSwingLayout:true,...(f.kind==='swing'&&figures[i-1]?.exit==='neighbor-swing'?{swingEntry:'prepared-circle' as const}:{})});
    const result=(()=>{try{return compileBecketShortWaveStep(f,context,boundary,factory,cap);}catch(e){throw Error('Repeat '+round+' '+f.label+' '+(e as Error).message);}})();proofs.push({figureId:f.id,adapterId:result.adapterId,contactPolicy:result.boundaryPlan?'strict-carried':'established-acquisition',incoming:boundary,entry:sampleSequenceBoundary(context,result.plan,start,0),exit:sampleSequenceBoundary(context,result.plan,start+f.beats,1)});return{ids:g.actors,plan:result.plan};});
   add(start,f.beats,n=>{const t=n/f.beats,at=incoming.map(copy);for(const {ids,plan}of plans)for(const id of ids){at[id].position=plan.position(id,t);at[id].yaw=plan.facing(id,t,at);}return{poses:at,contacts:plans.flatMap(({plan})=>plan.contacts(t,at))};});
  }
  if(!event)throw Error('No counted pass reached its wave endpoint.');const expected=finiteBecketPoses(state);for(const p of poses)if(Math.hypot(p.position.x-expected[p.id].position.x,p.position.z-expected[p.id].position.z)>1e-7||Math.abs(wrap(p.yaw-expected[p.id].yaw))>1e-7)throw Error('Short-wave suffix did not physically return to next finite slots.');if(contacts.length)throw Error('Next repeat long lines require the final frame to be released.');rounds.push({before,event,sections,proofs});
 }
 if(!period)throw Error('Finite short-wave source did not close.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat)||beat<0)throw Error('Finite nonnegative source clock required.');const repeat=Math.floor(beat/64),local=beat%64,index=repeat<rounds.length?repeat:periodStart+(repeat-periodStart)%period;return{repeat,local,round:rounds[index]};};
 return Object.freeze({dancers:freeze(dancers),period,periodStart,starts:freeze(starts),sample(beat:number){const a=locate(beat),section=a.round.sections.findLast((s:any)=>s.start<=a.local);return section.sample(a.local-section.start);},topology(beat:number){const a=locate(beat),binding=a.local<a.round.event.rebindBeat?a.round.before.binding:a.round.event.endBinding;return{epoch:a.repeat+Number(a.local>=a.round.event.rebindBeat),neighbors:[...binding.relations.neighbor].filter(([x,y])=>x<y),waitingIds:[...binding.waitingIds]};},sequenceBoundaries(repeat:number){if(!Number.isSafeInteger(repeat)||repeat<0)throw Error('Boundary repeat must be a nonnegative integer.');return structuredClone(locate(repeat*64).round.proofs);}});
}
