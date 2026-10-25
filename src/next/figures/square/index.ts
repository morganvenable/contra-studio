/** Figures for this area, by move name (see figures/more.ts). */
import type { FigureRegistry } from '../../core/fold.ts';
import { wholeSetMove } from '../../core/layout.ts';
import { beside } from './beside.ts';
import { grandChain } from './grand-chain.ts';
import { grandMeet } from './grand-meet.ts';
import { linePairs } from './line-pairs.ts';
import { squareMiddle } from './middle.ts';
import { promenadeHome } from './promenade-home.ts';
import { separateAround } from './separate-around.ts';

// These run on the whole square at true positions (they place pairs themselves).
wholeSetMove('square-middle');
wholeSetMove('beside');
wholeSetMove('promenade-home');
wholeSetMove('grand-meet');
wholeSetMove('grand-chain');
wholeSetMove('separate-around');
wholeSetMove('line-pairs');

export const SQUARE_FIGURES: FigureRegistry = {
  'square-middle': squareMiddle,
  beside,
  'promenade-home': promenadeHome,
  'grand-meet': grandMeet,
  'grand-chain': grandChain,
  'separate-around': separateAround,
  'line-pairs': linePairs,
};
