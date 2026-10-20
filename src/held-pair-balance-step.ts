/** A two-hand balance consumes its actual held entry and prepares the same
 * person's swing. It cannot replace wave hands or infer a new relationship. */
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure} from './types.ts';
export function compileHeldPairBalanceStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan{
 const f=capturePlainData(input),boundary=ownSequenceBoundary(incoming);
 if(f.kind!=='balance'||f.beats!==4||!['neighbor','partner'].includes(f.who??'')||f.hands!==undefined||f.progression||context.next?.kind!=='swing'||context.next.who!==f.who)throw Error('A held paired balance needs four counts and an explicit same-person swing successor.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,boundary.heldContacts));
 const plan=compilePrimitiveFigure(f,context.ids,context.start,context.dancers,context.dancers.filter(d=>d.role==='lark').map(d=>d.direction),{balanceEntry:'held-two-hand',balanceExit:'same-person-swing'});
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0);
 assertSequenceHandoff(boundary,entryState);
 const exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,f.beats),1);
 return Object.freeze({...plan,entryState,exitState});
}
