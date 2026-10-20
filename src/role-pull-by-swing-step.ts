/** Row-local same-role left pull-by into the explicitly named next swing.
 * The existing passage owns its literal two/four counts and exact slot swap.
 * The successor supplies its receiver and facing, never replacement roots. */
import type {Figure} from './types.ts';
import type {FigureContext} from './extended-figures.ts';
import {compileNamedPullBy} from './named-pull-by.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {assertBareArchCorners,assertRolePullByFigure} from './bare-arch-step.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import {heading} from './ring-twirl-contract.ts';

export function compileRolePullBySwingStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan&ReturnType<typeof compileNamedPullBy> {
 const f=assertRolePullByFigure(input),boundary=ownSequenceBoundary(incoming),next=context.next&&capturePlainData(context.next);
 if(!next)throw new Error('A carried same-role pull-by needs its immediate named swing receiver.');
 assertFigureArgumentsConsumed(next);
 if(next.kind!=='swing'||!['partner','neighbor'].includes(next.who??'')||!Number.isFinite(next.beats)||next.beats<4||next.beats>64||next.entry!==undefined||next.exit!==undefined||next.progression===true||next.confidence==='unsupported')throw new Error('A carried same-role pull-by needs an ordinary, nonprogressing named partner or neighbor swing.');
 if(boundary.heldContacts.length)throw new Error('A carried same-role pull-by requires released incoming hands.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 assertBareArchCorners(boundary);
 const endBeat=advanceSequenceBeat(boundary.sourceBeat,f.beats),role=f.who==='larks'?'lark':'robin',active=boundary.actors.filter(a=>a.role===role),ids=boundary.actors.map(a=>a.id);
 if(active.length!==2)throw new Error('A same-role passage needs exactly two bound actors of the declared role.');
 const pairs=[{a:active[0].id,b:active[1].id,relationship:f.who as 'larks'|'robins'}],entry=new Map(boundary.poses.map(p=>[p.id,{position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0}])),swapped=new Map(boundary.poses.map(p=>[p.id,{...p.position}]));
 for(const{a,b}of pairs){swapped.set(a,{...entry.get(b)!.position});swapped.set(b,{...entry.get(a)!.position});}
 const receiver=new Map(boundary[next.who as 'partner'|'neighbor']);
 if(ids.some(id=>Math.abs(swapped.get(id)!.x-swapped.get(receiver.get(id)!)!.x)>1e-7))throw new Error('This actual same-role slot exchange does not put the declared next swing receivers together on their sidelines.');
 const exit=new Map(ids.map(id=>{const position=swapped.get(id)!;return[id,{position,yaw:heading(position,swapped.get(receiver.get(id)!)!)+Math.PI/3,velocity:{x:0,z:0},yawRate:0}];}));
 // The diagonal two-count passage has a measured 1.68556-unit/count peak.
 // This local 1.70 allowance preserves the established path and contact gate;
 // all four-count and legacy routes retain the primitive's default 1.65.
 const plan=compileNamedPullBy({actors:ids.map(id=>context.dancers[id]),entry,exit,relations:{epoch:boundary.relationshipEpoch,partner:new Map(boundary.partner),neighbor:new Map(boundary.neighbor)},bindingEpoch:boundary.relationshipEpoch,pairs,hand:'left',beats:f.beats as 2|4,...(f.beats===2?{maximumSpeed:1.70}:{})});
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState});
}
