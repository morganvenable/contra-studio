/** Bind the explicit across-set named-pair promenade to one current topology epoch. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compilePromenade} from './promenade.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure} from './types.ts';
export function compilePromenadeFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='promenade'||f.beats!==8||!['partner','neighbor'].includes(f.who??'')||f.entry!=='side-couples'||f.amount!==.5||f.direction!=='left'||f.hands!=='both'||f.courtesyLeader!=='lark'||f.promenadeRoute!=='across-set'||f.passingShoulder!=='left'||f.promenadeHold!=='skaters'||f.confidence==='unsupported'||f.progression)throw new Error('The promenade adapter requires an explicit eight-beat named partner or neighbor half-promenade across the set, larks left, left shoulders, left turn, and both hands in skaters hold.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context;
 const leaders=ids.filter(id=>dancers[id].role===f.courtesyLeader);
 if(leaders.length!==2)throw new Error('The explicit promenade leader role must identify exactly two actors in this group.');
 const relationship=f.who as 'partner'|'neighbor',bound=relationship==='partner'?partner:neighbor;
 const pairs=leaders.map(leaderId=>({leaderId,followerId:bound.get(leaderId)!,relationship}));
 const origin={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 // A compact held stance is physical, not a new formation. Restore canonical
 // side-couple slots after the half-turn without changing the selected current relation or persistent couple identities.
 const exit=new Map(ids.map(id=>[id,{position:{x:2*origin.x-start[id].position.x,z:origin.z-Math.sign(start[id].position.z-origin.z)*.9},yaw:start[id].yaw+Math.PI,velocity:{x:0,z:0},yawRate:0}]));
 return compilePromenade({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,pairs,passingShoulder:'left',turnDirection:'left',hold:'skaters',frame:{origin,across:{x:1,z:0}},beats:8,crossingBeats:4});
}
