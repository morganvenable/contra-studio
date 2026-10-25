/** Figures for this area, by move name (see figures/more.ts). */
import type { FigureRegistry } from '../../core/fold.ts';
import { wholeSetMove } from '../../core/layout.ts';
import { beside } from './beside.ts';
import { cascadeSwing } from './cascade-swing.ts';
import { crossTrail } from './cross-trail.ts';
import { grandChain } from './grand-chain.ts';
import { grandMeet } from './grand-meet.ts';
import { linePairs } from './line-pairs.ts';
import { squareMiddle } from './middle.ts';
import { promenadeHome } from './promenade-home.ts';
import { roleStar } from './role-star.ts';
import {
  squareBalance,
  squareCorners,
  squareCornerSwing,
  squareDoSiDo,
  squareSwing,
} from './square-pair.ts';
import { starWheel, starWhirl } from './star-wheel.ts';
import { separateAround } from './separate-around.ts';

// These run on the whole square at true positions (they place pairs themselves).
wholeSetMove('square-middle');
wholeSetMove('beside');
wholeSetMove('promenade-home');
wholeSetMove('grand-meet');
wholeSetMove('grand-chain');
wholeSetMove('separate-around');
wholeSetMove('line-pairs');
wholeSetMove('role-star');
for (const move of [
  'square-swing',
  'square-balance',
  'square-do-si-do',
  'square-corners',
  'square-corner-swing',
  'star-wheel',
  'star-whirl',
  'cascade-swing',
  'cross-trail',
])
  wholeSetMove(move);

export const SQUARE_FIGURES: FigureRegistry = {
  'square-middle': squareMiddle,
  beside,
  'promenade-home': promenadeHome,
  'grand-meet': grandMeet,
  'grand-chain': grandChain,
  'separate-around': separateAround,
  'line-pairs': linePairs,
  'role-star': roleStar,
  'square-swing': squareSwing,
  'square-balance': squareBalance,
  'square-do-si-do': squareDoSiDo,
  'square-corners': squareCorners,
  'square-corner-swing': squareCornerSwing,
  'star-wheel': starWheel,
  'star-whirl': starWhirl,
  'cascade-swing': cascadeSwing,
  'cross-trail': crossTrail,
};
