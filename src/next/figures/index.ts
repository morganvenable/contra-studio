/** Every figure the next engine knows, by move name. */
import type { FigureRegistry } from '../core/fold.ts';
import { onDiagonal } from '../core/diagonal.ts';
import { withRelations } from '../core/relations.ts';
import { allemande } from './allemande.ts';
import { balance } from './balance.ts';
import { boxCirculate } from './box-circulate.ts';
import { butterflyWhirl } from './butterfly-whirl.ts';
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
import { poussette } from './poussette.ts';
import { promenade } from './promenade.ts';
import { rightLeftThrough } from './right-left-through.ts';
import { rollAway } from './roll-away.ts';
import { rory } from './rory.ts';
import { slice } from './slice.ts';
import { slide } from './slide.ts';
import { star } from './star.ts';
import { starPromenade } from './star-promenade.ts';
import { swing } from './swing.ts';
import { turnAlone } from './turn-alone.ts';
import { twirl } from './twirl.ts';
import { centerWave } from './center-wave.ts';
import { couplesDoSiDo } from './couples-do-si-do.ts';
import { orbit } from './orbit.ts';
import { standStill } from './stand-still.ts';
import { twoHandTurn } from './two-hand-turn.ts';
import { roll } from './roll.ts';
import { oval } from './oval.ts';
import { walkForward } from './walk-forward.ts';

const BASE: FigureRegistry = {
  allemande,
  balance,
  'box-circulate': boxCirculate,
  'butterfly-whirl': butterflyWhirl,
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
  poussette,
  promenade,
  'right-left-through': rightLeftThrough,
  'roll-away': rollAway,
  rory,
  slice,
  slide,
  star,
  'star-promenade': starPromenade,
  swing,
  'turn-alone': turnAlone,
  twirl,
  'center-wave': centerWave,
  'couples-do-si-do': couplesDoSiDo,
  orbit,
  'stand-still': standStill,
  'two-hand-turn': twoHandTurn,
  roll,
  oval,
  'walk-forward': walkForward,
};

/**
 * Every figure, each also able to run on a diagonal (core/diagonal.ts) and
 * with shadows, previous neighbors or same-role pairs (core/relations.ts).
 */
export const FIGURES: FigureRegistry = Object.freeze(
  Object.fromEntries(
    Object.entries(BASE).map(([move, f]) => [move, onDiagonal(withRelations(f))]),
  ),
);
