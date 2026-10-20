/** Isolated mad-robin contract. Orbit mate and facing mate are different named
 * relationships. There is no gyre/do-si-do alias and no topology transaction.
 * A source terminal marker is retained, but only a whole-sequence compiler may
 * consume it after proving the actual roots and the next named actor binding. */
import {capturePlainData} from './owned-program-cache.ts';
import {assertFormationHandoff,type FormationState} from './formation-handoff.ts';
import type {MotionPlan} from './extended-figures.ts';
import type {Figure,Role,Vec2} from './types.ts';
export type MadRobinRelation='partner'|'neighbor';
export type MadRobinDirection='clockwise'|'counterclockwise';
export interface MadRobinFigure extends Figure {
 readonly kind:'mad-robin';readonly who:'all';readonly orbitRelation:MadRobinRelation;
 readonly facingRelation:MadRobinRelation;readonly frontRole:Role;
 readonly orbitDirection:MadRobinDirection;readonly amount:1;
 readonly entry:'paired-sidelines-facing-across';readonly exit:'same-slots-facing-across';
}
export interface MadRobinPassage {
 readonly sourceBeat:number;readonly fraction:.25|.75;
 readonly orbitPairs:readonly (readonly[number,number])[];
 readonly innerRole:Role;readonly outerRole:Role;
}
export interface MadRobinPlan extends MotionPlan {
 readonly figure:Readonly<MadRobinFigure>;readonly entryState:FormationState;readonly exitState:FormationState;
 readonly passages:readonly MadRobinPassage[];readonly laneRadius:.34;
 readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;
}
const EPS=1e-7,TAU=2*Math.PI,LANE=.34;
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){for(const child of Object.values(v))freeze(child);Object.freeze(v);}return v;};
const distance=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
const ease=(t:number)=>t*t*t*(10+t*(-15+6*t));
const easeDerivative=(t:number)=>30*t*t*(1-t)*(1-t);
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('A mad-robin time must be finite.');return Math.max(0,Math.min(1,t));};
function checkFigure(f:MadRobinFigure):void {
 const allowed=['id','label','beats','notes','confidence','progression','kind','who','orbitRelation','facingRelation','frontRole','orbitDirection','amount','entry','exit'];
 if(!f||Object.keys(f).some(key=>!allowed.includes(key)))throw new Error('Mad robin cannot ignore additional participants, turns, hands or route declarations.');
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence)||f.progression!==undefined&&typeof f.progression!=='boolean')throw new Error('Mad robin requires text identity/label, supported confidence and a literal boolean progression marker.');
 if(f.kind!=='mad-robin'||f.who!=='all'||!['partner','neighbor'].includes(f.orbitRelation)||!['partner','neighbor'].includes(f.facingRelation)||f.orbitRelation===f.facingRelation||!['lark','robin'].includes(f.frontRole)||!['clockwise','counterclockwise'].includes(f.orbitDirection)||f.amount!==1||f.beats!==8||f.entry!=='paired-sidelines-facing-across'||f.exit!=='same-slots-facing-across')throw new Error('This mad robin requires eight counts, one complete explicit rotation, distinct orbit/facing relationships, a front role and a full-return paired-sideline contract.');
}
export function assertMadRobinFigure(input:MadRobinFigure):void {checkFigure(capturePlainData(input));}
/** Own plain input once. A malicious getter cannot change a validated relation
 * during a later clone/read, and caller edits cannot change compiled motion. */
export function compileMadRobin(input:MadRobinFigure,incoming:FormationState):MadRobinPlan {
 const {figure:f,state}=capturePlainData({figure:input,state:incoming});checkFigure(f);
 assertFormationHandoff(state,state);
 if(state.sourceBeat+8-state.sourceBeat!==8)throw new Error('Mad-robin source clocks must represent all eight counts exactly.');
 if(state.heldContacts.some(c=>c.strength>1e-9))throw new Error('A hand-free mad robin cannot discard an incoming held contact.');
 const g=state.geometry;
 if(g.sidePair!==f.orbitRelation||g.halfWidth<.7||g.halfWidth>1.2||g.pairGap<1.2||g.pairGap>2.4)throw new Error('Mad robin must orbit its explicitly bound sideline mate within the checked paired geometry.');
 const orbit=new Map(state[f.orbitRelation]),facing=new Map(state[f.facingRelation]),slots=new Map(state.orderedSlots.map(s=>[s.id,s])),actors=new Map(state.actors.map(a=>[a.id,a]));
 const sign=f.orbitDirection==='clockwise'?1:-1;
 for(const slot of slots.values()){
  const other=slots.get(facing.get(slot.id)!)!,side=Math.sign(slot.position.x-g.origin.x),end=Math.sign(slot.position.z-g.origin.z),dx=-sign*end;
  if(Math.abs(slot.position.z-other.position.z)>EPS||Math.abs(Math.abs(slot.position.x-other.position.x)-2*g.halfWidth)>EPS||Math.abs(turn(slot.facing,heading(slot.position,other.position)))>EPS)throw new Error('Mad robin must enter already facing the named opposite-side actor, not its orbit mate or an inferred nearby person.');
  if((dx===-side)!==(actors.get(slot.id)!.role===f.frontRole))throw new Error('The declared world rotation contradicts the named front role in this actual entry layout.');
 }
 const position=(id:number,raw:number):Vec2=>{
  const t=time(raw),s=slots.get(id);if(!s)throw new Error('The actor is outside this bound mad robin.');
  // Exact return, rather than a small accumulated sine residual at every repeat.
  if(t===0||t===1)return{...s.position};
  const end=Math.sign(s.position.z-g.origin.z),theta=TAU*ease(t);
  return{x:s.position.x-sign*end*LANE*Math.sin(theta),z:g.origin.z+end*g.pairGap/2*Math.cos(theta)};
 };
 const facingAt=(id:number,raw:number):number=>{time(raw);const s=slots.get(id);if(!s)throw new Error('The actor is outside this bound mad robin.');return s.facing;};
 const pairs=[...orbit].filter(([a,b])=>a<b).map(([a,b])=>[a,b]as const);
 const inverseEase=(q:number)=>{let lo=0,hi=1;for(let i=0;i<60;i++){const t=(lo+hi)/2;if(ease(t)<q)lo=t;else hi=t;}return(lo+hi)/2;};
 const passages:MadRobinPassage[]=([.25,.75]as const).map((fraction,i)=>({sourceBeat:state.sourceBeat+f.beats*inverseEase(fraction),fraction,orbitPairs:pairs,innerRole:i===0?f.frontRole:f.frontRole==='robin'?'lark':'robin',outerRole:i===0?(f.frontRole==='robin'?'lark':'robin'):f.frontRole}));
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0;
 for(let k=0;k<=f.beats*120;k++){
  const t=k/(f.beats*120),q=TAU*ease(t),rate=TAU*easeDerivative(t)/f.beats,points=state.actors.map(a=>position(a.id,t));
  maximumObservedSpeed=Math.max(maximumObservedSpeed,rate*Math.hypot(LANE*Math.cos(q),g.pairGap/2*Math.sin(q)));
  for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(points[a],points[b]));
  for(const a of state.actors)if(Math.abs(turn(facingAt(a.id,t),heading(position(a.id,t),position(facing.get(a.id)!,t))))>EPS)throw new Error('The fixed-facing orbit lost its explicitly named opposite-side actor.');
 }
 if(minimumObservedClearance<.60-EPS||maximumObservedSpeed>1.8+EPS)throw new Error('Mad-robin roots exceed the checked clearance or walking-speed budget.');
 const exitState=freeze({...state,sourceBeat:state.sourceBeat+f.beats,orderedSlots:state.orderedSlots.map(s=>({id:s.id,position:position(s.id,1),facing:facingAt(s.id,1)})),heldContacts:[]});
 assertFormationHandoff({...state,sourceBeat:state.sourceBeat+f.beats,heldContacts:[]},exitState);
 return Object.freeze({figure:freeze(f),entryState:freeze(state),exitState,passages:freeze(passages),laneRadius:LANE,minimumObservedClearance,maximumObservedSpeed,position,facing:facingAt,contacts:(t:number)=>{time(t);return[];}});
}
