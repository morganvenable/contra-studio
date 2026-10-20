/** Source-constrained Becket family: chain, partner arch, robin-led neighbor
 * courtesy, exact half hey into a NEW neighbor, neighbor swing, lark allemande,
 * partner swing. Pandora's Box is the retained public acceptance fixture.
 * This is not a registration of arbitrary heys or reverse-Becket dances. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import type {CompiledDance,Dance,Dancer,Figure,Pose,Frame} from './types.ts';
import {createDancers,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileChainFigure} from './chain.ts';
import {compileArchFigure,resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileRightLeftThroughFigure} from './right-left-through-adapter.ts';
import {parseHeyNotation,compileBasicPassEvents} from './hey.ts';
import {compilePartialHey} from './partial-hey.ts';
import {compileEventSection,type BoundFigureStep,type CompiledEventSection} from './event-section.ts';
import {describeBoundEndEffects,ownProgressionDeclaration,bindActorGroups,bindDirectedCoupleSlots,compileSameEndExchange,type DirectedCoupleSlot,type ProgressionEvidence} from './progression-topology.ts';
export interface HalfHeyProgressionSpec {afterFigureId:string;count:1;waitingRoleArrangement:'lark-right';source:ProgressionEvidence;}
export interface CompiledHalfHeyProgression extends CompiledDance {topology(beat:number):{epoch:number;neighbors:Array<[number,number]>;waitingIds:readonly number[]};}
const freeze=<T>(o:T):T=>{if(o&&typeof o==='object'){for(const v of Object.values(o))freeze(v);Object.freeze(o);}return o;};
const copy=(p:Pose)=>({...p,position:{...p.position}}),distance=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const stateKey=(slots:readonly DirectedCoupleSlot[])=>[...slots].sort((a,b)=>a.coupleId-b.coupleId).map(s=>`${s.coupleId}:${s.rank}:${s.direction}`).join('|');
function initialBecket(dancers:readonly Dancer[],slots:readonly DirectedCoupleSlot[]):Pose[]{
 const count=dancers.length/2,binding=bindDirectedCoupleSlots(dancers,0,slots),positions:Pose[]=dancers.map(d=>({id:d.id,position:{x:0,z:0},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 for(const g of binding.groups){const a=dancers[g.actors[0]].couple,b=dancers[g.actors[2]].couple,rank=slots.find(s=>s.coupleId===a)!.rank,center=(rank+.5-(count-1)/2)*1.8;for(const[c,side]of[[a,1],[b,-1]])for(const id of[c*2,c*2+1])positions[id]={...positions[id],position:{x:side*.9,z:center+side*(dancers[id].role==='lark'?1:-1)*.9},yaw:-side*Math.PI/2};}
 for(const id of binding.waitingIds){const s=slots.find(s=>s.coupleId===dancers[id].couple)!;positions[id]={...positions[id],position:{x:-s.direction*(dancers[id].role==='lark'?1:-1)*.9,z:(s.rank-(count-1)/2)*1.8},yaw:s.direction===1?0:Math.PI};}
 return positions;
}
/** This wrapper consumes the right-center literal four-pass sequence and the
 * supplied next-epoch endpoints. Four gates finish before the departure turn. */
export function compileProgressingHalfHey(f:Figure,context:FigureContext,exitPoses:readonly Pose[]):MotionPlan{
 assertFigureArgumentsConsumed(f);resolveBoundFigureRelation(context,'partner');resolveBoundFigureRelation(context,'neighbor');
 if(f.kind!=='hey'||f.beats!==8||f.who!=='all'||f.notation!=='(8) Hey 1/2 (MR;PL;WR;NL)'||f.direction!==undefined||f.amount!==undefined||f.hands!==undefined||f.underRole!==undefined||f.entry!==undefined||f.exit!==undefined||f.progression||f.confidence==='unsupported')throw new Error('The progression hey requires its explicit right-center four-pass contract.');
 const {ids,start,dancers,relations,bindingEpoch}=context;if(bindingEpoch!==relations.epoch||ids.length!==4)throw new Error('The hey must consume four actors at the current relationship epoch.');
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const select=(role:'lark'|'robin',side:number)=>{const actors=ids.filter(id=>dancers[id].role===role&&Math.sign(start[id].position.x-center.x)===side);if(actors.length!==1)throw new Error('The half hey needs one actor of each role on each explicit side.');return actors[0];};
 const wl=select('lark',-1),wr=select('robin',-1),el=select('lark',1),er=select('robin',1);
 if(start[wl].position.z<=center.z||start[el].position.z>=center.z||relations.neighbor.get(wl)!==wr||relations.neighbor.get(el)!==er)throw new Error('The half-hey source has a different current-neighbor role order.');
 for(const id of ids){const p=exitPoses[id];if(!p||p.id!==id||Math.hypot(p.position.x-(2*center.x-start[id].position.x),p.position.z-(2*center.z-start[id].position.z))>.001)throw new Error('An exact half hey must finish its diagonal corner permutation before progression.');}
 const actors=ids.map(id=>({id:String(id),role:dancers[id].role,couple:String(dancers[id].couple)})),events=compileBasicPassEvents(parseHeyNotation(f.notation),actors,[wr,wl,el,er].map(String)).events;
 const constraint=(p:Pose)=>({position:{...p.position},velocity:{x:0,z:0},yaw:p.yaw}),relationship=(map:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(map.get(id)!)]));
 const path=compilePartialHey({actors,events,entry:new Map(ids.map(id=>[String(id),constraint(start[id])])),exit:new Map(ids.map(id=>[String(id),constraint(exitPoses[id])])),frame:{origin:center,axis:{x:1,z:0}},beats:8,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:[2.25,3.75,5.25,6.75],slotSpacing:1.05,passClearance:.66,maximumSpeed:1.2,maximumYawRate:4,relationships:{partner:relationship(relations.partner),neighbor:relationship(relations.neighbor)},source:f.notation});
 const actor=(id:number,t:number)=>path.sample(t*8).poses.find(p=>p.id===String(id))!;return{position:(id,t)=>actor(id,t).position,facing:(id,t)=>actor(id,t).yaw,contacts:()=>[]};
}
export function compileHalfHeyProgressingBecket(input:Dance,couples:number,raw:HalfHeyProgressionSpec):CompiledHalfHeyProgression{
 const dance=freeze(structuredClone(input)),spec=ownProgressionDeclaration(dance,raw);
 if(!Number.isInteger(couples)||couples<2||couples>12||new Set(dance.figures.map(f=>f.id)).size!==dance.figures.length)throw new Error('Choose2–12 couples and unique source figure identities.');
 for(const f of dance.figures)assertFigureArgumentsConsumed(f);
 const figures=structuredClone(dance.figures),signature=figures.map(f=>`${f.kind}:${f.beats}`).join('|');
 if(dance.formation!=='becket'||dance.circulation!=='cw'||spec.count!==1||spec.initialBinding!==undefined||spec.waitingRoleArrangement!=='lark-right'||signature!=='robins-chain:8|balance:4|box-the-gnat:4|right-left-through:8|hey:8|balance:4|swing:12|allemande:8|swing:8')throw new Error('This complete half-hey progression adapter requires the explicitly reviewed source sequence, clockwise circulation and independent lark-right end placement.');
 const [chain,balance,arch,rlt,hey,newBalance,newSwing,allemande,swing]=figures;
 if(chain.who!=='neighbor'||balance.who!=='partner'||balance.hands!=='right'||arch.who!=='partner'||arch.hands!=='right'||arch.underRole!=='robin'||rlt.who!=='neighbor'||rlt.courtesyLeader!=='robin'||rlt.crossingRelation!=='partner'||hey.id!==spec.afterFigureId||newBalance.who!=='neighbor'||newSwing.who!=='neighbor'||allemande.who!=='larks'||allemande.direction!=='left'||allemande.amount!==1.5||swing.who!=='partner'||figures.some((f,i)=>f.progression&&i!==4))throw new Error('Every source relation, courtesy leader, progression point and exit must be consumed explicitly.');
 const dancers=freeze(createDancers(couples)),roles=new Map(dancers.map(d=>[d.id,d.role])),slots0:DirectedCoupleSlot[]=Array.from({length:couples},(_,coupleId)=>({coupleId,rank:coupleId,direction:coupleId===couples-1&&couples%2?-1:coupleId%2?-1:1})),initial=initialBecket(dancers,slots0),totalBeats=64,eventBeat=32,starts=[0,8,12,16,24,32,36,48,56],sections:CompiledEventSection[]=[],seen=new Map<string,number>();
 let poses=initial,slots=slots0,period=0,periodStart=0,carried=bindDirectedCoupleSlots(dancers,0,slots0);
 for(let round=0;round<512;round++){
  const key=stateKey(slots)+'/'+carried.groups.map(g=>g.actors.join(',')).join(';'),prior=seen.get(key);if(prior!==undefined){const expected=prior===0?initial:sections[prior-1].end;if(poses.some(p=>distance(p,expected[p.id])>.01))throw new Error('Logical half-hey closure does not match the actual partner-swing endpoints.');periodStart=prior;period=round-prior;break;}seen.set(key,round);
  const binding=bindActorGroups(dancers,{epoch:round,groups:carried.groups,waitingIds:carried.waitingIds,neighborPairs:[...carried.relations.neighbor].filter(([a,b])=>a<b)}),nextSlots=slots.map(s=>({...s})),directions=slots.reduce((a,s)=>{a[s.coupleId]=s.direction;return a;},[] as number[]);
  for(const g of binding.groups){const a=dancers[g.actors[0]].couple,b=dancers[g.actors[2]].couple,A=nextSlots.find(s=>s.coupleId===a)!,B=nextSlots.find(s=>s.coupleId===b)!;[A.rank,B.rank]=[B.rank,A.rank];}
  const progressed=bindDirectedCoupleSlots(dancers,round+1,nextSlots),expected=poses.map(copy);
  for(const d of dancers){const slot=nextSlots.find(s=>s.coupleId===d.couple)!;expected[d.id].position={x:-.9*(d.role==='lark'?slot.direction:-slot.direction),z:(slot.rank-(couples-1)/2)*1.8};expected[d.id].yaw=slot.direction===1?0:Math.PI;}
  const turns=new Map<number,ReturnType<typeof compileSameEndExchange>>();for(const c of new Set(progressed.waitingIds.map(id=>dancers[id].couple))){const slot=nextSlots.find(s=>s.coupleId===c)!,end=slot.rank===0?'top':slot.rank===couples-1?'bottom':undefined;if(!end)throw new Error('Half-hey progression stranded a couple inside the line.');turns.set(c,compileSameEndExchange({ids:[c*2,c*2+1],roles,entry:expected,end,roleArrangement:'lark-right',startBeat:32,beats:8,evidence:spec.source}));slot.direction=slot.direction===1?-1:1;}
  const change={id:`${hey.id}:new-neighbors:${round}`,beat:eventBeat,expectedEpoch:round,groups:progressed.groups,neighborPairs:[...progressed.relations.neighbor].filter(([a,b])=>a<b),waitingIds:progressed.waitingIds,evidence:spec.source};
  const steps:BoundFigureStep[]=figures.map((figure,i)=>({figure:{...figure,progression:false},entryFacingBeats:i===0||i===7?Math.min(1,figure.beats*.12):0,...(i===5?{before:{change,expected}}:{}),compile(context){const f={...figure,progression:false};if(i===0)return compileChainFigure(f,context);if(i===2)return compileArchFigure(f,{...context,allowArchToCourtesyExit:true});if(i===3)return compileRightLeftThroughFigure(f,context);if(i===4)return compileProgressingHalfHey(f,context,expected);return compilePrimitiveFigure(f,context.ids,context.start,context.dancers,directions,figureContinuity(figures,i));},...(i>=5?{inactive(beat:number){return[...turns.values()].flatMap(p=>p.sample(beat));}}:{})}));
  const section=compileEventSection({dancers,initial:poses,binding,steps,totalBeats});sections.push(section);poses=section.end.map(copy);slots=nextSlots;carried=progressed;
 }
 if(!period)throw new Error('The half-hey finite-line state did not close within the verification budget.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,beat);const repeat=Math.floor(beat/totalBeats),localBeat=beat-repeat*totalBeats,index=repeat<sections.length?repeat:periodStart+(repeat-periodStart)%period;return{beat,repeat,localBeat,section:sections[index]};};
 const warnings=['The exact four-pass half hey changes neighbors at beat32. Out couples exchange at that same physical end during beats32–40, then wait with lark on right and robin on left.','Partial-hey gates and intermediate paths are modeled interpretations; source order, counts, roles and identity endpoints are preserved.'];
 return Object.freeze({dance,dancers,totalBeats,repeatable:true,starts:freeze(starts),warnings:freeze(warnings),topology(beat:number){const s=locate(beat),b=s.section.bindingAt(s.localBeat);return{epoch:s.repeat+Number(s.localBeat>=eventBeat),neighbors:[...b.relations.neighbor].filter(([a,b])=>a<b),waitingIds:b.waitingIds};},sample(beat:number):Frame{const s=locate(beat),frame=s.section.sample(s.localBeat),binding=s.section.bindingAt(s.localBeat),next=s.repeat*totalBeats+(s.localBeat<eventBeat?eventBeat:eventBeat+totalBeats);return{...frame,beat:s.beat,repeat:s.repeat,warnings:[...warnings,...describeBoundEndEffects(dancers,binding,frame.poses,spec.waitingRoleArrangement,next)]};}});
}
