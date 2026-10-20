/** Checked conventional source adapter. Core registration is separately gated by
 * complete dances and finite-set circulation, not just this fragment.
 *
 * The Nice Combination, Gene Hubert, ContraDB #138: the preceding neighbor swing
 * ends facing down. Dancers' left→right down order is [east lark, east robin,
 * west lark, west robin]. The conventional +π couples turn backs the lark and
 * advances the robin. Bend retains the line's adjacency and rejoins its free ends.
 */
import {compileHallTravel,type HallTravelOptions,type TravelConstraint,type TravelContact} from './travel-figures.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import type {Figure} from './types.ts';

export type TravelFigureBinding=Pick<HallTravelOptions,'lineOrder'|'exit'|'frame'|'turn'|'downHands'|'returnHands'|'closingHands'|'lineSpacing'|'travelDistance'|'ringWidth'|'ringDepth'>;
export interface TravelFigureContext extends FigureContext {travelBinding?:TravelFigureBinding;}
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
const hands=(order:readonly number[]):TravelContact[]=>order.slice(0,3).map((a,i)=>({a,b:order[i+1],handA:'right',handB:'left'}));
/** Resolve a named current relation against four exact incoming sideline slots.
 * This is slot/role validation, never a nearest-person or actor-ID-order search. */
export function conventionalTravelBinding(f:Figure,context:FigureContext):TravelFigureBinding {
 if(f.entry!=='paired-sidelines-facing-down'||!['partner','neighbor'].includes(f.hallPairRelation??'')||!['couples','alone'].includes(f.hallTurn??''))throw new Error('Conventional travel requires explicit paired-sideline/down-facing entry, relation and turn mode.');
 const relation=resolveBoundFigureRelation(context,f.hallPairRelation!),{ids,start,dancers}=context,center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const select=(role:'lark'|'robin',side:1|-1)=>{
  const matches=ids.filter(id=>dancers[id].role===role&&Math.abs(start[id].position.x-center.x-side*.9)<1e-6&&Math.abs(start[id].position.z-center.z-(role==='lark'?side:-side)*.9)<1e-6);
  if(matches.length!==1)throw new Error('Conventional hall entry requires one named lark and robin in each exact reviewed ±.9 sideline slot.');
  const id=matches[0];if(Math.abs(wrap(start[id].yaw))>1e-6)throw new Error('The preceding figure must finish with every actor facing down the hall.');return id;
 };
 const lineOrder=[select('lark',1),select('robin',1),select('lark',-1),select('robin',-1)] as const;
 for(const[a,b]of[[lineOrder[0],lineOrder[1]],[lineOrder[2],lineOrder[3]]])if(relation.get(a)!==b)throw new Error('The declared travel relation contradicts the incoming paired sideline slots.');
 const returned=f.hallTurn==='couples'?[lineOrder[2],lineOrder[3],lineOrder[0],lineOrder[1]]:[...lineOrder].reverse(),ring=1.35,origin={x:center.x,z:center.z+ring/2},exit=new Map<number,TravelConstraint>();
 for(const[id,i]of returned.map((id,i)=>[id,i] as const)){const x=(i<2?-1:1)*ring/2,z=i===0||i===3?-ring:0;exit.set(id,{position:{x:origin.x+x,z:origin.z+z},yaw:Math.atan2(-x,-ring/2-z),velocity:{x:0,z:0},yawRate:0});}
 return{lineOrder,exit,frame:{origin,down:{x:0,z:1}},turn:f.hallTurn==='couples'?{mode:'couples',pairs:[{leftId:lineOrder[0],rightId:lineOrder[1],halfTurn:1},{leftId:lineOrder[2],rightId:lineOrder[3],halfTurn:1}]}:{mode:'alone',actors:lineOrder.map(id=>({id,halfTurn:1}))},downHands:hands(lineOrder),returnHands:hands(returned),closingHands:{a:returned[3],b:returned[0],handA:'right',handB:'left'},lineSpacing:.9,travelDistance:.6,ringWidth:ring,ringDepth:ring};
}
export function compileTravelFigure(f:Figure,context:TravelFigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='hall-travel'||f.beats!==16||f.entry!=='paired-sidelines-facing-down'||!['partner','neighbor'].includes(f.hallPairRelation??'')||!['couples','alone'].includes(f.hallTurn??'')||f.confidence==='unsupported')throw new Error('Hall travel requires an explicit sixteen-beat down/turn plus return/bend composition and reviewed entry.');
 if(f.who!==undefined||f.direction!==undefined||f.amount!==undefined||f.hands!==undefined||f.underRole!==undefined||f.notation!==undefined||f.exit!==undefined||f.progression||f.courtesyLeader!==undefined||f.crossingRelation!==undefined)throw new Error('Hall travel cannot silently consume extra scope, hand, direction, exit, progression or other figure modifiers.');
 if(!f.hallPhaseBeats||f.hallPhaseBeats.length!==4||f.hallPhaseBeats.some(b=>b!==4))throw new Error('This reviewed conventional adapter requires an explicit [4,4,4,4] allocation within the source 8+8 hall rows.');
 const relation=resolveBoundFigureRelation(context,f.hallPairRelation!),binding=context.travelBinding??conventionalTravelBinding(f,context);
 if(binding.turn.mode!==f.hallTurn)throw new Error('The supplied travel binding contradicts the source turn-alone/couples semantics.');
 if(binding.turn.mode==='couples')for(const p of binding.turn.pairs){
  if(relation.get(p.leftId)!==p.rightId)throw new Error('Travel turn pairs must match the explicitly named current relation.');
  if(p.halfTurn!==1||context.dancers[p.leftId]?.role!=='lark'||context.dancers[p.rightId]?.role!=='robin')throw new Error('This conventional source interpretation requires the lark backing and robin advancing through a positive half-turn.');
 }
 else if(binding.turn.actors.some(a=>a.halfTurn!==1))throw new Error('This reviewed turn-alone interpretation uses an explicit positive half-turn for every actor.');
 const entry=new Map(context.ids.map(id=>[id,{position:{...context.start[id].position},yaw:context.start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 return compileHallTravel({...binding,actorIds:context.ids,entry,beats:16,sourceBeatBudget:[8,8],phaseBeats:[...f.hallPhaseBeats] as [number,number,number,number]});
}
