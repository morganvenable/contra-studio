/** Source-marked, terminal current-neighbor left pull-by after a complete
 * six-count left star three-quarters. This bounded continuation is independent
 * of nonterminal pull-bys: no glyph, extra turn, or partner swap is inferred. */
import {compileNamedPullBy} from './named-pull-by.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {distance,heading} from './ring-twirl-contract.ts';
import type {Figure} from './types.ts';

/** Runs on the original figure list before the ordinary finite compiler clears
 * its working progression flags. The endpoint can never invent source intent. */
export function assertTerminalNamedPullByComposition(figures:readonly Figure[]):void {
 const terminal=figures.map((f,i)=>({f,i})).filter(({f})=>f.kind==='pull-by'&&f.exit==='progressed-neighbors');
 if(terminal.length!==1)throw new Error('A terminal named pull-by requires exactly one explicit final passage contract.');
 const{f,i}=terminal[0],star=figures[i-1];
 if(i!==figures.length-1||f.beats!==2||f.who!=='neighbor'||f.hands!=='left'||f.progression!==true||figures.filter(f=>f.progression===true).length!==1||star?.kind!=='star'||star.who!=='all'||star.direction!=='left'||star.amount!==.75||star.beats!==6)throw new Error('Terminal named pull-by requires the source-marked final two-count current-neighbor left passage immediately after a complete six-count left star three-quarters.');
}

export function compileTerminalNamedPullByFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='pull-by'||f.who!=='neighbor'||f.hands!=='left'||f.beats!==2||f.exit!=='progressed-neighbors'||f.confidence==='unsupported'||context.next!==undefined)throw new Error('The terminal named pull-by adapter requires exactly two counts, current neighbors, left hands and an explicit terminal progressed-neighbor exit.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context;
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 if(ids.some(id=>Math.abs(Math.abs(start[id].position.x-center.x)-.9)>1e-7||Math.abs(Math.abs(start[id].position.z-center.z)-.9)>1e-7)||new Set(ids.map(id=>`${Math.sign(start[id].position.x-center.x)},${Math.sign(start[id].position.z-center.z)}`)).size!==4)throw new Error('The terminal named pull-by requires four exact standard longways corners.');
 const pairs=ids.filter(id=>id<neighbor.get(id)!).map(a=>({a,b:neighbor.get(a)!,relationship:'neighbor' as const}));
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const exit=new Map(ids.map(id=>{
  const a=start[id].position,b=start[neighbor.get(id)!].position,p=start[partner.get(id)!].position;
  if(Math.abs(a.x-b.x)>1e-7||Math.abs(a.z+b.z-2*center.z)>1e-7||Math.abs(a.z-p.z)>1e-7||Math.abs(a.x+p.x-2*center.x)>1e-7)throw new Error('The terminal passage requires bound current neighbors on each sideline and persistent partners facing across the same entry row.');
  const position={...b},rowSign=Math.sign(position.z-center.z),roleSign=dancers[id].role==='lark'?1:-1;
  if(Math.abs(position.x-center.x-.9*rowSign*roleSign)>1e-7||distance(a,b)<1.8-1e-7)throw new Error('The literal neighbor exchange must land persistent partners on the exact progressed row with onward lark-left role placement.');
  return[id,{position,yaw:heading(a,b),velocity:{x:0,z:0},yawRate:0}];
 }));
 return compileNamedPullBy({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,pairs,hand:'left',beats:2});
}
