/** Compatibility entry point for the existing full-hey contract.
 * Half and full heys share one carried encounter and trajectory implementation. */
import type {Figure} from './types.ts';
import type {FigureContext} from './extended-figures.ts';
import type {SequenceBoundary} from './sequence-boundary.ts';
import {assertNeutralRoleHeyFigure,compileNeutralRoleHeyStep,type NeutralRoleHeyPlan} from './neutral-role-hey-step.ts';
export type NeutralFullHeyPlan=NeutralRoleHeyPlan;
export function assertNeutralFullHeyFigure(input:Figure):Figure {
 const figure=assertNeutralRoleHeyFigure(input);
 if(figure.amount!==1)throw new Error('The neutral full-hey entry point requires a full sixteen-count hey.');
 return figure;
}
export function compileNeutralFullHeyStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):NeutralFullHeyPlan {
 return compileNeutralRoleHeyStep(assertNeutralFullHeyFigure(input),context,incoming);
}
