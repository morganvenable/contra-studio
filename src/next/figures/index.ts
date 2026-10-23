/** Every figure the next engine knows, by move name. */
import type { FigureRegistry } from '../core/fold.ts';
import { allemande } from './allemande.ts';
import { balance } from './balance.ts';
import { chain } from './chain.ts';
import { circle } from './circle.ts';
import { doSiDo } from './do-si-do.ts';
import { hall } from './hall.ts';
import { hey } from './hey.ts';
import { longLines } from './long-lines.ts';
import { passThrough } from './pass-through.ts';
import { petronella } from './petronella.ts';
import { promenade } from './promenade.ts';
import { rightLeftThrough } from './right-left-through.ts';
import { rory } from './rory.ts';
import { slice } from './slice.ts';
import { star } from './star.ts';
import { swing } from './swing.ts';
import { twirl } from './twirl.ts';

export const FIGURES: FigureRegistry = Object.freeze({
  allemande,
  balance,
  chain,
  circle,
  'do-si-do': doSiDo,
  hall,
  hey,
  'long-lines': longLines,
  'pass-through': passThrough,
  petronella,
  promenade,
  'right-left-through': rightLeftThrough,
  rory,
  slice,
  star,
  swing,
  twirl,
});
