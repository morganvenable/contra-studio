/** Figures for this area, by move name (see figures/more.ts). */
import type { FigureRegistry } from '../../core/fold.ts';
import { cast } from './cast.ts';
import { centerTravel } from './center-travel.ts';
import { contraCorners } from './contra-corners.ts';
import { peel } from './peel.ts';
import { setCircle } from './set-circle.ts';
import { starAround } from './star-around.ts';
import { stripTheWillow } from './strip-the-willow.ts';
import { twoHandTurn } from './two-hand-turn.ts';
import { wholeCircle } from './whole-circle.ts';

export const ECD_FIGURES: FigureRegistry = {
  cast,
  'center-travel': centerTravel,
  'contra-corners': contraCorners,
  peel,
  'set-circle': setCircle,
  'star-around': starAround,
  'strip-the-willow': stripTheWillow,
  'two-hand-turn': twoHandTurn,
  'whole-circle': wholeCircle,
};
