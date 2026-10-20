import {compileLongLinesRollaway} from './long-lines-rollaway.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {Figure,Role} from './types.ts';

/** Explicit source contract; core registration is separately capability-gated. */
export type LongLinesRollawayFigure=Omit<Figure,'kind'> & {kind:'long-lines-rollaway';rollRole:Role;sashayRole:Role;rollRelation:'partner'|'neighbor';rollDirection:'left-to-right'|'right-to-left';rollPhase:'return';rollHalfSashay:true;phaseBeats:readonly [4,4]};
export function compileLongLinesRollawayFigure(f:LongLinesRollawayFigure,context:FigureContext):MotionPlan {
 const keys=new Set(['id','kind','beats','label','notes','confidence','progression','who','rollRole','sashayRole','rollRelation','rollDirection','rollPhase','rollHalfSashay','phaseBeats']);
 if(Object.keys(f).some(k=>!keys.has(k)&&f[k as keyof LongLinesRollawayFigure]!==undefined)||f.kind!=='long-lines-rollaway'||f.beats!==8||f.who!=='all'||!['lark','robin'].includes(f.rollRole)||!['lark','robin'].includes(f.sashayRole)||f.rollRole===f.sashayRole||f.progression||f.confidence==='unsupported')throw new Error('Long-lines rollaway needs explicit opposite rolling/sashaying roles and a complete eight-beat return composition; additional modifiers are not ignored.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),relation=f.rollRelation==='partner'?partner:f.rollRelation==='neighbor'?neighbor:undefined;if(!relation)throw new Error('Rollaway relationship must be explicit.');
 const{ids,start,dancers}=context,pairs=ids.filter(id=>dancers[id].role===f.rollRole).map(rollingId=>({rollingId,sashayingId:relation.get(rollingId)!,relationship:f.rollRelation}));if(pairs.length!==2||pairs.some(p=>dancers[p.sashayingId].role!==f.sashayRole))throw new Error('The source roles do not resolve to two explicit current pairs.');
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}])),exit=new Map(ids.map(id=>[id,{position:{...start[relation.get(id)!].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 return compileLongLinesRollaway({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,pairs,direction:f.rollDirection,halfSashay:f.rollHalfSashay,beats:8,rollPhase:f.rollPhase,phaseBeats:f.phaseBeats});
}
