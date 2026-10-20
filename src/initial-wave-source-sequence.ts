/** Explicit initial-wave program; experimental compiler, not an import route.
 * Source clauses supply the steps and endpoint event. No source identity selects motion.
 */
import {createDancers,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {bindDirectedCoupleSlots,compileSameEndExchange,ownProgressionDeclaration,type DirectedCoupleSlot} from './progression-topology.ts';
import {joinLongWaveSegments,fullLongWaveContacts} from './full-long-wave.ts';
import {compileCarriedWaveCirculate,ownCarriedWaveState,type CarriedWaveState,type CarriedPairedBalanceState,type CarriedWaveCirculateSpec,type CarriedWaveBalanceExitSpec} from './carried-wave-circulate.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileCarriedWaveBalance,type CarriedWaveBalanceSpec} from './carried-wave-balance.ts';
import {compileHeldPairBalanceStep} from './held-pair-balance-step.ts';
import {compileRoleHeyWaveStep} from './role-hey-wave-step.ts';
import {compileReleasedChainStep} from './released-chain-step.ts';
import {compileCarriedWaveSwing,type CarriedWaveSwingSpec,type CarriedReleasedSwingState} from './carried-wave-swing.ts';
import {compileReleasedCircleStep} from './released-circle-step.ts';
import {captureSequenceBoundary,sampleSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import type {Dance,Figure,Pose,HandContact,Role,CompiledDance,Frame} from './types.ts';
import type {MotionPlan} from './extended-figures.ts';

export type InitialWaveStep=
 |{figure:Figure;mode:'circulate';spec:CarriedWaveCirculateSpec|CarriedWaveBalanceExitSpec}
 |{figure:Figure;mode:'wave-balance';spec:CarriedWaveBalanceSpec}
 |{figure:Figure;mode:'wave-swing';spec:CarriedWaveSwingSpec}
 |{figure:Figure;mode:'local';preparation?:{receiverYield:.3}}
 |{figure:Figure;mode:'wave-return';firstRole:Role;sidePair:'partner'|'neighbor';centerShoulder:'left'|'right';endShoulder:'left'|'right'};
export interface InitialWaveProgram {
 dance:Dance;steps:InitialWaveStep[];
 initial:{inwardRole:Role;localHand:'right';halfWidth:.64;rowGap:1.28};
 waiting:{turnBeats:8;preparationBeats:8};
}
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
const turn=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const ease=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*t*(10+t*(-15+6*t));};
interface Sample {poses:Pose[];contacts:HandContact[];}
interface Section {start:number;beats:number;sample(count:number):Sample;}
export interface CompiledInitialWaveSequence extends CompiledDance {
 readonly program:InitialWaveProgram;readonly geometry:InitialWaveProgram['initial'];readonly periodRepeats:number;readonly periodStart:number;
 readonly proofs:readonly {round:number;figureId:string;policy:string}[];
 topology(beat:number):{epoch:number;partners:Array<[number,number]>;neighbors:Array<[number,number]>;waitingIds:number[]};
 sample(beat:number):Frame&{bindingEpoch:number};
}
export function compileInitialWaveSequence(raw:InitialWaveProgram,couples:number):CompiledInitialWaveSequence{
 const program=freeze(capturePlainData(raw)),{dance,steps,initial:G}=program;
 const keys=(value:object,allowed:string[])=>{if(Object.keys(value).some(k=>!allowed.includes(k)))throw Error('Initial-wave program contains an unconsumed field.');};
 keys(dance,['id','title','author','formation','description','figures','verified','sourceUrl','sourceText','sourceRecord','sourceRows','contraDbInterpretation','progressionEvents','notes']);
 for(const k of ['id','title']as const)if(typeof dance[k]!=='string'||!dance[k].trim())throw Error('Sequence identity and title must be nonempty text.');
 for(const k of ['author','description','sourceUrl','sourceText'])if((dance as any)[k]!==undefined&&typeof (dance as any)[k]!=='string')throw Error('Sequence metadata must retain its declared text type.');
 if(dance.notes!==undefined&&(!Array.isArray(dance.notes)||dance.notes.some(n=>typeof n!=='string')))throw Error('Sequence notes must retain text array type.');
 if(dance.verified!==undefined&&typeof dance.verified!=='boolean'||!Array.isArray(dance.figures)||!dance.figures.length||dance.figures.length>64)throw Error('Sequence needs explicit figures and verification metadata.');
 if(new Set(dance.figures.map(f=>f.id)).size!==dance.figures.length)throw Error('Sequence figure identities must be unique.');
 keys(program,['dance','steps','initial','waiting']);keys(G,['inwardRole','localHand','halfWidth','rowGap']);keys(program.waiting,['turnBeats','preparationBeats']);
 for(const step of steps){
  keys(step,step.mode==='local'?['figure','mode','preparation']:step.mode==='wave-return'?['figure','mode','firstRole','sidePair','centerShoulder','endShoulder']:['figure','mode','spec']);
  assertFigureArgumentsConsumed(step.figure);
  if(step.figure.confidence==='unsupported'||!step.figure.id||!step.figure.label||!Number.isFinite(step.figure.beats)||step.figure.beats<=0)throw Error('Initial-wave figures require supported, identified, positive source-counted instructions.');
  if(!['circulate','wave-balance','wave-swing','local','wave-return'].includes(step.mode))throw Error('Unknown wave program step.');
  if(step.mode==='local'&&step.preparation!==undefined){keys(step.preparation,['receiverYield']);if(!['robins-chain','ladies-chain'].includes(step.figure.kind)||step.preparation.receiverYield!==.3)throw Error('Receiver preparation requires an explicit supported chain yield.');}
  if(step.mode==='circulate'){
   if(step.figure.kind!==step.spec.kind||step.figure.beats!==step.spec.beats||step.figure.crossRole!==step.spec.crossRole||step.figure.loopRole!==step.spec.loopRole||step.figure.loopDirection!==step.spec.loopDirection||JSON.stringify(step.figure.phaseBeats)!==JSON.stringify(step.spec.phaseBeats)||step.figure.balanceStyle!==step.spec.balanceStyle)throw Error('Circulation lowering contradicts declared figure semantics.');
  }
  if(step.mode==='wave-balance'&&(step.figure.kind!=='wave-balance'||step.figure.beats!==step.spec.beats||step.figure.balanceStyle!==step.spec.style))throw Error('Wave balance lowering contradicts declared figure semantics.');
  if(step.mode==='wave-swing'&&(step.figure.kind!==step.spec.kind||step.figure.beats!==step.spec.beats||step.figure.who!==step.spec.who))throw Error('Wave swing lowering contradicts declared figure semantics.');
  if(step.mode==='wave-return'&&(step.figure.kind!=='hey'||step.figure.amount!==.5||step.figure.beats!==8||step.figure.heyStartRole!==step.firstRole||step.figure.who!==step.sidePair||step.figure.centerShoulder!==step.centerShoulder||step.figure.endShoulder!==step.endShoulder))throw Error('Wave return lowering contradicts declared hey semantics.');
 }
 if(!Number.isInteger(couples)||couples<2||couples>12||dance.formation!=='duple-improper'||G.halfWidth!==.64||G.rowGap!==1.28||G.localHand!=='right'||G.inwardRole!=='robin'||program.waiting.turnBeats!==8||program.waiting.preparationBeats!==8)throw Error('Initial-wave compiler requires the explicit supported compact improper wave and waiting convention.');
 if(steps.length!==dance.figures.length||steps.some((s,i)=>JSON.stringify(s.figure)!==JSON.stringify(dance.figures[i]))||steps.reduce((n,s)=>n+s.figure.beats,0)!==64||steps.at(-1)?.mode!=='wave-return')throw Error('Wave program steps must preserve the exact 64-count declared figure list and terminal wave return.');
 if(dance.progressionEvents?.length!==1)throw Error('Wave return needs one source-bound endpoint progression.');
 const event=ownProgressionDeclaration(dance,dance.progressionEvents[0]);
 if(event.afterFigureId!==steps.at(-1)!.figure.id||event.count!==1||event.initialBinding!==undefined||steps.at(-1)!.figure.progression!==true||event.waitingRoleArrangement!=='lark-left'||steps.some((s,i)=>s.figure.progression&&i!==steps.length-1))throw Error('Wave progression must occur only after its reached terminal endpoint.');
 const retained=(dance as any).sourceRecord;if(dance.sourceUrl!==undefined&&event.source.url!==dance.sourceUrl||retained&&(event.source.sourceId!==retained.snapshotId||event.source.url!==retained.sourceUrl))throw Error('Progression evidence must bind the retained source snapshot and URL.');
 const dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role]));
 let slots:DirectedCoupleSlot[]=dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}));
 let poses:Pose[]=dancers.map(d=>({id:d.id,position:{x:G.halfWidth*(d.role==='lark'?d.direction:-d.direction),z:(d.couple-(couples-1)/2)*G.rowGap},yaw:d.direction*Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 const rounds:Array<{sections:Section[];entry:Pose[];exit:Pose[];waitingIds:readonly number[];partners:Array<[number,number]>;neighbors:Array<[number,number]>}>=[];
 let previousContacts:HandContact[]|undefined;
 const seen=new Map<string,number>();let period=0,periodStart=0;
 const proofs:Array<{round:number;figureId:string;policy:string}>=[];
 function waveState(binding:ReturnType<typeof bindDirectedCoupleSlots>,at:Pose[],beat:number):CarriedWaveState{
  const segments=binding.groups.map(g=>{
   const west=g.actors.filter(id=>at[id].position.x<0).sort((a,b)=>at[a].position.z-at[b].position.z),east=g.actors.filter(id=>at[id].position.x>0).sort((a,b)=>at[a].position.z-at[b].position.z);
   return{lines:[{order:west,axis:{x:0,z:1}},{order:east,axis:{x:0,z:1}}],hands:[{a:west[0],b:west[1],handA:'right' as const,handB:'right' as const},{a:east[0],b:east[1],handA:'right' as const,handB:'right' as const}]};
  });
  const wave=joinLongWaveSegments(segments,at,binding.groups.flatMap(g=>[...g.actors]),binding.relations.epoch);
  for(const hand of segments.flatMap(s=>s.hands))if(binding.relations.neighbor.get(hand.a)!==hand.b)throw Error('Initial wave hand must name the actual current neighbor.');
  return{sourceBeat:beat,bindingEpoch:binding.relations.epoch,actors:dancers.map(({id,role,couple})=>({id,role,couple})),poses:at,partner:[...binding.relations.partner],neighbor:[...binding.relations.neighbor],boxPartitions:binding.groups.map(g=>[...g.actors]),waitingIds:binding.waitingIds,wave,heldContacts:fullLongWaveContacts(wave,at)};
 }
 for(let round=0;round<128;round++){
  const key=slots.map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|'),prior=seen.get(key);
  if(prior!==undefined){ownCarriedWaveState({...waveState(bindDirectedCoupleSlots(dancers,round,slots),poses,0),heldContacts:previousContacts!});periodStart=prior;period=round-prior;const expected=rounds[prior].entry;for(const p of poses)if(Math.hypot(p.position.x-expected[p.id].position.x,p.position.z-expected[p.id].position.z)>1e-7||Math.abs(turn(p.yaw,expected[p.id].yaw))>1e-7)throw Error('Finite wave period has not physically closed.');break;}
  seen.set(key,round);
  const entry=poses.map(copy),binding=bindDirectedCoupleSlots(dancers,round,slots),nextSlots=slots.map(s=>({...s})),endTurns=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const cid of new Set(binding.waitingIds.map(id=>dancers[id].couple))){
   const slot=nextSlots.find(s=>s.coupleId===cid)!;
   endTurns.set(cid,compileSameEndExchange({ids:[2*cid,2*cid+1],roles,entry:poses,end:slot.rank===0?'top':'bottom',roleArrangement:'lark-left',startBeat:0,beats:8,evidence:event.source}));
   slot.direction=slot.direction===1?-1:1;
  }
  for(const g of binding.groups){const a=nextSlots.find(s=>s.coupleId===dancers[g.actors[0]].couple)!,b=nextSlots.find(s=>s.coupleId===dancers[g.actors[2]].couple)!;[a.rank,b.rank]=[b.rank,a.rank];}
  const nextBinding=bindDirectedCoupleSlots(dancers,round+1,nextSlots);
  const waiting=(at:number,all:Pose[])=>{for(const id of binding.waitingIds){const cid=dancers[id].couple,p=endTurns.get(cid)!.sample(Math.min(8,at)).find(p=>p.id===id)!,target=nextSlots.find(s=>s.coupleId===cid)!.direction*Math.PI/2;all[id]={...p,yaw:p.yaw+turn(p.yaw,target)*ease((at-56)/8)};}return all;};
  let wave:CarriedWaveState|undefined=ownCarriedWaveState({...waveState(binding,poses,0),...(previousContacts?{heldContacts:previousContacts}:{})}),contacts:HandContact[]=[...wave.heldContacts],cursor=0;
  const sections:Section[]=[];
  for(const [index,step]of steps.entries()){
   const start=cursor,beats=step.figure.beats,source=poses.map(copy);let sample:(count:number)=>Sample;
   if(step.mode==='circulate'||step.mode==='wave-balance'||step.mode==='wave-swing'){
    if(!wave)throw Error('Wave step has no actually carried full-wave entry.');
    if(step.spec.beats!==beats)throw Error('Wave step cannot change declared source counts.');
    const plan:{sample(count:number):Sample;exitState:CarriedWaveState|CarriedPairedBalanceState|CarriedReleasedSwingState}=step.mode==='wave-swing'?compileCarriedWaveSwing(step.spec,wave):step.mode==='wave-balance'?compileCarriedWaveBalance(step.spec,wave):'exit'in step.spec?compileCarriedWaveCirculate(step.spec,wave):compileCarriedWaveCirculate(step.spec,wave);
    sample=count=>plan.sample(count);wave='wave'in plan.exitState?plan.exitState:undefined;
    proofs.push({round,figureId:step.figure.id,policy:'strict-full-wave'});
   }else{
    if(step.mode==='local'&&wave)throw Error('Local figure cannot discard a complete carried wave; declare a supported timed exit first.');
    const plans:MotionPlan[]=[];
    for(const g of binding.groups){
     const ids=[...g.actors],next=steps[index+1]?.figure,context={ids,start:source,dancers,relations:binding.relations,bindingEpoch:round,next};
     const held=contacts.filter(h=>ids.includes(h.a)||ids.includes(h.b));
     if(held.some(h=>!ids.includes(h.a)||!ids.includes(h.b)))throw Error('Local figure cannot discard a between-box wave hand.');
     const incoming=captureSequenceBoundary(context,start,held);let plan:MotionPlan;
     if(step.mode==='wave-return'){
      if(index!==steps.length-1||beats!==8)throw Error('Wave return is an eight-count endpoint figure.');
      const centerZ=ids.reduce((n,id)=>n+source[id].position.z,0)/4;
      const exitPoses=ids.map(id=>{const side=-Math.sign(source[id].position.x),z=centerZ-Math.sign(source[id].position.z-centerZ)*G.rowGap/2;return{id,position:{x:side*G.halfWidth,z},yaw:side*(dancers[id].role===G.inwardRole?-1:1)*Math.PI/2};});
      plan=compileRoleHeyWaveStep(incoming,{beats:8,firstRole:step.firstRole,sidePair:step.sidePair,centerShoulder:step.centerShoulder,endShoulder:step.endShoulder,inwardRole:G.inwardRole,exitPoses});
     }else if(step.figure.kind==='balance')plan=compileHeldPairBalanceStep(step.figure,context,incoming);
     else if(step.figure.kind==='circle')plan=compileReleasedCircleStep(step.figure,context,incoming);
     else if(['robins-chain','ladies-chain'].includes(step.figure.kind))plan=compileReleasedChainStep(step.figure,context,incoming,step.preparation);
     else if(['swing','circle','allemande','long-lines'].includes(step.figure.kind))plan=compilePrimitiveFigure(step.figure,ids,source,dancers,slots.map(s=>s.direction),{...figureContinuity(dance.figures,index),canonicalSwingLayout:true,geometry:G});
     else throw Error(`No reviewed local wave-program adapter for ${step.figure.kind}.`);
     // All local plans must preserve actual entry, including existing hands.
     const actualEntry=sampleSequenceBoundary(context,plan,start,0);
     try{assertSequenceHandoff(incoming,actualEntry);}catch(error){const differences=incoming.poses.map(p=>{const q=actualEntry.poses.find(q=>q.id===p.id)!;return{id:p.id,root:Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z),yaw:turn(p.yaw,q.yaw)};});throw Error(`Initial-wave ${step.figure.id} at count ${start}: ${error instanceof Error?error.message:error}; ${JSON.stringify(differences)}`);}
     plans.push(plan);
    }
    sample=count=>{const t=Math.max(0,Math.min(1,count/beats)),all=source.map(copy);for(const[gIndex,g]of binding.groups.entries())for(const id of g.actors){all[id].position=plans[gIndex].position(id,t);all[id].yaw=plans[gIndex].facing(id,t,all);const plan=plans[gIndex];all[id].balance=plan.balance?.(id,t);all[id].chainCourtesyPreparation=plan.chainCourtesyPreparation?.(id,t);all[id].swingPreparation=plan.swingPreparation?.(id,t);all[id].arch=plan.arch?.(id,t);all[id].revolvingDoorPreparation=plan.revolvingDoorPreparation?.(id,t);}return{poses:all,contacts:plans.flatMap(p=>p.contacts(t,all))};};
    wave=undefined;proofs.push({round,figureId:step.figure.id,policy:step.mode==='wave-return'||step.figure.kind==='balance'?'strict-carried':'established-motion-checked-entry'});
   }
   const rawSample=sample;
   if(step.mode==='wave-return'){
    const endpoint=waiting(64,rawSample(beats).poses),nextWave=waveState(nextBinding,endpoint,64);
    sample=count=>{const f=rawSample(count);waiting(start+count,f.poses);if(count>beats-.25)f.contacts=fullLongWaveContacts(nextWave.wave,f.poses,ease((count-beats+.25)/.25));return f;};
   }else sample=count=>{const f=rawSample(count);waiting(start+count,f.poses);return f;};
   const finish=sample(beats);poses=finish.poses.map(copy);contacts=finish.contacts;
   if(wave)wave={...wave,poses,heldContacts:contacts};
   sections.push({start,beats,sample});cursor+=beats;
  }
  const sample=(beat:number)=>{const section=sections.find(s=>beat<s.start+s.beats)??sections.at(-1)!;return section.sample(beat-section.start);};
  let previous=sample(0);
  for(let n=1;n<=64*64;n++){const current=sample(n/64);for(const p of current.poses)if(Math.hypot(p.position.x-previous.poses[p.id].position.x,p.position.z-previous.poses[p.id].position.z)*64>1.8+1e-5)throw Error(`Initial-wave whole program exceeds walking speed at ${n/64}.`);for(let a=0;a<current.poses.length;a++)for(let b=a+1;b<current.poses.length;b++)if(Math.hypot(current.poses[a].position.x-current.poses[b].position.x,current.poses[a].position.z-current.poses[b].position.z)<.45-1e-6)throw Error(`Initial-wave whole program clearance fails at ${n/64}, actors ${a}/${b}, gap ${Math.hypot(current.poses[a].position.x-current.poses[b].position.x,current.poses[a].position.z-current.poses[b].position.z)}.`);previous=current;}
  previousContacts=contacts;rounds.push({sections,entry,exit:poses.map(copy),waitingIds:binding.waitingIds,partners:[...binding.relations.partner].filter(([a,b])=>a<b),neighbors:[...binding.relations.neighbor].filter(([a,b])=>a<b)});slots=nextSlots;
 }
 if(!period)throw Error('Initial-wave finite period did not close.');
 const starts=freeze(steps.map((_,i)=>steps.slice(0,i).reduce((n,s)=>n+s.figure.beats,0))),warnings=freeze(['Experimental explicit initial-wave composition; source timing choices remain in its retained program.','Compact wave spacing is 1.28 scene units; adult body sizes are unchanged.','Wave balance uses beat-locked walking; literal step-touch styling is not yet modeled.']);
 return Object.freeze({program,dance,dancers,totalBeats:64,repeatable:true,starts,warnings,geometry:G,periodRepeats:period,periodStart,proofs:freeze(proofs),topology(beat:number){if(!Number.isFinite(beat))throw Error('Invalid wave topology count.');beat=Math.max(0,beat);const repeat=Math.floor(beat/64),index=repeat<rounds.length?repeat:periodStart+(repeat-periodStart)%period,r=rounds[index];return{epoch:repeat,partners:r.partners.map(p=>[...p] as [number,number]),neighbors:r.neighbors.map(p=>[...p] as [number,number]),waitingIds:[...r.waitingIds]};},sample(beat:number){if(!Number.isFinite(beat))throw Error('Invalid wave sample count.');beat=Math.max(0,beat);const repeat=Math.floor(beat/64),local=beat%64,index=repeat<rounds.length?repeat:periodStart+(repeat-periodStart)%period,section=rounds[index].sections.find(s=>local<s.start+s.beats)??rounds[index].sections.at(-1)!;const count=local-section.start,frame=section.sample(count),figureIndex=starts.indexOf(section.start),figure=steps[figureIndex].figure,lo=Math.max(0,count-.0001),hi=Math.min(section.beats,count+.0001),before=section.sample(lo),after=section.sample(hi),waiters=new Set(rounds[index].waitingIds);
 for(const p of frame.poses){const a=before.poses[p.id],b=after.poses[p.id],speed=Math.hypot(b.position.x-a.position.x,b.position.z-a.position.z)/(hi-lo),stride=Math.min(1,speed*2.5),inactive=waiters.has(p.id);p.stride=stride;p.activity=inactive?'waiting':figure.kind;p.lean=!inactive&&figure.kind==='swing'?.1:0;p.bounce=0;p.turn=!inactive&&figure.kind==='swing'?1:0;}
 return{...frame,beat,localBeat:local,figureIndex,figureProgress:count/section.beats,repeat,bindingEpoch:repeat,warnings:[...warnings]};}});
}
