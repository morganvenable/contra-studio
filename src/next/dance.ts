/**
 * Stored dances for the next engine and the one entry point the app uses.
 * A stored dance is its source reference (URL + content hash of the snapshot)
 * plus the FigureCall list and the choices made. No embedded HTML.
 */
import type { Dance } from '../types.ts';
import type { FigureCall } from './core/figure.ts';
import { compileFold, type FoldedDance } from './core/fold.ts';
import { FORMATIONS } from './core/formation.ts';
import { METERS, type MusicStructure } from './core/music.ts';
import {
  MINOR_SET_PROGRESSION, NO_PROGRESSION, WHOLE_SET_PROGRESSION, type Progression,
} from './core/progression.ts';
import { FIGURES } from './figures/index.ts';
import debras from './dances/2321.json' with { type: 'json' };

export interface StoredCall extends FigureCall {
  readonly section?: string;
}

export interface StoredDance {
  readonly schema: 'contra-studio/next-dance';
  readonly version: 1;
  readonly title: string;
  readonly author: string;
  /** Key into FORMATIONS. */
  readonly formation: string;
  readonly progression: Progression['kind'];
  readonly music: {
    readonly meter: string;
    readonly parts: readonly { readonly name: string; readonly bars: number }[];
    readonly times: number | 'repeat';
  };
  readonly source: {
    readonly url: string;
    readonly snapshot: string;
    readonly sha256: string;
    readonly status?: string;
  };
  readonly choices: readonly string[];
  readonly figures: readonly StoredCall[];
}

export const NEXT_DANCES: readonly StoredDance[] = [debras as StoredDance];

const PROGRESSIONS: Readonly<Record<Progression['kind'], Progression>> = {
  'minor-set': MINOR_SET_PROGRESSION,
  'whole-set': WHOLE_SET_PROGRESSION,
  none: NO_PROGRESSION,
};

export function musicOf(stored: StoredDance): MusicStructure {
  const meter = METERS[stored.music.meter];
  if (!meter) throw new Error(`Unknown meter ${stored.music.meter}.`);
  return { meter, parts: stored.music.parts, times: stored.music.times };
}

export function findNextDance(sourceUrl: string | undefined): StoredDance | undefined {
  return NEXT_DANCES.find((d) => d.source.url === sourceUrl);
}

/** Compile a stored dance. `base` keeps the app's dance identity and notes. */
export function compileNext(stored: StoredDance, couples = 6, base?: Dance): FoldedDance {
  const formation = FORMATIONS[stored.formation];
  if (!formation) throw new Error(`Unknown formation ${stored.formation}.`);
  const dance: Dance = base ?? {
    id: `next:${stored.source.url}`,
    title: stored.title,
    author: stored.author,
    formation: stored.formation === 'becket' ? 'becket' : 'duple-improper',
    circulation: 'cw',
    sourceUrl: stored.source.url,
    description: '',
    figures: [],
  };
  return compileFold({
    dance,
    calls: stored.figures,
    start: formation.start(couples),
    registry: FIGURES,
    progression: PROGRESSIONS[stored.progression],
    music: musicOf(stored),
    warnings: [
      'Figure-library engine (preview): every figure is one reusable function.',
      ...stored.choices.map((c) => `Choice: ${c}`),
    ],
  });
}
