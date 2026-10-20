/** Finite improper partner-poussette compositions with a source-qualified
 * terminal California twirl and two-hand preparation. Named physical endpoints
 * prove progression before rebinding; no root or heading reset is invented. */
import {createDancers,initialPoses,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {assertFigureArgumentsConsumed,assertProgressionMarkers} from './figure-semantics.ts';
import {compileChainFigure} from './chain.ts';
import {compileRingTransitionFigure} from './ring-transition-adapter.ts';
import {compilePartnerHalfPoussetteFigure,type PartnerHalfPoussetteFigure} from './partner-half-poussette-adapter.ts';
import {compilePoussetteTwirlFigure,partnerTwoHandContacts,type PoussetteTwirlFigure} from './poussette-twirl-adapter.ts';
import {compileOrdinaryHalfHeyFigure} from './ordinary-half-hey.ts';

import {compileEventSection,type CompiledEventSection} from './event-section.ts';
import {bindDirectedCoupleSlots,ownProgressionDeclaration,rebindAtEndpoint,compileSameEndExchange,describeBoundEndEffects,type DirectedCoupleSlot,type GroupBinding,type ProgressionEvidence} from './progression-topology.ts';
import {ease,turn,type TurnConstraint} from './ring-twirl-contract.ts';
import type {CompiledDance,Dance,Pose,Frame} from './types.ts';
const copy=(p:Pose):Pose=>({...p,position:{...p.position}}),key=(slots:readonly DirectedCoupleSlot[])=>slots.map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|');
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export interface PoussetteStartPolicy {waitingRoleArrangement:'lark-left';sameEndTurnOffsetBeats:4;sameEndTurnBeats:8;waitingHands:'release-during-exchange';reentryPreparationBeats:4;source:ProgressionEvidence;}
export function compilePoussetteStartImproper(input:Dance,couples:number,policy:PoussetteStartPolicy):CompiledDance&{topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;waitingIds:readonly number[]}}{
 if(!policy||Object.keys(policy).some(k=>!['waitingRoleArrangement','sameEndTurnOffsetBeats','sameEndTurnBeats','waitingHands','reentryPreparationBeats','source'].includes(k))||!policy.source||Object.keys(policy.source).some(k=>!['sourceId','url','clause','basis'].includes(k)))throw new Error('Unconsumed poussette-start policy or source-evidence fields must be resolved explicitly.');
 policy=freeze(structuredClone(policy));
 const dance=freeze(structuredClone(input)),figures=dance.figures,totalBeats=figures.reduce((n,f)=>n+f.beats,0),last=figures.at(-1);
 const canonical=(v:unknown):string=>JSON.stringify(v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,x&&typeof x==='object'?JSON.parse(canonical(x)):x])):v);
 if(dance.endPolicy!==undefined&&canonical(dance.endPolicy)!==canonical(policy))throw new Error('The selected poussette finite-end policy contradicts the owned dance declaration.');
 if(!Number.isInteger(couples)||couples<2||couples>12||dance.formation!=='duple-improper'||new Set(figures.map(f=>f.id)).size!==figures.length)throw new Error('The finite poussette-start compiler requires 2–12 couples, explicit improper formation and unique figures.');
 if(policy.waitingRoleArrangement!=='lark-left'||policy.sameEndTurnOffsetBeats!==4||policy.sameEndTurnBeats!==8||policy.waitingHands!=='release-during-exchange'||policy.reentryPreparationBeats!==4||!policy.source?.sourceId||!policy.source.url||!policy.source.clause||policy.source.basis!=='reviewed-interpretation')throw new Error('Poussette-start progression requires a retained same-end eight-count lark-left waiting/re-entry policy.');
 const event=ownProgressionDeclaration(dance,{afterFigureId:last?.id??'',count:1,waitingRoleArrangement:'lark-left',source:dance.progressionEvents?.[0]?.source??policy.source});if(event.initialBinding!==undefined)throw new Error('A terminal poussette-start event cannot also declare a delayed first-pass binding.');
 assertProgressionMarkers(figures,figures.length-1);for(const f of figures)assertFigureArgumentsConsumed(f);
 const supported=new Set(['balance','swing','long-lines','allemande','do-si-do','circle','robins-chain','ladies-chain','ring-balance','half-poussette','hey','california-twirl']);
 if(figures[0]?.kind!=='half-poussette'||figures[1]?.kind!=='swing'||figures[1].who!=='neighbor'||last?.kind!=='california-twirl'||last.exit!=='partner-two-hand-hold'||last.beats!==4||figures.at(-2)?.kind!=='ring-balance'||figures.some((f,i)=>!supported.has(f.kind)||f.kind==='half-poussette'&&i!==0||f.kind==='california-twirl'&&i!==figures.length-1)||totalBeats!==64)throw new Error('A finite poussette-start composition requires an opening partner half poussette/neighbor swing, registered middle figures, and final ring/twirl-to-two-hands within 64 source counts.');
 const dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role])),slots0:DirectedCoupleSlot[]=dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}));
 const targets=(slots:readonly DirectedCoupleSlot[],_binding:GroupBinding)=>{const poses=initialPoses(dancers);for(const d of dancers){const s=slots.find(s=>s.coupleId===d.couple)!,x=.52*(d.role==='lark'?s.direction:-s.direction);poses[d.id].position={x,z:(s.rank-(couples-1)/2)*1.8};poses[d.id].yaw=-Math.sign(x)*Math.PI/2;}return poses;};
 const initialBinding=bindDirectedCoupleSlots(dancers,0,slots0),initial=targets(slots0,initialBinding),sections:CompiledEventSection[]=[],bindings:GroupBinding[]=[],seen=new Map<string,number>();let slots=slots0,poses=initial,period=0,periodStart=0;
 for(let round=0;round<512;round++){
  const state=key(slots),prior=seen.get(state);if(prior!==undefined){const expected=prior===0?initial:sections[prior-1].end;for(const p of poses)if(Math.hypot(p.position.x-expected[p.id].position.x,p.position.z-expected[p.id].position.z)>1e-7||Math.abs(turn(p.yaw,expected[p.id].yaw))>1e-7)throw new Error('Ring-start logical period does not close at the actual named root/facing endpoints.');period=round-prior;periodStart=prior;break;}seen.set(state,round);
  const binding=bindDirectedCoupleSlots(dancers,round,slots),nextSlots=slots.map(s=>({...s})),directions=slots.reduce((a,s)=>{a[s.coupleId]=s.direction;return a;},[] as number[]),turns=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const c of new Set(binding.waitingIds.map(id=>dancers[id].couple))){const s=nextSlots.find(s=>s.coupleId===c)!,end=s.rank===0?'top':s.rank===couples-1?'bottom':undefined;if(!end)throw new Error('A poussette-start waiter cannot be stranded inside the line.');if(s.direction===(end==='top'?-1:1)){turns.set(c,compileSameEndExchange({ids:[c*2,c*2+1],roles,entry:poses,end,roleArrangement:'lark-left',startBeat:4,beats:8,evidence:policy.source}));s.direction=s.direction===1?-1:1;}}
  for(const g of binding.groups){const A=nextSlots.find(s=>s.coupleId===dancers[g.actors[0]].couple)!,B=nextSlots.find(s=>s.coupleId===dancers[g.actors[2]].couple)!;[A.rank,B.rank]=[B.rank,A.rank];}
  const nextBinding=bindDirectedCoupleSlots(dancers,round+1,nextSlots),expected=targets(nextSlots,nextBinding);
  // All destinations retain the persistent partner pair, compact spacing and
  // inward-facing two-hand hold. A topology event never repairs physical slots.
  const section=compileEventSection({dancers,initial:poses,binding,totalBeats,steps:figures.map((figure,i)=>({figure,entryFacingBeats:['swing','balance','ring-balance','california-twirl','half-poussette','hey'].includes(figure.kind)?0:Math.min(1,figure.beats*.12),compile(context){
   if(figure.kind==='half-poussette')return compilePartnerHalfPoussetteFigure(figure as PartnerHalfPoussetteFigure,context);
   if(figure.kind==='ring-balance')return compileRingTransitionFigure(figure,context);
   if(figure.kind==='california-twirl'){const destination=new Map(context.ids.map(id=>[id,{position:{...expected[id].position},yaw:expected[id].yaw,velocity:{x:0,z:0},yawRate:0} as TurnConstraint]));return compilePoussetteTwirlFigure(figure as PoussetteTwirlFigure,context,destination);}
   if(figure.kind==='hey')return compileOrdinaryHalfHeyFigure(figure,context);
   if(figure.kind==='robins-chain'||figure.kind==='ladies-chain')return compileChainFigure(figure,context);
   return compilePrimitiveFigure(figure,context.ids,context.start,context.dancers,directions,{...figureContinuity(figures,i),...(i===1?{swingEntry:'prepared-circle' as const}:{})});
  },inactive(beat:number,incoming:readonly Pose[]){return binding.waitingIds.map(id=>{const plan=turns.get(dancers[id].couple),p=plan?.sample(beat).find(p=>p.id===id)??copy(incoming[id]),q=expected[id],w=ease((beat-(totalBeats-4))/4);return{...p,position:{x:p.position.x+(q.position.x-p.position.x)*w,z:p.position.z+(q.position.z-p.position.z)*w},yaw:p.yaw+turn(q.yaw,p.yaw)*w,stride:w>0&&w<1?.5:p.stride,activity:'waiting' as const};});}}))});
  rebindAtEndpoint(dancers,binding,{id:`${last.id}:next-partner-hold:${round}`,beat:totalBeats,expectedEpoch:round,groups:nextBinding.groups,neighborPairs:[...nextBinding.relations.neighbor].filter(([a,b])=>a<b),waitingIds:nextBinding.waitingIds,evidence:policy.source},section.end,expected,1e-6);
  sections.push(section);bindings.push(binding);poses=section.end.map(copy);slots=nextSlots;
 }
 if(!period)throw new Error('Finite poussette-start progression did not close within its bounded verification budget.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/totalBeats),localBeat=beat-repeat*totalBeats,index=repeat<sections.length?repeat:periodStart+(repeat-periodStart)%period;return{beat,repeat,localBeat,index};};
 const warnings=freeze(['The opening partner two-hand hold is explicitly compact and facing across. The ordinary half poussette keeps room headings fixed during its six-count couple half-orbit, then releases/prepares the current-neighbor swing within two counts.','The final California twirl uses a reviewed three-plus-one split: the full half-twirl, then face the same partner and join both hands. Waiting couples release hands after the first four counts, exchange at the same end over the next eight, and prepare/rejoin during the final four counts.']);
 return Object.freeze({dance,dancers,totalBeats,repeatable:true,starts:freeze([...sections[0].starts]),warnings,topology(beat:number){const s=locate(beat),b=bindings[s.index];return{epoch:s.repeat,neighbors:[...b.relations.neighbor].filter(([a,b])=>a<b),waitingIds:b.waitingIds};},sample(beat:number):Frame{const s=locate(beat),frame=sections[s.index].sample(s.localBeat),waiting=bindings[s.index].waitingIds,strength=Math.max(0,Math.min(1,s.localBeat<4?1-ease((s.localBeat-3.5)/.5):ease((s.localBeat-63.5)/.5))),contacts=[...frame.contacts,...partnerTwoHandContacts(waiting,bindings[s.index].relations.partner,frame.poses,strength)];return{...frame,beat:s.beat,repeat:s.repeat,contacts,warnings:[...warnings,...describeBoundEndEffects(dancers,bindings[s.index],frame.poses,'lark-left',(s.repeat+1)*totalBeats,s.localBeat>=totalBeats-4?'reentry-preparation':'same-end-exchange')]};}});
}
