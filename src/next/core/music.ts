/**
 * Music structure is data: meter, the parts of one time through the tune,
 * and how many times through. Figure durations are beats of this meter.
 *
 * What the current audio assumes (src/music.ts, src/audio.ts), for later:
 * REEL_BEATS = 64, four 16-beat phrases played AABB, 8 bars of 2 beats per
 * phrase (cut time), REEL_BPM = 112, click accents every 16 and every 4
 * beats, and a 64-beat loop. It does not read this structure yet; a dance
 * compiled by the next engine exposes it as `music` for that work.
 */

export interface Meter {
  /** As written: "2/4", "4/4", "6/8", "3/4", "9/8" ... */
  readonly signature: string;
  /** Dance beats (steps) per bar: 2 for 2/4 and 6/8, 3 for 3/4 and 9/8. */
  readonly beatsPerBar: number;
}

export interface MusicPart {
  /** "A1", "A2", "B1", "C" ... */
  readonly name: string;
  readonly bars: number;
}

export interface MusicStructure {
  readonly meter: Meter;
  /** One time through the tune, in order (AABB, AAB, ABC, A 8 + B 12 ...). */
  readonly parts: readonly MusicPart[];
  /** "repeat" keeps going (contra); a number is a set count of times through. */
  readonly times: number | 'repeat';
}

export const METERS: Readonly<Record<string, Meter>> = {
  '2/4': { signature: '2/4', beatsPerBar: 2 },
  '4/4': { signature: '4/4', beatsPerBar: 4 },
  '6/8': { signature: '6/8', beatsPerBar: 2 },
  '3/4': { signature: '3/4', beatsPerBar: 3 },
  '9/8': { signature: '9/8', beatsPerBar: 3 },
};

export function beatsPerTime(music: MusicStructure): number {
  return music.parts.reduce((n, p) => n + p.bars * music.meter.beatsPerBar, 0);
}

/** Beat where each part starts within one time through. */
export function partStarts(music: MusicStructure): { name: string; beat: number }[] {
  let beat = 0;
  return music.parts.map((p) => {
    const start = { name: p.name, beat };
    beat += p.bars * music.meter.beatsPerBar;
    return start;
  });
}

/** The usual contra: AABB, 8 bars of 2/4 each, repeated. 64 beats. */
export const CONTRA_AABB: MusicStructure = {
  meter: METERS['2/4'],
  parts: ['A1', 'A2', 'B1', 'B2'].map((name) => ({ name, bars: 8 })),
  times: 'repeat',
};
