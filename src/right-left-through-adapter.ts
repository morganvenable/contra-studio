/** Source-figure binding for one explicitly interpreted across R&L through.
 * The source interpreter chooses roles and relationships. This binder resolves
 * those choices against the current epoch; only then does the primitive validate
 * physical slots. Neither labels nor distances can silently select a receiver.
 */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileRightLeftThrough} from './right-left-through.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure} from './types.ts';
export function compileRightLeftThroughFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='right-left-through'||f.beats!==8||f.direction!=='right'||!['partner','neighbor'].includes(f.who??'')||!['partner','neighbor'].includes(f.crossingRelation??'')||!['lark','robin'].includes(f.courtesyLeader??'')||f.confidence==='unsupported')throw new Error('An eight-beat right-and-left-through requires an explicit right-hand crossing relation, courtesy relation, and courtesy leader role.');
 if(f.amount!==undefined||f.hands!==undefined||f.underRole!==undefined||f.notation!==undefined||f.entry!==undefined||f.exit!==undefined||f.progression)throw new Error('This across right-and-left-through adapter does not consume extra hand, amount, arch, notation, entry/exit, or progression modifiers.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),maps={partner,neighbor},courtesy=maps[f.who as 'partner'|'neighbor'],crossing=maps[f.crossingRelation!],{ids,start,dancers}=context;
 const leaders=ids.filter(id=>dancers[id].role===f.courtesyLeader);
 if(leaders.length!==2)throw new Error('The explicit courtesy leader role must identify exactly two actors in this group.');
 const courtesyPairs=leaders.map(leaderId=>({leaderId,followerId:courtesy.get(leaderId)!,relationship:f.who as 'partner'|'neighbor'}));
 const crossingPairs=ids.filter(id=>id<crossing.get(id)!).map(id=>[id,crossing.get(id)!] as const);
 const origin={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 // This is the ordinary logical 180° permutation, not progression. If the
 // preceding physical adapter leaves a compact handhold instead of these
 // declared side-couple slots, it must prepare a compatible stance itself.
 const exit=new Map(ids.map(id=>[id,{position:{x:2*origin.x-start[id].position.x,z:2*origin.z-start[id].position.z},yaw:start[id].yaw+Math.PI,velocity:{x:0,z:0},yawRate:0}]));
 return compileRightLeftThrough({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,crossingPairs,passingHand:'right',passingShoulder:'right',courtesyPairs,courtesyHold:'left-front-right-waist',frame:{origin,across:{x:1,z:0}},beats:8,crossingBeats:4});
}
