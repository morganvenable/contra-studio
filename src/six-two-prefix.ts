/** Source-local compact prefixes for the literal circle-six/pass-two owner.
 * These are new explicit endpoint bindings, never scaled legacy adapter output.
 * The underlying hall and promenade solvers retain their source counts, named
 * relationships, turn modes, shoulders and physical certificates unchanged. */
import {compileTravelFigure,type TravelFigureBinding} from './travel-figure-adapter.ts';
import {compilePromenade} from './promenade.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,SixTwoTravelPrefix} from './types.ts';
export type {SixTwoTravelPrefix} from './types.ts';

/** The bend remains the existing solver's fully reachable 1.35m ring. The next
 * circle/partner swing opens to compact sidelines inside its own source counts.
 * A 1.44m ring was rejected by the hall solver's complete-handhold certificate. */
export const SIX_TWO_HALL_PROMENADE_PREFIX:Readonly<SixTwoTravelPrefix>=Object.freeze({kind:'hall-promenade',hallLineSpacing:.72,hallTravelDistance:.6,hallRingWidth:1.35,hallRingDepth:1.35,promenadeHalfRowGap:.72});
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const hands=(order:readonly number[])=>order.slice(0,3).map((a,i)=>({a,b:order[i+1],handA:'right' as const,handB:'left' as const}));
const center=(c:FigureContext)=>({x:c.ids.reduce((n,id)=>n+c.start[id].position.x,0)/4,z:c.ids.reduce((n,id)=>n+c.start[id].position.z,0)/4});
function assertPrefix(prefix:SixTwoTravelPrefix):void {
 const expected=SIX_TWO_HALL_PROMENADE_PREFIX;
 if(!prefix||Object.keys(prefix).length!==Object.keys(expected).length||Object.entries(expected).some(([k,v])=>prefix[k as keyof SixTwoTravelPrefix]!==v))throw new Error('The compact hall/promenade prefix requires its exact retained source-local geometry choices.');
}
export function compactSixTwoTravelBinding(f:Figure,c:FigureContext,prefix:SixTwoTravelPrefix):TravelFigureBinding {
 assertPrefix(prefix);
 if(f.hallTurn!=='alone'||f.hallPairRelation!=='neighbor')throw new Error('This hall/promenade source prefix retains the explicit neighbor turn-alone route.');
 const relation=resolveBoundFigureRelation(c,f.hallPairRelation),o=center(c);
 const select=(role:'lark'|'robin',side:1|-1)=>{
  const found=c.ids.filter(id=>c.dancers[id].role===role&&Math.abs(c.start[id].position.x-o.x-side*.72)<1e-6&&Math.abs(c.start[id].position.z-o.z-(role==='lark'?side:-side)*.72)<1e-6);
  if(found.length!==1)throw new Error('The preceding swing must reach the source-local ±0.72 paired sideline slots.');
  const id=found[0];if(Math.abs(turn(c.start[id].yaw,0))>1e-6)throw new Error('The preceding source-counted swing must physically finish facing down.');return id;
 };
 const lineOrder=[select('lark',1),select('robin',1),select('lark',-1),select('robin',-1)] as const;
 for(const[a,b]of[[lineOrder[0],lineOrder[1]],[lineOrder[2],lineOrder[3]]])if(relation.get(a)!==b)throw new Error('The incoming compact sidelines contradict the retained hall pair relation.');
 const returned=[...lineOrder].reverse(),origin={x:o.x,z:o.z+prefix.hallRingDepth/2};
 const exit=new Map(returned.map((id,i)=>{const x=(i<2?-1:1)*prefix.hallRingWidth/2,z=i===0||i===3?-prefix.hallRingDepth:0;return[id,{position:{x:origin.x+x,z:origin.z+z},yaw:Math.atan2(-x,-prefix.hallRingDepth/2-z),velocity:{x:0,z:0},yawRate:0}];}));
 return{lineOrder,exit,frame:{origin,down:{x:0,z:1}},turn:{mode:'alone',actors:lineOrder.map(id=>({id,halfTurn:1}))},downHands:hands(lineOrder),returnHands:hands(returned),closingHands:{a:returned[3],b:returned[0],handA:'right',handB:'left'},lineSpacing:prefix.hallLineSpacing,travelDistance:prefix.hallTravelDistance,ringWidth:prefix.hallRingWidth,ringDepth:prefix.hallRingDepth};
}
export function compileSixTwoPrefixFigure(f:Figure,c:FigureContext,prefix?:SixTwoTravelPrefix):MotionPlan|undefined {
 if(prefix===undefined)return undefined;
 assertPrefix(prefix);
 if(f.kind==='hall-travel')return compileTravelFigure(f,{...c,travelBinding:compactSixTwoTravelBinding(f,c,prefix)});
 if(f.kind!=='promenade')return undefined;
 assertFigureArgumentsConsumed(f);
 if(f.beats!==8||f.who!=='partner'||f.entry!=='side-couples'||f.amount!==.5||f.direction!=='left'||f.hands!=='both'||f.courtesyLeader!=='lark'||f.promenadeRoute!=='across-set'||f.passingShoulder!=='left'||f.promenadeHold!=='skaters'||f.confidence==='unsupported'||f.progression)throw new Error('The compact source prefix retains the complete partner promenade8, left shoulders, left couple turn and both hands in skaters hold.');
 const partner=resolveBoundFigureRelation(c,'partner'),neighbor=resolveBoundFigureRelation(c,'neighbor'),o=center(c);
 const pairs=c.ids.filter(id=>c.dancers[id].role==='lark').map(leaderId=>({leaderId,followerId:partner.get(leaderId)!,relationship:'partner' as const}));
 const entry=new Map(c.ids.map(id=>[id,{position:{...c.start[id].position},yaw:c.start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 for(const id of c.ids)if(Math.abs(Math.abs(c.start[id].position.x-o.x)-.72)>1e-6||Math.abs(Math.abs(c.start[id].position.z-o.z)-.34)>1e-6)throw new Error('The source partner swing must reach its declared compact paired-promenade stance.');
 const exit=new Map(c.ids.map(id=>[id,{position:{x:2*o.x-c.start[id].position.x,z:o.z-Math.sign(c.start[id].position.z-o.z)*prefix.promenadeHalfRowGap},yaw:c.start[id].yaw+Math.PI,velocity:{x:0,z:0},yawRate:0}]));
 return compilePromenade({actors:c.ids.map(id=>c.dancers[id]),entry,exit,relations:{epoch:c.relations.epoch,partner,neighbor},bindingEpoch:c.bindingEpoch,pairs,passingShoulder:'left',turnDirection:'left',hold:'skaters',frame:{origin:o,across:{x:1,z:0}},beats:8,crossingBeats:4});
}
