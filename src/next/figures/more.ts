/**
 * Figures beyond contra duple minor, one registry per area so each grows on
 * its own (see core/parse-more.ts for the matching row patterns).
 */
import type { FigureRegistry } from '../core/fold.ts';
import { ECD_FIGURES } from './ecd/index.ts';
import { RING_FIGURES } from './ring/index.ts';
import { SETS_FIGURES } from './sets/index.ts';
import { SQUARE_FIGURES } from './square/index.ts';

export const MORE_FIGURES: FigureRegistry = {
  ...SETS_FIGURES,
  ...RING_FIGURES,
  ...SQUARE_FIGURES,
  ...ECD_FIGURES,
};
