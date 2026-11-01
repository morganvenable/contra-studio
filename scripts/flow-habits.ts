/**
 * How often choreographers follow one figure with another, counted over the
 * library's dances that dance cleanly (status ok): public/dances/flow-habits.json.
 * Also reports how often the counter-turn note fires on those dances.
 *
 *   node scripts/flow-habits.ts
 */
import fs from 'node:fs';
import { compileNext, type StoredDance } from '../src/next/dance.ts';
import { flowOfRound, habitKey } from '../src/next/flow.ts';

const index = JSON.parse(fs.readFileSync('public/dances/index.json', 'utf8'));
const entries = (Array.isArray(index) ? index : index.dances) as { id: string; status: string }[];
const after: Record<string, Record<string, number>> = {};
let dances = 0, joins = 0, turns = 0;
const turnPairs: Record<string, number> = {};
for (const entry of entries.filter((e) => e.status === 'ok')) {
  const stored = JSON.parse(fs.readFileSync(`public/dances/${entry.id}.json`, 'utf8')) as StoredDance;
  const calls = stored.figures;
  // The time through wraps round: the last figure leads into the first.
  for (let i = 0; i < calls.length; i++) {
    const a = habitKey(calls[i]), b = habitKey(calls[(i + 1) % calls.length]);
    (after[a] ??= {})[b] = (after[a][b] ?? 0) + 1;
  }
  dances++;
  if (!stored.progression?.startsWith('duple')) continue;
  try {
    const round = (compileNext(stored, 4) as unknown as { round(r: number): { segments: Parameters<typeof flowOfRound>[0] } }).round(0);
    joins += round.segments.length - 1;
    for (const [i] of flowOfRound(round.segments)) {
      turns++;
      const pair = `${habitKey(round.segments[i - 1].call)} → ${habitKey(round.segments[i].call)}`;
      turnPairs[pair] = (turnPairs[pair] ?? 0) + 1;
    }
  } catch {
    // Dances the strict compile cannot fold still count for habits.
  }
}
fs.writeFileSync('public/dances/flow-habits.json', JSON.stringify({ dances, after }));
console.log(`${dances} dances; counter-turns at ${turns} of ${joins} joins (${((turns / joins) * 100).toFixed(1)}%)`);
for (const [pair, n] of Object.entries(turnPairs).sort((x, y) => y[1] - x[1]).slice(0, 15)) console.log(`  ${n}\t${pair}`);
