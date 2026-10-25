/** Figures for this area, by move name (see figures/more.ts). */
import type { FigureRegistry } from '../../core/fold.ts';
import * as layout from '../../core/layout.ts';
import { archDive } from './arch-dive.ts';
import { couplesDoSiDo } from './couples-do-si-do.ts';
import { linesCircle } from './lines-circle.ts';
import { swingOut } from './swing-out.ts';

// The ring of eight dances in the groups of eight of a four face four
// (layout.ts lineSetMove, when the layout has it).
(layout as { lineSetMove?: (move: string) => void }).lineSetMove?.('lines-circle');

export const SETS_FIGURES: FigureRegistry = {
  'arch-dive': archDive,
  'couples-do-si-do': couplesDoSiDo,
  'lines-circle': linesCircle,
  'swing-out': swingOut,
};
