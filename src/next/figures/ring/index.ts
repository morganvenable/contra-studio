/** Figures for this area, by move name (see figures/more.ts). */
import type { FigureRegistry } from '../../core/fold.ts';
import { wholeSetMove } from '../../core/layout.ts';
import { grandRightLeft } from './grand-right-left.ts';
import { meet } from './meet.ts';
import { ringReturn } from './ring-return.ts';
import { ringRollAway } from './ring-roll-away.ts';
import { ringShift } from './ring-shift.ts';
import { ringSlide } from './ring-slide.ts';
import { sashay } from './sashay.ts';

// These dance the whole ring at true positions (sashay runs per pair).
for (const move of ['ring-shift', 'ring-slide', 'ring-return', 'grand-right-left', 'meet', 'ring-roll-away'])
  wholeSetMove(move);

export const RING_FIGURES: FigureRegistry = {
  'ring-shift': ringShift,
  'ring-slide': ringSlide,
  'ring-return': ringReturn,
  'grand-right-left': grandRightLeft,
  meet,
  sashay,
  'ring-roll-away': ringRollAway,
};
