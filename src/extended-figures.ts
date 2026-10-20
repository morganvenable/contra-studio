import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileArchExchange} from './arch-exchange.ts';
import {compilePartialHey} from './partial-hey.ts';
import {compileBasicPassEvents,parseHeyNotation} from './hey.ts';
import type {BoundRelationships} from './chain.ts';
import type {Figure,Dancer,Pose,Vec2,HandContact} from './types.ts';

export interface MotionPlan {
 position(id:number,t:number):Vec2;
 facing(id:number,t:number,poses:Pose[]):number;
 contacts(t:number,poses:Pose[]):HandContact[];
 revolvingDoorPreparation?(id:number,t:number):Pose['revolvingDoorPreparation'];
 chainCourtesyPreparation?(id:number,t:number):Pose['chainCourtesyPreparation'];
 swingPreparation?(id:number,t:number):Pose['swingPreparation'];
 arch?(id:number,t:number):Pose['arch'];
 balance?(id:number,t:number):Pose['balance'];
}
export interface CurrentMinorSetRank {readonly relationshipEpoch:number;readonly ones:readonly [number,number];readonly twos:readonly [number,number];readonly forwardDirection:1|-1;}
export interface FigureContext {minorSetRanks?:CurrentMinorSetRank;ids:number[];start:Pose[];dancers:Dancer[];relations:BoundRelationships;bindingEpoch:number;next?:Figure;allowRelationChangingArchExit?:boolean;allowArchToCourtesyExit?:boolean;}
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
export function resolveBoundFigureRelation(context:FigureContext,relation:'partner'|'neighbor'){
 const{ids,start,dancers}=context;
 if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!Number.isSafeInteger(id)||id<0||!start[id]||start[id].id!==id||!dancers[id]||dancers[id].id!==id||!['lark','robin'].includes(dancers[id].role)||!Number.isSafeInteger(dancers[id].couple)||dancers[id].couple<0||![start[id].position.x,start[id].position.z,start[id].yaw].every(Number.isFinite)))throw new Error('The extended figure requires four unique stable identities and finite keyed poses.');
 if(!Number.isSafeInteger(context.bindingEpoch)||context.bindingEpoch<0||!Number.isSafeInteger(context.relations.epoch)||context.relations.epoch<0)throw new Error('The relationship epoch must be a nonnegative safe integer.');
 if(context.relations.epoch!==context.bindingEpoch)throw new Error('The figure relationship epoch is stale.');
 const map=context.relations[relation];
 for(const id of context.ids){const other=map.get(id);if(other===undefined||!context.ids.includes(other)||map.get(other)!==id||other===id||dancers[other].role===dancers[id].role||(relation==='partner'?dancers[other].couple!==dancers[id].couple:dancers[other].couple===dancers[id].couple))throw new Error('The figure requires complete reciprocal bound relationships.');}
 return map;
}

/** An explicitly handed, named two-person arch. Its physical close stance is
 * separate from the four logical formation slots; no neighbor is rebound. */
export function compileArchFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(context.next?.kind==='swing')throw new Error('An immediate arch-to-swing requires the separately reviewed prepared-frame adapter.');
 const {ids,start,dancers}=context;
 if(f.kind!=='box-the-gnat'||f.hands!=='right'||f.underRole!=='robin'||!['partner','neighbor'].includes(f.who??'')||f.beats!==4)throw new Error('This box-the-gnat adapter requires four beats, right hands, explicit paired relation, and a robin-under interpretation.');
 if(f.direction!==undefined||f.amount!==undefined||f.notation!==undefined||f.entry!==undefined||f.exit!==undefined||f.progression)throw new Error('The arch adapter does not consume additional turns, notation, or progression modifiers.');
 const changing=context.next?.kind==='balance'&&context.next.who!==f.who,toCourtesy=context.next?.kind==='right-left-through',restoreWidth=changing||toCourtesy;
 if(changing&&!context.allowRelationChangingArchExit)throw new Error('An arch handing off to a different relation requires its separately reviewed preparation adapter.');
 if(toCourtesy&&!context.allowArchToCourtesyExit&&!context.allowRelationChangingArchExit)throw new Error('An arch releasing into right-left-through requires its separately reviewed width-and-facing preparation.');
 if(changing&&!['partner','neighbor'].includes(context.next?.who??''))throw new Error('The next arch preparation relation must be explicit.');
 const map=resolveBoundFigureRelation(context,f.who as 'partner'|'neighbor');
 const plans=ids.filter(id=>dancers[id].role!=='robin').map(over=>{
  const under=map.get(over)!;if(dancers[under].role!=='robin')throw new Error('The named arch relation does not contain the explicit under role.');
  const A=start[over],B=start[under],gap=distance(A.position,B.position),c={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2};
  if(Math.abs(gap-1.10)>.001)throw new Error('This compositional arch requires the preceding reachable 1.10-unit right-hand stance.');
  const entry=[over,under].map(id=>({id:String(id),position:{...start[id].position},yaw:start[id].yaw}));
  const exit=entry.map(a=>({id:a.id,position:{x:c.x+(c.x-a.position.x)*(restoreWidth?1.8/gap:1),z:c.z+(c.z-a.position.z)*(restoreWidth?1.8/gap:1)},yaw:heading(a.id===String(over)?B.position:A.position,c)}));
  return compileArchExchange({entry,exit,overId:String(over),underId:String(under),hand:'right',beats:f.beats});
 });
 const planFor=(id:number)=>plans.find(p=>p.overId===String(id)||p.underId===String(id))!;
 const actor=(id:number,t:number)=>planFor(id).sample(t*planFor(id).beats).poses.find(p=>p.id===String(id))!;
 return{position:(id,t)=>actor(id,t).position,facing:(id,t)=>actor(id,t).yaw,
  arch:(id,t)=>{const p=actor(id,t);return{underId:Number(planFor(id).underId),progress:p.archProgress,kneeLowering:p.kneeLowering,...(planFor(id).exitSpacing>planFor(id).entrySpacing+1e-8?{releaseRouting:'wide-exit' as const}:{})};},
  contacts:t=>plans.flatMap(p=>p.sample(t*p.beats).contacts.map(c=>({...c,a:Number(c.a),b:Number(c.b),underId:Number(c.underId)})))};
}

/** Literal four-layer left-center half hey with explicit incoming and outgoing
 * neighbor slots. The pass solver owns all eight beats, including preparation. */
export function compileHalfHeyFigure(f:Figure,context:FigureContext):MotionPlan {
 if(f.heyAxis!==undefined)throw new Error('The ordinary hey adapter does not consume a declared diagonal/across axis; use the dedicated formation compiler.');
 assertFigureArgumentsConsumed(f);
 const {ids,start,dancers,next}=context;
 if(f.kind!=='hey'||f.beats!==8||f.who!=='all'||f.entry!=='facing-neighbor-sidelines'||f.exit!=='opposite-neighbor-balance'||!f.notation)throw new Error('The partial hey requires explicit eight-beat pass notation and neighbor-side entry/exit constraints.');
 if(f.hands!==undefined||f.underRole!==undefined||f.amount!==undefined||f.direction!==undefined||f.progression)throw new Error('The partial hey cannot ignore extra hand, turn, role or progression modifiers.');
 if(next?.kind!=='balance'||next.who!=='neighbor'||next.beats!==4)throw new Error('The declared partial-hey exit requires a following current-neighbor balance.');
 const syntax=parseHeyNotation(f.notation);
 if(syntax.fraction!==.5||syntax.beats!==8||syntax.tokens.map(t=>t.raw).join(';')!=='ML;PR;WL;NR')throw new Error('This entry/exit adapter currently consumes the complete ML;PR;WL;NR half-hey event sequence.');
 const neighbors=resolveBoundFigureRelation(context,'neighbor'),partners=resolveBoundFigureRelation(context,'partner');
 const center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 const select=(role:'lark'|'robin',side:number)=>{const matches=ids.filter(id=>dancers[id].role===role&&Math.sign(start[id].position.x-center.x)===side);if(matches.length!==1)throw new Error('A half hey needs one actor of each role on each explicit sideline.');return matches[0];};
 const wl=select('lark',-1),wr=select('robin',-1),el=select('lark',1),er=select('robin',1);
 if(neighbors.get(wl)!==wr||neighbors.get(el)!==er||start[wl].position.z>=center.z||start[el].position.z<=center.z)throw new Error('The source left-center half hey has a different incoming neighbor role order.');
 const actors=ids.map(id=>({id:String(id),role:dancers[id].role,couple:String(dancers[id].couple)}));
 const plan=compileBasicPassEvents(syntax,actors,[wr,wl,el,er].map(String));
 const entry=new Map(ids.map(id=>[String(id),{position:{...start[id].position},velocity:{x:0,z:0},yaw:start[id].yaw}]));
 const end=new Map(ids.map(id=>[id,{x:2*center.x-start[id].position.x,z:2*center.z-start[id].position.z}]));
 for(const a of [wl,el]){const b=neighbors.get(a)!,A=end.get(a)!,B=end.get(b)!,c={x:(A.x+B.x)/2,z:(A.z+B.z)/2},gap=distance(A,B);for(const id of[a,b]){const p=end.get(id)!;end.set(id,{x:c.x+(p.x-c.x)*1.18/gap,z:c.z+(p.z-c.z)*1.18/gap});}}
 const exit=new Map(ids.map(id=>[String(id),{position:end.get(id)!,velocity:{x:0,z:0},yaw:heading(end.get(id)!,end.get(neighbors.get(id)!)!)}]));
 const relationMap=(map:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(map.get(id)!)]));
 const path=compilePartialHey({actors,events:plan.events,entry,exit,frame:{origin:center,axis:{x:1,z:0}},beats:8,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:[2,3.75,5.5,7.25],slotSpacing:1.05,passClearance:.66,maximumSpeed:1.2,maximumYawRate:4,relationships:{partner:relationMap(partners),neighbor:relationMap(neighbors)}});
 const actor=(id:number,t:number)=>path.sample(t*8).poses.find(p=>p.id===String(id))!;
 return{position:(id,t)=>actor(id,t).position,facing:(id,t)=>actor(id,t).yaw,contacts:()=>[]};
}
