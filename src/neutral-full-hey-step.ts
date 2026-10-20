/** A row-local full hey returns every actor to their actual incoming station.
 * Its released, across-facing endpoint is a common sequence boundary, with no
 * successor-specific spacing, source signature, or invented progression. */
import type {Figure,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {compileBasicPassEvents,parseHeyNotation} from './hey.ts';
import {compilePartialHey,type PartialHeyTrajectory} from './partial-hey.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

export interface NeutralFullHeyPlan extends SequencedMotionPlan {readonly heyPlan:PartialHeyTrajectory;}
const EPS=1e-7;
const distance=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>Math.hypot(a.x-b.x,a.z-b.z);
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('A neutral full-hey sample time must be finite.');return Math.max(0,Math.min(1,t));};

export function assertNeutralFullHeyFigure(input:Figure):Figure {
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw new Error('A neutral full hey needs explicit text metadata and supported confidence.');
 if(f.kind!=='hey'||f.beats!==16||f.amount!==1||!['partner','neighbor'].includes(f.who??'')||!['lark','robin'].includes(f.heyStartRole??'')||!['left','right'].includes(f.centerShoulder??'')||!['left','right'].includes(f.endShoulder??'')||f.centerShoulder===f.endShoulder||f.entry!=='paired-sidelines'||f.exit!=='same-slots-facing-across'||f.progression)throw new Error('A neutral full hey requires sixteen counts, eight role-first pass layers, opposite center/end shoulders, named sideline pairs and a same-slots-facing-across exit without progression.');
 if(f.heyAxis!==undefined||f.heyStartPair!==undefined||f.notation!==undefined)throw new Error('The neutral role-first full hey does not consume axis, pair-first or notation variants.');
 return f;
}

export function compileNeutralFullHeyStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):NeutralFullHeyPlan {
 const f=assertNeutralFullHeyFigure(input),boundary=ownSequenceBoundary(incoming),endBeat=advanceSequenceBeat(boundary.sourceBeat,16);
 if(boundary.heldContacts.length)throw new Error('A neutral full hey requires released incoming hands; an existing hold cannot be discarded.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const ids=boundary.actors.map(a=>a.id),byId=new Map(boundary.poses.map(p=>[p.id,p])),actorsById=new Map(boundary.actors.map(a=>[a.id,a]));
 const partner=new Map(boundary.partner),neighbor=new Map(boundary.neighbor),sidePair=f.who==='partner'?partner:neighbor;
 const center={x:boundary.poses.reduce((n,p)=>n+p.position.x,0)/4,z:boundary.poses.reduce((n,p)=>n+p.position.z,0)/4};
 const select=(role:'lark'|'robin',side:number)=>{
  const found=ids.filter(id=>actorsById.get(id)!.role===role&&Math.sign(byId.get(id)!.position.x-center.x)===side);
  if(found.length!==1)throw new Error('A neutral full hey needs one actor of each role on each measured sideline.');
  return found[0];
 };
 const first=f.heyStartRole!,other=first==='lark'?'robin':'lark',west=select(first,-1),east=select(first,1),westOther=select(other,-1),eastOther=select(other,1),entryOrder=[westOther,west,east,eastOther];
 for(const [a,b]of[[west,westOther],[east,eastOther]]){
  const A=byId.get(a)!.position,B=byId.get(b)!.position;
  if(sidePair.get(a)!==b||Math.abs(A.x-B.x)>EPS||distance(A,B)<.5-EPS)throw new Error('The neutral full hey requires its named pairs on the actual incoming sidelines.');
 }
 const sign=f.centerShoulder==='right'?1:-1;
 if(Math.sign(byId.get(west)!.position.z-center.z)!==sign||Math.sign(byId.get(east)!.position.z-center.z)!==-sign)throw new Error('The neutral full-hey first shoulder contradicts the measured incoming role order.');
 let order=[...entryOrder];const tokens:string[]=[];
 for(let phase=0;phase<8;phase++){
  const pairs=phase%2===0?[[order[1],order[2]]]:[[order[0],order[1]],[order[2],order[3]]];
  const selectors=pairs.map(([a,b])=>actorsById.get(a)!.role===actorsById.get(b)!.role?(actorsById.get(a)!.role==='lark'?'M':'W'):partner.get(a)===b?'P':neighbor.get(a)===b?'N':undefined);
  if(!selectors[0]||selectors.some(selector=>selector!==selectors[0]))throw new Error('A neutral full-hey pass layer cannot resolve its complete actor relationships.');
  tokens.push(selectors[0]+((phase%2===0?f.centerShoulder:f.endShoulder)==='right'?'R':'L'));
  if(phase%2===0)[order[1],order[2]]=[order[2],order[1]];
  else{[order[0],order[1]]=[order[1],order[0]];[order[2],order[3]]=[order[3],order[2]];}
 }
 const actors=boundary.actors.map(a=>({id:String(a.id),role:a.role,couple:String(a.couple)}));
 const graph=compileBasicPassEvents(parseHeyNotation(`(16) Hey (${tokens.join(';')})`),actors,entryOrder.map(String));
 if(graph.needsPartialExit||graph.events.length!==8||graph.events.reduce((sum,e)=>sum+e.pairs.length,0)!==12||graph.endOrder?.some((id,slot)=>id!==String(entryOrder[slot])))throw new Error('A neutral full hey must prove twelve encounters and every original station after eight pass layers.');
 // The explicit graph determines station ownership. No spacing is normalized
 // for a following chain, allemande, or any other compatible consumer.
 const end=new Map(graph.endOrder!.map((id,slot)=>[Number(id),{...byId.get(entryOrder[slot])!.position}]));
 const entry=new Map(boundary.poses.map(p=>[String(p.id),{position:{...p.position},velocity:{x:0,z:0},yaw:p.yaw}]));
 const exit=new Map(ids.map(id=>[String(id),{position:end.get(id)!,velocity:{x:0,z:0},yaw:byId.get(id)!.position.x<center.x?Math.PI/2:-Math.PI/2}]));
 const named=(map:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(map.get(id)!)]));
 // Full-width measured swing exits peak at 1.3251 units/count in the first
 // pass connector. The local 1.35 certificate retains all roots and timing;
 // the established compact/terminal adapters keep their original 1.3 budget.
 const path=compilePartialHey({actors,events:graph.events,entry,exit,frame:{origin:center,axis:{x:1,z:0}},beats:16,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:[2,3.75,5.5,7.25,9,10.75,12.5,14.25],slotSpacing:1.05,passClearance:.66,maximumSpeed:1.35,maximumYawRate:4,relationships:{partner:named(partner),neighbor:named(neighbor)},source:f.label});
 const actor=(id:number,t:number)=>{if(!byId.has(id))throw new Error('Actor is outside this neutral full hey.');return path.sample(time(t)*16).poses.find(p=>p.id===String(id))!;};
 const plan:MotionPlan={position:(id,t)=>actor(id,t).position,facing:(id,t)=>actor(id,t).yaw,contacts:t=>{time(t);return[];}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 assertSequenceHandoff({...boundary,sourceBeat:endBeat,poses:boundary.poses.map(p=>({...p,yaw:p.position.x<center.x?Math.PI/2:-Math.PI/2}))},exitState);
 return Object.freeze({...plan,heyPlan:path,entryState,exitState});
}
