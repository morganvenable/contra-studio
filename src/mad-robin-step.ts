/** Row-local admission of the existing full-return mad robin. The shared
 * boundary owns the people and clock; the primitive owns the orbit and gaze. */
import type {Figure} from './types.ts';
import type {FigureContext} from './extended-figures.ts';
import type {FormationState} from './formation-handoff.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertMadRobinFigure,compileMadRobin,type MadRobinFigure,type MadRobinPassage} from './mad-robin.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

function sequenceBoundary(state:FormationState):SequenceBoundary {
 return ownSequenceBoundary({sourceBeat:state.sourceBeat,relationshipEpoch:state.relationshipEpoch,actors:state.actors,partner:state.partner,neighbor:state.neighbor,poses:state.orderedSlots.map(s=>({id:s.id,position:s.position,yaw:s.facing})),heldContacts:state.heldContacts});
}

export function compileMadRobinStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan&{readonly passages:readonly MadRobinPassage[]} {
 const boundary=ownSequenceBoundary(incoming),figure=capturePlainData(input) as MadRobinFigure;
 assertMadRobinFigure(figure);
 const endBeat=advanceSequenceBeat(boundary.sourceBeat,8);
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,boundary.heldContacts));
 const poses=boundary.poses,byId=new Map(poses.map(p=>[p.id,p])),orbit=new Map(boundary[figure.orbitRelation]);
 const origin={x:poses.reduce((n,p)=>n+p.position.x,0)/4,z:poses.reduce((n,p)=>n+p.position.z,0)/4},first=poses[0].position,mate=byId.get(orbit.get(poses[0].id)!)!.position;
 // Measure the declared pair's existing roots. The primitive validates every
 // station, role, facing and hold; these dimensions never repair the boundary.
 const state:FormationState={sourceBeat:boundary.sourceBeat,relationshipEpoch:boundary.relationshipEpoch,actors:boundary.actors,partner:boundary.partner,neighbor:boundary.neighbor,
  orderedSlots:[...poses].sort((a,b)=>a.position.x-b.position.x||a.position.z-b.position.z).map(p=>({id:p.id,position:p.position,facing:p.yaw})),
  geometry:{kind:'paired-sidelines',sidePair:figure.orbitRelation,origin,halfWidth:Math.abs(first.x-origin.x),pairGap:Math.hypot(first.x-mate.x,first.z-mate.z)},heldContacts:boundary.heldContacts};
 const path=compileMadRobin(figure,state),entryState=sequenceBoundary(path.entryState),exitState=sequenceBoundary(path.exitState);
 assertSequenceHandoff(boundary,entryState);
 assertSequenceHandoff({...boundary,sourceBeat:endBeat},exitState);
 // A full return leaves the same boundary for any compatible successor. Its
 // kind, title and source identity are deliberately irrelevant to this step.
 return Object.freeze({...path,entryState,exitState});
}
