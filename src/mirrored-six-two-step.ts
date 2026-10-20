/** Reflection of the audited measured left-circle/right-passage geometry.
 * Reflection changes spatial handedness and anatomical hands, never actor
 * identity, role, partner, current neighbor, source clock or relation epoch.
 * Source-event validation and finite progression remain outside this module. */
import type {Figure,HandContact,Pose,Vec2} from './types.ts';
import type {FigureContext} from './extended-figures.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {ownSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import {compileMeasuredSixCountCircleStep,compileMeasuredTwoCountPassStep,type MeasuredSixTwoGeometry,type MeasuredSixTwoPlan} from './measured-six-two-step.ts';

export interface MirroredSixTwoPlan extends SequencedMotionPlan {
 readonly geometry:MeasuredSixTwoGeometry;
 readonly minimumObservedClearance:number;
 readonly maximumObservedSpeed:number;
 readonly gates:readonly {readonly beat:number;readonly pair:readonly [number,number];readonly shoulder:'left'}[];
}

// One fixed world reflection is its own inverse. The measured solver still
// derives its local frame from actual partner edges; no global set axis, role
// arrangement, source ID or preceding choreography is assumed here.
const reflect=(p:Readonly<Vec2>):Vec2=>({x:-p.x,z:p.z});
const otherHand=(h:'left'|'right')=>h==='left'?'right' as const:'left' as const;
function contact(c:HandContact):HandContact {
 return{...c,handA:otherHand(c.handA),handB:otherHand(c.handB),point:{...c.point,x:-c.point.x},...(c.bodyPoint===undefined?{}:{bodyPoint:{...c.bodyPoint,x:-c.bodyPoint.x}})};
}
function poses(start:Pose[]):Pose[]{return start.map(p=>({...p,position:reflect(p.position),yaw:-p.yaw}));}
function boundary(input:SequenceBoundary):SequenceBoundary {
 const b=ownSequenceBoundary(input);
 return ownSequenceBoundary({...b,poses:b.poses.map(p=>({...p,position:reflect(p.position),yaw:-p.yaw})),heldContacts:b.heldContacts.map(contact)});
}
function canonical(input:Figure,kind:'circle'|'pass-through'):Figure {
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(kind==='circle'){
  if(f.kind!=='circle'||f.direction!=='right')throw new Error('The mirrored measured circle requires literal rightward direction.');
  return{...f,direction:'left'};
 }
 if(f.kind!=='pass-through'||f.passingShoulder!=='left')throw new Error('The mirrored measured passage requires literal left shoulders.');
 return{...f,passingShoulder:'right'};
}
function context(c:FigureContext,next?:Figure):FigureContext {
 return{...c,start:poses(c.start),dancers:c.dancers.map(d=>({...d})),relations:{...c.relations,partner:new Map(c.relations.partner),neighbor:new Map(c.relations.neighbor)},next};
}
function outward(p:MeasuredSixTwoPlan):MirroredSixTwoPlan {
 return Object.freeze({...p,
  position:(id:number,t:number)=>reflect(p.position(id,t)),
  facing:(id:number,t:number,current:Pose[])=>-p.facing(id,t,poses(current)),
  contacts:(t:number,current:Pose[])=>p.contacts(t,poses(current)).map(contact),
  entryState:boundary(p.entryState),exitState:boundary(p.exitState),
  geometry:Object.freeze({...p.geometry,origin:Object.freeze(reflect(p.geometry.origin)),axis:Object.freeze(reflect(p.geometry.axis))}),
  gates:Object.freeze(p.gates.map(g=>Object.freeze({...g,pair:Object.freeze([...g.pair] as [number,number]),shoulder:'left' as const})))
 });
}

/** Actual square entry, three places right in 5.25 counts, then .75 count of
 * released left-shoulder lane preparation inside the same six source counts. */
export function compileMirroredSixCountCircleStep(input:Figure,c:FigureContext,incoming:SequenceBoundary):MirroredSixTwoPlan {
 const f=canonical(input,'circle');
 if(!c.next)throw new Error('The mirrored measured circle needs its immediate two-count passage.');
 return outward(compileMeasuredSixCountCircleStep(f,context(c,canonical(c.next,'pass-through')),boundary(incoming)));
}

/** The same current neighbors pass by left shoulders for exactly two counts.
 * Only their physical corners change; this adapter never rebinds relations. */
export function compileMirroredTwoCountPassStep(input:Figure,c:FigureContext,incoming:SequenceBoundary):MirroredSixTwoPlan {
 const f=canonical(input,'pass-through');
 if(c.next!==undefined)throw new Error('The mirrored two-count passage must end at the declared finite event.');
 return outward(compileMeasuredTwoCountPassStep(f,context(c),boundary(incoming)));
}
