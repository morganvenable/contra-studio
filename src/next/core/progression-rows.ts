/**
 * A Becket set whose top minor set dances to the bottom each time through
 * (Riverside Jig: "top 2 couples ... dance to the bottom over everyone's
 * heads"). The figures carry the bodies; the progression only marks the
 * time through (who dances with whom does not change), and the check
 * expects the top row of couples at the bottom and everyone else a row up.
 */
import { FORMATIONS } from './formation.ts';
import { mean } from './math.ts';
import { coupleZ, type CheckSpec } from './models.ts';
import type { Progression } from './progression.ts';
import { body, withChanges } from './state.ts';

export const ROWS_PROGRESSION: Progression = {
  kind: 'becket-rows',
  atRoundEnd: true,
  rebind: (state) => withChanges(state, { epoch: state.epoch + 1 }),
};

/** Couple z after each round: the top row to the bottom, the rest a row up. */
export function rowsModel(formation: string, couples: number, rounds: number): number[][] {
  const s = FORMATIONS[formation].start(couples);
  let z = Array.from({ length: couples }, (_, c) =>
    mean([body(s, c * 2).position, body(s, c * 2 + 1).position]).z,
  );
  const rows = [...new Set(z.map((v) => Math.round(v * 1000) / 1000))].sort((a, b) => a - b);
  const gap = rows[1] - rows[0];
  const out: number[][] = [];
  for (let r = 0; r < rounds; r++) {
    const top = Math.min(...z);
    z = z.map((v) => (Math.abs(v - top) < 1e-3 ? v + gap * (rows.length - 1) : v - gap));
    out.push([...z]);
  }
  return out;
}

export const rowsSpec = (formation: string): CheckSpec => ({
  counts: [4, 6],
  meeting: 'none',
  model: (c, r) => coupleZ(rowsModel(formation, c, r)),
});
