/** Carry the existing exact paired hall contract through formation/event wrappers.
 * No staging geometry is synthesized here: the preceding endpoint must already
 * supply the reviewed down-facing slots and every raw held contact must match. */
import type {Figure} from './types.ts';
import type {FigureContext} from './extended-figures.ts';
import {compileTravelFigure} from './travel-figure-adapter.ts';
import {ownSequenceBoundary,assertSequenceHandoff,captureSequenceBoundary,
 sampleSequenceBoundary,advanceSequenceBeat,type SequenceBoundary,
 type SequencedMotionPlan} from './sequence-boundary.ts';

export function compileCarriedHallStep(
 figure:Figure,context:FigureContext,incoming:SequenceBoundary,
):SequencedMotionPlan {
 const boundary=ownSequenceBoundary(incoming);
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,boundary.heldContacts));
 const plan=compileTravelFigure(figure,context);
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0);
 const exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,figure.beats),1);
 assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState});
}
