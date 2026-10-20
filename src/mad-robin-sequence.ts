/** Reviewed whole-source composition for two full-return mad robins. The middle
 * already exchanges persistent couple ranks. The last orbit completes around
 * OLD neighbors; only its source-marked endpoint changes the neighbor epoch.
 * No shared engine, source parser, capability or UI registration imports this. */
import {capturePlainData} from './owned-program-cache.ts';
import {createDancers,initialPoses,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileEventSection,type BoundFigureStep,type CompiledEventSection} from './event-section.ts';
import {compileMadRobin,assertMadRobinFigure,type MadRobinFigure,type MadRobinPassage} from './mad-robin.ts';
import {captureFormationState,assertSuccessorEntry,sampleFormationEndpoint,type FormationState} from './formation-handoff.ts';
import {bindDirectedCoupleSlots,rebindAtEndpoint,ownProgressionDeclaration,compileSameEndExchange,type DirectedCoupleSlot,type GroupBinding,type ProgressionEvidence} from './progression-topology.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import type {Dance,Figure,Pose,Frame,CompiledDance,HandContact} from './types.ts';
export type MadRobinSequenceFigure=Figure|MadRobinFigure;
export interface MadRobinSequencePolicy {
 readonly terminal:'full-return-around-old-neighbor';readonly repeatEntry:'clockwise-around-next-neighbor';
 readonly facing:'persistent-partner-across';readonly endFacing:'persistent-partner';
 readonly allemandeEntryFacingBeats:1;readonly allemandeExitFacingBeats:1;readonly circleEntryFacingBeats:.75;
 readonly source:ProgressionEvidence;
}
export type MadRobinDance=Omit<Dance,'figures'>&{figures:MadRobinSequenceFigure[];madRobinPolicy:MadRobinSequencePolicy;sourceRecord?:{snapshotId:string;sourceUrl:string};sourceText?:string;sourceRows?:readonly unknown[];contraDbInterpretation?:unknown};
export interface MadRobinBoundaryProof {readonly repeat:number;readonly entry:FormationState;readonly exit:FormationState;readonly passages:readonly MadRobinPassage[];}
export interface CompiledMadRobinDance extends Omit<CompiledDance,'dance'> {
 readonly dance:MadRobinDance;readonly periodRepeats:number;readonly madRobinProofs:readonly MadRobinBoundaryProof[];
 topology(beat:number):{epoch:number;neighbors:readonly(readonly[number,number])[];partners:readonly(readonly[number,number])[];waitingIds:readonly number[]};
}
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;};
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
const heading=(a:Pose['position'],b:Pose['position'])=>Math.atan2(b.x-a.x,b.z-a.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const ease=(q:number)=>{const t=Math.max(0,Math.min(1,q));return t*t*t*(10+t*(-15+6*t));};
function keys(o:object,allowed:readonly string[],what:string){if(!o||Object.keys(o).some(k=>!allowed.includes(k)))throw new Error(`The mad-robin ${what} cannot ignore an extra declaration.`);}
function assertComposition(d:MadRobinDance):void {
 keys(d,['id','title','author','formation','sourceUrl','description','figures','notes','verified','progressionEvents','endPolicy','madRobinPolicy','sourceRecord','sourceText','sourceRows','contraDbInterpretation'],'dance');
 if(!['id','title','author','description','sourceUrl'].every(k=>typeof d[k as keyof MadRobinDance]==='string'&&String(d[k as keyof MadRobinDance]).trim())||d.notes!==undefined&&(!Array.isArray(d.notes)||d.notes.some(n=>typeof n!=='string'))||d.verified!==undefined&&typeof d.verified!=='boolean')throw new Error('The mad-robin composition needs explicit text metadata and source attribution.');
 const f=d.figures,kind=['mad-robin','allemande','balance','swing','circle','swing','long-lines','mad-robin'],beats=[8,8,4,12,6,10,8,8];
 if(d.formation!=='duple-improper'||!Array.isArray(f)||f.length!==8||f.some((x,i)=>x.kind!==kind[i]||x.beats!==beats[i]||x.confidence==='unsupported')||new Set(f.map(x=>x.id)).size!==8||f.filter(x=>x.progression===true).length!==1||f[7].progression!==true)throw new Error('This bounded mad-robin composition requires the complete original 64-count improper sequence and its sole final source marker.');
 for(const x of f){
  if(x.kind==='mad-robin')assertMadRobinFigure(x as MadRobinFigure);else{
   keys(x,['id','label','beats','notes','confidence','progression','kind','who',...(['allemande','circle'].includes(x.kind)?['direction','amount']:[])],'middle figure');
   if(typeof x.id!=='string'||!x.id.trim()||typeof x.label!=='string'||!x.label.trim()||x.notes!==undefined&&typeof x.notes!=='string'||x.confidence!==undefined&&!['verified','approximate'].includes(x.confidence))throw new Error('Every source figure requires plain text identity and supported confidence.');
   assertFigureArgumentsConsumed(x);
  }
 }
 for(const [i,direction]of[[0,'clockwise'],[7,'counterclockwise']]as const){const m=f[i]as MadRobinFigure;if(m.orbitRelation!=='neighbor'||m.facingRelation!=='partner'||m.frontRole!=='robin'||m.orbitDirection!==direction)throw new Error('The source composition requires robin-front clockwise opening and counterclockwise terminal orbits about current neighbors while facing partners.');}
 if(f[1].who!=='robins'||f[1].direction!=='right'||f[1].amount!==1.5||f[2].who!=='partner'||f[3].who!=='partner'||f[4].who!=='all'||f[4].direction!=='left'||f[4].amount!==.75||f[5].who!=='neighbor'||f[6].who!=='all')throw new Error('The middle must retain robin right1½, partner balance/swing, circle left¾, neighbor swing and all-four long lines.');
 const p=d.madRobinPolicy;
 keys(p,['terminal','repeatEntry','facing','endFacing','allemandeEntryFacingBeats','allemandeExitFacingBeats','circleEntryFacingBeats','source'],'interpretation');
 if(p.terminal!=='full-return-around-old-neighbor'||p.repeatEntry!=='clockwise-around-next-neighbor'||p.facing!=='persistent-partner-across'||p.endFacing!=='persistent-partner'||p.allemandeEntryFacingBeats!==1||p.allemandeExitFacingBeats!==1||p.circleEntryFacingBeats!==.75)throw new Error('The terminal/repeat hook and all within-source facing preparations need their separate explicit reviewed interpretation.');
 const e=d.progressionEvents?.[0],end=d.endPolicy;
 if(!e||d.progressionEvents?.length!==1||e.afterFigureId!==f[7].id||e.count!==1||e.waitingRoleArrangement!=='lark-left'||e.initialBinding!==undefined||e.source.basis!=='source-explicit')throw new Error('Mad robin requires one source-marked endpoint event, never an inferred extra progression.');
 if(Object.hasOwn(d,'sourceRecord')){const r=d.sourceRecord;if(!r||r.snapshotId!==e.source.sourceId||r.sourceUrl!==e.source.url||r.sourceUrl!==d.sourceUrl)throw new Error('The retained mad-robin snapshot and URL must match the terminal event and reviewed choices.');}
 ownProgressionDeclaration(d as unknown as Dance,e);
 if(!end)throw new Error('A mad-robin finite line requires its reviewed same-end exchange.');
 keys(end,['waitingRoleArrangement','sameEndTurnBeats','sameEndTurnOffsetBeats','reentryPreparationBeats','source'],'end policy');
 if(end.waitingRoleArrangement!=='lark-left'||end.sameEndTurnBeats!==8||end.sameEndTurnOffsetBeats!==0||end.reentryPreparationBeats!==0)throw new Error('Out couples must use the explicit first-eight-count same-end exchange and then wait facing their persistent partner.');
 for(const s of[p.source,end.source]){keys(s,['sourceId','url','clause','basis'],'reviewed source evidence');if(s.basis!=='reviewed-interpretation'||!s.clause?.trim()||s.sourceId!==e.source.sourceId||s.url!==e.source.url||s.url!==d.sourceUrl)throw new Error('Hook and finite-end choices must bind to the exact source identity of the terminal event.');}
}
function formation(c:FigureContext,sourceBeat:number,heldContacts:readonly HandContact[]=[]):FormationState {
 const {ids,start}=c,origin={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 const orderedIds=[...ids].sort((a,b)=>Math.sign(start[a].position.x-origin.x)-Math.sign(start[b].position.x-origin.x)||start[a].position.z-start[b].position.z);
 return captureFormationState(c,{sourceBeat,orderedIds,geometry:{kind:'paired-sidelines',sidePair:'neighbor',origin,halfWidth:.9,pairGap:1.8},heldContacts});
}
/** The source eight-count robin turn retains every 1½ orbit. Its first/last
 * count owns only body-facing transitions to/from the distinct partner gaze.
 * No root repair, held-hand drop or extra count is hidden at the two joins. */
function robinAllemande(f:Figure,c:FigureContext,entry:FormationState,directions:number[]):MotionPlan {
 const base=compilePrimitiveFigure(f,c.ids,c.start,c.dancers,directions),last=sampleFormationEndpoint(c,base,1),robins=c.ids.filter(id=>c.dancers[id].role==='robin');
 const plan:MotionPlan={position:base.position,contacts:base.contacts,facing(id,t,poses){
  const target=heading(last[id].position,last[c.relations.partner.get(id)!].position),start=c.start[id].yaw;
  if(!robins.includes(id))return start+turn(target,start)*ease((t*8-7));
  const natural=base.facing(id,t,poses),inward=start+turn(natural,start)*ease(t*8);
  if(t<=7/8)return inward;
  const anchor=base.facing(id,7/8,poses),current=anchor+turn(natural,anchor),end=anchor+turn(target,anchor);return current+(end-current)*ease(t*8-7);
 }};assertSuccessorEntry(entry,c,plan);return plan;
}
export function compileMadRobinImproper(input:MadRobinDance,couples:number):CompiledMadRobinDance {
 const dance=freeze(capturePlainData(input));assertComposition(dance);
 if(!Number.isInteger(couples)||couples<2||couples>12)throw new Error('This finite mad-robin composition requires 2–12 couples.');
 const dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role])),figures=dance.figures;
 const slots0:DirectedCoupleSlot[]=dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}));
 const targets=(slots:readonly DirectedCoupleSlot[])=>{const poses=initialPoses(dancers);for(const d of dancers){const s=slots.find(s=>s.coupleId===d.couple)!;poses[d.id].position={x:.9*(d.role==='lark'?s.direction:-s.direction),z:(s.rank-(couples-1)/2)*1.8};poses[d.id].yaw=-Math.sign(poses[d.id].position.x)*Math.PI/2;}return poses;};
 const initial=targets(slots0),sections:CompiledEventSection[]=[],bindings:GroupBinding[]=[],proofs:MadRobinBoundaryProof[]=[],seen=new Map<string,number>();let poses=initial,slots=slots0,periodRepeats=0;
 for(let round=0;round<128;round++){
  const key=slots.map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|'),prior=seen.get(key);
  if(prior!==undefined){if(prior!==0)throw new Error('A finite mad-robin period cannot conceal a transient.');for(const p of poses)if(Math.hypot(p.position.x-initial[p.id].position.x,p.position.z-initial[p.id].position.z)>1e-6||Math.abs(turn(p.yaw,initial[p.id].yaw))>1e-6)throw new Error('Mad-robin roots/facing did not close their actual per-identity finite period.');periodRepeats=round;break;}seen.set(key,round);
  const binding=bindDirectedCoupleSlots(dancers,round,slots),nextSlots=slots.map(s=>({...s})),directions=slots.reduce((a,s)=>{a[s.coupleId]=s.direction;return a;},[]as number[]),endTurns=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const couple of new Set(binding.waitingIds.map(id=>dancers[id].couple))){const s=nextSlots.find(s=>s.coupleId===couple)!,end=s.rank===0?'top':s.rank===couples-1?'bottom':undefined;if(!end)throw new Error('An inactive mad-robin couple is stranded inside the line.');if(s.direction===(end==='top'?-1:1)){endTurns.set(couple,compileSameEndExchange({ids:[couple*2,couple*2+1],roles,entry:poses,end,roleArrangement:'lark-left',startBeat:0,beats:8,evidence:dance.endPolicy!.source}));s.direction=s.direction===1?-1:1;}}
  for(const group of binding.groups){const a=nextSlots.find(s=>s.coupleId===dancers[group.actors[0]].couple)!,b=nextSlots.find(s=>s.coupleId===dancers[group.actors[2]].couple)!;[a.rank,b.rank]=[b.rank,a.rank];}
  const nextBinding=bindDirectedCoupleSlots(dancers,round+1,nextSlots),expected=targets(nextSlots),paired=new Map<string,FormationState>(),previousContacts=new Map<string,HandContact[]>();
  let beat=0;const starts=figures.map(f=>{const start=beat;beat+=f.beats;return start;});
  const steps:BoundFigureStep[]=figures.map((figure,i)=>({figure:figure as unknown as Figure,entryFacingBeats:i===4?.75:0,
   compile(c){const key=c.ids.join(':');let p:MotionPlan;
    if(figure.kind==='mad-robin'){
     const entry=formation(c,round*64+starts[i],previousContacts.get(key)??[]),m=compileMadRobin(figure as MadRobinFigure,entry);assertSuccessorEntry(entry,c,m);paired.set(key,m.exitState);proofs.push({repeat:round,entry:m.entryState,exit:m.exitState,passages:m.passages});p=m;
    }else if(i===1)p=robinAllemande(figure,c,paired.get(key)!,directions);
    else p=compilePrimitiveFigure(figure,c.ids,c.start,dancers,directions,figureContinuity(figures as unknown as Figure[],i));
    const end=sampleFormationEndpoint(c,p,1);previousContacts.set(key,p.contacts(1,end));return p;
   },
   inactive(beat,incoming){return binding.waitingIds.map(id=>{const exchange=endTurns.get(dancers[id].couple);if(!exchange)return{...copy(incoming[id]),activity:'waiting' as const,stride:0};const pair=exchange.sample(beat),p=pair.find(p=>p.id===id)!,other=pair.find(p=>p.id!==id)!;return{...p,yaw:heading(p.position,other.position)};});}
  }));
  const section=compileEventSection({dancers,initial:poses,binding,totalBeats:64,steps,maximumSpeed:1.8,minimumClearance:.60});
  // This is an assertion on the already sampled final orbit, never a transform.
  rebindAtEndpoint(dancers,binding,{id:`${figures[7].id}:progression:${round}`,beat:(round+1)*64,expectedEpoch:round,groups:nextBinding.groups,neighborPairs:[...nextBinding.relations.neighbor].filter(([a,b])=>a<b),waitingIds:nextBinding.waitingIds,evidence:dance.progressionEvents![0].source},section.end,expected,1e-6);
  sections.push(section);bindings.push(binding);poses=section.end.map(copy);slots=nextSlots;
 }
 if(!periodRepeats)throw new Error('The finite mad-robin choreography did not close in its checked bound.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Mad-robin sample time must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/64),localBeat=beat-repeat*64,index=repeat%periodRepeats;return{beat,repeat,localBeat,index};};
 const warnings=freeze(['Reviewed interpretation: face the persistent partner across while orbiting the current neighbor, robins initially in front. The first full return is clockwise; the final full return is counterclockwise in its different role layout.','The middle figures exchange couple ranks. The terminal eight-count mad robin adds no net progression displacement and keeps the old neighbor through its final count. Only its marked endpoint binds the next neighbor for the next clockwise mad robin. This is the separately reviewed, removable interpretation of the source hook.','The robin allemande uses its first and last source count for facing preparation while retaining all 1½ turns. The circle uses its first three-quarter count for inward-facing preparation.','Out couples exchange at the same physical end over the first eight counts, facing their persistent partner, then remain still. This finite-end interpretation is not stated by the source. Schematic footwork; no limb-accuracy claim.']);
 return Object.freeze({dance,dancers,totalBeats:64,repeatable:true,periodRepeats,madRobinProofs:freeze(proofs),starts:freeze([...sections[0].starts]),warnings,
  topology(beat:number){const s=locate(beat),b=bindings[s.index];return{epoch:s.repeat,neighbors:[...b.relations.neighbor].filter(([a,b])=>a<b),partners:[...b.relations.partner].filter(([a,b])=>a<b),waitingIds:[...b.waitingIds]};},
  sample(beat:number):Frame{const s=locate(beat),frame=sections[s.index].sample(s.localBeat);return{...frame,beat:s.beat,repeat:s.repeat,warnings:[...warnings]};}
 });
}
