/** Figures for this area, by move name (see figures/more.ts). */
import type { FigureRegistry } from '../../core/fold.ts';
import { cast } from './cast.ts';
import { centerTravel } from './center-travel.ts';
import { contraCorners } from './contra-corners.ts';
import { cross } from './cross.ts';
import { dipAndDive } from './dip-and-dive.ts';
import { heyForThree } from './hey-for-three.ts';
import { peel } from './peel.ts';
import { placeSwing } from './place-swing.ts';
import { setCircle } from './set-circle.ts';
import { setToCorner } from './set-to-corner.ts';
import { starAround } from './star-around.ts';
import { stripTheWillow } from './strip-the-willow.ts';
import { together } from './together.ts';
import { trioBasket } from './trio-basket.ts';
import { turnSingle } from './turn-single.ts';
import { trioTurn } from './trio-turn.ts';
import { twoHandTurn } from './two-hand-turn.ts';
import { wholeCircle } from './whole-circle.ts';

export const ECD_FIGURES: FigureRegistry = {
  cast,
  'center-travel': centerTravel,
  'contra-corners': contraCorners,
  cross,
  'dip-and-dive': dipAndDive,
  'hey-for-three': heyForThree,
  peel,
  'place-swing': placeSwing,
  'set-circle': setCircle,
  'set-to-corner': setToCorner,
  'star-around': starAround,
  'strip-the-willow': stripTheWillow,
  together,
  'trio-basket': trioBasket,
  'turn-single': turnSingle,
  'trio-turn': trioTurn,
  'two-hand-turn': twoHandTurn,
  'whole-circle': wholeCircle,
};
