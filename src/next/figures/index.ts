/** Every figure the next engine knows, by move name. */
import type { FigureRegistry } from '../core/fold.ts';
import { allemande } from './allemande.ts';
import { balance } from './balance.ts';
import { circle } from './circle.ts';
import { passThrough } from './pass-through.ts';
import { rory } from './rory.ts';
import { slice } from './slice.ts';
import { swing } from './swing.ts';

export const FIGURES: FigureRegistry = Object.freeze({
  allemande,
  balance,
  circle,
  'pass-through': passThrough,
  rory,
  slice,
  swing,
});
