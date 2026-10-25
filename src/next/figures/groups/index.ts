/** Figures for sets not made of couples, by move name (see figures/more.ts). */
import type { FigureRegistry } from '../../core/fold.ts';
import { basketSwing } from './basket-swing.ts';
import { birdieInTheCage } from './birdie-cage.ts';
import { birdieOut } from './birdie-out.ts';
import { centerTurns } from './center-turns.ts';
import { centersTravel } from './centers-travel.ts';
import { soloStrip } from './solo-strip.ts';
import { swingAndMoveOn } from './swing-and-move-on.ts';
import { tandemHey } from './tandem-hey.ts';
import { threadNeedle } from './thread-needle.ts';
import { trioPromenade } from './trio-promenade.ts';
import { lonesomeTravel } from './lonesome-travel.ts';
import { loopCircle } from './loop-circle.ts';
import { pullRing } from './pull-ring.ts';
import { swingAtRandom } from './swing-at-random.ts';
import { upDouble } from './up-double.ts';
import { sideArchDive, sideBalance, sideCircle, sideDoSiDo, sideSwing } from './side-ring.ts';
import { tempestLead } from './tempest-lead.ts';
import { tempestPass } from './tempest-pass.ts';
import { tempestReturn } from './tempest-return.ts';
import { tempestSwing } from './tempest-swing.ts';

export const GROUPS_FIGURES: FigureRegistry = {
  'solo-strip': soloStrip,
  'birdie-cage': birdieInTheCage,
  'birdie-out': birdieOut,
  'tandem-hey': tandemHey,
  'thread-needle': threadNeedle,
  'trio-promenade': trioPromenade,
  'center-turns': centerTurns,
  'centers-travel': centersTravel,
  'basket-swing': basketSwing,
  'swing-and-move-on': swingAndMoveOn,
  'lonesome-travel': lonesomeTravel,
  'up-double': upDouble,
  'loop-circle': loopCircle,
  'pull-ring': pullRing,
  'swing-at-random': swingAtRandom,
  'tempest-lead': tempestLead,
  'tempest-return': tempestReturn,
  'tempest-pass': tempestPass,
  'tempest-swing': tempestSwing,
  'side-circle': sideCircle,
  'side-arch-dive': sideArchDive,
  'side-do-si-do': sideDoSiDo,
  'side-balance': sideBalance,
  'side-swing': sideSwing,
};
