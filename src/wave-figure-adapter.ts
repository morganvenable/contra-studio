/** Source-facing wave bindings. Registration requires complete source dances,
 * incoming/outgoing stances and finite-set progression to be verified together.
 * No source string, actor ID ordering or nearest-person search chooses a hand.
 */
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compilePassToWave,compileWaveBalance,compileBoxCirculate,type WaveGraph,type WaveConstraint,type PassToWaveOptions,type WaveSource,type WavePlan,type CirculateAssignment} from './wave-figures.ts';
import type {Pose,Role} from './types.ts';
interface Metadata {id:string;label:string;confidence?:'verified'|'approximate'|'unsupported';notes?:string;}
interface Passing extends Metadata {centerRole:Role;sideRelation:'partner'|'neighbor';passingShoulder:'right';centerHand:'left';sideHand:'right';entry:'facing-couples-across';}
export type WaveFigureSpec =
 | (Passing&{kind:'pass-to-wave';beats:4})
 | (Passing&{kind:'pass-to-wave-balance';beats:8;phaseBeats:readonly [4,4];balanceStyle:'right-left'|'forward-back'})
 | (Metadata&{kind:'wave-balance';beats:4;balanceStyle:'right-left'|'forward-back'})
 | (Metadata&{kind:'box-circulate';beats:4;crossRole:Role;loopRole:Role;loopDirection:'right'})
 | (Metadata&{kind:'balance-box-circulate';beats:8;phaseBeats:readonly [4,4];balanceStyle:'right-left'|'forward-back';crossRole:Role;loopRole:Role;loopDirection:'right'});
export type WaveHandRelation='partner'|'neighbor'|'same-role';
export interface WaveFigureContext extends FigureContext {
 /** Required for balance/circulate, including named relations of every hand. */
 wave?:{graph:WaveGraph;handRelations:readonly WaveHandRelation[]};
 circulate?:{mapping:readonly CirculateAssignment[];exitWave:WaveGraph;exitHandRelations:readonly WaveHandRelation[];frame:{origin:{x:number;z:number};across:{x:number;z:number}}};
 source?:WaveSource;
}
export interface WaveFigurePlan extends MotionPlan {readonly beats:number;readonly segments:readonly WavePlan[];readonly exitWave:WaveGraph;readonly source?:WaveSource;}
const metadata=['id','label','kind','beats','notes','confidence'];
const passKeys=['centerRole','sideRelation','passingShoulder','centerHand','sideHand','entry'];
const balanceKeys=['balanceStyle'];const circulateKeys=['crossRole','loopRole','loopDirection'];
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
const pose=(x:number,z:number,yaw:number):WaveConstraint=>({position:{x,z},yaw,velocity:{x:0,z:0},yawRate:0});
function assertSpec(f:WaveFigureSpec){
 const extras=f.kind==='pass-to-wave'?passKeys:f.kind==='pass-to-wave-balance'?[...passKeys,...balanceKeys,'phaseBeats']:f.kind==='wave-balance'?balanceKeys:f.kind==='box-circulate'?circulateKeys:f.kind==='balance-box-circulate'?[...balanceKeys,...circulateKeys,'phaseBeats']:undefined;
 if(!extras||f.confidence==='unsupported'||!f.id||!f.label)throw new Error('The wave figure is unresolved or is a distinct unsupported variant.');for(const key of Object.keys(f))if(![...metadata,...extras].includes(key)&&(f as any)[key]!==undefined)throw new Error(`The ${f.kind} adapter does not consume “${key}”.`);
 if(f.kind==='pass-to-wave-balance'||f.kind==='balance-box-circulate'){if(f.beats!==8||!Array.isArray(f.phaseBeats)||f.phaseBeats.length!==2||f.phaseBeats.some(n=>n!==4))throw new Error('The combined source row requires an explicit 4+4 interpretation inside its eight beats.');}else if(f.beats!==4)throw new Error('The isolated wave operation requires exactly four source beats.');
 if('balanceStyle'in f&&!['right-left','forward-back'].includes(f.balanceStyle))throw new Error('A wave balance style is explicit; a Rory slide/spin is not a balance or circulate alias.');
}
function relations(context:FigureContext){return{partner:resolveBoundFigureRelation(context,'partner'),neighbor:resolveBoundFigureRelation(context,'neighbor')};}
function checkHands(graph:WaveGraph,declared:readonly WaveHandRelation[],context:FigureContext){const maps=relations(context);if(declared.length!==graph.hands.length)throw new Error('Every held wave hand requires an explicit current relation or same-role declaration.');for(const[h,i]of graph.hands.map((h,i)=>[h,i] as const)){const relation=declared[i];if(relation==='same-role'){if(context.dancers[h.a]?.role!==context.dancers[h.b]?.role||h.a===h.b)throw new Error('The same-role center-hand declaration contradicts the bound actors.');}else if(!['partner','neighbor'].includes(relation)||maps[relation]?.get(h.a)!==h.b)throw new Error('A named wave hand contradicts its current relationship binding.');}}
/** Conventional across facing couples; incoming right-side actors become LH
 * centers. Role and relationship selectors verify these slots; they cannot
 * reassign a dancer to make contradictory source wording appear executable. */
export function conventionalPassToWaveBinding(f:Extract<WaveFigureSpec,{kind:'pass-to-wave'|'pass-to-wave-balance'}>,context:FigureContext):PassToWaveOptions{
 if(!['lark','robin'].includes(f.centerRole)||!['partner','neighbor'].includes(f.sideRelation)||f.passingShoulder!=='right'||f.centerHand!=='left'||f.sideHand!=='right'||f.entry!=='facing-couples-across')throw new Error('Pass-to-wave needs explicit center role, side relation, right-shoulder crossing, LH centers and RH sides.');
 const maps=relations(context),relation=maps[f.sideRelation],{ids,start,dancers}=context,origin={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const select=(side:1|-1,left:boolean)=>{const wantedZ=(left?side:-side)*.9,matches=ids.filter(id=>Math.abs(start[id].position.x-origin.x-side*.9)<1e-6&&Math.abs(start[id].position.z-origin.z-wantedZ)<1e-6);if(matches.length!==1)throw new Error('Pass-to-wave requires one explicit actor in each reviewed ±.9 facing-couple slot.');const id=matches[0],yaw=side===-1?Math.PI/2:-Math.PI/2;if(Math.abs(wrap(start[id].yaw-yaw))>1e-6)throw new Error('The preceding figure must finish facing directly across before pass-to-wave.');if((dancers[id].role===f.centerRole)===left)throw new Error('The source center role must occupy the incoming right-side positions; an arky or different wave is not inferred.');return id;};
 const sidePairs=[{side:-1 as const,leftId:select(-1,true),rightId:select(-1,false)},{side:1 as const,leftId:select(1,true),rightId:select(1,false)}] as const;
 for(const p of sidePairs)if(relation.get(p.leftId)!==p.rightId)throw new Error('The declared side-hand relation contradicts the incoming side couples.');
 const order=[sidePairs[1].leftId,sidePairs[1].rightId,sidePairs[0].rightId,sidePairs[0].leftId] as const,entry=new Map(ids.map(id=>[id,pose(start[id].position.x,start[id].position.z,start[id].yaw)])),exit=new Map(order.map((id,i)=>[id,pose(origin.x+(i-1.5)*1,origin.z,i%2?0:Math.PI)])),waveHands=order.slice(0,3).map((a,i)=>({a,b:order[i+1],handA:i===1?'left' as const:'right' as const,handB:i===1?'left' as const:'right' as const}));
 return{actorIds:ids,entry,exit,beats:4,frame:{origin,across:{x:1,z:0}},sidePairs,crossingPairs:[[sidePairs[0].leftId,sidePairs[1].rightId],[sidePairs[0].rightId,sidePairs[1].leftId]],passingShoulder:'right',waveOrder:order,waveHands,acrossWidth:1.8,sideSpacing:1.8,waveSpacing:1,passClearance:.76,crossingBeats:2.5};
}
export function compileWaveFigure(f:WaveFigureSpec,context:WaveFigureContext):WaveFigurePlan{
 assertSpec(f);relations(context);const segments:WavePlan[]=[],{ids,start}=context;let entry=new Map(ids.map(id=>[id,pose(start[id].position.x,start[id].position.z,start[id].yaw)])),wave:WaveGraph|undefined;
 if(f.kind==='pass-to-wave'||f.kind==='pass-to-wave-balance'){const plan=compilePassToWave(conventionalPassToWaveBinding(f,context));segments.push(plan);entry=new Map(plan.exit);wave=plan.exitWave;}
 else{if(!context.wave)throw new Error('Wave balance/circulate requires an explicit incoming ordered hand graph.');checkHands(context.wave.graph,context.wave.handRelations,context);wave=context.wave.graph;}
 if(f.kind==='wave-balance'||f.kind==='pass-to-wave-balance'||f.kind==='balance-box-circulate'){const plan=compileWaveBalance({actorIds:ids,entry,exit:entry,beats:4,wave:wave!,style:f.balanceStyle,amplitude:.1});segments.push(plan);entry=new Map(plan.exit);wave=plan.exitWave;}
 if(f.kind==='box-circulate'||f.kind==='balance-box-circulate'){
  if(!['lark','robin'].includes(f.crossRole)||!['lark','robin'].includes(f.loopRole)||f.crossRole===f.loopRole||f.loopDirection!=='right'||!context.circulate)throw new Error('Box circulate needs distinct explicit cross/loop roles, right loops and an actor-to-slot binding.');
  const binding=context.circulate;for(const m of binding.mapping)if(context.dancers[m.id]?.role!==(m.mode==='cross'?f.crossRole:f.loopRole))throw new Error('The explicit circulate mapping contradicts its source role selector.');checkHands(binding.exitWave,binding.exitHandRelations,context);
  const exit=new Map(binding.mapping.map(m=>{const p=entry.get(m.id),destination=entry.get(m.destinationId);if(!p||!destination)throw new Error('Circulate mapping references an unbound actor.');return[m.id,pose(destination.position.x,destination.position.z,p.yaw-(m.mode==='loop-right'?Math.PI:0))];}));
  const plan=compileBoxCirculate({actorIds:ids,entry,exit,beats:4,entryWave:wave!,exitWave:binding.exitWave,mapping:binding.mapping,frame:binding.frame});segments.push(plan);wave=plan.exitWave;
 }
 const beats=segments.reduce((n,p)=>n+p.beats,0);if(beats!==f.beats)throw new Error('Source wave phases cannot add or discard musical beats.');const source=context.source?Object.freeze({...context.source}):undefined;if(source&&(!source.url||!source.snapshotId||!source.rowId||!source.text||source.beats!==beats))throw new Error('The retained source row must match the combined figure beat budget.');
 const at=(t:number)=>{if(!Number.isFinite(t))throw new Error('Wave progress must be finite.');const beat=Math.max(0,Math.min(beats,t*beats)),index=Math.min(segments.length-1,Math.floor(beat/4));return{plan:segments[index],t:(beat-index*4)/4};};
 return Object.freeze({beats,segments:Object.freeze(segments),exitWave:wave!,source,position:(id:number,t:number)=>{const s=at(t);return s.plan.position(id,s.t);},facing:(id:number,t:number)=>{const s=at(t);return s.plan.facing(id,s.t);},contacts:(t:number,poses:Pose[])=>{const s=at(t);return s.plan.contacts(s.t,poses);}});
}
