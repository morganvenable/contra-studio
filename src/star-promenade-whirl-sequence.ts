/** Reviewed whole-composition compiler for a source-counted star/whirl middle and
 * terminal partner California twirl. No import, capability or UI registration. */
import {capturePlainData} from './owned-program-cache.ts';
import {createDancers,initialPoses,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileEventSection,type CompiledEventSection,type BoundFigureStep} from './event-section.ts';
import {bindDirectedCoupleSlots,ownProgressionDeclaration,rebindAtEndpoint,compileSameEndExchange,type DirectedCoupleSlot,type GroupBinding} from './progression-topology.ts';
import {compilePetronellaFigure,type PetronellaFigure} from './petronella-adapter.ts';
import {compileRingTransitionFigure} from './ring-transition-adapter.ts';
import {compileCaliforniaTwirlFigure} from './ring-california-adapter.ts';
import {prepareSwingRingExit} from './ring-pair-handoff.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileAllemandeStarPickup,compileStarPromenadeFigure,compileButterflyWhirlFigure,compileWhirlRobinGyre,assertStarPromenadeFigure,assertButterflyWhirlFigure,type StarPromenadeFigure,type ButterflyWhirlFigure,type CarriedFormationState} from './star-promenade-whirl.ts';
import type {FormationState} from './formation-handoff.ts';
import {turn} from './ring-twirl-contract.ts';
import type {Dance,Figure,Pose,Frame,CompiledDance} from './types.ts';
export type StarWhirlFigure=Figure|StarPromenadeFigure|ButterflyWhirlFigure;
export type StarWhirlDance=Omit<Dance,'figures'>&{figures:StarWhirlFigure[];sourceRecord?:{snapshotId:string;sourceUrl:string};sourceText?:string;sourceRows?:readonly unknown[];contraDbInterpretation?:unknown};
export interface CompiledStarWhirlDance extends Omit<CompiledDance,'dance'> {
 readonly dance:StarWhirlDance;readonly periodRepeats:number;
 topology(beat:number):{epoch:number;neighbors:readonly (readonly[number,number])[];partners:readonly (readonly[number,number])[];waitingIds:readonly number[]};
}
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){for(const c of Object.values(v))freeze(c);Object.freeze(v);}return v;};
function recordKeys(value:unknown,allowed:readonly string[],label:string):void {
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Object.keys(value).some(k=>!allowed.includes(k)))throw new Error(`${label} cannot ignore unrelated policy or modifier declarations.`);
}
function assertComposition(dance:StarWhirlDance):void {
 // The public owner captures plain data before this validator reads it. Keep
 // provenance metadata, but never silently accept an unconsumed motion policy.
 recordKeys(dance,['id','title','author','formation','sourceUrl','description','figures','notes','verified','endPolicy','progressionEvents','sourceText','sourceRecord','sourceRows','contraDbInterpretation'],'Star/whirl composition');
 if(!['id','title','author','description','sourceUrl'].every(k=>typeof dance[k as keyof StarWhirlDance]==='string'&&String(dance[k as keyof StarWhirlDance]).trim())||dance.notes!==undefined&&(!Array.isArray(dance.notes)||dance.notes.some(n=>typeof n!=='string'))||dance.verified!==undefined&&typeof dance.verified!=='boolean')throw new Error('Star/whirl source metadata must contain explicit text identity, attribution and supported review status.');
 if(!Array.isArray(dance.figures))throw new Error('A star/whirl composition needs explicit source figures.');
 const f=dance.figures,kinds=['circle','swing','allemande','star-promenade','butterfly-whirl','gyre','swing','ring-balance','petronella','ring-balance','california-twirl'],beats=[4,12,8,4,4,8,8,4,4,4,4];
 if(dance.formation!=='duple-improper'||f.length!==kinds.length||f.some((g,i)=>g.kind!==kinds[i]||g.beats!==beats[i]||g.confidence==='unsupported')||new Set(f.map(g=>g.id)).size!==f.length||f.filter(g=>g.progression).length!==1||f.at(-1)?.progression!==true)throw new Error('This bounded whole source requires circle2/N swing, lark-left1½/star-half/whirl, robin-gyre/P swing, petronella/ring balance/P twirl and only the final progression, in its original64 counts.');
 if(f[0].who!=='all'||f[0].direction!=='left'||f[0].amount!==.5||f[1].who!=='neighbor'||f[6].who!=='partner'||f[7].exit!==undefined||f[9].exit!=='partner-california-twirl')throw new Error('The complete source must retain the declared actors, direction and outgoing relationships.');
 const ordinaryFields:Record<string,readonly string[]>={circle:['who','direction','amount'],swing:['who'],allemande:['who','direction','amount'],gyre:['who','passingShoulder','amount'],'ring-balance':['who','hands','exit'],petronella:['who','direction','amount','spinDirection','spinAmount','entry','exit','clap','phaseBeats'],'california-twirl':['who','hands','underRole','direction','amount','entry']};
 for(const g of f){if(typeof g.id!=='string'||!g.id.trim()||typeof g.label!=='string'||!g.label.trim()||g.notes!==undefined&&typeof g.notes!=='string'||g.confidence!==undefined&&!['verified','approximate'].includes(g.confidence))throw new Error('Every star/whirl source figure requires text identity, label and a recognized confidence.');if(g.kind==='star-promenade')assertStarPromenadeFigure(g as StarPromenadeFigure);else if(g.kind==='butterfly-whirl')assertButterflyWhirlFigure(g as ButterflyWhirlFigure);else{recordKeys(g,['id','kind','beats','label','notes','confidence','progression',...ordinaryFields[g.kind]],'Star/whirl source figure');assertFigureArgumentsConsumed(g);}}
 const p=dance.endPolicy;
 recordKeys(p,['waitingRoleArrangement','sameEndTurnBeats','sameEndTurnOffsetBeats','reentryPreparationBeats','source'],'Star/whirl finite end');
 if(!p||p.waitingRoleArrangement!=='lark-left'||p.sameEndTurnBeats!==8||p.sameEndTurnOffsetBeats!==4||p.reentryPreparationBeats!==0)throw new Error('A star/whirl source needs the retained lark-left same-end exchange on counts4–12 and canonical zero-count reentry policy.');
 recordKeys(p.source,['sourceId','url','clause','basis'],'Star/whirl finite-end evidence');
 if(p.source.basis!=='reviewed-interpretation'||[p.source.sourceId,p.source.url,p.source.clause].some(s=>typeof s!=='string'||!s.trim()))throw new Error('The finite-end interpretation needs complete retained source evidence.');
 const e=dance.progressionEvents?.[0];
 if(!e||!Array.isArray(dance.progressionEvents)||dance.progressionEvents.length!==1||e.count!==1||e.waitingRoleArrangement!=='lark-left'||!e.source||e.source.basis!=='source-explicit'||e.source.sourceId!==p.source.sourceId||e.source.url!==p.source.url||e.source.url!==dance.sourceUrl||e.initialBinding!==undefined)throw new Error('The single terminal progression and retained finite-end interpretation must identify the same actual source and waiting arrangement.');
 if(Object.hasOwn(dance,'sourceRecord')){
  const record=dance.sourceRecord;
  if(!record||typeof record!=='object'||Array.isArray(record)||typeof record.snapshotId!=='string'||!record.snapshotId.trim()||record.snapshotId!==e.source.sourceId||record.sourceUrl!==e.source.url||record.sourceUrl!==dance.sourceUrl)throw new Error('Retained snapshot identity and source URL must match both terminal-event and finite-end evidence.');
 }
 // The topology validator consumes only shared figure metadata and the actual
 // final marker. New kinds stay local until the core owns their registration.
 ownProgressionDeclaration(dance as unknown as Dance,e);
}
export function compileStarWhirlImproper(input:StarWhirlDance,couples:number):CompiledStarWhirlDance {
 input=capturePlainData(input);assertComposition(input);if(!Number.isInteger(couples)||couples<2||couples>12)throw new Error('This finite composition requires2–12 couples.');
 const dance=freeze(input),figures=dance.figures,dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role]));
 const slots0:DirectedCoupleSlot[]=dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}));
 const targets=(slots:readonly DirectedCoupleSlot[])=>{const poses=initialPoses(dancers);for(const d of dancers){const s=slots.find(s=>s.coupleId===d.couple)!;poses[d.id].position={x:.9*(d.role==='lark'?s.direction:-s.direction),z:(s.rank-(couples-1)/2)*1.8};poses[d.id].yaw=s.direction===1?0:Math.PI;}return poses;};
 const initial=targets(slots0),sections:CompiledEventSection[]=[],bindings:GroupBinding[]=[],seen=new Map<string,number>();let poses=initial,slots=slots0,periodRepeats=0;
 for(let round=0;round<128;round++){
  const key=slots.map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|'),prior=seen.get(key);
  if(prior!==undefined){if(prior!==0)throw new Error('The isolated finite choreography cannot hide a transient before its physical period.');for(const p of poses)if(Math.hypot(p.position.x-initial[p.id].position.x,p.position.z-initial[p.id].position.z)>1e-6||Math.abs(turn(p.yaw,initial[p.id].yaw))>1e-6)throw new Error('The actual per-identity root/facing period does not close.');periodRepeats=round;break;}seen.set(key,round);
  const binding=bindDirectedCoupleSlots(dancers,round,slots),nextSlots=slots.map(s=>({...s})),directions=slots.reduce((a,s)=>{a[s.coupleId]=s.direction;return a;},[]as number[]),endTurns=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const couple of new Set(binding.waitingIds.map(id=>dancers[id].couple))){const s=nextSlots.find(s=>s.coupleId===couple)!,end=s.rank===0?'top':s.rank===couples-1?'bottom':undefined;if(!end)throw new Error('An inactive couple is stranded inside the line.');if(s.direction===(end==='top'?-1:1)){endTurns.set(couple,compileSameEndExchange({ids:[couple*2,couple*2+1],roles,entry:poses,end,roleArrangement:'lark-left',startBeat:4,beats:8,evidence:dance.endPolicy!.source}));s.direction=s.direction===1?-1:1;}}
  for(const group of binding.groups){const a=nextSlots.find(s=>s.coupleId===dancers[group.actors[0]].couple)!,b=nextSlots.find(s=>s.coupleId===dancers[group.actors[2]].couple)!;[a.rank,b.rank]=[b.rank,a.rank];}
  const nextBinding=bindDirectedCoupleSlots(dancers,round+1,nextSlots),expected=targets(nextSlots),carried=new Map<string,CarriedFormationState>(),paired=new Map<string,FormationState>();
  let beat=0;const starts=figures.map(f=>{const start=beat;beat+=f.beats;return start;});
  const steps:BoundFigureStep[]=figures.map((figure,i)=>({
   // This local bridge does not dispatch by kind or admit it publicly. The
   // section merely uses each figure's original ID, label and count interval.
   figure:figure as unknown as Figure,entryFacingBeats:i===0?.48:0,
   compile(context){const groupKey=context.ids.join(':');
    if(i===2){const p=compileAllemandeStarPickup(figure as Figure,context,starts[i]);carried.set(groupKey,p.exitState);return p;}
    if(figure.kind==='star-promenade'){const p=compileStarPromenadeFigure(figure as StarPromenadeFigure,context,carried.get(groupKey)!,starts[i]);carried.set(groupKey,p.exitState);return p;}
    if(figure.kind==='butterfly-whirl'){const p=compileButterflyWhirlFigure(figure as ButterflyWhirlFigure,context,carried.get(groupKey)!,starts[i]);paired.set(groupKey,p.exitState);return p;}
    if(figure.kind==='gyre')return compileWhirlRobinGyre(figure,context,paired.get(groupKey)!,starts[i]);
    if(figure.kind==='ring-balance')return compileRingTransitionFigure(figure,context);
    if(figure.kind==='petronella')return compilePetronellaFigure(figure as PetronellaFigure,context);
    if(figure.kind==='california-twirl')return compileCaliforniaTwirlFigure(figure,context);
    const p=compilePrimitiveFigure(figure,context.ids,context.start,dancers,directions,{...figureContinuity(figures as unknown as Figure[],i),...(i===6?{swingEntry:'prepared-circle' as const}:{})});return i===6?prepareSwingRingExit(figure,context,p):p;
   },
   inactive(beat:number,incoming:readonly Pose[]){return binding.waitingIds.map(id=>endTurns.get(dancers[id].couple)?.sample(beat).find(p=>p.id===id)??{...copy(incoming[id]),activity:'waiting' as const,stride:0});}
  }));
  const section=compileEventSection({dancers,initial:poses,binding,totalBeats:64,steps,maximumSpeed:1.8,minimumClearance:.5});
  rebindAtEndpoint(dancers,binding,{id:`${figures.at(-1)!.id}:progression:${round}`,beat:64,expectedEpoch:round,groups:nextBinding.groups,neighborPairs:[...nextBinding.relations.neighbor].filter(([a,b])=>a<b),waitingIds:nextBinding.waitingIds,evidence:dance.progressionEvents![0].source},section.end,expected,1e-6);
  sections.push(section);bindings.push(binding);poses=section.end.map(copy);slots=nextSlots;
 }
 if(!periodRepeats)throw new Error('The finite choreography did not close in its verified bound.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample time must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/64),localBeat=beat-repeat*64,index=repeat%periodRepeats;return{beat,repeat,localBeat,index};};
 const warnings=freeze(['Reviewed source interpretation: larks keep left hands centrally and pick up their persistent partners on the right. The eight-count allemande retains its complete1½ turn; partner pickup prepares within the last2½ source counts.','The source does not state a butterfly fraction. From this exact diagonal half-star endpoint, this interpretation uses a left1⅜ coupled turn in four counts to face across, with larks backing and robins advancing. This is a removable modeled convention, not a fraction specified by the source.','Schematic footwork. The half-star4, butterfly4, robin gyre8 and every other source interval remain unchanged.','Out couples wait four counts, exchange at that same end over eight counts, then wait for the next terminal progression. Persistent partners never change.']);
 return Object.freeze({dance,dancers,totalBeats:64,repeatable:true,periodRepeats,starts:freeze([...sections[0].starts]),warnings,
  topology(beat:number){const s=locate(beat),b=bindings[s.index];return{epoch:s.repeat,neighbors:[...b.relations.neighbor].filter(([a,b])=>a<b),partners:[...b.relations.partner].filter(([a,b])=>a<b),waitingIds:b.waitingIds};},
  sample(beat:number):Frame{const s=locate(beat),frame=sections[s.index].sample(s.localBeat);return{...frame,beat:s.beat,repeat:s.repeat,warnings:[...warnings]};}
 });
}
