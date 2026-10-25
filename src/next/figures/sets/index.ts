/** Figures for this area, by move name (see figures/more.ts). */
import type { FigureRegistry } from '../../core/fold.ts';
import * as layout from '../../core/layout.ts';
import { archDive } from './arch-dive.ts';
import { cornerSwing } from './corner-swing.ts';
import { corners } from './corners.ts';
import { couplesDoSiDo } from './couples-do-si-do.ts';
import { linesCast } from './lines-cast.ts';
import { linesCircle } from './lines-circle.ts';
import { linesSwing } from './lines-swing.ts';
import { swingOut } from './swing-out.ts';

// These dance in the groups of eight of a four face four (layout.ts
// lineSetMove): the ring of eight, the square it forms, and a role's star in it.
for (const move of [
  'lines-circle',
  'lines-cast',
  'corner-swing',
  'corners',
  'lines-swing',
  'swing-out',
  'role-star',
])
  (layout as { lineSetMove?: (move: string) => void }).lineSetMove?.(move);

export const SETS_FIGURES: FigureRegistry = {
  'arch-dive': archDive,
  'corner-swing': cornerSwing,
  corners,
  'couples-do-si-do': couplesDoSiDo,
  'lines-cast': linesCast,
  'lines-circle': linesCircle,
  'lines-swing': linesSwing,
  'swing-out': swingOut,
};
