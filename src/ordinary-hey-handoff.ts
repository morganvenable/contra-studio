/** Ordinary full heys may return to persistent partner side-pairs without
 * progressing. The eight pass layers own all sixteen source counts; a typed
 * endpoint is consumed by the balance/swing instead of being repaired by it. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileBasicPassEvents,parseHeyNotation} from './hey.ts';
import {compilePartialHey,type PartialHeyTrajectory} from './partial-hey.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {captureFormationState,sampleFormationEndpoint,assertSuccessorEntry,type FormationState} from './formation-handoff.ts';
import type {Figure,Pose,Vec2} from './types.ts';
export interface OrdinaryHeyHandoffPlan extends MotionPlan {readonly heyPlan:PartialHeyTrajectory;readonly entryState:FormationState;readonly exitState:FormationState;}
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function assertSourceDeclaration(figure:Figure):void{
 if(!figure||![Object.prototype,null].includes(Object.getPrototypeOf(figure)))throw new Error('An ordinary-hey declaration must be a plain data record.');
 for(const key of Reflect.ownKeys(figure)){const descriptor=Object.getOwnPropertyDescriptor(figure,key)!;if(typeof key!=='string'||!descriptor.enumerable||!('value'in descriptor))throw new Error('Symbol, hidden or accessor figure declarations cannot be erased by ownership cloning.');}
 if(typeof figure.id!=='string'||!figure.id.trim()||typeof figure.label!=='string'||!figure.label.trim()||figure.notes!==undefined&&typeof figure.notes!=='string'||figure.confidence!==undefined&&!['verified','approximate','unsupported'].includes(figure.confidence)||!Number.isFinite(figure.beats)||figure.beats<=0||figure.beats>64)throw new Error('Figure metadata and source counts must be explicit, finite and well-formed.');
 assertFigureArgumentsConsumed(figure);
}
export function compileOrdinaryFullHeyHandoff(input:Figure,incoming:FigureContext,sourceBeat=0,options?:{halfWidth:.64;balanceHands:'acquire'}):OrdinaryHeyHandoffPlan{
 if(options&&(Object.keys(options).some(k=>!['halfWidth','balanceHands'].includes(k))||options.halfWidth!==.64||options.balanceHands!=='acquire'||input.exit!=='same-slots-partner-balance'))throw Error('Compact held balance exit requires explicit measured width and hand acquisition.');
 const halfWidth=options?.halfWidth??.9;
 assertSourceDeclaration(input);if(incoming.next)assertSourceDeclaration(incoming.next);
 const f=structuredClone(input),context:FigureContext={...incoming,ids:[...incoming.ids],start:structuredClone(incoming.start),dancers:structuredClone(incoming.dancers),next:incoming.next?structuredClone(incoming.next):undefined,relations:{epoch:incoming.relations.epoch,partner:new Map(incoming.relations.partner),neighbor:new Map(incoming.relations.neighbor)}};
 assertFigureArgumentsConsumed(f);
 const swingExit=f.exit==='same-person-swing';
 if(f.kind!=='hey'||f.confidence==='unsupported'||f.progression||f.beats!==16||f.amount!==1||f.who!=='partner'||!['lark','robin'].includes(f.heyStartRole??'')||!['left','right'].includes(f.centerShoulder??'')||!['left','right'].includes(f.endShoulder??'')||f.centerShoulder===f.endShoulder||f.entry!=='paired-sidelines'||!['same-slots-partner-balance','same-person-swing'].includes(f.exit??''))throw new Error('A composed full hey requires sixteen counts, eight role-first passes, explicit partner sidelines and a same-station partner balance/swing exit without progression.');
 if(f.heyAxis!==undefined||f.notation!==undefined||f.direction!==undefined||f.hands!==undefined||f.underRole!==undefined)throw new Error('The ordinary full-hey handoff does not consume axis, notation, turn or hand variants.');
 if(context.next?.who!=='partner'||(swingExit?(context.next.kind!=='swing'||context.next.beats<4):(context.next.kind!=='balance'||context.next.beats!==4)))throw new Error('The declared full-hey endpoint requires the same persistent partners in the named following balance or swing.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context;
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const select=(role:'lark'|'robin',side:number)=>{const found=ids.filter(id=>dancers[id].role===role&&Math.sign(start[id].position.x-center.x)===side);if(found.length!==1)throw new Error('A full hey needs one actor of each role on each explicit sideline.');return found[0];};
 const first=f.heyStartRole!,other=first==='lark'?'robin':'lark',west=select(first,-1),east=select(first,1),westOther=select(other,-1),eastOther=select(other,1),entryOrder=[westOther,west,east,eastOther];
 for(const [a,b]of[[west,westOther],[east,eastOther]])if(partner.get(a)!==b||Math.abs(start[a].position.x-start[b].position.x)>.001||Math.abs(Math.abs(start[a].position.x-center.x)-halfWidth)>.001||distance(start[a].position,start[b].position)<1.05||distance(start[a].position,start[b].position)>1.801)throw new Error('The full hey requires its persistent partners at the incoming sideline stations.');
 const sign=f.centerShoulder==='right'?1:-1;
 if(Math.sign(start[west].position.z-center.z)!==sign||Math.sign(start[east].position.z-center.z)!==-sign)throw new Error('The full hey first shoulder contradicts the incoming role order.');
 let order=[...entryOrder];const tokens:string[]=[];
 for(let phase=0;phase<8;phase++){
  const pairs=phase%2===0?[[order[1],order[2]]]:[[order[0],order[1]],[order[2],order[3]]];
  const selectors=pairs.map(([a,b])=>dancers[a].role===dancers[b].role?(dancers[a].role==='lark'?'M':'W'):partner.get(a)===b?'P':neighbor.get(a)===b?'N':undefined);
  if(!selectors[0]||selectors.some(selector=>selector!==selectors[0]))throw new Error('A full-hey pass layer cannot resolve its complete actor relationships.');
  tokens.push(selectors[0]+((phase%2===0?f.centerShoulder:f.endShoulder)==='right'?'R':'L'));
  if(phase%2===0)[order[1],order[2]]=[order[2],order[1]];else{[order[0],order[1]]=[order[1],order[0]];[order[2],order[3]]=[order[3],order[2]];}
 }
 const actors=ids.map(id=>({id:String(id),role:dancers[id].role,couple:String(dancers[id].couple)}));
 const graph=compileBasicPassEvents(parseHeyNotation(`(16) Hey (${tokens.join(';')})`),actors,entryOrder.map(String));
 if(graph.needsPartialExit||graph.events.length!==8||graph.events.reduce((sum,e)=>sum+e.pairs.length,0)!==12||graph.endOrder?.some((id,slot)=>id!==String(entryOrder[slot])))throw new Error('A full hey must prove all twelve encounters and return every actor to the same incoming station.');
 const end=new Map(graph.endOrder!.map((id,slot)=>[Number(id),{...start[entryOrder[slot]].position}])),desiredGap=swingExit?.62:1.18;
 for(const a of ids.filter(id=>id<partner.get(id)!)){
  const b=partner.get(a)!,A=end.get(a)!,B=end.get(b)!,mid={x:(A.x+B.x)/2,z:(A.z+B.z)/2},gap=distance(A,B);
  for(const id of[a,b]){const p=end.get(id)!;end.set(id,{x:mid.x+(p.x-mid.x)*desiredGap/gap,z:mid.z+(p.z-mid.z)*desiredGap/gap});}
 }
 const entry=new Map(ids.map(id=>[String(id),{position:{...start[id].position},velocity:{x:0,z:0},yaw:start[id].yaw}]));
 const exit=new Map(ids.map(id=>[String(id),{position:end.get(id)!,velocity:{x:0,z:0},yaw:heading(end.get(id)!,end.get(partner.get(id)!)!)+(swingExit?Math.PI/3:0)}]));
 const named=(map:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(map.get(id)!)]));
 const path=compilePartialHey({actors,events:graph.events,entry,exit,frame:{origin:center,axis:{x:1,z:0}},beats:16,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:[2,3.75,5.5,7.25,9,10.75,12.5,14.25],slotSpacing:1.05,passClearance:.66,maximumSpeed:1.3,maximumYawRate:4,relationships:{partner:named(partner),neighbor:named(neighbor)},source:f.label});
 const actor=(id:number,t:number)=>{const p=path.sample(t*16).poses.find(p=>p.id===String(id));if(!p)throw new Error('Actor outside the compiled full-hey group.');return p;};
 const basic:MotionPlan={position:(id,t)=>actor(id,t).position,facing:(id,t)=>actor(id,t).yaw,contacts:()=>[]};
 const terminal=sampleFormationEndpoint(context,basic,1),swing=swingExit?compilePrimitiveFigure(context.next!,ids,terminal,dancers,dancers.filter(d=>d?.role==='lark').map(d=>d.direction),{swingEntry:'prepared-circle'}):undefined;
 const balanceHold=options?compilePrimitiveFigure(context.next!,ids,terminal,dancers,[],{balanceEntry:'held-two-hand',balanceExit:'same-person-swing'}):undefined;
 const contacts=(t:number,poses:Pose[])=>{if(balanceHold)return balanceHold.contacts(0,poses).map(h=>({...h,strength:h.strength*smooth((t*16-15.75)/.25)})).filter(h=>h.strength>1e-9);const strength=smooth((t*16-14.25)/1.75);return swing&&strength>0?swing.contacts(0,poses).map(c=>({...c,strength:c.strength*(c.target==='back'?Math.max(0,(strength-.5)/.5)**2:strength)})):[];};
 const geometry={kind:'paired-sidelines' as const,sidePair:'partner' as const,origin:center,halfWidth,pairGap:distance(start[west].position,start[westOther].position)};
 const entryState=captureFormationState(context,{sourceBeat,orderedIds:entryOrder,geometry}),exitState=captureFormationState({...context,start:terminal},{sourceBeat:sourceBeat+16,orderedIds:graph.endOrder!.map(Number),geometry:{...geometry,pairGap:desiredGap},heldContacts:contacts(1,terminal)});
 const successor=swing??balanceHold??compilePrimitiveFigure(context.next!,ids,terminal,dancers,dancers.filter(d=>d?.role==='lark').map(d=>d.direction));
 assertSuccessorEntry(exitState,{...context,start:terminal},successor);
 return Object.freeze({...basic,contacts,heyPlan:path,entryState,exitState});
}
