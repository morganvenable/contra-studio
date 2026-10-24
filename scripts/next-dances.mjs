// Node helpers for the next-engine scripts and tests: find a dance's
// ContraDB snapshot (the research folder first, then test-data/contradb),
// import it, and load a stored dance from public/dances.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { importDance } from '../src/next/import.ts';

export const SNAPSHOT_DIRS = [
  'C:/Users/morga/OneDrive/Documents/GitHub/contra-studio/contra-studio/research/contradb/snapshots',
  'test-data/contradb',
];

/** The snapshot for a ContraDB id, or undefined when none is on disk. */
export function snapshotOf(id) {
  for (const dir of SNAPSHOT_DIRS) {
    const path = `${dir}/${id}.json`;
    if (existsSync(path)) return { path, snapshot: JSON.parse(readFileSync(path, 'utf8')) };
  }
  return undefined;
}

/** Import a snapshot (status unchecked). */
export function buildStored(id) {
  const found = snapshotOf(id);
  if (!found) throw new Error(`No snapshot for ContraDB ${id}.`);
  const sha = createHash('sha256').update(found.snapshot.html).digest('hex');
  return importDance(id, found.snapshot, sha);
}

/** A stored dance from public/dances. */
export function loadStored(id) {
  return JSON.parse(readFileSync(`public/dances/${id}.json`, 'utf8'));
}
