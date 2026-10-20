/** Eight complete ordinary-hey pass layers with an identity-preserving terminal
 * exit. A full hey returns to its incoming corner stations; progression is never
 * fabricated here. The enclosing dance must independently prove progressed
 * partner rows before it may repeat or rebind neighbors. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileBasicPassEvents,parseHeyNotation} from './hey.ts';
import {compilePartialHey,type PartialHeyTrajectory} from './partial-hey.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,Vec2} from './types.ts';
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
export interface OrdinaryFullHeyPlan extends MotionPlan {readonly heyPlan:PartialHeyTrajectory;}
export function compileOrdinaryFullHeyFigure(input:Figure,incoming:FigureContext):OrdinaryFullHeyPlan {
 const f=structuredClone(input),context:FigureContext={...incoming,ids:[...incoming.ids],start:structuredClone(incoming.start),dancers:structuredClone(incoming.dancers),next:incoming.next?structuredClone(incoming.next):undefined,relations:{epoch:incoming.relations.epoch,partner:new Map(incoming.relations.partner),neighbor:new Map(incoming.relations.neighbor)}};
 if(input.heyAxis!==undefined)throw new Error('The ordinary hey adapter does not consume a declared diagonal/across axis; use the dedicated formation compiler.');
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='hey'||f.confidence==='unsupported'||f.beats!==16||f.amount!==1||f.who!=='neighbor'||!['lark','robin'].includes(f.heyStartRole??'')||!['left','right'].includes(f.centerShoulder??'')||!['left','right'].includes(f.endShoulder??'')||f.centerShoulder===f.endShoulder||f.entry!=='paired-sidelines'||f.exit!=='progressed-neighbors')throw new Error('The ordinary full hey requires sixteen counts, eight complete passes, explicit current-neighbor sidelines, first role, opposite center/end shoulders and the declared terminal exit.');
 if(f.notation!==undefined||f.direction!==undefined||f.hands!==undefined||f.underRole!==undefined)throw new Error('The source-semantic full hey cannot ignore additional notation, turn or hand modifiers.');
 if(context.next!==undefined)throw new Error('This full-hey exit must end the repeat; a following figure needs a different explicitly reviewed handoff.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context;
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const select=(role:'lark'|'robin',side:number)=>{const found=ids.filter(id=>dancers[id].role===role&&Math.sign(start[id].position.x-center.x)===side);if(found.length!==1)throw new Error('A full hey needs one actor of each role on each explicit sideline.');return found[0];};
 const first=f.heyStartRole!,other=first==='lark'?'robin':'lark',west=select(first,-1),east=select(first,1),westOther=select(other,-1),eastOther=select(other,1),entryOrder=[westOther,west,east,eastOther];
 for(const [a,b]of[[west,westOther],[east,eastOther]])if(neighbor.get(a)!==b||Math.abs(start[a].position.x-start[b].position.x)>.001||Math.abs(Math.abs(start[a].position.x-center.x)-.9)>.001||distance(start[a].position,start[b].position)<1.05||distance(start[a].position,start[b].position)>1.801)throw new Error('The full hey requires its named current neighbors at the incoming sideline stations.');
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
 // Assign stations from the independently compiled permutation. Full-hey
 // compression/expansion changes spacing, never the identity occupying a corner.
 const end=new Map(graph.endOrder!.map((id,slot)=>[Number(id),{...start[entryOrder[slot]].position}]));
 for(const a of ids.filter(id=>id<neighbor.get(id)!)){
  const b=neighbor.get(a)!,A=end.get(a)!,B=end.get(b)!,mid={x:(A.x+B.x)/2,z:(A.z+B.z)/2},gap=distance(A,B);
  for(const id of[a,b]){const p=end.get(id)!;end.set(id,{x:mid.x+(p.x-mid.x)*1.8/gap,z:mid.z+(p.z-mid.z)*1.8/gap});}
 }
 for(const id of ids){const p=end.get(id)!,q=end.get(partner.get(id)!)!;if(Math.abs(p.z-q.z)>.001||Math.abs(p.x+q.x-2*center.x)>.001)throw new Error('A terminal full hey must return persistent partners to opposite sides of the same row.');}
 const entry=new Map(ids.map(id=>[String(id),{position:{...start[id].position},velocity:{x:0,z:0},yaw:start[id].yaw}]));
 const exit=new Map(ids.map(id=>[String(id),{position:end.get(id)!,velocity:{x:0,z:0},yaw:end.get(id)!.z<center.z?Math.PI:0}]));
 const named=(map:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(map.get(id)!)]));
 const path=compilePartialHey({actors,events:graph.events,entry,exit,frame:{origin:center,axis:{x:1,z:0}},beats:16,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:[2,3.75,5.5,7.25,9,10.75,12.5,14.25],slotSpacing:1.05,passClearance:.66,maximumSpeed:1.3,maximumYawRate:4,relationships:{partner:named(partner),neighbor:named(neighbor)},source:f.label});
 const actor=(id:number,t:number)=>{const p=path.sample(t*16).poses.find(p=>p.id===String(id));if(!p)throw new Error('Actor outside the compiled full-hey group.');return p;};
 return Object.freeze({heyPlan:path,position:(id:number,t:number)=>actor(id,t).position,facing:(id:number,t:number)=>actor(id,t).yaw,contacts:()=>[]});
}
