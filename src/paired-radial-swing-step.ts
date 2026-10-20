/** A carried named swing from an actual transverse closed frame. The named
 * pair centers are the measured sidelines; the outer root extent is not a
 * formation width. The ordinary swing kernel owns every counted trajectory. */
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import {captureFormationState,sampleFormationEndpoint,type FormationState} from './formation-handoff.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure,Vec2} from './types.ts';

const EPS=1e-7,FRAME_GAP=.62,EXIT_GAP=1.8;
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const distance=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>Math.hypot(a.x-b.x,a.z-b.z);
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('A paired-radial swing sample time must be finite.');return Math.max(0,Math.min(1,t));};

export interface PairedRadialSwingPlan extends SequencedMotionPlan {
 readonly entryGeometry:{readonly kind:'paired-radial-frame';readonly sidePair:'partner'|'neighbor';readonly origin:Readonly<Vec2>;readonly halfWidth:number;readonly pairGap:.62};
 readonly exitFormation:FormationState;
}

/** Registry applicability is local to the actual roots and named relation.
 * Full geometry/facing/contact checks belong to compile, so an invalid held
 * frame cannot silently fall back to an unrelated established trajectory. */
export function needsPairedRadialSwingEntry(figure:Figure,incoming:SequenceBoundary):boolean {
 if(figure.kind!=='swing'||!['partner','neighbor'].includes(figure.who??''))return false;
 const relation=new Map(incoming[figure.who as 'partner'|'neighbor']),poses=new Map(incoming.poses.map(p=>[p.id,p]));
 return incoming.actors.every(a=>{const p=poses.get(a.id),q=poses.get(relation.get(a.id)!);return !!p&&!!q&&Math.abs(p.position.z-q.position.z)<EPS&&Math.abs(p.position.x-q.position.x)>.08;});
}

export function compilePairedRadialSwingStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):PairedRadialSwingPlan {
 const figure=capturePlainData(input),boundary=ownSequenceBoundary(incoming);
 assertFigureArgumentsConsumed(figure);
 if(figure.kind!=='swing'||!['partner','neighbor'].includes(figure.who??'')||figure.beats<4||figure.beats>16||figure.direction!==undefined||figure.amount!==undefined||figure.entry!==undefined||figure.exit!==undefined||figure.hands!==undefined||figure.phaseBeats!==undefined||figure.progression===true||figure.confidence==='unsupported')throw new Error('A paired-radial swing requires an ordinary named four-to-sixteen-count swing without extra entry, exit, hand, turn or progression semantics.');
 if(typeof figure.id!=='string'||!figure.id.trim()||typeof figure.label!=='string'||!figure.label.trim())throw new Error('A paired-radial swing needs explicit text identity.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,boundary.heldContacts));
 if(!needsPairedRadialSwingEntry(figure,boundary))throw new Error('A paired-radial swing requires actual transverse named-pair roots.');
 const who=figure.who as 'partner'|'neighbor',relation=new Map(boundary[who]),poses=new Map(boundary.poses.map(p=>[p.id,p])),ids=boundary.actors.map(a=>a.id),larks=boundary.actors.filter(a=>a.role==='lark'),origin={x:boundary.poses.reduce((s,p)=>s+p.position.x,0)/4,z:boundary.poses.reduce((s,p)=>s+p.position.z,0)/4};
 const centers=larks.map(a=>{const p=poses.get(a.id)!.position,q=poses.get(relation.get(a.id)!)!.position;return{x:(p.x+q.x)/2,z:(p.z+q.z)/2};}),halfWidth=centers.reduce((s,p)=>s+Math.abs(p.x-origin.x),0)/2;
 if(larks.length!==2||halfWidth<.65-EPS||halfWidth>1.2+EPS||centers.some(p=>Math.abs(p.z-origin.z)>EPS||Math.abs(Math.abs(p.x-origin.x)-halfWidth)>EPS)||(centers[0].x>=origin.x)===(centers[1].x>=origin.x))throw new Error('A paired-radial swing needs opposite measured sideline pair centers within the .65–1.2 half-width envelope.');
 for(const a of larks){const p=poses.get(a.id)!.position,q=poses.get(relation.get(a.id)!)!.position;if(Math.abs(distance(p,q)-FRAME_GAP)>EPS)throw new Error('A paired-radial swing needs an actual .62 closed-frame root gap.');}
 const endBeat=advanceSequenceBeat(boundary.sourceBeat,figure.beats);
 const kernel=compilePrimitiveFigure(figure,[...context.ids],context.start,context.dancers,context.dancers.filter(d=>d.role==='lark').map(d=>d.direction),{swingEntryGeometry:'paired-radial-frame',swingEntry:'two-hand-balance',canonicalSwingLayout:true,geometry:{halfWidth,rowGap:EXIT_GAP}});
 const known=(id:number)=>{if(!ids.includes(id))throw new Error('The sampled actor is outside this paired-radial swing.');};
 const plan={...kernel,position(id:number,t:number){known(id);return kernel.position(id,time(t));},facing(id:number,t:number,ps:Parameters<typeof kernel.facing>[2]){known(id);return kernel.facing(id,time(t),ps);},contacts(t:number,ps:Parameters<typeof kernel.contacts>[1]){return kernel.contacts(time(t),ps);}};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 // This compares the complete raw closed frame, including body targets,
 // strengths and handedness. Filtered renderer contacts are not a substitute.
 assertSequenceHandoff(boundary,entryState);
 const end=sampleFormationEndpoint(context,plan,1),orderedIds=[...ids].sort((a,b)=>Math.atan2(end[a].position.z-origin.z,end[a].position.x-origin.x)-Math.atan2(end[b].position.z-origin.z,end[b].position.x-origin.x)),exitFormation=captureFormationState({...context,start:end},{sourceBeat:endBeat,orderedIds,geometry:{kind:'paired-sidelines',sidePair:who,origin,halfWidth,pairGap:EXIT_GAP},heldContacts:exitState.heldContacts});
 return freeze({...plan,entryState,exitState,entryGeometry:{kind:'paired-radial-frame' as const,sidePair:who,origin,halfWidth,pairGap:FRAME_GAP},exitFormation});
}
