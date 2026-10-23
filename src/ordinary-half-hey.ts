import {compilePrimitiveFigure} from './engine.ts';
/** Source-semantic ordinary half hey. Role, shoulder and exit relation are explicit;
 * all four pass layers are expanded against the incoming identity epoch. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileBasicPassEvents,parseHeyNotation} from './hey.ts';
import {compilePartialHey} from './partial-hey.ts';
import {compileGyreFigure,type GyreFigure} from './gyre-adapter.ts';
import {captureFormationState,sampleFormationEndpoint,assertSuccessorEntry} from './formation-handoff.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,Vec2,Pose} from './types.ts';
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
/** The new released endpoint cannot erase a contradictory successor declaration
 * during ownership cloning. Older exit contracts keep their existing guards. */
function assertGyreExitData(input:unknown):asserts input is Figure {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('The half-hey gyre exit and successor must be plain data records.');
 const f=input as Figure;
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate','unsupported'].includes(f.confidence)||!Number.isFinite(f.beats))throw new Error('The half-hey gyre exit requires explicit finite source counts and well-formed metadata.');
 assertFigureArgumentsConsumed(f);
}
export function compileOrdinaryHalfHeyFigure(f:Figure,context:FigureContext,options?:{halfWidth:.64;balanceHands:'acquire'}):MotionPlan {
 if(options&&(Object.keys(options).some(k=>!['halfWidth','balanceHands'].includes(k))||options.halfWidth!==.64||options.balanceHands!=='acquire'||f.exit!=='opposite-paired-balance'))throw Error('Compact half-hey needs explicit held balance exit.');
 const halfWidth=options?.halfWidth??.9;
 if(f.exit==='opposite-paired-gyre'){const owned=capturePlainData({figure:f,next:context.next});assertGyreExitData(owned.figure);if(owned.next===undefined)throw new Error('The half-hey gyre exit requires its declared same-pair four-count right-shoulder once-around gyre.');assertGyreExitData(owned.next);f=owned.figure;context={...context,next:owned.next};}
 f=structuredClone(f);context={...context,ids:[...context.ids],start:structuredClone(context.start),dancers:structuredClone(context.dancers),next:context.next?structuredClone(context.next):undefined,relations:{epoch:context.relations.epoch,partner:new Map(context.relations.partner),neighbor:new Map(context.relations.neighbor)}};
 if(f.heyAxis!==undefined)throw new Error('The ordinary hey adapter does not consume a declared diagonal/across axis; use the dedicated formation compiler.');
 assertFigureArgumentsConsumed(f);
 if(f.confidence==='unsupported')throw new Error('The half hey is explicitly marked unsupported.');
 if(f.progression&&f.exit!=='progressed-neighbors')throw new Error('A held half-hey exit cannot ignore an extra progression declaration.');
 if(f.kind!=='hey'||f.beats!==8||f.amount!==.5||!['partner','neighbor'].includes(f.who??'')||!['lark','robin'].includes(f.heyStartRole??'')||!['left','right'].includes(f.centerShoulder??'')||!['left','right'].includes(f.endShoulder??'')||f.centerShoulder===f.endShoulder||f.entry!=='paired-sidelines'||!['opposite-paired-balance','opposite-paired-swing','opposite-paired-gyre','progressed-neighbors'].includes(f.exit??''))throw new Error('An ordinary half hey requires eight beats, a named side pair, first role, opposite center/end shoulders, and explicit entry and exit constraints.');
 if(f.notation!==undefined||f.direction!==undefined||f.hands!==undefined||f.underRole!==undefined)throw new Error('Source-semantic half heys do not ignore additional notation, turn or hand modifiers.');
 const exitKind=f.exit,swingExit=exitKind==='opposite-paired-swing',gyreExit=exitKind==='opposite-paired-gyre',relation=f.who as 'partner'|'neighbor';
 if(exitKind==='opposite-paired-balance'&&(context.next?.kind!=='balance'||context.next.who!==relation||context.next.beats!==4))throw new Error('The half-hey held exit requires the declared same-pair four-count balance.');
 if(swingExit&&(context.next?.kind!=='swing'||context.next.who!==relation||context.next.beats<4))throw new Error('The half-hey swing exit requires the declared same-pair swing of at least four counts.');
 if(gyreExit&&(context.next?.kind!=='gyre'||context.next.who!==relation||context.next.beats!==4||context.next.passingShoulder!=='right'||context.next.amount!==1||context.next.progression||context.next.confidence==='unsupported'))throw new Error('The half-hey gyre exit requires its declared same-pair four-count right-shoulder once-around gyre.');
 if(exitKind==='progressed-neighbors'&&(relation!=='neighbor'||context.next!==undefined))throw new Error('This half-hey progression exit must end the repeat with the old neighbors on opposite sidelines.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),pairs=relation==='partner'?partner:neighbor;
 const {ids,start,dancers}=context,center={x:ids.reduce((s,id)=>s+start[id].position.x,0)/4,z:ids.reduce((s,id)=>s+start[id].position.z,0)/4};
 const select=(role:'lark'|'robin',side:number)=>{const found=ids.filter(id=>dancers[id].role===role&&Math.sign(start[id].position.x-center.x)===side);if(found.length!==1)throw new Error('A half hey requires one actor of each role on each sideline.');return found[0];};
 const first=f.heyStartRole!,other=first==='lark'?'robin':'lark',westStart=select(first,-1),eastStart=select(first,1),westOther=select(other,-1),eastOther=select(other,1);
 for(const [a,b]of[[westStart,westOther],[eastStart,eastOther]])if(pairs.get(a)!==b||Math.abs(start[a].position.x-start[b].position.x)>.001||Math.abs(Math.abs(start[a].position.x-center.x)-halfWidth)>.001||distance(start[a].position,start[b].position)<1.05||distance(start[a].position,start[b].position)>1.801)throw new Error('The declared half-hey participants have not reached the same explicit sideline.');
 // A named shoulder fixes which side of the across axis the first role enters.
 const incomingSign=f.centerShoulder==='right'?1:-1;
 if(Math.sign(start[westStart].position.z-center.z)!==incomingSign||Math.sign(start[eastStart].position.z-center.z)!==-incomingSign)throw new Error('The declared first shoulder conflicts with the incoming role order; use a different entry adapter.');
 const entryOrder=[westOther,westStart,eastStart,eastOther];let order=[...entryOrder];const tokens:string[]=[];
 for(let phase=0;phase<4;phase++){
  const passing=phase%2===0?[[order[1],order[2]]]:[[order[0],order[1]],[order[2],order[3]]];
  const selectors=passing.map(([a,b])=>dancers[a].role===dancers[b].role?(dancers[a].role==='lark'?'M':'W'):partner.get(a)===b?'P':neighbor.get(a)===b?'N':undefined);
  if(!selectors[0]||selectors.some(s=>s!==selectors[0]))throw new Error('The ordinary pass layer cannot resolve all actor relationships at this epoch.');
  tokens.push(selectors[0]+((phase%2===0?f.centerShoulder:f.endShoulder)==='right'?'R':'L'));
  if(phase%2===0)[order[1],order[2]]=[order[2],order[1]];else{[order[0],order[1]]=[order[1],order[0]];[order[2],order[3]]=[order[3],order[2]];}
 }
 const actors=ids.map(id=>({id:String(id),role:dancers[id].role,couple:String(dancers[id].couple)})),events=compileBasicPassEvents(parseHeyNotation(`(8) Hey 1/2 (${tokens.join(';')})`),actors,entryOrder.map(String));
 const entry=new Map(ids.map(id=>[String(id),{position:{...start[id].position},velocity:{x:0,z:0},yaw:start[id].yaw}]));
 const end=new Map(ids.map(id=>[id,{x:2*center.x-start[id].position.x,z:2*center.z-start[id].position.z}]));
 const desiredGap=swingExit?.62:gyreExit?1.1:exitKind==='opposite-paired-balance'?1.18:1.8;
 for(const a of ids.filter(id=>id<pairs.get(id)!)){const b=pairs.get(a)!,A=end.get(a)!,B=end.get(b)!,c={x:(A.x+B.x)/2,z:(A.z+B.z)/2},gap=distance(A,B);for(const id of[a,b]){const p=end.get(id)!;end.set(id,{x:c.x+(p.x-c.x)*desiredGap/gap,z:c.z+(p.z-c.z)*desiredGap/gap});}}
 const exit=new Map(ids.map(id=>[String(id),{position:end.get(id)!,velocity:{x:0,z:0},yaw:swingExit?heading(end.get(id)!,end.get(pairs.get(id)!)!)+Math.PI/3:exitKind==='opposite-paired-balance'||gyreExit?heading(end.get(id)!,end.get(pairs.get(id)!)!):end.get(id)!.z<center.z?Math.PI:0}]));
 const named=(map:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(map.get(id)!)]));
 // A full-width incoming pair needs a quarter-count more for the first pass.
 // Measure the actual boundary; compact entries keep their existing schedule.
 // All four named gates and the swing preparation still fit the same eight counts.
 const wideSwingEntry=swingExit&&[[westStart,westOther],[eastStart,eastOther]].every(([a,b])=>Math.abs(distance(start[a].position,start[b].position)-1.8)<.001);
 // A measured full-width released arrival to a balance keeps its exact pass
 // schedule and roots. Its schematic peak is 1.325 rather than the compact
 // entry's 1.3 budget; this local certificate does not retime any named gate.
 const wideBalanceEntry=exitKind==='opposite-paired-balance'&&[[westStart,westOther],[eastStart,eastOther]].every(([a,b])=>Math.abs(distance(start[a].position,start[b].position)-1.8)<.001);
 const path=compilePartialHey({actors,events:events.events,entry,exit,frame:{origin:center,axis:{x:1,z:0}},beats:8,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:options?[17/8,43/12,121/24,13/2]:swingExit?[wideSwingEntry?2.25:2,3.75,5.5,7.25]:exitKind==='opposite-paired-balance'||gyreExit?[2,3.75,5.5,7.25]:[2.25,3.75,5.25,6.75],slotSpacing:1.05,passClearance:.66,maximumSpeed:wideBalanceEntry?1.35:1.3,maximumYawRate:4,relationships:{partner:named(partner),neighbor:named(neighbor)}});
 const actor=(id:number,t:number)=>{const p=path.sample(t*8).poses.find(p=>p.id===String(id));if(!p)throw new Error('Actor outside the compiled half-hey group.');return p;};
 const basic:MotionPlan={position:(id,t)=>actor(id,t).position,facing:(id,t)=>actor(id,t).yaw,contacts:()=>[]};
 if(gyreExit){
  if(events.events.length!==4||events.events.reduce((n,e)=>n+e.pairs.length,0)!==6||events.needsPartialExit||events.endOrder?.some((id,i)=>id!==String(entryOrder[3-i])))throw new Error('The released half hey must retain all six named encounters and its exact reversed slot permutation.');
  const terminal=sampleFormationEndpoint(context,basic,1),exitState=captureFormationState({...context,start:terminal},{sourceBeat:8,orderedIds:events.endOrder!.map(Number),geometry:{kind:'paired-sidelines',sidePair:relation,origin:center,halfWidth:.9,pairGap:1.1}});
  const successor=compileGyreFigure(context.next as GyreFigure,{...context,start:terminal,next:undefined});
  assertSuccessorEntry(exitState,{...context,start:terminal},successor);
 }
 if(options){const terminal=sampleFormationEndpoint(context,basic,1),balance=compilePrimitiveFigure(context.next!,ids,terminal,dancers,[],{balanceEntry:'held-two-hand',balanceExit:'same-person-swing'});return Object.freeze({...basic,contacts:(t:number,poses:Pose[])=>{const q=Math.max(0,Math.min(1,(t*8-7.75)/.25));return balance.contacts(0,poses).map(h=>({...h,strength:h.strength*q*q*(3-2*q)})).filter(h=>h.strength>1e-9);}});}
 if(!swingExit)return Object.freeze(basic);
 const terminal=structuredClone(start);for(const id of ids){terminal[id].position={...end.get(id)!};terminal[id].yaw=exit.get(String(id))!.yaw;}
 const swing=compilePrimitiveFigure(context.next!,ids,terminal,dancers,dancers.filter(d=>d.role==='lark').map(d=>d.direction),{swingEntry:'prepared-circle'});
 return Object.freeze({...basic,contacts:(t:number,poses:Pose[])=>{const q=Math.max(0,Math.min(1,(t*8-7.25)/.75)),strength=q*q*(3-2*q);return strength>0?swing.contacts(0,poses).map(c=>({...c,strength:c.strength*(c.target==='back'?Math.max(0,(strength-.5)/.5)**2:strength)})):[];}});
}
