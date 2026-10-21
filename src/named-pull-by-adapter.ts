/** Bounded source-sequence binding for named pull-bys. Named current identities
 * exchange physical slots; a following figure supplies only its entry facing.
 * Terminal progression and unknown continuations are deliberately separate. */
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {compileNamedPullBy,type PullByRelation} from './named-pull-by.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {heading} from './ring-twirl-contract.ts';
import type {Figure} from './types.ts';
export function compileNamedPullByFigure(f:Figure,context:FigureContext):MotionPlan {
 assertFigureArgumentsConsumed(f);
 if(f.kind!=='pull-by'||f.confidence==='unsupported'||f.progression||f.exit!==undefined||f.entry!==undefined||!['partner','neighbor','larks','robins'].includes(f.who??'')||!['left','right'].includes(f.hands??'')||![2,4].includes(f.beats))throw new Error('A named pull-by requires explicit participants, left or right hands, two or four source counts, and no undeclared progression.');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers,next}=context,who=f.who as PullByRelation;
 const swing=next?.kind==='swing'&&next.who==='partner'&&['larks','robins'].includes(who)&&f.beats===4;
 const allemande=next?.kind==='allemande'&&next.who==='larks'&&next.direction==='right'&&next.amount===1.5&&next.beats===8&&who==='partner'&&f.beats===2;
 const pairs=who==='partner'||who==='neighbor'?ids.filter(id=>id<(who==='partner'?partner:neighbor).get(id)!).map(a=>({a,b:(who==='partner'?partner:neighbor).get(a)!,relationship:who})):(()=>{const role=who==='larks'?'lark':'robin',found=ids.filter(id=>dancers[id].role===role);if(found.length!==2)throw new Error('The named pull-by role must identify exactly two actors.');return[{a:found[0],b:found[1],relationship:who}];})();
 if(!swing&&!allemande)throw new Error('This named pull-by continuation needs a separately reviewed endpoint adapter; terminal progression is not inferred.');
 const center={x:ids.reduce((n,id)=>n+start[id].position.x,0)/4,z:ids.reduce((n,id)=>n+start[id].position.z,0)/4};
 if(ids.some(id=>Math.abs(Math.abs(start[id].position.x-center.x)-.9)>1e-6||Math.abs(Math.abs(start[id].position.z-center.z)-.9)>1e-6)||new Set(ids.map(id=>`${Math.sign(start[id].position.x-center.x)},${Math.sign(start[id].position.z-center.z)}`)).size!==4)throw new Error('This named pull-by composition requires four exact standard longways corner slots.');
 const entry=new Map(ids.map(id=>[id,{position:{...start[id].position},yaw:start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));
 const swapped=new Map(ids.map(id=>[id,{...start[id].position}]));for(const{a,b}of pairs){swapped.set(a,{...start[b].position});swapped.set(b,{...start[a].position});}
 if(swing&&ids.some(id=>Math.abs(swapped.get(id)!.x-swapped.get(partner.get(id)!)!.x)>1e-6))throw new Error('This pull-by must physically place each persistent partner on the same sideline for the following swing.');
 const larks=ids.filter(id=>dancers[id].role==='lark');
 const exit=new Map(ids.map(id=>{const position=swapped.get(id)!,target=swing?swapped.get(partner.get(id)!)!:dancers[id].role==='lark'?swapped.get(larks.find(other=>other!==id)!)!:center;return[id,{position,yaw:heading(position,target)+(swing?Math.PI/3:0),velocity:{x:0,z:0},yawRate:0}];}));
 return compileNamedPullBy({actors:ids.map(id=>dancers[id]),entry,exit,relations:{epoch:context.relations.epoch,partner,neighbor},bindingEpoch:context.bindingEpoch,pairs,hand:f.hands as 'left'|'right',beats:f.beats as 2|4});
}
