/** Complete source-bound counterclockwise Becket star progression.
 * The lark allemande and neighbor swing physically exchange partner rows; the
 * literal full star returns to those rows before the source's new-neighbor
 * boundary. Circulation, role arrangement and the reviewed finite-end policy
 * are independent. No source title, reflected movie, reset or added travel. */
import {compileAllemandeToNeighborBalance,compileSpaciousNeighborDoSiDo,compileProgressingLeftStar} from './becket-star-figures.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {createDancers,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileEventSection,type BoundFigureStep,type CompiledEventSection} from './event-section.ts';
import {bindActorGroups,bindDirectedCoupleSlots,compileSameEndExchange,describeBoundEndEffects,ownProgressionDeclaration,type DirectedCoupleSlot,type GroupBinding,type ProgressionEvidence} from './progression-topology.ts';
import type {CompiledDance,Dance,Dancer,Pose,Frame} from './types.ts';
export interface BecketStarProgressionSpec {afterFigureId:string;count:1;waitingRoleArrangement:'lark-left';source:ProgressionEvidence;}
export interface CompiledBecketStarProgression extends CompiledDance {period:number;periodStart:number;topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;waitingIds:readonly number[];};}
const freeze=<T>(o:T):T=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const copy=(p:Pose)=>({...p,position:{...p.position}});
const distance=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const turn=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const stateKey=(slots:readonly DirectedCoupleSlot[],binding:GroupBinding)=>[...slots].sort((a,b)=>a.coupleId-b.coupleId).map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|')+'/'+binding.groups.map(g=>g.actors.join(',')).join(';');
/** In CCW Becket the couple travelling down occupies the west sideline, while
 * the couple travelling up occupies the east. Both retain lark-left placement
 * when facing across. A finite waiter is split across its own physical end. */
function becketEntry(dancers:readonly Dancer[],slots:readonly DirectedCoupleSlot[],binding:GroupBinding):Pose[]{
 const count=slots.length,poses:Pose[]=dancers.map(d=>({id:d.id,position:{x:0,z:0},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 for(const g of binding.groups){const down=dancers[g.actors[0]].couple,up=dancers[g.actors[2]].couple,rank=slots.find(s=>s.coupleId===down)!.rank,center=(rank+.5-(count-1)/2)*1.8;for(const[c,side]of[[down,-1],[up,1]])for(const id of[c*2,c*2+1])poses[id]={...poses[id],position:{x:side*.9,z:center+side*(dancers[id].role==='lark'?1:-1)*.9},yaw:-side*Math.PI/2};}
 for(const id of binding.waitingIds){const slot=slots.find(s=>s.coupleId===dancers[id].couple)!;poses[id]={...poses[id],position:{x:.9*(dancers[id].role==='lark'?slot.direction:-slot.direction),z:(slot.rank-(count-1)/2)*1.8},yaw:slot.direction===1?0:Math.PI};}
 return poses;
}
export function compileStarProgressingBecket(input:Dance,couples:number,raw:BecketStarProgressionSpec):CompiledBecketStarProgression{
 const dance=freeze(structuredClone(input)),spec=ownProgressionDeclaration(dance,raw),policy=dance.endPolicy;
 if(!Number.isInteger(couples)||couples<2||couples>12||new Set(dance.figures.map(f=>f.id)).size!==dance.figures.length)throw new Error('Choose 2–12 couples and unique source figure identities.');
 for(const f of dance.figures)assertFigureArgumentsConsumed(f);
 if(!policy||Object.keys(policy).some(k=>!['waitingRoleArrangement','sameEndTurnBeats','reentryPreparationBeats','source'].includes(k))||policy.waitingRoleArrangement!=='lark-left'||policy.sameEndTurnBeats!==8||policy.reentryPreparationBeats!==0||!policy.source||Object.keys(policy.source).some(k=>!['sourceId','url','clause','basis'].includes(k))||policy.source.basis!=='reviewed-interpretation'||!policy.source.sourceId?.trim()||!policy.source.url?.trim()||!policy.source.clause?.trim()||policy.source.sourceId!==spec.source.sourceId||policy.source.url!==spec.source.url)throw new Error('This source omits its finite-end choreography: explicitly review and retain a same-end eight-count exchange with lark-left waiting.');
 const figures=structuredClone(dance.figures),signature=figures.map(f=>`${f.kind}:${f.beats}`).join('|');
 if(dance.formation!=='becket'||dance.circulation!=='ccw'||spec.count!==1||spec.initialBinding!==undefined||spec.waitingRoleArrangement!=='lark-left'||signature!=='long-lines:8|allemande:8|balance:4|swing:12|star:8|do-si-do:8|circle:8|swing:8')throw new Error('This complete star-progression composition requires explicit counterclockwise Becket, its source-counted figures and independent lark-left end choice.');
 const [lines,allemande,balance,neighborSwing,star,dosido,circle,partnerSwing]=figures;
 if(lines.who!=='all'||allemande.who!=='larks'||allemande.direction!=='left'||allemande.amount!==1.5||balance.who!=='neighbor'||neighborSwing.who!=='neighbor'||star.who!=='all'||star.direction!=='left'||star.amount!==1||star.id!==spec.afterFigureId||dosido.who!=='neighbor'||dosido.direction!=='right'||dosido.amount!==1||circle.who!=='all'||circle.direction!=='left'||circle.amount!==.75||partnerSwing.who!=='partner')throw new Error('Every source participant, hand, turn amount and new-neighbor boundary must match the actual composition.');
 const dancers=freeze(createDancers(couples).map(d=>({...d,direction:d.couple%2?1 as const:-1 as const}))),roles=new Map(dancers.map(d=>[d.id,d.role]));
 const slots0:DirectedCoupleSlot[]=Array.from({length:couples},(_,coupleId)=>({coupleId,rank:coupleId===couples-1&&couples%2?coupleId:coupleId%2?coupleId-1:coupleId+1,direction:coupleId%2?1:-1}));
 const firstBinding=bindDirectedCoupleSlots(dancers,0,slots0),initial=becketEntry(dancers,slots0,firstBinding),sections:CompiledEventSection[]=[],seen=new Map<string,number>(),starts=[0,8,16,20,32,40,48,56],totalBeats=64,eventBeat=40;
 let poses=initial,slots=slots0,carried=firstBinding,period=0,periodStart=0;
 for(let round=0;round<512;round++){
  const key=stateKey(slots,carried),prior=seen.get(key);if(prior!==undefined){const expected=prior===0?initial:sections[prior-1].end;if(poses.some(p=>distance(p,expected[p.id])>1e-6||turn(p,expected[p.id])>1e-6))throw new Error('Finite logical closure does not match actual counterclockwise body positions and facing.');periodStart=prior;period=round-prior;break;}seen.set(key,round);
  const binding=bindActorGroups(dancers,{epoch:round,groups:carried.groups,waitingIds:carried.waitingIds,neighborPairs:[...carried.relations.neighbor].filter(([a,b])=>a<b)}),nextSlots=slots.map(s=>({...s})),directions=slots.reduce((values,s)=>{values[s.coupleId]=s.direction;return values;},[] as number[]);
  for(const g of binding.groups){const a=dancers[g.actors[0]].couple,b=dancers[g.actors[2]].couple,A=nextSlots.find(s=>s.coupleId===a)!,B=nextSlots.find(s=>s.coupleId===b)!;[A.rank,B.rank]=[B.rank,A.rank];}
  const progressed=bindDirectedCoupleSlots(dancers,round+1,nextSlots),expected=poses.map(copy);
  for(const d of dancers){const slot=nextSlots.find(s=>s.coupleId===d.couple)!;expected[d.id].position={x:.9*(d.role==='lark'?slot.direction:-slot.direction),z:(slot.rank-(couples-1)/2)*1.8};expected[d.id].yaw=slot.direction===1?0:Math.PI;}
  const turns=new Map<number,ReturnType<typeof compileSameEndExchange>>();
  for(const c of new Set(progressed.waitingIds.map(id=>dancers[id].couple))){const slot=nextSlots.find(s=>s.coupleId===c)!,end=slot.rank===0?'top':slot.rank===couples-1?'bottom':undefined;if(!end)throw new Error('A star progression stranded a couple inside the finite line.');turns.set(c,compileSameEndExchange({ids:[c*2,c*2+1],roles,entry:expected,end,roleArrangement:policy.waitingRoleArrangement,startBeat:eventBeat,beats:policy.sameEndTurnBeats,evidence:policy.source}));slot.direction=slot.direction===1?-1:1;}
  const change={id:`${star.id}:new-neighbors:${round}`,beat:eventBeat,expectedEpoch:round,groups:progressed.groups,neighborPairs:[...progressed.relations.neighbor].filter(([a,b])=>a<b),waitingIds:progressed.waitingIds,evidence:spec.source};
  const steps:BoundFigureStep[]=figures.map((figure,i)=>({figure:{...figure,progression:i===4},entryFacingBeats:figure.kind==='swing'?0:Math.min(1,figure.beats*.125),...(i===5?{before:{change,expected}}:{}),compile(context){const f={...figure,progression:i===4};if(i===1)return compileAllemandeToNeighborBalance(f,context,directions,figures,i);if(i===4)return compileProgressingLeftStar(f,context,directions);if(i===5)return compileSpaciousNeighborDoSiDo(f,context,directions,figures,i);return compilePrimitiveFigure(f,context.ids,context.start,context.dancers,directions,figureContinuity(figures,i));},inactive(beat:number,incoming:readonly Pose[]){return i>=5?[...turns.values()].flatMap(p=>p.sample(beat)):binding.waitingIds.map(id=>({...copy(incoming[id]),stride:0,activity:'waiting' as const}));}}));
  const section=compileEventSection({dancers,initial:poses,binding,steps,totalBeats}),end=becketEntry(dancers,nextSlots,progressed);
  if(section.end.some(p=>distance(p,end[p.id])>1e-6||turn(p,end[p.id])>1e-6))throw new Error('The partner swing does not close to the actual next Becket formation; no reset is inferred.');
  sections.push(section);poses=section.end.map(copy);slots=nextSlots;carried=progressed;
 }
 if(!period)throw new Error('The finite counterclockwise state did not close within the verification budget.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/totalBeats),localBeat=beat-repeat*totalBeats,index=repeat<sections.length?repeat:periodStart+(repeat-periodStart)%period;return{beat,repeat,localBeat,section:sections[index]};};
 const warnings=['The source declares counterclockwise Becket and new neighbors after the eight-count full left star at beat 40.','Finite-end choreography is a retained reviewed choice: turn across the same physical end during beats 40–48, then wait lark-left and re-enter at the next source neighbor change.'];
 return Object.freeze({dance,dancers,totalBeats,repeatable:true,starts:freeze(starts),warnings:freeze(warnings),period,periodStart,topology(beat:number){const s=locate(beat),b=s.section.bindingAt(s.localBeat);return{epoch:s.repeat+Number(s.localBeat>=eventBeat),neighbors:[...b.relations.neighbor].filter(([a,b])=>a<b),waitingIds:b.waitingIds};},sample(beat:number):Frame{const s=locate(beat),frame=s.section.sample(s.localBeat),binding=s.section.bindingAt(s.localBeat),next=s.repeat*totalBeats+(s.localBeat<eventBeat?eventBeat:eventBeat+totalBeats);return{...frame,beat:s.beat,repeat:s.repeat,warnings:[...warnings,...describeBoundEndEffects(dancers,binding,frame.poses,spec.waitingRoleArrangement,next)]};}});
}
