/** A literal four-layer half hey on a named Becket diagonal, or its explicitly
 * bound straight-across successor. The formation compiler chooses the actors;
 * this adapter never searches for a convenient person by proximity. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {compileBasicPassEvents,parseHeyNotation} from './hey.ts';
import {compilePartialHey,type PartialHeyTrajectory} from './diagonal-hey-path.ts';
import type {Figure,Vec2,Pose} from './types.ts';
const heading=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);
export interface DiagonalHeyPlan extends MotionPlan {trajectory:PartialHeyTrajectory;actors:readonly number[];entryOrder:readonly number[];exitPoses:readonly Pose[];}
export function compileDiagonalHalfHeyFigure(raw:Figure,input:FigureContext):DiagonalHeyPlan {
 const figure=structuredClone(raw),context={...input,ids:[...input.ids],start:structuredClone(input.start),dancers:structuredClone(input.dancers),next:input.next?structuredClone(input.next):undefined,relations:{epoch:input.relations.epoch,partner:new Map(input.relations.partner),neighbor:new Map(input.relations.neighbor)}};
 assertFigureArgumentsConsumed(figure);
 const diagonal=figure.heyAxis==='left-diagonal',heyGap=1.16;
 if(figure.kind!=='hey'||figure.beats!==8||figure.amount!==.5||figure.who!=='partner'||figure.heyStartRole!=='robin'||figure.centerShoulder!=='right'||figure.endShoulder!=='left'||figure.entry!=='side-couples'||!['left-diagonal','across'].includes(figure.heyAxis??'')||figure.exit!==(diagonal?'diagonal-to-across':'opposite-paired-balance')||figure.confidence==='unsupported'||figure.progression!==diagonal&&figure.progression!==undefined)throw new Error('This half hey requires the exact robin-led right-center/left-end left-diagonal or across side-couple contract.');
 if(diagonal&&(context.next?.kind!=='hey'||context.next.heyAxis!=='across')||!diagonal&&(context.next?.kind!=='balance'||context.next.who!=='partner'||context.next.beats!==4))throw new Error('The diagonal must lead into its declared across half hey; the across half hey must lead into its partner balance.');
 const partners=resolveBoundFigureRelation(context,'partner'),neighbors=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context;
 if(ids.length!==4)throw new Error('A half hey requires four explicitly bound actors.');
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const select=(role:'lark'|'robin',side:number)=>{const found=ids.filter(id=>dancers[id].role===role&&Math.sign(start[id].position.x-center.x)===side);if(found.length!==1)throw new Error('The half hey requires one explicit actor of each role on each side.');return found[0];};
 const wl=select('lark',-1),wr=select('robin',-1),el=select('lark',1),er=select('robin',1);
 for(const [l,r,side]of[[wl,wr,-1],[el,er,1]])if(partners.get(l)!==r||Math.abs(start[l].position.x-start[r].position.x)>1e-6||Math.abs(start[l].position.x-center.x-side*.9)>1e-6||Math.abs(start[l].position.z-start[r].position.z-side*heyGap)>1e-6)throw new Error('Named partners must enter in the full conventional Becket side-couple slots.');
 const west={x:-.9+center.x,z:(start[wl].position.z+start[wr].position.z)/2},east={x:.9+center.x,z:(start[el].position.z+start[er].position.z)/2};
 if(Math.abs(east.z-west.z-(diagonal?-2*1.42:0))>1e-6)throw new Error('The named left-diagonal/across couple sites contradict the incoming physical corners.');
 const entryOrder=[wl,wr,er,el];
 const actors=ids.map(id=>({id:String(id),role:dancers[id].role,couple:String(dancers[id].couple)})),events=compileBasicPassEvents(parseHeyNotation('(8) Hey 1/2 (WR;NL;MR;PL)'),actors,entryOrder.map(String));
 const exitPoses=start.map(p=>({...p,position:{...p.position}}));
 for(const id of ids){exitPoses[id].position={x:2*center.x-start[id].position.x,z:2*center.z-start[id].position.z};exitPoses[id].yaw=exitPoses[id].position.x>center.x?-Math.PI/2:Math.PI/2;}
 if(!diagonal)for(const l of[wl,el]){const r=partners.get(l)!,a=exitPoses[l].position,b=exitPoses[r].position,c={x:(a.x+b.x)/2,z:(a.z+b.z)/2};for(const id of[l,r]){const p=exitPoses[id];p.position={x:c.x+(p.position.x-c.x)*1.18/heyGap,z:c.z+(p.position.z-c.z)*1.18/heyGap};}for(const[id,other]of[[l,r],[r,l]])exitPoses[id].yaw=heading(exitPoses[id].position,exitPoses[other].position);}
 const constraint=(p:Pose)=>({position:{...p.position},velocity:{x:0,z:0},yaw:p.yaw});
 const named=(map:ReadonlyMap<number,number>)=>new Map(ids.map(id=>[String(id),String(map.get(id)!)]));
 const trajectory=compilePartialHey({...(diagonal?{boundaryAssembly:{kind:'becket-side-pairs' as const,partners:named(partners),entry:[0,2.5] as const,exit:[6.75,8] as const,evidence:'Named persistent-partner boundary assembly with conservative whole-window reciprocal-encounter rejection'}}:{}),actors,events:events.events,entry:new Map(ids.map(id=>[String(id),constraint(start[id])])),exit:new Map(ids.map(id=>[String(id),constraint(exitPoses[id])])),frame:{origin:center,axis:diagonal?{x:Math.cos(-.6),z:Math.sin(-.6)}:{x:1,z:0}},beats:8,entryBeats:0,exitBeats:0,boundaryMode:'within-passes',gateBeats:diagonal?[2.5,47/12,16/3,6.75]:[2,3.75,5.5,7.25],slotSpacing:diagonal?.8:1.05,passClearance:diagonal?.80:.66,maximumSpeed:10,maximumYawRate:100,relationships:{partner:named(partners),neighbor:named(neighbors)}});
 const sample=(id:number,t:number)=>{if(!ids.includes(id)||!Number.isFinite(t))throw new Error('Half-hey sampling needs a bound actor and finite time.');return trajectory.sample(t*8).poses.find(p=>p.id===String(id))!;};
 return Object.freeze({actors:Object.freeze(ids),entryOrder:Object.freeze(entryOrder),exitPoses:Object.freeze(exitPoses.map(p=>Object.freeze({...p,position:Object.freeze({...p.position})}))),trajectory,position:(id:number,t:number)=>sample(id,t).position,facing:(id:number,t:number)=>sample(id,t).yaw,contacts:()=>[]});
}
