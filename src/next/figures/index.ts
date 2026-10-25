/** Every figure the next engine knows, by move name. */
import type { FigureRegistry } from '../core/fold.ts';
import { onDiagonal } from '../core/diagonal.ts';
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
import { revolvingDoor } from './revolving-door.ts';
import { archDive } from './arch-dive.ts';
import { figureEight } from './figure-eight.ts';
import { zigZag } from './zig-zag.ts';
import { gate } from './gate.ts';
import { contraCorners } from './contra-corners.ts';
import { madRicochet } from './mad-ricochet.ts';
import { starThru } from './star-thru.ts';
import { dolphinHey } from './dolphin-hey.ts';
import { turnBack } from './turn-back.ts';
import { circularHey } from './circular-hey.ts';

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
  'revolving-door': revolvingDoor,
  'arch-dive': archDive,
  'figure-eight': figureEight,
  'zig-zag': zigZag,
  gate,
  'contra-corners': contraCorners,
  'mad-ricochet': madRicochet,
  'star-thru': starThru,
  'dolphin-hey': dolphinHey,
  'turn-back': turnBack,
  'circular-hey': circularHey,
};

/** Every figure, each also able to run on a diagonal (core/diagonal.ts). */
export const FIGURES: FigureRegistry = Object.freeze(
  Object.fromEntries(Object.entries(BASE).map(([move, f]) => [move, onDiagonal(f)])),
);
