/** Explicit experimental Becket operations over carried full-set wave seams.
 * No source identity selects a path; every operation validates its own input. */
import {capturePlainData} from './owned-program-cache.ts';
import {createFiniteBecketState,finiteBecketPoses} from './progression-topology.ts';
import {createDancers,compilePrimitiveFigure} from './engine.ts';
import {captureBecketSliceBoundary} from './becket-slice-step.ts';
import {compileBecketCirclePassStep,type BecketCirclePassOptions} from './becket-circle-pass-step.ts';
import {captureSequenceBoundary} from './sequence-boundary.ts';
import {compileReleasedChainStep} from './released-chain-step.ts';
import {compileCarriedHeyWaveProducer,type CarriedHeyWaveSpec,type CarriedReleasedHeyState} from './carried-hey-wave-producer.ts';
import {compileCarriedWaveCirculate,type CarriedWaveState,type CarriedWaveCirculateSpec,type CarriedWaveBalanceExitSpec,type CarriedPairedBalanceState} from './carried-wave-circulate.ts';
import {compileCarriedPairedBalanceSwing,type CarriedPairedBalanceSwingSpec} from './carried-paired-balance-swing.ts';
import type {Figure,Pose,HandContact} from './types.ts';
export type BecketWaveOperation=
 |{mode:'circle-pass';circle:Figure;pass:Figure;options:BecketCirclePassOptions}
 |{mode:'released-swing';figure:Figure;closeBeats:1.25;acquireBeats:.5;releaseBeats:1}
 |{mode:'chain';figure:Figure;receiverYield:.3}
 |{mode:'hey-wave';figure:Figure;spec:Omit<CarriedHeyWaveSpec,'exitPoses'>;halfDepth:.64}
 |{mode:'circulate';figure:Omit<Figure,'loopDirection'>&{loopDirection:'left'|'right'};spec:CarriedWaveCirculateSpec|CarriedWaveBalanceExitSpec}
 |{mode:'paired-finish';balance:Figure;swing:Figure;spec:CarriedPairedBalanceSwingSpec};
export interface BecketWaveProgram {id:string;title:string;sourceId:string;sourceUrl:string;operations:readonly BecketWaveOperation[];}
const copy=(p:Pose):Pose=>({...p,position:{...p.position}}),turn=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
const keys=(v:object,allowed:string[])=>{if(Object.keys(v).some(k=>!allowed.includes(k)))throw Error('Unconsumed Becket wave program declaration.');};
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function compileBecketWaveSequence(raw:BecketWaveProgram,couples:number){
 const program=freeze(capturePlainData(raw));keys(program,['id','title','sourceId','sourceUrl','operations']);
 if(![program.id,program.title,program.sourceId,program.sourceUrl].every(v=>typeof v==='string'&&v.trim())||!Array.isArray(program.operations)||program.operations.filter(o=>o.mode==='circle-pass').length!==1)throw Error('Explicit source identity and one counted progression are required.');
 const figures=program.operations.flatMap(o=>o.mode==='circle-pass'?[o.circle,o.pass]:o.mode==='paired-finish'?[o.balance,o.swing]:[o.figure]);
 if(figures.reduce((n,f)=>n+f.beats,0)!==64||new Set(figures.map(f=>f.id)).size!==figures.length||figures.some(f=>f.confidence==='unsupported'))throw Error('The explicit program must retain64 counts and unique supported row identities.');
 const dancers=createDancers(couples),initialState=createFiniteBecketState(couples,{circulation:'cw',roleArrangement:'lark-left',halfWidth:.64,rowGap:1.28});let state=initialState,poses=finiteBecketPoses(state),period=0,periodStart=0;
 const rounds:any[]=[],seen=new Map<string,number>();
 for(let round=0;round<128;round++){
  const key=JSON.stringify(state.couples.map(c=>[c.id,c.side,c.rank,c.status])),old=seen.get(key);if(old!==undefined){periodStart=old;period=round-old;break;}seen.set(key,round);
  const before=state,sections:any[]=[],entry=poses.map(copy);let binding=state.binding,event:ReturnType<typeof compileBecketCirclePassStep>|undefined,cursor=0,contacts:HandContact[]=[],wave:CarriedWaveState|undefined,paired:CarriedPairedBalanceState|undefined;
  const carried=():CarriedReleasedHeyState=>({sourceBeat:cursor,bindingEpoch:binding.epoch,actors:dancers.map(({id,role,couple})=>({id,role,couple})),poses,partner:[...binding.relations.partner],neighbor:[...binding.relations.neighbor],boxPartitions:[...binding.groups].sort((a,b)=>state.couples.find(c=>c.id===dancers[a.actors[0]].couple)!.rank-state.couples.find(c=>c.id===dancers[b.actors[0]].couple)!.rank).map(g=>[...g.actors]),waitingIds:binding.waitingIds,heldContacts:contacts});
  const add=(beats:number,sampler:(beat:number)=>{poses:Pose[];contacts:HandContact[]})=>{const start=cursor;const sample=(count:number)=>{const f=sampler(count);if(event&&start>=event.rebindBeat)for(const p of event.sampleWaiting(start+count))f.poses[p.id]=p;return f;};sections.push({start,beats,sample});const end=sample(beats);poses=end.poses.map(copy);contacts=end.contacts;cursor+=beats;};
  for(const op of program.operations){
   if(op.mode==='circle-pass'){
    keys(op,['mode','circle','pass','options']);if(wave||paired||event||op.options.progressionSource.sourceId!==program.sourceId||op.options.progressionSource.url!==program.sourceUrl)throw Error('Circle/pass must consume released actual state and matching source evidence.');
    const plan=compileBecketCirclePassStep(op.circle,op.pass,captureBecketSliceBoundary(dancers,poses,binding,cursor,contacts),state,op.options),start=cursor;add(8,n=>plan.sample(start+n));event=plan;binding=plan.endBinding;state=plan.nextState;continue;
   }
   if(op.mode==='released-swing'||op.mode==='chain'){
    keys(op,op.mode==='chain'?['mode','figure','receiverYield']:['mode','figure','closeBeats','acquireBeats','releaseBeats']);if(wave||paired||contacts.length||op.figure.beats!==8||op.figure.progression)throw Error('Local operation requires an actually released eight-count entry.');
    const source=poses.map(copy),plans=binding.groups.map(g=>{const ids=[...g.actors],context={ids,dancers,start:source,bindingEpoch:binding.epoch,relations:binding.relations};if(op.mode==='chain'){if(op.receiverYield!==.3)throw Error('Explicit supported chain preparation required.');return{ids,plan:compileReleasedChainStep(op.figure,context,captureSequenceBoundary(context,cursor,[]),{receiverYield:op.receiverYield})};}if(op.figure.kind!=='swing'||op.figure.who!=='neighbor'||op.closeBeats!==1.25||op.acquireBeats!==.5||op.releaseBeats!==1||Object.keys(op.figure).some(k=>!['id','label','kind','who','beats','notes','confidence'].includes(k)))throw Error('Released swing needs explicit named neighbors and supported counted preparation.');return{ids,plan:compilePrimitiveFigure(op.figure,ids,source,dancers,[],{canonicalSwingLayout:true,geometry:{halfWidth:.64,rowGap:1.28}})};});
    add(8,n=>{const t=Math.max(0,Math.min(1,n/8)),at=source.map(copy);for(const{ids,plan}of plans)for(const id of ids){at[id].position=plan.position(id,t);at[id].yaw=plan.facing(id,t,at);at[id].balance=plan.balance?.(id,t);at[id].chainCourtesyPreparation=plan.chainCourtesyPreparation?.(id,t);at[id].swingPreparation=plan.swingPreparation?.(id,t);if(op.mode==='released-swing')at[id].yaw+=turn(plan.facing(id,0,source),source[id].yaw)*(1-smooth(n/op.closeBeats));}const held=plans.flatMap(({plan})=>plan.contacts(t,at));return{poses:at,contacts:op.mode==='chain'?held:held.map(h=>({...h,strength:h.strength*smooth((n-op.closeBeats)/op.acquireBeats)*(1-smooth((n-(8*.82-op.releaseBeats))/op.releaseBeats))})).filter(h=>h.strength>1e-9)};});continue;
   }
   if(op.mode==='hey-wave'){
    keys(op,['mode','figure','spec','halfDepth']);if(wave||paired||op.halfDepth!==.64||op.figure.kind!=='hey'||op.figure.beats!==8||op.figure.amount!==.5||op.figure.heyStartRole!==op.spec.firstRole||op.figure.who!==op.spec.sidePair||op.figure.centerShoulder!==op.spec.centerShoulder||op.figure.endShoulder!==op.spec.endShoulder||Object.keys(op.figure).some(k=>!['id','label','kind','beats','amount','heyStartRole','who','centerShoulder','endShoulder','notes','confidence'].includes(k)))throw Error('Half-hey lowering must preserve its actual source roles, shoulders and counts.');
    const exitPoses=binding.groups.flatMap(g=>{const cx=g.actors.reduce((n,id)=>n+poses[id].position.x/4,0),cz=g.actors.reduce((n,id)=>n+poses[id].position.z/4,0);return g.actors.map(id=>{const side=-Math.sign(poses[id].position.x-cx);return{id,position:{x:2*cx-poses[id].position.x,z:cz-Math.sign(poses[id].position.z-cz)*op.halfDepth},yaw:side*(dancers[id].role===op.spec.inwardRole?-1:1)*Math.PI/2};});});
    const plan=compileCarriedHeyWaveProducer({...op.spec,exitPoses},carried());add(8,plan.sample);wave={...plan.exitState,poses,heldContacts:contacts};continue;
   }
   if(op.mode==='circulate'){
    keys(op,['mode','figure','spec']);if(!wave||op.figure.kind!==op.spec.kind||op.figure.beats!==op.spec.beats||op.figure.crossRole!==op.spec.crossRole||op.figure.loopRole!==op.spec.loopRole||op.figure.loopDirection!==op.spec.loopDirection||op.figure.balanceStyle!==op.spec.balanceStyle||JSON.stringify(op.figure.phaseBeats)!==JSON.stringify(op.spec.phaseBeats)||Object.keys(op.figure).some(k=>!['id','label','kind','beats','crossRole','loopRole','loopDirection','balanceStyle','phaseBeats','notes','confidence'].includes(k)))throw Error('Circulation lowering must consume the literal operation and actual wave.');
    const plan:{exitState:CarriedWaveState|CarriedPairedBalanceState;sample(n:number):{poses:Pose[];contacts:HandContact[]}}='exit'in op.spec?compileCarriedWaveCirculate(op.spec,wave):compileCarriedWaveCirculate(op.spec,wave);add(op.spec.beats,plan.sample);if('wave'in plan.exitState){wave={...plan.exitState,poses,heldContacts:contacts};paired=undefined;}else{paired={...plan.exitState,poses,heldContacts:contacts};wave=undefined;}continue;
   }
   if(op.mode==='paired-finish'){
    keys(op,['mode','balance','swing','spec']);if(!paired||op.balance.kind!=='balance'||op.balance.beats!==4||op.swing.kind!=='swing'||op.swing.beats!==12||op.balance.who!==op.spec.who||op.swing.who!==op.spec.who||[op.balance,op.swing].some(f=>Object.keys(f).some(k=>!['id','label','kind','beats','who','notes','confidence'].includes(k))))throw Error('Paired finish must retain the declared4+12 same-person balance/swing.');const plan=compileCarriedPairedBalanceSwing(op.spec,paired);add(16,plan.sample);paired=undefined;continue;
   }
   throw Error('Unknown full-set Becket operation.');
  }
  if(!event||wave||paired||contacts.length)throw Error('A repeat must finish after its reached event with released paired state.');const expected=finiteBecketPoses(state);for(const p of poses){const q=expected[p.id];if(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)>1e-7||Math.abs(turn(p.yaw,q.yaw))>1e-7)throw Error(`Actual Becket operations fail next-slot closure for actor${p.id}: ${JSON.stringify({actual:p,expected:q})}`);}
  const frameAt=(beat:number)=>{const section=sections.find(s=>beat<s.start+s.beats)??sections.at(-1)!;return section.sample(beat-section.start);};let previous=frameAt(0);
  for(let tick=1;tick<=64*64;tick++){const frame=frameAt(tick/64),byId=new Map(frame.poses.map((p:Pose)=>[p.id,p]));for(const p of frame.poses){const q=previous.poses.find((q:Pose)=>q.id===p.id)!;if(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)*64>1.8+1e-5)throw Error('Full Becket wave program exceeds the existing walking envelope.');}for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)if(Math.hypot(frame.poses[a].position.x-frame.poses[b].position.x,frame.poses[a].position.z-frame.poses[b].position.z)<.45-1e-6)throw Error('Full Becket wave program violates clearance including finite ends.');const hands=new Set<string>();for(const h of frame.contacts)for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as[number,string][]){const key=`${id}:${hand}`;if(hands.has(key))throw Error('Full Becket wave program duplicates a held hand.');hands.add(key);const p=byId.get(id) as Pose,sign=hand==='left'?1:-1;if(!p||Math.hypot(h.point.x-p.position.x-sign*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+sign*.235*Math.sin(p.yaw))>.64+1e-7)throw Error('Full Becket wave program exceeds the adult hand envelope.');}previous=frame;}
  rounds.push({entry,end:poses.map(copy),before,event,sections});
 }
 if(!period)throw Error('Finite Becket wave program did not close.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat)||beat<0)throw Error('Invalid source clock.');const repeat=Math.floor(beat/64),local=beat%64,index=repeat<rounds.length?repeat:periodStart+(repeat-periodStart)%period;return{repeat,local,round:rounds[index]};};
 const sample=(beat:number)=>{const at=locate(beat),section=at.round.sections.find((s:any)=>at.local<s.start+s.beats)??at.round.sections.at(-1);return section.sample(at.local-section.start);};
 return Object.freeze({program,dancers,totalBeats:64,periodRepeats:period,periodStart,sample,topology(beat:number){const at=locate(beat),binding=at.local<at.round.event.rebindBeat?at.round.before.binding:at.round.event.endBinding;return{epoch:at.repeat+Number(at.local>=at.round.event.rebindBeat),partner:[...binding.relations.partner],neighbor:[...binding.relations.neighbor],waitingIds:[...binding.waitingIds]};}});
}
