/** A finite improper sequence with an explicit already-held neighbor swing at
 * its opening. The final current-neighbor pass physically reaches the next
 * closed frames or waiting ends before the neighbor epoch changes. */
import {createDancers,initialPoses,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {assertFigureArgumentsConsumed,assertProgressionMarkers} from './figure-semantics.ts';
import {compileChainFigure} from './chain.ts';
import {compileRingBalanceFigure} from './ring-california-adapter.ts';
import {compileSwingStartPass} from './swing-start-pass.ts';
import {compileEventSection,type CompiledEventSection} from './event-section.ts';
import {bindDirectedCoupleSlots,ownProgressionDeclaration,rebindAtEndpoint,compileSameEndExchange,describeBoundEndEffects,type DirectedCoupleSlot,type GroupBinding} from './progression-topology.ts';
import {ease,heading,turn,type TurnConstraint} from './ring-twirl-contract.ts';
import type {CompiledDance,Dance,Pose,Frame,HandContact} from './types.ts';
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const copy=(p:Pose):Pose=>({...p,position:{...p.position}}),key=(slots:readonly DirectedCoupleSlot[])=>slots.map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|');
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
export function compileSwingStartImproper(input:Dance,couples:number):CompiledDance&{periodRepeats:number;topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;waitingIds:readonly number[]}}{
 const dance=freeze(structuredClone(input)),figures=dance.figures,first=figures[0],last=figures.at(-1),policy=dance.endPolicy,totalBeats=figures.reduce((n,f)=>n+f.beats,0);
 if(!Number.isInteger(couples)||couples<2||couples>12||dance.formation!=='duple-improper'||dance.circulation!==undefined||dance.ovalPolicy!==undefined||totalBeats!==64||new Set(figures.map(f=>f.id)).size!==figures.length)throw new Error('A prepared opening swing needs a complete64-count improper source and2–12 couples.');
 if(!policy||Object.keys(policy).some(k=>!['waitingRoleArrangement','sameEndTurnBeats','sameEndTurnOffsetBeats','reentryPreparationBeats','source'].includes(k))||policy.waitingRoleArrangement!=='lark-left'||policy.sameEndTurnOffsetBeats!==4||policy.sameEndTurnBeats!==8||policy.reentryPreparationBeats!==4||!policy.source||Object.keys(policy.source).some(k=>!['sourceId','url','clause','basis'].includes(k))||policy.source.basis!=='reviewed-interpretation'||['sourceId','url','clause'].some(k=>typeof(policy.source as any)[k]!=='string'||!(policy.source as any)[k].trim()))throw new Error('The closed opening frame needs its separately reviewed offset-four/eight-count exchange/four-count reentry policy.');
 const event=dance.progressionEvents?.[0];if(!event||dance.progressionEvents!.length!==1||dance.sourceUrl!==undefined&&dance.sourceUrl!==policy.source.url||event.source.sourceId!==policy.source.sourceId||event.source.url!==policy.source.url)throw new Error('Opening-frame progression and finite-end evidence must refer to the same retained source.');
 const record=(dance as Dance & {sourceRecord?:{sourceUrl?:unknown;snapshotId?:unknown}}).sourceRecord;
 if(record!==undefined&&(!record||typeof record!=='object'||record.sourceUrl!==policy.source.url||record.snapshotId!==policy.source.sourceId))throw new Error('Opening-frame evidence must match the supplied immutable source record URL and snapshot identity.');
 const owned=ownProgressionDeclaration(dance,{afterFigureId:last?.id??'',count:1,waitingRoleArrangement:'lark-left',source:event.source});if(owned.initialBinding!==undefined)throw new Error('A prepared opening frame does not consume delayed first-pass binding.');
 assertProgressionMarkers(figures,figures.length-1);for(const f of figures)assertFigureArgumentsConsumed(f);
 const allowed=new Set(['swing','balance','long-lines','allemande','do-si-do','circle','robins-chain','ladies-chain','ring-balance','pass-through']);
 if(first?.kind!=='swing'||first.who!=='neighbor'||first.entry!=='closed-neighbor-frame'||first.exit!==undefined||first.beats<8||last?.kind!=='pass-through'||last.beats!==4||last.who!=='neighbor'||last.entry!=='ring'||last.exit!=='next-neighbor-swing'||last.passingShoulder!=='right'||figures.at(-2)?.kind!=='ring-balance'||figures.some((f,i)=>!allowed.has(f.kind)||f.confidence==='unsupported'||f.kind==='pass-through'&&i!==figures.length-1||f.kind==='swing'&&f.entry!==undefined&&i!==0))throw new Error('A closed-neighbor opening requires the explicit prepared swing and terminal right-shoulder ring-to-next-swing pass contract.');
 const dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role])),slots0:DirectedCoupleSlot[]=dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction}));
 const targets=(slots:readonly DirectedCoupleSlot[],binding:GroupBinding):Pose[]=>{
  const poses=initialPoses(dancers);for(const d of dancers){const s=slots.find(s=>s.coupleId===d.couple)!;poses[d.id].position={x:.9*(d.role==='lark'?s.direction:-s.direction),z:(s.rank-(couples-1)/2)*1.8};poses[d.id].yaw=s.direction===1?0:Math.PI;}
  for(const g of binding.groups){const z=g.actors.reduce((sum,id)=>sum+poses[id].position.z,0)/4;for(const id of g.actors){const p=poses[id];p.position.z=z+Math.sign(p.position.z-z)*.31;p.yaw=heading(p.position,{x:p.position.x,z})+Math.PI/3;}}
  return poses;
 };
 const initialBinding=bindDirectedCoupleSlots(dancers,0,slots0),initial=targets(slots0,initialBinding),sections:CompiledEventSection[]=[],bindings:GroupBinding[]=[],nextBindings:GroupBinding[]=[],nextTargets:Pose[][]=[],seen=new Map<string,number>();let slots=slots0,poses=initial,period=0,periodStart=0;
 for(let round=0;round<512;round++){
  const state=key(slots),prior=seen.get(state);if(prior!==undefined){const expected=prior===0?initial:sections[prior-1].end;for(const p of poses)if(Math.hypot(p.position.x-expected[p.id].position.x,p.position.z-expected[p.id].position.z)>1e-7||Math.abs(turn(p.yaw,expected[p.id].yaw))>1e-7)throw new Error('Prepared opening-swing period does not close at actual named body endpoints.');period=round-prior;periodStart=prior;break;}seen.set(state,round);
  const binding=bindDirectedCoupleSlots(dancers,round,slots),nextSlots=slots.map(s=>({...s})),directions=slots.reduce((a,s)=>{a[s.coupleId]=s.direction;return a;},[] as number[]),turns=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const c of new Set(binding.waitingIds.map(id=>dancers[id].couple))){const s=nextSlots.find(s=>s.coupleId===c)!,end=s.rank===0?'top':s.rank===couples-1?'bottom':undefined;if(!end)throw new Error('Prepared opening waiters must stay at a physical finite end.');if(s.direction===(end==='top'?-1:1)){turns.set(c,compileSameEndExchange({ids:[c*2,c*2+1],roles,entry:poses,end,roleArrangement:'lark-left',startBeat:4,beats:8,evidence:policy.source}));s.direction=s.direction===1?-1:1;}}
  for(const g of binding.groups){const a=nextSlots.find(s=>s.coupleId===dancers[g.actors[0]].couple)!,b=nextSlots.find(s=>s.coupleId===dancers[g.actors[2]].couple)!;[a.rank,b.rank]=[b.rank,a.rank];}
  const nextBinding=bindDirectedCoupleSlots(dancers,round+1,nextSlots),expected=targets(nextSlots,nextBinding);
  const section=compileEventSection({dancers,initial:poses,binding,totalBeats,steps:figures.map((figure,i)=>({figure,entryFacingBeats:['swing','ring-balance','pass-through'].includes(figure.kind)?0:Math.min(1,figure.beats*.12),compile(context){
   if(figure.kind==='ring-balance')return compileRingBalanceFigure(figure,context);
   if(figure.kind==='pass-through'){
    const center={x:context.ids.reduce((n,id)=>n+context.start[id].position.x,0)/4,z:context.ids.reduce((n,id)=>n+context.start[id].position.z,0)/4};
    const cyclicIds=[...context.ids].sort((a,b)=>Math.atan2(context.start[a].position.z-center.z,context.start[a].position.x-center.x)-Math.atan2(context.start[b].position.z-center.z,context.start[b].position.x-center.x))as[number,number,number,number];
    const constraint=(p:Pose):TurnConstraint=>({position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0});
    return compileSwingStartPass({actors:context.ids.map(id=>dancers[id]),entry:new Map(context.ids.map(id=>[id,constraint(context.start[id])])),exit:new Map(context.ids.map(id=>[id,constraint(expected[id])])),relations:context.relations,bindingEpoch:context.bindingEpoch,cyclicIds,frame:{origin:center,axis:{x:0,z:1}},beats:4,relation:'neighbor',passingShoulder:'right'});
   }
   if(figure.kind==='robins-chain'||figure.kind==='ladies-chain')return compileChainFigure(figure,context);
   return compilePrimitiveFigure(i===0?{...figure,entry:undefined}:figure,context.ids,context.start,context.dancers,directions,{...figureContinuity(figures,i),...(i===0?{swingEntry:'prepared-circle' as const}:{})});
  },inactive(beat,incoming){return binding.waitingIds.map(id=>{const plan=turns.get(dancers[id].couple),p=plan?.sample(beat).find(p=>p.id===id)??copy(incoming[id]),q=expected[id],w=ease((beat-60)/4);return{...p,position:{x:p.position.x+(q.position.x-p.position.x)*w,z:p.position.z+(q.position.z-p.position.z)*w},yaw:p.yaw+turn(q.yaw,p.yaw)*w,stride:w>0&&w<1?.5:p.stride,activity:'waiting' as const};});}}))});
  rebindAtEndpoint(dancers,binding,{id:`${last.id}:next-frame:${round}`,beat:64,expectedEpoch:round,groups:nextBinding.groups,neighborPairs:[...nextBinding.relations.neighbor].filter(([a,b])=>a<b),waitingIds:nextBinding.waitingIds,evidence:event.source},section.end,expected,1e-6);
  sections.push(section);bindings.push(binding);nextBindings.push(nextBinding);nextTargets.push(expected);poses=section.end.map(copy);slots=nextSlots;
 }
 if(!period)throw new Error('Prepared initial-frame progression did not close in its bounded period search.');
 const nextFrames=sections.map((_,i)=>nextBindings[i].groups.map(g=>compilePrimitiveFigure({...first,entry:undefined},[...g.actors],nextTargets[i],dancers,dancers.filter(d=>d.role==='lark').map(d=>d.direction),{swingEntry:'prepared-circle'})));
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/64),localBeat=beat-repeat*64,index=repeat<sections.length?repeat:periodStart+(repeat-periodStart)%period;return{beat,repeat,localBeat,index};};
 const warnings=freeze(['Animation starting convention: active neighbors begin in an already-held closed swing frame, so the opening source count turns immediately.','The final four-count right-shoulder pass physically reaches each next-neighbor frame or waiting end, with frame acquisition inside its final count. This spacing and facing convention is reviewed explicitly.','Out couples wait four counts, exchange at the same end over the next eight, then prepare their next frame during the final four-count pass.']);
 return Object.freeze({dance,dancers,totalBeats:64,repeatable:true,periodRepeats:period,starts:freeze([...sections[0].starts]),warnings,topology(beat:number){const s=locate(beat),b=bindings[s.index];return{epoch:s.repeat,neighbors:[...b.relations.neighbor].filter(([a,b])=>a<b),waitingIds:b.waitingIds};},sample(beat:number):Frame{
  const s=locate(beat),frame=sections[s.index].sample(s.localBeat),preparation=ease(s.localBeat-63),strength=preparation,virtual=nextFrames[s.index].flatMap(p=>p.contacts(0,frame.poses)),futureIds=new Set(nextBindings[s.index].groups.flatMap(g=>[...g.actors]));
  const poses=preparation>0?frame.poses.map(p=>futureIds.has(p.id)?{...p,swingPreparation:{armRoute:'pass-to-swing' as const,contacts:virtual,strength:preparation}}:p):frame.poses;
  const proposed:HandContact[]=strength>0?[...frame.contacts,...virtual.map(c=>({...c,strength:c.strength*strength}))]:frame.contacts;
  // Match the ordinary runtime's reachable-hand release/acquisition contract.
  // Topology does not make an out-of-reach wrist a full-strength handhold.
  const contacts=proposed.map(c=>{const reach=(id:number,hand:'left'|'right')=>{const p=poses[id],side=hand==='left'?1:-1;return Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-(1.355-(p.arch?.kneeLowering??0)),c.point.z-p.position.z+side*.235*Math.sin(p.yaw));},distance=Math.max(reach(c.a,c.handA),c.target&&c.target!=='hands'?0:reach(c.b,c.handB));return{...c,strength:c.strength*smooth((.68-distance)/(c.kind==='swing-frame'||c.kind==='arch'?.035:.06))};}).filter(c=>c.strength>(frame.figureIndex===figures.length-1?0:.01));
  return{...frame,beat:s.beat,repeat:s.repeat,poses,contacts,warnings:[...warnings,...describeBoundEndEffects(dancers,bindings[s.index],poses,'lark-left',(s.repeat+1)*64,s.localBeat>=60?'reentry-preparation':'same-end-exchange')]};
 }});
}
