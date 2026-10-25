/** Every figure the next engine knows, by move name. */
import type { FigureRegistry } from '../core/fold.ts';
import { allemande } from './allemande.ts';
import { balance } from './balance.ts';
import { boxCirculate } from './box-circulate.ts';
import { chain } from './chain.ts';
import { circle } from './circle.ts';
import { doSiDo } from './do-si-do.ts';
import { giveAndTake } from './give-and-take.ts';
import { gyre } from './gyre.ts';
import { hall } from './hall.ts';
import { hey } from './hey.ts';
import { hold } from './hold.ts';
import { longLines } from './long-lines.ts';
import { madRobin } from './mad-robin.ts';
import { oceanWave } from './ocean-wave.ts';
import { passBy } from './pass-by.ts';
import { passThrough } from './pass-through.ts';
import { petronella } from './petronella.ts';
import { promenade } from './promenade.ts';
import { rightLeftThrough } from './right-left-through.ts';
import { rollAway } from './roll-away.ts';
import { rory } from './rory.ts';
import { slice } from './slice.ts';
import { slide } from './slide.ts';
import { star } from './star.ts';
import { swing } from './swing.ts';
import { turnAlone } from './turn-alone.ts';
import { twirl } from './twirl.ts';

export const FIGURES: FigureRegistry = Object.freeze({
  allemande,
  balance,
  'box-circulate': boxCirculate,
  chain,
  circle,
  'do-si-do': doSiDo,
  'give-and-take': giveAndTake,
  gyre,
  hall,
  hey,
  hold,
  'long-lines': longLines,
  'mad-robin': madRobin,
  'ocean-wave': oceanWave,
  'pass-by': passBy,
  'pass-through': passThrough,
  petronella,
  promenade,
  'right-left-through': rightLeftThrough,
  'roll-away': rollAway,
  rory,
  slice,
  slide,
  star,
  swing,
  'turn-alone': turnAlone,
  twirl,
});
